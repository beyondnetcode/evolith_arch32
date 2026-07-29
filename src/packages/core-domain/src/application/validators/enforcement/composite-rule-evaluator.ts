/**
 * CompositeRuleEvaluator (GT-514 · EAG-08).
 *
 * The non-forking seam: it partitions rules into enforcer-routed
 * (`enforce.engine === 'enforcer'`) vs everything else, sends the former to the
 * {@link EnforcerEvaluator} and leaves the latter on the NATIVE default strategy —
 * so existing rules are evaluated exactly as before. Being itself an
 * {@link IRuleEvaluatorStrategy}, it drops into `RuleEvaluationEngine`'s existing
 * injectable `strategy` slot without changing the engine.
 *
 * GT-632 closes the honest-degradation half. Routing a rule to the enforcer used to
 * be a one-way door: if the analyzer was not installed, crashed, or had no adapter,
 * `EnforcerEvaluator` returned `skipped` and the rule was done — which for
 * HXA-01/02/04/05 means four `blocking: true` rules that promise enforcement and
 * deliver nothing. A `skipped` enforcer result is now RE-DISPATCHED to the native
 * strategy, so an unavailable tool costs precision (the native engine's answer
 * instead of the analyzer's), never coverage.
 *
 * This is not a new policy — it is the `fallback: 'native'` contract
 * `policy-compiler.ts` has documented since GT-516, finally connected at runtime.
 * A rule that BOTH engines decline still comes back `skipped`, carrying both
 * reasons, and GT-595 AC2 still fails the run on it.
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

    return [...nativeResults, ...(await this.degradeToNative(enforcerResults, context))];
  }

  /**
   * Re-run on the native strategy every rule the enforcer could not evaluate.
   *
   * The native verdict is preferred only when it is an actual verdict
   * (`passed`/`failed`). If the native engine also declines, the original
   * `skipped` is kept with BOTH reasons appended — the rule stays visibly
   * unevaluated instead of acquiring a second, more reassuring-looking skip.
   */
  private async degradeToNative(
    enforcerResults: RuleEvaluationResult[],
    context: WorkspaceEvaluationContext,
  ): Promise<RuleEvaluationResult[]> {
    const degradable = enforcerResults.filter(r => r.result === 'skipped');
    if (degradable.length === 0) return enforcerResults;

    const nativeByRuleId = new Map<string, RuleEvaluationResult>();
    for (const r of await this.nativeStrategy.evaluateAll(degradable.map(d => d.rule), context)) {
      nativeByRuleId.set(r.rule.id, r);
    }

    return enforcerResults.map(result => {
      if (result.result !== 'skipped') return result;
      const native = nativeByRuleId.get(result.rule.id);
      if (!native || native.result === 'skipped') {
        return {
          ...result,
          message: [result.message, native?.message].filter(Boolean).join(' | '),
        };
      }
      return {
        ...native,
        message: [`enforcer unavailable (${result.message ?? 'no reason given'}); evaluated natively`, native.message]
          .filter(Boolean)
          .join(' — '),
      };
    });
  }
}
