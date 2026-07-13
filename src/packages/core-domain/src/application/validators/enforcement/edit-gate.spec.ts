import { EDIT_GATE_TOOL, evaluateEdit, extractImports, type EditBoundaryRule } from './edit-gate';

const HEXA_RULE: EditBoundaryRule = {
  ruleId: 'HXA-01',
  adrRef: 'ADR-0002',
  appliesTo: 'src/domain/',
  forbiddenImports: ['../infrastructure', 'src/infrastructure', 'MyApp.Infrastructure'],
  severity: 'error',
  message: 'Domain must not depend on Infrastructure (ADR-0002).',
};

describe('extractImports (GT-526 — fast import scan)', () => {
  it('captures TS/JS import, export-from, bare import and require with 1-based lines', () => {
    const refs = extractImports(
      [
        "import { Order } from '../infrastructure/db';", // 1
        "export * from './model';", //                      2
        "import './side-effect';", //                       3
        "const x = require('lodash');", //                  4
      ].join('\n'),
    );
    expect(refs).toEqual([
      { spec: '../infrastructure/db', line: 1 },
      { spec: './model', line: 2 },
      { spec: './side-effect', line: 3 },
      { spec: 'lodash', line: 4 },
    ]);
  });

  it('captures C# using directives', () => {
    expect(extractImports('using MyApp.Infrastructure.Db;')).toEqual([{ spec: 'MyApp.Infrastructure.Db', line: 1 }]);
  });

  it('detects a MULTI-LINE import (prettier-wrapped) at its opener line', () => {
    const refs = extractImports(
      ['import {', '  Db,', '  Repo,', "} from '../infrastructure/db';"].join('\n'),
    );
    expect(refs).toEqual([{ spec: '../infrastructure/db', line: 1 }]);
  });

  it('detects a dynamic import()', () => {
    expect(extractImports("const m = await import('../infrastructure/db');")).toEqual([
      { spec: '../infrastructure/db', line: 1 },
    ]);
  });
});

describe('evaluateEdit — multi-line imports are not a blind spot', () => {
  it('BLOCKS a domain file whose infrastructure import is wrapped across lines', () => {
    const decision = evaluateEdit(
      { filePath: 'src/domain/order.ts', content: ['import {', '  Db,', "} from '../infrastructure/db';"].join('\n') },
      [
        {
          ruleId: 'HXA-01',
          appliesTo: 'src/domain/',
          forbiddenImports: ['../infrastructure'],
          severity: 'error',
        },
      ],
    );
    expect(decision.allow).toBe(false);
    expect(decision.violations[0].line).toBe(1);
  });
});

describe('evaluateEdit (GT-526 — block an offending edit in-flight)', () => {
  it('BLOCKS a domain file that imports infrastructure (allow=false, canonical violation)', () => {
    const decision = evaluateEdit(
      { filePath: 'src/domain/order.ts', content: "import { Db } from '../infrastructure/db';" },
      [HEXA_RULE],
    );
    expect(decision.allow).toBe(false);
    expect(decision.violations).toHaveLength(1);
    expect(decision.violations[0]).toMatchObject({ ruleId: 'HXA-01', tool: EDIT_GATE_TOOL, file: 'src/domain/order.ts', line: 1, adrRef: 'ADR-0002' });
    expect(decision.violations[0].fingerprint).toMatch(/^[0-9a-f]{16}$/);
  });

  it('BLOCKS the C# equivalent (using MyApp.Infrastructure)', () => {
    const decision = evaluateEdit(
      { filePath: 'src/Domain/Order.cs', content: 'using MyApp.Infrastructure.Db;' },
      [{ ...HEXA_RULE, appliesTo: 'src/Domain/' }],
    );
    expect(decision.allow).toBe(false);
  });

  it('ALLOWS a domain file that only imports allowed modules', () => {
    const decision = evaluateEdit(
      { filePath: 'src/domain/order.ts', content: "import { Money } from './money';\nimport { z } from 'zod';" },
      [HEXA_RULE],
    );
    expect(decision.allow).toBe(true);
    expect(decision.violations).toHaveLength(0);
  });

  it('does not apply a rule to a file outside its appliesTo prefix', () => {
    const decision = evaluateEdit(
      { filePath: 'src/infrastructure/db.ts', content: "import { Db } from '../infrastructure/db';" },
      [HEXA_RULE],
    );
    expect(decision.allow).toBe(true);
  });

  it('reports a warning-severity boundary but still ALLOWS (non-blocking)', () => {
    const decision = evaluateEdit(
      { filePath: 'src/domain/order.ts', content: "import { Db } from '../infrastructure/db';" },
      [{ ...HEXA_RULE, severity: 'warning' }],
    );
    expect(decision.allow).toBe(true);
    expect(decision.violations).toHaveLength(1);
    expect(decision.violations[0].severity).toBe('warning');
  });
});
