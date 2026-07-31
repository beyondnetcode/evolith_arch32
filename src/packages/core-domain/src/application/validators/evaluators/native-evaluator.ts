import { IFileSystem, ILogger, IConfigParser } from '../../../domain/interfaces';
import { NormalizedRule } from '../../../domain/models/normalized-rule';
import { IRuleEvaluatorStrategy, WorkspaceEvaluationContext, RuleEvaluationResult } from './evaluator.interface';
import { INativeRuleHandler } from './handlers/rule-handler.interface';
import { EvidenceRuleHandler } from './handlers/evidence-rule.handler';
import { CliReleaseRuleHandler } from './handlers/cli-release-rule.handler';
import { CliExitTaxonomyRuleHandler } from './handlers/cli-exit-taxonomy-rule.handler';
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
import { AdrConformanceRuleHandler } from './handlers/adr-conformance-rule.handler';
import { ModuleBoundaryRuleHandler } from './handlers/module-boundary-rule.handler';
import { ProbabilisticEvidenceRuleHandler } from './handlers/probabilistic-evidence-rule.handler';
import { classifyRule } from '../rule-evaluability';

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
      // GT-580: CLI-EXIT-01/02/03 — the published exit-code taxonomy, evaluated
      // against the CLI source tree so a command that exits outside it BLOCKS a
      // run instead of only failing the CLI package's own unit tests.
      new CliExitTaxonomyRuleHandler(fs),
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
      // GT-584: PEA-01..04 — whether a PROBABILISTIC quality signal may reach a
      // blocking verdict. The native twin of
      // `probabilistic-evidence-admissibility.rego` (R-25); it reads the same
      // projected facts and delegates to the same admissibility function, so the
      // two engines cannot drift by construction.
      new ProbabilisticEvidenceRuleHandler(),
      // GT-632: rules that author their own `from`/`to` module-graph clause
      // (HXA-01/02/04/05). Registered BEFORE the ADR-conformance catch-all and
      // after the id-specific handlers: it claims by clause, so an existing
      // handler that already does real work on such a rule keeps priority.
      new ModuleBoundaryRuleHandler(fs),
      // GT-595: 126 of the 240 rules no handler claimed are auto-generated
      // ADR-conformance rules. Registered LAST so it can never shadow a handler
      // that does real work on a rule that happens to carry the category.
      new AdrConformanceRuleHandler(fs),
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
      // GT-595: "Requires external system or runtime verification" was asserted
      // for every unhandled rule regardless of whether it was true — 60 of them
      // are decidable from the tree and simply have no handler. Say which.
      const { evaluability, why } = classifyRule(rule, false);
      return { rule, result: 'skipped', evaluability, message: why };
    }

    try {
      const result = await handler.evaluate(rule, ctx);
      // A handler may decline a rule it claims (unsupported sub-category). Give
      // that skip the same classification as an unclaimed one rather than
      // leaving it unattributed.
      if (result.result === 'skipped' && !result.evaluability) {
        return { ...result, evaluability: classifyRule(rule, false).evaluability };
      }
      return result;
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
