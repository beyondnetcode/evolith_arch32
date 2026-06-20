import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ensureOpa } from '../opa-runtime.mjs';

const root = process.cwd();
const manifests = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (entry.name === 'topology.manifest.json') manifests.push(target);
  }
}
walk(path.join(root, 'reference', 'architecture', 'topologies'));
const opa = await ensureOpa(root);
const results = [];
for (const manifestPath of manifests.sort()) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.metadata?.status !== 'accepted') continue;
  const topology = manifest.metadata.id;
  for (const declared of manifest.spec.artifacts.opaPolicies || []) {
    const policy = path.join(root, declared);
    const test = policy.replace(/\.rego$/, '.test.rego');
    if (!fs.existsSync(test)) throw new Error(`${topology}: missing OPA test file ${path.relative(root, test)}`);
    const started = performance.now();
    const stdout = execFileSync(opa.binary, ['test', '--format=json', policy, test], { cwd: root, encoding: 'utf8' });
    const cases = JSON.parse(stdout);
    if (!Array.isArray(cases) || cases.length === 0) throw new Error(`${topology}: OPA test suite is empty`);
    results.push({ topology, policy: declared, test: path.relative(root, test), cases: cases.length, durationMs: Math.round(performance.now() - started) });
  }
}
console.log(JSON.stringify({ evaluator: `opa-${opa.version}`, results }, null, 2));
