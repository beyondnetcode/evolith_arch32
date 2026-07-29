import { IFileSystem } from '../../../../domain/interfaces';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { WorkspaceEvaluationContext, RuleEvaluationResult } from '../evaluator.interface';
import { INativeRuleHandler } from './rule-handler.interface';
import { AGENT_CATEGORIES, evaluateAgentRule } from './architecture/agent-rules';
import { STRUCTURAL_CATEGORIES, evaluateStructuralRule } from './architecture/structural-rules';
import { AST_CATEGORIES, evaluateAstRule } from './architecture/ast-rules';
import { CONFIG_CATEGORIES, evaluateConfigRule, evaluateTopologyFlagRule, isTopologyFlagRule } from './architecture/config-rules';
import { SubResult, SKIPPED } from './architecture/shared';

const SUPPORTED_CATEGORIES = new Set<string>([
  ...AGENT_CATEGORIES,
  ...STRUCTURAL_CATEGORIES,
  ...AST_CATEGORIES,
  ...CONFIG_CATEGORIES,
]);

export class ArchitectureRuleHandler implements INativeRuleHandler {
  constructor(private readonly fs: IFileSystem) {}

  canHandle(rule: NormalizedRule): boolean {
    // GT-595: the topology flag rules are claimed BY ID, never by category —
    // their categories (`retention`, `schema-evolution`) are shared with rules
    // of another topology that point at another file. See TOPOLOGY_FLAG_RULES.
    return isTopologyFlagRule(rule) || (Boolean(rule.category) && SUPPORTED_CATEGORIES.has(rule.category));
  }

  async evaluate(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const sub = await this.dispatch(rule, ctx);
    return { rule, result: sub.result, message: sub.message };
  }

  private async dispatch(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<SubResult> {
    // Id-keyed FIRST: `retention`/`schema-evolution` are not in any category set,
    // but keeping this ahead of the category tests documents that the id wins.
    if (isTopologyFlagRule(rule)) return evaluateTopologyFlagRule(rule, ctx, this.fs);
    if (AGENT_CATEGORIES.has(rule.category)) return evaluateAgentRule(rule, ctx, this.fs);
    if (STRUCTURAL_CATEGORIES.has(rule.category)) return evaluateStructuralRule(rule, ctx, this.fs);
    if (AST_CATEGORIES.has(rule.category)) return evaluateAstRule(rule, ctx, this.fs);
    if (CONFIG_CATEGORIES.has(rule.category)) return evaluateConfigRule(rule, ctx, this.fs);
    return SKIPPED;
  }
}
