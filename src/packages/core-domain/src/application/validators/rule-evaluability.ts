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
 * The triage was a TABLE here (`RULE_TRIAGE`, keyed by rule id) until GT-716 AC2
 * moved the declaration into each rule's own file: `facts` names the facets the
 * check reads, `src/rulesets/schema/facets.json` says where the truth of each one
 * lives, and the class is DERIVED from the most demanding provenance. The same
 * declaration is what the OPA bundle build checks the policies' reads against, so
 * the two engines can no longer classify one rule from two unrelated sources — the
 * defect that had `KI-R01..07` "underspecified" natively and decided in Rego.
 * `rule-corpus-triage.spec.ts` fails if a corpus rule declares nothing, or names a
 * facet the vocabulary does not know.
 */

import { DeclaredFact, FactProvenance, NormalizedRule } from '../../domain/models/normalized-rule';

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
  /**
   * GT-716 AC2 — decided over a posture only the satellite's owners can declare
   * (`supplied` facets: tenancy posture, runtime intent, the open-core boundary, a
   * knowledge-intake record). The OPA engine decides it when the caller supplies the
   * facet through `facts.satellite`; the native engine never can, and calling it
   * `unimplemented-native` promised a handler that had nothing to read.
   */
  | 'needs-supplied-facts'
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
  | 'no-policy-in-bundle'
  /**
   * GT-716 AC1 — the policy that decides this rule reads a fact this run did not
   * supply, so the bundle was NOT asked for a verdict.
   *
   * A Rego body whose fact is absent is undefined: `not input.adapter.schemaValidated`
   * fires and `input.satellite.git.branchNameInvalid` never matches, and both used to
   * come back as verdicts. On a fresh satellite 73 of the 76 rules only the OPA engine
   * decided were exactly that. Like `no-policy-in-bundle` this is a statement the OPA
   * path makes at evaluation time; the native triage never produces it. It stays in
   * the denominator: supplying the fact through `facts.satellite` (GT-694) makes the
   * rule run.
   */
  | 'supplied-facet-absent';

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

/** Most demanding first: a rule's class is that of its most demanding fact. */
const PROVENANCE_RANK: Readonly<Record<FactProvenance, number>> = { observed: 0, supplied: 1, external: 2, runtime: 3 };

const CLASS_OF_PROVENANCE: Readonly<Record<FactProvenance, RuleEvaluability>> = {
  observed: 'unimplemented-native',
  supplied: 'needs-supplied-facts',
  external: 'needs-external-system',
  runtime: 'needs-runtime',
};

/**
 * GT-716 AC2 — the class a declaration implies for a rule NO handler evaluates.
 *
 * `[]` is a statement too: the rule names no machine-checkable fact. With a
 * `validationQuery` that is a judgement or the generator placeholder it is
 * documentation; with none at all it is a check nobody authored yet.
 */
export function evaluabilityOfFacts(
  facts: readonly DeclaredFact[],
  rule: Pick<NormalizedRule, 'validationQuery' | 'category'>,
): TriageEntry {
  if (facts.length === 0) {
    // A generated ADR-conformance rule is documentation whether its validationQuery
    // is the placeholder sentence or absent (the attestation variant has none): the
    // generator, not an author, left it without a check.
    if (rule.category === ADR_CONFORMANCE_CATEGORY && hasNoAuthoredCheck(rule.validationQuery)) {
      return {
        evaluability: 'documentation-only',
        why: 'Auto-generated ADR-conformance rule that declares no fact — the harness never wired a check.',
      };
    }
    return (rule.validationQuery ?? '').trim().length === 0
      ? { evaluability: 'underspecified', why: 'The rule declares no facts and no validationQuery — there is no check to implement yet.' }
      : { evaluability: 'documentation-only', why: 'The rule declares no machine-checkable fact: a judgement, a board process, or a generator placeholder.' };
  }
  const top = [...facts].sort((a, b) => PROVENANCE_RANK[b.provenance] - PROVENANCE_RANK[a.provenance])[0];
  const listed = facts.map(f => `${f.facet} (${f.provenance})`).join(', ');
  return {
    evaluability: CLASS_OF_PROVENANCE[top.provenance],
    why: `Declared facts: ${listed}.${top.why ? ` ${top.why}` : ''}`,
  };
}

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
 * handlers) so this module stays pure and testable without an engine. A rule that
 * carries a `facts` declaration is classified from it; one that does not (a tenant
 * pack, a fixture) gets the defaults the table used to give.
 */
export function classifyRule(rule: NormalizedRule, hasNativeHandler: boolean): TriageEntry {
  if (hasNativeHandler) {
    return { evaluability: 'native-handler', why: 'A native handler claims this rule.' };
  }

  // GT-716 AC2 — the rule's own declaration, when the pack carries one.
  if (rule.facts) return evaluabilityOfFacts(rule.facts, rule);

  // No declaration (a tenant pack, a fixture): the pre-GT-716 defaults.
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
    'needs-supplied-facts': 0,
    'documentation-only': 0,
    underspecified: 0,
    // GT-675: reported by the OPA path only. The native triage table never
    // produces it, so it stays 0 on every native run and the six existing
    // figures are unchanged.
    'no-policy-in-bundle': 0,
    // GT-716: the same — reported by the OPA path only.
    'supplied-facet-absent': 0,
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
