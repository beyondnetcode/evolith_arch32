#!/usr/bin/env node
/**
 * @file capture-native-evaluability-snapshot.mjs
 * @description GT-598 — capture `native-evaluability-snapshot.json` from Core.
 *
 * WHY THIS EXISTS
 * ---------------
 * The snapshot said, in its own header, that it was "a CAPTURED SNAPSHOT, not
 * the source of truth". No capture script existed. It was written by hand, and
 * it drifted: it still declared `documentation-only: 129` long after Core moved
 * to 136, and the guard that was supposed to notice
 * (`iso-5055-mapping.test.mjs`) compared the snapshot's counts against six
 * numbers hardcoded in the test — the same numbers the snapshot already
 * contained. It could only ever pass. This script is the missing half.
 *
 * Drift here is not contained. `build-iso-5055-mapping.mjs` stamps
 * `nativeEvaluability` onto every row of the ISO/IEC 5055 mapping from this
 * file, so a stale class silently overstates the handler backlog in a much
 * larger derived artifact. ALWAYS recapture before rebuilding the mapping.
 *
 * WHAT IT RUNS
 * ------------
 * The real Core triage — `test/rule-corpus-triage.ts` in @beyondnet/evolith-core-domain,
 * which instantiates the real `NativeEvaluator`, asks its handler set which
 * rules it claims, and classifies the rest through `classifyRule`. Nothing is
 * reimplemented here: a second implementation of the classification would be a
 * second source of truth, which is the defect this script exists to remove.
 *
 * Core is TypeScript, so the triage is executed through `ts-node` (transpile
 * only, no emit). That makes this the one script under `src/rulesets` that
 * needs `node_modules` — which is exactly why the guard that runs in the
 * dependency-free documentation job stays a separate, non-executing check.
 *
 * USAGE
 *   node src/rulesets/standards/capture-native-evaluability-snapshot.mjs
 *   node src/rulesets/standards/capture-native-evaluability-snapshot.mjs --check
 *
 * EXIT CODES
 *   0  snapshot written, or (with --check) already identical to a fresh capture
 *   1  the capture disagrees with the committed file, or the triage refused to
 *      run / returned an implausible corpus
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const OUT = path.join(HERE, 'native-evaluability-snapshot.json');

const CORE_DOMAIN = 'src/packages/core-domain';
const TRIAGE_MODULE = `${CORE_DOMAIN}/test/rule-corpus-triage.ts`;
const TSCONFIG = `${CORE_DOMAIN}/tsconfig.json`;

/** The classes Core can emit. A capture holding anything else is not a capture. */
const KNOWN_CLASSES = [
  'native-handler',
  'unimplemented-native',
  'needs-runtime',
  'needs-external-system',
  'documentation-only',
  'underspecified',
];

/**
 * A corpus scan that finds nothing is never a real state — it is a moved path.
 * Refuse to overwrite a good snapshot with the result of one.
 */
const MIN_PLAUSIBLE_CORPUS = 300;

/**
 * Packages that DECLARE ts-node, most-likely location first.
 *
 * `ts-node` is a devDependency of core-api and mcp-server, not of the root and
 * not of core-domain. It normally lands in the root `node_modules` because npm
 * workspaces hoist it, and resolving it from the repo root works — until a
 * version conflict makes npm install it under the declaring package instead, at
 * which point a root-relative `-r ts-node/register` fails on a clean runner and
 * nowhere else. Resolving through the packages that actually declare it removes
 * the dependency on hoisting.
 */
const TS_NODE_DECLARED_BY = [
  'package.json',
  'src/packages/mcp-server/package.json',
  'src/apps/core-api/package.json',
];

/** Absolute path to ts-node's CommonJS register hook, or a stated failure. */
function resolveTsNodeRegister() {
  const tried = [];
  for (const manifest of TS_NODE_DECLARED_BY) {
    const from = path.join(REPO_ROOT, manifest);
    if (!fs.existsSync(from)) continue;
    try {
      return createRequire(from).resolve('ts-node/register');
    } catch {
      tried.push(manifest);
    }
  }
  throw new Error(
    'ts-node is not resolvable, so Core\'s triage cannot be executed and the snapshot cannot be captured.\n' +
      `  looked from: ${tried.join(', ') || '(no manifest found)'}\n` +
      '  Install the workspace first: npm ci',
  );
}

// ---------------------------------------------------------------------------
// 1. Run the real triage
// ---------------------------------------------------------------------------

/**
 * Execute Core's triage in a child process and read back its result as JSON.
 *
 * A child process rather than an import: this file is ESM under `src/rulesets`,
 * Core is CommonJS TypeScript compiled by `ts-node`, and the boundary between
 * them is a process, not a module resolution problem worth solving.
 */
function runTriage() {
  const program = `
    const { triageCorpus } = require(${JSON.stringify(path.join(REPO_ROOT, TRIAGE_MODULE))});
    const { corpus, classified, summary } = triageCorpus();
    const classes = {};
    const conflicts = [];
    for (const c of classified) {
      if (classes[c.ruleId] && classes[c.ruleId] !== c.evaluability) {
        conflicts.push(c.ruleId + ': ' + classes[c.ruleId] + ' vs ' + c.evaluability);
      }
      classes[c.ruleId] = c.evaluability;
    }
    process.stdout.write(JSON.stringify({
      corpusSize: corpus.length,
      counts: summary.byClass,
      classes,
      conflicts,
    }));
  `;

  const register = resolveTsNodeRegister();

  let raw;
  try {
    raw = execFileSync(process.execPath, ['-r', register, '-e', program], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      env: {
        ...process.env,
        TS_NODE_PROJECT: path.join(REPO_ROOT, TSCONFIG),
        TS_NODE_TRANSPILE_ONLY: 'true',
      },
      stdio: ['ignore', 'pipe', 'inherit'],
    });
  } catch (err) {
    throw new Error(
      `Could not run the Core triage (${TRIAGE_MODULE}). This script needs the workspace ` +
        `installed — ts-node and Core's dependencies must be resolvable from ${REPO_ROOT}.\n${err.message}`,
    );
  }

  const result = JSON.parse(raw);

  if (result.conflicts.length > 0) {
    throw new Error(
      'The same rule id is classified two different ways by the corpus, so a snapshot keyed by ' +
        `rule id cannot represent it:\n - ${result.conflicts.join('\n - ')}`,
    );
  }
  if (result.corpusSize < MIN_PLAUSIBLE_CORPUS) {
    throw new Error(
      `The triage classified only ${result.corpusSize} rules (expected at least ${MIN_PLAUSIBLE_CORPUS}). ` +
        'A collapsed corpus is a moved path, not progress — refusing to capture it.',
    );
  }
  for (const [id, klass] of Object.entries(result.classes)) {
    if (!KNOWN_CLASSES.includes(klass)) throw new Error(`${id} was classified as unknown class "${klass}".`);
  }

  const summed = Object.values(result.counts).reduce((a, b) => a + b, 0);
  if (summed !== result.corpusSize) {
    throw new Error(`Core's own class counts sum to ${summed} but it classified ${result.corpusSize} rules.`);
  }

  return result;
}

// ---------------------------------------------------------------------------
// 2. Render the snapshot
// ---------------------------------------------------------------------------

/**
 * Keep the capture date stable when nothing else changed.
 *
 * `capturedOn` is provenance, not content: bumping it on a run that produced an
 * identical classification would turn every recapture into a diff and make real
 * drift harder to see in review.
 */
function capturedOn(previous, changed) {
  if (!changed && previous?.capturedOn) return previous.capturedOn;
  return new Date().toISOString().slice(0, 10);
}

function render(triage, previous) {
  const counts = Object.fromEntries(
    KNOWN_CLASSES.filter((c) => triage.counts[c] !== undefined).map((c) => [c, triage.counts[c]]),
  );
  const classes = Object.fromEntries(Object.entries(triage.classes));

  const body = {
    counts,
    classes,
  };
  const changed =
    !previous ||
    JSON.stringify(previous.counts) !== JSON.stringify(body.counts) ||
    JSON.stringify(previous.classes) !== JSON.stringify(body.classes);

  const pinned = KNOWN_CLASSES.filter((c) => counts[c] !== undefined)
    .map((c) => `${c} ${counts[c]}`)
    .join(', ');

  const doc = {
    $id: 'https://evolith.dev/rulesets/standards/native-evaluability-snapshot.json',
    title: 'Native-engine evaluability class per rule (snapshot)',
    description:
      'Per-rule evaluability class as computed by the Core native evaluator triage. This is a CAPTURED SNAPSHOT, not the source of truth: the authority is src/packages/core-domain/src/application/validators/rule-evaluability.ts and its pinned spec rule-corpus-triage.spec.ts. It is recorded here so the ISO/IEC 5055 mapping can be scoped to the real handler backlog without src/rulesets depending on a package it does not own.',
    version: '1.1.0',
    generatedBy: 'src/rulesets/standards/capture-native-evaluability-snapshot.mjs',
    capturedOn: capturedOn(previous, changed),
    capturedFrom: [
      'src/packages/core-domain/test/rule-corpus-triage.ts (corpus loader, real handler set, classification)',
      'src/packages/core-domain/src/application/validators/rule-evaluability.ts (RULE_TRIAGE, classifyRule, ADR_CONFORMANCE_CATEGORY)',
      'src/packages/core-domain/src/application/validators/evaluators/native-evaluator.ts (registered handler set)',
      'src/packages/core-domain/src/application/validators/evaluators/handlers/**/*.ts (canHandle predicates)',
      'src/packages/core-domain/src/application/validators/rule-corpus-triage.spec.ts (the pinned counts, asserted against this file)',
    ],
    validation:
      `Captured from a live run of the Core triage over ${triage.corpusSize} rules (${pinned}). ` +
      'Recapture with `node src/rulesets/standards/capture-native-evaluability-snapshot.mjs`, then rebuild ' +
      'the mapping with `node src/rulesets/standards/build-iso-5055-mapping.mjs` — the mapping stamps ' +
      'nativeEvaluability per rule from this file, so rebuilding first would launder a stale class into it. ' +
      'Drift is caught in two places: rule-corpus-triage.spec.ts compares this file against a fresh triage ' +
      '(core-domain jest), and iso-5055-mapping.test.mjs checks it against the counts pinned in that spec ' +
      '(dependency-free documentation job).',
    // Both numbers, because they are not the same question. `corpusSize` is what
    // Core classified and what `counts` sums to; `distinctRuleIds` is how many
    // keys `classes` can hold. They differ exactly when one rule id appears in
    // more than one ruleset file, and a guard that assumed they were equal would
    // go red on a corpus change that is not drift.
    corpusSize: triage.corpusSize,
    distinctRuleIds: Object.keys(classes).length,
    ...body,
  };

  return { json: JSON.stringify(doc, null, 2) + '\n', changed };
}

// ---------------------------------------------------------------------------
// 3. Entry point
// ---------------------------------------------------------------------------

const CHECK = process.argv.includes('--check');

/**
 * Read the committed snapshot ONCE, and keep both views of that one read.
 *
 * Not `existsSync` then `readFileSync`, and not a second read for the byte
 * comparison: `--check` decides whether the file on disk equals a fresh capture,
 * so it must compare the bytes it actually parsed. Two reads can observe two
 * different files — the generator itself writes this path — and then the diff
 * reported would not be the diff that was measured. Absence is a normal state
 * (first capture), so ENOENT is handled and every other error is raised.
 */
function readCommittedSnapshot() {
  try {
    return fs.readFileSync(OUT, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return undefined;
    throw err;
  }
}

const onDisk = readCommittedSnapshot();
const previous = onDisk ? JSON.parse(onDisk) : undefined;
const triage = runTriage();
const { json, changed } = render(triage, previous);

if (CHECK) {
  if (onDisk !== json) {
    console.error(
      'GT-598: native-evaluability-snapshot.json no longer matches a fresh capture of the Core triage.\n' +
        '  Re-run: node src/rulesets/standards/capture-native-evaluability-snapshot.mjs\n' +
        '  Then:   node src/rulesets/standards/build-iso-5055-mapping.mjs',
    );
    if (previous) {
      for (const c of KNOWN_CLASSES) {
        const was = previous.counts?.[c];
        const now = triage.counts[c];
        if (was !== now) console.error(`  ${c}: snapshot says ${was ?? '(absent)'}, Core says ${now ?? '(absent)'}`);
      }
    }
    process.exit(1);
  }
  console.log(`GT-598: native-evaluability-snapshot.json is a faithful capture — ${triage.corpusSize} rules.`);
} else {
  fs.writeFileSync(OUT, json);
  console.log(
    `${changed ? 'Recaptured' : 'Unchanged'} ${path.relative(process.cwd(), OUT)} — ` +
      `${triage.corpusSize} rules: ${KNOWN_CLASSES.filter((c) => triage.counts[c] !== undefined).map((c) => `${c} ${triage.counts[c]}`).join(', ')}`,
  );
  if (changed) console.log('Now rebuild the mapping: node src/rulesets/standards/build-iso-5055-mapping.mjs');
}
