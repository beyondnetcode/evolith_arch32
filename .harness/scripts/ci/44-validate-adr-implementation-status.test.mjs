#!/usr/bin/env node

/**
 * GT-607 — tests for the ADR implementation-status guard.
 *
 * Every case is a negative fixture first. A guard that has never been observed
 * failing is indistinguishable from a guard that cannot fail, and this repository
 * has shipped that mistake before (the composite action that always rendered
 * "0 violation(s) found", GT-577). Fixtures are synthetic ADR trees passed via
 * `--root`, with their own baseline via `--baseline`, so the suite never reads
 * the real corpus.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUARD = resolve(__dirname, '44-validate-adr-implementation-status.mjs');
const ADR_DIR = join('reference', 'core', 'architecture', 'adrs', 'core');

let sandbox;

before(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'adr-status-guard-'));
});

after(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

/**
 * Build a synthetic repo root.
 *
 * @param {string} name fixture name
 * @param {Record<string,string>} adrs file name -> content, under the ADR dir
 * @param {string[]} extraFiles repo-relative paths to create as empty files
 * @param {object} baseline baseline JSON contents
 */
function fixture(name, adrs, extraFiles = [], baseline = { undeclared: [], unparseableStatus: [] }) {
  const root = join(sandbox, name);
  const adrDir = join(root, ADR_DIR);
  mkdirSync(adrDir, { recursive: true });
  for (const [file, content] of Object.entries(adrs)) {
    writeFileSync(join(adrDir, file), content);
  }
  for (const rel of extraFiles) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, '');
  }
  const baselinePath = join(root, 'baseline.json');
  writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
  return { root, baselinePath };
}

function run({ root, baselinePath }, extra = []) {
  const res = spawnSync(process.execPath, [GUARD, '--root', root, '--baseline', baselinePath, ...extra], {
    encoding: 'utf8',
  });
  return { status: res.status, out: `${res.stdout ?? ''}${res.stderr ?? ''}` };
}

const accepted = (body = '') => `# ADR-0999: Something\n\n## Status\n\nAccepted\n${body}\n## Date\n\n2026-01-01\n`;

describe('44-validate-adr-implementation-status', () => {
  test('fails when an Accepted ADR declares no implementation status', () => {
    // This is the GT-607 recurrence case: someone deletes the honest annotation
    // and the ADR silently returns to "Accepted, backed by nothing".
    const f = fixture('undeclared', { '0999-thing.md': accepted() });

    const { status, out } = run(f);

    assert.equal(status, 1);
    assert.match(out, /declares no implementation status/);
    assert.match(out, /0999-thing\.md/);
  });

  test('passes when the ADR declares "none" explicitly', () => {
    // "none" is a legitimate permanent answer for a standard published for
    // satellites. The guard must not push authors toward inventing evidence.
    const f = fixture('declared-none', {
      '0999-thing.md': accepted('\n<!-- implementation-status: none -->\n'),
    });

    const { status, out } = run(f);

    assert.equal(status, 0);
    assert.match(out, /1 declare an implementation status \(1 of them "none"\)/);
  });

  test('fails when the declared implementing path does not exist', () => {
    // The falsifiable half: the ADR claims a file implements it, and the file is gone.
    const f = fixture('dangling-path', {
      '0999-thing.md': accepted('\n<!-- implementation-status: src/packages/gone/adapter.ts -->\n'),
    });

    const { status, out } = run(f);

    assert.equal(status, 1);
    assert.match(out, /declares "src\/packages\/gone\/adapter\.ts" as implementing code, and that path does not exist/);
  });

  test('passes when every declared implementing path exists', () => {
    const f = fixture(
      'live-path',
      { '0999-thing.md': accepted('\n<!-- implementation-status: src/packages/here/adapter.ts, src/rulesets/x.json -->\n') },
      ['src/packages/here/adapter.ts', 'src/rulesets/x.json'],
    );

    const { status } = run(f);

    assert.equal(status, 0);
  });

  test('does not demand a declaration from an ADR that is not in force', () => {
    // A Proposed or Superseded decision makes no implementation claim, so
    // requiring evidence from it would be the false positive that gets a guard deleted.
    const f = fixture('proposed', {
      '0999-thing.md': '# ADR\n\n## Status\n\nProposed (2026-07-04 — pending board)\n\n## Date\n\n2026-01-01\n',
      '0998-old.md': '# ADR\n\n## Status\n\nSuperseded by [ADR 0085](./0085-x.md)\n\n## Date\n\n2026-01-01\n',
    });

    const { status, out } = run(f);

    assert.equal(status, 0);
    assert.match(out, /2 ADR\(s\) scanned/);
  });

  test('fails when the Spanish copy declares something different from the English one', () => {
    const f = fixture('parity', {
      '0999-thing.md': accepted('\n<!-- implementation-status: none -->\n'),
      '0999-thing.es.md': accepted('\n<!-- implementation-status: src/packages/here/adapter.ts -->\n'),
    }, ['src/packages/here/adapter.ts']);

    const { status, out } = run(f);

    assert.equal(status, 1);
    assert.match(out, /The two languages must state the same thing/);
  });

  test('accepts a baselined legacy ADR, and reports it out loud', () => {
    const f = fixture(
      'baselined',
      { '0999-thing.md': accepted() },
      [],
      { undeclared: [`${ADR_DIR.split('/').join('/')}/0999-thing.md`.replace(/\\/g, '/')], unparseableStatus: [] },
    );

    const { status, out } = run(f);

    assert.equal(status, 0);
    assert.match(out, /1 undeclared/);
  });

  test('fails when a baseline entry is stale because the ADR now declares', () => {
    // A baseline that never shrinks is decoration. This is what forces it down.
    const f = fixture(
      'stale-baseline',
      { '0999-thing.md': accepted('\n<!-- implementation-status: none -->\n') },
      [],
      { undeclared: [`${ADR_DIR}/0999-thing.md`], unparseableStatus: [] },
    );

    const { status, out } = run(f);

    assert.equal(status, 1);
    assert.match(out, /but it now declares an implementation status/);
  });

  test('fails when a baseline entry names an ADR that no longer exists', () => {
    const f = fixture('ghost-baseline', { '0999-thing.md': accepted('\n<!-- implementation-status: none -->\n') }, [], {
      undeclared: [`${ADR_DIR}/0001-deleted.md`],
      unparseableStatus: [],
    });

    const { status, out } = run(f);

    assert.equal(status, 1);
    assert.match(out, /no such ADR exists/);
  });

  test('refuses to pass vacuously when the ADR corpus is empty', () => {
    const root = join(sandbox, 'empty-corpus');
    mkdirSync(join(root, ADR_DIR), { recursive: true });
    const baselinePath = join(root, 'baseline.json');
    writeFileSync(baselinePath, '{}');

    const { status, out } = run({ root, baselinePath });

    assert.equal(status, 1);
    assert.match(out, /ZERO ADR files/);
  });

  test('--strict turns the remaining baseline into a failure', () => {
    const f = fixture('strict', { '0999-thing.md': accepted() }, [], {
      undeclared: [`${ADR_DIR}/0999-thing.md`],
      unparseableStatus: [],
    });

    assert.equal(run(f).status, 0);
    const strict = run(f, ['--strict']);
    assert.equal(strict.status, 1);
    assert.match(strict.out, /--strict: .*0999-thing\.md is Accepted and still undeclared/);
  });

  test('ignores READMEs, matrices and the authoring standard', () => {
    const f = fixture('indexes', {
      'README.md': '# Index\n',
      'adr-matrix.md': '# Matrix\n',
      'adr-authoring-standard.md': '# Standard\n\n## Status\n\nAccepted\n',
      '0999-thing.md': accepted('\n<!-- implementation-status: none -->\n'),
    });

    const { status, out } = run(f);

    assert.equal(status, 0);
    assert.match(out, /1 ADR\(s\) scanned/);
  });

  test('--write-baseline records exactly the current debt', () => {
    const f = fixture('write', { '0999-thing.md': accepted(), '0998-other.md': accepted('\n<!-- implementation-status: none -->\n') });

    const { status } = run(f, ['--write-baseline']);
    assert.equal(status, 0);

    const written = JSON.parse(readFileSync(f.baselinePath, 'utf8'));
    assert.deepEqual(written.undeclared, [`${ADR_DIR}/0999-thing.md`]);
    assert.equal(run(f).status, 0);
  });
});
