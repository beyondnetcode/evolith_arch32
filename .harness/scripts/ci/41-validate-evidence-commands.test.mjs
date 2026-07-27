#!/usr/bin/env node

/**
 * GT-578 — tests for the validationCommand runner.
 *
 * The point of the negative fixtures: this guard exists because a check that
 * cannot fail is worse than no check. So every test below that asserts a pass
 * has a twin that asserts the guard turns red, and the vacuous-scan cases
 * assert red in REPORT mode too — the mode whose whole job is to exit 0.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { extractCommand, resolveCommand, classifyExecutability } from './41-validate-evidence-commands.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUARD = resolve(__dirname, '41-validate-evidence-commands.mjs');

let fixtureRoot;

function writeEvidence(name, closures) {
  const rel = join('evidence', `${name}.json`);
  writeFileSync(join(fixtureRoot, rel), JSON.stringify({ version: '1.0.0', closures }, null, 2));
  return rel;
}

function runGuard(evidenceRel, extra = []) {
  const res = spawnSync(process.execPath, [GUARD, '--root', fixtureRoot, '--evidence', evidenceRel, ...extra], {
    encoding: 'utf8',
    cwd: fixtureRoot,
    timeout: 60000,
  });
  return { status: res.status, out: `${res.stdout}\n${res.stderr}` };
}

before(() => {
  fixtureRoot = mkdtempSync(join(tmpdir(), 'gt578-evidence-'));
  mkdirSync(join(fixtureRoot, 'evidence'), { recursive: true });
  mkdirSync(join(fixtureRoot, 'scripts'), { recursive: true });
  mkdirSync(join(fixtureRoot, 'pkgs', 'alpha'), { recursive: true });

  writeFileSync(join(fixtureRoot, 'package.json'), JSON.stringify({
    name: 'fixture-root', private: true, workspaces: ['pkgs/*'],
  }));
  writeFileSync(join(fixtureRoot, 'pkgs', 'alpha', 'package.json'), JSON.stringify({
    name: '@fixture/alpha', version: '1.0.0', scripts: { test: 'echo ok' },
  }));
  // A read-only script the runner is allowed to execute.
  writeFileSync(join(fixtureRoot, 'scripts', 'ok.mjs'), 'console.log("fixture ok");\n');
  // A script that exits non-zero: a recorded command that no longer passes.
  writeFileSync(join(fixtureRoot, 'scripts', 'fails.mjs'), 'console.error("nope");\nprocess.exit(3);\n');
  // A script that writes: must be classified out of the execution set.
  writeFileSync(
    join(fixtureRoot, 'scripts', 'writer.mjs'),
    'import { writeFileSync } from "node:fs";\nwriteFileSync("touched.txt", "x");\n',
  );
});

after(() => {
  if (fixtureRoot) rmSync(fixtureRoot, { recursive: true, force: true });
});

// --- Extraction ------------------------------------------------------------

describe('extractCommand', () => {
  test('keeps the command and drops the recorded output after an arrow', () => {
    const cmd = extractCommand("node scripts/ok.mjs --check -> 'Maturity reconciliation matches' (asOf 0d45a08e)");
    assert.equal(cmd.line, 'node scripts/ok.mjs --check');
  });

  test('does NOT split on ` -- `, which is npm argument passthrough', () => {
    const cmd = extractCommand('npm test --workspace apps/core-api -- --testPathPatterns="security-headers"');
    assert.match(cmd.line, /--testPathPatterns/);
  });

  test('classifies prose as prose', () => {
    assert.equal(extractCommand('Criterion 2: the release-please job was replaced by a release-gate job.'), null);
    assert.equal(extractCommand('The audit finding "0 of the 6 required checks is a security check" no longer holds.'), null);
    assert.equal(extractCommand('Recorded honestly: the job still shows red for unrelated reasons.'), null);
  });

  test('lifts a backticked command out of a sentence', () => {
    const cmd = extractCommand('Verified with `node scripts/ok.mjs` on a clean checkout');
    assert.equal(cmd.bin, 'node');
  });

  test('carries the `cd <dir> &&` prefix as a working directory', () => {
    const cmd = extractCommand('cd pkgs/alpha && node ../../scripts/ok.mjs');
    assert.equal(cmd.cwd, 'pkgs/alpha');
    assert.equal(cmd.bin, 'node');
  });

  test('does not shred a quoted alternation into pipeline stages', () => {
    // Regression: a naive split on `|` turned this grep into four bogus stages.
    const cmd = extractCommand("grep -rn 'CircuitBreakerService|createBreaker|opossum' src/apps");
    assert.deepEqual(cmd.stages, []);
    assert.equal(cmd.bin, 'grep');
  });

  test('recognises a real pipeline of filters', () => {
    const cmd = extractCommand('find src -name "*.json" | wc -l');
    assert.deepEqual(cmd.stages, ['wc']);
  });
});

// --- Resolution ------------------------------------------------------------

describe('resolveCommand', () => {
  const ctx = () => ({
    root: fixtureRoot,
    workspaces: {
      byName: new Map([['@fixture/alpha', { dir: 'pkgs/alpha', pkg: { scripts: { test: 'echo ok' } } }]]),
      byPath: new Map([['pkgs/alpha', { dir: 'pkgs/alpha', pkg: { scripts: { test: 'echo ok' } } }]]),
    },
  });

  test('resolves a script that exists', () => {
    const r = resolveCommand(extractCommand('node scripts/ok.mjs'), ctx());
    assert.equal(r.status, 'resolved');
  });

  test('DEAD: a script that does not exist — the GT-146/147/142 shape', () => {
    const r = resolveCommand(extractCommand('node scripts/gone.mjs'), ctx());
    assert.equal(r.status, 'dead');
    assert.match(r.detail, /script not found/);
  });

  test('DEAD: an npm workspace that does not exist', () => {
    const r = resolveCommand(extractCommand('npm test --workspace sdk/cli'), ctx());
    assert.equal(r.status, 'dead');
    assert.match(r.detail, /workspace does not exist/);
  });

  test('DEAD: an npm script the workspace does not declare', () => {
    const r = resolveCommand(extractCommand('npm run nonexistent --workspace @fixture/alpha'), ctx());
    assert.equal(r.status, 'dead');
    assert.match(r.detail, /is not declared/);
  });

  test('resolves an npm script the workspace does declare', () => {
    const r = resolveCommand(extractCommand('npm run test --workspace @fixture/alpha'), ctx());
    assert.equal(r.status, 'resolved');
  });

  test('does not invent a verdict for `node -e`', () => {
    const r = resolveCommand(extractCommand('node -e "process.exit(0)"'), ctx());
    assert.equal(r.status, 'unchecked');
  });
});

// --- Executability ---------------------------------------------------------

describe('classifyExecutability', () => {
  test('a read-only harness script is executable', () => {
    const c = classifyExecutability(extractCommand('node scripts/ok.mjs'), fixtureRoot);
    assert.equal(c.executable, true);
  });

  test('a script whose source writes files is NOT executable', () => {
    const c = classifyExecutability(extractCommand('node scripts/writer.mjs'), fixtureRoot);
    assert.equal(c.executable, false);
    assert.equal(c.bucket, 'writes-to-tree');
  });

  test('`gh api ...` is excluded as needing credentials, not silently dropped', () => {
    const c = classifyExecutability(extractCommand('gh api repos/o/r/branches/main/protection'), fixtureRoot);
    assert.equal(c.bucket, 'network-or-credentials');
  });

  test('an npm script is excluded as a heavy toolchain', () => {
    const c = classifyExecutability(extractCommand('npm run test --workspace @fixture/alpha'), fixtureRoot);
    assert.equal(c.bucket, 'heavy-toolchain');
  });

  test('recursion into the CI runner is refused', () => {
    const c = classifyExecutability(extractCommand('node .harness/scripts/ci-runner.mjs fast'), fixtureRoot);
    assert.equal(c.bucket, 'denylisted');
  });
});

// --- End to end ------------------------------------------------------------

describe('guard process', () => {
  test('report mode: exits 0 and says in words that it is not a pass', () => {
    const rel = writeEvidence('mixed', [{
      id: 'GT-001', closedAt: '2026-01-01', closureCommit: 'abc',
      evidence: [], validationCommands: ['node scripts/ok.mjs', 'node scripts/gone.mjs'],
      dependencyDisposition: 'none',
    }]);
    const { status, out } = runGuard(rel);
    assert.equal(status, 0);
    assert.match(out, /THIS IS NOT A PASS/);
    assert.match(out, /1 DEAD reference/);
  });

  test('strict mode: a dead reference turns it red', () => {
    const rel = writeEvidence('dead', [{
      id: 'GT-002', closedAt: '2026-01-01', closureCommit: 'abc',
      evidence: [], validationCommands: ['node scripts/gone.mjs'],
      dependencyDisposition: 'none',
    }]);
    assert.equal(runGuard(rel, ['--strict']).status, 1);
  });

  test('strict mode: an all-resolving corpus is green', () => {
    const rel = writeEvidence('clean', [{
      id: 'GT-003', closedAt: '2026-01-01', closureCommit: 'abc',
      evidence: [], validationCommands: ['node scripts/ok.mjs -> printed "fixture ok"'],
      dependencyDisposition: 'none',
    }]);
    const { status, out } = runGuard(rel, ['--strict']);
    assert.equal(status, 0, out);
  });

  test('--execute actually runs the command (a recorded command that now fails turns it red)', () => {
    const rel = writeEvidence('failing', [{
      id: 'GT-004', closedAt: '2026-01-01', closureCommit: 'abc',
      evidence: [], validationCommands: ['node scripts/fails.mjs'],
      dependencyDisposition: 'none',
    }]);
    const { status, out } = runGuard(rel, ['--execute', '--strict']);
    assert.equal(status, 1);
    assert.match(out, /exited non-zero/);
    assert.match(out, /exit 3/);
  });

  test('--execute reports the pass when the command really passes', () => {
    const rel = writeEvidence('passing', [{
      id: 'GT-005', closedAt: '2026-01-01', closureCommit: 'abc',
      evidence: [], validationCommands: ['node scripts/ok.mjs'],
      dependencyDisposition: 'none',
    }]);
    const { status, out } = runGuard(rel, ['--execute', '--strict']);
    assert.equal(status, 0, out);
    assert.match(out, /1 exit 0/);
  });

  // --- Anti-vacuous: these MUST be red even in report mode -----------------

  test('vacuous: zero closures is red in REPORT mode', () => {
    const rel = writeEvidence('empty', []);
    const { status, out } = runGuard(rel);
    assert.equal(status, 1);
    assert.match(out, /ZERO closure records scanned/);
  });

  test('vacuous: closures with no command strings is red in REPORT mode', () => {
    const rel = writeEvidence('nocmds', [{
      id: 'GT-006', closedAt: '2026-01-01', closureCommit: 'abc',
      evidence: [], validationCommands: [], dependencyDisposition: 'none',
    }]);
    const { status, out } = runGuard(rel);
    assert.equal(status, 1);
    assert.match(out, /ZERO recorded command strings scanned/);
  });

  test('vacuous: a corpus of pure prose is red in REPORT mode (the extractor proved nothing)', () => {
    const rel = writeEvidence('prose', [{
      id: 'GT-007', closedAt: '2026-01-01', closureCommit: 'abc',
      evidence: [],
      validationCommands: ['The pipeline is green.', 'Criterion 1 was met by inspection.'],
      dependencyDisposition: 'none',
    }]);
    const { status, out } = runGuard(rel);
    assert.equal(status, 1);
    assert.match(out, /ZERO commands extracted/);
  });

  test('vacuous: a missing evidence file is red, not "nothing to check"', () => {
    const { status, out } = runGuard('evidence/does-not-exist.json');
    assert.equal(status, 1);
    assert.match(out, /evidence file not found/);
  });
});
