/**
 * GT-441 — real Human-In-The-Loop approval behind {@link IApprovalPort}.
 *
 * Unlike {@link AutoApprovalAdapter} (dev/test opt-in, auto-grants low-impact
 * skills) this adapter NEVER self-grants. A governed capability stays PENDING
 * until a human resolves it out-of-band via {@link PendingApprovalAdapter.approve}
 * / {@link PendingApprovalAdapter.reject}, or the request EXPIRES after its TTL.
 * It is FAIL-CLOSED: pending, expired, rejected and unknown ids all read as
 * NOT granted — only an explicit, un-expired human `approve` grants.
 *
 * State machine (per {@link ApprovalRecord}):
 *
 *     requireApproval ──▶ pending ──approve()──▶ approved (granted)
 *                            │  └────reject()──▶ rejected (denied)
 *                            └──── TTL elapses ─▶ expired  (denied)
 *
 * Storage is injectable ({@link IApprovalStore}; in-memory by default). The
 * durable / Tracker-backed store is a sibling adapter — GATED. Delivery to a
 * human is an injectable {@link IApprovalTransport} seam (no-op by default); the
 * real Slack/Tracker transports are GATED (they need those external systems).
 *
 * Correlation & re-submission: when the request context carries a
 * `correlationId`, the pending record id is derived deterministically from it +
 * the skill id, so a caller that re-submits the SAME governed request after a
 * human approved it out-of-band gets `granted: true`. Without a correlationId
 * each call mints a fresh pending id (still fail-closed — it simply cannot be
 * pre-approved).
 */

import { randomUUID } from 'node:crypto';
import type {
  ApprovalDecision,
  ApprovalRecord,
  ApprovalRequest,
  ApprovalStatus,
  IApprovalPort,
  IApprovalStore,
  IApprovalTransport,
} from '../../domain/ports/approval.port';
import { InMemoryApprovalStore } from './in-memory-approval-store';

/** No-op delivery seam. Real Slack/Tracker transports are GATED (see IApprovalTransport). */
export class NoopApprovalTransport implements IApprovalTransport {
  async notifyPending(): Promise<void> {
    /* intentionally empty — a gated transport reaches the human */
  }
  async notifyResolved(): Promise<void> {
    /* intentionally empty */
  }
}

/** Raised when resolving an approval id that is unknown or already terminal. */
export class ApprovalResolutionError extends Error {
  constructor(
    message: string,
    readonly approvalId: string,
    readonly status?: ApprovalStatus,
  ) {
    super(message);
    this.name = 'ApprovalResolutionError';
  }
}

export interface PendingApprovalOptions {
  /** Persistence for approval records (default: in-memory). */
  readonly store?: IApprovalStore;
  /** Delivery seam notified when a request becomes pending / resolves (default: no-op). */
  readonly transport?: IApprovalTransport;
  /** Epoch-millis clock; injectable for deterministic tests (default: Date.now). */
  readonly now?: () => number;
  /** Time-to-live before a pending request auto-expires to a deny. Default 15 min. */
  readonly ttlMs?: number;
  /** Id generator for requests without a stable correlation (default: randomUUID). */
  readonly idFactory?: () => string;
}

const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes

export class PendingApprovalAdapter implements IApprovalPort {
  private readonly store: IApprovalStore;
  private readonly transport: IApprovalTransport;
  private readonly now: () => number;
  private readonly ttlMs: number;
  private readonly idFactory: () => string;

  constructor(options: PendingApprovalOptions = {}) {
    this.store = options.store ?? new InMemoryApprovalStore();
    this.transport = options.transport ?? new NoopApprovalTransport();
    this.now = options.now ?? (() => Date.now());
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.idFactory = options.idFactory ?? (() => randomUUID());
  }

  /**
   * IApprovalPort. Fail-closed: returns `granted: true` ONLY when a matching
   * record was already approved (and not expired) out-of-band. Otherwise it
   * registers/refreshes a pending record and returns `granted: false`.
   */
  async requireApproval(request: ApprovalRequest): Promise<ApprovalDecision> {
    const id = this.idFor(request);

    // Deterministic id (correlation present): honour an existing decision.
    if (id !== undefined) {
      const existing = await this.store.get(id);
      if (existing) {
        return this.decisionFrom(await this.settleExpiry(existing));
      }
    }

    const record = await this.createPending(id ?? this.idFactory(), request);
    return this.decisionFrom(record);
  }

  /** Out-of-band human GRANT. Fails closed for unknown / expired / rejected ids. */
  async approve(id: string, approver: string): Promise<ApprovalRecord> {
    return this.resolve(id, 'approved', { approver });
  }

  /** Out-of-band human DENY. Fails closed for unknown / expired / already-approved ids. */
  async reject(id: string, reason?: string): Promise<ApprovalRecord> {
    return this.resolve(id, 'rejected', { reason });
  }

  /**
   * Read the current decision for an id WITHOUT mutating pending state other
   * than lazily expiring it. Unknown ids read as not granted (fail-closed).
   */
  async decisionFor(id: string): Promise<ApprovalDecision> {
    const record = await this.store.get(id);
    if (!record) {
      return { granted: false, reason: 'Unknown approval id.', approvalId: id };
    }
    return this.decisionFrom(await this.settleExpiry(record));
  }

  /** List records, optionally filtered by status (pending ones are lazily expired first). */
  async list(status?: ApprovalStatus): Promise<readonly ApprovalRecord[]> {
    const all = await this.store.list();
    const settled = await Promise.all(all.map((r) => this.settleExpiry(r)));
    return status ? settled.filter((r) => r.status === status) : settled;
  }

  // --- internals -----------------------------------------------------------

  private async createPending(id: string, request: ApprovalRequest): Promise<ApprovalRecord> {
    const createdAt = this.now();
    const ctx = request.request.context;
    const record: ApprovalRecord = {
      id,
      status: 'pending',
      skillId: request.skill.id,
      intent: request.request.intent,
      ...(request.subject ? { subject: request.subject } : {}),
      correlationId: ctx.correlationId,
      tenantId: ctx.tenantId,
      productId: ctx.productId,
      initiativeId: ctx.initiativeId,
      createdAt,
      expiresAt: createdAt + this.ttlMs,
    };
    await this.store.put(record);
    await this.transport.notifyPending(record);
    return record;
  }

  private async resolve(
    id: string,
    status: 'approved' | 'rejected',
    extra: { approver?: string; reason?: string },
  ): Promise<ApprovalRecord> {
    const current = await this.store.get(id);
    if (!current) {
      throw new ApprovalResolutionError(`Unknown approval id '${id}'.`, id);
    }
    const settled = await this.settleExpiry(current);
    if (settled.status !== 'pending') {
      throw new ApprovalResolutionError(
        `Approval '${id}' is already '${settled.status}' and cannot be ${status}.`,
        id,
        settled.status,
      );
    }
    const resolved: ApprovalRecord = {
      ...settled,
      status,
      resolvedAt: this.now(),
      approver: extra.approver,
      reason: extra.reason,
    };
    await this.store.put(resolved);
    await this.transport.notifyResolved(resolved);
    return resolved;
  }

  /** Lazily transition a pending record to `expired` once its TTL has elapsed. */
  private async settleExpiry(record: ApprovalRecord): Promise<ApprovalRecord> {
    if (record.status !== 'pending' || this.now() < record.expiresAt) {
      return record;
    }
    const expired: ApprovalRecord = {
      ...record,
      status: 'expired',
      resolvedAt: record.expiresAt,
      reason: 'Approval request expired without a human decision.',
    };
    await this.store.put(expired);
    await this.transport.notifyResolved(expired);
    return expired;
  }

  private decisionFrom(record: ApprovalRecord): ApprovalDecision {
    switch (record.status) {
      case 'approved':
        return { granted: true, approver: record.approver, status: 'approved', approvalId: record.id };
      case 'rejected':
        return {
          granted: false,
          approver: record.approver,
          reason: record.reason ?? 'Approval rejected by human.',
          status: 'rejected',
          approvalId: record.id,
        };
      case 'expired':
        return {
          granted: false,
          reason: record.reason ?? 'Approval request expired without a human decision.',
          status: 'expired',
          approvalId: record.id,
        };
      case 'pending':
      default:
        return {
          granted: false,
          reason: 'Awaiting human approval.',
          status: 'pending',
          approvalId: record.id,
        };
    }
  }

  /**
   * Deterministic id from correlationId + skill, or undefined when no correlation.
   *
   * The SUBJECT participates when the request names one (GT-590): without it, two decisions about
   * two different objects submitted under one correlation id would collide on the same record, and
   * a human approving the first would silently pre-approve the second. Requests with no subject
   * keep their previous id exactly, so no existing pending record is orphaned.
   */
  private idFor(request: ApprovalRequest): string | undefined {
    const correlationId = request.request.context.correlationId;
    if (!correlationId) return undefined;
    const base = `${correlationId}::${request.skill.id}`;
    return request.subject ? `${base}::${request.subject.kind}:${request.subject.ref}` : base;
  }
}
