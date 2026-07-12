/**
 * EnforcerEvaluator (GT-514 · EAG-08).
 *
 * An {@link IRuleEvaluatorStrategy} that handles ONLY `enforce.engine === 'enforcer'`
 * rules: it groups them by tool, dispatches each group to the registered
 * {@link IEnforcerAdapter}, and correlates the returned {@link Violation}s back to
 * each rule (matched by `enforce.toolRuleId ?? rule.id`). Non-enforcer rules are
 * ignored here — the {@link CompositeRuleEvaluator} leaves those on the native engine.
 */

import type { NormalizedRule } from '../../../domain/models/normalized-rule';
import type { Violation } from '../../../evaluation/violation';
import type { IRuleEvaluatorStrategy, RuleEvaluationResult, WorkspaceEvaluationContext } from '../evaluators/evaluator.interface';
import type { IEnforcerAdapter } from './enforcer.types';

export class EnforcerEvaluator implements IRuleEvaluatorStrategy {
  private readonly adaptersByTool: Map<string, IEnforcerAdapter>;

  constructor(adapters: readonly IEnforcerAdapter[]) {
    this.adaptersByTool = new Map(adapters.map((a) => [a.tool, a]));
  }

  /** Rules this evaluator claims (enforcer-routed). */
  static isEnforcerRule(rule: NormalizedRule): boolean {
    return rule.enforce?.engine === 'enforcer';
  }

  async evaluateAll(rules: NormalizedRule[], context: WorkspaceEvaluationContext): Promise<RuleEvaluationResult[]> {
    const enforcerRules = rules.filter((r) => EnforcerEvaluator.isEnforcerRule(r));
    if (enforcerRules.length === 0) return [];

    const byTool = new Map<string, NormalizedRule[]>();
    for (const rule of enforcerRules) {
      const tool = rule.enforce!.tool;
      (byTool.get(tool) ?? byTool.set(tool, []).get(tool)!).push(rule);
    }

    const results: RuleEvaluationResult[] = [];
    for (const [tool, toolRules] of byTool) {
      const adapter = this.adaptersByTool.get(tool);
      if (!adapter) {
        // No adapter registered for this tool → cannot run it; skip (never a false pass).
        for (const rule of toolRules) {
          results.push({ rule, result: 'skipped', message: `No enforcer adapter registered for tool '${tool}'` });
        }
        continue;
      }

      let violations: Violation[];
      try {
        violations = await adapter.analyze({
          satellitePath: context.satellitePath,
          corePath: context.corePath,
          rules: toolRules,
        });
      } catch (err) {
        const message = `Enforcer '${tool}' failed to run: ${err instanceof Error ? err.message : String(err)}`;
        for (const rule of toolRules) results.push({ rule, result: 'skipped', message });
        continue;
      }

      for (const rule of toolRules) {
        const key = rule.enforce!.toolRuleId ?? rule.id;
        const matched = violations.filter((v) => v.ruleId === key && !v.frozen);
        if (matched.length === 0) {
          results.push({ rule, result: 'passed' });
        } else {
          const first = matched[0];
          results.push({
            rule,
            result: 'failed',
            message: `${matched.length} violation(s) from ${tool}: ${first.message} (${first.fingerprint})`,
            evidencePath: first.file,
          });
        }
      }
    }

    return results;
  }
}
