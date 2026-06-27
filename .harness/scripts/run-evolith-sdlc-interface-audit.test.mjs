import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');
const SCRIPT = '.harness/scripts/run-evolith-sdlc-interface-audit.mjs';

function run(args = []) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8' });
}

function runReport() {
  const result = run(['--report']);
  assert.match(result.stdout, /^\{/);
  return JSON.parse(result.stdout);
}

test('report has the expected shape and 11 dimensions', () => {
  const report = runReport();
  assert.ok(Array.isArray(report.dimensions));
  assert.equal(report.dimensions.length, 11);
  assert.ok(report.summary);
  assert.equal(typeof report.summary.overallPercentage, 'number');
  assert.ok(Array.isArray(report.gaps));
});

test('interfaces dimension (D2) is fully covered (CLI/MCP/REST + parity)', () => {
  const report = runReport();
  const d2 = report.dimensions.find((d) => d.id === 'D2');
  assert.equal(d2?.percentage, 100);
});

test('domain events (D5) is reported as a gap (no event bus today)', () => {
  const report = runReport();
  const d5 = report.dimensions.find((d) => d.id === 'D5');
  const bus = d5?.results.find((r) => r.name.startsWith('Event bus'));
  assert.equal(bus?.satisfied, false, 'event bus must be detected as missing');
});

test('gate approver enforcement (D6) is a gap, not a false pass from test data', () => {
  const report = runReport();
  const d6 = report.dimensions.find((d) => d.id === 'D6');
  const enforce = d6?.results.find((r) => r.name.startsWith('Gate approver role is enforced'));
  assert.equal(enforce?.satisfied, false);
});

test('composability dimension (D7) is owned by Tracker (tenant-agnostic premise)', () => {
  const report = runReport();
  const d7 = report.dimensions.find((d) => d.id === 'D7');
  assert.equal(d7?.owner, 'Tracker');
  // Core must NOT be penalized for lacking per-tenant config; the seam must exist.
  const seam = d7?.results.find((r) => r.name.startsWith('Workflow-definition seam'));
  assert.equal(seam?.satisfied, true);
});

test('exit code is non-zero while P0 gaps exist', () => {
  const result = run([]);
  assert.equal(result.status, 1);
});

test('--dim filters to a single dimension', () => {
  const result = run(['--dim', 'D2', '--report']);
  const report = JSON.parse(result.stdout);
  assert.equal(report.dimensions.length, 1);
  assert.equal(report.dimensions[0].id, 'D2');
});

test('--gap-format emits a markdown table of gaps', () => {
  const result = run(['--gap-format']);
  assert.match(result.stdout, /\| Severity \| Dimension \| Owner \| Gap \|/);
});
