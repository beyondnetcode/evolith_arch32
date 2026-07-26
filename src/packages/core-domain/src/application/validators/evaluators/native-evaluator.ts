import { IFileSystem, ILogger, IConfigParser } from '../../../domain/interfaces';
import { NormalizedRule } from '../../../domain/models/normalized-rule';
import { IRuleEvaluatorStrategy, WorkspaceEvaluationContext, RuleEvaluationResult } from './evaluator.interface';
import { INativeRuleHandler } from './handlers/rule-handler.interface';
import { EvidenceRuleHandler } from './handlers/evidence-rule.handler';
import { CliReleaseRuleHandler } from './handlers/cli-release-rule.handler';
import { McpRuleHandler } from './handlers/mcp-rule.handler';
import { DependencyRuleHandler } from './handlers/dependency-rule.handler';
import { TaxonomyRuleHandler } from './handlers/taxonomy-rule.handler';
import { GovernanceRuleHandler } from './handlers/governance-rule.handler';
import { ArchitectureRuleHandler } from './handlers/architecture-rule.handler';
import { SdlcRuleHandler } from './handlers/sdlc-rule.handler';
import { CrossCuttingRuleHandler } from './handlers/cross-cutting-rule.handler';
import { ExecutiveScorecardRuleHandler } from './handlers/executive-scorecard-rule.handler';
import { SatelliteContractRuleHandler } from './handlers/satellite-contract-rule.handler';
import { AclRuleHandler } from './handlers/acl-rule.handler';
import { StructuralRuleHandler } from './handlers/structural-rule.handler';

export class NativeEvaluator implements IRuleEvaluatorStrategy {
  private readonly handlers: INativeRuleHandler[];

  constructor(
    private readonly fs: IFileSystem,
    private readonly logger: ILogger,
    private readonly configParser: IConfigParser,
  ) {
    this.handlers = [
      new EvidenceRuleHandler(fs),
      new CliReleaseRuleHandler(fs),
      new McpRuleHandler(fs),
      new DependencyRuleHandler(fs),
      new TaxonomyRuleHandler(fs),
      new GovernanceRuleHandler(fs, configParser),
      new ArchitectureRuleHandler(fs),
      new SdlcRuleHandler(fs),
      new CrossCuttingRuleHandler(fs),
      new ExecutiveScorecardRuleHandler(fs),
      new SatelliteContractRuleHandler(fs, configParser),
      new AclRuleHandler(fs),
      new StructuralRuleHandler(),
    ];
  }

  async evaluateAll(
    rules: NormalizedRule[],
    ctx: WorkspaceEvaluationContext,
  ): Promise<RuleEvaluationResult[]> {
    const results: RuleEvaluationResult[] = [];
    for (const rule of rules) {
      results.push(await this.evaluateRule(rule, ctx));
    }
    return results;
  }

  private async evaluateRule(
    rule: NormalizedRule,
    ctx: WorkspaceEvaluationContext,
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
      // GT-569: a handler exception is NOT a skip. Downgrading it to `skipped`
      // made a crashing evaluator indistinguishable from an unsupported rule,
      // and both then vanished from the reported denominator.
      this.logger.error(`Evaluator error for ${rule.id}: ${msg}`);
      return { rule, result: 'errored', message: `Evaluator error: ${msg}` };
    }
  }
}
