#!/usr/bin/env node

/**
 * GT-578 — the anti-vacuous-pass pattern, enforced instead of copy-pasted.
 *
 * WHY THIS EXISTS
 * `.harness/scripts/lib/coverage.mjs` (GT-557) already states the rule: a guard
 * that scanned zero items did not run, and must not contribute a green tick.
 * The primitive existed; the discipline did not. At the 2026-07-26 audit the
 * rule was applied to 13 of ~46 guards, and the other 33 were free to glob a
 * directory that had moved, iterate nothing, and print their success line.
 *
 * Sweeping those 33 by hand fixes today. It does not fix tomorrow: the 34th
 * guard someone adds next month starts unprotected, and nothing notices. So the
 * sweep needs a keeper, and this is it. Every executable script under
 * `.harness/scripts/ci` must be in exactly one of four states, and a script in
 * none of them fails this guard:
 *
 *   INSTRUMENTED  imports `../lib/coverage.mjs` and calls assertScanned /
 *                 assertScannedPerSource / scanned. Detected from the source,
 *                 not from a list, so it cannot go stale.
 *   SELF_GUARDED  carries its own zero-scan refusal, predating the primitive.
 *                 Registered WITH A PROOF REGEX that must still match: delete
 *                 the hand-rolled check and this guard goes red.
 *   NOT_A_SCANNER not a corpus scan at all — a delegating wrapper, a generator,
 *                 a library with no entry point. Registered with a reason.
 *   PENDING       a real scanner that is not instrumented yet. Registered with
 *                 a reason and counted out loud on every run. This list is the
 *                 honest remainder, and `--strict-pending` makes it fatal once
 *                 it is empty.
 *
 * The registries are checked in both directions: an entry naming a file that no
 * longer exists is a violation too. A registry that can rot is a registry that
 * will.
 *
 * ANTI-VACUOUS PASS (this guard obeys the rule it enforces)
 * It asserts its own denominator through the same `assertScanned`: zero guard
 * files discovered is a hard failure, not "all guards compliant".
 *
 * Usage:
 *   node .harness/scripts/ci/42-validate-guard-denominators.mjs
 *   node .harness/scripts/ci/42-validate-guard-denominators.mjs --verbose
 *   node .harness/scripts/ci/42-validate-guard-denominators.mjs --strict-pending
 *   node .harness/scripts/ci/42-validate-guard-denominators.mjs --root <dir>
 *
 * Exit codes:
 *   0 - every guard is classified; PENDING entries are reported, not fatal
 *   1 - an unclassified guard, a stale registry entry, a SELF_GUARDED proof that
 *       no longer matches, a zero-guard scan, or (with --strict-pending) any
 *       remaining PENDING entry
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertScanned, ZeroCoverageError } from '../lib/coverage.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUARD = '42-validate-guard-denominators';

const argv = process.argv.slice(2);
const VERBOSE = argv.includes('--verbose');
const STRICT_PENDING = argv.includes('--strict-pending');
/**
 * Test-only. The registries name files of THIS repository, so on a synthetic
 * `--root` holding two fixture guards every entry looks stale and the real
 * findings drown. `--partial-tree` suppresses only the staleness rule; the
 * classification, proof and vacuity rules stay fully armed, which is what the
 * fixtures exercise. It is deliberately not honoured without `--root`.
 */
const PARTIAL_TREE = argv.includes('--partial-tree');
const rootIdx = argv.indexOf('--root');
const ROOT = rootIdx !== -1 ? resolve(process.cwd(), argv[rootIdx + 1]) : resolve(__dirname, '../../..');
const CI_DIR = join(ROOT, '.harness/scripts/ci');

// --- Detection of the instrumented state -----------------------------------

const IMPORTS_COVERAGE = /from\s+['"](?:\.\.\/)+lib\/coverage\.mjs['"]/;
const CALLS_COVERAGE = /\b(?:assertScanned|assertScannedPerSource|scanned)\s*\(/;

// --- Registries ------------------------------------------------------------

/**
 * Guards whose zero-scan refusal is hand-written and predates the primitive.
 * `proof` MUST still match the file: it is what stops a "cleanup" commit from
 * deleting the check and leaving the exemption behind.
 */
const SELF_GUARDED = [
  {
    file: '34-boundary-guard-repository.mjs',
    proof: /A zero-file scan must never be reported as "boundary guard passed"/,
    reason: 'the reference implementation of the pattern (GT-377); refuses both a missing root and an empty scan',
  },
  {
    file: '40-validate-path-literals.mjs',
    proof: /A zero-file scan must never be reported as "path literals valid"/,
    reason: 'GT-578 path-literal guard; fails on a missing scan root, a zero-file source and a zero-literal source',
  },
  {
    file: '35-validate-core-health.mjs',
    proof: /A zero-rule scan must never be reported as a parity result -- that is a vacuous pass/,
    reason: 'refuses to report native/OPA parity when either rule corpus is empty',
  },
  {
    file: '28-native-evaluator-parity.mjs',
    proof: /vacuous pass/,
    reason: 'six distinct vacuity checks (empty directory, empty fixture, zero test cases, zero verdicts, zero rules, unwired evaluator)',
  },
  {
    file: '24-check-surface-parity.mjs',
    proof: /No CLI operations tracked in matrix/,
    reason: 'errors when any of the three surfaces yields zero tracked operations',
  },
  {
    file: '17-validate-knowledge-intake.mjs',
    proof: /No accepted topology manifests found under/,
    reason: 'errors when the manifest scan yields no accepted topology',
  },
  {
    file: '18-validate-knowledge-parity.mjs',
    proof: /contains no JSON fixtures/,
    reason: 'errors on a missing fixture directory and on a directory with zero fixtures; exported for tests, so it returns errors rather than throwing',
  },
];

/**
 * Not a corpus scan. Each entry states why, because "not a scanner" is exactly
 * the claim a future reader will need to re-check.
 */
const NOT_A_SCANNER = [
  { file: '04-check-bilingual-parity.mjs', reason: 'delegating wrapper: execSync of suites/bilingual-suite.mjs, propagates its exit code; the denominator is the suite\'s' },
  { file: '05-validate-executive-summary.mjs', reason: 'delegating wrapper: spawnSync of generate-executive-summary.mjs --check, `?? 1` on a failed spawn' },
  { file: '26-validate-topology-rule-coverage.mjs', reason: 'delegating wrapper: imports validateTopologyRuleCoverage() from ../generate-rule-coverage.mjs' },
  { file: '37-validate-knowledge-freshness.mjs', reason: 'delegating wrapper: spawnSync of knowledge-resolve.mjs --freshness, `?? 1` on a failed spawn' },
  { file: '38-validate-okf-projection.mjs', reason: 'delegating wrapper: spawnSync of knowledge-okf-project.mjs --verify, `?? 1` on a failed spawn' },

  { file: '02-optimize-repo.mjs', reason: 'maintenance task that rewrites files; not a gate, produces no verdict' },
  { file: '06-impact-analysis-synchronizer.mjs', reason: 'generator: writes the impact-analysis artifacts consumed by other guards' },
  { file: '14-rag-index-sync.mjs', reason: 'RAG index writer against pgvector; a data pipeline, not a repository gate' },
  { file: '15-rag-index-backfill.mjs', reason: 'RAG backfill writer against pgvector; a data pipeline, not a repository gate' },

  { file: 'parity-gate.mjs', reason: 'library: exports parityReport()/contentVersion(), no entry point' },
  { file: 'opa-eval.mjs', reason: 'library: thin OPA eval helper, no entry point' },
  { file: 'drift-audit.mjs', reason: 'library: exports auditDrift()/summarize(); its callers own the denominator' },
  { file: 'rag-port.mjs', reason: 'library: RAG port interface' },
  { file: 'rag-pgvector.mjs', reason: 'library: pgvector adapter' },
  { file: 'rag-embed-qwen3.mjs', reason: 'library: embedding adapter, needs a model endpoint' },
  { file: 'rag-sync.mjs', reason: 'library: RAG sync driver behind 14/15' },
  { file: 'agentic/review-input.mjs', reason: 'library: builds the review payload' },
  { file: 'agentic/review-provider.mjs', reason: 'library: LLM provider adapter' },
  { file: 'agentic/review-result.mjs', reason: 'library: parses the model response' },
  { file: 'agentic/13-agentic-code-review.mjs', reason: 'LLM-driven review over a git diff; its corpus is the diff, which is legitimately empty on a no-op commit' },
];

/**
 * Real scanners still to instrument. This is the honest remainder of GT-578's
 * second criterion — not a hiding place. Each entry says why it was not done in
 * the same change.
 */
const REGISTRIES = [];

const PENDING = [
  // Empty as of GT-578's second wave: every scanning guard under
  // .harness/scripts/ci is now either instrumented or self-guarded with a
  // verified proof. Kept as a named, first-class state rather than deleted —
  // the next guard that cannot be instrumented in the same change belongs here
  // WITH A REASON, not in NOT_A_SCANNER, and not silently unclassified.
];

REGISTRIES.push(['SELF_GUARDED', SELF_GUARDED], ['NOT_A_SCANNER', NOT_A_SCANNER], ['PENDING', PENDING]);

// --- Scan ------------------------------------------------------------------

function collectGuards(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '.git') continue;
        walk(p);
        continue;
      }
      if (!e.name.endsWith('.mjs')) continue;
      if (e.name.endsWith('.test.mjs')) continue;
      out.push(relative(dir, p).split(sep).join('/'));
    }
  };
  walk(dir);
  return out;
}

function main() {
  if (!existsSync(CI_DIR) || !statSync(CI_DIR).isDirectory()) {
    console.error(
      `✗ ${GUARD}: scan root does not exist: .harness/scripts/ci\n` +
      `  Refusing to report "every guard publishes a denominator" over a directory\n` +
      `  that is not there.`,
    );
    process.exit(1);
  }

  const guards = collectGuards(CI_DIR);
  assertScanned(guards.length, { what: 'CI guard scripts', where: '.harness/scripts/ci/**/*.mjs' });

  const selfById = new Map(SELF_GUARDED.map(e => [e.file, e]));
  const notScannerById = new Map(NOT_A_SCANNER.map(e => [e.file, e]));
  const pendingById = new Map(PENDING.map(e => [e.file, e]));

  const instrumented = [];
  const selfGuarded = [];
  const notScanners = [];
  const pending = [];
  const violations = [];

  for (const rel of guards) {
    const src = readFileSync(join(CI_DIR, rel), 'utf8');

    if (IMPORTS_COVERAGE.test(src) && CALLS_COVERAGE.test(src)) {
      instrumented.push(rel);
      continue;
    }

    const self = selfById.get(rel);
    if (self) {
      if (!self.proof.test(src)) {
        violations.push(
          `${rel}: registered SELF_GUARDED, but its proof no longer appears in the source.\n` +
          `      expected to match: ${self.proof}\n` +
          `      Either the hand-written zero-scan refusal was removed — in which case the\n` +
          `      guard can now pass vacuously and must be instrumented with\n` +
          `      lib/coverage.mjs — or the wording changed and the proof needs updating here.`,
        );
      } else {
        selfGuarded.push(rel);
      }
      continue;
    }

    if (notScannerById.has(rel)) { notScanners.push(rel); continue; }
    if (pendingById.has(rel)) { pending.push(rel); continue; }

    violations.push(
      `${rel}: no denominator and no classification.\n` +
      `      Every script under .harness/scripts/ci must either call assertScanned()\n` +
      `      from ../lib/coverage.mjs, or be registered in this file as SELF_GUARDED\n` +
      `      (with a proof regex), NOT_A_SCANNER (with a reason) or PENDING (with a\n` +
      `      reason). An unclassified guard is one that can report a pass over an\n` +
      `      empty scan, which is the defect GT-578 exists to close.`,
    );
  }

  const known = new Set(guards);
  // ...nor survive the thing they excused. An entry for a guard that is now
  // instrumented reads, to the next reviewer, like a reviewed exemption.
  const instrumentedSet = new Set(instrumented);
  for (const [label, registry] of REGISTRIES) {
    for (const entry of registry) {
      if (instrumentedSet.has(entry.file)) {
        violations.push(
          `${entry.file}: listed in ${label}, but the file now calls assertScanned() itself.\n` +
          `      The exemption is obsolete and should be deleted, so the registry keeps\n` +
          `      naming only the guards that genuinely need it.`,
        );
      }
    }
  }
  // Registries must not outlive their files.
  for (const [label, registry] of REGISTRIES) {
    if (PARTIAL_TREE && rootIdx !== -1) break;
    for (const entry of registry) {
      if (!known.has(entry.file)) {
        violations.push(
          `${entry.file}: listed in ${label} but no such script exists under .harness/scripts/ci.\n` +
          `      A registry entry for a file that is gone is dead weight that makes the\n` +
          `      remaining entries look reviewed when they are not. Remove it.`,
        );
      }
    }
  }

  // --- Report --------------------------------------------------------------

  const total = guards.length;
  const covered = instrumented.length + selfGuarded.length;
  console.log(`${GUARD} — anti-vacuous-pass coverage across .harness/scripts/ci`);
  console.log(`  guards scanned ..... ${total}`);
  console.log(`  instrumented ....... ${instrumented.length} (assertScanned via lib/coverage.mjs)`);
  console.log(`  self-guarded ....... ${selfGuarded.length} (hand-written refusal, proof verified)`);
  console.log(`  not a scanner ...... ${notScanners.length} (wrapper / generator / library, each with a reason)`);
  console.log(`  PENDING ............ ${pending.length} (real scanners still unprotected)`);
  console.log(
    `  => ${covered}/${total - notScanners.length} scanning guard(s) refuse a zero-element scan ` +
    `(${total} total, ${notScanners.length} not scanners)`,
  );

  if (VERBOSE) {
    const list = (label, xs, fmt = x => x) => {
      if (xs.length === 0) return;
      console.log(`\n  ${label}:`);
      for (const x of xs) console.log(`    • ${fmt(x)}`);
    };
    list('instrumented', instrumented);
    list('self-guarded', selfGuarded, r => `${r} — ${selfById.get(r).reason}`);
    list('not a scanner', notScanners, r => `${r} — ${notScannerById.get(r).reason}`);
  }

  if (pending.length > 0) {
    console.log('');
    console.log(`  ${pending.length} guard(s) still PENDING instrumentation:`);
    for (const rel of pending) console.log(`    • ${rel} — ${pendingById.get(rel).reason}`);
    console.log('    Each can still report a pass over an empty scan. Run with --strict-pending');
    console.log('    once the list is empty to make any regression fatal.');
  }

  if (violations.length > 0) {
    console.error('');
    console.error(`✗ ${GUARD}: ${violations.length} guard(s) can pass vacuously or are misregistered:\n`);
    for (const v of violations) console.error(`  • ${v}\n`);
    process.exit(1);
  }

  if (STRICT_PENDING && pending.length > 0) {
    console.error('');
    console.error(`✗ ${GUARD}: --strict-pending and ${pending.length} guard(s) remain uninstrumented.`);
    process.exit(1);
  }

  console.log('');
  console.log(`✓ Every one of the ${total} CI guard(s) is classified; none is silently unprotected.`);
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
