/**
 * RuntimeContext — the tenant/product/initiative context the Agent Runtime
 * RECEIVES per request (design rule #8). It is never embedded inside `.harness`
 * nor owned by the runtime: the caller (normally Evolith Tracker) supplies it,
 * the runtime echoes it into traces, and it is forwarded to the Core as
 * *temporary evaluation context only* (ADR-0101 — the Core persists nothing).
 *
 * All `*Id` fields are OPAQUE identifiers. The runtime never interprets them as
 * Core entities; it only routes, governs, and traces on them.
 */

/** Execution mode the caller operates under (drives HITL / approval routing). */
export type RuntimeExecutionMode = 'manual' | 'hybrid' | 'agentic';

import type { AgentSourceInterface } from './agent-runtime-request';

export interface RuntimeContext {
  /** Opaque tenant the request belongs to. */
  readonly tenantId?: string;
  /** Opaque product the request belongs to. */
  readonly productId?: string;
  /** Opaque initiative the request belongs to. */
  readonly initiativeId?: string;

  /** Identifies which interface initiated the request (echoed for rule evaluations). */
  readonly sourceInterface?: AgentSourceInterface;

  /** SDLC phase anchoring the request (e.g. 'discovery'). */
  readonly phase?: string;
  /** Gate anchoring the request (e.g. 'prd_readiness'). */
  readonly gate?: string;

  /** Who/what asked (e.g. 'tracker_chat', 'cli', 'scheduler'). */
  readonly requestedBy?: string;
  /** Mode the caller is operating under. */
  readonly executionMode?: RuntimeExecutionMode;

  /** Opaque workspace reference (ADR-0074 — never a raw path). */
  readonly workspaceRef?: string;

  /** Correlation id echoed verbatim across the whole pipeline and traces. */
  readonly correlationId?: string;

  /**
   * Versioned pointers / tenant configuration the caller wants the Core to use.
   * Forwarded as-is to the Core; the runtime never resolves these itself.
   */
  readonly rulesetRef?: string;
  readonly rulesetVersion?: string;
  readonly policyRefs?: readonly string[];

  /** Arbitrary caller-supplied context echoed, never interpreted. */
  readonly passthrough?: Readonly<Record<string, unknown>>;
}
