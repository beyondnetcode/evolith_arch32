/**
 * EnforcerEvaluator (GT-514 · EAG-08; observability GT-519 · EAG-14).
 *
 * An {@link IRuleEvaluatorStrategy} that handles ONLY `enforce.engine === 'enforcer'`
 * rules: it groups them by tool, dispatches each group to the registered
 * {@link IEnforcerAdapter}, and correlates the returned {@link Violation}s back to
 * each rule (matched by `enforce.toolRuleId ?? rule.id`). Non-enforcer rules are
 * ignored here — the {@link CompositeRuleEvaluator} leaves those on the native engine.
 *
 * Each adapter run is instrumented through an optional {@link IEnforcerMetrics} port
 * (duration histogram + failure/timeout/violation counters). It defaults to
 * {@link NoopEnforcerMetrics}, so behaviour is byte-for-byte identical when a host
 * wires no meter.
 */

import type { NormalizedRule } from '../../../domain/models/normalized-rule';
import type { Violation } from '../../../domain/violation';
import type { IRuleEvaluatorStrategy, RuleEvaluationResult, WorkspaceEvaluationContext } from '../evaluators/evaluator.interface';
import type { IEnforcerAdapter } from './enforcer.types';
import { isTimeoutError, monotonicNow, NoopEnforcerMetrics, type IEnforcerMetrics } from './enforcer-metrics';

export class EnforcerEvaluator implements IRuleEvaluatorStrategy {
  private readonly adaptersByTool: Map<string, IEnforcerAdapter>;

  constructor(
    adapters: readonly IEnforcerAdapter[],
    private readonly metrics: IEnforcerMetrics = NoopEnforcerMetrics,
    private readonly now: () => number = monotonicNow,
  ) {
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
        this.metrics.recordFailure({ tool, reason: 'no-adapter' });
        for (const rule of toolRules) {
          results.push({ rule, result: 'skipped', message: `No enforcer adapter registered for tool '${tool}'` });
        }
        continue;
      }

      const runtime = adapter.runtime;
      const startedAt = this.now();
      let violations: Violation[];
      try {
        violations = await adapter.analyze({
          satellitePath: context.satellitePath,
          corePath: context.corePath,
          rules: toolRules,
        });
      } catch (err) {
        const timedOut = isTimeoutError(err);
        this.metrics.recordDuration({ tool, runtime, durationMs: this.now() - startedAt, outcome: 'error' });
        this.metrics.recordFailure({ tool, runtime, reason: timedOut ? 'timeout' : 'adapter-error' });
        if (timedOut) this.metrics.recordTimeout({ tool, runtime });
        const message = `Enforcer '${tool}' failed to run: ${err instanceof Error ? err.message : String(err)}`;
        for (const rule of toolRules) results.push({ rule, result: 'skipped', message });
        continue;
      }
      this.metrics.recordDuration({ tool, runtime, durationMs: this.now() - startedAt, outcome: 'ok' });
      this.metrics.recordViolations({ tool, runtime, count: violations.length });

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
