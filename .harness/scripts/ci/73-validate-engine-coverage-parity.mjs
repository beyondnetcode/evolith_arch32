#!/usr/bin/env node

/**
 * GT-716 AC3 — the coverage difference between the two engines is a per-rule
 * ratchet, in both directions, on both scenarios.
 *
 * ## What 68 leaves on the table
 *
 * `68-validate-engine-verdict-parity.mjs` holds the engines to agreement on the
 * rules BOTH decide, and prints what only one of them decides as `coverageOnly` —
 * two counts, gated on nothing. ADR-0041 never promised equal reach, and this guard
 * does not ask for it. It asks that every rule one engine decides and the other
 * does not be REGISTERED, with the measured reason the other engine gave, so that
 * a coverage change is a diff somebody reads rather than a number nobody does.
 *
 * ## The comparison, stated precisely
 *
 * For each scenario, each engine runs once (`evolith validate --engine <e> --format
 * json`) and every rule id gets one outcome through 68's `deriveOutcomes` (skipped /
 * not-applicable / non-executable / errored are "did not decide"; failed and passed
 * are "decided"). A rule decided by exactly one engine is a coverage-only rule, and
 * its entry carries WHY the other engine did not decide it — the evaluability class
 * the report states (`needs-supplied-facts`, `no-policy-in-bundle`, …) and, for the
 * OPA side, the facets its policy reads that a bare run does not supply.
 *
 * Two scenarios, because they do not skip the same rules (GT-716): this repository,
 * where native handlers decide the DoD, compliance-baseline, manifesto and taxonomy
 * rules whose policies read a context nobody supplied, and a satellite fresh from
 * `evolith init`, where almost everything either engine decides is decided by one of
 * them. A ratchet on one would let the other drift.
 *
 * ## The baseline is a ratchet in both directions
 *
 * `engine-coverage-parity.baseline.json` is written by `--write` and compared by
 * default. An id that is coverage-only and not registered fails (a new divergence);
 * an id that is registered and is no longer coverage-only fails (a stale entry — the
 * handler or policy landed and the entry must go with it); an entry whose reason
 * changed class fails (the same id, a different debt). A fix cannot land without its
 * entry, and an entry cannot outlive the difference it describes.
 *
 * ## The tree that is measured is the COMMITTED one
 *
 * The first CI run of this guard disagreed with the laptop that wrote its baseline:
 * EM-Y-01 and QT-01 were decided natively here (a `coverage/` directory from a local
 * jest run) and skipped there; DRIFT-01 was decided here (git history) and skipped on
 * a shallow clone; MCP-01..03 the other way round. None of that is the corpus — it is
 * whatever happens to sit in the working tree. So both scenarios read the Core from an
 * EXPORT of the tracked files (`git ls-files`, local modifications included) plus the
 * compiled `policy.wasm`: no coverage directories, no dists, no `.git`, on every
 * machine alike. A rule whose native verdict needs one of those is skipped identically
 * everywhere, which is the fact the baseline should carry.
 *
 * ## Nothing is coverage-only by omission (GT-716 AC4)
 *
 * A registered entry whose class is DEBT — no policy in the bundle, no native handler,
 * a handler that declined, an OPA path that gave no reason — must carry a recorded
 * decision in `engine-coverage-decisions.json`: `native-only` / `opa-only` (the
 * difference is accepted, and the entry says why and what would reopen it) or
 * `neither` (no engine decides the rule as written, e.g. the generated ADR-conformance
 * rules, documentation on both sides). An entry with no decision fails: the debt is
 * real, but it has to be somebody's. A decision that no longer describes the runs fails
 * too — its rule is decided by both engines now (stale), or by the engine the decision
 * said would not (contradicted) — so the register cannot outlive what it decided.
 * Entries whose class is already a declaration of the rule itself (`supplied-facet-absent`,
 * `needs-supplied-facts`, `needs-external-system`, `needs-runtime`, `documentation-only`,
 * `underspecified` — GT-716 AC2) need no second one.
 *
 * ## Anti-vacuous pass
 *
 * Both engine runs of both scenarios go through `assertScannedPerSource`; a missing
 * dist, an unbuilt bundle, an export with no corpus or an `init` that produced nothing
 * fails loudly instead of reporting "no differences".
 *
 * Usage:
 *   node .harness/scripts/ci/73-validate-engine-coverage-parity.mjs
 *   node .harness/scripts/ci/73-validate-engine-coverage-parity.mjs --verbose
 *   node .harness/scripts/ci/73-validate-engine-coverage-parity.mjs --json
 *   node .harness/scripts/ci/73-validate-engine-coverage-parity.mjs --write   # regenerate the baseline (review the diff)
 *
 * Exit codes:
 *   0 - every coverage-only rule is registered with its reason, every debt entry carries a decision, and every entry still holds
 *   1 - an unregistered rule, a stale entry, a changed reason, a debt entry nobody decided, a decision the runs contradict, or an engine that produced nothing
 */

import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { REPO_ROOT } from '../lib/paths.mjs';
import { assertScannedPerSource, ZeroCoverageError } from '../lib/coverage.mjs';
import { facetOfInputPath, readCorpusFacts, readVocabulary } from '../lib/rule-facts.mjs';
import { deriveOutcomes, outcomeOf } from './68-validate-engine-verdict-parity.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

export const BASELINE_PATH = resolve(HERE, 'engine-coverage-parity.baseline.json');
const CLI_ENTRY = 'src/sdk/cli/dist/main.js';
const WASM_CANDIDATES = ['src/rulesets/opa/policy.wasm', 'src/sdk/cli/rulesets/opa/policy.wasm'];
const ENGINES = ['native', 'opa'];
const DECIDED = new Set(['passed', 'failed']);
export const SCENARIOS = ['repository', 'init-satellite'];

/** The evaluability classes a report can state about a rule it did not decide. */
const CLASS_IN_TEXT = /\b(unimplemented-native|needs-external-system|needs-runtime|needs-supplied-facts|documentation-only|underspecified|no-policy-in-bundle|supplied-facet-absent)\b/;

/** Classes the NATIVE triage produces; stated on the OPA side they mean the OPA path said nothing of its own. */
const NATIVE_CLASSES = new Set(['unimplemented-native', 'needs-external-system', 'needs-runtime', 'needs-supplied-facts', 'documentation-only', 'underspecified']);

/** What closing each kind of entry costs — the follow-up the baseline carries. */
export const FOLLOW_UP = Object.freeze({
  'opa-gave-no-reason': 'Make the OPA path state why it declined (an enforcer route that failed, a strategy that returned skipped without a class).',
  'no-policy-in-bundle': 'Author the Rego twin, or record that the rule is native-only.',
  'supplied-facet-absent': 'Supply the facet through `facts.satellite` (GT-694), or stop reading it in the policy.',
  'unimplemented-native': 'Write the native handler — the rule declares an observed fact.',
  'needs-supplied-facts': 'The caller supplies the posture; the native engine cannot obtain it.',
  'needs-external-system': 'An adapter over the external system, through the enforcer seam.',
  'needs-runtime': 'An adapter that observes the running system, through the enforcer seam.',
  'documentation-only': 'Author a check or retire the rule; nothing can run it as written.',
  underspecified: 'Author the check the rule never got, or drop the blocking flag.',
  'handler-declined': 'The native handler found nothing to judge here; a fixture with the subject would decide it.',
  undecided: 'The report states no class for the skip — make the engine say why.',
});

export const DECISIONS_PATH = resolve(HERE, 'engine-coverage-decisions.json');

/**
 * Classes that are debt until somebody decides (GT-716 AC4). A baseline entry in one
 * of these without a recorded decision is coverage-only BY OMISSION and fails. The
 * other classes are the rule's own declaration (AC2) and need no second one.
 */
export const DECISION_REQUIRED = new Set(['no-policy-in-bundle', 'unimplemented-native', 'handler-declined', 'opa-gave-no-reason', 'undecided']);

/** The kinds a decision can take, and the baseline direction each one accepts. */
export const DECISION_KINDS = Object.freeze({ 'native-only': 'nativeOnly', 'opa-only': 'opaOnly', neither: null });

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate the register's shape: every decision has an id, a kind, a dated
 * rationale and the rules it covers (ids, a pattern, or both). Malformed is a throw,
 * not a warning — a register that cannot be read must not pass as "nothing decided".
 */
export function validateDecisions(decisions) {
  if (!Array.isArray(decisions)) throw new Error('engine-coverage-decisions.json: `decisions` must be an array');
  const ids = new Set();
  for (const d of decisions) {
    const at = `decision ${JSON.stringify(d?.id ?? '(no id)')}`;
    if (typeof d?.id !== 'string' || d.id.length === 0) throw new Error(`${at}: \`id\` is required`);
    if (ids.has(d.id)) throw new Error(`${at}: duplicate id`);
    ids.add(d.id);
    if (!(d.kind in DECISION_KINDS)) throw new Error(`${at}: \`kind\` must be one of ${Object.keys(DECISION_KINDS).join(', ')}`);
    if (typeof d.why !== 'string' || d.why.trim().length < 20) throw new Error(`${at}: \`why\` must say why (20+ characters)`);
    if (typeof d.recordedOn !== 'string' || !ISO_DATE.test(d.recordedOn)) throw new Error(`${at}: \`recordedOn\` must be YYYY-MM-DD`);
    const hasRules = Array.isArray(d.rules) && d.rules.length > 0 && d.rules.every((r) => typeof r === 'string' && r.length > 0);
    const hasPattern = typeof d.pattern === 'string' && d.pattern.length > 0;
    if (!hasRules && !hasPattern) throw new Error(`${at}: \`rules\` (ids) or \`pattern\` (a regex over rule ids) is required`);
    if (hasPattern) new RegExp(d.pattern); // throws on a bad pattern
  }
  return decisions;
}

export function readDecisions(path = DECISIONS_PATH) {
  if (!existsSync(path)) return [];
  return validateDecisions(JSON.parse(readFileSync(path, 'utf8')).decisions ?? []);
}

/** The rule ids a decision covers within a universe: its explicit ids plus every id its pattern matches. */
export function rulesOf(decision, universe) {
  const out = new Set(decision.rules ?? []);
  if (decision.pattern) {
    const re = new RegExp(decision.pattern);
    for (const id of universe) if (re.test(id)) out.add(id);
  }
  return out;
}

/** ruleId → decision, over a universe. Two decisions on one id is a contradiction in the register itself. */
export function decisionIndex(decisions, universe) {
  const index = new Map();
  for (const d of decisions) {
    for (const id of rulesOf(d, universe)) {
      const prior = index.get(id);
      if (prior && prior.id !== d.id) throw new Error(`rule ${id} is covered by two decisions: ${prior.id} and ${d.id}`);
      index.set(id, d);
    }
  }
  return index;
}

/**
 * Hold the measured entries and the register to each other.
 *  - undecided:    a coverage-only entry of a DEBT class with no decision — by omission.
 *  - mismatched:   the decision accepts the other direction (a \`native-only\` rule that OPA alone decides).
 *  - stale:        a decided rule both engines now decide — the decision outlived its difference.
 *  - contradicted: a \`neither\` rule some engine decided, or a one-engine decision whose engine is the other one.
 * `measured.decided` is ruleId → Set of the engines that decided it in this scenario.
 */
export function reconcileDecisions(measured, decisions) {
  const universe = new Set(measured.decided.keys());
  const index = decisionIndex(decisions, universe);
  const out = { undecided: [], mismatched: [], stale: [], contradicted: [] };
  for (const direction of ['nativeOnly', 'opaOnly']) {
    for (const e of measured[direction] ?? []) {
      if (!DECISION_REQUIRED.has(e.reason.class)) continue;
      const d = index.get(e.ruleId);
      if (!d) out.undecided.push({ direction, ruleId: e.ruleId, class: e.reason.class });
      else if (DECISION_KINDS[d.kind] !== direction) out.mismatched.push({ direction, ruleId: e.ruleId, decision: d.id, kind: d.kind });
    }
  }
  const decidedOnly = { 'native-only': 'native', 'opa-only': 'opa' };
  for (const d of decisions) {
    for (const id of rulesOf(d, universe)) {
      const engines = measured.decided.get(id) ?? new Set();
      if (engines.size === 0) continue;
      if (d.kind === 'neither') out.contradicted.push({ ruleId: id, decision: d.id, decidedBy: [...engines].sort() });
      else if (engines.size === 2) out.stale.push({ ruleId: id, decision: d.id });
      else if (!engines.has(decidedOnly[d.kind])) out.contradicted.push({ ruleId: id, decision: d.id, decidedBy: [...engines] });
    }
  }
  return out;
}

/** Decision ids that name a rule no scenario saw at all: a typo, or a rule that left the corpus. */
export function unknownDecisionRules(decisions, universes) {
  const seen = new Set(universes.flatMap((u) => [...u]));
  return decisions.flatMap((d) => (d.rules ?? []).filter((id) => !seen.has(id)).map((ruleId) => ({ decision: d.id, ruleId })));
}

/**
 * Rule ids decided by exactly one engine, with the OTHER engine's outcome.
 * Exported for the unit tests; the precedence is 68's.
 */
export function coverageOnly(nativeOutcomes, opaOutcomes, universe) {
  const nativeOnly = [];
  const opaOnly = [];
  for (const id of [...universe].sort()) {
    const n = outcomeOf(nativeOutcomes, id);
    const o = outcomeOf(opaOutcomes, id);
    if (DECIDED.has(n) && !DECIDED.has(o)) nativeOnly.push({ ruleId: id, other: o });
    else if (DECIDED.has(o) && !DECIDED.has(n)) opaOnly.push({ ruleId: id, other: n });
  }
  return { nativeOnly, opaOnly };
}

/** The class a report states for a rule it did not decide, or null. */
export function classFromReport(data, ruleId) {
  for (const issue of data?.issues ?? []) {
    if (String(issue?.ruleId ?? '') !== ruleId) continue;
    const m = CLASS_IN_TEXT.exec(`${issue.title ?? ''} ${issue.description ?? ''} ${issue.message ?? ''}`);
    if (m) return m[1];
  }
  return null;
}

/** The facets the OPA evaluator named in its skip message, when the report carries the row. */
const READS_IN_TEXT = /reads ((?:`input\.[^`]+`(?:, )?)+), and this run supplied/;

/**
 * The facets `opa-input-builder.ts` emits on every run, read from its source: the
 * `satellite:` and `core:` blocks plus the two paths. A facet a policy reads that is
 * not among them is absent on a bare run whatever its provenance says — GT-694's
 * `layers` is observed in nature and supplied in practice, and `repository-taxonomy`
 * reads an `input.repository` nothing produces at all.
 */
export function builderEmits(root) {
  const src = readFileSync(resolve(root, 'src/packages/core-domain/src/application/validators/evaluators/opa-input-builder.ts'), 'utf8');
  const emitted = new Set(['satellitePath', 'corePath']);
  for (const container of ['satellite', 'core']) {
    const start = src.indexOf(`      ${container}: {`);
    if (start < 0) continue;
    const end = src.indexOf('\n      }', start);
    for (const m of src.slice(start, end).matchAll(/^\s{8}(\w+):/gm)) emitted.add(`${container}.${m[1]}`);
  }
  return emitted;
}

/**
 * The reason the OPA engine did not decide a rule. Measured first — the class and
 * facets the report states in its skip row — then derived from the bundle's own
 * manifest: an id no reachable policy emits, or a policy that reads facets the input
 * builder never emits (absent on a bare run, whatever their provenance).
 */
export function opaReason(ruleId, manifest, corpus, vocabulary, opaReport = null, emitted = null) {
  const stated = opaReport ? classFromReport(opaReport, ruleId) : null;
  if (stated === 'supplied-facet-absent') {
    const row = (opaReport.issues ?? []).find((i) => String(i?.ruleId ?? '') === ruleId);
    const m = READS_IN_TEXT.exec(`${row?.description ?? ''} ${row?.message ?? ''}`);
    const facets = m ? [...m[1].matchAll(/`input\.([^`]+)`/g)].map((x) => x[1]).sort() : [];
    return { class: stated, why: `The report states the policy reads ${facets.join(', ') || 'a facet'} this run did not supply.`, facets };
  }
  if (stated && NATIVE_CLASSES.has(stated)) {
    // The OPA path returned a skip with no class of its own (an enforcer route that
    // failed, a strategy that declined) and the reporter fell back to the
    // declaration's class. Say that, rather than file OPA's silence as handler debt.
    const row = (opaReport.issues ?? []).find((i) => String(i?.ruleId ?? '') === ruleId);
    const said = (row?.description ?? '').replace(/^\[[A-Z ]+\] This rule[^.]*\. /, '').replace(/ A blocking rule that skips.*$/, '').trim();
    return { class: 'opa-gave-no-reason', why: `The OPA path skipped without stating why — the reporter fell back to the declaration's \`${stated}\`; the row says: ${said.slice(0, 160) || '(nothing)'}` };
  }
  if (stated) return { class: stated, why: `The report states \`${stated}\`.` };
  if (!manifest.declared.has(ruleId)) {
    return { class: 'no-policy-in-bundle', why: 'No reachable policy in the compiled bundle emits this id.' };
  }
  const facets = [...new Set((manifest.inputPaths.get(ruleId) ?? []).map(facetOfInputPath).filter(Boolean))];
  const absent = facets
    .filter((f) => (emitted ? !emitted.has(f) : vocabulary.get(f)?.provenance && vocabulary.get(f).provenance !== 'observed'))
    .sort();
  if (absent.length > 0) {
    return { class: 'supplied-facet-absent', why: `The policy reads ${absent.join(', ')}, which the input builder does not emit on a bare run.`, facets: absent };
  }
  const declared = corpus.get(ruleId)?.facts ?? [];
  return { class: 'undecided', why: `The bundle declares the id and reads ${facets.join(', ') || 'no input'}; declared facts: ${declared.join(', ') || 'none'}.` };
}

/** The reason the native engine did not decide a rule: the class it stated, or the declaration's. */
export function nativeReason(ruleId, data, snapshot, corpus) {
  const stated = classFromReport(data, ruleId);
  const cls = stated ?? (snapshot[ruleId] === 'native-handler' ? 'handler-declined' : snapshot[ruleId]) ?? 'undecided';
  const facts = corpus.get(ruleId)?.facts ?? [];
  return { class: cls, why: `${stated ? 'The report states' : 'The declaration gives'} \`${cls}\`; declared facts: ${facts.join(', ') || 'none'}.` };
}

/**
 * Compare measured entries against a baseline scenario.
 * @returns {{unregistered: object[], stale: object[], changed: object[]}}
 */
export function reconcileCoverage(measured, baselineScenario) {
  const out = { unregistered: [], stale: [], changed: [] };
  for (const direction of ['nativeOnly', 'opaOnly']) {
    const have = new Map((measured[direction] ?? []).map((e) => [e.ruleId, e]));
    const want = new Map(Object.entries(baselineScenario?.[direction] ?? {}));
    for (const [id, entry] of have) {
      const registered = want.get(id);
      if (!registered) out.unregistered.push({ direction, ruleId: id, class: entry.reason.class, why: entry.reason.why });
      else if (registered.class !== entry.reason.class) out.changed.push({ direction, ruleId: id, from: registered.class, to: entry.reason.class });
    }
    for (const [id, registered] of want) {
      if (!have.has(id)) out.stale.push({ direction, ruleId: id, class: registered.class });
    }
  }
  return out;
}

/** Render measured entries in the baseline's shape. */
export function toBaselineScenario(measured) {
  const render = (entries) =>
    Object.fromEntries(entries.map((e) => [e.ruleId, { class: e.reason.class, why: e.reason.why, followUp: FOLLOW_UP[e.reason.class] ?? FOLLOW_UP.undecided }]));
  return { nativeOnly: render(measured.nativeOnly), opaOnly: render(measured.opaOnly) };
}

function runCli(args, cwd) {
  const proc = spawnSync(process.execPath, [resolve(REPO_ROOT, CLI_ENTRY), ...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (proc.error) throw new Error(`could not spawn the CLI (${args.join(' ')}): ${proc.error.message}`);
  return proc;
}

function runEngine(engine, cwd, extra = []) {
  const proc = runCli(['validate', '--engine', engine, '--format', 'json', ...extra], cwd);
  let parsed;
  try {
    parsed = JSON.parse(proc.stdout);
  } catch {
    const tail = String(proc.stdout ?? '').slice(-400) || '(empty stdout)';
    throw new Error(`engine '${engine}' did not emit a JSON report (exit ${proc.status}). Last stdout: ${tail}`);
  }
  if (!parsed?.data) throw new Error(`engine '${engine}' emitted a report with no \`data\` envelope.`);
  return parsed.data;
}

/**
 * The Core as committed: every tracked file (with local modifications), nothing
 * untracked, plus the compiled bundle the evaluator needs. See the header.
 */
function exportCore(root) {
  const dir = mkdtempSync(join(tmpdir(), 'evolith-coverage-parity-core-'));
  const listed = execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 256 * 1024 * 1024 });
  const archive = execFileSync('tar', ['-c', '--null', '-T', '-', '-f', '-'], { cwd: root, input: listed, maxBuffer: 1024 * 1024 * 1024 });
  execFileSync('tar', ['-x', '-f', '-', '-C', dir], { input: archive, maxBuffer: 1024 * 1024 * 1024 });
  const wasm = WASM_CANDIDATES.find((r) => existsSync(resolve(root, r)));
  for (const rel of WASM_CANDIDATES) {
    mkdirSync(dirname(resolve(dir, rel)), { recursive: true });
    copyFileSync(resolve(root, wasm), resolve(dir, rel));
  }
  if (!existsSync(join(dir, 'src', 'rulesets', 'schema', 'facets.json'))) {
    throw new Error(`the export at ${dir} has no corpus vocabulary — \`git ls-files\` produced an incomplete tree`);
  }
  return dir;
}

/** A satellite exactly as `evolith init` leaves it, in a temporary directory. */
function initSatellite() {
  const dir = mkdtempSync(join(tmpdir(), 'evolith-coverage-parity-'));
  const proc = runCli(['init', '--name', 'coverage-parity-sat', '--yes'], dir);
  if (proc.status !== 0 || !existsSync(join(dir, 'evolith.yaml'))) {
    throw new Error(`\`evolith init\` did not produce a satellite in ${dir} (exit ${proc.status}): ${String(proc.stderr ?? '').slice(-300)}`);
  }
  return dir;
}

async function readManifest(root) {
  const rel = WASM_CANDIDATES.find((r) => existsSync(resolve(root, r)));
  const { loadPolicy } = await import('@open-policy-agent/opa-wasm');
  const policy = await loadPolicy(readFileSync(resolve(root, rel)));
  const declared = new Set((policy.evaluate({}, 'evolith/manifest/declared_rule_ids')?.[0]?.result ?? []).map(String));
  const raw = policy.evaluate({}, 'evolith/manifest/rule_input_paths')?.[0]?.result ?? {};
  const inputPaths = new Map(Object.entries(raw).map(([id, paths]) => [id, (paths ?? []).map(String)]));
  return { declared, inputPaths };
}

function preflight(root) {
  const missing = [];
  if (!existsSync(resolve(root, CLI_ENTRY))) missing.push(`${CLI_ENTRY} (build it: npm run build --workspace src/sdk/cli)`);
  if (!WASM_CANDIDATES.some((rel) => existsSync(resolve(root, rel)))) missing.push(`${WASM_CANDIDATES[0]} (build it: npm run build:policy)`);
  if (!existsSync(resolve(root, 'src/rulesets/standards/native-evaluability-snapshot.json'))) missing.push('src/rulesets/standards/native-evaluability-snapshot.json');
  return missing;
}

function measureScenario(name, runs, manifest, snapshot, corpus, vocabulary, emitted) {
  const outcomes = Object.fromEntries(ENGINES.map((e) => [e, deriveOutcomes(runs[e])]));
  assertScannedPerSource(
    { native: outcomes.native.size, opa: outcomes.opa.size },
    { what: `rule outcomes (${name})` },
  );
  const universe = new Set([...outcomes.native.keys(), ...outcomes.opa.keys()]);
  const { nativeOnly, opaOnly } = coverageOnly(outcomes.native, outcomes.opa, universe);
  const decided = new Map([...universe].map((id) => [id, new Set(ENGINES.filter((e) => DECIDED.has(outcomeOf(outcomes[e], id))))]));
  return {
    nativeOnly: nativeOnly.map((e) => ({ ...e, reason: opaReason(e.ruleId, manifest, corpus, vocabulary, runs.opa, emitted) })),
    opaOnly: opaOnly.map((e) => ({ ...e, reason: nativeReason(e.ruleId, runs.native, snapshot, corpus) })),
    decided,
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const verbose = argv.includes('--verbose');
  const asJson = argv.includes('--json');
  const write = argv.includes('--write');
  const root = REPO_ROOT;

  console.log('⚖️  Engine coverage parity — what only one engine decides, per rule, both scenarios (GT-716 AC3)');

  const missing = preflight(root);
  if (missing.length > 0) {
    console.error('❌ the two engines cannot both be run, so nothing was compared:');
    for (const m of missing) console.error(`   - missing ${m}`);
    process.exit(1);
  }

  const manifest = await readManifest(root);
  const snapshot = JSON.parse(readFileSync(resolve(root, 'src/rulesets/standards/native-evaluability-snapshot.json'), 'utf8')).classes ?? {};
  const corpus = readCorpusFacts(resolve(root, 'src/rulesets'), root);
  const vocabulary = readVocabulary(root);
  const emitted = builderEmits(root);
  const decisions = readDecisions();

  const measured = {};
  let satellite = null;
  let core = null;
  try {
    core = exportCore(root);
    for (const scenario of SCENARIOS) {
      const runs = {};
      const started = Date.now();
      if (scenario === 'init-satellite') satellite = initSatellite();
      for (const engine of ENGINES) {
        runs[engine] = scenario === 'repository'
          ? runEngine(engine, core, ['--core', core])
          : runEngine(engine, satellite, ['--core', core]);
      }
      measured[scenario] = measureScenario(scenario, runs, manifest, snapshot, corpus, vocabulary, emitted);
      measured[scenario].durationMs = Date.now() - started;
    }
  } catch (err) {
    if (err instanceof ZeroCoverageError) {
      console.error(`❌ ${err.message}`);
      process.exit(1);
    }
    console.error(`❌ ${err.message}`);
    process.exit(1);
  } finally {
    if (satellite) rmSync(satellite, { recursive: true, force: true });
    if (core) rmSync(core, { recursive: true, force: true });
  }

  if (write) {
    const baseline = {
      $comment: [
        'GT-716 AC3 — every rule ONE engine decides and the other does not, per scenario, with the reason the other engine gave.',
        'Written by `73-validate-engine-coverage-parity.mjs --write` and compared by default: an unregistered rule, a stale entry or a',
        'changed class fails. ADR-0041 never promised equal coverage; this file makes every coverage difference a diff somebody reads.',
        '`why` is measured — the class the report states, the facets the policy reads — and `followUp` says what would REMOVE the entry.',
      ],
      measuredOn: new Date().toISOString().slice(0, 10),
      method: 'evolith validate --engine {native,opa} --format json, on an export of the tracked tree (git ls-files + policy.wasm) and on a satellite fresh from `evolith init` with --core pointed at that export; outcomes per 68-validate-engine-verdict-parity.mjs.',
      scenarios: Object.fromEntries(SCENARIOS.map((s) => [s, toBaselineScenario(measured[s])])),
    };
    writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n');
    for (const s of SCENARIOS) {
      console.log(`   ${s}: native-only ${measured[s].nativeOnly.length}, opa-only ${measured[s].opaOnly.length} (${measured[s].durationMs} ms)`);
    }
    for (const s of SCENARIOS) {
      const { undecided } = reconcileDecisions(measured[s], decisions);
      if (undecided.length > 0) console.log(`   ${s}: ${undecided.length} debt entry(ies) carry no decision yet — record them in ${DECISIONS_PATH.replace(`${root}/`, '')}: ${undecided.map((e) => e.ruleId).join(', ')}`);
    }
    console.log(`✓ baseline written to ${BASELINE_PATH.replace(`${root}/`, '')} — review the diff before committing it.`);
    return;
  }

  const baseline = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) : { scenarios: {} };
  const report = { schemaVersion: '1.0', scenarios: {} };
  let failed = false;

  for (const s of SCENARIOS) {
    const { unregistered, stale, changed } = reconcileCoverage(measured[s], baseline.scenarios?.[s]);
    report.scenarios[s] = {
      nativeOnly: measured[s].nativeOnly.length,
      opaOnly: measured[s].opaOnly.length,
      unregistered: unregistered.map((e) => e.ruleId),
      stale: stale.map((e) => e.ruleId),
      changed: changed.map((e) => e.ruleId),
      durationMs: measured[s].durationMs,
    };
    console.log(
      `   ${s}: native-only ${measured[s].nativeOnly.length}, opa-only ${measured[s].opaOnly.length}; ` +
        `${unregistered.length} unregistered, ${stale.length} stale, ${changed.length} changed class (${measured[s].durationMs} ms).`,
    );
    if (verbose) {
      for (const e of measured[s].nativeOnly) console.log(`     · native-only ${e.ruleId}: opa ${e.reason.class}`);
      for (const e of measured[s].opaOnly) console.log(`     · opa-only ${e.ruleId}: native ${e.reason.class}`);
    }
    if (unregistered.length > 0) {
      failed = true;
      console.error(`❌ ${s}: ${unregistered.length} rule(s) are decided by ONE engine and not registered:`);
      for (const e of unregistered) console.error(`   - ${e.direction} ${e.ruleId}: the other engine says ${e.class} — ${e.why}`);
    }
    if (stale.length > 0) {
      failed = true;
      console.error(`❌ ${s}: ${stale.length} registered entry(ies) are no longer coverage-only — remove them (or re-run with --write and review):`);
      for (const e of stale) console.error(`   - ${e.direction} ${e.ruleId} (registered as ${e.class})`);
    }
    if (changed.length > 0) {
      failed = true;
      console.error(`❌ ${s}: ${changed.length} entry(ies) changed class — the same id, a different debt:`);
      for (const e of changed) console.error(`   - ${e.direction} ${e.ruleId}: ${e.from} → ${e.to}`);
    }

    const decided = reconcileDecisions(measured[s], decisions);
    report.scenarios[s].decisions = Object.fromEntries(Object.entries(decided).map(([k, v]) => [k, v.map((e) => e.ruleId)]));
    if (decided.undecided.length > 0) {
      failed = true;
      console.error(`❌ ${s}: ${decided.undecided.length} debt entry(ies) carry no recorded decision — coverage-only by omission (GT-716 AC4):`);
      for (const e of decided.undecided) console.error(`   - ${e.direction} ${e.ruleId} (${e.class}): implement it, or record a decision in ${DECISIONS_PATH.replace(`${root}/`, '')}`);
    }
    if (decided.mismatched.length > 0) {
      failed = true;
      console.error(`❌ ${s}: ${decided.mismatched.length} entry(ies) sit in the direction their decision does not accept:`);
      for (const e of decided.mismatched) console.error(`   - ${e.direction} ${e.ruleId}: decision ${e.decision} says ${e.kind}`);
    }
    if (decided.stale.length > 0) {
      failed = true;
      console.error(`❌ ${s}: ${decided.stale.length} decided rule(s) are decided by BOTH engines now — retire the decision:`);
      for (const e of decided.stale) console.error(`   - ${e.ruleId} (decision ${e.decision})`);
    }
    if (decided.contradicted.length > 0) {
      failed = true;
      console.error(`❌ ${s}: ${decided.contradicted.length} decision(s) are contradicted by the runs:`);
      for (const e of decided.contradicted) console.error(`   - ${e.ruleId}: decision ${e.decision} — decided by ${e.decidedBy.join(' and ')}`);
    }
  }

  const unknown = unknownDecisionRules(decisions, SCENARIOS.map((s) => new Set(measured[s].decided.keys())));
  report.unknownDecisionRules = unknown.map((e) => e.ruleId);
  if (unknown.length > 0) {
    failed = true;
    console.error(`❌ ${unknown.length} decision rule id(s) were seen by no scenario — a typo, or a rule that left the corpus:`);
    for (const e of unknown) console.error(`   - ${e.ruleId} (decision ${e.decision})`);
  }

  if (asJson) console.log(`ENGINE_COVERAGE_PARITY ${JSON.stringify(report)}`);

  if (failed) {
    console.error('   A coverage difference is legitimate (ADR-0041); an unregistered one is not. Register it with its reason, or fix it.');
    process.exit(1);
  }
  console.log('✓ 73-validate-engine-coverage-parity: every coverage-only rule is registered with its reason and every debt entry with a decision, in both directions, on both scenarios.');
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().catch((err) => {
    console.error(`❌ ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
    process.exit(1);
  });
}
