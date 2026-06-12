/* eslint-disable boundaries/element-types */
import * as path from 'path';
import { IFileSystem, ILogger } from '../../domain/interfaces';
import { NodeFileSystemProvider } from '../../infrastructure/providers/node-filesystem.provider';
import { NestLoggerProvider } from '../../infrastructure/providers/logger.provider';
import { YamlConfigParserProvider } from '../../infrastructure/providers/config-parser.provider';
import { ValidationIssue } from './ruleset-validator.service';
import { IRuleEvaluatorStrategy, EvaluationContext, RuleEvaluationResult } from './evaluators/evaluator.interface';
import { NativeEvaluator } from './evaluators/native-evaluator';
import { IRulesetRepository } from '../../domain/ports/ruleset-repository.port';
import { DiskRulesetRepository } from '../../infrastructure/adapters/disk-ruleset.repository';

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

  constructor(options?: { fileSystem?: IFileSystem; logger?: ILogger, strategy?: IRuleEvaluatorStrategy, rulesetRepo?: IRulesetRepository }) {
    const fs = options?.fileSystem ?? new NodeFileSystemProvider().createFileSystem();
    this.logger = options?.logger ?? new NestLoggerProvider().createLogger('RuleEvaluationEngine');
    this.strategy = options?.strategy ?? new NativeEvaluator(fs, this.logger);
    this.rulesetRepo = options?.rulesetRepo ?? new DiskRulesetRepository(fs, this.logger);
  }

  async discoverAndEvaluate(
    satellitePath: string,
    corePath: string,
  ): Promise<RuleEvaluationResult[]> {
    const rules = await this.rulesetRepo.loadAllRulesets(corePath);
    const ctx: EvaluationContext = { satellitePath, corePath };
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

