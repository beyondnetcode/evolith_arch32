import { ILogger, IFileSystem, IConfigParser } from '../../domain/interfaces';
import { IRulesetRepository } from '../../domain/ports/ruleset-repository.port';
import { TopologyCatalogService } from '../services/topology-catalog.service';
import type { IProcessRunner } from './enforcement/enforcer.types';
import type { IEnforcerMetrics } from './enforcement/enforcer-metrics';

/**
 * GT-569 — the denominator a coverage claim is meaningless without.
 *
 * `rulesChecked` on its own says nothing: a corpus of 379 rules of which 108
 * are evaluated reports "111 checked" and reads as a full pass. These counters
 * make the shape of the run explicit, and they always satisfy
 * `rulesChecked + rulesSkipped + rulesErrored === rulesTotal`.
 */
export interface RuleCoverage {
  /** Rules the engine ACTUALLY evaluated (passed + failed). */
  rulesChecked: number;
  /** Rules not evaluated because no handler supports them / evidence is external. */
  rulesSkipped: number;
  /** Rules not evaluated because their handler threw. Never conflated with skipped. */
  rulesErrored: number;
  /** The denominator: every rule the engine was handed. */
  rulesTotal: number;
  /** Ids of the rules counted in `rulesSkipped`. */
  skippedRuleIds: string[];
  /** Ids of the rules counted in `rulesErrored`. */
  erroredRuleIds: string[];

  /**
   * GT-595 — the part of `rulesSkipped` that nothing will ever evaluate.
   *
   * A SUBSET of `rulesSkipped`, deliberately: the GT-569 invariant
   * `rulesChecked + rulesSkipped + rulesErrored === rulesTotal` is untouched.
   * 129 of this repository's rules are documentation (126 auto-generated
   * ADR-conformance placeholders whose own text says no check was wired, plus 3
   * board-judgement rules) or declare no check at all. Counting them as
   * unevaluated made coverage look 34 points worse than the fixable figure and,
   * worse, made it un-improvable — no handler closes a rule with nothing in it.
   */
  rulesNonExecutable?: number;
  nonExecutableRuleIds?: string[];
  /**
   * `rulesTotal − rulesNonExecutable`. The denominator a coverage claim should
   * be read against, because it counts only rules an engine or adapter can run.
   */
  rulesExecutable?: number;
  /**
   * Rules flagged `blocking: true` that can never be evaluated. A blocking rule
   * that structurally cannot run is a promise the product does not keep.
   */
  blockingNonExecutableRuleIds?: string[];
  /**
   * GT-595 (AC2) — every rule that declared `blocking: true` and came back
   * `skipped`. A SUPERSET of {@link blockingNonExecutableRuleIds}: that list is
   * the subset nothing will EVER run, this one also includes blocking rules that
   * merely have no handler yet.
   *
   * Non-empty ⇒ the run FAILS. A blocking rule that skips is reported today with
   * the same absence of findings as a blocking rule that passed, so the verdict
   * claims coverage it did not earn. The counters are machine-readable here and
   * the run-failing issue is `GOV-RULE-BLOCKING-SKIPPED`; both are emitted from
   * the same pass so they cannot disagree.
   */
  blockingSkippedRuleIds?: string[];
  /** GT-595 AC3 — `handled / executable / total` per ruleset file. */
  perRuleset?: RulesetCoverageRatio[];
}

/** GT-595 AC3 — the coverage of one `*.rules.json`, so the ratio is per ruleset. */
export interface RulesetCoverageRatio {
  sourceFile: string;
  /** Rules of this file a native handler evaluated. */
  handled: number;
  /** Rules of this file that an engine or adapter could run (total − non-executable). */
  executable: number;
  total: number;
}

/**
 * GT-571 — the part of the corpus that never reached the evaluator because it
 * does not address this repository (Core-only rules against a satellite, rules
 * of an undeclared topology, rules of a later SDLC phase).
 *
 * Kept OUTSIDE the GT-569 denominator on purpose. `skipped` means "the engine
 * tried to evaluate this and could not"; a rule addressed to somebody else was
 * never a candidate, and counting it as skipped would inflate the unevaluated
 * fraction — enough, with a `maxSkippedFraction` configured, to fail a
 * repository with nothing wrong with it. The invariant
 * `rulesChecked + rulesSkipped + rulesErrored === rulesTotal` therefore still
 * holds exactly, and `corpusTotal = rulesTotal + rulesNotApplicable` names the
 * full corpus so the exclusion is visible rather than silent.
 */
export interface RuleApplicabilitySummary {
  /** Rules excluded before evaluation. */
  rulesNotApplicable: number;
  /** Ids of those rules, with the reason, so the exclusion can be audited. */
  notApplicableRuleIds: string[];
  /** `rulesTotal + rulesNotApplicable` — every rule the corpus contains. */
  corpusTotal: number;
}

export interface ValidationResult {
  status: 'passed' | 'failed' | 'warning';
  rulesChecked: number;
  /**
   * GT-569 coverage denominator. Declared OPTIONAL only so the wire envelope
   * stays additive and pre-existing producers of `ValidationResult` keep
   * compiling; `RulesetValidatorService.validate` always populates all six.
   */
  rulesSkipped?: number;
  rulesErrored?: number;
  rulesTotal?: number;
  skippedRuleIds?: string[];
  erroredRuleIds?: string[];
  /**
   * GT-571 applicability summary. Optional for the same additive reason as the
   * GT-569 counters; `RulesetValidatorService.validate` always populates it.
   */
  rulesNotApplicable?: number;
  notApplicableRuleIds?: string[];
  corpusTotal?: number;
  /**
   * GT-595 evaluability breakdown. Optional for the same additive reason as the
   * GT-569 counters; `RulesetValidatorService.validate` always populates them.
   */
  rulesNonExecutable?: number;
  nonExecutableRuleIds?: string[];
  rulesExecutable?: number;
  blockingNonExecutableRuleIds?: string[];
  /** GT-595 AC2 — blocking rules that did not run. Non-empty ⇒ `status: 'failed'`. */
  blockingSkippedRuleIds?: string[];
  perRuleset?: RulesetCoverageRatio[];
  /**
   * GT-661 — WHY these rules were evaluated, not just how many.
   *
   * The verdict was previously silent about its own scope, so a caller could not
   * tell «this blocked because I asked for this pack» from «this blocked because
   * the Core evaluated everything it has». Measured on the Evolith Core
   * repository, no selection yields **85 blocking issues of 113** — every one of
   * them from a rule the caller never chose. A report that cannot express that
   * distinction cannot support the principle it is supposed to serve: the Core
   * PROPOSES, and the client configures and selects.
   *
   * Optional for the same additive reason as the GT-569 counters;
   * `RulesetValidatorService.validate` always populates it.
   */
  selection?: SelectionReport;
  issues: ValidationIssue[];
  coreRef: {
    version: string | null;
    path: string | null;
  };
  timestamp: string;
}

/**
 * GT-661 — the scope of a verdict, stated rather than inferred.
 *
 * `source` is the field the row exists for. `core-default` means the caller
 * named nothing and received the Core's PROPOSAL: the whole corpus, blocking
 * rules included. It is not an imposition — the Core has no tenant
 * configuration to consult and refuses to guess one — but a reader must be able
 * to see that the scope was chosen by default rather than requested, because a
 * failure under `core-default` and a failure under `caller` mean different
 * things to whoever has to act on it.
 */
export interface SelectionReport {
  /** `caller` when refs were supplied; `core-default` when none were. */
  source: 'caller' | 'core-default';
  /** Refs the caller named, deduplicated and trimmed. Empty under `core-default`. */
  requested: string[];
  /** Of `requested`, those that matched at least one rule. */
  matched: string[];
  /**
   * Of `requested`, those that matched NOTHING.
   *
   * Non-empty ⇒ the validator emitted a blocking `SEL-01`. Published separately
   * so a consumer can act on it without parsing issue text: zero rules evaluated
   * with zero violations is indistinguishable from a clean repository, and this
   * is the field that tells them apart.
   */
  unmatched: string[];
  /** Rules the selection admitted, before applicability filtering. */
  rulesSelected: number;
  /** Rules in the corpus. Under `core-default`, equal to `rulesSelected`. */
  corpusTotal: number;
}

export interface ValidationIssue {
  ruleId: string;
  severity: 'MUST' | 'SHOULD' | 'COULD';
  category: string;
  title: string;
  description: string;
  file?: string;
  expected?: string;
  actual?: string;
  blocking: boolean;
  /**
   * GT-699 — is this a VERDICT about the repository, or an ADMISSION that the rule
   * could not be evaluated?
   *
   * Absent means verdict, which is what every finding before this field was assumed
   * to be. `false` means the rule never ran. Measured on this repository the day the
   * field was added: `evolith validate` reported 82 blocking issues, **74** of which
   * were admissions, and nothing on the issue distinguished them from the 8 real
   * violations — same fields, same `severity: MUST`, same `blocking: true`.
   *
   * GT-595 is untouched: an unevaluated blocking rule stays `blocking: true` and can
   * never read as green. This only makes the partition the run already publishes in
   * its counters (`blockingSkippedRuleIds`, `rulesNonExecutable`) survive into the
   * array a human and the Tracker actually read.
   */
  evaluated?: boolean;
}

export interface EvolithYaml {
  coreRef?: {
    version?: string;
    path?: string;
  };
  governance?: {
    version?: string;
    adrRegistry?: Array<{ id: string; status: string }>;
  };
  product?: {
    name?: string;
    type?: string;
  };
}

export interface ArchitectureValidationResult {
  status: 'passed' | 'failed' | 'warning';
  levels: string[];
  rulesChecked: number;
  /** GT-569 — same denominator contract as {@link ValidationResult}. */
  rulesSkipped?: number;
  rulesErrored?: number;
  rulesTotal?: number;
  skippedRuleIds?: string[];
  erroredRuleIds?: string[];
  /** GT-571 — same applicability contract as {@link ValidationResult}. */
  rulesNotApplicable?: number;
  notApplicableRuleIds?: string[];
  corpusTotal?: number;
  issues: ValidationIssue[];
  timestamp: string;
}

export interface RulesetValidatorOptions {
  fileSystem?: IFileSystem;
  configParser?: IConfigParser;
  logger?: ILogger;
  engineType?: 'native' | 'opa';
  rulesetRepo?: IRulesetRepository;
  topologyCatalog?: TopologyCatalogService;
  /**
   * Optional process runner (e.g. the real `NodeProcessRunner`). When provided, the
   * validator wraps its strategy with the enforcer subsystem so `enforce:`-routed rules
   * run their external analyzers (GT-524 wiring). Absent ⇒ native/opa strategy only.
   */
  processRunner?: IProcessRunner;
  /**
   * Optional OTel metrics port for the enforcer subsystem (GT-519 · EAG-14 — AC3). When a
   * host wires a real `Meter`-backed {@link IEnforcerMetrics} adapter here, every enforcer
   * run emits duration/failure/timeout/violation telemetry through the {@link EnforcerEvaluator}
   * seam. Absent ⇒ the zero-cost `NoopEnforcerMetrics` default (behaviour-identical). Only
   * consulted when `processRunner` is also present (no enforcer subsystem ⇒ nothing to meter).
   */
  metrics?: IEnforcerMetrics;
  /**
   * GT-569 — optional coverage floor. When set to a fraction in `[0, 1]`, a run
   * whose UNEVALUATED fraction (`(rulesSkipped + rulesErrored) / rulesTotal`)
   * exceeds it emits the blocking `GOV-COVERAGE-THRESHOLD` issue, so the verdict
   * fails instead of signing off on a corpus that mostly did not run.
   *
   * Absent ⇒ no threshold is enforced (behaviour-identical to pre-GT-569): the
   * counters are still reported, they just do not gate.
   */
  maxSkippedFraction?: number;
  /**
   * GT-571 — set to `false` to evaluate the ENTIRE corpus regardless of rule
   * `audience`, declared topology or SDLC phase (the pre-GT-571 behaviour).
   *
   * Defaults to `true`: a satellite is not evaluated against the vendor's own
   * monorepo rules, nor against the rules of seven topologies it did not
   * declare. The escape hatch exists for corpus-wide audits, not for normal
   * validation.
   */
  applyRuleApplicability?: boolean;
}

export const RULESET_VALIDATOR_OPTIONS = 'RULESET_VALIDATOR_OPTIONS';
