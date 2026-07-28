#!/usr/bin/env node

/**
 * GT-578, criterion 2, second half — every scanning guard is SEEN failing.
 *
 * WHY THIS EXISTS
 * `42-validate-guard-denominators.mjs` proves every script under
 * `.harness/scripts/ci` is CLASSIFIED: it either calls `assertScanned` or is
 * registered, with a reason, as something that is not a corpus scan. That is a
 * claim about source text. It is not the same claim as "this guard cannot
 * report a pass over an empty corpus", and the difference is not academic:
 *
 *     import { assertScanned } from '../lib/coverage.mjs';
 *     if (existsSync(dir)) {                 // <- an empty tree never enters
 *       assertScanned(walk(dir).length, {...});
 *       ...
 *     }
 *     console.log('✅ all good');            // <- and exits 0
 *
 * 42 reads that file and reports it INSTRUMENTED. It is, and it still passes
 * vacuously. GT-578's second criterion asks for the other half — "each guard
 * has a negative fixture that turns it red" — because a guard nobody has ever
 * observed failing is exactly the artifact this backlog is about.
 *
 * WHAT IT DOES
 * Materialises one deliberately bad fixture and points every scanning guard at
 * it. The fixture is a repo-SHAPED tree that contains no corpus:
 *
 *   <sandbox>/package.json      ┐ the three ROOT_MARKERS, so lib/paths.mjs
 *   <sandbox>/evolith.yaml      │ ascends to the sandbox and not to the real
 *   <sandbox>/.harness/scripts  ┘ repository — this is what makes the fixture
 *                                 possible at all
 *   <sandbox>/node_modules -> the real one (a symlink; module resolution walks
 *                             up directories, so imports still resolve)
 *
 * and nothing else. No `reference/`, no `src/`, no `product/`, no rulesets, no
 * ADRs, no gap board. Every guard is then spawned with its cwd inside that tree
 * and MUST exit non-zero. A guard that exits 0 there has just certified a
 * repository that does not exist.
 *
 * One shared fixture rather than 34 bespoke ones is a deliberate choice: a
 * per-guard fixture is a per-guard maintenance burden, and the 35th guard would
 * arrive without one. This fixture is derived from 42's classification, so a new
 * scanner is exercised the day it lands, with no registration step.
 *
 * WHAT IT DOES NOT PROVE
 * A non-zero exit here means "cannot pass over a tree with nothing in it". It
 * does not prove the guard fails on a PARTIALLY empty corpus — one live root
 * masking a dead one, which is the shape `assertScannedPerSource` exists for.
 * That is a per-guard property and stays per-guard work. This is the coarse
 * floor, and the floor was missing.
 *
 * ANTI-VACUOUS PASS (this guard obeys the rule it enforces)
 * Zero guards discovered, or zero guards actually exercised, is a hard exit 1
 * through the repository's own `assertScanned` — not "all guards fail
 * correctly".
 *
 * A TRAP WORTH KNOWING
 * The sandbox path is `realpathSync`'d. On macOS `os.tmpdir()` returns
 * `/var/folders/...`, a symlink to `/private/var/folders/...`. Node resolves
 * symlinks for `import.meta.url` but not for `process.argv[1]`, so scripts that
 * detect "am I the entry point?" by comparing the two see a mismatch, skip their
 * own `main()` and exit 0 in silence. Building this fixture without the realpath
 * made FIVE guards look like vacuous passes that are in fact fine. A negative
 * fixture that lies in the pessimistic direction is still a lying fixture.
 *
 * Usage:
 *   node .harness/scripts/ci/43-validate-guard-negative-fixtures.mjs
 *   node .harness/scripts/ci/43-validate-guard-negative-fixtures.mjs --verbose
 *   node .harness/scripts/ci/43-validate-guard-negative-fixtures.mjs --only 08
 *   node .harness/scripts/ci/43-validate-guard-negative-fixtures.mjs --timeout 90000
 *   node .harness/scripts/ci/43-validate-guard-negative-fixtures.mjs --keep-sandbox
 *   ... --root <dir>
 *
 * Exit codes:
 *   0 - every exercised guard turned red on the empty fixture
 *   1 - a guard reported a pass over the empty fixture, a guard failed to
 *       terminate, a NO_FIXTURE entry is stale, or the scan itself was vacuous
 */

import { cpSync, existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { assertScanned, ZeroCoverageError } from '../lib/coverage.mjs';
import { scanningGuards } from '../lib/guard-classification.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUARD = '43-validate-guard-negative-fixtures';

// --- CLI ---------------------------------------------------------------------

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
};

const VERBOSE = flag('--verbose');
const KEEP = flag('--keep-sandbox');
const ONLY = opt('--only', null);
const TIMEOUT_MS = Number(opt('--timeout', '60000'));
/**
 * Test-only, mirroring 42's flag of the same name. NO_FIXTURE names files of
 * THIS repository, so on a synthetic `--root` holding two fixture guards every
 * exemption looks stale and the real findings drown. This suppresses ONLY the
 * staleness rule; the vacuity, timeout and zero-scan rules stay fully armed,
 * which is what the fixtures exercise. Deliberately ignored without `--root`.
 */
const PARTIAL_TREE = argv.includes('--partial-tree');
const rootIdx = argv.indexOf('--root');
const ROOT = rootIdx !== -1 ? resolve(process.cwd(), argv[rootIdx + 1]) : resolve(__dirname, '../../..');
const CI_DIR = join(ROOT, '.harness/scripts/ci');
const SCRIPTS_DIR = join(ROOT, '.harness/scripts');

// --- Guards the empty fixture cannot legitimately turn red -------------------

/**
 * Each entry needs a reason that survives review, because "this one is exempt"
 * is the sentence that unwinds the whole mechanism. Two of the three are
 * structural (the fixture cannot be empty for them); the third is a reviewed
 * `allowEmpty` at the call site, which is the escape hatch `lib/coverage.mjs`
 * deliberately provides.
 */
const NO_FIXTURE = [
  {
    file: '43-validate-guard-negative-fixtures.mjs',
    reason:
      'recursion — this guard. Running it inside its own sandbox would build a second sandbox and re-spawn every guard again.',
  },
  {
    file: '42-validate-guard-denominators.mjs',
    reason:
      'its corpus IS the CI scripts, and the sandbox contains them by construction — an empty fixture is impossible for it. Its vacuity is proven instead by its own --root fixture ("a CI directory with zero guards is RED") in 42-validate-guard-denominators.test.mjs.',
  },
  {
    file: '36-validate-agent-memory.mjs',
    reason:
      'reviewed allowEmpty at the call site: the agent-memory corpus is optional, so it prints "This is NOT a pass. Nothing was validated." and exits 0 by design. Forcing it red here would overrule a documented exemption rather than expose a defect.',
  },
];

// --- Fixture -----------------------------------------------------------------

/**
 * A repo-shaped tree carrying the three ROOT_MARKERS and the harness scripts,
 * and no corpus of any kind.
 *
 * @param {string} scriptsDir absolute path of the `.harness/scripts` to copy
 * @returns {string} absolute, symlink-resolved sandbox root
 */
export function buildEmptyFixture(scriptsDir) {
  // realpath FIRST — see "A TRAP WORTH KNOWING" above.
  const base = mkdtempSync(join(realpathSync(tmpdir()), 'gt578-negfix-'));
  const sandbox = realpathSync(base);

  mkdirSync(join(sandbox, '.harness'), { recursive: true });
  cpSync(scriptsDir, join(sandbox, '.harness', 'scripts'), { recursive: true });

  // ROOT_MARKERS from lib/paths.mjs: package.json + .harness + evolith.yaml.
  writeFileSync(
    join(sandbox, 'package.json'),
    `${JSON.stringify(
      {
        name: 'evolith-negative-fixture',
        private: true,
        description: 'Deliberately empty repo-shaped tree. Every guard must refuse to certify it.',
        workspaces: [],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(sandbox, 'evolith.yaml'),
    '# Deliberately empty. A guard that passes against this file is passing against nothing.\nversion: 1\n',
  );

  return sandbox;
}

/**
 * Symlink the caller's `node_modules` into the sandbox so guards can import
 * their dependencies. Best-effort: a repo with no installed dependencies still
 * produces a usable fixture — the guards then die on the import, which is still
 * a non-zero exit and still not a pass.
 */
function linkNodeModules(sandbox, root) {
  const real = join(root, 'node_modules');
  if (!existsSync(real)) return false;
  try {
    symlinkSync(real, join(sandbox, 'node_modules'), 'dir');
    return true;
  } catch {
    return false;
  }
}

// --- Runner ------------------------------------------------------------------

/**
 * @returns {{ rel: string, status: number|null, timedOut: boolean, ms: number, tail: string }}
 */
function exercise(sandbox, rel) {
  const started = Date.now();
  const res = spawnSync(process.execPath, [join(sandbox, '.harness/scripts/ci', rel)], {
    cwd: sandbox,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    env: { ...process.env, NO_COLOR: '1', CI: process.env.CI ?? '1' },
  });
  const timedOut = res.error?.code === 'ETIMEDOUT' || res.signal === 'SIGTERM';
  const out = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim();
  return {
    rel,
    status: res.status,
    timedOut,
    ms: Date.now() - started,
    tail: out.split('\n').filter(Boolean).slice(-2).join(' | ').slice(0, 240),
  };
}

// --- Main --------------------------------------------------------------------

function main() {
  if (!existsSync(CI_DIR) || !statSync(CI_DIR).isDirectory()) {
    console.error(
      `✗ ${GUARD}: scan root does not exist: .harness/scripts/ci\n` +
      `  Refusing to report "every guard has a negative fixture" over a directory\n` +
      `  that is not there.`,
    );
    process.exit(1);
  }

  const scanners = scanningGuards(CI_DIR);
  assertScanned(scanners.length, {
    what: 'scanning CI guards to exercise',
    where: '.harness/scripts/ci/**/*.mjs (INSTRUMENTED + SELF_GUARDED per lib/guard-classification.mjs)',
  });

  const exemptById = new Map(NO_FIXTURE.map((e) => [e.file, e]));
  const violations = [];

  // A stale exemption is worse than no exemption: it reads as reviewed.
  const known = new Set(scanners);
  for (const entry of NO_FIXTURE) {
    if (PARTIAL_TREE && rootIdx !== -1) break;
    if (!known.has(entry.file)) {
      violations.push(
        `${entry.file}: listed in NO_FIXTURE but it is not a scanning guard under\n` +
        `      .harness/scripts/ci (it was removed, renamed, or reclassified). Delete the\n` +
        `      entry so the remaining exemptions keep meaning something.`,
      );
    }
  }

  const selected = scanners.filter((rel) => !exemptById.has(rel) && (!ONLY || rel.includes(ONLY)));
  if (ONLY && selected.length === 0) {
    console.error(`✗ ${GUARD}: --only ${ONLY} matched no scanning guard.`);
    process.exit(1);
  }

  const sandbox = buildEmptyFixture(SCRIPTS_DIR);
  if (sandbox === ROOT || sandbox.startsWith(`${ROOT}/`)) {
    // Paranoia, and cheap: a sandbox inside the repository would let a guard
    // that writes do so against the working tree.
    console.error(`✗ ${GUARD}: refusing to run — the fixture resolved inside the repository (${sandbox}).`);
    process.exit(1);
  }
  const linked = linkNodeModules(sandbox, ROOT);

  console.log(`${GUARD} — every scanning guard, pointed at a repo-shaped tree with no corpus`);
  console.log(`  fixture ............ ${sandbox}${linked ? ' (node_modules symlinked)' : ' (no node_modules to link)'}`);
  console.log(`  scanning guards .... ${scanners.length} (per lib/guard-classification.mjs)`);
  console.log(`  exempt ............. ${NO_FIXTURE.length} (NO_FIXTURE, each with a reason)`);
  console.log(`  exercised .......... ${selected.length}`);
  console.log('');

  const results = [];
  try {
    for (const rel of selected) results.push(exercise(sandbox, rel));
  } finally {
    if (KEEP) console.log(`\n  (--keep-sandbox: fixture left at ${sandbox})`);
    else rmSync(sandbox, { recursive: true, force: true });
  }

  assertScanned(results.length, {
    what: 'guards actually exercised against the empty fixture',
    where: 'spawned subprocesses',
  });

  const vacuous = results.filter((r) => r.status === 0);
  const hung = results.filter((r) => r.timedOut);
  const red = results.filter((r) => r.status !== 0 && !r.timedOut);

  if (VERBOSE) {
    for (const r of results.slice().sort((a, b) => a.rel.localeCompare(b.rel))) {
      const verdict = r.timedOut ? 'HUNG' : r.status === 0 ? 'PASSED(!)' : `red(${r.status})`;
      console.log(`    ${verdict.padEnd(10)} ${String(r.ms).padStart(6)}ms  ${r.rel}`);
      if (r.tail && r.status !== 0) console.log(`               ↳ ${r.tail}`);
    }
    console.log('');
  }

  for (const r of vacuous) {
    violations.push(
      `${r.rel}: exited 0 against a repository containing NO corpus at all.\n` +
      `      It just certified a tree with no rulesets, no ADRs, no gap board and no\n` +
      `      source. Whatever it reports in CI, it did not earn it here. Either move its\n` +
      `      assertScanned() out from behind the existsSync branch an empty tree never\n` +
      `      enters, or — if an empty corpus is genuinely valid for it — register it in\n` +
      `      NO_FIXTURE with the reason, and pass { allowEmpty, reason } at the call site.\n` +
      `      Reproduce with: node .harness/scripts/ci/${GUARD}.mjs --only ${r.rel} --verbose --keep-sandbox`,
    );
  }
  for (const r of hung) {
    violations.push(
      `${r.rel}: did not terminate within ${TIMEOUT_MS}ms against the empty fixture.\n` +
      `      A guard that hangs instead of failing gives CI a timeout, not a verdict, and\n` +
      `      the negative fixture cannot establish that it is able to fail at all.`,
    );
  }

  console.log(`  turned RED ......... ${red.length}/${results.length}`);
  console.log(`  reported a PASS .... ${vacuous.length}`);
  console.log(`  did not terminate .. ${hung.length}`);

  if (violations.length > 0) {
    console.error('');
    console.error(`✗ ${GUARD}: ${violations.length} finding(s):\n`);
    for (const v of violations) console.error(`  • ${v}\n`);
    process.exit(1);
  }

  console.log('');
  console.log(
    `✓ All ${results.length} exercised guard(s) refused the empty fixture. ` +
    `Each has now been OBSERVED failing, not merely declared able to.`,
  );
  process.exit(0);
}

try {
  main();
} catch (error) {
  if (error instanceof ZeroCoverageError) {
    console.error(`\n✗ ${GUARD}: ${error.message}`);
    process.exit(1);
  }
  console.error(`\n✗ ${GUARD} crashed: ${error?.stack || error}`);
  process.exit(1);
}
