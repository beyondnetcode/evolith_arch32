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
 *     harness:        new HarnessProcessAdapter({ harnessRoot: '.harness' }),
 *     coreEvaluation: new HttpCoreEvaluationAdapter({ endpoint }),
 *     policy:         new OpaCliPolicyValidationAdapter(),
 *     tracker:        new CompositeTrackerTraceAdapter([
 *                       new FileTrackerTraceAdapter({ directory: '.harness/reports' }),
 *                       new OpenTelemetryTrackerTraceAdapter({ tracer: myOTelTracer })
 *                     ]),
 *     engine:         new HermesAgentAdapter({ client }),
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
import { PendingApprovalAdapter } from './adapters/approval/pending-approval.adapter';
import { StubAgentEngineAdapter } from './adapters/engine/stub-agent-engine.adapter';
import { InMemoryKnowledgeAdapter } from './adapters/knowledge/in-memory-knowledge.adapter';
import { HermesAgentAdapter } from './adapters/engine/hermes-agent.adapter';
import { SwarmsAgentAdapter } from './adapters/engine/swarms-agent.adapter';
import { RoutingAgentAdapter, type EngineRouterConfig } from './adapters/engine/routing-agent.adapter';

export type AgentRuntimeOverrides = Partial<AgentRuntimeDeps> & {
  /** Optional routing configuration. If provided and `engine` is not overridden, a Router is automatically wired. */
  readonly engineRouterConfig?: EngineRouterConfig;
};

export interface AgentRuntimeBundle {
  readonly runtime: IAgentRuntime;
  readonly deps: AgentRuntimeDeps;
}

/** Build a fully-wired runtime; pass overrides to replace any default adapter. */
export function createAgentRuntime(overrides: AgentRuntimeOverrides = {}): AgentRuntimeBundle {
  let engine = overrides.engine;

  if (!engine) {
    if (overrides.engineRouterConfig) {
      engine = new RoutingAgentAdapter(overrides.engineRouterConfig, {
        stub: new StubAgentEngineAdapter(),
        hermes: new HermesAgentAdapter(),
        swarms: new SwarmsAgentAdapter(),
      });
    } else {
      engine = new StubAgentEngineAdapter();
    }
  }

  const deps: AgentRuntimeDeps = {
    skillRegistry: overrides.skillRegistry ?? new LocalSkillRegistryAdapter(),
    harness: overrides.harness ?? new InMemoryHarnessAdapter(),
    coreEvaluation: overrides.coreEvaluation ?? new StubCoreEvaluationAdapter(),
    policy: overrides.policy ?? new StubPolicyValidationAdapter(),
    tracker: overrides.tracker ?? new InMemoryTrackerTraceAdapter(),
    memory: overrides.memory ?? new InMemoryMemoryAdapter(),
    // Fail-closed real HITL gate by default (GT-441): nothing is silently
    // auto-granted. Opt into AutoApprovalAdapter explicitly for dev/tests.
    approval: overrides.approval ?? new PendingApprovalAdapter(),
    // Read-side knowledge/RAG port: token-overlap in-memory default (GT-408),
    // overridable to the pgvector production adapter (GT-540).
    knowledge: overrides.knowledge ?? new InMemoryKnowledgeAdapter(),
    engine,
    now: overrides.now,
    id: overrides.id,
  };
  return { runtime: new AgentRuntimeService(deps), deps };
}
