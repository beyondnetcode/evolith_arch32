/**
 * GT-704 — unit tests for the comparison itself.
 *
 * The live guard needs both engines built, so the properties that decide whether
 * a conflict is REAL are asserted here against hand-built reports. Each test below
 * was written against a deliberately wrong version of the function first (see the
 * note in `lib/coverage.mjs`: a test that passes before the fix proves nothing).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  deriveOutcomes,
  outcomeOf,
  jointlyDecided,
  toDecisions,
  reconcileBaseline,
} from './68-validate-engine-verdict-parity.mjs';

test('a rule with no mention anywhere in the report was decided and clean', () => {
  const outcomes = deriveOutcomes({ issues: [] });
  assert.equal(outcomeOf(outcomes, 'ANY-01'), 'passed');
});

test('an issue makes a rule failed', () => {
  const outcomes = deriveOutcomes({ issues: [{ ruleId: 'X-01', severity: 'MUST' }] });
  assert.equal(outcomeOf(outcomes, 'X-01'), 'failed');
});

test('a SKIPPED rule that also carries an issue stays skipped — this is the whole comparison', () => {
  // The reporter raises "blocking rule did not run" ABOUT the skip. Reading it as a
  // verdict turns a coverage difference into a fake conflict; 144 of these exist on
  // the real corpus, so getting this backwards would flood the guard with noise.
  const outcomes = deriveOutcomes({
    skippedRuleIds: ['ACL-02'],
    issues: [{ ruleId: 'ACL-02', severity: 'MUST', title: 'Blocking rule did not run' }],
  });
  assert.equal(outcomeOf(outcomes, 'ACL-02'), 'skipped');
});

test('not-applicable, non-executable and errored are all "did not decide"', () => {
  const outcomes = deriveOutcomes({
    notApplicableRuleIds: ['A-01'],
    nonExecutableRuleIds: ['B-01'],
    erroredRuleIds: ['C-01'],
    issues: [{ ruleId: 'B-01' }, { ruleId: 'C-01' }],
  });
  assert.equal(outcomeOf(outcomes, 'A-01'), 'not-applicable');
  assert.equal(outcomeOf(outcomes, 'B-01'), 'non-executable');
  assert.equal(outcomeOf(outcomes, 'C-01'), 'errored');
});

test('only rules BOTH engines decided are comparable', () => {
  const native = deriveOutcomes({ issues: [{ ruleId: 'BOTH-01' }] });
  const opa = deriveOutcomes({ skippedRuleIds: ['ONLY-NATIVE'], issues: [] });
  const universe = new Set(['BOTH-01', 'ONLY-NATIVE', 'NEITHER-01']);

  // BOTH-01: native failed / opa passed. ONLY-NATIVE: opa skipped it, so it is
  // complementary coverage and NOT a conflict. NEITHER-01: passed by both.
  assert.deepEqual(jointlyDecided(native, opa, universe), ['BOTH-01', 'NEITHER-01']);
});

test('the decision list handed to diffDecisions is deduplicated and scoped', () => {
  const data = {
    issues: [
      { ruleId: 'IN-01', severity: 'MUST', file: 'a.ts' },
      { ruleId: 'IN-01', severity: 'SHOULD', file: 'b.ts' },
      { ruleId: 'OUT-01', severity: 'MUST' },
    ],
  };
  const decisions = toDecisions(data, ['IN-01']);
  assert.deepEqual(decisions, [{ ruleId: 'IN-01', severity: 'MUST', file: 'a.ts' }]);
});

test('an unregistered conflict is reported — this is the guard going red', () => {
  const { unregistered, stale } = reconcileBaseline(
    [{ ruleId: 'NEW-01' }, { ruleId: 'KNOWN-01' }],
    { conflicts: [{ ruleId: 'KNOWN-01', reason: 'measured' }] },
  );
  assert.deepEqual(unregistered.map((c) => c.ruleId), ['NEW-01']);
  assert.deepEqual(stale, []);
});

test('a baselined conflict that no longer conflicts is ALSO red — the ratchet closes both ways', () => {
  // Without this, a baseline becomes permanent permission: the disagreement is fixed,
  // the entry survives, and the next reader believes the rule still diverges.
  const { unregistered, stale } = reconcileBaseline(
    [],
    { conflicts: [{ ruleId: 'FIXED-01', reason: 'measured 2026-08-18' }] },
  );
  assert.deepEqual(unregistered, []);
  assert.deepEqual(stale.map((c) => c.ruleId), ['FIXED-01']);
});

test('an empty baseline file is not an excuse — every conflict is unregistered', () => {
  const { unregistered } = reconcileBaseline([{ ruleId: 'A' }, { ruleId: 'B' }], { conflicts: [] });
  assert.deepEqual(unregistered.map((c) => c.ruleId), ['A', 'B']);
});
