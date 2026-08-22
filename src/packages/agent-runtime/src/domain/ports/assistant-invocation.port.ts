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

/**
 * Proof that the HITL gate ALREADY ran for this invocation (GT-575).
 *
 * A transport that actually opens a socket must be able to tell "I am being
 * driven by the supervised client, which already asked a human" from "somebody
 * got hold of me and called `invoke` directly". {@link SupervisedAssistantClient}
 * stamps this on the request AFTER its {@link IApprovalPort} grants, so the
 * transport can enforce supervision without asking for a second approval.
 *
 * A transport that reaches an external provider MUST refuse when this is absent
 * and it has no HITL gate of its own — that is the difference between a governed
 * egress path and a bypass.
 */
export interface AssistantSupervision {
  /** True only when a human (or the configured approval policy) said yes. */
  readonly granted: boolean;
  /** Who granted it, when the approval adapter reports an identity. */
  readonly approver?: string;
  /** Which gate produced the decision, e.g. `SupervisedAssistantClient`. */
  readonly gate: string;
}

/** What the runtime hands the assistant so it can reason about the request. */
/**
 * The provider a TENANT chose, travelling with the request (ADR-0128 §2).
 *
 * The Core cannot hold this: it is stateless, and a tenant's credential is not
 * its to keep. So the choice and the key arrive per invocation, are used, and are
 * not retained. Absent means "use whatever the installation configured", which is
 * how a single-tenant install keeps working unchanged.
 *
 * `apiKey` is a secret in a contract, and that is deliberate rather than
 * accidental: statelessness leaves nowhere else for it to be. It must never be
 * logged, echoed into a result, or written to a trace — the egress audit record
 * is content-free precisely so this stays true.
 */
export interface AssistantProviderSelection {
  /** Registry id, e.g. `claude` or `gemini`. */
  readonly provider: string;
  /** The tenant's own credential. Used for this call only, never stored. */
  readonly apiKey?: string;
  /** Optional model override within that provider. */
  readonly model?: string;
}

export interface AssistantInvocationRequest {
  /** The governed request the assistant is asked to help satisfy. */
  readonly request: AgentRuntimeRequest;
  /** The catalog of capabilities the assistant may propose FROM (bounded). */
  readonly availableSkills: readonly SkillDescriptor[];
  /**
   * Evidence that the HITL gate in front of this call already granted (GT-575).
   * Set by {@link SupervisedAssistantClient}; absent when a caller reaches a
   * transport directly, which a governed transport treats as fail-closed.
   */
  readonly supervision?: AssistantSupervision;
  /**
   * The tenant's provider choice for THIS call. Absent falls back to the
   * installation's configured transport (ADR-0128 §2).
   */
  readonly providerSelection?: AssistantProviderSelection;
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
  /**
   * What the call cost, when the transport can report it (ADR-0128 §4).
   *
   * The Core is stateless and accounts for nothing: it REPORTS, and the Tracker
   * accumulates per tenant. Optional because a transport that cannot measure its
   * own spend must say so by omission rather than by reporting a zero — a zero is
   * a measurement, and an unmeasured call is not free, it is unknown.
   */
  readonly usage?: AssistantUsage;
}

/**
 * Consumption of a single assistant call, as the provider reported it.
 *
 * Deliberately NOT a cost in currency. Prices change, differ per model and per
 * contract, and belong to whoever holds the billing relationship — which under
 * ADR-0128 is the tenant, not Evolith. Reporting tokens keeps this true for
 * every provider and every price list; turning tokens into money is the
 * Tracker's job, against rates the tenant configures.
 */
export interface AssistantUsage {
  /** Registry id of the provider that served the call, e.g. `claude`. */
  readonly provider: string;
  /** Exact model that answered — not the one requested, the one that ran. */
  readonly model: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
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
