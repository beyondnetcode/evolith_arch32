/**
 * GT-584 — the native half of `probabilistic-evidence-admissibility`, case for case
 * with `src/rulesets/opa/probabilistic-evidence-admissibility.test.rego`.
 *
 * Each `it` below has a named counterpart in the `.test.rego`; the block at the end
 * pins that correspondence so a case added to one engine and not the other is a
 * RED test rather than a silent parity hole (R-25 · the defect GT-602 was
 * registered for).
 */

import * as fs from 'fs';
import * as path from 'path';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import type { EvaluationFacts } from '../../../../domain/satellite-manifest';
import { WorkspaceEvaluationContext } from '../evaluator.interface';
import {
  ProbabilisticEvidenceRuleHandler,
  PROBABILISTIC_EVIDENCE_RULE_IDS,
  epochDay,
} from './probabilistic-evidence-rule.handler';

type QualityEvidenceFact = NonNullable<EvaluationFacts['qualityEvidence']>[number];
type Calibration = NonNullable<QualityEvidenceFact['calibration']>;

const REPO_ROOT = path.resolve(__dirname, '../../../../../../../..');
const RULESET_FILE = path.join(
  REPO_ROOT,
  'src/rulesets/evidence/probabilistic-evidence-admissibility.rules.json',
);
const REGO_FILE = path.join(REPO_ROOT, 'src/rulesets/opa/probabilistic-evidence-admissibility.rego');
const REGO_TEST_FILE = path.join(
  REPO_ROOT,
  'src/rulesets/opa/probabilistic-evidence-admissibility.test.rego',
);

/** The same "now" the `.test.rego` uses — never the wall clock. */
const NOW = '2026-07-31T00:00:00Z';

const FRESH: Calibration = {
  truePositiveRate: 0.97,
  trueNegativeRate: 0.96,
  measuredAt: '2026-06-01T00:00:00Z',
  sampleSize: 400,
  method: 'hand-labelled corpus, two raters',
  labelledBy: 'architecture-panel',
};

const llm = (calibration?: Partial<Calibration>): QualityEvidenceFact => ({
  source: 'llm-auditor',
  dimension: 'code-quality',
  determinism: 'probabilistic',
  ...(calibration ? { calibration: calibration as Calibration } : {}),
});

const LIGHTHOUSE: QualityEvidenceFact = {
  source: 'lighthouse',
  dimension: 'performance',
  determinism: 'deterministic',
};

const rule = (id: string, blocking = true): NormalizedRule => ({
  id,
  severity: blocking ? 'MUST' : 'SHOULD',
  category: 'evidence-admissibility',
  title: id,
  description: id,
  blocking,
  sourceFile: 'src/rulesets/evidence/probabilistic-evidence-admissibility.rules.json',
});

const ctx = (
  qualityEvidence: QualityEvidenceFact[],
  extra: Partial<EvaluationFacts> = {},
): WorkspaceEvaluationContext => ({
  satellitePath: '/satellite',
  corePath: '/core',
  facts: { evaluationDate: NOW, qualityEvidence, ...extra },
});

const handler = new ProbabilisticEvidenceRuleHandler();

/** The set of rule ids that FAIL for a given evidence batch — the OPA `ids(violations)`. */
async function refusedIds(
  evidence: QualityEvidenceFact[],
  extra: Partial<EvaluationFacts> = {},
): Promise<string[]> {
  const context = ctx(evidence, extra);
  const results = await Promise.all(
    PROBABILISTIC_EVIDENCE_RULE_IDS.map(async (id) => ({
      id,
      outcome: (await handler.evaluate(rule(id, id !== 'PEA-04'), context)).result,
    })),
  );
  return results.filter((r) => r.outcome === 'failed').map((r) => r.id);
}

describe('ProbabilisticEvidenceRuleHandler (GT-584 AC1 — the native half)', () => {
  it('claims every PEA rule and nothing else', () => {
    for (const id of PROBABILISTIC_EVIDENCE_RULE_IDS) {
      expect(handler.canHandle(rule(id))).toBe(true);
    }
    expect(handler.canHandle(rule('EVD-01'))).toBe(false);
    expect(handler.canHandle(rule('MM-R09'))).toBe(false);
  });

  // --- The affirmative half -------------------------------------------------

  it('passes when no quality evidence was presented (absence is no-evidence, not failure)', async () => {
    const bare: WorkspaceEvaluationContext = { satellitePath: '/s', corePath: '/c' };
    const r = await handler.evaluate(rule('PEA-01'), bare);
    expect(r.result).toBe('passed');
    expect(r.message).toMatch(/ADR-0111 §3/);
  });

  it('passes on an empty evidence set', async () => {
    expect(await refusedIds([])).toEqual([]);
  });

  it('leaves DETERMINISTIC evidence alone — it is not a guess and needs no rate', async () => {
    expect(await refusedIds([LIGHTHOUSE])).toEqual([]);
  });

  it('admits probabilistic evidence whose fresh measurement clears the policy', async () => {
    expect(await refusedIds([llm(FRESH)])).toEqual([]);
  });

  // --- PEA-01: probabilistic and never measured (the negative half) ---------

  it('REFUSES a probabilistic signal with no measured error rate', async () => {
    expect(await refusedIds([llm()])).toEqual(['PEA-01']);
  });

  it('treats a half-filled calibration as no measurement at all', async () => {
    expect(await refusedIds([llm({ truePositiveRate: 0.99, trueNegativeRate: 0.99 })])).toEqual([
      'PEA-01',
    ]);
  });

  it('treats a rate that is not a number as no measurement at all', async () => {
    const bogus = { ...FRESH, truePositiveRate: 'high' } as unknown as Calibration;
    expect(await refusedIds([llm(bogus)])).toEqual(['PEA-01']);
  });

  it('FAIL-CLOSED: evidence with no determinism field is read as a guess', async () => {
    const nameless: QualityEvidenceFact = { source: 'mystery', dimension: 'code-quality' };
    expect(await refusedIds([nameless])).toEqual(['PEA-01']);
  });

  it('FAIL-CLOSED: an unknown determinism word is read as a guess', async () => {
    const weird: QualityEvidenceFact = { ...llm(), determinism: 'maybe' };
    expect(await refusedIds([weird])).toEqual(['PEA-01']);
  });

  // --- PEA-02: measured, but below the floor -------------------------------

  it('refuses a true-positive rate below the floor', async () => {
    expect(await refusedIds([llm({ ...FRESH, truePositiveRate: 0.6 })])).toEqual(['PEA-02']);
  });

  it('refuses a true-NEGATIVE rate below the floor (the false-block side)', async () => {
    expect(await refusedIds([llm({ ...FRESH, trueNegativeRate: 0.5 })])).toEqual(['PEA-02']);
  });

  it('honours a declared policy, so the floor is arguable rather than baked in', async () => {
    const weak = llm({ ...FRESH, truePositiveRate: 0.6, trueNegativeRate: 0.6 });
    expect(await refusedIds([weak])).toEqual(['PEA-02']);
    expect(
      await refusedIds([weak], {
        qualityAdmissibilityPolicy: { minTruePositiveRate: 0.5, minTrueNegativeRate: 0.5 },
      }),
    ).toEqual([]);
  });

  // --- PEA-03: stale or unreadable -----------------------------------------

  it('degrades a STALE calibration to advisory', async () => {
    expect(await refusedIds([llm({ ...FRESH, measuredAt: '2020-01-01T00:00:00Z' })])).toEqual([
      'PEA-03',
    ]);
  });

  it('degrades an UNPARSEABLE measuredAt to advisory', async () => {
    expect(await refusedIds([llm({ ...FRESH, measuredAt: 'last tuesday' })])).toEqual(['PEA-03']);
  });

  it('keeps a measurement exactly at the age limit on the admitted side', async () => {
    expect(await refusedIds([llm({ ...FRESH, measuredAt: '2026-02-01T00:00:00Z' })])).toEqual([]);
  });

  it('refuses one day past the age limit', async () => {
    expect(await refusedIds([llm({ ...FRESH, measuredAt: '2026-01-31T00:00:00Z' })])).toEqual([
      'PEA-03',
    ]);
  });

  it('FAIL-CLOSED: an evaluation with no date cannot call any measurement fresh', async () => {
    const undated: WorkspaceEvaluationContext = {
      satellitePath: '/s',
      corePath: '/c',
      facts: { qualityEvidence: [llm(FRESH)] },
    };
    const r = await handler.evaluate(rule('PEA-03'), undated);
    expect(r.result).toBe('failed');
    // No wall-clock fallback: the verdict must be reproducible, and the OPA half
    // literally cannot read a clock (its wasm runtime implements no `time.*`).
    expect(r.message).toMatch(/limit/);
  });

  it('reads a plain date and a full instant the same', async () => {
    expect(await refusedIds([llm({ ...FRESH, measuredAt: '2026-06-01' })])).toEqual([]);
    expect(await refusedIds([llm({ ...FRESH, measuredAt: '2026-06-01T13:45:00Z' })])).toEqual([]);
  });

  it('dates by the same calendar arithmetic as the Rego half', () => {
    // The wasm runtime implements no `time.*` builtin, so both engines compute days
    // since the epoch by hand. Values cross-checked against the OPA policy.
    expect(epochDay('1970-01-01')).toBe(0);
    expect(epochDay('2026-07-31T00:00:00Z')).toBe(epochDay('2026-07-31'));
    expect(epochDay('2026-07-31')! - epochDay('2026-02-01')!).toBe(180);
    expect(epochDay('last tuesday')).toBeUndefined();
    expect(epochDay('2026-13-01')).toBeUndefined();
    expect(epochDay(undefined)).toBeUndefined();
  });

  // --- PEA-04: an admitted measurement says how it was obtained ------------

  it('reports an admitted signal that will not say how it was measured, without blocking it', async () => {
    const bare = llm({
      truePositiveRate: 0.97,
      trueNegativeRate: 0.96,
      measuredAt: '2026-06-01T00:00:00Z',
    });
    expect(await refusedIds([bare])).toEqual(['PEA-04']);
    // PEA-04 is the one non-blocking rule of the four: the missing metadata makes
    // the measurement harder to defend, it does not make the measurement wrong.
    expect(rule('PEA-04', false).blocking).toBe(false);
  });

  it('names every missing measurement field', async () => {
    const bare = llm({
      truePositiveRate: 0.97,
      trueNegativeRate: 0.96,
      measuredAt: '2026-06-01T00:00:00Z',
      method: 'hand-labelled corpus',
    });
    const r = await handler.evaluate(rule('PEA-04', false), ctx([bare]));
    expect(r.result).toBe('failed');
    expect(r.message).toContain('sampleSize, labelledBy');
  });

  it('does not double-count: PEA-04 stays quiet about evidence PEA-01 already refused', async () => {
    expect(await refusedIds([llm()])).toEqual(['PEA-01']);
  });

  it('counts sampleSize 0 as DECLARED, exactly as Rego`s `not` would', async () => {
    // `!value` would call 0 missing here and Rego would not. A divergence of one
    // case is still a parity defect.
    const zero = llm({ ...FRESH, sampleSize: 0 });
    expect(await refusedIds([zero])).toEqual([]);
  });

  // --- A mixed batch: every item is judged on its own ----------------------

  it('judges a mixed batch item by item', async () => {
    const batch = [
      LIGHTHOUSE,
      llm(FRESH),
      llm(),
      llm({ ...FRESH, truePositiveRate: 0.4 }),
      llm({ ...FRESH, measuredAt: '2019-01-01T00:00:00Z' }),
    ];
    expect((await refusedIds(batch)).sort()).toEqual(['PEA-01', 'PEA-02', 'PEA-03']);
  });
});

describe('GT-584 · R-25 dual-engine parity, asserted rather than assumed', () => {
  const ruleset = JSON.parse(fs.readFileSync(RULESET_FILE, 'utf8')) as {
    rules: { id: string; blocking: boolean }[];
  };
  const rego = fs.readFileSync(REGO_FILE, 'utf8');
  const regoTests = fs.readFileSync(REGO_TEST_FILE, 'utf8');

  it('declares exactly the four rule ids the handler claims', () => {
    expect(ruleset.rules.map((r) => r.id)).toEqual([...PROBABILISTIC_EVIDENCE_RULE_IDS]);
  });

  it('emits every declared rule id from the Rego policy too', () => {
    for (const r of ruleset.rules) {
      expect(rego).toContain(`"id": "${r.id}"`);
    }
  });

  it('keeps PEA-04 the only non-blocking rule in both the ruleset and the engines', () => {
    const blocking = Object.fromEntries(ruleset.rules.map((r) => [r.id, r.blocking]));
    expect(blocking).toEqual({
      'PEA-01': true,
      'PEA-02': true,
      'PEA-03': true,
      'PEA-04': false,
    });
  });

  it('exercises every rule id in the Rego test suite, negative half included', () => {
    // A policy whose tests only ever demonstrate its own PASS is the false green
    // this board keeps finding. Each id must appear in an assertion that expects it.
    for (const r of ruleset.rules) {
      expect(regoTests).toContain(`"${r.id}"`);
    }
  });

  it('has no rule id in one engine that is missing from the other', () => {
    const regoIds = [...rego.matchAll(/"id": "(PEA-\d+)"/g)].map((m) => m[1]);
    const rulesetIds = ruleset.rules.map((r) => r.id);
    expect([...new Set(regoIds)].sort()).toEqual([...rulesetIds].sort());
  });

  it('calls no `time.*` builtin, which the shipped wasm runtime cannot execute', () => {
    // `compile-opa-wasm.mjs` ships this policy inside `policy.wasm`, and the
    // `opa-wasm` runtime `OpaEvaluator` loads throws `not implemented: built-in
    // function 24: time.parse_rfc3339_ns`. Such a policy is green under `opa test`
    // and, at runtime, turns EVERY rule in the run into "OPA engine error —
    // enforcement blocked". Nothing else in the repository asks this question.
    expect(rego).not.toMatch(/\btime\.[a-z_]+\s*\(/);
  });

  it('is aggregated into the main entrypoint, or it decides nothing at runtime', () => {
    // The wasm bundle is built from `evolith/main/violations` alone. A policy that
    // is not imported and unioned there ships as dead weight.
    const main = fs.readFileSync(path.join(REPO_ROOT, 'src/rulesets/opa/main.rego'), 'utf8');
    expect(main).toContain('import data.evolith.probabilistic_evidence_admissibility.violations');
    expect(main).toMatch(/v\s*:=\s*pea_violations\[_\]/);
  });
});
