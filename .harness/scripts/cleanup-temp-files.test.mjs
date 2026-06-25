import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { isTempFile, isInTempDir, isTrackedFile, TEMP_DIRS } from './cleanup-temp-files.mjs';

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'evolith-cleanup-'));
}

// ── isInTempDir: path-segment matching ──────────────────────────────────────

test('TEMP_DIRS includes coverage', () => {
  assert.ok(TEMP_DIRS.includes('coverage'));
});

test('isInTempDir does not match coverage as a filename substring', () => {
  const root = tempRoot();
  const cases = [
    path.join(root, '.harness', 'scripts', 'bilingual-coverage.mjs'),
    path.join(root, '.harness', 'scripts', 'coverage-dashboard.mjs'),
    path.join(root, '.harness', 'scripts', 'ci', '26-validate-topology-rule-coverage.mjs'),
  ];
  for (const filePath of cases) {
    assert.equal(
      isInTempDir(filePath, root),
      false,
      `${path.basename(filePath)} must NOT be treated as inside a temp dir`,
    );
  }
});

test('isInTempDir matches a genuine coverage/ directory', () => {
  const root = tempRoot();
  const filePath = path.join(root, 'coverage', 'lcov.info');
  assert.equal(isInTempDir(filePath, root), true);
});

test('isInTempDir matches .nyc_output/', () => {
  const root = tempRoot();
  assert.equal(isInTempDir(path.join(root, '.nyc_output', 'out.json'), root), true);
});

// ── isTempFile: pattern matching ─────────────────────────────────────────────

test('isTempFile matches .tsbuildinfo', () => {
  assert.equal(isTempFile('tsconfig.tsbuildinfo'), true);
});

test('isTempFile does not match .mjs sources', () => {
  assert.equal(isTempFile('bilingual-coverage.mjs'), false);
  assert.equal(isTempFile('coverage-dashboard.mjs'), false);
  assert.equal(isTempFile('26-validate-topology-rule-coverage.mjs'), false);
});

// ── isTrackedFile: git-relative path lookup ───────────────────────────────────

test('isTrackedFile returns true for a known tracked path', () => {
  const trackedFiles = new Set([
    '.harness/scripts/bilingual-coverage.mjs',
    '.harness/scripts/coverage-dashboard.mjs',
    '.harness/scripts/ci/26-validate-topology-rule-coverage.mjs',
  ]);
  const root = '/repo';
  assert.equal(
    isTrackedFile('/repo/.harness/scripts/bilingual-coverage.mjs', trackedFiles, root),
    true,
  );
  assert.equal(
    isTrackedFile('/repo/.harness/scripts/coverage-dashboard.mjs', trackedFiles, root),
    true,
  );
  assert.equal(
    isTrackedFile('/repo/.harness/scripts/ci/26-validate-topology-rule-coverage.mjs', trackedFiles, root),
    true,
  );
});

test('isTrackedFile returns false for an untracked path', () => {
  const trackedFiles = new Set(['.harness/scripts/bilingual-coverage.mjs']);
  assert.equal(isTrackedFile('/repo/coverage/lcov.info', trackedFiles, '/repo'), false);
});
