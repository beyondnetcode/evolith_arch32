import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { evaluateWasm, normalizeOpaDecisions } from './opa-eval.mjs';
import { diffDecisions, diffCoverage, parityReport, scopeTopologies, contentVersion, PARITY_SCHEMA_VERSION } from './parity-gate.mjs';

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

// --- CI scoping + versions (criteria 3 & 4) ---------------------------------

// GT-329: agentic-ai moved to canonical rulesets/topologies/; progressive-axis stays in reference/
const TOPOS = [
  { dir: 'src/rulesets/topologies/agentic-ai', id: 'agentic-ai' },
  { dir: 'reference/core/architecture/topologies/progressive-axis/microservices', id: 'microservices' },
];

test('scopeTopologies returns all on a full/scheduled run or no change signal', () => {
  assert.equal(scopeTopologies(TOPOS, ['x'], true).length, 2);
  assert.equal(scopeTopologies(TOPOS, null, false).length, 2);
});

test('scopeTopologies limits to topologies with a changed file', () => {
  const changed = ['src/rulesets/topologies/agentic-ai/agentic-ai.rego'];
  const scoped = scopeTopologies(TOPOS, changed, false);
  assert.equal(scoped.length, 1);
  assert.equal(scoped[0].id, 'agentic-ai');
});

test('contentVersion is a stable short hash', () => {
  assert.equal(contentVersion('abc'), contentVersion('abc'));
  assert.equal(contentVersion('abc').length, 12);
  assert.notEqual(contentVersion('abc'), contentVersion('abd'));
});

// --- GT-675: the axis that catches a pass nobody could have made ------------

test('diffCoverage flags a rule reported passed by an engine that cannot decide it', () => {
  const drift = diffCoverage({
    engine: 'opa',
    declared: ['ACL-01', 'ACL-02'],
    outcomes: [
      { ruleId: 'ACL-01', outcome: 'passed' },
      { ruleId: 'SEC-INJ-01', outcome: 'passed' },
    ],
  });
  assert.equal(drift.length, 1);
  assert.equal(drift[0].kind, 'unsupported-pass');
  assert.equal(drift[0].ruleId, 'SEC-INJ-01');
});

test('diffCoverage does NOT flag complementary coverage — passed here, skipped there is legitimate', () => {
  // Measured on this corpus: 65 rules are decided by OPA and skipped by native,
  // 17 the other way. ADR-0041 never promised parity of coverage, and a gate that
  // demanded it would be permanently red for an honest reason.
  const drift = diffCoverage({
    engine: 'opa',
    declared: ['ACL-01'],
    outcomes: [{ ruleId: 'ACL-01', outcome: 'passed' }, { ruleId: 'GIT-01', outcome: 'skipped' }],
  });
  assert.deepEqual(drift, []);
});

test('an engine that declares nothing is reported, not silently accepted', () => {
  const drift = diffCoverage({ engine: 'opa', declared: [], outcomes: [{ ruleId: 'X', outcome: 'passed' }] });
  assert.equal(drift.length, 1);
  assert.equal(drift[0].kind, 'undeclared-scope');
});

test('parityReport carries the coverage axis and stays parity-clean without it', () => {
  const base = { topology: 't', fixture: 'f', nativeDecisions: [], opaDecisions: [] };
  assert.equal(parityReport(base).parity, true);

  const withDrift = parityReport({
    ...base,
    coverage: { opa: { declared: ['A'], outcomes: [{ ruleId: 'B', outcome: 'passed' }] } },
  });
  assert.equal(withDrift.parity, false);
  assert.equal(withDrift.drift[0].kind, 'unsupported-pass');
  assert.equal(withDrift.schemaVersion, PARITY_SCHEMA_VERSION);
});
