#!/usr/bin/env node

/**
 * GT-578 — tests for the anti-vacuous-pass keeper.
 *
 * Every test here is a negative fixture: a guard that enforces "a check must be
 * able to fail" has to be shown failing, or it is exactly the thing it forbids.
 * The fixtures are synthetic `.harness/scripts/ci` trees passed via `--root`.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUARD = resolve(__dirname, '42-validate-guard-denominators.mjs');
const REAL_ROOT = resolve(__dirname, '../../..');

let sandbox;

/** Build a fake repo root holding `.harness/scripts/ci/<files>`. */
function fixture(name, files) {
  const root = join(sandbox, name);
  const ciDir = join(root, '.harness', 'scripts', 'ci');
  mkdirSync(ciDir, { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(ciDir, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return root;
}

function run(root, extra = []) {
  const res = spawnSync(process.execPath, [GUARD, '--root', root, '--partial-tree', ...extra], {
    encoding: 'utf8',
    timeout: 60000,
  });
  return { status: res.status, out: `${res.stdout}\n${res.stderr}` };
}

const INSTRUMENTED = `
import { assertScanned } from '../lib/coverage.mjs';
const files = [];
assertScanned(files.length, { what: 'things', where: 'somewhere' });
`;

before(() => { sandbox = mkdtempSync(join(tmpdir(), 'gt578-denominators-')); });
after(() => { if (sandbox) rmSync(sandbox, { recursive: true, force: true }); });

describe('42-validate-guard-denominators', () => {
  test('an unclassified guard turns it RED — this is the whole point', () => {
    const root = fixture('unclassified', {
      '90-instrumented.mjs': INSTRUMENTED,
      // Globs a directory, iterates nothing, prints a pass. Nobody registered it.
      '91-silent.mjs': "import fs from 'node:fs';\nconsole.log('all good');\n",
    });
    const { status, out } = run(root);
    assert.equal(status, 1);
    assert.match(out, /91-silent\.mjs: no denominator and no classification/);
  });

  test('an instrumented guard passes', () => {
    const root = fixture('instrumented-only', { '90-instrumented.mjs': INSTRUMENTED });
    const { status, out } = run(root);
    assert.equal(status, 0, out);
    assert.match(out, /instrumented \.+ 1/);
  });

  test('a SELF_GUARDED entry whose proof vanished turns it RED', () => {
    // 34-boundary-guard-repository.mjs is registered with a proof regex. A copy
    // that no longer contains the refusal must not inherit the exemption.
    const root = fixture('proof-gone', {
      '34-boundary-guard-repository.mjs': "console.log('boundary guard passed');\n",
    });
    const { status, out } = run(root);
    assert.equal(status, 1);
    assert.match(out, /registered SELF_GUARDED, but its proof no longer appears/);
  });

  test('a registry entry for a file that no longer exists turns it RED', () => {
    // Without --partial-tree the staleness rule is armed, and a fixture holding
    // one guard makes every registered entry stale — which is the rule firing.
    const root = fixture('stale-registry', { '90-instrumented.mjs': INSTRUMENTED });
    const res = spawnSync(process.execPath, [GUARD, '--root', root], { encoding: 'utf8', timeout: 60000 });
    assert.equal(res.status, 1);
    assert.match(
      `${res.stdout}\n${res.stderr}`,
      /listed in (?:SELF_GUARDED|NOT_A_SCANNER) but no such script exists/,
    );
  });

  test('an exemption for a guard that is now instrumented turns it RED', () => {
    const root = fixture('obsolete-exemption', {
      // Registered NOT_A_SCANNER, but this copy calls assertScanned itself.
      'opa-eval.mjs': INSTRUMENTED,
    });
    const { out } = run(root);
    assert.match(out, /listed in NOT_A_SCANNER, but the file now calls assertScanned/);
  });

  test('vacuous: a CI directory with zero guards is RED, not "all compliant"', () => {
    const root = fixture('empty', {});
    const { status, out } = run(root);
    assert.equal(status, 1);
    assert.match(out, /ZERO CI guard scripts scanned/);
  });

  test('vacuous: a missing CI directory is RED', () => {
    const root = join(sandbox, 'no-ci-dir');
    mkdirSync(root, { recursive: true });
    const { status, out } = run(root);
    assert.equal(status, 1);
    assert.match(out, /scan root does not exist/);
  });

  test('the real repository is fully classified', () => {
    const res = spawnSync(process.execPath, [GUARD, '--root', REAL_ROOT], { encoding: 'utf8', timeout: 60000 });
    const { status, out } = { status: res.status, out: `${res.stdout}\n${res.stderr}` };
    assert.equal(status, 0, out);
    assert.match(out, /is classified; none is silently unprotected/);
  });
});
