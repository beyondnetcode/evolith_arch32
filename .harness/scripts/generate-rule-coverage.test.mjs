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
  write(root, 'rulesets/governance/satellite-contracts.rules.json', JSON.stringify({ reference: { f1Rules: '../../reference/architecture/topologies/progressive-axis/demo/demo.rules.json' } }));
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
  assert.match(validateTopologyRuleCoverage(root).warnings.join('\n'), /Native rule IDs missing in OPA \(GT-149\): DEMO-R01/);
});

test('rejects stale satellite rule references', () => {
  const root = fixtureRoot();
  write(root, 'rulesets/governance/satellite-contracts.rules.json', JSON.stringify({ reference: { f1Rules: '../architecture/f1-modular-monolith.rules.json' } }));
  assert.match(validateTopologyRuleCoverage(root).errors.join('\n'), /reference\.f1Rules does not resolve/);
});
