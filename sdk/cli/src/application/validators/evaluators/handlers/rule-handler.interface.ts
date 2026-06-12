import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { EvaluationContext, RuleEvaluationResult } from '../evaluator.interface';

export interface INativeRuleHandler {
  canHandle(rule: NormalizedRule): boolean;
  evaluate(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult>;
}
