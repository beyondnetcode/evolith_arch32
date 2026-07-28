#!/usr/bin/env node

/**
 * Tests for the shared guard classification (GT-578).
 *
 * `42-validate-guard-denominators.mjs` and
 * `43-validate-guard-negative-fixtures.mjs` both consume this module, and each
 * has its own end-to-end fixtures. What is asserted HERE is the property those
 * two cannot check about themselves: that they are looking at the same corpus,
 * and that the four states really are exhaustive and mutually exclusive.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  classifyGuards,
  collectGuards,
  scanningGuards,
  SELF_GUARDED,
  NOT_A_SCANNER,
  PENDING,
} from './guard-classification.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REAL_CI_DIR = resolve(__dirname, '../ci');

let sandbox;

function fixture(name, files) {
  const ciDir = join(sandbox, name);
  mkdirSync(ciDir, { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(ciDir, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return ciDir;
}

const INSTRUMENTED = `
import { assertScanned } from '../lib/coverage.mjs';
assertScanned(0, { what: 'things', where: 'somewhere' });
`;

before(() => { sandbox = mkdtempSync(join(tmpdir(), 'gt578-classify-')); });
after(() => { if (sandbox) rmSync(sandbox, { recursive: true, force: true }); });

describe('collectGuards', () => {
  test('excludes .test.mjs — a fixture is not a gate', () => {
    const dir = fixture('with-tests', {
      '90-guard.mjs': INSTRUMENTED,
      '90-guard.test.mjs': 'export const x = 1;\n',
      'nested/91-guard.mjs': INSTRUMENTED,
      'notes.md': '# not a script\n',
    });
    assert.deepEqual(collectGuards(dir), ['90-guard.mjs', 'nested/91-guard.mjs']);
  });
});

describe('classifyGuards', () => {
  test('an unclassified script is a violation, not a fifth state', () => {
    const dir = fixture('unclassified', { '91-silent.mjs': "console.log('all good');\n" });
    const { violations, instrumented, selfGuarded, notScanners, pending } = classifyGuards(dir);
    assert.equal(instrumented.length + selfGuarded.length + notScanners.length + pending.length, 0);
    assert.equal(violations.length, 1);
    assert.match(violations[0], /no denominator and no classification/);
  });

  test('the four states are exhaustive and disjoint over the real CI directory', () => {
    const c = classifyGuards(REAL_CI_DIR);
    const total =
      c.instrumented.length + c.selfGuarded.length + c.notScanners.length + c.pending.length;
    // Every guard lands in exactly one bucket, or produced a violation.
    assert.equal(total + c.violations.length, c.guards.length);
    const seen = new Set([...c.instrumented, ...c.selfGuarded, ...c.notScanners, ...c.pending]);
    assert.equal(seen.size, total, 'a guard appears in more than one bucket');
  });

  test('the real CI directory has no unclassified guard', () => {
    const { violations } = classifyGuards(REAL_CI_DIR);
    assert.deepEqual(violations, [], violations.join('\n'));
  });
});

describe('scanningGuards', () => {
  test('is exactly INSTRUMENTED + SELF_GUARDED — the set a negative fixture must turn red', () => {
    const c = classifyGuards(REAL_CI_DIR);
    const s = scanningGuards(REAL_CI_DIR);
    assert.equal(s.length, c.instrumented.length + c.selfGuarded.length);
    for (const rel of c.notScanners) assert.ok(!s.includes(rel), `${rel} is not a scanner`);
  });

  test('is non-empty for the real repository', () => {
    // A zero-length answer here would make 43 report "all fixtures green" over
    // nothing at all. 43 asserts this too; belt and braces on a shared module.
    assert.ok(scanningGuards(REAL_CI_DIR).length > 0);
  });
});

describe('registries', () => {
  test('every SELF_GUARDED entry carries a proof regex and a reason', () => {
    for (const e of SELF_GUARDED) {
      assert.ok(e.proof instanceof RegExp, `${e.file} has no proof regex`);
      assert.ok(e.reason?.trim(), `${e.file} has no reason`);
    }
  });

  test('every NOT_A_SCANNER and PENDING entry carries a reason', () => {
    for (const e of [...NOT_A_SCANNER, ...PENDING]) {
      assert.ok(e.reason?.trim(), `${e.file} has no reason — an unexplained exemption is the defect`);
    }
  });

  test('no file is registered in two registries at once', () => {
    const all = [...SELF_GUARDED, ...NOT_A_SCANNER, ...PENDING].map((e) => e.file);
    assert.equal(new Set(all).size, all.length, 'duplicate registry entry');
  });
});
