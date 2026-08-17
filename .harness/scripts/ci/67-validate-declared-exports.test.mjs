#!/usr/bin/env node

/**
 * GT-706 — fixtures for the declared-exports guard.
 *
 * The case that matters is the one that defeated the check this replaces: a
 * package whose `exports` map names a file it never packs. `npm-release.yml:213`
 * computes "promised" as `[pkg.main, ...bin]`, so that package passes with exit 0
 * while `require pkg/ingest` answers MODULE_NOT_FOUND. The first test here builds
 * exactly that package and asserts this guard turns RED on it — and the
 * neighbouring test asserts the SAME guard stays green when the file is present,
 * because a check that fails on everything is not evidence either.
 *
 * The packlist is injected as a plain set in the unit tests rather than produced
 * by `npm pack`: the guard's job is reconciling a manifest against a file list,
 * and running npm here would test npm. One end-to-end test drives the real binary
 * over a real temp package, so the wiring is measured too rather than assumed.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import {
  targetLeaves,
  declaredTargets,
  wildcardMatcher,
  reconcile,
  publishableWorkspaces,
} from './67-validate-declared-exports.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUARD = resolve(__dirname, '67-validate-declared-exports.mjs');
const REPO_ROOT = resolve(__dirname, '../../..');

describe('targetLeaves — every string in the condition tree is a promise', () => {
  it('takes a bare string', () => {
    assert.deepEqual(targetLeaves('./dist/index.js'), ['./dist/index.js']);
  });

  it('takes types AND default, because a missing types breaks TypeScript consumers', () => {
    assert.deepEqual(
      targetLeaves({ types: './dist/a.d.ts', default: './dist/a.js' }),
      ['./dist/a.d.ts', './dist/a.js'],
    );
  });

  it('descends through nested conditions', () => {
    assert.deepEqual(
      targetLeaves({ import: { types: './dist/a.d.mts', default: './dist/a.mjs' }, require: './dist/a.cjs' }),
      ['./dist/a.d.mts', './dist/a.mjs', './dist/a.cjs'],
    );
  });

  it('descends through arrays', () => {
    assert.deepEqual(targetLeaves(['./dist/a.js', './dist/b.js']), ['./dist/a.js', './dist/b.js']);
  });

  it('yields nothing for null — a null target is a deliberate block, not a promise', () => {
    assert.deepEqual(targetLeaves(null), []);
  });
});

describe('declaredTargets — split by whether a target names a file or a pattern', () => {
  it('separates plain subpaths from wildcards', () => {
    const { plain, wildcard } = declaredTargets({
      exports: { '.': './dist/index.js', './ingest': './dist/ingest/index.js', './*': './dist/*.js' },
    });
    assert.deepEqual(plain.map((r) => r.target), ['dist/index.js', 'dist/ingest/index.js']);
    assert.deepEqual(wildcard.map((r) => r.target), ['dist/*.js']);
  });

  it('subsumes main and bin, so this guard is a superset of the release assertion', () => {
    const { plain } = declaredTargets({ main: './dist/main.js', bin: { tool: 'dist/cli.js' } });
    assert.deepEqual(plain.map((r) => r.target).sort(), ['dist/cli.js', 'dist/main.js']);
  });

  it('normalizes the leading ./ that packlists never carry', () => {
    const { plain } = declaredTargets({ exports: { '.': './dist/index.js' } });
    assert.equal(plain[0].target, 'dist/index.js');
  });

  it('does not report the same subpath/target pair twice', () => {
    const { plain } = declaredTargets({ main: './dist/index.js', exports: { '.': './dist/index.js' } });
    assert.equal(plain.filter((r) => r.target === 'dist/index.js').length, 2, 'distinct subpaths stay distinct');
    const { plain: once } = declaredTargets({ exports: { '.': { types: './dist/i.js', default: './dist/i.js' } } });
    assert.equal(once.length, 1, 'the same pair under two conditions collapses');
  });
});

describe('wildcardMatcher — a * stands for a segment run, never for a /', () => {
  it('matches within one segment', () => {
    assert.ok(wildcardMatcher('dist/*.js').test('dist/index.js'));
  });

  it('refuses to cross a directory boundary', () => {
    assert.ok(!wildcardMatcher('dist/*.js').test('dist/nested/index.js'));
  });

  it('is anchored, so a suffix match is not a match', () => {
    assert.ok(!wildcardMatcher('dist/*.js').test('other/dist/index.js'));
    assert.ok(!wildcardMatcher('dist/*.js').test('dist/index.js.map'));
  });

  it('escapes regex metacharacters in the literal parts', () => {
    assert.ok(wildcardMatcher('dist/a.b/*.js').test('dist/a.b/c.js'));
    assert.ok(!wildcardMatcher('dist/a.b/*.js').test('dist/axb/c.js'));
  });
});

describe('reconcile — the defect this guard exists for', () => {
  // THE FIXTURE. This is `contracts@1.1.0` reduced to its essentials: an exports
  // map naming a file the tarball does not carry. The release's own assertion
  // passes it, because `exports` is not in the list it checks.
  const phantom = {
    name: 'phantom',
    main: './dist/index.js',
    exports: { '.': './dist/index.js', './ingest': './dist/ingest/index.js' },
  };

  it('is RED on a declared export that is not packed', () => {
    const { missing } = reconcile(phantom, ['dist/index.js', 'package.json']);
    assert.equal(missing.length, 1);
    assert.equal(missing[0].subpath, './ingest');
    assert.equal(missing[0].target, 'dist/ingest/index.js');
  });

  it('is GREEN on the same package once the file ships — the check is not simply strict', () => {
    const { missing, dead } = reconcile(phantom, ['dist/index.js', 'dist/ingest/index.js', 'package.json']);
    assert.equal(missing.length, 0);
    assert.equal(dead.length, 0);
  });

  it('is RED on a wildcard that matches nothing — the live defect on the registry', () => {
    // `core-domain` declared `./infrastructure/adapters/*` and there is no
    // adapters directory at all: 0 matches in a 796-file packlist, and
    // MODULE_NOT_FOUND from the published 1.3.1 for every name under it. A check
    // that skipped wildcards would have called that package clean.
    const { dead } = reconcile(
      { exports: { './infrastructure/adapters/*': './dist/infrastructure/adapters/*.js' } },
      ['dist/infrastructure/audit/x.js', 'dist/infrastructure/events/y.js'],
    );
    assert.equal(dead.length, 1);
    assert.equal(dead[0].subpath, './infrastructure/adapters/*');
  });

  it('is GREEN on a wildcard that matches at least one file', () => {
    const { dead } = reconcile({ exports: { './*': './dist/*.js' } }, ['dist/index.js']);
    assert.equal(dead.length, 0);
  });

  it('counts every target it checked, so a vacuous pass is visible', () => {
    const { checked } = reconcile(phantom, ['dist/index.js']);
    assert.equal(checked, 3, 'two exports targets plus main');
  });

  it('reports a package with no exports at all as trivially clean', () => {
    const { missing, dead, checked } = reconcile({ name: 'plain' }, ['package.json']);
    assert.deepEqual([missing.length, dead.length, checked], [0, 0, 0]);
  });
});

describe('publishableWorkspaces — coverage comes from the manifest, not a hardcoded list', () => {
  it('resolves more than zero packages in this repository', () => {
    const dirs = publishableWorkspaces(REPO_ROOT);
    assert.ok(dirs.length > 0, 'an empty scan would make every run vacuously green');
  });

  it('excludes private packages, which are never published', () => {
    const dirs = publishableWorkspaces(REPO_ROOT);
    for (const rel of dirs) {
      const pkg = JSON.parse(readFileSync(join(REPO_ROOT, rel, 'package.json'), 'utf8'));
      assert.notEqual(pkg.private, true, `${rel} is private and should not be scanned`);
    }
  });
});

describe('end to end — the binary, on a real package, through a real npm pack', () => {
  const run = (dir) => spawnSync(process.execPath, [GUARD, '--pkg', dir], { encoding: 'utf8' });

  const write = (root, exportsMap) => {
    mkdirSync(join(root, 'dist'), { recursive: true });
    writeFileSync(join(root, 'dist', 'index.js'), 'module.exports = {};\n');
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify(
        { name: 'gt706-fixture', version: '1.0.0', main: './dist/index.js', files: ['dist'], exports: exportsMap },
        null,
        2,
      ),
    );
  };

  it('exits non-zero and names the missing target, so the failure is actionable without opening the tarball', () => {
    const root = mkdtempSync(join(tmpdir(), 'gt706-red-'));
    try {
      write(root, { '.': './dist/index.js', './ingest': './dist/ingest/index.js' });
      const r = run(root);
      assert.notEqual(r.status, 0, 'a phantom export must be red');
      const out = `${r.stdout}${r.stderr}`;
      assert.match(out, /gt706-fixture/, 'names the package');
      assert.match(out, /\.\/ingest/, 'names the subpath');
      assert.match(out, /dist\/ingest\/index\.js/, 'names the target file');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('exits zero on the same package once the declared file is actually shipped', () => {
    const root = mkdtempSync(join(tmpdir(), 'gt706-green-'));
    try {
      write(root, { '.': './dist/index.js', './ingest': './dist/ingest/index.js' });
      mkdirSync(join(root, 'dist', 'ingest'), { recursive: true });
      writeFileSync(join(root, 'dist', 'ingest', 'index.js'), 'module.exports = {};\n');
      const r = run(root);
      assert.equal(r.status, 0, `expected green, got: ${r.stdout}${r.stderr}`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('is red on a package whose `files` field excludes a file that exists on disk', () => {
    // The mechanism that produced the original defect: the file was written, and
    // the manifest simply did not ship it. Checking the filesystem instead of the
    // PACKLIST would call this clean.
    const root = mkdtempSync(join(tmpdir(), 'gt706-files-'));
    try {
      mkdirSync(join(root, 'dist', 'ingest'), { recursive: true });
      writeFileSync(join(root, 'dist', 'index.js'), 'module.exports = {};\n');
      writeFileSync(join(root, 'dist', 'ingest', 'index.js'), 'module.exports = {};\n');
      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify(
          {
            name: 'gt706-fixture',
            version: '1.0.0',
            main: './dist/index.js',
            files: ['dist/index.js'],
            exports: { '.': './dist/index.js', './ingest': './dist/ingest/index.js' },
          },
          null,
          2,
        ),
      );
      const r = run(root);
      assert.notEqual(r.status, 0, 'on disk but not in the tarball is still a phantom');
      assert.match(`${r.stdout}${r.stderr}`, /dist\/ingest\/index\.js/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('is green across this repository as it stands', () => {
    const r = spawnSync(process.execPath, [GUARD], { encoding: 'utf8', cwd: REPO_ROOT });
    assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
    assert.match(r.stdout, /declared target\(s\) across \d+ publishable package\(s\)/);
  });
});
