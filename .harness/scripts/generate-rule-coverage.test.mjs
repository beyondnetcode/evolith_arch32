import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateTopologyRuleCoverage } from './generate-rule-coverage.mjs';

function write(root, relative, content) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'evolith-rule-coverage-'));
  write(root, 'reference/architecture/topologies/progressive-axis/demo/topology.manifest.json', JSON.stringify({ metadata: { id: 'demo', status: 'accepted' }, spec: { artifacts: { rulesets: ['reference/architecture/topologies/progressive-axis/demo/demo.rules.json'], opaPolicies: ['reference/architecture/topologies/progressive-axis/demo/demo.rego'] } } }));
  write(root, 'reference/architecture/topologies/progressive-axis/demo/demo.rules.json', JSON.stringify({ rules: [{ id: 'DEMO-R01' }] }));
  write(root, 'reference/architecture/topologies/progressive-axis/demo/demo.rego', 'package demo\nviolations[{"id": "DEMO-R01"}] { true }\n');
  write(root, 'src/rulesets/governance/satellite-contracts.rules.json', JSON.stringify({ reference: { f1Rules: '../../reference/architecture/topologies/progressive-axis/demo/demo.rules.json' } }));
  return root;
}

test('reports manifest-declared Native/OPA coverage', () => {
  const result = validateTopologyRuleCoverage(fixtureRoot());
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.rows, [{ topology: 'demo', status: 'accepted', native: 1, opa: 1, aligned: true }]);
});

test('rejects missing OPA rule IDs', () => {
  const root = fixtureRoot();
  write(root, 'reference/architecture/topologies/progressive-axis/demo/demo.rego', 'package demo\n');
  const result = validateTopologyRuleCoverage(root);
  assert.match(result.errors.join('\n'), /Native rule IDs missing in OPA \(GT-149\): DEMO-R01/);
  assert.deepEqual(result.warnings, []);
});

test('rejects OPA-only rule IDs for an accepted topology', () => {
  const root = fixtureRoot();
  write(root, 'reference/architecture/topologies/progressive-axis/demo/demo.rego', 'package demo\nviolations[{"id": "DEMO-R02"}] { true }\n');
  const result = validateTopologyRuleCoverage(root);
  assert.match(result.errors.join('\n'), /OPA rule IDs missing in Native ruleset \(GT-149\): DEMO-R02/);
  assert.deepEqual(result.warnings, []);
});

test('rejects stale satellite rule references', () => {
  const root = fixtureRoot();
  write(root, 'src/rulesets/governance/satellite-contracts.rules.json', JSON.stringify({ reference: { f1Rules: '../architecture/f1-modular-monolith.rules.json' } }));
  assert.match(validateTopologyRuleCoverage(root).errors.join('\n'), /reference\.f1Rules does not resolve/);
});

test('rejects duplicate and unreferenced artifacts for an accepted topology', () => {
  const root = fixtureRoot();
  write(root, 'reference/architecture/topologies/progressive-axis/demo/demo.rules.json', JSON.stringify({ rules: [{ id: 'DEMO-R01' }, { id: 'DEMO-R01' }] }));
  write(root, 'reference/architecture/topologies/progressive-axis/demo/orphan.rego', 'package demo\n');
  const errors = validateTopologyRuleCoverage(root).errors.join('\n');
  assert.match(errors, /Native ruleset has duplicate rule IDs/);
  assert.match(errors, /Unreferenced topology rule artifact/);
});

test('covers the canonical F1/F2/F3 topology manifests', () => {
  const result = validateTopologyRuleCoverage(process.cwd());
  assert.deepEqual(result.errors, []);
  assert.deepEqual(
    result.rows.filter((row) => ['modular-monolith', 'distributed-modules', 'microservices'].includes(row.topology)).map((row) => row.topology).sort(),
    ['distributed-modules', 'microservices', 'modular-monolith'],
  );
});
