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

// Spawned once. Each case used to re-run the audit for itself, which cost six
// process launches to read six fields off the same immutable report.
const REPORT = runReport();

/**
 * The WS1 paths these gaps closed, as the audit records them TODAY.
 *
 * Every literal here was stale: the rulesets moved into `cross-cutting/` and `sdlc/`
 * and became `.rules.json` files, and the audit script followed them while this file
 * did not. All six cases were red — not because anything regressed, but because they
 * were looking up paths that no longer name anything. Since a lookup miss and a real
 * failure both surfaced as `undefined`, the assertions below now separate them.
 */
const WS1_PATHS = [
  ['GT-286', 'compliance-baseline', 'src/rulesets/cross-cutting/compliance-baseline.rules.json'],
  ['GT-287', 'definition-of-done', 'src/rulesets/cross-cutting/definition-of-done.rules.json'],
  ['GT-288', 'engineering-manifesto', 'src/rulesets/cross-cutting/engineering-manifesto.rules.json'],
  ['GT-289', 'repository-taxonomy', 'src/rulesets/cross-cutting/repository-taxonomy.rules.json'],
  ['GT-290', 'phase-gates', 'src/rulesets/sdlc/phase-gates.rules.json'],
  ['GT-291', 'quality-thresholds', 'src/rulesets/sdlc/quality-thresholds.rules.json'],
];

for (const [gap, label, expectedPath] of WS1_PATHS) {
  test(`${gap} marks ${label} WS1 path as implemented`, () => {
    const ws1 = REPORT.workstreams.find((workstream) => workstream.id === 'WS1');
    assert.ok(ws1, 'the audit reported no WS1 workstream');

    const check = ws1.results.find((item) => item.path === expectedPath);
    assert.ok(
      check,
      `WS1 records no path ${expectedPath}. The ruleset moved and this expectation ` +
        `did not follow it — that is drift in the test, not a regression in the audit.\n` +
        `  WS1 currently records:\n${ws1.results.map((r) => `    - ${r.path}`).join('\n')}`,
    );

    assert.equal(check.exists, true);
    assert.equal(check.status, 'PASS');
  });
}
