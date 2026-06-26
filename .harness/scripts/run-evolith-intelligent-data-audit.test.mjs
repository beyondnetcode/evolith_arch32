import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

test('GT-286 marks compliance-baseline WS1 path as implemented', () => {
  const result = spawnSync(
    process.execPath,
    ['.harness/scripts/run-evolith-intelligent-data-audit.mjs', '--report'],
    {
      cwd: ROOT,
      encoding: 'utf8',
    },
  );

  assert.match(result.stdout, /^\{/);
  const report = JSON.parse(result.stdout);
  const ws1 = report.workstreams.find((workstream) => workstream.id === 'WS1');
  const check = ws1?.results.find((item) => item.path === 'rulesets/compliance-baseline');

  assert.equal(check?.exists, true);
  assert.equal(check?.status, 'PASS');
});
