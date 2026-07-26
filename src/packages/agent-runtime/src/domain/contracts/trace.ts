/**
 * TraceEvent — the trazability record the runtime publishes to Evolith Tracker
 * (via {@link ITrackerTracePort}). It is an APPEND-ONLY fact about what the
 * runtime did, carrying the same separation-of-duties provenance as the result
 * trace plus enough context to reconstruct the decision later.
 */

import type { GateVerdict } from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import type { RuntimeStatus, RuntimeTrace } from './agent-runtime-result';

export type TraceEventType =
  | 'capability.resolved'
  | 'capability.blocked'
  | 'harness.executed'
  | 'core.evaluated'
  | 'policy.validated'
  | 'approval.required'
  | 'approval.decided'
  | 'runtime.completed'
  | 'runtime.failed';

export interface TraceEvent {
  /** Stable event id (caller- or adapter-generated). */
  readonly id: string;
  readonly type: TraceEventType;
  /** ISO-8601 UTC. */
  readonly occurredAt: string;
  readonly intent: string;
  readonly capability?: string;
  readonly status?: RuntimeStatus;
  readonly tenantId?: string;
  readonly productId?: string;
  readonly initiativeId?: string;
  readonly correlationId?: string;
  /** Provenance carried verbatim from the result. */
  readonly provenance?: RuntimeTrace;
  /** Arbitrary structured payload (kept small; references not copies). GT-573: Soporta GateVerdict explícitamente. */
  readonly payload?: Readonly<Record<string, unknown>> | GateVerdict;
}
