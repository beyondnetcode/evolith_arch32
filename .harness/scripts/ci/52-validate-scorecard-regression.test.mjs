#!/usr/bin/env node
/**
 * Self-test for the Scorecard regression gate (GT-597).
 *
 * The gate's whole value is that it goes RED, so most of what is asserted here
 * is the failure surface: an unseeded baseline, a dropped check, a check that
 * vanished, a check that returned -1, a payload that is not Scorecard JSON. A
 * gate tested only on its happy path is a gate nobody has seen fail.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseResults,
  isUnseeded,
  compare,
  seedProposal,
} from './52-validate-scorecard-regression.mjs';

const RESULTS = {
  date: '2026-07-30',
  repo: { name: 'github.com/beyondnetcode/evolith_arch32', commit: 'abc123' },
  scorecard: { version: 'v5.0.0', commit: 'def456' },
  score: 6.4,
  checks: [
    { name: 'Branch-Protection', score: 8, reason: 'branch protection is not maximal', details: [] },
    { name: 'Code-Review', score: 10, reason: 'all changesets reviewed', details: [] },
    { name: 'Pinned-Dependencies', score: 3, reason: 'dependency not pinned by hash', details: [] },
  ],
};

const BASELINE = {
  aggregate: 6.4,
  checks: { 'Branch-Protection': 8, 'Code-Review': 10, 'Pinned-Dependencies': 3 },
};

test('parseResults reads the documented Scorecard JSON v2 shape', () => {
  const parsed = parseResults(RESULTS);
  assert.equal(parsed.aggregate, 6.4);
  assert.equal(parsed.checks.size, 3);
  assert.equal(parsed.checks.get('Code-Review').score, 10);
  assert.equal(parsed.meta.commit, 'abc123');
});

test('parseResults refuses a payload it does not recognise instead of parsing partially', () => {
  assert.throws(() => parseResults({ results: [] }), /does not look like Scorecard JSON/);
  assert.throws(() => parseResults([]), /not a JSON object/);
  assert.throws(() => parseResults(null), /not a JSON object/);
  // SARIF is the other format the workflow produces; pointing the gate at it by
  // mistake must be loud, not a silent pass over zero checks.
  assert.throws(() => parseResults({ version: '2.1.0', runs: [] }), /does not look like Scorecard JSON/);
});

test('an unseeded baseline is detected in every empty shape it can take', () => {
  assert.equal(isUnseeded({ aggregate: null, checks: {} }), true);
  assert.equal(isUnseeded({ aggregate: 6.4, checks: {} }), true);
  assert.equal(isUnseeded({ checks: { A: 1 } }), true);
  assert.equal(isUnseeded(null), true);
  assert.equal(isUnseeded(BASELINE), false);
});

test('an unchanged run passes', () => {
  const v = compare(parseResults(RESULTS), BASELINE);
  assert.equal(v.ok, true);
  assert.deepEqual(v.findings, []);
  assert.equal(v.rows.every((r) => r.status === 'HELD'), true);
});

test('a check below its floor is a regression, and names the reason', () => {
  const dropped = structuredClone(RESULTS);
  dropped.checks[0].score = 5;
  dropped.score = 5.4;
  const v = compare(parseResults(dropped), BASELINE);
  assert.equal(v.ok, false);
  assert.equal(v.rows.find((r) => r.name === 'Branch-Protection').status, 'REGRESSED');
  assert.match(v.findings.join('\n'), /Branch-Protection: 8 -> 5/);
  assert.match(v.findings.join('\n'), /aggregate score: 6\.4 -> 5\.4/);
});

test('a baselined check that stops appearing fails rather than being ignored', () => {
  const partial = structuredClone(RESULTS);
  partial.checks = partial.checks.slice(0, 2);
  const v = compare(parseResults(partial), BASELINE);
  assert.equal(v.ok, false);
  assert.equal(v.rows.find((r) => r.name === 'Pinned-Dependencies').status, 'MISSING');
});

test('an inconclusive (-1) check is failed, but reported as its own kind of fact', () => {
  const inconclusive = structuredClone(RESULTS);
  inconclusive.checks[1].score = -1;
  const v = compare(parseResults(inconclusive), BASELINE);
  assert.equal(v.ok, false);
  assert.equal(v.rows.find((r) => r.name === 'Code-Review').status, 'INCONCLUSIVE');
  assert.match(v.findings.join('\n'), /could not reach a verdict/);
});

test('a check with no floor fails, because an incomplete baseline cannot ratchet', () => {
  const extra = structuredClone(RESULTS);
  extra.checks.push({ name: 'Token-Permissions', score: 9, reason: 'ok', details: [] });
  const v = compare(parseResults(extra), BASELINE);
  assert.equal(v.ok, false);
  assert.equal(v.rows.find((r) => r.name === 'Token-Permissions').status, 'UNTRACKED');
});

test('an improvement never fails, and is surfaced as a ratchet suggestion', () => {
  const better = structuredClone(RESULTS);
  better.checks[2].score = 7;
  better.score = 7.7;
  const v = compare(parseResults(better), BASELINE);
  assert.equal(v.ok, true);
  assert.equal(v.rows.find((r) => r.name === 'Pinned-Dependencies').status, 'IMPROVED');
});

test('the seed proposal is a committable baseline for exactly this run', () => {
  const p = seedProposal(parseResults(RESULTS));
  assert.equal(p.aggregate, 6.4);
  assert.equal(p.observedCommit, 'abc123');
  assert.equal(p.scorecardVersion, 'v5.0.0');
  assert.deepEqual(Object.keys(p.checks), ['Branch-Protection', 'Code-Review', 'Pinned-Dependencies']);
  // Round-trips: seeding from a run then comparing that run must pass.
  assert.equal(compare(parseResults(RESULTS), p).ok, true);
});
