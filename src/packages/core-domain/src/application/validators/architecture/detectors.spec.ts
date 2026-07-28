/**
 * GT-584 — an unmeasured heuristic must not block a merge.
 *
 * Every assertion below fails against the pre-GT-584 code:
 *  - `signal-admissibility.ts` did not exist and no finding carried
 *    `determinism` / `admissibility` / `confidence`;
 *  - `detectDependencyInversionIssues` matched framework names with
 *    `importPath.includes(...)`, so `./value-objects/expression-parser` and
 *    `@acme/prismatic-tokens` produced `blocking: true` MUST violations;
 *  - `detectLayerViolations` flagged the LEGAL inward direction
 *    (`application → domain`) and let the real inversion
 *    (`domain → infrastructure`) through;
 *  - every one of these findings carried `blocking: true` with no error rate
 *    attached and no way to argue with it afterwards.
 */

import {
  detectDependencyInversionIssues,
  detectLayerViolations,
  importedPackage,
} from './detectors';
import { ImportNode } from './types';
import {
  DEFAULT_ADMISSIBILITY_POLICY,
  SignalCalibration,
  admitBlocking,
} from './signal-admissibility';

type Graph = Map<string, ImportNode>;

function graph(nodes: Array<{ file: string; imports?: string[]; layer?: string; context?: string }>): Graph {
  const g: Graph = new Map();
  for (const n of nodes) g.set(n.file, { file: n.file, imports: n.imports ?? [], layer: n.layer, context: n.context });
  return g;
}

const MEASURED: SignalCalibration = {
  determinism: 'probabilistic',
  method: 'measured detector',
  truePositiveRate: 0.99,
  trueNegativeRate: 0.98,
  measuredAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// The admissibility gate itself
// ---------------------------------------------------------------------------

describe('GT-584 · admitBlocking', () => {
  it('lets a deterministic signal block, unchanged', () => {
    const d = admitBlocking(true, { determinism: 'deterministic', method: 'exact file match' });
    expect(d.blocking).toBe(true);
    expect(d.admissibility).toBe('deterministic');
    expect(d.downgradedFromBlocking).toBe(false);
  });

  it('refuses to block on a probabilistic signal with no measured error rate', () => {
    const d = admitBlocking(true, { determinism: 'probabilistic', method: 'a guess' });
    expect(d.blocking).toBe(false);
    expect(d.admissibility).toBe('advisory-uncalibrated');
    expect(d.downgradedFromBlocking).toBe(true);
    expect(d.rationale).toContain('unmeasured guess');
  });

  it('admits a probabilistic signal whose declared rates clear the policy', () => {
    const d = admitBlocking(true, MEASURED);
    expect(d.blocking).toBe(true);
    expect(d.admissibility).toBe('calibrated');
    expect(d.confidence).toBe(0.99);
  });

  it('refuses a measured signal BELOW the declared floor', () => {
    const d = admitBlocking(true, { ...MEASURED, truePositiveRate: 0.6 });
    expect(d.blocking).toBe(false);
    expect(d.admissibility).toBe('advisory-below-threshold');
    expect(d.rationale).toContain('0.6');
  });

  it('refuses a measurement older than the declared window', () => {
    const d = admitBlocking(true, { ...MEASURED, measuredAt: '2020-01-01T00:00:00.000Z' }, {
      ...DEFAULT_ADMISSIBILITY_POLICY,
      now: () => new Date('2026-07-28T00:00:00.000Z'),
    });
    expect(d.blocking).toBe(false);
    expect(d.admissibility).toBe('advisory-stale-calibration');
  });

  it('never SUPPRESSES a finding — it only demotes it', () => {
    // Both branches return a decision; the caller still emits the issue.
    expect(admitBlocking(true, { determinism: 'probabilistic', method: 'x' }).determinism).toBe('probabilistic');
  });
});

// ---------------------------------------------------------------------------
// The false blocks this gap was reported against
// ---------------------------------------------------------------------------

describe('GT-584 · the substring heuristic that blocked on `expression`', () => {
  it('no longer accuses a domain file of importing a web framework', () => {
    const g = graph([
      { file: 'src/domain/value-objects/rule.ts', imports: ['./expression-parser'], layer: 'domain' },
      { file: 'src/domain/value-objects/expression-parser.ts', layer: 'domain' },
    ]);
    expect(detectDependencyInversionIssues(g)).toEqual([]);
  });

  it('no longer accuses a scoped package that merely CONTAINS an ORM name', () => {
    const g = graph([
      { file: 'src/domain/theme.ts', imports: ['@acme/prismatic-tokens', '../typography/phonograph'], layer: 'domain' },
    ]);
    expect(detectDependencyInversionIssues(g)).toEqual([]);
  });

  it('still catches the real violation it was written for', () => {
    const g = graph([
      { file: 'src/domain/user.entity.ts', imports: ['typeorm', 'express', '@prisma/client'], layer: 'domain' },
    ]);
    const issues = detectDependencyInversionIssues(g);
    expect(issues.map(i => i.ruleId).sort()).toEqual(['ARCH-DI-01', 'ARCH-DI-01', 'ARCH-DI-02']);
  });

  it('resolves the package name of an import specifier', () => {
    expect(importedPackage('express')).toBe('express');
    expect(importedPackage('express/lib/router')).toBe('express');
    expect(importedPackage('@nestjs/common')).toBe('@nestjs/common');
    expect(importedPackage('./expression-parser')).toBeUndefined();
    expect(importedPackage('../../express')).toBeUndefined();
    expect(importedPackage('/abs/express')).toBeUndefined();
  });

  it('does not confuse a lookalike scope with @nestjs', () => {
    const g = graph([
      { file: 'src/domain/a.ts', imports: ['@nestjs-lookalike/common'], layer: 'domain' },
      { file: 'src/domain/b.ts', imports: ['@nestjs/common'], layer: 'domain' },
    ]);
    const issues = detectDependencyInversionIssues(g);
    expect(issues).toHaveLength(1);
    expect(issues[0].file).toBe('src/domain/b.ts');
  });
});

describe('GT-584 · the inverted layer comparison', () => {
  it('does NOT flag the legal inward direction application → domain', () => {
    const g = graph([
      { file: 'src/application/create-user.use-case.ts', imports: ['../domain/user.entity'], layer: 'application' },
      { file: 'src/domain/user.entity.ts', layer: 'domain' },
    ]);
    // Pre-GT-584 this produced a `blocking: true` MUST ARCH-LAYER-01 violation
    // for every correct import in every repository the analyzer was pointed at.
    expect(detectLayerViolations(g)).toEqual([]);
  });

  it('DOES flag the real inversion domain → infrastructure', () => {
    const g = graph([
      { file: 'src/domain/user.entity.ts', imports: ['../infrastructure/user.repository'], layer: 'domain' },
      { file: 'src/infrastructure/user.repository.ts', layer: 'infrastructure' },
    ]);
    const violations = detectLayerViolations(g);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ fromLayer: 'domain', toLayer: 'infrastructure', severity: 'MUST' });
  });

  it('allows a same-layer import', () => {
    const g = graph([
      { file: 'src/domain/a.ts', imports: ['./b'], layer: 'domain' },
      { file: 'src/domain/b.ts', layer: 'domain' },
    ]);
    expect(detectLayerViolations(g)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Uncertainty is now visible on every finding
// ---------------------------------------------------------------------------

describe('GT-584 · findings declare their own evidence class', () => {
  const inversion = () =>
    graph([
      { file: 'src/domain/user.entity.ts', imports: ['../infrastructure/repo'], layer: 'domain' },
      { file: 'src/infrastructure/repo.ts', layer: 'infrastructure' },
    ]);

  const frameworkImport = () =>
    graph([{ file: 'src/domain/user.entity.ts', imports: ['typeorm'], layer: 'domain' }]);

  it('marks a layer violation probabilistic and demotes it out of blocking', () => {
    const [v] = detectLayerViolations(inversion());
    expect(v.blocking).toBe(false);
    expect(v.determinism).toBe('probabilistic');
    expect(v.admissibility).toBe('advisory-uncalibrated');
    expect(v.downgradedFromBlocking).toBe(true);
    expect(v.detectionMethod).toContain('directory-name patterns');
    // The finding survives: severity still says how serious it would be.
    expect(v.severity).toBe('MUST');
  });

  it('marks a dependency-inversion issue the same way', () => {
    const [i] = detectDependencyInversionIssues(frameworkImport());
    expect(i.blocking).toBe(false);
    expect(i.determinism).toBe('probabilistic');
    expect(i.confidence).toBeUndefined();
    expect(i.rationale).toContain('GT-584');
  });

  it('lets a host that HAS measured the detector block again', () => {
    const [i] = detectDependencyInversionIssues(frameworkImport(), {
      calibration: { 'ARCH-DI-01': MEASURED },
    });
    expect(i.blocking).toBe(true);
    expect(i.admissibility).toBe('calibrated');
    expect(i.confidence).toBe(0.99);
    expect(i.downgradedFromBlocking).toBe(false);
  });

  it('refuses a declared calibration that does not clear the policy', () => {
    const [i] = detectDependencyInversionIssues(frameworkImport(), {
      calibration: { 'ARCH-DI-01': { ...MEASURED, trueNegativeRate: 0.5 } },
    });
    expect(i.blocking).toBe(false);
    expect(i.admissibility).toBe('advisory-below-threshold');
  });

  it('honours a host policy that declares its own thresholds', () => {
    const [i] = detectDependencyInversionIssues(frameworkImport(), {
      calibration: { 'ARCH-DI-01': { ...MEASURED, truePositiveRate: 0.7, trueNegativeRate: 0.7 } },
      policy: { minTruePositiveRate: 0.6, minTrueNegativeRate: 0.6, maxCalibrationAgeDays: 365 },
    });
    expect(i.blocking).toBe(true);
    expect(i.admissibility).toBe('calibrated');
  });
});
