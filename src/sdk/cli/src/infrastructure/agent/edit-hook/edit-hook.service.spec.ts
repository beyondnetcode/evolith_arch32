import { Readable } from 'node:stream';
import type { EditBoundaryRule } from '@beyondnet/evolith-core-domain/application/validators/enforcement/edit-gate';
import {
  enforceEditPayload,
  renderEditVerdict,
  readStdin,
  EDIT_HOOK_BLOCK_EXIT_CODE,
  EDIT_HOOK_ALLOW_EXIT_CODE,
} from './edit-hook.service';
import { parseBoundaryRules, BoundaryRulesError } from './boundary-rules';

const HEXA_RULE: EditBoundaryRule = {
  ruleId: 'HXA-01',
  adrRef: 'ADR-0002',
  appliesTo: 'src/domain/',
  forbiddenImports: ['../infrastructure', 'src/infrastructure', 'MyApp.Infrastructure'],
  severity: 'error',
  message: 'Domain must not depend on Infrastructure (ADR-0002).',
};

describe('enforceEditPayload (GT-526 — edit-time decision)', () => {
  it('BLOCKS a domain Write that imports infrastructure (exit 2, canonical violation)', () => {
    const result = enforceEditPayload(
      {
        tool_name: 'Write',
        cwd: '/repo',
        tool_input: { file_path: '/repo/src/domain/order.ts', content: "import { Db } from '../infrastructure/db';" },
      },
      [HEXA_RULE],
    );
    expect(result.blocked).toBe(true);
    expect(result.exitCode).toBe(EDIT_HOOK_BLOCK_EXIT_CODE);
    expect(result.vendor).toBe('claude-code');
    expect(result.decision.violations[0]).toMatchObject({ ruleId: 'HXA-01', tool: 'edit-gate', line: 1 });
  });

  it('ALLOWS a conforming domain Write (exit 0)', () => {
    const result = enforceEditPayload(
      {
        tool_name: 'Write',
        tool_input: { file_path: 'src/domain/order.ts', content: "import { Money } from './money';" },
      },
      [HEXA_RULE],
    );
    expect(result.blocked).toBe(false);
    expect(result.exitCode).toBe(EDIT_HOOK_ALLOW_EXIT_CODE);
    expect(result.decision.violations).toHaveLength(0);
  });

  it('ALLOWS (nothing to gate) when the payload is not a file edit', () => {
    const result = enforceEditPayload({ tool_name: 'Bash', tool_input: { command: 'ls' } }, [HEXA_RULE]);
    expect(result.blocked).toBe(false);
    expect(result.vendor).toBeNull();
    expect(result.exitCode).toBe(EDIT_HOOK_ALLOW_EXIT_CODE);
  });

  it('does not block on a warning-severity boundary (reports, allows)', () => {
    const result = enforceEditPayload(
      { tool_name: 'Write', tool_input: { file_path: 'src/domain/order.ts', content: "import '../infrastructure/db';" } },
      [{ ...HEXA_RULE, severity: 'warning' }],
    );
    expect(result.blocked).toBe(false);
    expect(result.decision.violations).toHaveLength(1);
  });
});

describe('renderEditVerdict', () => {
  it('renders a BLOCK verdict with rule, ADR and file:line', () => {
    const result = enforceEditPayload(
      { tool_name: 'Write', tool_input: { file_path: 'src/domain/order.ts', content: "import '../infrastructure/db';" } },
      [HEXA_RULE],
    );
    const text = renderEditVerdict(result);
    expect(text).toContain('BLOCK');
    expect(text).toContain('HXA-01');
    expect(text).toContain('[ADR-0002]');
    expect(text).toContain('src/domain/order.ts:1');
  });

  it('renders an allow note when there is nothing to gate', () => {
    const result = enforceEditPayload({ tool_name: 'Read', tool_input: { file_path: 'x' } }, [HEXA_RULE]);
    expect(renderEditVerdict(result)).toContain('nothing to enforce');
  });
});

describe('readStdin', () => {
  it('reads a JSON string from a stream', async () => {
    const stream = Readable.from(['{"tool_name":', '"Write"}']);
    await expect(readStdin(stream)).resolves.toBe('{"tool_name":"Write"}');
  });
});

describe('parseBoundaryRules', () => {
  it('accepts a bare array', () => {
    expect(parseBoundaryRules(JSON.stringify([HEXA_RULE]))).toHaveLength(1);
  });
  it('accepts a { boundaryRules } envelope and defaults severity to error', () => {
    const rules = parseBoundaryRules(
      JSON.stringify({ boundaryRules: [{ id: 'R1', appliesTo: 'src/domain/', forbiddenImports: ['x'] }] }),
    );
    expect(rules[0]).toMatchObject({ ruleId: 'R1', severity: 'error' });
  });
  it('rejects a rule missing forbiddenImports', () => {
    expect(() => parseBoundaryRules(JSON.stringify([{ ruleId: 'R1', appliesTo: 'src/' }]))).toThrow(BoundaryRulesError);
  });
  it('rejects a non-array/non-envelope shape', () => {
    expect(() => parseBoundaryRules(JSON.stringify({ nope: true }))).toThrow(BoundaryRulesError);
  });
  it('rejects invalid JSON', () => {
    expect(() => parseBoundaryRules('{not json')).toThrow(BoundaryRulesError);
  });
});
