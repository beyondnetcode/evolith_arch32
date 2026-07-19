import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  PATH_KEYS,
  REPO_ROOT,
  ROOT_MARKERS,
  auditCatalogue,
  collectFiles,
  expected,
  findRepoRoot,
  optional,
  relativeToRoot,
  resolve,
} from './paths.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));

// --- The bug being fixed: cwd dependence -------------------------------------
//
// 30-validate-phase-topology-disjoint.mjs reported 8 topology ids from the repo root
// and 5 from src/, exiting 0 both times, because it derived its roots from
// process.cwd(). These tests pin the property that made that impossible to notice.

test('REPO_ROOT is absolute and carries every root marker', () => {
  assert.ok(isAbsolute(REPO_ROOT), 'repo root must be absolute');
  for (const marker of ROOT_MARKERS) {
    assert.ok(existsSync(join(REPO_ROOT, marker)), `root marker missing: ${marker}`);
  }
});

test('findRepoRoot returns the SAME root regardless of the directory it starts from', () => {
  const fromLib = findRepoRoot(HERE);
  const fromSrc = findRepoRoot(join(REPO_ROOT, 'src'));
  const fromDeep = findRepoRoot(join(REPO_ROOT, 'src', 'rulesets', 'topologies'));
  const fromRoot = findRepoRoot(REPO_ROOT);

  assert.equal(fromSrc, fromLib);
  assert.equal(fromDeep, fromLib);
  assert.equal(fromRoot, fromLib);
  assert.equal(fromLib, REPO_ROOT);
});

test('resolve() is invariant under process.chdir — the actual defect', () => {
  const original = process.cwd();
  try {
    process.chdir(REPO_ROOT);
    const fromRoot = Object.keys(PATH_KEYS).map((k) => expected(k));

    process.chdir(join(REPO_ROOT, 'src'));
    const fromSrc = Object.keys(PATH_KEYS).map((k) => expected(k));

    assert.deepEqual(fromSrc, fromRoot, 'resolved paths must not depend on the cwd');
  } finally {
    process.chdir(original);
  }
});

test('a child process launched from src/ resolves the identical root (real subprocess, not chdir)', () => {
  const script = `import { REPO_ROOT } from ${JSON.stringify(join(HERE, 'paths.mjs'))}; process.stdout.write(REPO_ROOT);`;
  const run = (cwd) => execFileSync(process.execPath, ['--input-type=module', '-e', script], { cwd, encoding: 'utf8' }).trim();

  assert.equal(run(join(REPO_ROOT, 'src')), REPO_ROOT);
  assert.equal(run(REPO_ROOT), REPO_ROOT);
  assert.equal(run(join(REPO_ROOT, '.harness')), REPO_ROOT);
});

test('the topology corpus is the same size from any cwd (the 8-vs-5 regression)', () => {
  const original = process.cwd();
  const keys = ['topologiesReference', 'topologiesRulesets'];
  try {
    process.chdir(REPO_ROOT);
    const a = collectFiles(keys, 'topology.manifest.json').length;
    process.chdir(join(REPO_ROOT, 'src'));
    const b = collectFiles(keys, 'topology.manifest.json').length;

    assert.equal(a, b, 'manifest count must not depend on the cwd');
    assert.ok(a > 0, 'the topology corpus must be non-empty');
  } finally {
    process.chdir(original);
  }
});

// --- Fail-closed resolution ---------------------------------------------------

test('resolve() returns an existing absolute path for a live key', () => {
  const p = resolve('topologiesRulesets');
  assert.ok(isAbsolute(p));
  assert.ok(existsSync(p));
});

test('resolve() joins extra segments', () => {
  const p = resolve('harnessScripts', 'lib', 'paths.mjs');
  assert.ok(existsSync(p));
  assert.equal(relativeToRoot(p), '.harness/scripts/lib/paths.mjs');
});

test('resolve() throws for a missing segment, naming key, path and the likely cause', () => {
  assert.throws(
    () => resolve('products', '__definitely-not-a-real-product__'),
    (err) => {
      assert.match(err.message, /FAIL-CLOSED/);
      assert.match(err.message, /'products'/, 'error must name the key');
      assert.match(err.message, /__definitely-not-a-real-product__/, 'error must name the resolved path');
      assert.ok(err.message.includes(REPO_ROOT), 'error must show the absolute resolution');
      assert.match(err.message, /layout has most likely changed/i, 'error must state the likely cause');
      return true;
    },
  );
});

test('resolve() rejects unknown keys and lists the known ones', () => {
  assert.throws(
    () => resolve('reference/products'),
    (err) => {
      assert.match(err.message, /Unknown path key/);
      assert.match(err.message, /topologiesRulesets/);
      return true;
    },
  );
});

test('optional() returns null instead of throwing — the sanctioned escape hatch', () => {
  assert.equal(optional('products', '__nope__'), null);
  assert.ok(optional('topologiesRulesets'));
  assert.throws(() => optional('not-a-key'), /Unknown path key/);
});

test('expected() never touches the filesystem', () => {
  const p = expected('products', '__nope__');
  assert.ok(isAbsolute(p));
  assert.ok(!existsSync(p));
});

// --- Catalogue integrity ------------------------------------------------------

test('PATH_KEYS is frozen and non-empty', () => {
  assert.ok(Object.isFrozen(PATH_KEYS));
  assert.ok(Object.keys(PATH_KEYS).length > 10);
});

test('every catalogued path exists — the catalogue is the layout contract', () => {
  const dead = auditCatalogue().filter((e) => !e.exists);
  assert.deepEqual(
    dead,
    [],
    `dead path keys (repo layout moved, or the catalogue is wrong):\n${dead.map((d) => `  ${d.key} -> ${d.path}`).join('\n')}`,
  );
});

test('no catalogued path is absolute or escapes the repo root', () => {
  for (const [key, rel] of Object.entries(PATH_KEYS)) {
    assert.ok(!isAbsolute(rel), `${key} must be repo-relative`);
    assert.ok(!rel.startsWith('..'), `${key} must not escape the repo root`);
    assert.ok(!rel.includes('\\'), `${key} must use POSIX separators`);
  }
});

test('relativeToRoot produces stable POSIX output', () => {
  assert.equal(relativeToRoot(resolve('topologiesRulesets')), 'src/rulesets/topologies');
  assert.equal(relativeToRoot('src/rulesets'), 'src/rulesets');
});

// --- collectFiles -------------------------------------------------------------

test('collectFiles walks every key and fails closed on a dead one', () => {
  const files = collectFiles(['topologiesReference', 'topologiesRulesets'], 'topology.manifest.json');
  assert.ok(files.length > 0);
  assert.ok(files.every((f) => f.endsWith('topology.manifest.json')));

  const refOnly = collectFiles(['topologiesReference'], 'topology.manifest.json');
  assert.ok(files.length > refOnly.length, 'the second root must contribute manifests the first does not');

  assert.throws(() => collectFiles(['nonexistent-key'], 'x.json'), /Unknown path key/);
});
