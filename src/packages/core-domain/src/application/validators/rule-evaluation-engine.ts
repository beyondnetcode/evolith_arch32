import { IFileSystem, ILogger, IConfigParser } from '../../domain/interfaces';
import { ValidationIssue, RuleCoverage } from './ruleset-validator.types';
import { IRuleEvaluatorStrategy, WorkspaceEvaluationContext, RuleEvaluationResult } from './evaluators/evaluator.interface';
import { NativeEvaluator } from './evaluators/native-evaluator';
import { IRulesetRepository } from '../../domain/ports/ruleset-repository.port';

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
  let rulesChecked = 0;

  for (const r of results) {
    switch (r.result) {
      case 'skipped':
        skippedRuleIds.push(r.rule.id);
        break;
      case 'errored':
        erroredRuleIds.push(r.rule.id);
        break;
      default:
        rulesChecked += 1;
    }
  }

  return {
    rulesChecked,
    rulesSkipped: skippedRuleIds.length,
    rulesErrored: erroredRuleIds.length,
    rulesTotal: results.length,
    skippedRuleIds,
    erroredRuleIds,
  };
}

/** GT-569 — the zero value, so a run that evaluated nothing still reports a shape. */
export function emptyRuleCoverage(): RuleCoverage {
  return {
    rulesChecked: 0, rulesSkipped: 0, rulesErrored: 0, rulesTotal: 0,
    skippedRuleIds: [], erroredRuleIds: [],
  };
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
  };
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

  async discoverAndEvaluate(
    satellitePath: string,
    corePath: string,
  ): Promise<RuleEvaluationResult[]> {
    const rules = await this.rulesetRepo.loadAllRulesets(corePath);
    const ctx: WorkspaceEvaluationContext = { satellitePath, corePath };
    const results: RuleEvaluationResult[] = [];
    
    results.push(...await this.strategy.evaluateAll(rules, ctx));

    return results;
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
        });
        continue;
      }

      if (r.result === 'skipped' && reportedSeverity(r.rule.severity) === 'MUST') {
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
        });
      }
    }

    return issues;
  }
}

