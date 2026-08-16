/**
 * GT-595 — why a rule does not run, stated per rule.
 *
 * GT-569 made the denominator honest: `validate` now reports that 269 of 380
 * rules were `skipped`. It did not say WHY, and "269 skipped" reads as "240
 * handlers to write" — a number large enough that nobody starts. It is not that
 * number. Measured against this repository's corpus (see
 * `rule-corpus-triage.spec.ts`, which recomputes it on every run):
 *
 * | class                     | rules | what closing it actually costs                    |
 * |---------------------------|-------|---------------------------------------------------|
 * | `native-handler`          |   139 | already evaluated                                  |
 * | `documentation-only`      |   129 | nothing to build — must stop counting              |
 * | `unimplemented-native`    |    60 | the real handler backlog                           |
 * | `needs-external-system`   |    20 | an adapter (VCS host, issue tracker, DB, mesh)     |
 * | `needs-runtime`           |    17 | an adapter that observes a running system          |
 * | `underspecified`          |    14 | author the check before anyone can implement it    |
 *
 * So the engineering backlog is **60 handlers**, not 240, and 143 of the 240
 * unhandled rules are not a handler problem at all. That reframing is the point
 * of this module; the handlers are the cheap part once it exists.
 *
 * The triage is a TABLE, not a heuristic. A keyword classifier over rule text
 * would be exactly the unmeasured guess GT-584 exists to prevent, and it would
 * drift silently. Every entry below is a decision taken by reading the rule's
 * own `validationQuery`, and `rule-corpus-triage.spec.ts` fails if the corpus
 * grows a rule this table does not cover.
 */

import { NormalizedRule } from '../../domain/models/normalized-rule';

/** Why a rule is or is not evaluable by the native engine. */
export type RuleEvaluability =
  /** A native handler claims it — it runs. */
  | 'native-handler'
  /** Decidable from repository content alone; no handler written yet. THE backlog. */
  | 'unimplemented-native'
  /** Needs a system outside the repository (VCS host settings, issue tracker, a live DB, a mesh). */
  | 'needs-external-system'
  /** Needs the running system: traces, timings, executed tests, per-call decisions. */
  | 'needs-runtime'
  /** No executable check is expressible — process/judgement, or a generator placeholder. */
  | 'documentation-only'
  /** The rule declares NO check at all. It must be authored before it can be implemented. */
  | 'underspecified'
  /**
   * GT-675 — the compiled OPA bundle declares no reachable policy that decides
   * this rule id.
   *
   * Distinct from `unimplemented-native` on purpose: that is a statement about the
   * NATIVE handler backlog, and asserting it from the OPA path would be a claim
   * about code this engine never looked at. This class says one thing only — the
   * bundle was asked and answered no. It is real debt (write the `.rego`), so it
   * stays inside the denominator.
   *
   * Before this existed, `OpaEvaluator` had no `skipped` path at all: a rule no
   * policy emits produced no violation and was reported `passed`. Measured on this
   * corpus the day it was added: OPA returned `rulesSkipped: 0` against native's
   * 241, and answered `passed` on two security packs where native failed with two
   * blocking issues each.
   */
  | 'no-policy-in-bundle';

/**
 * Classes that must LEAVE the coverage denominator: no engine, adapter or budget
 * will ever make them run, so counting them as "unevaluated" permanently
 * depresses a figure nobody can improve.
 *
 * `needs-external-system` and `needs-runtime` deliberately STAY in: the enforcer
 * seam (ADR-0111 / GT-514) can close them, so they are a real, costed debt.
 */
export const NON_EXECUTABLE_CLASSES: ReadonlySet<RuleEvaluability> = new Set<RuleEvaluability>([
  'documentation-only',
  'underspecified',
]);

export function isNonExecutable(evaluability: RuleEvaluability): boolean {
  return NON_EXECUTABLE_CLASSES.has(evaluability);
}

export interface TriageEntry {
  readonly evaluability: RuleEvaluability;
  /** The clause of the rule's own validationQuery that forced the class. */
  readonly why: string;
}

const WHY = {
  vcsHost: 'Acceptance lives in the VCS host (branch protection, approvals, tags, merge strategy), not in the tree.',
  tracker: 'Acceptance is an issue-tracker state (age/SLA), outside the repository.',
  registry: 'Acceptance is a record in an external catalog/registry/lineage store.',
  liveDb: 'Acceptance is a property of a live database (RLS, schema-per-tenant).',
  mesh: 'Acceptance is a property of deployed infrastructure (service mesh, mTLS, on-call).',
  backend: 'Acceptance is a query against a telemetry/metrics backend.',
  traces: 'Acceptance is an observation of the running system (traces, logs, per-call decisions).',
  timings: 'Acceptance is a measured execution property (durations, coverage, isolation at run time).',
  execute: 'Acceptance requires executing the suite/fixtures and comparing outcomes.',
  judgement: 'Acceptance is a human judgement or board process with no machine-checkable predicate.',
  noQuery: 'The rule declares no validationQuery — there is no check to implement yet.',
} as const;

/**
 * Per-rule triage for every corpus rule no native handler claims.
 *
 * Read as: "if this is not here and no handler claims it, the engine OWES a
 * handler". The default is deliberately the expensive one — an unknown rule
 * must never drop out of the denominator by accident.
 */
export const RULE_TRIAGE: Readonly<Record<string, TriageEntry>> = {
  // ---- needs-external-system -------------------------------------------------
  'CICD-03': { evaluability: 'needs-external-system', why: WHY.vcsHost },
  'CICD-04': { evaluability: 'needs-external-system', why: WHY.vcsHost },
  'CICD-06': { evaluability: 'needs-external-system', why: WHY.tracker },
  'CICD-07': { evaluability: 'needs-external-system', why: WHY.tracker },
  'DAM-R04': { evaluability: 'needs-external-system', why: WHY.registry },
  'DAM-R06': { evaluability: 'needs-external-system', why: WHY.registry },
  'DAM-R09': { evaluability: 'needs-external-system', why: WHY.registry },
  'GIT-01': { evaluability: 'needs-external-system', why: WHY.vcsHost },
  'GIT-02': { evaluability: 'needs-external-system', why: WHY.vcsHost },
  'GIT-03': { evaluability: 'needs-external-system', why: WHY.vcsHost },
  'GIT-04': { evaluability: 'needs-external-system', why: WHY.vcsHost },
  'GIT-05': { evaluability: 'needs-external-system', why: WHY.vcsHost },
  'GIT-06': { evaluability: 'needs-external-system', why: WHY.vcsHost },
  'GIT-07': { evaluability: 'needs-external-system', why: WHY.vcsHost },
  'GIT-09': { evaluability: 'needs-external-system', why: WHY.vcsHost },
  'GIT-10': { evaluability: 'needs-external-system', why: WHY.vcsHost },
  'MS-R02': { evaluability: 'needs-external-system', why: WHY.mesh },
  'MS-R08': { evaluability: 'needs-external-system', why: WHY.mesh },
  'MTN-02': { evaluability: 'needs-external-system', why: WHY.liveDb },
  'OBS-EVD-03': { evaluability: 'needs-external-system', why: WHY.backend },

  // ---- needs-runtime ---------------------------------------------------------
  'ABAC-01': { evaluability: 'needs-runtime', why: WHY.traces },
  'ABAC-02': { evaluability: 'needs-runtime', why: WHY.traces },
  'ABAC-03': { evaluability: 'needs-runtime', why: WHY.traces },
  'CLI-PAR-03': { evaluability: 'needs-runtime', why: WHY.execute },
  'HXA-07': { evaluability: 'needs-runtime', why: WHY.timings },
  'MS-R03': { evaluability: 'needs-runtime', why: WHY.timings },
  'MS-R04': { evaluability: 'needs-runtime', why: WHY.execute },
  'MTN-04': { evaluability: 'needs-runtime', why: WHY.traces },
  'MTN-06': { evaluability: 'needs-runtime', why: WHY.traces },
  'OBS-EVD-01': { evaluability: 'needs-runtime', why: WHY.traces },
  'OBS-EVD-02': { evaluability: 'needs-runtime', why: WHY.traces },
  'OCB-08': { evaluability: 'needs-runtime', why: WHY.execute },
  'PROT-01': { evaluability: 'needs-runtime', why: WHY.traces },
  'TPY-01': { evaluability: 'needs-runtime', why: WHY.execute },
  'TPY-02': { evaluability: 'needs-runtime', why: WHY.timings },
  'TPY-05': { evaluability: 'needs-runtime', why: WHY.timings },
  'TPY-07': { evaluability: 'needs-runtime', why: WHY.timings },

  // ---- documentation-only (judgement / board process) ------------------------
  'OCB-07': { evaluability: 'documentation-only', why: WHY.judgement },
  'PROT-03': { evaluability: 'documentation-only', why: WHY.judgement },
  'PROT-06': { evaluability: 'documentation-only', why: WHY.judgement },

  // ---- underspecified — no validationQuery authored --------------------------
  // These are MUST/blocking rules that state an obligation and no way to test it.
  // They are the most dangerous class: they look enforced and are not.
  'EC-SEC-01': { evaluability: 'underspecified', why: WHY.noQuery },
  'EC-SEC-02': { evaluability: 'underspecified', why: WHY.noQuery },
  'SV-SEC-01': { evaluability: 'underspecified', why: WHY.noQuery },
  'SV-SEC-02': { evaluability: 'underspecified', why: WHY.noQuery },
  'INH-03': { evaluability: 'underspecified', why: WHY.noQuery },
  'INH-04': { evaluability: 'underspecified', why: WHY.noQuery },
  'INH-05': { evaluability: 'underspecified', why: WHY.noQuery },
  'KI-R01': { evaluability: 'underspecified', why: WHY.noQuery },
  'KI-R02': { evaluability: 'underspecified', why: WHY.noQuery },
  'KI-R03': { evaluability: 'underspecified', why: WHY.noQuery },
  'KI-R04': { evaluability: 'underspecified', why: WHY.noQuery },
  'KI-R05': { evaluability: 'underspecified', why: WHY.noQuery },
  'KI-R06': { evaluability: 'underspecified', why: WHY.noQuery },
  'KI-R07': { evaluability: 'underspecified', why: WHY.noQuery },
};

/**
 * The `.harness` generator (`generate-adr-rulesets.mjs`) emits one conformance
 * rule per ADR whose validationQuery is a template ending in this sentence — it
 * says, in the corpus itself, that no check was wired. 126 of them exist, 91 of
 * them `blocking: true`. They are documentation, and they were being counted as
 * coverage debt.
 */
const GENERATOR_PLACEHOLDER = /concrete checks to be wired into the harness\.?\s*$/i;

/** The category the ADR-ruleset generator stamps on every rule it emits. */
export const ADR_CONFORMANCE_CATEGORY = 'adr-conformance';

/** True when the rule carries no check, or only the generator's placeholder text. */
export function hasNoAuthoredCheck(validationQuery?: string): boolean {
  const q = (validationQuery ?? '').trim();
  return q.length === 0 || GENERATOR_PLACEHOLDER.test(q);
}

/**
 * Classify one rule.
 *
 * `hasNativeHandler` is supplied by the caller (the evaluator knows its own
 * handlers) so this module stays pure and testable without an engine.
 */
export function classifyRule(rule: NormalizedRule, hasNativeHandler: boolean): TriageEntry {
  if (hasNativeHandler) {
    return { evaluability: 'native-handler', why: 'A native handler claims this rule.' };
  }

  const triaged = RULE_TRIAGE[rule.id];
  if (triaged) return triaged;

  if (rule.category === ADR_CONFORMANCE_CATEGORY && hasNoAuthoredCheck(rule.validationQuery)) {
    return {
      evaluability: 'documentation-only',
      why: 'Auto-generated ADR-conformance rule whose validationQuery is the generator placeholder — the harness never wired a check.',
    };
  }

  // Default: the engine owes a handler. Never let an unrecognised rule leave the
  // denominator — that is precisely the silent redefinition GT-569 fixed.
  return {
    evaluability: 'unimplemented-native',
    why: 'Decidable from repository content; no native handler exists yet.',
  };
}

/** One rule's classification, ready to be counted. */
export interface ClassifiedRule {
  readonly ruleId: string;
  readonly sourceFile: string;
  readonly blocking: boolean;
  readonly evaluability: RuleEvaluability;
  readonly why: string;
}

/** Coverage of a single ruleset file — AC3 of GT-595. */
export interface RulesetCoverageRatio {
  readonly sourceFile: string;
  /** Rules of this file the engine can, in principle, decide (total − non-executable). */
  readonly executable: number;
  /** Rules of this file a native handler claims today. */
  readonly handled: number;
  readonly total: number;
}

export interface EvaluabilitySummary {
  readonly byClass: Readonly<Record<RuleEvaluability, number>>;
  /** Rules that no engine or adapter will ever run — excluded from the honest denominator. */
  readonly nonExecutable: number;
  readonly nonExecutableRuleIds: readonly string[];
  /** `total − nonExecutable`: the denominator a coverage claim should be read against. */
  readonly executableTotal: number;
  readonly total: number;
  /** Per-ruleset ratio, sorted by file. */
  readonly perRuleset: readonly RulesetCoverageRatio[];
  /**
   * Rules that are `blocking: true` yet can never be evaluated. A blocking rule
   * that structurally cannot run is a promise the product does not keep, and it
   * is the single most useful number in this summary.
   */
  readonly blockingNonExecutable: readonly string[];
}

function emptyByClass(): Record<RuleEvaluability, number> {
  return {
    'native-handler': 0,
    'unimplemented-native': 0,
    'needs-external-system': 0,
    'needs-runtime': 0,
    'documentation-only': 0,
    underspecified: 0,
    // GT-675: reported by the OPA path only. The native triage table never
    // produces it, so it stays 0 on every native run and the six existing
    // figures are unchanged.
    'no-policy-in-bundle': 0,
  };
}

/** Fold classified rules into the published breakdown. */
export function summarizeEvaluability(classified: readonly ClassifiedRule[]): EvaluabilitySummary {
  const byClass = emptyByClass();
  const nonExecutableRuleIds: string[] = [];
  const blockingNonExecutable: string[] = [];
  const perFile = new Map<string, { executable: number; handled: number; total: number }>();

  for (const c of classified) {
    byClass[c.evaluability] += 1;

    const bucket = perFile.get(c.sourceFile) ?? { executable: 0, handled: 0, total: 0 };
    bucket.total += 1;

    if (isNonExecutable(c.evaluability)) {
      nonExecutableRuleIds.push(c.ruleId);
      if (c.blocking) blockingNonExecutable.push(c.ruleId);
    } else {
      bucket.executable += 1;
      if (c.evaluability === 'native-handler') bucket.handled += 1;
    }

    perFile.set(c.sourceFile, bucket);
  }

  const perRuleset = [...perFile.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([sourceFile, v]) => ({ sourceFile, ...v }));

  return {
    byClass,
    nonExecutable: nonExecutableRuleIds.length,
    nonExecutableRuleIds,
    executableTotal: classified.length - nonExecutableRuleIds.length,
    total: classified.length,
    perRuleset,
    blockingNonExecutable,
  };
}
