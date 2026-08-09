import { Injectable, Optional, Inject } from '@nestjs/common';
import * as path from 'path';
import { ILogger, IFileSystem, IConfigParser } from '../../domain/interfaces';
import { RuleEvaluationEngine, emptyRuleCoverage, summarizeRuleCoverage } from './rule-evaluation-engine';
import { RulesetsNotFoundError } from '../../domain/ports/ruleset-repository.port';
import { NativeEvaluator } from './evaluators/native-evaluator';
import { OpaEvaluator } from './evaluators/opa-evaluator';
import { createCompositeEnforcerStrategy } from './enforcement/enforcer-subsystem';
import { TopologyCatalogService } from '../services/topology-catalog.service';
import {
  ArchitectureValidationResult, EvolithYaml, RULESET_VALIDATOR_OPTIONS,
  RuleCoverage, RulesetValidatorOptions, ValidationIssue, ValidationResult,
} from './ruleset-validator.types';
import { loadRulesetById } from './ruleset-id-loader';
import type { RulesetSelection } from './ruleset-selection';
import { runArchitectureValidation } from './architecture-validator';
import type { NotApplicableRule, RuleApplicabilityFilter } from './rule-evaluation-engine';
import {
  RuleApplicabilityIndex,
  describeNotApplicable,
  resolveApplicabilityContext,
} from './rule-applicability';

export {
  ValidationResult, ValidationIssue, EvolithYaml, ArchitectureValidationResult,
  RuleCoverage, RuleApplicabilitySummary, RulesetValidatorOptions, RULESET_VALIDATOR_OPTIONS,
} from './ruleset-validator.types';

@Injectable()
export class RulesetValidatorService {
  private readonly logger: ILogger;
  private readonly fs: IFileSystem;
  private readonly configParser: IConfigParser;
  private readonly engine: RuleEvaluationEngine;
  private readonly topologyCatalog?: TopologyCatalogService;
  /** GT-569 — optional coverage floor; see {@link RulesetValidatorOptions.maxSkippedFraction}. */
  private readonly maxSkippedFraction?: number;
  /** GT-571 — filter the corpus by rule audience / topology / SDLC phase. */
  private readonly applyRuleApplicability: boolean;

  constructor(@Optional() @Inject(RULESET_VALIDATOR_OPTIONS) options?: RulesetValidatorOptions) {
    if (!options?.fileSystem) throw new Error('IFileSystem is required');
    if (!options?.logger) throw new Error('ILogger is required');
    if (!options?.configParser) throw new Error('IConfigParser is required');
    if (!options?.rulesetRepo) throw new Error('IRulesetRepository is required');

    this.logger = options.logger;
    this.fs = options.fileSystem;
    this.configParser = options.configParser;
    this.topologyCatalog = options.topologyCatalog;
    this.maxSkippedFraction = options.maxSkippedFraction;
    this.applyRuleApplicability = options.applyRuleApplicability !== false;

    const baseStrategy = options.engineType === 'opa'
      ? new OpaEvaluator(this.fs, this.logger)
      : new NativeEvaluator(this.fs, this.logger, this.configParser);

    // GT-524 wiring: when a host injects a process runner, route `enforce:` rules through
    // the enforcer subsystem (sandbox-wrapped adapters). Non-forking — without enforcer
    // rules the composite delegates everything to the base strategy.
    const strategy = options.processRunner
      ? createCompositeEnforcerStrategy(baseStrategy, options.processRunner, { metrics: options.metrics })
      : baseStrategy;

    this.engine = new RuleEvaluationEngine({
      fileSystem: this.fs,
      logger: this.logger,
      strategy,
      rulesetRepo: options.rulesetRepo,
      configParser: this.configParser,
    });
  }

  /**
   * GT-659 — `selection` is what the CALLER asked to be evaluated against.
   *
   * Optional and additive: absent means the whole corpus, which is what every
   * existing caller gets and what every recorded verdict was produced under.
   */
  async validate(
    satellitePath: string,
    corePath?: string,
    selection?: RulesetSelection,
  ): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    // GT-569: the verdict reports its own denominator. `rulesChecked` keeps
    // meaning "actually evaluated"; the rest of the corpus is no longer
    // invisible — it is counted, named, and (for MUST rules) surfaced as a
    // WARNING issue by `toValidationIssues`.
    let coverage: RuleCoverage = emptyRuleCoverage();
    // GT-571: rules the corpus contains but that do not address this repository.
    // Deliberately NOT folded into `coverage` — see RuleApplicabilitySummary.
    let notApplicable: NotApplicableRule[] = [];

    const resolvedCorePath = corePath || this.findCorePath(satellitePath);
    const evolithYamlPath = path.join(satellitePath, 'evolith.yaml');

    let coreRefVersion: string | null = null;
    let coreRefPath: string | null = null;

    if (await this.fs.exists(evolithYamlPath)) {
      const evolithYaml = await this.loadEvolithYaml(evolithYamlPath);
      coreRefVersion = evolithYaml.coreRef?.version || null;
      coreRefPath = evolithYaml.coreRef?.path || null;
    } else {
      issues.push({
        ruleId: 'GOV-000',
        severity: 'MUST',
        category: 'governance',
        title: 'Missing evolith.yaml',
        description: 'Every satellite repository must have an evolith.yaml file at the root.',
        blocking: true,
      });
    }

    try {
      const filter = await this.buildApplicabilityFilter(satellitePath, resolvedCorePath);
      const { results: engineResults, notApplicable: excluded, selection: applied } =
        await this.engine.discoverAndEvaluate(satellitePath, resolvedCorePath, filter, selection);
      notApplicable = excluded;

      // GT-659 — a ref that matched NOTHING is a caller asking for a ruleset this
      // Core does not have, and the one answer it must never receive is a clean
      // report. Zero rules evaluated with zero violations is indistinguishable
      // from a passing satellite, which is exactly the shape of false assurance
      // this validator already refuses elsewhere (GT-474, the empty corpus).
      if (applied?.unmatched.length) {
        issues.push({
          ruleId: 'SEL-01',
          severity: 'MUST',
          category: 'ruleset-selection',
          title: 'Requested ruleset not found in this Core',
          description:
            `${applied.unmatched.length} requested ruleset ref(s) matched no rule in the corpus: ` +
            `${applied.unmatched.join(', ')}. Nothing was evaluated against them, so this report says ` +
            'nothing about them. The available refs are published by the reference catalogue.',
          blocking: true,
        });
      }
      coverage = summarizeRuleCoverage(engineResults);
      issues.push(...this.engine.toValidationIssues(engineResults));
      const applicabilityIssue = this.applicabilityAdvisory(notApplicable);
      if (applicabilityIssue) issues.push(applicabilityIssue);
      const thresholdIssue = this.coverageThresholdIssue(coverage);
      if (thresholdIssue) issues.push(thresholdIssue);
    } catch (err: unknown) {
      // GT-474: an unresolvable/empty ruleset corpus must never be downgraded to
      // a warning here — that is exactly how `validate` came to report
      // `rulesChecked: 0` with a reassuring status. Let it abort the run.
      if (err instanceof RulesetsNotFoundError) throw err;
      this.logger.warn(`Rule engine error: ${err instanceof Error ? err.message : String(err)}`);
    }

    const status = issues.some(i => i.blocking) ? 'failed' : issues.length > 0 ? 'warning' : 'passed';

    return {
      status,
      rulesChecked: coverage.rulesChecked,
      rulesSkipped: coverage.rulesSkipped,
      rulesErrored: coverage.rulesErrored,
      rulesTotal: coverage.rulesTotal,
      skippedRuleIds: coverage.skippedRuleIds,
      erroredRuleIds: coverage.erroredRuleIds,
      rulesNotApplicable: notApplicable.length,
      notApplicableRuleIds: notApplicable.map(n => n.rule.id),
      corpusTotal: coverage.rulesTotal + notApplicable.length,
      // GT-595 — the classification behind `rulesSkipped`, so a reader can tell
      // coverage debt from rules that nothing will ever run.
      rulesNonExecutable: coverage.rulesNonExecutable,
      nonExecutableRuleIds: coverage.nonExecutableRuleIds,
      rulesExecutable: coverage.rulesExecutable,
      blockingNonExecutableRuleIds: coverage.blockingNonExecutableRuleIds,
      // GT-595 AC2 — every blocking rule that did not run. Non-empty ⇒ the
      // engine emitted one `blocking: true` issue per id, so `status` is
      // 'failed' above; the ids are published so the offenders are enumerable
      // without parsing issue text.
      blockingSkippedRuleIds: coverage.blockingSkippedRuleIds,
      perRuleset: coverage.perRuleset,
      issues,
      coreRef: { version: coreRefVersion, path: coreRefPath },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GT-571 — build the corpus pre-filter for this run, or `undefined` when the
   * host opted out via `applyRuleApplicability: false`.
   *
   * Fail-open: if the applicability facts cannot be read the run proceeds with
   * NO filter, i.e. exactly the pre-GT-571 behaviour. A broken index must never
   * be able to hide a rule.
   */
  private async buildApplicabilityFilter(
    satellitePath: string,
    corePath: string,
  ): Promise<RuleApplicabilityFilter | undefined> {
    if (!this.applyRuleApplicability) return undefined;
    try {
      const [index, context] = await Promise.all([
        RuleApplicabilityIndex.load(this.fs, corePath, path.sep),
        resolveApplicabilityContext(
          { fs: this.fs, configParser: this.configParser },
          satellitePath,
          corePath,
          path.sep,
        ),
      ]);
      return { index, context };
    } catch (err: unknown) {
      this.logger.warn(
        `Rule applicability could not be resolved; evaluating the full corpus: ` +
        `${err instanceof Error ? err.message : String(err)}`,
      );
      return undefined;
    }
  }

  /**
   * GT-571 — an exclusion must be visible, not silent.
   *
   * Non-blocking by construction: it reports rules that were never candidates,
   * which is information, not a violation. It is what stops "0 blocking
   * findings" from meaning "we quietly stopped looking".
   */
  private applicabilityAdvisory(notApplicable: readonly NotApplicableRule[]): ValidationIssue | undefined {
    if (notApplicable.length === 0) return undefined;

    const byReason = new Map<string, string[]>();
    for (const n of notApplicable) {
      const bucket = byReason.get(n.reason) ?? [];
      bucket.push(n.rule.id);
      byReason.set(n.reason, bucket);
    }

    const parts = [...byReason.entries()].map(
      ([reason, ids]) =>
        `${ids.length} ${describeNotApplicable(reason as NotApplicableRule['reason'])} ` +
        `(e.g. ${ids.slice(0, 5).join(', ')}${ids.length > 5 ? ', …' : ''})`,
    );

    return {
      ruleId: 'GOV-RULE-NOT-APPLICABLE',
      severity: 'COULD',
      category: 'governance',
      title: `${notApplicable.length} corpus rules do not apply to this repository`,
      description:
        `${notApplicable.length} of the corpus rules were excluded BEFORE evaluation: ` +
        `${parts.join('; ')}. They are not counted as checked, skipped or errored — ` +
        'they were never candidates. Declare a topology in `spec.design.topology.confirmed` ' +
        'and advance `spec.sdlc.currentPhase` in evolith.yaml to bring the corresponding ' +
        'rules into scope.',
      blocking: false,
    };
  }

  /**
   * GT-569 (AC3): a run whose unevaluated fraction exceeds the configured floor
   * must FAIL rather than sign off on a corpus that mostly did not execute.
   * Opt-in — with no `maxSkippedFraction` configured this returns `undefined`
   * and behaviour is identical to pre-GT-569.
   */
  private coverageThresholdIssue(coverage: RuleCoverage): ValidationIssue | undefined {
    const threshold = this.maxSkippedFraction;
    if (threshold === undefined || coverage.rulesTotal === 0) return undefined;

    // GT-595: measure against the EXECUTABLE corpus. Charging the gate for 129
    // rules that carry no check made the floor unreachable by any amount of
    // engineering, which is the fastest way to get a threshold switched off.
    // Non-executable rules are still named, in the description and in
    // `GOV-RULE-NON-EXECUTABLE`, so the exclusion is auditable rather than
    // convenient.
    const nonExecutable = coverage.rulesNonExecutable ?? 0;
    const denominator = coverage.rulesExecutable ?? coverage.rulesTotal;
    if (denominator === 0) return undefined;

    const unevaluated = coverage.rulesSkipped - nonExecutable + coverage.rulesErrored;
    const fraction = unevaluated / denominator;
    if (fraction <= threshold) return undefined;

    const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
    const exclusion =
      nonExecutable > 0
        ? ` ${nonExecutable} further rules are excluded from the denominator as non-executable ` +
          '(documentation-only or declaring no check at all); see GOV-RULE-NON-EXECUTABLE.'
        : '';

    return {
      ruleId: 'GOV-COVERAGE-THRESHOLD',
      severity: 'MUST',
      category: 'governance',
      title: 'Rule coverage below the configured floor',
      description:
        `${unevaluated} of ${denominator} executable rules were not evaluated ` +
        `(${coverage.rulesSkipped - nonExecutable} skipped, ${coverage.rulesErrored} errored) — ${pct(fraction)}, ` +
        `above the configured maximum of ${pct(threshold)}. Only ${coverage.rulesChecked} rules actually ran, ` +
        `so this verdict does not cover the declared corpus (${coverage.rulesTotal} rules).${exclusion}`,
      blocking: true,
    };
  }

  async loadRulesetById(corePath: string, rulesetId: string): Promise<ValidationIssue[]> {
    return loadRulesetById(this.fs, this.logger, corePath, rulesetId);
  }

  async validateArchitecture(
    satellitePath: string,
    corePath?: string,
    options?: { level?: string; topologies?: string[] },
  ): Promise<ArchitectureValidationResult> {
    const resolvedCorePath = corePath || this.findCorePath(satellitePath);
    return runArchitectureValidation(
      { fs: this.fs, engine: this.engine, topologyCatalog: this.topologyCatalog },
      satellitePath,
      resolvedCorePath,
      options,
    );
  }

  private async loadEvolithYaml(filePath: string): Promise<EvolithYaml> {
    const content = await this.fs.readFile(filePath);
    return this.configParser.parse(content) as EvolithYaml;
  }

  private findCorePath(satellitePath: string): string {
    const parts = satellitePath.split(path.sep);
    while (parts.length > 0) {
      parts.pop();
      const candidate = path.join(parts.join(path.sep), 'rulesets');
      if (this.fs.existsSync(candidate)) {
        return parts.join(path.sep);
      }
    }
    return path.join(satellitePath, '..', 'evolith');
  }
}
