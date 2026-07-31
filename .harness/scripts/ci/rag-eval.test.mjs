/**
 * GT-592 — self-tests for the retrieval eval harness.
 *
 * A CI gate that cannot fail is worse than no gate: it reports green forever and
 * everyone stops reading it. So the important assertions here are the NEGATIVE
 * ones — retrieval is deliberately damaged and the gate is watched going red.
 * Three independent kinds of damage are exercised, because each trips a
 * different condition:
 *
 *   · a shuffled ranking          -> nDCG regression below the recorded floor
 *   · truncation to top-1         -> nDCG regression
 *   · dropping the lexical winner -> hybrid stops beating dense on identifiers
 *
 * Run: node --test .harness/scripts/ci/rag-eval.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

import {
  ndcgAt,
  reciprocalRank,
  successAt1,
  scoreRanking,
  gate,
  runEval,
  corpusFingerprint,
  REGRESSION_TOLERANCE,
  CORPUS_PATH,
  DENSE_PATH,
  loadDenseBaseline,
  loadQueries,
  K,
} from './rag-eval.mjs';

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

test('ndcg@k is 1 for a perfect ranking', () => {
  assert.equal(ndcgAt([true, true, true], 3), 1);
});

test('ndcg@k caps the ideal at k so a many-chunk document is not punished', () => {
  // Without the cap, a gold document split into 40 chunks could never score 1.0
  // however perfect the ranking, and the metric would measure chunking instead
  // of retrieval.
  assert.equal(ndcgAt(new Array(10).fill(true), 40, 10), 1);
});

test('ndcg@k rewards putting the relevant result earlier', () => {
  const early = ndcgAt([true, false, false], 1);
  const late = ndcgAt([false, false, true], 1);
  assert.ok(early > late);
});

test('ndcg@k is 0 when nothing relevant is retrieved', () => {
  assert.equal(ndcgAt([false, false], 1), 0);
});

test('ndcg@k is 0, not NaN, when the corpus has no relevant document', () => {
  assert.equal(ndcgAt([false], 0), 0);
});

test('reciprocal rank finds the first relevant position', () => {
  assert.equal(reciprocalRank([false, false, true]), 1 / 3);
  assert.equal(reciprocalRank([false, false, false]), 0);
});

test('reciprocal rank ignores relevance beyond k', () => {
  const flags = new Array(K).fill(false).concat([true]);
  assert.equal(reciprocalRank(flags, K), 0);
});

test('success@1 measures only the top result', () => {
  assert.equal(successAt1([true, false]), 1);
  assert.equal(successAt1([false, true]), 0);
});

test('scoreRanking labels by source file, not by chunk id', () => {
  // File-level gold is what makes the labels mechanical: the answer to
  // `ADR-0034` is the file numbered 0034, with no judgement about which of its
  // chunks "really" answers the question.
  const chunks = [{ sourceFile: 'a.md' }, { sourceFile: 'b.md' }];
  const scored = scoreRanking(chunks, ['b.md'], 1);
  assert.equal(scored.success1, 0);
  assert.equal(scored.mrr, 1 / 2);
  assert.equal(scored.topSource, 'a.md');
});

// ---------------------------------------------------------------------------
// The gate, on synthetic reports
// ---------------------------------------------------------------------------

function report({ hybridNdcg, denseNdcg }) {
  return {
    hybrid: { byGroup: { identifier: { ndcg10: hybridNdcg, queries: 15 } }, overall: {} },
    dense: { byGroup: { identifier: { ndcg10: denseNdcg, queries: 15 } }, overall: {} },
  };
}

const THRESHOLDS = {
  byGroup: { identifier: { ndcg10: 0.9 } },
  hybridMustBeatDenseOn: ['identifier'],
};

test('gate passes when hybrid holds its recorded level and still beats dense', () => {
  const verdict = gate(report({ hybridNdcg: 0.9, denseNdcg: 0.3 }), THRESHOLDS);
  assert.equal(verdict.passed, true, verdict.failures.join('; '));
});

test('gate FAILS on an nDCG regression past the tolerance', () => {
  const verdict = gate(report({ hybridNdcg: 0.9 - REGRESSION_TOLERANCE - 0.01, denseNdcg: 0.3 }), THRESHOLDS);
  assert.equal(verdict.passed, false);
  assert.match(verdict.failures[0], /nDCG@10 regression in group "identifier"/);
});

test('gate tolerates a drop within the tolerance, so a re-record is not a false failure', () => {
  const verdict = gate(report({ hybridNdcg: 0.9 - REGRESSION_TOLERANCE / 2, denseNdcg: 0.3 }), THRESHOLDS);
  assert.equal(verdict.passed, true, verdict.failures.join('; '));
});

test('gate FAILS when hybrid stops beating dense, even with no nDCG regression', () => {
  // The condition that catches a change which keeps the absolute number up while
  // losing the identifier advantage GT-592 is about.
  const verdict = gate(report({ hybridNdcg: 0.95, denseNdcg: 0.95 }), THRESHOLDS);
  assert.equal(verdict.passed, false);
  assert.match(verdict.failures[0], /no longer beats dense-only/);
});

test('gate FAILS when a recorded group vanishes from the report', () => {
  const r = report({ hybridNdcg: 0.9, denseNdcg: 0.3 });
  delete r.hybrid.byGroup.identifier;
  assert.equal(gate(r, THRESHOLDS).passed, false);
});

// ---------------------------------------------------------------------------
// The gate, against the real fixtures — including deliberate damage
// ---------------------------------------------------------------------------

const fixturesPresent = existsSync(CORPUS_PATH) && existsSync(DENSE_PATH);
const withFixtures = { skip: fixturesPresent ? false : 'retrieval fixtures not recorded' };

test('the query set is fixed, grouped, and file-labelled', withFixtures, () => {
  const { queries } = loadQueries();
  assert.ok(queries.length >= 30, 'a gate on a handful of queries is noise');
  for (const q of queries) {
    assert.ok(q.id && q.group && q.query, `query ${JSON.stringify(q)} is incomplete`);
    assert.ok(Array.isArray(q.goldSourceFiles) && q.goldSourceFiles.length > 0);
  }
  const groups = new Set(queries.map((q) => q.group));
  assert.ok(groups.has('identifier'), 'the identifier regime must be represented');
  assert.ok(groups.has('semantic'), 'a semantic control group must be represented');
});

test('the recorded dense baseline is tied to the frozen corpus', withFixtures, async () => {
  const baseline = loadDenseBaseline();
  assert.ok(baseline.corpusFingerprint, 'the baseline must fingerprint its corpus');
  assert.ok(baseline.model?.id, 'the baseline must name the model that produced it');
  assert.ok(baseline.thresholds?.byGroup, 'the baseline must carry the gate thresholds');
  // runEval throws on a fingerprint mismatch; reaching here proves agreement.
  const r = await runEval();
  assert.equal(r.corpus.fingerprint, baseline.corpusFingerprint);
});

test('corpusFingerprint changes when a chunk changes', withFixtures, () => {
  const a = [{ chunkId: 'x', text: 'one' }];
  const b = [{ chunkId: 'x', text: 'two' }];
  assert.notEqual(corpusFingerprint(a), corpusFingerprint(b));
});

test('the gate PASSES on the real, undamaged retrieval', withFixtures, async () => {
  const r = await runEval();
  const verdict = gate(r, loadDenseBaseline().thresholds);
  assert.equal(verdict.passed, true, verdict.failures.join('; '));
});

test('the gate goes RED when the ranking is shuffled', withFixtures, async () => {
  // Deterministic damage: reverse the top-k. Nothing is removed, so recall is
  // untouched and only the ORDER degrades — the subtlest real regression there is.
  const r = await runEval({ degrade: (chunks) => [...chunks].reverse() });
  const verdict = gate(r, loadDenseBaseline().thresholds);
  assert.equal(verdict.passed, false, 'a reversed ranking must not pass');
});

test('the gate goes RED when results are truncated to one', withFixtures, async () => {
  const r = await runEval({ degrade: (chunks) => chunks.slice(0, 1) });
  const verdict = gate(r, loadDenseBaseline().thresholds);
  assert.equal(verdict.passed, false, 'a truncated ranking must not pass');
});

test('the gate goes RED when the lexical winner is dropped', withFixtures, async () => {
  // The precise damage a BM25 regression causes: the identifier's own document
  // stops reaching the top. Absolute nDCG may still look respectable, so this is
  // the case the hybrid-must-beat-dense condition exists for.
  const r = await runEval({ degrade: (chunks) => chunks.slice(1) });
  const verdict = gate(r, loadDenseBaseline().thresholds);
  assert.equal(verdict.passed, false, 'losing the top hit must not pass');
});
