/**
 * createAgentRuntime — one-call wiring of a working runtime with safe DEFAULT
 * adapters (all in-memory/stub). This is what makes design rule #5 true: the
 * runtime boots and runs end-to-end with no Hermes, no live Core, and no
 * `.harness` checkout. Override any port to graduate toward production.
 *
 *   const { runtime, deps } = createAgentRuntime();
 *   const result = await runtime.handle(request);
 *
 * Production wiring example (swap ports, nothing else changes):
 *   createAgentRuntime({
 *     harness: new HarnessProcessAdapter({ harnessRoot: '.harness' }),
 *     policy:  new OpaCliPolicyValidationAdapter(),
 *     tracker: new HttpTrackerTraceAdapter({ endpoint }),
 *     engine:  new HermesAgentAdapter({ client }),
 *   });
 */

import { AgentRuntimeService, type AgentRuntimeDeps } from './application/agent-runtime.service';
import type { IAgentRuntime } from './domain/ports/agent-runtime.port';

import { InMemoryHarnessAdapter } from './adapters/harness/in-memory-harness.adapter';
import { StubCoreEvaluationAdapter } from './adapters/core/stub-core-evaluation.adapter';
import { StubPolicyValidationAdapter } from './adapters/policy/stub-policy-validation.adapter';
import { InMemoryTrackerTraceAdapter } from './adapters/tracker/in-memory-tracker-trace.adapter';
import { InMemoryMemoryAdapter } from './adapters/memory/in-memory-memory.adapter';
import { LocalSkillRegistryAdapter } from './adapters/skills/local-skill-registry.adapter';
import { AutoApprovalAdapter } from './adapters/approval/policy-approval.adapter';
import { StubAgentEngineAdapter } from './adapters/engine/stub-agent-engine.adapter';

export type AgentRuntimeOverrides = Partial<AgentRuntimeDeps>;

export interface AgentRuntimeBundle {
  readonly runtime: IAgentRuntime;
  readonly deps: AgentRuntimeDeps;
}

/** Build a fully-wired runtime; pass overrides to replace any default adapter. */
export function createAgentRuntime(overrides: AgentRuntimeOverrides = {}): AgentRuntimeBundle {
  const deps: AgentRuntimeDeps = {
    skillRegistry: overrides.skillRegistry ?? new LocalSkillRegistryAdapter(),
    harness: overrides.harness ?? new InMemoryHarnessAdapter(),
    coreEvaluation: overrides.coreEvaluation ?? new StubCoreEvaluationAdapter(),
    policy: overrides.policy ?? new StubPolicyValidationAdapter(),
    tracker: overrides.tracker ?? new InMemoryTrackerTraceAdapter(),
    memory: overrides.memory ?? new InMemoryMemoryAdapter(),
    approval: overrides.approval ?? new AutoApprovalAdapter(),
    engine: overrides.engine ?? new StubAgentEngineAdapter(),
    now: overrides.now,
    id: overrides.id,
  };
  return { runtime: new AgentRuntimeService(deps), deps };
}
