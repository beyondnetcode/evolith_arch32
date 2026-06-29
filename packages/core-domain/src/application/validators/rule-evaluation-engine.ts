/* eslint-disable boundaries/element-types */
import { IFileSystem, ILogger, IConfigParser } from '../../domain/interfaces';
import { ValidationIssue } from './ruleset-validator.service';
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

export type RuleResult = 'passed' | 'failed' | 'skipped';


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

  toValidationIssues(results: RuleEvaluationResult[]): ValidationIssue[] {
    return results
      .filter(r => r.result === 'failed')
      .map(r => ({
        ruleId: r.rule.id,
        severity: (r.rule.severity === 'MUST NOT' ? 'MUST' : r.rule.severity) as 'MUST' | 'SHOULD' | 'COULD',
        category: r.rule.category,
        title: r.rule.title,
        description: r.message ?? r.rule.description,
        blocking: r.rule.blocking,
      }));
  }
}

