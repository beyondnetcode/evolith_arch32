/**
 * Policy freezing / baseline + ratchet (GT-517 · EAG-12) — spec.
 *
 * Proves the three acceptance criteria against the ONE authoritative baseline:
 *  - AC1: applyBaseline partitions frozen vs fresh; frozen carry `frozen:true`.
 *  - AC2: a re-worded violation keeps its fingerprint, so it survives a tool upgrade.
 *  - AC3: ratchet fails on growth, passes on subset; rebase shrinks on disappearance.
 */

import { makeViolation, type Violation, type ViolationSeverity } from '../../../evaluation/violation';
import {
  applyBaseline,
  decide,
  freezeViolations,
  POLICY_BASELINE_VERSION,
  ratchet,
  rebase,
  type PolicyBaseline,
} from './policy-baseline';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function v(
  over: Partial<Pick<Violation, 'ruleId' | 'tool' | 'file' | 'line' | 'column' | 'severity' | 'message'>> = {},
): Violation {
  return makeViolation({
    ruleId: over.ruleId ?? 'HXA-01',
    tool: over.tool ?? 'dependency-cruiser',
    file: over.file ?? 'src/a.ts',
    line: over.line,
    column: over.column,
    severity: (over.severity ?? 'error') as ViolationSeverity,
    message: over.message ?? 'no-circular dependency',
  });
}

// ---------------------------------------------------------------------------
// freezeViolations
// ---------------------------------------------------------------------------

describe('freezeViolations', () => {
  it('captures fingerprints deduped and sorted, at the current schema version', () => {
    const a = v({ file: 'src/a.ts' });
    const b = v({ file: 'src/b.ts' });
    const dupOfA = v({ file: 'src/a.ts', message: 'different wording, same fingerprint' });

    const baseline = freezeViolations([b, a, dupOfA]);

    expect(baseline.version).toBe(POLICY_BASELINE_VERSION);
    // deduped (a === dupOfA fingerprint) and sorted
    expect(baseline.frozen).toEqual([...new Set([a.fingerprint, b.fingerprint])].sort());
    expect(baseline.frozen.length).toBe(2);
  });

  it('is empty for no violations and omits createdAt unless supplied', () => {
    expect(freezeViolations([]).frozen).toEqual([]);
    expect(freezeViolations([]).createdAt).toBeUndefined();
    expect(freezeViolations([v()], { createdAt: '2026-07-12T00:00:00Z' }).createdAt).toBe(
      '2026-07-12T00:00:00Z',
    );
  });
});

// ---------------------------------------------------------------------------
// AC1 — applyBaseline partitions frozen vs fresh
// ---------------------------------------------------------------------------

describe('AC1 · applyBaseline partitions existing (frozen) vs NEW (fresh)', () => {
  it('freezes covered violations and surfaces only NEW ones as fresh', () => {
    const existing1 = v({ file: 'src/a.ts' });
    const existing2 = v({ file: 'src/b.ts' });
    const brandNew = v({ file: 'src/c.ts' });

    const baseline = freezeViolations([existing1, existing2]);
    const { frozen, fresh } = applyBaseline([existing1, existing2, brandNew], baseline);

    expect(frozen.map((x) => x.fingerprint).sort()).toEqual(
      [existing1.fingerprint, existing2.fingerprint].sort(),
    );
    expect(fresh).toHaveLength(1);
    expect(fresh[0].fingerprint).toBe(brandNew.fingerprint);
  });

  it('sets frozen:true on covered violations and frozen:false on fresh ones', () => {
    const existing = v({ file: 'src/a.ts' });
    const brandNew = v({ file: 'src/c.ts' });
    const baseline = freezeViolations([existing]);

    const { frozen, fresh } = applyBaseline([existing, brandNew], baseline);

    expect(frozen).toHaveLength(1);
    expect(frozen[0].frozen).toBe(true);
    expect(fresh).toHaveLength(1);
    expect(fresh[0].frozen).toBe(false);
  });

  it('normalizes a stale frozen flag on an uncovered violation back to false', () => {
    const stale = makeViolation({
      ruleId: 'HXA-02',
      tool: 'deptrac',
      file: 'src/x.ts',
      severity: 'error',
      message: 'orphaned frozen flag',
      frozen: true, // was frozen elsewhere, but this baseline does not cover it
    });
    const { frozen, fresh } = applyBaseline([stale], freezeViolations([]));

    expect(frozen).toHaveLength(0);
    expect(fresh).toHaveLength(1);
    expect(fresh[0].frozen).toBe(false);
  });

  it('everything is fresh against an empty baseline; nothing blocks in warn mode', () => {
    const a = v({ file: 'src/a.ts' });
    const b = v({ file: 'src/b.ts' });
    const { frozen, fresh } = applyBaseline([a, b], freezeViolations([]));

    expect(frozen).toHaveLength(0);
    expect(fresh).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// AC2 — baseline survives a tool upgrade (message reworded, fingerprint stable)
// ---------------------------------------------------------------------------

describe('AC2 · baseline survives tool upgrades (fingerprint excludes message)', () => {
  it('two makeViolation() calls identical except message share the same fingerprint', () => {
    const before = makeViolation({
      ruleId: 'HXA-01',
      tool: 'dependency-cruiser',
      file: 'src/a.ts',
      line: 12,
      column: 4,
      severity: 'error',
      message: 'module A must not depend on module B',
    });
    const afterUpgrade = makeViolation({
      ruleId: 'HXA-01',
      tool: 'dependency-cruiser',
      file: 'src/a.ts',
      line: 12,
      column: 4,
      severity: 'error',
      message: 'dependency from A to B violates the no-circular boundary [reworded in v2]',
    });

    expect(afterUpgrade.message).not.toBe(before.message);
    expect(afterUpgrade.fingerprint).toBe(before.fingerprint);
  });

  it('a reworded violation stays covered by the baseline after rebase', () => {
    const before = v({ file: 'src/a.ts', message: 'old wording' });
    const baseline = freezeViolations([before]);

    // Tool upgrade re-reports the SAME violation with new prose.
    const afterUpgrade = v({ file: 'src/a.ts', message: 'brand new v2 wording' });

    const rebased = rebase(baseline, [afterUpgrade]);
    expect(rebased.frozen).toEqual(baseline.frozen); // baseline intact across the upgrade

    // and it is still frozen (not surfaced as a NEW violation)
    const { frozen, fresh } = applyBaseline([afterUpgrade], rebased);
    expect(fresh).toHaveLength(0);
    expect(frozen).toHaveLength(1);
    expect(frozen[0].frozen).toBe(true);
    expect(frozen[0].message).toBe('brand new v2 wording');
  });
});

// ---------------------------------------------------------------------------
// AC3 — ratchet fails on growth; rebase shrinks on disappearance; ONE baseline
// ---------------------------------------------------------------------------

describe('AC3 · ratchet + rebase (baseline may only shrink)', () => {
  it('ratchet ok:false and reports grew when a NEW fingerprint appears', () => {
    const existing = v({ file: 'src/a.ts' });
    const baseline = freezeViolations([existing]);

    const brandNew = v({ file: 'src/new.ts' });
    const res = ratchet(baseline, [existing, brandNew]);

    expect(res.ok).toBe(false);
    expect(res.grew).toEqual([brandNew.fingerprint]);
    expect(res.shrank).toEqual([]);
  });

  it('ratchet ok:true when current ⊆ baseline (subset, no growth)', () => {
    const a = v({ file: 'src/a.ts' });
    const b = v({ file: 'src/b.ts' });
    const baseline = freezeViolations([a, b]);

    // only `a` still present — a strict subset
    const res = ratchet(baseline, [a]);

    expect(res.ok).toBe(true);
    expect(res.grew).toEqual([]);
    expect(res.shrank).toEqual([b.fingerprint]); // b disappeared → rebase candidate
  });

  it('rebase drops fingerprints of frozen violations that have disappeared', () => {
    const a = v({ file: 'src/a.ts' });
    const b = v({ file: 'src/b.ts' });
    const baseline = freezeViolations([a, b]);

    const rebased = rebase(baseline, [a]); // b fixed / gone

    expect(rebased.frozen).toEqual([a.fingerprint]);
    expect(rebased.frozen).not.toContain(b.fingerprint);
    // ratchet-down: strictly smaller
    expect(rebased.frozen.length).toBeLessThan(baseline.frozen.length);
  });

  it('rebase never adds fingerprints (a NEW violation does not enter the baseline)', () => {
    const a = v({ file: 'src/a.ts' });
    const baseline = freezeViolations([a]);
    const brandNew = v({ file: 'src/new.ts' });

    const rebased = rebase(baseline, [a, brandNew]);

    expect(rebased.frozen).toEqual([a.fingerprint]);
    expect(rebased.frozen).not.toContain(brandNew.fingerprint);
  });

  it('there is ONE authoritative baseline object — no separate native/enforcer stores', () => {
    // native + enforcer violations share the SINGLE fingerprint space and one baseline.
    const nativeViolation = v({ tool: 'native', ruleId: 'HXA-01', file: 'src/a.ts' });
    const enforcerViolation = v({ tool: 'dependency-cruiser', ruleId: 'no-circular', file: 'src/b.ts' });

    const baseline: PolicyBaseline = freezeViolations([nativeViolation, enforcerViolation]);

    // one object, one `frozen` set covering both engines
    expect(Object.keys(baseline).sort()).toEqual(['frozen', 'version']);
    expect(baseline.frozen).toContain(nativeViolation.fingerprint);
    expect(baseline.frozen).toContain(enforcerViolation.fingerprint);

    const { frozen, fresh } = applyBaseline([nativeViolation, enforcerViolation], baseline);
    expect(fresh).toHaveLength(0);
    expect(frozen).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// decide (warn vs block)
// ---------------------------------------------------------------------------

describe('decide · warn never blocks, block gates on fresh errors', () => {
  it('block mode: any fresh error-severity violation blocks', () => {
    const err = v({ file: 'src/new.ts', severity: 'error' });
    const { frozen, fresh } = applyBaseline([err], freezeViolations([]));

    expect(frozen).toHaveLength(0);
    expect(decide(fresh, 'block')).toEqual({ blocking: true, count: 1 });
  });

  it('warn mode: nothing blocks even with fresh errors', () => {
    const err = v({ file: 'src/new.ts', severity: 'error' });
    const { fresh } = applyBaseline([err], freezeViolations([]));

    expect(decide(fresh, 'warn')).toEqual({ blocking: false, count: 1 });
  });

  it('block mode: fresh warnings/infos do not block (count is error-only)', () => {
    const warn = v({ file: 'src/w.ts', severity: 'warning' });
    const info = v({ file: 'src/i.ts', severity: 'info' });
    const { fresh } = applyBaseline([warn, info], freezeViolations([]));

    expect(decide(fresh, 'block')).toEqual({ blocking: false, count: 0 });
  });

  it('frozen violations never reach decide, so they never block', () => {
    const existing = v({ file: 'src/a.ts', severity: 'error' });
    const baseline = freezeViolations([existing]);
    const { fresh } = applyBaseline([existing], baseline);

    expect(fresh).toHaveLength(0);
    expect(decide(fresh, 'block')).toEqual({ blocking: false, count: 0 });
  });
});
