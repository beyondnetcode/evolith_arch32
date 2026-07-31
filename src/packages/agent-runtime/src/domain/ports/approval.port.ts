/**
 * IApprovalPort — Human-In-The-Loop gate for capabilities flagged
 * `requiresApproval`. The runtime cannot self-grant approval for governed
 * actions; it asks this port, which an adapter can satisfy via an auto-policy
 * (e.g. agentic mode + low risk), a caller-supplied token, or a real approval
 * workflow (chat/Tracker).
 */

import type { SkillDescriptor } from '../contracts/capability';
import type { AgentRuntimeRequest } from '../contracts/agent-runtime-request';

/**
 * WHAT is being approved, when the skill id alone does not identify it (GT-590).
 *
 * Before this, an {@link ApprovalRecord} carried only `skillId` + `intent`, so every decision made
 * through one capability looked alike to the human deciding it and to the ledger recording it. That
 * is adequate for "may this capability run?" and inadequate for "is THIS the right correspondence?"
 * — a governance decision about a specific object, which is what GT-590 routes through this gate.
 *
 * Deliberately a discriminated union with an opaque `payload`, not a free-form bag: `kind` and `ref`
 * are what a Tracker row and an approval UI can index and render, while `payload` is echoed and
 * never interpreted by the runtime. Additive and optional — every existing caller stays valid, and
 * an adapter that ignores `subject` behaves exactly as it did.
 */
export interface ApprovalSubject {
  /** Subject family, e.g. `'c4-binding'`. Namespaced by the feature that introduces it. */
  readonly kind: string;
  /** Stable reference to the specific object under decision, unique within `kind`. */
  readonly ref: string;
  /** One line a human can decide on without opening anything else. */
  readonly summary: string;
  /**
   * Confidence of the proposal being confirmed, in [0,1], when the subject came from a
   * probabilistic proposer. Present so the human is told they are ratifying a GUESS (GT-584).
   */
  readonly confidence?: number;
  /** Echoed verbatim to the approving surface; never interpreted here. */
  readonly payload?: Readonly<Record<string, unknown>>;
}

export interface ApprovalRequest {
  readonly skill: SkillDescriptor;
  readonly request: AgentRuntimeRequest;
  /** What specifically is being decided, when the capability id does not say (GT-590). */
  readonly subject?: ApprovalSubject;
}

/**
 * Lifecycle of a real (non-auto) approval:
 * - `pending`  — awaiting an out-of-band human decision (NOT granted).
 * - `approved` — a human granted it (the only status that reads as granted).
 * - `rejected` — a human denied it (terminal).
 * - `expired`  — the TTL elapsed with no decision (terminal, fail-closed deny).
 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface ApprovalDecision {
  readonly granted: boolean;
  readonly approver?: string;
  readonly reason?: string;
  /** Lifecycle status backing this decision (real adapters set it; auto ones may omit). */
  readonly status?: ApprovalStatus;
  /** Id of the pending approval record this decision resolves (real adapters set it). */
  readonly approvalId?: string;
}

export interface IApprovalPort {
  requireApproval(request: ApprovalRequest): Promise<ApprovalDecision>;
}

/**
 * Durable-ish record of a real approval request. Persisted through an
 * {@link IApprovalStore}. All timestamps are epoch milliseconds so TTL math is
 * trivial and deterministic under an injected clock.
 */
export interface ApprovalRecord {
  readonly id: string;
  readonly status: ApprovalStatus;
  /** Capability the approval gates. */
  readonly skillId: string;
  /** Intent the request expressed (for the human deciding). */
  readonly intent: string;
  /** The specific object under decision, when the request named one (GT-590). */
  readonly subject?: ApprovalSubject;
  /** Correlation id echoed from the request context, when present. */
  readonly correlationId?: string;
  /** Opaque tenant/product/initiative context for the approving human. */
  readonly tenantId?: string;
  readonly productId?: string;
  readonly initiativeId?: string;
  /** When the request was created (epoch ms). */
  readonly createdAt: number;
  /** When the request auto-expires to a fail-closed deny (epoch ms). */
  readonly expiresAt: number;
  /** When a terminal decision (approve/reject/expire) was recorded (epoch ms). */
  readonly resolvedAt?: number;
  /** Who granted/denied (for approved/rejected). */
  readonly approver?: string;
  /** Free-text reason attached to the terminal decision. */
  readonly reason?: string;
}

/**
 * IApprovalStore — persistence seam for {@link ApprovalRecord}s. The in-memory
 * store is the default; a durable/Tracker-backed store is a sibling adapter
 * (GATED — needs the Tracker) that implements this same interface.
 */
export interface IApprovalStore {
  get(id: string): Promise<ApprovalRecord | undefined>;
  put(record: ApprovalRecord): Promise<void>;
  list(): Promise<readonly ApprovalRecord[]>;
}

/**
 * IApprovalTransport — delivery seam. When a real approval becomes pending the
 * adapter NOTIFIES this port so a human can be reached (Slack message, Tracker
 * task, email…). The concrete Slack/Tracker transports are GATED — they need
 * those external systems — so only the seam and a no-op default live here; a
 * gated adapter implements this interface to actually reach a human and, on the
 * decision, calls back the adapter's `approve`/`reject`.
 */
export interface IApprovalTransport {
  /** Announce a newly-pending approval to whoever must decide it. */
  notifyPending(record: ApprovalRecord): Promise<void>;
  /** Announce that a pending approval reached a terminal state. */
  notifyResolved(record: ApprovalRecord): Promise<void>;
}
