/**
 * IAssistantTransport (GT-531) — the vendor-neutral seam that ACTUALLY CONTACTS
 * an external AI assistant to obtain a proposal. This is the missing "call the
 * assistant" side of the supervised-executor flow: the runtime's engine
 * ({@link IAgentEnginePort}) decides IF an assistant is consulted and the
 * approval/policy/trace envelope governs WHATEVER it proposes; this port is the
 * one thing that reaches over the wire to the assistant itself.
 *
 * It is deliberately vendor-neutral (DECISION-GATED — §Hermes/Claude/other is not
 * this layer's choice): a concrete transport for a specific assistant lives in an
 * adapter, is injected, and never leaks a vendor type into the domain (design
 * rules #1, #2). The transport PROPOSES only — it can name a tool + arguments and
 * a rationale, but it never executes a governed action; the runtime still routes
 * every proposal through approval + policy + tracing.
 *
 * No concrete vendor transport ships in this package: the reference wiring
 * ({@link SupervisedAssistantClient}) is fail-closed and OFF until a real
 * transport is injected AND the feature flag is turned on.
 */

import type { AgentRuntimeRequest } from '../contracts/agent-runtime-request';
import type { SkillDescriptor } from '../contracts/capability';

/** What the runtime hands the assistant so it can reason about the request. */
export interface AssistantInvocationRequest {
  /** The governed request the assistant is asked to help satisfy. */
  readonly request: AgentRuntimeRequest;
  /** The catalog of capabilities the assistant may propose FROM (bounded). */
  readonly availableSkills: readonly SkillDescriptor[];
}

/**
 * A raw proposal from the assistant, BEFORE governance. Structurally aligned
 * with the engine's Cowork proposal so a transport drops in behind the existing
 * bounded-executor adapter with no shape translation.
 */
export interface AssistantProposal {
  /** The capability the assistant proposes (still resolved + governed downstream). */
  readonly tool?: string;
  /** Arguments the assistant proposes for that capability. */
  readonly arguments?: Readonly<Record<string, unknown>>;
  /** Natural-language rationale (recorded in the trace). */
  readonly rationale?: string;
}

export interface IAssistantTransport {
  /**
   * Contact the assistant and return its proposal. A transport failure
   * (network/auth/timeout) is THROWN, never swallowed — the caller maps a throw
   * to a fail-closed "the assistant could not be reached", distinct from "the
   * assistant proposed nothing".
   */
  invoke(request: AssistantInvocationRequest): Promise<AssistantProposal>;
}
