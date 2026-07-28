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

/** One prior entry of the conversation log, most-recent-last. */
export interface AgentPlanHistoryEntry {
  /** ISO-8601 UTC timestamp the entry was appended. */
  readonly at: string;
  readonly value: unknown;
}

/**
 * GT-612 — the state the runtime carries INTO planning. Until this existed the
 * runtime only ever WROTE memory (`append`) and every turn planned blank while
 * the store filled up.
 *
 * `history` is deliberately BOUNDED by the runtime (see
 * `ObservabilityDeps.memoryHistoryLimit`, default 20 entries ≈ 10 turns, since
 * each turn appends a `request` and a `result`). An unbounded transcript in a
 * prompt is its own defect: unbounded cost, unbounded latency, and the oldest
 * turn silently pushing the actual request out of the context window.
 */
export interface AgentPlanContext {
  /** Bounded prior conversation, oldest first. Absent when there is no history. */
  readonly history?: readonly AgentPlanHistoryEntry[];
  /** Memory namespace the history came from (provenance). */
  readonly conversationNamespace?: string;
}

export interface IAgentEnginePort {
  /**
   * Given a request, the catalog of available skills and (optionally) the prior
   * conversation, propose a plan. This is advisory only; the runtime enforces
   * governance on whatever it proposes — including REVALIDATING
   * `proposedArguments` against the skill's declared input contract (GT-610).
   *
   * `planContext` is optional so pre-existing adapters keep compiling and
   * running unchanged; an adapter that ignores it is stateless, not broken.
   */
  plan(
    request: AgentRuntimeRequest,
    availableSkills: readonly SkillDescriptor[],
    planContext?: AgentPlanContext,
  ): Promise<AgentEnginePlan>;
}
