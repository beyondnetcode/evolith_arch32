#!/usr/bin/env node

/**
 * GT-638 — fixtures for the gap-id allocation guard.
 *
 * The case that matters is the one this repository lived through: two branches
 * allocate `GT-634`, each for a different gap, and nothing says so until the
 * merge. If that fixture ever goes green the guard is decoration — which is why
 * GT-638's third criterion asks for a fixture that has been OBSERVED red rather
 * than a guard someone believes works.
 *
 * The integration fixtures build real git repositories, because the comparison is
 * `git show <base>:<file>` and a mock of that would only prove the mock.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, execFileSync } from 'node:child_process';

import {
  parseCatalogTitles,
  findIdCollisions,
  newlyAllocated,
  defaultBase,
  CATALOG,
} from './49-validate-gap-id-allocation.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUARD = resolve(__dirname, '49-validate-gap-id-allocation.mjs');

let sandbox;
before(() => { sandbox = mkdtempSync(join(tmpdir(), 'gt638-')); });
after(() => { if (sandbox) rmSync(sandbox, { recursive: true, force: true }); });

const run = (root, extra = []) => {
  const r = spawnSync(process.execPath, [GUARD, '--root', root, ...extra], {
    encoding: 'utf8', timeout: 120000,
  });
  return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
};

const catalog = (entries) =>
  '# Catalog\n\n' +
  entries
    .map(([id, title, evidence = 'something']) => `#### ${id}\n\n**Title:** ${title}\n\n- **Evidence:** ${evidence}\n`)
    .join('\n');

// ---------------------------------------------------------------------------
// Pure core
// ---------------------------------------------------------------------------

describe('parseCatalogTitles', () => {
  it('reads one title per id', () => {
    const t = parseCatalogTitles(catalog([['GT-001', 'first'], ['GT-002', 'second']]));
    assert.equal(t.size, 2);
    assert.equal(t.get('GT-002'), 'second');
  });

  it('yields nothing when the shape moves — the caller turns that into a failure', () => {
    assert.equal(parseCatalogTitles('### GT-001\n\nTitle: no bold, no match\n').size, 0);
  });
});

describe('findIdCollisions', () => {
  const base = new Map([['GT-001', 'a'], ['GT-002', 'b']]);

  it('THE CASE: same id, different gap', () => {
    const found = findIdCollisions(base, new Map([['GT-002', 'something else entirely']]));
    assert.equal(found.length, 1);
    assert.equal(found[0].id, 'GT-002');
    assert.equal(found[0].baseTitle, 'b');
  });

  it('an id edited but not renamed is NOT a collision', () => {
    assert.deepEqual(findIdCollisions(base, new Map([['GT-001', 'a']])), []);
  });

  it('a newly allocated id is not a collision, and is reported separately', () => {
    const head = new Map([['GT-001', 'a'], ['GT-003', 'new']]);
    assert.deepEqual(findIdCollisions(base, head), []);
    assert.deepEqual(newlyAllocated(base, head), ['GT-003']);
  });
});

describe('defaultBase', () => {
  it('uses the PR base in CI', () => {
    assert.equal(defaultBase({ GITHUB_BASE_REF: 'develop' }), 'origin/develop');
  });

  it('falls back to the remote default branch, never a local one', () => {
    // A local `main` can be arbitrarily stale, and comparing against a stale base
    // is how a collision passes.
    assert.equal(defaultBase({}), 'origin/main');
  });
});

// ---------------------------------------------------------------------------
// Integration, over real git history
// ---------------------------------------------------------------------------

/** A repo with the catalog committed on `base`, then rewritten on the checked-out branch. */
const repoWith = (name, baseEntries, headEntries) => {
  const root = join(sandbox, name);
  mkdirSync(join(root, dirname(CATALOG)), { recursive: true });
  const g = (...args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });

  g('init', '-q', '-b', 'base');
  g('config', 'user.email', 'f@example.com');
  g('config', 'user.name', 'f');
  writeFileSync(join(root, CATALOG), catalog(baseEntries));
  g('add', '-A');
  g('commit', '-q', '-m', 'base catalog');

  g('checkout', '-q', '-b', 'work');
  writeFileSync(join(root, CATALOG), catalog(headEntries));
  g('add', '-A');
  g('commit', '-q', '-m', 'branch catalog');
  return root;
};

describe('the collision this guard exists for', () => {
  it('THE FIXTURE: two branches allocate GT-634 for different gaps — RED', () => {
    const root = repoWith(
      'collision',
      [['GT-633', 'a guard that compared the snapshot with itself'], ['GT-634', 'the dead-reference ratchet is stuck']],
      [['GT-633', 'a guard that compared the snapshot with itself'], ['GT-634', 'the published CLI resolves a stale SDK']],
    );
    const { status, out } = run(root, ['--base', 'base']);
    assert.equal(status, 1, out);
    assert.match(out, /1 gap id\(s\) name a DIFFERENT gap on each side/);
    assert.match(out, /GT-634/);
    // It must name BOTH sides, or resolving it is a search.
    assert.match(out, /the dead-reference ratchet is stuck/);
    assert.match(out, /the published CLI resolves a stale SDK/);
    // And it must not guess which one is wrong.
    assert.match(out, /this guard cannot tell the two apart, and should not guess/);
  });

  it('a branch that only ADDS an id is green', () => {
    const root = repoWith('new-id', [['GT-633', 'x']], [['GT-633', 'x'], ['GT-634', 'y']]);
    const { status, out } = run(root, ['--base', 'base', '--verbose']);
    assert.equal(status, 0, out);
    assert.match(out, /newly allocated \.+ 1 \(GT-634\)/);
    // The one thing this guard cannot see, said out loud rather than implied.
    assert.match(out, /check it against every OTHER open branch/);
  });

  it('a branch that edits a row without retitling it is green', () => {
    const root = repoWith('edited', [['GT-633', 'x', 'first telling']], [['GT-633', 'x', 'rewritten evidence, same gap']]);
    assert.equal(run(root, ['--base', 'base']).status, 0);
  });
});

describe('anti-vacuous floor', () => {
  it('refuses a tree where the catalog is not where it looks', () => {
    const root = join(sandbox, 'no-catalog');
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, 'placeholder.txt'), 'x');
    const { status, out } = run(root, ['--base', 'base']);
    assert.equal(status, 1, out);
    assert.match(out, /must not read as "no collisions"/);
  });

  it('refuses a base ref it cannot read, rather than skipping', () => {
    const root = repoWith('bad-base', [['GT-001', 'a', 'before']], [['GT-001', 'a', 'after']]);
    const { status, out } = run(root, ['--base', 'origin/nope']);
    assert.equal(status, 1, out);
    assert.match(out, /cannot read the catalog at the base ref/);
    assert.match(out, /Unable to answer is not the same as nothing to report/);
  });

  it('refuses a catalog whose heading shape moved', () => {
    const root = join(sandbox, 'reshaped');
    mkdirSync(join(root, dirname(CATALOG)), { recursive: true });
    const g = (...args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
    g('init', '-q', '-b', 'base');
    g('config', 'user.email', 'f@example.com');
    g('config', 'user.name', 'f');
    writeFileSync(join(root, CATALOG), catalog([['GT-001', 'a']]));
    g('add', '-A'); g('commit', '-q', '-m', 'base');
    g('checkout', '-q', '-b', 'work');
    writeFileSync(join(root, CATALOG), '### GT-001\n\nTitle: the shape moved\n');
    g('add', '-A'); g('commit', '-q', '-m', 'reshaped');

    const { status, out } = run(root, ['--base', 'base']);
    assert.equal(status, 1, out);
    assert.match(out, /at least one side yielded NOTHING/);
    assert.match(out, /Fix this parser rather than deleting the check/);
  });
});
