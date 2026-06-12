import { IFileSystem, ILogger } from '../../abstractions';
import { NormalizedRule } from '../../../domain/models/normalized-rule';
import { IRuleEvaluatorStrategy, EvaluationContext, RuleEvaluationResult } from './evaluator.interface';
import { INativeRuleHandler } from './handlers/rule-handler.interface';
import { EvidenceRuleHandler } from './handlers/evidence-rule.handler';
import { CliReleaseRuleHandler } from './handlers/cli-release-rule.handler';
import { McpRuleHandler } from './handlers/mcp-rule.handler';
import { DependencyRuleHandler } from './handlers/dependency-rule.handler';
import { TaxonomyRuleHandler } from './handlers/taxonomy-rule.handler';
import { GovernanceRuleHandler } from './handlers/governance-rule.handler';
import { ArchitectureRuleHandler } from './handlers/architecture-rule.handler';

export class NativeEvaluator implements IRuleEvaluatorStrategy {
  private readonly handlers: INativeRuleHandler[];

  constructor(
    private readonly fs: IFileSystem,
    private readonly logger: ILogger,
  ) {
    this.handlers = [
      new EvidenceRuleHandler(fs),
      new CliReleaseRuleHandler(fs),
      new McpRuleHandler(fs),
      new DependencyRuleHandler(fs),
      new TaxonomyRuleHandler(fs),
      new GovernanceRuleHandler(fs),
      new ArchitectureRuleHandler(fs),
    ];
  }

  async evaluateAll(
    rules: NormalizedRule[],
    ctx: EvaluationContext,
  ): Promise<RuleEvaluationResult[]> {
    const results: RuleEvaluationResult[] = [];
    for (const rule of rules) {
      results.push(await this.evaluateRule(rule, ctx));
    }
    return results;
  }

  private async evaluateRule(
    rule: NormalizedRule,
    ctx: EvaluationContext,
  ): Promise<RuleEvaluationResult> {
    const handler = this.handlers.find(h => h.canHandle(rule));
    
    if (!handler) {
      return {
        rule,
        result: 'skipped',
        message: 'Requires external system or runtime verification',
      };
    }

    try {
      return await handler.evaluate(rule, ctx);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Evaluator error for ${rule.id}: ${msg}`);
      return { rule, result: 'skipped', message: `Evaluator error: ${msg}` };
    }
  }
}
