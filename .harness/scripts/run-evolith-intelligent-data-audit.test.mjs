import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

function runReport() {
  const result = spawnSync(
    process.execPath,
    ['.harness/scripts/run-evolith-intelligent-data-audit.mjs', '--report'],
    {
      cwd: ROOT,
      encoding: 'utf8',
    },
  );

  assert.match(result.stdout, /^\{/);
  return JSON.parse(result.stdout);
}

test('GT-286 marks compliance-baseline WS1 path as implemented', () => {
  const report = runReport();
  const ws1 = report.workstreams.find((workstream) => workstream.id === 'WS1');
  const check = ws1?.results.find((item) => item.path === 'rulesets/compliance-baseline');

  assert.equal(check?.exists, true);
  assert.equal(check?.status, 'PASS');
});

test('GT-287 marks definition-of-done WS1 path as implemented', () => {
  const report = runReport();
  const ws1 = report.workstreams.find((workstream) => workstream.id === 'WS1');
  const check = ws1?.results.find((item) => item.path === 'rulesets/definition-of-done');

  assert.equal(check?.exists, true);
  assert.equal(check?.status, 'PASS');
});

test('GT-288 marks engineering-manifesto WS1 path as implemented', () => {
  const report = runReport();
  const ws1 = report.workstreams.find((workstream) => workstream.id === 'WS1');
  const check = ws1?.results.find((item) => item.path === 'rulesets/engineering-manifesto');

  assert.equal(check?.exists, true);
  assert.equal(check?.status, 'PASS');
});
