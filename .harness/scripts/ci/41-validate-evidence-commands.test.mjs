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

  // `scripts` must be PRESENT and must not contain the names under test. The
  // undeclared-script branch is guarded by `pkg?.scripts`, so a root with no
  // scripts block skips it entirely — and every assertion about an undeclared
  // root script would pass without exercising anything.
  writeFileSync(join(fixtureRoot, 'package.json'), JSON.stringify({
    name: 'fixture-root', private: true, workspaces: ['pkgs/*'],
    scripts: { lint: 'echo lint' },
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

  test('drops a trailing parenthetical annotation instead of tokenizing it as arguments', () => {
    // 48 records carry the author's expected RESULT in a trailing parenthesis.
    // Tokenizing it turned `Exchange/Queue/Binding` into a path-shaped operand
    // that does not exist, and the record was reported DEAD — the guard
    // fabricating a finding inside a report that is nothing but a count of them.
    const cmd = extractCommand("grep -L 'kind: Exchange' scripts/ok.mjs (no Exchange/Queue/Binding CRDs remain)");
    assert.equal(cmd.line, "grep -L 'kind: Exchange' scripts/ok.mjs");
    assert.ok(!cmd.tokens.includes('Exchange/Queue/Binding'), cmd.tokens.join(' '));
  });

  test('stripping the annotation never eats the command itself', () => {
    // Degenerate shapes must not reduce the command to nothing: a record that
    // parses to an empty line would be counted as prose and disappear from the
    // denominator, which is the failure mode this guard exists to prevent.
    assert.equal(extractCommand('node scripts/ok.mjs (a) (b)').line, 'node scripts/ok.mjs');
    assert.equal(extractCommand('node scripts/ok.mjs').line, 'node scripts/ok.mjs');
    assert.equal(extractCommand('(only an annotation)'), null);
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

  // --- GT-598 follow-on: two parser defects that BLAMED THE EVIDENCE ---------
  //
  // Both produced a `dead` verdict for a command that runs perfectly well, which
  // is the worst way for this guard to be wrong: it reads as stale evidence and
  // invites someone to "repair" a record that was already correct.

  test('the script name is not the value of --workspace (flag order must not matter)', () => {
    // `npm run --workspace <path> <script>` is valid npm. The parser used to take
    // the first non-dash token after `run`, which is the flag's VALUE, and then
    // report that the script "pkgs/alpha" is not declared.
    const r = resolveCommand(extractCommand('npm run --workspace pkgs/alpha test'), ctx());
    assert.equal(r.status, 'resolved', r.detail);
    assert.match(r.detail, /script test/);
  });

  test('…and the same when the flag precedes the subcommand entirely', () => {
    const r = resolveCommand(extractCommand('npm --workspace pkgs/alpha run test'), ctx());
    assert.equal(r.status, 'resolved', r.detail);
    assert.match(r.detail, /script test/);
  });

  test('a genuinely undeclared script is STILL dead when the flag comes first', () => {
    // The fix must not turn the check off: same shape, script that does not exist.
    const r = resolveCommand(extractCommand('npm run --workspace pkgs/alpha nonexistent'), ctx());
    assert.equal(r.status, 'dead');
    assert.match(r.detail, /"nonexistent" is not declared/);
  });

  test('`pnpm info <pkg>` is a registry query, not an undeclared script', () => {
    // Was reported as: npm script "info" is not declared in <root>/package.json.
    const r = resolveCommand(extractCommand('pnpm info @beyondnet/evolith-cli'), ctx());
    assert.notEqual(r.status, 'dead');
  });

  test('`yarn info <pkg>` likewise', () => {
    const r = resolveCommand(extractCommand('yarn info @beyondnet/evolith-cli'), ctx());
    assert.notEqual(r.status, 'dead');
  });

  test('a built-in subcommand does not mask a real workspace error', () => {
    // `info` stops being read as a script name; it must NOT stop the workspace
    // itself from being checked.
    const r = resolveCommand(extractCommand('pnpm info --workspace pkgs/gone'), ctx());
    assert.equal(r.status, 'dead');
    assert.match(r.detail, /workspace does not exist/);
  });

  test('does not invent a verdict for `node -e`', () => {
    const r = resolveCommand(extractCommand('node -e "process.exit(0)"'), ctx());
    assert.equal(r.status, 'unchecked');
  });

  test('a quoted grep PATTERN containing a slash is not resolved as a path', () => {
    // `grep -L 'control-center/gap-tracking' scripts/*.mjs` was reported DEAD
    // because the search pattern looks exactly like a repo path that moved. The
    // target (scripts/ok.mjs) exists, so the only correct verdict is `resolved`.
    const r = resolveCommand(
      extractCommand("grep -L 'control-center/gap-tracking' scripts/ok.mjs"),
      ctx(),
    );
    assert.equal(r.status, 'resolved', r.detail);
    assert.equal(r.detail, 'scripts/ok.mjs');
  });

  test('an UNQUOTED grep pattern is still not treated as the target', () => {
    const r = resolveCommand(extractCommand('grep some/pattern scripts/ok.mjs'), ctx());
    assert.equal(r.status, 'resolved', r.detail);
  });

  test('the value of `-e` / `--include` / `-name` is not resolved as a path', () => {
    assert.equal(resolveCommand(extractCommand('grep -e a/b scripts/ok.mjs'), ctx()).status, 'resolved');
    // `-name` takes a GLOB, not a path. Before the fix this resolved
    // `gone/x.json` against disk and reported the record dead.
    assert.equal(
      resolveCommand(extractCommand('find scripts/ -name gone/x.json'), ctx()).status,
      'resolved',
    );
  });

  test('resolves `npm run --workspace <path> <script>` — the flag BEFORE the script name', () => {
    // GT-633 follow-on: `npm run --workspace @fixture/alpha test` is a valid
    // invocation the corpus uses throughout. Before the fix, the workspace's own
    // VALUE token (`@fixture/alpha`, which does not start with `-`) was mistaken
    // for the script name, and reported dead as
    // `npm script "@fixture/alpha" is not declared in pkgs/alpha/package.json`.
    const r = resolveCommand(extractCommand('npm run --workspace @fixture/alpha test'), ctx());
    assert.equal(r.status, 'resolved', r.detail);
  });

  test('DEAD: `npm run --workspace <path> <script>` still catches a script the workspace does not declare', () => {
    const r = resolveCommand(extractCommand('npm run --workspace @fixture/alpha nonexistent'), ctx());
    assert.equal(r.status, 'dead');
    assert.match(r.detail, /is not declared/);
  });

  test('a gitignored, CI-downloaded binary is `unchecked`, not `dead`', () => {
    // `.harness/bin/opa` is real and correct but gitignored: a separate CI step
    // downloads it, and this guard runs right after `npm ci` with nothing else.
    // Reporting it dead would penalize a correct record for an environment fact,
    // same finding as GT-632 on guard 47 — but here the guard genuinely cannot
    // confirm the leaf exists, so the honest verdict is `unchecked`, not `resolved`.
    const r = resolveCommand(extractCommand('.harness/bin/opa eval -d rulesets/'), ctx());
    assert.equal(r.status, 'unchecked', r.detail);
    assert.match(r.detail, /gitignored artifact/);
  });

  test('a gitignored build script (`dist/`) is `unchecked`, not `dead`', () => {
    const r = resolveCommand(extractCommand('node dist/main.js validate'), ctx());
    assert.equal(r.status, 'unchecked', r.detail);
    assert.match(r.detail, /gitignored artifact/);
  });

  test('a binary that is merely absent (not gitignored) is STILL dead — the fix must not blind it', () => {
    const r = resolveCommand(extractCommand('scripts/gone.sh --check'), ctx());
    assert.equal(r.status, 'dead');
    assert.match(r.detail, /binary not found/);
  });

  test('a genuinely missing grep target is STILL dead — the fix must not blind it', () => {
    const r = resolveCommand(extractCommand("grep -L 'a/b' scripts/gone.mjs"), ctx());
    assert.equal(r.status, 'dead');
    assert.match(r.detail, /scripts\/gone\.mjs/);
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

  test('the maturity unit suite is excluded; the canonical guard command stays executable', () => {
    const suite = classifyExecutability(extractCommand('node --test .harness/scripts/reconcile-maturity.test.mjs'), fixtureRoot);
    assert.equal(suite.bucket, 'denylisted');
    assert.match(suite.reason, /canonical guard/);

    const guard = classifyExecutability(extractCommand('node .harness/scripts/ci/09-reconcile-maturity.mjs --check'), fixtureRoot);
    assert.equal(guard.executable, true);
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

  test('the ratchet basis separates the machine-dependent part of the dead count', () => {
    // A ratchet set from `dead` is a ratchet set from what this machine happens
    // to have built. `deadOnCleanCheckout` adds back the references that resolve
    // ONLY through generated state, so the same number comes out of a developer
    // laptop and a fresh runner. The 305-vs-290 discrepancy that made the wired
    // budget unexplainable is exactly this quantity.
    mkdirSync(join(fixtureRoot, 'pkgs', 'alpha', 'dist'), { recursive: true });
    writeFileSync(join(fixtureRoot, 'pkgs', 'alpha', 'dist', 'main.js'), 'console.log(1);\n');
    const rel = writeEvidence('ratchet', [
      {
        id: 'GT-1', status: 'DONE',
        validationCommands: [
          'node pkgs/alpha/dist/main.js',   // resolves only because dist/ exists
          'node scripts/ok.mjs',            // resolves on any checkout
          'node scripts/gone.mjs',          // dead everywhere
        ],
      },
    ]);
    const { status, out } = runGuard(rel, ['--json']);
    assert.equal(status, 0, out);
    const j = JSON.parse(out.slice(out.indexOf('{')));
    assert.equal(j.summary.ratchet.dead, 1);
    assert.equal(j.summary.ratchet.environmentSensitive, 1);
    assert.equal(j.summary.ratchet.deadOnCleanCheckout, 2);
  });
});
