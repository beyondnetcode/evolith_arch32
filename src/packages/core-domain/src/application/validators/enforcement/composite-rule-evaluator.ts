/**
 * CompositeRuleEvaluator (GT-514 · EAG-08).
 *
 * The non-forking seam: it partitions rules into enforcer-routed
 * (`enforce.engine === 'enforcer'`) vs everything else, sends the former to the
 * {@link EnforcerEvaluator} and leaves the latter on the NATIVE default strategy —
 * so existing rules are evaluated exactly as before. Being itself an
 * {@link IRuleEvaluatorStrategy}, it drops into `RuleEvaluationEngine`'s existing
 * injectable `strategy` slot without changing the engine.
 */

import type { NormalizedRule } from '../../../domain/models/normalized-rule';
import type { IRuleEvaluatorStrategy, RuleEvaluationResult, WorkspaceEvaluationContext } from '../evaluators/evaluator.interface';
import { EnforcerEvaluator } from './enforcer-evaluator';

export class CompositeRuleEvaluator implements IRuleEvaluatorStrategy {
  constructor(
    private readonly nativeStrategy: IRuleEvaluatorStrategy,
    private readonly enforcerEvaluator: IRuleEvaluatorStrategy,
  ) {}

  async evaluateAll(rules: NormalizedRule[], context: WorkspaceEvaluationContext): Promise<RuleEvaluationResult[]> {
    const enforcerRules: NormalizedRule[] = [];
    const nativeRules: NormalizedRule[] = [];
    for (const rule of rules) {
      (EnforcerEvaluator.isEnforcerRule(rule) ? enforcerRules : nativeRules).push(rule);
    }

    const [nativeResults, enforcerResults] = await Promise.all([
      nativeRules.length > 0 ? this.nativeStrategy.evaluateAll(nativeRules, context) : Promise.resolve([]),
      enforcerRules.length > 0 ? this.enforcerEvaluator.evaluateAll(enforcerRules, context) : Promise.resolve([]),
    ]);

    return [...nativeResults, ...enforcerResults];
  }
}
