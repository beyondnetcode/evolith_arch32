/**
 * Enforcer subsystem composition (GT-524 wiring · EAG-08).
 *
 * Closes the enforcer loop: it takes a raw {@link IProcessRunner} (e.g. the real
 * `NodeProcessRunner` from infra-providers), wraps it in the {@link SandboxedProcessRunner}
 * policy, builds the registered per-runtime adapters over it (dependency-cruiser for
 * Node/TS, NetArchTest for .NET), and returns a {@link CompositeRuleEvaluator} that routes
 * `enforce.engine === 'enforcer'` rules to those adapters while leaving every native rule
 * on the given native strategy.
 *
 * Non-forking by construction: with NO enforcer rules present, the composite delegates
 * everything to `nativeStrategy`, so wiring this in is behaviour-preserving until a ruleset
 * actually authors an `enforce:` block (GT-516).
 */

import type { IRuleEvaluatorStrategy } from '../evaluators/evaluator.interface';
import { createDependencyCruiserAdapter } from './adapters/dependency-cruiser-adapter';
import { createNetArchTestAdapter } from './adapters/netarchtest-adapter';
import { CompositeRuleEvaluator } from './composite-rule-evaluator';
import { EnforcerEvaluator } from './enforcer-evaluator';
import type { IEnforcerMetrics } from './enforcer-metrics';
import type { IEnforcerAdapter, IProcessRunner } from './enforcer.types';
import { DEFAULT_SANDBOX_POLICY, SandboxedProcessRunner, type SandboxPolicy } from './provisioning';

export interface EnforcerSubsystemOptions {
  /** Sandbox policy applied to the runner (default: {@link DEFAULT_SANDBOX_POLICY}). */
  readonly policy?: SandboxPolicy;
  /** Optional metrics port for the {@link EnforcerEvaluator}. */
  readonly metrics?: IEnforcerMetrics;
}

/**
 * The registered enforcer adapters — one per validated runtime — built over `runner`.
 * The runner SHOULD already be a {@link SandboxedProcessRunner}; {@link createCompositeEnforcerStrategy}
 * guarantees that.
 */
export function createEnforcerAdapters(runner: IProcessRunner): IEnforcerAdapter[] {
  return [createDependencyCruiserAdapter(runner), createNetArchTestAdapter(runner)];
}

/**
 * Compose the enforcer subsystem into an {@link IRuleEvaluatorStrategy}: sandbox-wrap the
 * runner, build the adapters, and return a {@link CompositeRuleEvaluator} over `nativeStrategy`.
 */
export function createCompositeEnforcerStrategy(
  nativeStrategy: IRuleEvaluatorStrategy,
  runner: IProcessRunner,
  options: EnforcerSubsystemOptions = {},
): CompositeRuleEvaluator {
  const sandboxed = new SandboxedProcessRunner(runner, options.policy ?? DEFAULT_SANDBOX_POLICY);
  const adapters = createEnforcerAdapters(sandboxed);
  return new CompositeRuleEvaluator(nativeStrategy, new EnforcerEvaluator(adapters, options.metrics));
}
