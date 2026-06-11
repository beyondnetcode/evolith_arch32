import { NormalizedRule } from '../../rule-evaluation-engine';
import { EvaluationContext, RuleEvaluationResult } from '../evaluator.interface';

export interface INativeRuleHandler {
  canHandle(rule: NormalizedRule): boolean;
  evaluate(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult>;
}
