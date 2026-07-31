#!/usr/bin/env node

/**
 * GT-597 — the half of "a Scorecard run publishes a score" that can actually go red.
 *
 * ## The defect this closes
 *
 * `.github/workflows/openssf-scorecard.yml` already runs OpenSSF Scorecard on a
 * schedule and uploads SARIF to code scanning. That publishes a number. It does
 * not *measure* anything, because nothing in that path can fail: a score that
 * silently falls from 7.1 to 4.2 produces an equally green workflow run, and the
 * only difference is a figure inside an artifact nobody opens between audits.
 *
 * The gap row GT-597 exists precisely because posture defects were discovered by
 * hand, at audit time, months late. A weekly job that cannot turn red reproduces
 * that failure mode with better ergonomics.
 *
 * ## What this does
 *
 * Compares a Scorecard JSON result against a COMMITTED baseline
 * (`.harness/security/scorecard-baseline.json`) and exits non-zero when the
 * aggregate score, or any individual check, sits below its recorded floor.
 * The floor is in git, so a regression is a diffable, reviewable fact and not a
 * recollection.
 *
 * ## Fails closed, in every direction
 *
 * The rule is: anything we cannot positively confirm is red, never green.
 *
 *   - baseline not seeded yet          -> exit 1, printing the exact JSON to commit
 *   - results file missing/unparseable -> exit 1
 *   - results shape not recognised     -> exit 1 (see "an honest caveat" below)
 *   - zero checks in the results       -> exit 1 via `assertScanned`
 *   - a baselined check absent from
 *     this run                         -> exit 1 (a check that stops running is
 *                                        indistinguishable from one that fails)
 *   - a check present in the results
 *     but absent from the baseline     -> exit 1 (an incomplete baseline is how a
 *                                        ratchet quietly stops ratcheting)
 *   - a check scored -1 (inconclusive)
 *     against a numeric floor          -> exit 1, reported as INCONCLUSIVE rather
 *                                        than as a regression, because those are
 *                                        different facts
 *
 * An improvement never fails. It is reported as a RATCHET suggestion, so raising
 * the floor stays a deliberate, reviewed commit rather than an automatic one — a
 * self-updating baseline is a baseline that cannot detect anything.
 *
 * ## An honest caveat about the input shape
 *
 * The parser expects Scorecard's documented JSON v2 shape — top level `score`
 * plus `checks[]` of `{ name, score, reason }`, per `pkg/scorecard/json.go` in
 * ossf/scorecard. That shape was read from the upstream source, NOT observed from
 * a run of this repository: at the time of writing the Scorecard workflow has
 * never executed here (no run exists, and the public OpenSSF API returns 404 for
 * this repository), and running it requires a token and a publish decision that
 * belong to the repository owner. So the shape assumption is a documented
 * assumption. It fails closed: an unrecognised payload is exit 1 with the keys it
 * actually found, not a pass.
 *
 * USAGE
 *   node .harness/scripts/ci/52-validate-scorecard-regression.mjs --results <file>
 *   node .harness/scripts/ci/52-validate-scorecard-regression.mjs --results <file> --json
 *   node .harness/scripts/ci/52-validate-scorecard-regression.mjs --results <file> --baseline <file>
 *   node .harness/scripts/ci/52-validate-scorecard-regression.mjs --results <file> --summary <file>
 *
 * EXIT CODES
 *   0  every baselined check is at or above its floor, and the set matches
 *   1  a regression, an inconclusive check, a set mismatch, an unseeded or
 *      unreadable baseline, an unreadable or unrecognised results file, or a
 *      results file containing zero checks
 */

import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT } from '../lib/paths.mjs';
import { assertScanned, ZeroCoverageError } from '../lib/coverage.mjs';

const GUARD = '52-validate-scorecard-regression';

/** Committed floors. Repo-relative so the empty-fixture run resolves to nothing. */
export const BASELINE_RELATIVE_PATH = '.harness/security/scorecard-baseline.json';

/** Scorecard reports this when a check could not reach a verdict. */
const INCONCLUSIVE = -1;

// ---------------------------------------------------------------------------
// Pure core — data in, verdict out. No filesystem, no network, no process exit.
// ---------------------------------------------------------------------------

/**
 * Normalise a Scorecard JSON payload, refusing anything that is not recognisably
 * one. Returning a partial parse would let a shape change read as "no checks
 * regressed".
 *
 * @param {unknown} raw parsed JSON
 * @returns {{ aggregate: number, checks: Map<string, {score: number, reason: string}>, meta: object }}
 * @throws {Error} when the payload is not a Scorecard result
 */
export function parseResults(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(
      `[${GUARD}] the results payload is not a JSON object (got ${Array.isArray(raw) ? 'an array' : typeof raw}).`,
    );
  }

  const keys = Object.keys(raw);
  if (typeof raw.score !== 'number' || !Array.isArray(raw.checks)) {
    throw new Error(
      `[${GUARD}] this does not look like Scorecard JSON output.\n` +
        `  Expected a top-level numeric \`score\` and an array \`checks\`.\n` +
        `  Found keys: ${keys.length ? keys.join(', ') : '(none)'}\n` +
        `  The workflow must invoke ossf/scorecard-action with results_format: json.\n` +
        `  Refusing to report a pass over a payload this guard cannot read.`,
    );
  }

  const checks = new Map();
  for (const entry of raw.checks) {
    if (entry === null || typeof entry !== 'object') continue;
    if (typeof entry.name !== 'string' || typeof entry.score !== 'number') continue;
    checks.set(entry.name, {
      score: entry.score,
      reason: typeof entry.reason === 'string' ? entry.reason : '',
    });
  }

  return {
    aggregate: raw.score,
    checks,
    meta: {
      date: typeof raw.date === 'string' ? raw.date : null,
      commit: raw.repo && typeof raw.repo.commit === 'string' ? raw.repo.commit : null,
      scorecardVersion:
        raw.scorecard && typeof raw.scorecard.version === 'string' ? raw.scorecard.version : null,
    },
  };
}

/**
 * @param {object} baseline the committed baseline document
 * @returns {boolean} true when no run has ever been recorded
 */
export function isUnseeded(baseline) {
  if (baseline === null || typeof baseline !== 'object') return true;
  if (typeof baseline.aggregate !== 'number') return true;
  if (baseline.checks === null || typeof baseline.checks !== 'object') return true;
  return Object.keys(baseline.checks).length === 0;
}

/**
 * The baseline document to commit for a given run. Printed on every failure so
 * seeding, and deliberate ratcheting, are copy-paste operations rather than
 * hand-transcription of numbers.
 *
 * @param {ReturnType<typeof parseResults>} results
 * @param {object} [previous] the baseline being replaced, for provenance notes
 * @returns {object}
 */
export function seedProposal(results, previous = null) {
  const checks = {};
  for (const name of [...results.checks.keys()].sort()) {
    checks[name] = results.checks.get(name).score;
  }
  return {
    gap: 'GT-597',
    _readme: (previous && Array.isArray(previous._readme) ? previous._readme : DEFAULT_README).slice(),
    observedOn: results.meta.date,
    observedCommit: results.meta.commit,
    scorecardVersion: results.meta.scorecardVersion,
    aggregate: results.aggregate,
    checks,
  };
}

const DEFAULT_README = [
  'Committed floors for the OpenSSF Scorecard run in .github/workflows/openssf-scorecard.yml.',
  'A run scoring below any floor here fails the workflow. Raising a floor is a reviewed commit.',
  'aggregate: null means no run has been observed yet; the gate stays RED until it is seeded.',
];

/**
 * Compare a parsed result set against committed floors.
 *
 * @param {ReturnType<typeof parseResults>} results
 * @param {object} baseline
 * @returns {{ ok: boolean, verdict: string, rows: Array<object>, aggregate: object, findings: string[] }}
 */
export function compare(results, baseline) {
  const floors = baseline.checks ?? {};
  const rows = [];
  const findings = [];

  const names = new Set([...Object.keys(floors), ...results.checks.keys()]);

  for (const name of [...names].sort()) {
    const floor = Object.prototype.hasOwnProperty.call(floors, name) ? floors[name] : null;
    const observed = results.checks.has(name) ? results.checks.get(name).score : null;
    const reason = results.checks.has(name) ? results.checks.get(name).reason : '';

    let status;
    if (floor === null) {
      status = 'UNTRACKED';
      findings.push(
        `${name}: scored ${observed} but has no floor in the baseline. ` +
          'An unbaselined check cannot regress, so the baseline is stale — re-seed it.',
      );
    } else if (observed === null) {
      status = 'MISSING';
      findings.push(
        `${name}: baselined at ${floor} but absent from this run. ` +
          'A check that stops running looks identical to one that stopped passing.',
      );
    } else if (observed === INCONCLUSIVE && floor >= 0) {
      status = 'INCONCLUSIVE';
      findings.push(
        `${name}: baselined at ${floor}, this run returned -1 (Scorecard could not reach a verdict)` +
          `${reason ? ` — "${reason}"` : ''}.`,
      );
    } else if (observed < floor) {
      status = 'REGRESSED';
      findings.push(
        `${name}: ${floor} -> ${observed}${reason ? ` — "${reason}"` : ''}`,
      );
    } else if (observed > floor) {
      status = 'IMPROVED';
    } else {
      status = 'HELD';
    }

    rows.push({ name, floor, observed, status, reason });
  }

  const aggregate = {
    floor: baseline.aggregate,
    observed: results.aggregate,
    delta: Number((results.aggregate - baseline.aggregate).toFixed(2)),
  };
  if (results.aggregate < baseline.aggregate) {
    findings.push(
      `aggregate score: ${baseline.aggregate} -> ${results.aggregate} (${aggregate.delta})`,
    );
  }

  const ok = findings.length === 0;
  return {
    ok,
    verdict: ok ? 'pass' : 'regression',
    rows,
    aggregate,
    findings,
  };
}

// ---------------------------------------------------------------------------
// I/O shell
// ---------------------------------------------------------------------------

function flagValue(argv, flag) {
  const i = argv.indexOf(flag);
  return i !== -1 && i + 1 < argv.length ? argv[i + 1] : null;
}

function readJson(path, what) {
  if (!existsSync(path)) {
    throw new Error(`[${GUARD}] ${what} not found at ${path}`);
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`[${GUARD}] ${what} at ${path} is not valid JSON: ${err.message}`);
  }
}

function renderTable(rows) {
  const width = Math.max(...rows.map((r) => r.name.length), 12);
  const lines = [`  ${'check'.padEnd(width)}  floor  now  status`];
  for (const r of rows) {
    const floor = r.floor === null ? '  -' : String(r.floor).padStart(3);
    const now = r.observed === null ? '  -' : String(r.observed).padStart(3);
    lines.push(`  ${r.name.padEnd(width)}  ${floor}    ${now}  ${r.status}`);
  }
  return lines.join('\n');
}

function emitSummary(path, text) {
  if (!path) return;
  try {
    appendFileSync(path, `${text}\n`);
  } catch {
    /* a summary that cannot be written must not change the verdict */
  }
}

function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes('--json');
  const resultsPath = flagValue(argv, '--results');
  const baselinePath = flagValue(argv, '--baseline') ?? join(REPO_ROOT, BASELINE_RELATIVE_PATH);
  const summaryPath = flagValue(argv, '--summary') ?? process.env.GITHUB_STEP_SUMMARY ?? null;

  if (!resultsPath) {
    console.error(
      `[${GUARD}] --results <file> is required.\n` +
        '  Point it at the JSON emitted by ossf/scorecard-action with results_format: json.\n' +
        '  Without a result there is nothing to compare, and "nothing to compare" is not a pass.',
    );
    return 1;
  }

  let results;
  let baseline;
  try {
    baseline = readJson(baselinePath, 'the Scorecard baseline');
    results = parseResults(readJson(resultsPath, 'the Scorecard results'));
  } catch (err) {
    console.error(err.message);
    return 1;
  }

  try {
    assertScanned(results.checks.size, {
      what: 'Scorecard checks',
      where: [resultsPath],
    });
  } catch (err) {
    if (err instanceof ZeroCoverageError) {
      console.error(err.message);
      return 1;
    }
    throw err;
  }

  if (isUnseeded(baseline)) {
    const proposal = seedProposal(results, baseline);
    const block = JSON.stringify(proposal, null, 2);
    console.error(
      `[${GUARD}] SEED REQUIRED — this is not a posture regression.\n\n` +
        `  ${BASELINE_RELATIVE_PATH} has never recorded a run, so there is no floor\n` +
        '  to compare against. The gate stays red until a real, observed score is\n' +
        '  committed: a baseline invented without a run would measure nothing while\n' +
        '  looking exactly like one that does.\n\n' +
        `  This run scored ${results.aggregate}. Commit the block below as\n` +
        `  ${BASELINE_RELATIVE_PATH} and the gate arms itself.\n\n${block}\n`,
    );
    emitSummary(
      summaryPath,
      `### OpenSSF Scorecard — seed required\n\nAggregate score this run: **${results.aggregate}**. ` +
        `Commit the proposed \`${BASELINE_RELATIVE_PATH}\` printed in the job log to arm the regression gate.`,
    );
    if (asJson) console.log(JSON.stringify({ verdict: 'seed-required', proposal }, null, 2));
    return 1;
  }

  const verdict = compare(results, baseline);

  if (asJson) {
    console.log(JSON.stringify({ ...verdict, meta: results.meta }, null, 2));
  } else {
    console.log(`[${GUARD}] OpenSSF Scorecard posture gate`);
    console.log(
      `  aggregate: floor ${verdict.aggregate.floor} · now ${verdict.aggregate.observed} · ` +
        `delta ${verdict.aggregate.delta >= 0 ? '+' : ''}${verdict.aggregate.delta}`,
    );
    console.log(renderTable(verdict.rows));
  }

  const improved = verdict.rows.filter((r) => r.status === 'IMPROVED');
  if (improved.length > 0) {
    console.log(
      `\n  ${improved.length} check(s) now score above their floor. Raise the floor in a ` +
        `reviewed commit to keep the ratchet tight:\n    ${improved
          .map((r) => `${r.name} ${r.floor} -> ${r.observed}`)
          .join('\n    ')}`,
    );
  }

  if (!verdict.ok) {
    console.error(`\n[${GUARD}] ❌ posture regression — ${verdict.findings.length} finding(s):`);
    for (const f of verdict.findings) console.error(`  - ${f}`);
    emitSummary(
      summaryPath,
      `### OpenSSF Scorecard — posture regression\n\n` +
        `Aggregate: floor **${verdict.aggregate.floor}**, this run **${verdict.aggregate.observed}**.\n\n` +
        verdict.findings.map((f) => `- ${f}`).join('\n'),
    );
    return 1;
  }

  console.log(`\n[${GUARD}] ✅ ${verdict.rows.length} checks at or above their committed floor.`);
  emitSummary(
    summaryPath,
    `### OpenSSF Scorecard — no regression\n\nAggregate **${verdict.aggregate.observed}** ` +
      `(floor ${verdict.aggregate.floor}); ${verdict.rows.length} checks compared.`,
  );
  return 0;
}

const invokedDirectly =
  process.argv[1] && resolvePath(process.argv[1]) === resolvePath(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  process.exit(main());
}
