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
import { runArchitectureValidation } from './architecture-validator';

export {
  ValidationResult, ValidationIssue, EvolithYaml, ArchitectureValidationResult,
  RuleCoverage, RulesetValidatorOptions, RULESET_VALIDATOR_OPTIONS,
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

  async validate(satellitePath: string, corePath?: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    // GT-569: the verdict reports its own denominator. `rulesChecked` keeps
    // meaning "actually evaluated"; the rest of the corpus is no longer
    // invisible — it is counted, named, and (for MUST rules) surfaced as a
    // WARNING issue by `toValidationIssues`.
    let coverage: RuleCoverage = emptyRuleCoverage();

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
      const engineResults = await this.engine.discoverAndEvaluate(satellitePath, resolvedCorePath);
      coverage = summarizeRuleCoverage(engineResults);
      issues.push(...this.engine.toValidationIssues(engineResults));
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
      issues,
      coreRef: { version: coreRefVersion, path: coreRefPath },
      timestamp: new Date().toISOString(),
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

    const unevaluated = coverage.rulesSkipped + coverage.rulesErrored;
    const fraction = unevaluated / coverage.rulesTotal;
    if (fraction <= threshold) return undefined;

    const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
    return {
      ruleId: 'GOV-COVERAGE-THRESHOLD',
      severity: 'MUST',
      category: 'governance',
      title: 'Rule coverage below the configured floor',
      description:
        `${unevaluated} of ${coverage.rulesTotal} rules were not evaluated ` +
        `(${coverage.rulesSkipped} skipped, ${coverage.rulesErrored} errored) — ${pct(fraction)}, ` +
        `above the configured maximum of ${pct(threshold)}. Only ${coverage.rulesChecked} rules actually ran, ` +
        'so this verdict does not cover the declared corpus.',
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
