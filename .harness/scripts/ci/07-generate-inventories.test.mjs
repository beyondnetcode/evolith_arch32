/**
 * @file 07-generate-inventories.test.mjs
 * @description Pins the four defects fixed in 07-generate-inventories.mjs.
 *
 * The load-bearing one is `--check`: it used to be parsed nowhere, so passing it still wrote
 * both files. A dry-run flag that mutates cannot be used by CI to detect drift, and silently
 * betrays a caller who believes they are only inspecting. The test below deliberately makes
 * the on-disk file stale, runs `--check`, and asserts BOTH that it exits non-zero and that the
 * bytes on disk are untouched — the second half is the part that would have caught the bug.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { REPO_ROOT, relativeToRoot } from '../lib/paths.mjs';
import { EN_OUT, ES_OUT, OUT_DIR, measure } from './07-generate-inventories.mjs';

const SCRIPT = fileURLToPath(new URL('./07-generate-inventories.mjs', import.meta.url));

/** Run the generator from `cwd`; returns { status, stdout }. */
function runScript(args = [], cwd = REPO_ROOT) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8', stdio: 'pipe' });
    return { status: 0, stdout };
  } catch (error) {
    return { status: error.status ?? 1, stdout: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

/** Snapshot both outputs, run `fn`, restore them verbatim. */
function preservingOutputs(fn) {
  const saved = [EN_OUT, ES_OUT].map((file) => ({ file, content: fs.readFileSync(file, 'utf8') }));
  try {
    return fn();
  } finally {
    for (const { file, content } of saved) fs.writeFileSync(file, content, 'utf8');
  }
}

// --- Defect 3: `--check` mutated the filesystem -------------------------------

test('--check exits non-zero on a stale file AND writes nothing', () => {
  preservingOutputs(() => {
    const pristine = fs.readFileSync(EN_OUT, 'utf8');
    const stale = pristine.replace(/\| \*\*Phase-Gate Schemas\*\* \| \d+ \|/, '| **Phase-Gate Schemas** | 1 |');
    assert.notEqual(stale, pristine, 'test setup failed to make the file stale');

    fs.writeFileSync(EN_OUT, stale, 'utf8');
    const before = fs.readFileSync(EN_OUT);

    const { status } = runScript(['--check']);

    assert.equal(status, 1, '--check must exit non-zero when the inventory is stale');
    assert.deepEqual(
      fs.readFileSync(EN_OUT),
      before,
      '--check MUST NOT write. A dry-run flag that mutates is the bug this test exists for.',
    );
  });
});

test('--check passes and still writes nothing when the inventory is current', () => {
  runScript([]); // ensure current
  const before = [EN_OUT, ES_OUT].map((f) => fs.readFileSync(f));

  const { status } = runScript(['--check']);

  assert.equal(status, 0, '--check must pass on a freshly generated inventory');
  for (const [i, file] of [EN_OUT, ES_OUT].entries()) {
    assert.deepEqual(fs.readFileSync(file), before[i], `--check wrote to ${relativeToRoot(file)}`);
  }
});

// --- Defect 1: dead scan root reported zero -----------------------------------

test('the measured corpus is non-empty on every axis', () => {
  const m = measure();
  for (const key of ['adrCount', 'rulesetCount', 'schemaCount', 'categoryCount']) {
    assert.ok(m[key] > 0, `${key} is 0 — a dead scan root, not an empty corpus`);
  }
  // The original bug: `rulesets` (no src/ prefix) held only agents/, yielding 0.
  assert.equal(m.rulesetsPath, 'src/rulesets', 'rulesets must be measured from the real corpus root');
});

// --- Defect 2: output path nothing consumed -----------------------------------

test('output lands where 09-reconcile-maturity.mjs declares its source', () => {
  const declared = 'reference/core/control-center/maturity-reports/inventory-summary.md';
  assert.equal(relativeToRoot(EN_OUT), declared);
  assert.equal(relativeToRoot(OUT_DIR), path.posix.dirname(declared));

  const reconciler = fs.readFileSync(path.join(REPO_ROOT, '.harness/scripts/ci/09-reconcile-maturity.mjs'), 'utf8');
  assert.ok(reconciler.includes(declared), '09-reconcile-maturity.mjs no longer names this path — re-verify the consumer');
});

test('the orphaned control-center/inventory-summary.md is no longer written', () => {
  const orphan = path.join(REPO_ROOT, 'reference/core/control-center/inventory-summary.md');
  fs.rmSync(orphan, { force: true });
  runScript([]);
  assert.equal(fs.existsSync(orphan), false, 'generator resurrected the unconsumed output path');
});

// --- Defect 4: cwd-dependent resolution ---------------------------------------

test('produces identical output from the repo root, from src/, and from outside the repo', () => {
  const outputs = [REPO_ROOT, path.join(REPO_ROOT, 'src'), fs.realpathSync('/tmp')].map((cwd) => {
    const { status, stdout } = runScript([], cwd);
    assert.equal(status, 0, `generator failed when run from ${cwd}`);
    return stdout;
  });

  assert.equal(outputs[0], outputs[1], 'output differed between repo root and src/');
  assert.equal(outputs[0], outputs[2], 'output differed between repo root and /tmp');
});

test('regeneration is idempotent — a second run leaves the files byte-identical', () => {
  runScript([]);
  const first = [EN_OUT, ES_OUT].map((f) => fs.readFileSync(f));
  runScript([]);
  for (const [i, file] of [EN_OUT, ES_OUT].entries()) {
    assert.deepEqual(fs.readFileSync(file), first[i], `${relativeToRoot(file)} churned across identical runs`);
  }
});
