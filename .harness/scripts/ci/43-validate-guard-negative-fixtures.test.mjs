#!/usr/bin/env node

/**
 * GT-578 — tests for the guard that makes every other guard fail on purpose.
 *
 * A meta-guard that asserts "every scanner can be seen failing" has to be seen
 * failing itself, or it is precisely the artifact it forbids. Every test below
 * is therefore a negative fixture: a synthetic `--root` holding a guard with a
 * known defect, and an assertion that 43 goes RED for the stated reason.
 *
 * The synthetic roots carry a real copy of `.harness/scripts/lib`, because the
 * classification in `lib/guard-classification.mjs` recognises an INSTRUMENTED
 * guard by its import of `../lib/coverage.mjs` — a fixture that fakes the import
 * without the module would fail on resolution instead of on the rule under test,
 * and a test that passes for the wrong reason is worse than no test.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUARD = resolve(__dirname, '43-validate-guard-negative-fixtures.mjs');
const REAL_ROOT = resolve(__dirname, '../../..');
const REAL_LIB = resolve(__dirname, '../lib');

let sandbox;

/** Build a fake repo root holding `.harness/scripts/{lib,ci}`. */
function fixture(name, files) {
  const root = join(sandbox, name);
  const scripts = join(root, '.harness', 'scripts');
  const ciDir = join(scripts, 'ci');
  mkdirSync(ciDir, { recursive: true });
  cpSync(REAL_LIB, join(scripts, 'lib'), { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(ciDir, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  // ROOT_MARKERS, so the fixture is a plausible repo for the guard under test.
  writeFileSync(join(root, 'package.json'), '{"name":"fx","private":true,"workspaces":[]}\n');
  writeFileSync(join(root, 'evolith.yaml'), 'version: 1\n');
  return root;
}

function run(root, extra = []) {
  const res = spawnSync(process.execPath, [GUARD, '--root', root, '--partial-tree', ...extra], {
    encoding: 'utf8',
    timeout: 120000,
  });
  return { status: res.status, out: `${res.stdout}\n${res.stderr}` };
}

/**
 * The defect this whole guard exists for: the `assertScanned` call is real, and
 * it sits behind a branch that an empty tree never enters. `42` reads this file
 * and reports it INSTRUMENTED — correctly. It still exits 0 over nothing.
 */
const VACUOUS = `
import { existsSync, readdirSync } from 'node:fs';
import { assertScanned } from '../lib/coverage.mjs';
const dir = 'reference/core/architecture/adrs';
if (existsSync(dir)) {
  const files = readdirSync(dir);
  assertScanned(files.length, { what: 'ADRs', where: dir });
}
console.log('✅ all good');
process.exit(0);
`;

/** The same scan, with the denominator asserted unconditionally. */
const HONEST = `
import { existsSync, readdirSync } from 'node:fs';
import { assertScanned, ZeroCoverageError } from '../lib/coverage.mjs';
const dir = 'reference/core/architecture/adrs';
try {
  const files = existsSync(dir) ? readdirSync(dir) : [];
  assertScanned(files.length, { what: 'ADRs', where: dir });
} catch (e) {
  if (e instanceof ZeroCoverageError) { console.error(e.message); process.exit(1); }
  throw e;
}
console.log('✅ all good');
process.exit(0);
`;

const HANGS = `
import { assertScanned } from '../lib/coverage.mjs';
assertScanned(1, { what: 'things', where: 'nowhere' });
setInterval(() => {}, 1000);
`;

before(() => { sandbox = mkdtempSync(join(tmpdir(), 'gt578-negfix-tests-')); });
after(() => { if (sandbox) rmSync(sandbox, { recursive: true, force: true }); });

describe('43-validate-guard-negative-fixtures', () => {
  test('a guard that exits 0 over an empty tree turns it RED — this is the whole point', () => {
    const root = fixture('vacuous', { '90-vacuous.mjs': VACUOUS });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /90-vacuous\.mjs: exited 0 against a repository containing NO corpus/);
    assert.match(out, /reported a PASS \.+ 1/);
  });

  test('a guard that asserts its denominator unconditionally passes', () => {
    const root = fixture('honest', { '90-honest.mjs': HONEST });
    const { status, out } = run(root);
    assert.equal(status, 0, out);
    assert.match(out, /turned RED \.+ 1\/1/);
    assert.match(out, /OBSERVED failing, not merely declared able to/);
  });

  test('one vacuous guard among honest ones is still RED — a green majority is not a verdict', () => {
    const root = fixture('mixed', {
      '90-honest.mjs': HONEST,
      '91-honest.mjs': HONEST,
      '92-vacuous.mjs': VACUOUS,
    });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /92-vacuous\.mjs: exited 0/);
    assert.match(out, /turned RED \.+ 2\/3/);
  });

  test('a guard that hangs instead of failing turns it RED', () => {
    const root = fixture('hangs', { '90-hangs.mjs': HANGS });
    const { status, out } = run(root, ['--timeout', '3000']);
    assert.equal(status, 1, out);
    assert.match(out, /90-hangs\.mjs: did not terminate within 3000ms/);
  });

  test('vacuous: a CI directory with no scanning guard is RED, not "all fixtures green"', () => {
    // A lone NOT_A_SCANNER-shaped file: nothing to exercise. Reporting success
    // here would be the guard committing the offence it polices.
    const root = fixture('no-scanners', { 'opa-eval.mjs': "export const noop = () => {};\n" });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /ZERO scanning CI guards to exercise/);
  });

  test('vacuous: a missing CI directory is RED', () => {
    const root = join(sandbox, 'no-ci-dir');
    mkdirSync(root, { recursive: true });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /scan root does not exist/);
  });

  test('a NO_FIXTURE entry naming a guard that is not a scanner turns it RED', () => {
    // Without --partial-tree the staleness rule is armed, and a fixture holding
    // one guard makes every exemption stale — which is the rule firing.
    const root = fixture('stale-exemptions', { '90-honest.mjs': HONEST });
    const res = spawnSync(process.execPath, [GUARD, '--root', root], { encoding: 'utf8', timeout: 120000 });
    assert.equal(res.status, 1);
    assert.match(`${res.stdout}\n${res.stderr}`, /listed in NO_FIXTURE but it is not a scanning guard/);
  });

  test('--only names a guard that does not exist: RED rather than a zero-guard green', () => {
    const root = fixture('only-miss', { '90-honest.mjs': HONEST });
    const { status, out } = run(root, ['--only', 'does-not-exist']);
    assert.equal(status, 1, out);
    assert.match(out, /--only does-not-exist matched no scanning guard/);
  });

  test('the fixture never resolves inside the repository under test', () => {
    // A sandbox inside the repo would let a guard that writes edit the working
    // tree. The assertion is on the reported fixture path.
    const root = fixture('outside', { '90-honest.mjs': HONEST });
    const { out } = run(root);
    const m = /fixture \.+ (\S+)/.exec(out);
    assert.ok(m, `no fixture path in output:\n${out}`);
    assert.ok(!m[1].startsWith(`${root}/`), `fixture ${m[1]} is inside the tree under test`);
    assert.ok(!m[1].startsWith(`${REAL_ROOT}/`), `fixture ${m[1]} is inside the real repository`);
  });

  test('the real repository: every scanning guard refuses the empty fixture', () => {
    const res = spawnSync(process.execPath, [GUARD, '--root', REAL_ROOT], {
      encoding: 'utf8',
      timeout: 300000,
    });
    const out = `${res.stdout}\n${res.stderr}`;
    assert.equal(res.status, 0, out);
    assert.match(out, /reported a PASS \.+ 0/);
    assert.match(out, /did not terminate \.+ 0/);
  });
});
