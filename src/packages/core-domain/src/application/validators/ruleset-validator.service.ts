import { Injectable, Optional, Inject } from '@nestjs/common';
import * as path from 'path';
import { ILogger, IFileSystem, IConfigParser } from '../../domain/interfaces';
import { RuleEvaluationEngine } from './rule-evaluation-engine';
import { RulesetsNotFoundError } from '../../domain/ports/ruleset-repository.port';
import { NativeEvaluator } from './evaluators/native-evaluator';
import { OpaEvaluator } from './evaluators/opa-evaluator';
import { TopologyCatalogService } from '../services/topology-catalog.service';
import {
  ArchitectureValidationResult, EvolithYaml, RULESET_VALIDATOR_OPTIONS,
  RulesetValidatorOptions, ValidationIssue, ValidationResult,
} from './ruleset-validator.types';
import { loadRulesetById } from './ruleset-id-loader';
import { runArchitectureValidation } from './architecture-validator';

export {
  ValidationResult, ValidationIssue, EvolithYaml, ArchitectureValidationResult,
  RulesetValidatorOptions, RULESET_VALIDATOR_OPTIONS,
} from './ruleset-validator.types';

@Injectable()
export class RulesetValidatorService {
  private readonly logger: ILogger;
  private readonly fs: IFileSystem;
  private readonly configParser: IConfigParser;
  private readonly engine: RuleEvaluationEngine;
  private readonly topologyCatalog?: TopologyCatalogService;

  constructor(@Optional() @Inject(RULESET_VALIDATOR_OPTIONS) options?: RulesetValidatorOptions) {
    if (!options?.fileSystem) throw new Error('IFileSystem is required');
    if (!options?.logger) throw new Error('ILogger is required');
    if (!options?.configParser) throw new Error('IConfigParser is required');
    if (!options?.rulesetRepo) throw new Error('IRulesetRepository is required');

    this.logger = options.logger;
    this.fs = options.fileSystem;
    this.configParser = options.configParser;
    this.topologyCatalog = options.topologyCatalog;

    const strategy = options.engineType === 'opa'
      ? new OpaEvaluator(this.fs, this.logger)
      : new NativeEvaluator(this.fs, this.logger, this.configParser);

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
    let rulesChecked = 0;

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
      const evaluated = engineResults.filter(r => r.result !== 'skipped');
      rulesChecked += evaluated.length;
      issues.push(...this.engine.toValidationIssues(engineResults));
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
      rulesChecked,
      issues,
      coreRef: { version: coreRefVersion, path: coreRefPath },
      timestamp: new Date().toISOString(),
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
