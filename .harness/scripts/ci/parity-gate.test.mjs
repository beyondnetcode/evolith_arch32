import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { evaluateWasm, normalizeOpaDecisions } from './opa-eval.mjs';
import { diffDecisions, parityReport, PARITY_SCHEMA_VERSION } from './parity-gate.mjs';

// --- Executable OPA evaluator (pinned WASM, no host binary) -----------------

test('evaluateWasm executes a compiled policy bundle via opa-wasm (no host binary)', async () => {
  const wasmPath = 'sdk/cli/rulesets/opa/policy.wasm';
  if (!existsSync(wasmPath)) {
    // Bundle is produced by the pinned compile-opa-wasm step (CI). Skip locally.
    return;
  }
  const { result, durationMs } = await evaluateWasm(readFileSync(wasmPath), {});
  const decisions = normalizeOpaDecisions(result);
  assert.ok(Array.isArray(decisions), 'decisions should be an array');
  assert.ok(durationMs >= 0, 'duration telemetry present');
  if (decisions.length) {
    assert.ok('ruleId' in decisions[0] && 'severity' in decisions[0]);
  }
});

test('normalizeOpaDecisions maps common shapes to the decision contract', () => {
  const d = normalizeOpaDecisions([{ id: 'EVD-01', message: 'x', file: 'a.json' }]);
  assert.deepEqual(d, [{ ruleId: 'EVD-01', severity: 'error', message: 'x', file: 'a.json' }]);
  assert.deepEqual(normalizeOpaDecisions({ violations: [] }), []);
  assert.deepEqual(normalizeOpaDecisions(null), []);
});

// --- Native/OPA differential parity -----------------------------------------

const NATIVE = [{ ruleId: 'F1-01', severity: 'error', message: 'm', file: 'src/a.ts' }];

test('identical decisions yield full parity', () => {
  assert.deepEqual(diffDecisions(NATIVE, [{ ...NATIVE[0] }]), []);
  const report = parityReport({ topology: 't', fixture: 'pos', nativeDecisions: NATIVE, opaDecisions: [{ ...NATIVE[0] }] });
  assert.equal(report.parity, true);
  assert.equal(report.schemaVersion, PARITY_SCHEMA_VERSION);
});

test('rule-id drift is detected in both directions', () => {
  assert.ok(diffDecisions(NATIVE, []).some((d) => d.kind === 'rule-id'));
  assert.ok(diffDecisions([], NATIVE).some((d) => d.kind === 'rule-id'));
});

test('severity and evidence-location drift are detected', () => {
  const opaSev = [{ ...NATIVE[0], severity: 'warning' }];
  assert.ok(diffDecisions(NATIVE, opaSev).some((d) => d.kind === 'severity'));
  const opaFile = [{ ...NATIVE[0], file: 'src/b.ts' }];
  assert.ok(diffDecisions(NATIVE, opaFile).some((d) => d.kind === 'evidence'));
});

test('verdict drift fails the gate', () => {
  const report = parityReport({ topology: 't', fixture: 'neg', nativeDecisions: NATIVE, opaDecisions: [] });
  assert.equal(report.parity, false);
  assert.ok(report.drift.some((d) => d.kind === 'verdict'));
});

test('a malformed policy bundle fails closed (evaluator-failure fixture)', async () => {
  await assert.rejects(() => evaluateWasm(Buffer.from([0, 1, 2, 3, 4])), Error);
});
