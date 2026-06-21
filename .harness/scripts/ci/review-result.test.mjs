import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseProviderResponse,
  validateReviewResult,
  evaluateProviderResponse,
  REVIEW_SCHEMA_VERSION,
} from './review-result.mjs';

const PASS = { schemaVersion: REVIEW_SCHEMA_VERSION, verdict: 'pass', findings: [] };
const FAIL = {
  schemaVersion: REVIEW_SCHEMA_VERSION,
  verdict: 'fail',
  findings: [{ severity: 'error', title: 'Illegal import', file: 'src/a.ts', line: 12, confidence: 0.9 }],
};

test('parseProviderResponse unwraps ```json fences', () => {
  const r = parseProviderResponse('```json\n{"verdict":"pass"}\n```');
  assert.equal(r.ok, true);
  assert.equal(r.value.verdict, 'pass');
});

test('parseProviderResponse tolerates surrounding prose', () => {
  const r = parseProviderResponse('Here is my review:\n{"verdict":"fail"}\nThanks!');
  assert.equal(r.ok, true);
  assert.equal(r.value.verdict, 'fail');
});

test('parseProviderResponse fails on empty/unparseable input', () => {
  assert.equal(parseProviderResponse('').ok, false);
  assert.equal(parseProviderResponse('not json at all').ok, false);
});

test('validateReviewResult accepts a well-formed pass', () => {
  const v = validateReviewResult(PASS);
  assert.equal(v.ok, true);
  assert.equal(v.verdict, 'pass');
});

test('validateReviewResult accepts a well-formed fail with findings', () => {
  const v = validateReviewResult(FAIL);
  assert.equal(v.ok, true);
  assert.equal(v.verdict, 'fail');
  assert.equal(v.findings.length, 1);
});

test('validateReviewResult rejects unsupported schemaVersion', () => {
  const v = validateReviewResult({ ...PASS, schemaVersion: '9.9' });
  assert.equal(v.ok, false);
  assert.equal(v.verdict, 'error');
});

test('validateReviewResult rejects invalid verdict and malformed findings', () => {
  assert.equal(validateReviewResult({ ...PASS, verdict: 'maybe' }).ok, false);
  assert.equal(validateReviewResult({ ...PASS, findings: 'nope' }).ok, false);
  const badFinding = { schemaVersion: REVIEW_SCHEMA_VERSION, verdict: 'fail', findings: [{ severity: 'critical', title: '', confidence: 2 }] };
  const v = validateReviewResult(badFinding);
  assert.equal(v.ok, false);
  assert.ok(v.errors.length >= 3, `expected multiple errors, got ${v.errors.length}`);
});

test('validateReviewResult rejects non-object', () => {
  assert.equal(validateReviewResult(null).ok, false);
  assert.equal(validateReviewResult([1, 2]).ok, false);
});

test('evaluateProviderResponse passes the gate only on a well-formed pass', () => {
  assert.equal(evaluateProviderResponse(JSON.stringify(PASS)).passesGate, true);
});

test('evaluateProviderResponse fails the gate on violations', () => {
  const e = evaluateProviderResponse(JSON.stringify(FAIL));
  assert.equal(e.passesGate, false);
  assert.equal(e.verdict, 'fail');
});

test('evaluateProviderResponse fails closed on malformed/indeterminate output', () => {
  assert.equal(evaluateProviderResponse('VIOLATION? maybe').passesGate, false);
  assert.equal(evaluateProviderResponse('').passesGate, false);
  assert.equal(evaluateProviderResponse('{"verdict":"pass"}').passesGate, false); // missing schemaVersion
});
