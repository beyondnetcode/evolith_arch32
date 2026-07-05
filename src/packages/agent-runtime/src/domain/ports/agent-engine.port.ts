/**
 * IAgentEnginePort — the abstraction that keeps Hermes Agent (or any LLM /
 * reasoning framework) a REPLACEABLE ADAPTER, never a domain dependency
 * (design rules #1, #2). The runtime asks the engine to reason/plan; the engine
 * NEVER executes governed actions itself — it can only PROPOSE which capability
 * to run and with what arguments, and the runtime still routes that proposal
 * through approval + policy + tracing.
 *
 * Hermes lives behind this interface in `adapters/engine/hermes-agent.adapter`.
 * A deterministic stub satisfies the same interface so the runtime works with
 * no engine installed at all (design rule #5).
 */

import type { AgentRuntimeRequest } from '../contracts/agent-runtime-request';
import type { SkillDescriptor } from '../contracts/capability';

export interface AgentEnginePlan {
  /** The skill/tool the engine proposes (must still be resolved + governed). */
  readonly proposedTool?: string;
  /** Arguments the engine proposes for the capability. */
  readonly proposedArguments?: Readonly<Record<string, unknown>>;
  /** Natural-language rationale for the plan (recorded in the trace). */
  readonly rationale: string;
  /** Non-binding follow-up recommendations the engine surfaces. */
  readonly recommendations?: readonly string[];
  /** Engine identity for provenance (e.g. 'hermes', 'stub'). */
  readonly engine: string;
}

export interface IAgentEnginePort {
  /**
   * Given a request and the catalog of available skills, propose a plan. This
   * is advisory only; the runtime enforces governance on whatever it proposes.
   */
  plan(
    request: AgentRuntimeRequest,
    availableSkills: readonly SkillDescriptor[],
  ): Promise<AgentEnginePlan>;
}
