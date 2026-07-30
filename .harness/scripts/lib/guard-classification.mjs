/**
 * @file guard-classification.mjs
 * @description The single classification of every script under
 * `.harness/scripts/ci` into the four anti-vacuous-pass states (GT-578).
 *
 * ## Why this is a library and not a copy
 *
 * Two guards need the same answer to the same question — "which of these
 * scripts is a corpus scanner, and is it protected?":
 *
 *   - `42-validate-guard-denominators.mjs` asserts every script is CLASSIFIED,
 *     i.e. that none can *structurally* pass over an empty scan.
 *   - `43-validate-guard-negative-fixtures.mjs` asserts every scanner is
 *     OBSERVED failing — it runs each one against a repo-shaped tree with no
 *     corpus in it and requires a non-zero exit.
 *
 * Those are different claims: the first reads source, the second executes. A
 * guard can be classified INSTRUMENTED and still exit 0 on an empty tree,
 * because the `assertScanned` call sits behind a branch that an empty tree never
 * reaches. That gap is precisely what GT-578's second criterion is about ("a
 * guard nobody has seen fail is the defect this backlog is about"), so both
 * checks are needed — but they must never disagree about *which* scripts they
 * are talking about. Two hand-maintained copies of this registry would diverge
 * within a month; one shared module cannot.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// --- Detection of the instrumented state -------------------------------------

export const IMPORTS_COVERAGE = /from\s+['"](?:\.\.\/)+lib\/coverage\.mjs['"]/;
export const CALLS_COVERAGE = /\b(?:assertScanned|assertScannedPerSource|scanned)\s*\(/;

// --- Registries --------------------------------------------------------------

/**
 * Guards whose zero-scan refusal is hand-written and predates the primitive.
 * `proof` MUST still match the file: it is what stops a "cleanup" commit from
 * deleting the check and leaving the exemption behind.
 */
export const SELF_GUARDED = [
  {
    file: '50-validate-gap-claim.mjs',
    proof: /could not read the open pull requests/,
    reason:
      'GT-639 gap-claim guard; refuses to pass when the pull-request query cannot be answered — ' +
      'the guard exists because two sessions could not see each other, so one that stays quiet ' +
      'when it cannot look would reproduce the defect. Zero open PRs is reported in words rather ' +
      'than passed silently, because it looks identical to a broken query otherwise',
  },
  {
    file: '49-validate-gap-id-allocation.mjs',
    proof: /at least one side yielded NOTHING/,
    reason:
      'GT-638 gap-id allocation guard; refuses a missing catalog, a base ref it cannot read ' +
      '(unable to answer is not "nothing to report" — a quiet skip is how the collision reached ' +
      'main), and a parse that yields zero ids on either side',
  },
  {
    file: '48-validate-security-publish-lag.mjs',
    proof: /resolved ZERO publishable packages — nothing was scanned/,
    reason:
      'GT-624 security-publish-lag gate; refuses a root with no publishable package, a package ' +
      'whose publish boundary cannot be established (unable to answer is not "nothing to report"), ' +
      'and a scan that examined zero commits while packages report commits since their boundary',
  },
  {
    file: '34-boundary-guard-repository.mjs',
    proof: /A zero-file scan must never be reported as "boundary guard passed"/,
    reason: 'the reference implementation of the pattern (GT-377); refuses both a missing root and an empty scan',
  },
  {
    file: '47-validate-joined-paths.mjs',
    proof: /and found ZERO TypeScript files/,
    reason:
      'GT-632 joined-path guard; refuses a scan with zero TypeScript sources AND a non-empty ' +
      'scan yielding zero path.join calls — the shape moving (to resolve(), to a helper) is ' +
      'exactly how a guard over BUILT paths would go quiet while still reporting a clean run',
  },
  {
    file: '46-validate-derived-artifact-order.mjs',
    proof: /the declared chain is EMPTY — nothing was ordered and nothing was checked/,
    reason:
      'GT-630 derived-artifact order guard; refuses an empty chain, a declared producer that ' +
      'does not exist, a missing artifact, and a declaration whose order contradicts itself',
  },
  {
    file: '45-validate-port-inventory-honesty.mjs',
    proof: /found ZERO port interfaces — the tree moved and this guard verified nothing/,
    reason:
      'GT-621 port-inventory guard; refuses a zero-port scan, an unparseable deps shape ' +
      '(the hot path must be DERIVED, never assumed), zero adapters and a missing scan corpus',
  },
  {
    file: '44-validate-adr-implementation-status.mjs',
    proof: /found ZERO ADR files — the corpus moved, and this guard verified nothing/,
    reason:
      'GT-607 ADR implementation-status guard; refuses an empty ADR corpus rather than ' +
      'reporting every declaration as satisfied — the corpus moving is exactly how it would go quiet',
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
export const NOT_A_SCANNER = [
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
export const PENDING = [
  // Empty as of GT-578's second wave: every scanning guard under
  // .harness/scripts/ci is now either instrumented or self-guarded with a
  // verified proof. Kept as a named, first-class state rather than deleted —
  // the next guard that cannot be instrumented in the same change belongs here
  // WITH A REASON, not in NOT_A_SCANNER, and not silently unclassified.
];

export const REGISTRIES = [
  ['SELF_GUARDED', SELF_GUARDED],
  ['NOT_A_SCANNER', NOT_A_SCANNER],
  ['PENDING', PENDING],
];

// --- Scan --------------------------------------------------------------------

/**
 * Every executable `.mjs` under `dir`, recursively, as repo-relative POSIX
 * paths. Test files are excluded: a `.test.mjs` is a fixture, not a gate.
 *
 * @param {string} dir absolute path of the `.harness/scripts/ci` directory
 * @returns {string[]} sorted, `/`-separated paths relative to `dir`
 */
export function collectGuards(dir) {
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

/**
 * Classify every guard under `ciDir` by reading its source.
 *
 * Returns the four buckets plus the violations that classification alone can
 * detect (an unclassified script, a SELF_GUARDED proof that no longer matches).
 * Registry-staleness is deliberately NOT computed here: it depends on whether
 * the caller is looking at the real tree or a partial fixture, which is the
 * caller's knowledge, not this module's.
 *
 * @param {string} ciDir absolute path to a `.harness/scripts/ci` directory
 * @returns {{ guards: string[], instrumented: string[], selfGuarded: string[],
 *   notScanners: string[], pending: string[], violations: string[] }}
 */
export function classifyGuards(ciDir) {
  const guards = collectGuards(ciDir);

  const selfById = new Map(SELF_GUARDED.map((e) => [e.file, e]));
  const notScannerById = new Map(NOT_A_SCANNER.map((e) => [e.file, e]));
  const pendingById = new Map(PENDING.map((e) => [e.file, e]));

  const instrumented = [];
  const selfGuarded = [];
  const notScanners = [];
  const pending = [];
  const violations = [];

  for (const rel of guards) {
    const src = readFileSync(join(ciDir, rel), 'utf8');

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
      `      from ../lib/coverage.mjs, or be registered in lib/guard-classification.mjs\n` +
      `      as SELF_GUARDED (with a proof regex), NOT_A_SCANNER (with a reason) or\n` +
      `      PENDING (with a reason). An unclassified guard is one that can report a\n` +
      `      pass over an empty scan, which is the defect GT-578 exists to close.`,
    );
  }

  return { guards, instrumented, selfGuarded, notScanners, pending, violations };
}

/**
 * The scanning guards — the ones a negative fixture must be able to turn red.
 * INSTRUMENTED + SELF_GUARDED, in discovery order.
 *
 * @param {string} ciDir
 * @returns {string[]}
 */
export function scanningGuards(ciDir) {
  const { instrumented, selfGuarded } = classifyGuards(ciDir);
  return [...instrumented, ...selfGuarded].sort();
}
