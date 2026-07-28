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

import { existsSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertScanned, ZeroCoverageError } from '../lib/coverage.mjs';
// GT-578 wave 4: the registries moved to lib/ so `43-validate-guard-negative-fixtures.mjs`
// classifies from the SAME source. Two copies of "which scripts are scanners"
// would drift, and the two guards would then disagree about their own subject.
import {
  SELF_GUARDED,
  NOT_A_SCANNER,
  PENDING,
  REGISTRIES,
  classifyGuards,
} from '../lib/guard-classification.mjs';

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

// --- Classification (shared with 43-validate-guard-negative-fixtures) -------

function main() {
  if (!existsSync(CI_DIR) || !statSync(CI_DIR).isDirectory()) {
    console.error(
      `✗ ${GUARD}: scan root does not exist: .harness/scripts/ci\n` +
      `  Refusing to report "every guard publishes a denominator" over a directory\n` +
      `  that is not there.`,
    );
    process.exit(1);
  }

  const { guards, instrumented, selfGuarded, notScanners, pending, violations } =
    classifyGuards(CI_DIR);
  assertScanned(guards.length, { what: 'CI guard scripts', where: '.harness/scripts/ci/**/*.mjs' });

  const selfById = new Map(SELF_GUARDED.map(e => [e.file, e]));
  const notScannerById = new Map(NOT_A_SCANNER.map(e => [e.file, e]));
  const pendingById = new Map(PENDING.map(e => [e.file, e]));

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
