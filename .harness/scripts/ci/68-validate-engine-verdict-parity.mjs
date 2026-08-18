#!/usr/bin/env node

/**
 * GT-704 — the two engines are allowed to disagree about COVERAGE. They are not
 * allowed to disagree about FACTS, and until this guard nothing measured whether
 * they did.
 *
 * ## What was missing
 *
 * `27-opa-parity-gate.mjs` (GT-149/GT-675) executes the compiled bundle and fails
 * if it cannot state its own scope. `28-native-evaluator-parity.mjs` (GT-229)
 * proves every parity FIXTURE is genuinely exercised. Neither runs both engines
 * over the corpus and compares what they concluded — so a `.rego` edited into
 * contradiction with its native handler produced no signal at all. GT-675's AC7
 * asked for this sweep and deliberately did not ship it; this is that sweep.
 *
 * ## The comparison, stated precisely
 *
 * Each engine is run once over the whole corpus (`evolith validate --engine <e>
 * --format json`) and every rule id is placed in exactly one outcome:
 *
 *   not-applicable / non-executable / skipped / errored   the engine did NOT decide
 *   failed                                                decided, and it says no
 *   passed                                                decided, and it says yes
 *
 * Precedence matters and is deliberate: a rule listed as skipped that ALSO carries
 * an issue is `skipped`, not `failed`. Those issues are the "blocking rule did not
 * run" complaints the reporter raises ABOUT the skip — reading them as verdicts
 * would turn a coverage difference into a fake conflict, and 144 of them exist on
 * this corpus today.
 *
 * Only rules BOTH engines decided are compared. A rule decided by one and skipped
 * by the other is complementary coverage, which `ADR-0041` never promised parity of
 * and GT-675 measured as legitimate (65 one way, 17 the other).
 *
 * ## Why it reuses `diffDecisions`
 *
 * The jointly-decided failures of each engine are handed to `parity-gate.mjs`'s
 * `diffDecisions` as decision lists. Its `rule-id` drift — "fired here, not there"
 * — IS the verdict conflict, and its severity/evidence axes come along for free.
 * A third comparison written here would be a fork of the one the fixtures use.
 *
 * `diffCoverage` is deliberately NOT called: its input is a set of rule ids DECLARED
 * decidable by an artifact, which only the compiled bundle can answer, and
 * `27-opa-parity-gate.mjs` already asks it there. Calling it here with "the ids this
 * run happened to decide" would compare a set against itself and always return
 * clean — an ornament shaped like a check.
 *
 * ## The baseline is a ratchet in both directions
 *
 * Today's conflicts are registered one by one, each with its own measured reason —
 * a shared justification for all of them would be exactly the bulk dismissal this
 * row refused. The guard fails when a conflict is NOT in the baseline (a new
 * divergence) and equally when a baselined id no longer conflicts (a stale
 * exemption, which is how a baseline rots into permission).
 *
 * ## Anti-vacuous pass
 *
 * Both engine runs are asserted through `assertScannedPerSource`, so an engine that
 * returned nothing — a missing dist, an unbuilt bundle, a corpus that moved — fails
 * loudly instead of reporting "no conflicts".
 *
 * Usage:
 *   node .harness/scripts/ci/68-validate-engine-verdict-parity.mjs
 *   node .harness/scripts/ci/68-validate-engine-verdict-parity.mjs --verbose
 *   node .harness/scripts/ci/68-validate-engine-verdict-parity.mjs --json
 *
 * Exit codes:
 *   0 - every jointly-decided rule agrees, or disagrees exactly as baselined
 *   1 - a new conflict, a stale baseline entry, or an engine that produced nothing
 */

import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { REPO_ROOT } from '../lib/paths.mjs';
import { assertScannedPerSource, ZeroCoverageError } from '../lib/coverage.mjs';
import { diffDecisions } from './parity-gate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

export const BASELINE_PATH = resolve(HERE, 'engine-verdict-parity.baseline.json');
const CLI_ENTRY = 'src/sdk/cli/dist/main.js';
const WASM_CANDIDATES = ['src/rulesets/opa/policy.wasm', 'src/sdk/cli/rulesets/opa/policy.wasm'];
const ENGINES = ['native', 'opa'];

/** Outcomes that mean "this engine reached a verdict about the rule". */
const DECIDED = new Set(['passed', 'failed']);

/**
 * Place every rule id this engine reported into exactly one outcome.
 *
 * Exported for the unit tests: the precedence below is the whole correctness of
 * the comparison, so it is asserted directly rather than through a live run.
 *
 * @param {object} data the `data` object of an `evolith validate --format json` report
 * @returns {Map<string, string>} rule id -> outcome
 */
export function deriveOutcomes(data = {}) {
  const outcomes = new Map();
  const put = (ids, outcome) => {
    for (const id of ids ?? []) outcomes.set(String(id), outcome);
  };

  // Order is precedence, weakest claim first: a later call overwrites an earlier one.
  put(data.notApplicableRuleIds, 'not-applicable');
  put(data.nonExecutableRuleIds, 'non-executable');
  put(data.skippedRuleIds, 'skipped');
  put(data.erroredRuleIds, 'errored');

  // An issue only makes a rule `failed` if nothing above already explained it as
  // undecided. This is the line that keeps skip-complaints out of the verdict set.
  for (const issue of data.issues ?? []) {
    const id = String(issue?.ruleId ?? '');
    if (id && !outcomes.has(id)) outcomes.set(id, 'failed');
  }

  // Everything the corpus holds and nothing above claimed was decided and clean.
  // The caller supplies that universe; ids absent from every list here are resolved
  // by `outcomeOf` below rather than materialised, because a report does not
  // enumerate its passes.
  return outcomes;
}

/** The outcome of a rule this engine reported, defaulting to `passed`. */
export function outcomeOf(outcomes, ruleId) {
  return outcomes.get(String(ruleId)) ?? 'passed';
}

/**
 * The rule ids BOTH engines reached a verdict on — the only ids a conflict can
 * be claimed over.
 */
export function jointlyDecided(nativeOutcomes, opaOutcomes, universe) {
  return [...universe]
    .filter((id) => DECIDED.has(outcomeOf(nativeOutcomes, id)) && DECIDED.has(outcomeOf(opaOutcomes, id)))
    .sort();
}

/**
 * The decision list `diffDecisions` consumes: one entry per rule this engine
 * FAILED among the jointly-decided ids, deduplicated by rule id.
 */
export function toDecisions(data, ruleIds) {
  const wanted = new Set(ruleIds);
  const seen = new Set();
  const decisions = [];
  for (const issue of data?.issues ?? []) {
    const id = String(issue?.ruleId ?? '');
    if (!wanted.has(id) || seen.has(id)) continue;
    seen.add(id);
    decisions.push({ ruleId: id, severity: issue.severity ?? null, file: issue.file ?? null });
  }
  return decisions;
}

/**
 * Compare measured conflicts against the registered baseline.
 *
 * @returns {{unregistered: object[], stale: object[], registered: object[]}}
 */
export function reconcileBaseline(conflicts, baseline) {
  const registered = new Map((baseline?.conflicts ?? []).map((c) => [String(c.ruleId), c]));
  const measured = new Map(conflicts.map((c) => [String(c.ruleId), c]));

  return {
    unregistered: conflicts.filter((c) => !registered.has(String(c.ruleId))),
    stale: [...registered.values()].filter((c) => !measured.has(String(c.ruleId))),
    registered: conflicts.filter((c) => registered.has(String(c.ruleId))),
  };
}

/** Run one engine over the whole corpus and return its parsed report. */
function runEngine(engine, root) {
  const started = Date.now();
  const proc = spawnSync(
    process.execPath,
    [CLI_ENTRY, 'validate', '--engine', engine, '--format', 'json'],
    { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );

  if (proc.error) throw new Error(`could not spawn the CLI for engine '${engine}': ${proc.error.message}`);

  let parsed;
  try {
    parsed = JSON.parse(proc.stdout);
  } catch {
    const tail = String(proc.stdout ?? '').slice(-400) || '(empty stdout)';
    throw new Error(
      `engine '${engine}' did not emit a JSON report (exit ${proc.status}). Last stdout: ${tail}`,
    );
  }
  if (!parsed?.data) throw new Error(`engine '${engine}' emitted a report with no \`data\` envelope.`);

  return { data: parsed.data, exitCode: proc.status, durationMs: Date.now() - started };
}

/**
 * The rule-id universe of a run. `corpusTotal` is a COUNT, so the universe is
 * assembled from the ids the two engines actually named; a rule neither engine
 * mentioned is passed by both and cannot be a conflict.
 */
function universeOf(...outcomeMaps) {
  const ids = new Set();
  for (const map of outcomeMaps) for (const id of map.keys()) ids.add(id);
  return ids;
}

function preflight(root) {
  const missing = [];
  if (!existsSync(resolve(root, CLI_ENTRY))) missing.push(`${CLI_ENTRY} (build it: npm run build --workspace src/sdk/cli)`);
  if (!WASM_CANDIDATES.some((rel) => existsSync(resolve(root, rel)))) {
    missing.push(`${WASM_CANDIDATES[0]} (build it: npm run build:policy)`);
  }
  return missing;
}

async function main() {
  const argv = process.argv.slice(2);
  const verbose = argv.includes('--verbose');
  const asJson = argv.includes('--json');
  const root = REPO_ROOT;

  console.log('⚖️  Engine verdict parity — native vs OPA over the whole corpus (GT-704)');

  // Fail closed. A guard that cannot run both engines has not compared them, and
  // "no conflicts found" would be the exact vacuous pass this repository keeps
  // finding. This is also what makes the empty-sandbox fixture (guard 43) red.
  const missing = preflight(root);
  if (missing.length > 0) {
    console.error('❌ the two engines cannot both be run, so nothing was compared:');
    for (const m of missing) console.error(`   - missing ${m}`);
    process.exit(1);
  }

  const runs = {};
  for (const engine of ENGINES) {
    try {
      runs[engine] = runEngine(engine, root);
    } catch (err) {
      console.error(`❌ ${err.message}`);
      process.exit(1);
    }
  }

  const outcomes = Object.fromEntries(ENGINES.map((e) => [e, deriveOutcomes(runs[e].data)]));

  // The denominator, per engine and out loud: an engine that reported nothing is a
  // broken run, not an agreeable one.
  try {
    assertScannedPerSource(
      { native: outcomes.native.size, opa: outcomes.opa.size },
      { what: 'rule outcomes' },
    );
  } catch (err) {
    if (err instanceof ZeroCoverageError) {
      console.error(`❌ ${err.message}`);
      process.exit(1);
    }
    throw err;
  }

  const universe = universeOf(outcomes.native, outcomes.opa);
  const both = jointlyDecided(outcomes.native, outcomes.opa, universe);

  const drift = diffDecisions(
    toDecisions(runs.native.data, both),
    toDecisions(runs.opa.data, both),
  );

  const conflicts = drift.map((d) => ({
    ruleId: d.ruleId,
    kind: d.kind,
    native: outcomeOf(outcomes.native, d.ruleId),
    opa: outcomeOf(outcomes.opa, d.ruleId),
    title: d.title,
  }));

  const baseline = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) : { conflicts: [] };
  const { unregistered, stale } = reconcileBaseline(conflicts, baseline);

  const corpusTotal = runs.native.data.corpusTotal ?? null;
  const report = {
    schemaVersion: '1.0',
    corpusTotal,
    jointlyDecided: both.length,
    verdictConflicts: conflicts.length,
    // AC2: a bare count is what let GT-704's own "16" become unreproducible. The ids
    // are published so the next measurement can be compared id by id, not total by total.
    namedIds: conflicts.map((c) => c.ruleId),
    baselined: conflicts.length - unregistered.length,
    unregistered: unregistered.map((c) => c.ruleId),
    stale: stale.map((c) => c.ruleId),
    coverageOnly: {
      nativeDecidedOpaDidNot: [...universe].filter(
        (id) => DECIDED.has(outcomeOf(outcomes.native, id)) && !DECIDED.has(outcomeOf(outcomes.opa, id)),
      ).length,
      opaDecidedNativeDidNot: [...universe].filter(
        (id) => DECIDED.has(outcomeOf(outcomes.opa, id)) && !DECIDED.has(outcomeOf(outcomes.native, id)),
      ).length,
    },
    telemetry: { nativeMs: runs.native.durationMs, opaMs: runs.opa.durationMs },
  };

  console.log(
    `   corpus ${corpusTotal} rule(s); ${both.length} decided by BOTH engines; ` +
      `${conflicts.length} verdict conflict(s), ${report.baselined} of them registered.`,
  );
  console.log(
    `   coverage-only differences (legitimate, ADR-0041): native-only ${report.coverageOnly.nativeDecidedOpaDidNot}, ` +
      `opa-only ${report.coverageOnly.opaDecidedNativeDidNot}.`,
  );
  if (verbose) {
    for (const c of conflicts) console.log(`     · ${c.ruleId}: native=${c.native} opa=${c.opa}`);
  }
  if (asJson) console.log(`ENGINE_VERDICT_PARITY ${JSON.stringify(report)}`);

  let failed = false;

  if (unregistered.length > 0) {
    failed = true;
    console.error(`❌ ${unregistered.length} rule(s) reach OPPOSITE verdicts and are not registered:`);
    for (const c of unregistered) {
      console.error(`   - ${c.ruleId}: native=${c.native}, opa=${c.opa}`);
    }
    console.error('   Fix the disagreement, or register it in');
    console.error(`   ${BASELINE_PATH.replace(`${root}/`, '')} with a reason of ITS OWN — measured, not shared.`);
  }

  if (stale.length > 0) {
    failed = true;
    console.error(`❌ ${stale.length} baselined conflict(s) no longer conflict — remove them:`);
    for (const c of stale) console.error(`   - ${c.ruleId} (registered: ${c.reason?.slice(0, 90) ?? 'no reason'})`);
    console.error('   A baseline that keeps entries it no longer needs stops being a ratchet.');
  }

  if (failed) process.exit(1);

  console.log(
    `✓ 68-validate-engine-verdict-parity: ${both.length} jointly-decided rule(s), ` +
      `${conflicts.length} conflict(s), all registered with an individual reason.`,
  );
  process.exit(0);
}

// Only the entry point runs main; the tests import the pure helpers above.
// realpathSync on argv[1] is what guard 43's sandbox needs (see its header).
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().catch((err) => {
    console.error('❌ engine verdict parity guard failed:', err.message);
    process.exit(1);
  });
}
