import { IFileSystem, ILogger, IConfigParser } from '../../domain/interfaces';
import { ValidationIssue, RuleCoverage, RulesetCoverageRatio } from './ruleset-validator.types';
import {
  ClassifiedRule,
  RuleEvaluability,
  classifyRule,
  isNonExecutable,
  summarizeEvaluability,
} from './rule-evaluability';
import { IRuleEvaluatorStrategy, WorkspaceEvaluationContext, RuleEvaluationResult } from './evaluators/evaluator.interface';
import { NativeEvaluator } from './evaluators/native-evaluator';
import { IRulesetRepository } from '../../domain/ports/ruleset-repository.port';
import type { EvaluationFacts } from '../../domain/satellite-manifest';
import { NormalizedRule as CorpusRule } from '../../domain/models/normalized-rule';
import {
  ApplicabilityContext,
  NotApplicableReason,
  RuleApplicabilityIndex,
  notApplicableReason,
} from './rule-applicability';
import { selectRules, RulesetSelection, SelectionOutcome } from './ruleset-selection';
import { buildRulesetCatalog, RulesetCatalog } from './ruleset-catalog';

export interface NormalizedRule {
  id: string;
  severity: 'MUST' | 'SHOULD' | 'COULD' | 'MUST NOT';
  category: string;
  title: string;
  description: string;
  blocking: boolean;
  validationQuery?: string;
  sourceFile: string;
}

export type RuleResult = 'passed' | 'failed' | 'skipped' | 'errored';

/** GT-569 — `MUST NOT` is reported as `MUST`; everything else passes through. */
function reportedSeverity(severity: NormalizedRule['severity']): ValidationIssue['severity'] {
  return (severity === 'MUST NOT' ? 'MUST' : severity) as ValidationIssue['severity'];
}

/**
 * GT-569 — derive the coverage denominator from the raw engine results.
 *
 * `rulesChecked` keeps its historical meaning ("actually evaluated"), but it is
 * no longer emitted alone: `rulesSkipped`, `rulesErrored` and `rulesTotal` travel
 * with it so no consumer can read a coverage number without its denominator.
 */
export function summarizeRuleCoverage(results: readonly RuleEvaluationResult[]): RuleCoverage {
  const skippedRuleIds: string[] = [];
  const erroredRuleIds: string[] = [];
  const blockingSkippedRuleIds: string[] = [];
  let rulesChecked = 0;

  for (const r of results) {
    switch (r.result) {
      case 'skipped':
        skippedRuleIds.push(r.rule.id);
        // GT-595 AC2 — the combination the verdict cannot survive; see
        // `blockingSkippedIssue`.
        if (r.rule.blocking) blockingSkippedRuleIds.push(r.rule.id);
        break;
      case 'errored':
        erroredRuleIds.push(r.rule.id);
        break;
      default:
        rulesChecked += 1;
    }
  }

  const evaluability = summarizeEvaluability(results.map(classifyResult));

  return {
    rulesChecked,
    rulesSkipped: skippedRuleIds.length,
    rulesErrored: erroredRuleIds.length,
    rulesTotal: results.length,
    skippedRuleIds,
    erroredRuleIds,
    // GT-595 — a subset of `rulesSkipped`; the GT-569 identity still holds.
    rulesNonExecutable: evaluability.nonExecutable,
    nonExecutableRuleIds: [...evaluability.nonExecutableRuleIds],
    rulesExecutable: evaluability.executableTotal,
    blockingNonExecutableRuleIds: [...evaluability.blockingNonExecutable],
    // GT-595 AC2 — a superset of the line above: every blocking rule that did
    // not run, whether or not anything could ever run it.
    blockingSkippedRuleIds,
    perRuleset: evaluability.perRuleset.map(r => ({ ...r })),
  };
}

/**
 * GT-595 — classify one engine result.
 *
 * A handler that declined the rule may have stated the class itself; otherwise
 * fall back to the triage table. An outcome that actually RAN is
 * `native-handler` by construction, whatever the table says — the table
 * describes rules nobody evaluated, and a rule that just produced a verdict is
 * not one of them.
 */
function classifyResult(r: RuleEvaluationResult): ClassifiedRule {
  const ran = r.result === 'passed' || r.result === 'failed';
  const evaluability: RuleEvaluability = ran
    ? 'native-handler'
    : (r.evaluability ?? classifyRule(r.rule, false).evaluability);

  return {
    ruleId: r.rule.id,
    sourceFile: r.rule.sourceFile,
    blocking: r.rule.blocking,
    evaluability,
    why: r.message ?? '',
  };
}

/**
 * GT-595 (AC2) — `blocking` + `skipped` is the one combination a verdict cannot
 * survive.
 *
 * A blocking rule that skips produces exactly the same report as a blocking rule
 * that passed — no finding — so "0 blocking findings" is indistinguishable from
 * "the blocking rules never ran". GT-569 made the denominator honest and thereby
 * made this visible; this is the gate that acts on it.
 *
 * **Why a failed rule result and not a thrown error.** Both would surface the
 * defect; only one of them is unsuppressable HERE.
 *  - A throw from the engine is caught by `RulesetValidatorService.validate`,
 *    which logs `Rule engine error: …` and returns the verdict built from the
 *    remaining issues. The invariant would therefore be *silently downgraded to a
 *    warning by the only caller in the product* — the precise failure mode
 *    GT-474 fixed for an empty corpus.
 *  - A throw also aborts the corpus at the first offender, so the report would
 *    name one rule out of the 85 this repository currently has, and the next run
 *    would name the next one. An invariant you cannot enumerate cannot be closed.
 *  - As a `blocking: true` issue it flows through the ONE place both callers of
 *    the engine build their verdict from (`toValidationIssues`, used by
 *    `RulesetValidatorService.validate` and `runArchitectureValidation`), and
 *    `status = issues.some(i => i.blocking) ? 'failed' : …` fails the run with no
 *    opt-in switch to consult. Unlike `maxSkippedFraction` (GT-569, opt-in by
 *    design) there is no option that turns this off: a consumer would have to
 *    filter out a `blocking: true` issue, which is filtering out real violations.
 *
 * The rule's own outcome deliberately STAYS `skipped`. Rewriting it to `failed`
 * would move it into `rulesChecked` and re-inflate the coverage number with rules
 * that did not run — reintroducing, one field over, the dishonesty GT-569
 * removed. The rule did not run; it is the RUN that fails, not the rule that
 * passed a check.
 */
export function blockingSkippedIssue(r: RuleEvaluationResult): ValidationIssue {
  const evaluability = classifyResult(r).evaluability;
  const remedy = isNonExecutable(evaluability)
    ? 'Nothing can ever evaluate this rule as written, so `blocking: true` is a claim the engine cannot back: ' +
      'author a real validationQuery and a handler, or set `blocking: false` in the ruleset.'
    : 'Implement the handler/adapter this rule needs, or set `blocking: false` until it exists.';

  return {
    ruleId: r.rule.id,
    severity: reportedSeverity(r.rule.severity),
    category: r.rule.category,
    title: `Blocking rule did not run: ${r.rule.title}`,
    description:
      `[${r.rule.severity}] This rule is declared \`blocking: true\` and was NOT evaluated ` +
      `(${evaluability}). ${r.message ?? 'No handler supports it.'} ` +
      'A blocking rule that skips is reported exactly like a blocking rule that passed, so the run ' +
      `would claim coverage it did not earn. ${remedy}`,
    blocking: true,
    // GT-699 — this finding is an ADMISSION, not a verdict about the repository.
    //
    // Measured on this repository the day this field was added: `evolith validate`
    // reported 82 blocking issues, 74 of them of exactly this kind, and NOTHING on
    // the issue distinguished them from the 8 real violations — same fields, same
    // `severity: MUST`, same `blocking: true`. A reader saw 82 problems and had 8.
    //
    // GT-595 is untouched: the issue stays `blocking: true` so an unevaluated
    // blocking rule can never read as green. What changes is that a consumer can now
    // COUNT violations without counting "we could not check this" as one of them.
    evaluated: false,
  };
}

/** GT-569 — the zero value, so a run that evaluated nothing still reports a shape. */
export function emptyRuleCoverage(): RuleCoverage {
  return {
    rulesChecked: 0, rulesSkipped: 0, rulesErrored: 0, rulesTotal: 0,
    skippedRuleIds: [], erroredRuleIds: [],
    rulesNonExecutable: 0, nonExecutableRuleIds: [], rulesExecutable: 0,
    blockingNonExecutableRuleIds: [], blockingSkippedRuleIds: [], perRuleset: [],
  };
}

/**
 * GT-571 — a rule the corpus contains but that does not address this repository.
 *
 * It is NOT an outcome of evaluation: the rule never reached the evaluator, so
 * it is excluded from `rulesTotal` and the GT-569 invariant
 * (`checked + skipped + errored === total`) is untouched.
 */
export interface NotApplicableRule {
  readonly rule: CorpusRule;
  readonly reason: NotApplicableReason;
}

/** What {@link RuleEvaluationEngine.discoverAndEvaluate} returns. */
export interface CorpusEvaluation {
  /** Outcomes of the rules that WERE evaluated. */
  readonly results: RuleEvaluationResult[];
  /** Rules removed before evaluation because they address somebody else. */
  readonly notApplicable: NotApplicableRule[];
  /**
   * GT-659 — what the caller ASKED FOR, when it asked for anything.
   *
   * Absent when no selection was supplied, which is the unrestricted case and
   * today's behaviour. Present, it carries both numbers — the corpus size and
   * what was selected from it — so a report of "2 rules, 0 violations" can never
   * be read as "the whole corpus is clean", and it names any ref that matched
   * NOTHING so the caller can refuse instead of returning an empty pass.
   */
  readonly selection?: SelectionOutcome;
}

/** The applicability decision, injected so the engine stays free of I/O. */
export interface RuleApplicabilityFilter {
  readonly index: RuleApplicabilityIndex;
  readonly context: ApplicabilityContext;
}

/**
 * GT-571 — split the corpus into "addressed to this repository" and "not".
 * Exported so a caller can reason about the split without running an evaluation.
 */
export function partitionByApplicability(
  rules: readonly CorpusRule[],
  filter?: RuleApplicabilityFilter,
): { applicable: CorpusRule[]; notApplicable: NotApplicableRule[] } {
  if (!filter) return { applicable: [...rules], notApplicable: [] };

  const applicable: CorpusRule[] = [];
  const notApplicable: NotApplicableRule[] = [];

  for (const rule of rules) {
    const reason = notApplicableReason(filter.index.get(rule.id), filter.context);
    if (reason) notApplicable.push({ rule, reason });
    else applicable.push(rule);
  }

  return { applicable, notApplicable };
}

/** GT-569 — accumulate coverage across several engine invocations. */
export function mergeRuleCoverage(a: RuleCoverage, b: RuleCoverage): RuleCoverage {
  return {
    rulesChecked: a.rulesChecked + b.rulesChecked,
    rulesSkipped: a.rulesSkipped + b.rulesSkipped,
    rulesErrored: a.rulesErrored + b.rulesErrored,
    rulesTotal: a.rulesTotal + b.rulesTotal,
    skippedRuleIds: [...a.skippedRuleIds, ...b.skippedRuleIds],
    erroredRuleIds: [...a.erroredRuleIds, ...b.erroredRuleIds],
    rulesNonExecutable: (a.rulesNonExecutable ?? 0) + (b.rulesNonExecutable ?? 0),
    nonExecutableRuleIds: [...(a.nonExecutableRuleIds ?? []), ...(b.nonExecutableRuleIds ?? [])],
    rulesExecutable: (a.rulesExecutable ?? 0) + (b.rulesExecutable ?? 0),
    blockingNonExecutableRuleIds: [
      ...(a.blockingNonExecutableRuleIds ?? []),
      ...(b.blockingNonExecutableRuleIds ?? []),
    ],
    blockingSkippedRuleIds: [
      ...(a.blockingSkippedRuleIds ?? []),
      ...(b.blockingSkippedRuleIds ?? []),
    ],
    perRuleset: mergePerRuleset(a.perRuleset, b.perRuleset),
  };
}

/** Sum two per-ruleset tables by `sourceFile`, keeping the file order stable. */
function mergePerRuleset(
  a: readonly RulesetCoverageRatio[] = [],
  b: readonly RulesetCoverageRatio[] = [],
): RulesetCoverageRatio[] {
  const merged = new Map<string, RulesetCoverageRatio>();
  for (const r of [...a, ...b]) {
    const prev = merged.get(r.sourceFile);
    merged.set(
      r.sourceFile,
      prev
        ? {
            sourceFile: r.sourceFile,
            handled: prev.handled + r.handled,
            executable: prev.executable + r.executable,
            total: prev.total + r.total,
          }
        : { ...r },
    );
  }
  return [...merged.values()].sort((x, y) =>
    x.sourceFile < y.sourceFile ? -1 : x.sourceFile > y.sourceFile ? 1 : 0,
  );
}


export class RuleEvaluationEngine {
  private readonly logger: ILogger;
  private readonly strategy: IRuleEvaluatorStrategy;
  private readonly rulesetRepo: IRulesetRepository;

  constructor(options?: { fileSystem?: IFileSystem; logger?: ILogger, strategy?: IRuleEvaluatorStrategy, rulesetRepo?: IRulesetRepository, configParser?: IConfigParser }) {
    if (!options?.fileSystem) throw new Error('IFileSystem is required');
    if (!options?.logger) throw new Error('ILogger is required');
    if (!options?.rulesetRepo) throw new Error('IRulesetRepository is required');
    if (!options?.configParser && !options?.strategy) throw new Error('IConfigParser is required for default NativeEvaluator strategy');
    
    const fs = options.fileSystem;
    this.logger = options.logger;
    this.strategy = options.strategy ?? new NativeEvaluator(fs, this.logger, options.configParser!);
    this.rulesetRepo = options.rulesetRepo;
  }

  /**
   * Evaluate the corpus against a workspace.
   *
   * GT-571: when an {@link RuleApplicabilityFilter} is supplied, rules that are
   * not addressed to this repository (wrong audience, a topology it has not
   * declared, a later SDLC phase) are removed BEFORE evaluation. They are
   * returned separately in {@link CorpusEvaluation.notApplicable} — never as
   * `skipped`, which GT-569 reserves for "the engine tried and could not".
   *
   * With no filter the behaviour is byte-for-byte the pre-GT-571 one.
   *
   * GT-688 — `facts` are the DECLARED facts the consumer sent inline, projected
   * by `evaluation-context.builder.ts`. They belong on the workspace context
   * because that is the only object `OpaInputBuilder.build` reads: without them
   * `input.context` is absent from the input document every corpus policy sees,
   * so a policy that discriminates on a declared fact (GT-688's
   * `topology-composition.rego`, and GT-380's `input.context` consumers before
   * it) decides nothing and reports green. The gate path
   * (`satellite-evaluation-pipeline.evaluateGate`) has passed them since GT-380;
   * this path had not, which is why they reached one half of the engine only.
   *
   * Absent ⇒ byte-for-byte the pre-GT-688 input document.
   */
  async discoverAndEvaluate(
    satellitePath: string,
    corePath: string,
    filter?: RuleApplicabilityFilter,
    selection?: RulesetSelection,
    facts?: EvaluationFacts,
  ): Promise<CorpusEvaluation> {
    const rules = await this.rulesetRepo.loadAllRulesets(corePath);
    const ctx: WorkspaceEvaluationContext = { satellitePath, corePath, ...(facts ? { facts } : {}) };

    // GT-659 — the caller's selection is applied BEFORE applicability, because
    // the two answer different questions: selection is "which rulesets did you
    // ask for", applicability is "which of those address you". Doing it in this
    // order keeps `notApplicable` meaning what it has always meant — a rule
    // addressed to somebody else — instead of quietly absorbing rules the caller
    // never requested.
    //
    // No selection ⇒ the whole corpus, byte-for-byte the previous behaviour.
    const chosen = selectRules(rules, selection);

    const { applicable, notApplicable } = partitionByApplicability(chosen.selected, filter);
    const results = await this.strategy.evaluateAll(applicable, ctx);

    return {
      results,
      notApplicable,
      ...(chosen.unrestricted ? {} : { selection: chosen }),
    };
  }

  /**
   * GT-660 — what this Core can evaluate, for a caller that has to choose.
   *
   * It loads the corpus through the SAME `loadAllRulesets` call
   * {@link discoverAndEvaluate} uses, which is the whole point: a catalogue
   * assembled any other way could advertise a pack the engine does not carry, or
   * hide one it does. `--select` has told callers to use «the id the catalogue
   * publishes» since GT-659 while no surface published one; this is that surface's
   * single source.
   *
   * The Core PROPOSES here and decides nothing — no verdict, no default, no
   * opinion about what the caller ought to adopt.
   */
  async discoverCatalog(corePath: string): Promise<RulesetCatalog> {
    return buildRulesetCatalog(await this.rulesetRepo.loadAllRulesets(corePath));
  }

  /** GT-569 — coverage of a raw result set, exposed as a method for callers holding the engine. */
  summarizeCoverage(results: readonly RuleEvaluationResult[]): RuleCoverage {
    return summarizeRuleCoverage(results);
  }

  /**
   * Failed rules become issues, as before.
   *
   * GT-569 adds two ADVISORY (non-blocking, `SHOULD`-severity ⇒ WARNING) issues so
   * that a rule which never ran can no longer disappear from the report:
   *  - every rule whose handler THREW (`errored`), regardless of its severity;
   *  - every `MUST`/`MUST NOT` rule that was `skipped`.
   * Neither is blocking: they describe missing coverage, not a proven violation.
   * Gating on them is the job of `RulesetValidatorOptions.maxSkippedFraction`.
   *
   * GT-595 (AC2) adds ONE non-advisory case: a rule that declared
   * `blocking: true` and came back `skipped` emits a BLOCKING issue, so the run
   * fails. See {@link blockingSkippedIssue} for why that is a failed rule result
   * rather than a thrown error, and why it is emitted here.
   */
  toValidationIssues(results: RuleEvaluationResult[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const r of results) {
      if (r.result === 'failed') {
        issues.push({
          ruleId: r.rule.id,
          severity: reportedSeverity(r.rule.severity),
          category: r.rule.category,
          title: r.rule.title,
          description: r.message ?? r.rule.description,
          blocking: r.rule.blocking,
        });
        continue;
      }

      if (r.result === 'errored') {
        issues.push({
          ruleId: r.rule.id,
          severity: 'SHOULD',
          category: r.rule.category,
          title: `Rule evaluation errored: ${r.rule.title}`,
          description:
            `[${reportedSeverity(r.rule.severity)}] This rule was NOT evaluated — its handler threw. ` +
            `${r.message ?? 'No detail was reported by the evaluator.'} ` +
            'It is excluded from rulesChecked and counted in rulesErrored.',
          blocking: false,
          // GT-699 — an admission, not a verdict. The handler threw; the repository
          // was never judged.
          evaluated: false,
        });
        continue;
      }

      if (r.result === 'skipped' && r.rule.blocking) {
        // GT-595 AC2. This case is checked BEFORE the advisory below and takes
        // it over: the same rule must not be reported twice, once as a warning
        // and once as a blocker.
        issues.push(blockingSkippedIssue(r));
        continue;
      }

      if (r.result === 'skipped' && reportedSeverity(r.rule.severity) === 'MUST') {
        // GT-595: 129 of this corpus's rules are documentation or declare no
        // check at all. Emitting "MUST rule not evaluated" for each buried the
        // ~50 warnings that name real, closeable coverage debt under a hundred
        // that no handler can ever silence. They are reported once, in
        // aggregate, below — quieter but strictly MORE informative.
        if (isNonExecutable(classifyResult(r).evaluability)) continue;

        issues.push({
          ruleId: r.rule.id,
          severity: 'SHOULD',
          category: r.rule.category,
          title: `MUST rule not evaluated: ${r.rule.title}`,
          description:
            `[${r.rule.severity}] This rule was NOT evaluated. ` +
            `${r.message ?? 'No handler supports it.'} ` +
            'It is excluded from rulesChecked and counted in rulesSkipped — its outcome is UNKNOWN, not passing.',
          blocking: false,
          // GT-699 — the description already says the outcome is UNKNOWN; this makes
          // that machine-readable instead of a sentence a consumer has to parse.
          evaluated: false,
        });
      }
    }

    const nonExecutable = this.nonExecutableAdvisory(results);
    if (nonExecutable) issues.push(nonExecutable);

    return issues;
  }

  /**
   * GT-595 — one advisory naming every rule the corpus ships but nothing can run.
   *
   * Non-blocking on purpose: it reports a property of the RULESET, not a
   * violation by the repository under evaluation. Its value is that the
   * `blocking: true` rules in it can no longer be mistaken for enforcement —
   * on this corpus that is 91 auto-generated ADR placeholders and 14 security
   * and governance rules that state an obligation and no way to test it.
   */
  private nonExecutableAdvisory(results: readonly RuleEvaluationResult[]): ValidationIssue | undefined {
    const classified = results.map(classifyResult).filter(c => isNonExecutable(c.evaluability));
    if (classified.length === 0) return undefined;

    const byClass = new Map<RuleEvaluability, number>();
    for (const c of classified) byClass.set(c.evaluability, (byClass.get(c.evaluability) ?? 0) + 1);
    const breakdown = [...byClass.entries()].map(([k, n]) => `${n} ${k}`).join(', ');

    const blocking = classified.filter(c => c.blocking).map(c => c.ruleId);
    const blockingNote =
      blocking.length > 0
        ? ` ${blocking.length} of them are declared \`blocking: true\` yet can never produce a verdict ` +
          `(e.g. ${blocking.slice(0, 5).join(', ')}${blocking.length > 5 ? ', …' : ''}) — ` +
          'either author their check or drop the blocking flag.'
        : '';

    return {
      ruleId: 'GOV-RULE-NON-EXECUTABLE',
      severity: 'COULD',
      category: 'governance',
      title: `${classified.length} corpus rules are not executable by any engine`,
      description:
        `${classified.length} of the evaluated rules carry no check an engine or adapter could run ` +
        `(${breakdown}). They are counted in rulesSkipped for the GT-569 identity but excluded from ` +
        '`rulesExecutable`, because no handler closes a rule with nothing in it.' +
        blockingNote,
      blocking: false,
    };
  }
}

