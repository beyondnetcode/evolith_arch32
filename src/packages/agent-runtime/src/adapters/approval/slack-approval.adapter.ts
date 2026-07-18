/**
 * GT-441 — Slack HITL approval: DELIVERY (transport) + fail-closed convenience adapter.
 *
 * History: {@link SlackApprovalAdapter} (GT-406) used to AUTO-GRANT
 * (`granted: true`) whenever no webhook was configured — a security footgun,
 * because selecting it silently bypassed HITL. It predated
 * {@link PendingApprovalAdapter} and was never reconciled.
 *
 * Reconciliation: the fail-closed decision now lives ONLY in
 * {@link PendingApprovalAdapter}. Slack's job is DELIVERY, not deciding —
 * {@link SlackApprovalTransport} implements {@link IApprovalTransport} and merely
 * NOTIFIES a human of a pending / resolved approval. {@link SlackApprovalAdapter}
 * is now a thin convenience composition over a `PendingApprovalAdapter` wired
 * with that transport, so `new SlackApprovalAdapter()` gives the REAL pending
 * flow (fail-closed) instead of auto-granting.
 *
 * Following the GT-531 CoworkAgentEngineAdapter pattern, the live Slack call is
 * an injectable {@link SlackClient}. The real webhook POST stays behind that
 * client (GATED — not implemented here). Without a client the transport is
 * DETERMINISTIC and side-effect-safe: it logs a structured line — it NEVER
 * grants anything.
 */

import type {
  ApprovalDecision,
  ApprovalRecord,
  ApprovalRequest,
  ApprovalStatus,
  IApprovalPort,
  IApprovalStore,
  IApprovalTransport,
} from '../../domain/ports/approval.port';
import { PendingApprovalAdapter } from './pending-approval.adapter';

/**
 * The live Slack call, injected. The real interactive-message webhook POST lives
 * behind this seam (GATED). Mirrors the GT-531 `CoworkClient` pattern.
 */
export interface SlackClient {
  post(message: string): Promise<void>;
}

/** Render a pending/resolved approval record as a human-readable Slack message. */
function renderApproval(kind: 'pending' | 'resolved', record: ApprovalRecord): string {
  const ctx = [
    record.tenantId && `tenant=${record.tenantId}`,
    record.productId && `product=${record.productId}`,
    record.initiativeId && `initiative=${record.initiativeId}`,
    record.correlationId && `correlation=${record.correlationId}`,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    `[approval:${kind}] id=${record.id} status=${record.status} ` +
    `skill=${record.skillId} intent="${record.intent}"` +
    (ctx ? ` ${ctx}` : '') +
    (record.approver ? ` approver=${record.approver}` : '') +
    (record.reason ? ` reason="${record.reason}"` : '')
  );
}

/**
 * SlackApprovalTransport — {@link IApprovalTransport} that DELIVERS an approval to
 * a human over Slack. NEVER decides: it has no `requireApproval`, no grant path.
 * With an injected {@link SlackClient} it posts the request (the live webhook POST
 * lives inside that client — GATED); without one it is deterministic and
 * side-effect-safe (structured log line only).
 */
export class SlackApprovalTransport implements IApprovalTransport {
  constructor(
    private readonly client?: SlackClient,
    /** Structured logger for the no-client path (default: console). */
    private readonly log: (line: string) => void = (line) => console.log(line),
  ) {}

  async notifyPending(record: ApprovalRecord): Promise<void> {
    await this.deliver(renderApproval('pending', record));
  }

  async notifyResolved(record: ApprovalRecord): Promise<void> {
    await this.deliver(renderApproval('resolved', record));
  }

  private async deliver(message: string): Promise<void> {
    if (this.client) {
      await this.client.post(message);
      return;
    }
    // No client wired: deterministic, side-effect-safe — deliver nothing, grant
    // nothing, just record the intent for observability.
    this.log(message);
  }
}

export interface SlackApprovalOptions {
  /** Live Slack client (default: none → deterministic log-only delivery). */
  readonly client?: SlackClient;
  /** Override the whole transport. Wins over `client`. */
  readonly transport?: IApprovalTransport;
  /** Persistence for approval records (default: in-memory). */
  readonly store?: IApprovalStore;
  /** Epoch-millis clock; injectable for deterministic tests (default: Date.now). */
  readonly now?: () => number;
  /** Time-to-live before a pending request auto-expires to a deny. */
  readonly ttlMs?: number;
}

/**
 * SlackApprovalAdapter — fail-closed convenience composition (NOT an auto-grant).
 * Delegates the decision to a {@link PendingApprovalAdapter} wired with a
 * {@link SlackApprovalTransport}, so a fresh `requireApproval` returns
 * `granted: false` (pending) and ONLY an explicit human `approve` grants.
 *
 * NOTE: the old `constructor(webhookUrl?)` signature is gone — a bare webhook URL
 * implied a live HTTP call this package does not make. Inject a {@link SlackClient}
 * (which owns the GATED webhook POST) via options instead.
 */
export class SlackApprovalAdapter implements IApprovalPort {
  private readonly delegate: PendingApprovalAdapter;

  constructor(options: SlackApprovalOptions = {}) {
    const transport = options.transport ?? new SlackApprovalTransport(options.client);
    this.delegate = new PendingApprovalAdapter({
      transport,
      store: options.store,
      now: options.now,
      ttlMs: options.ttlMs,
    });
  }

  /** Fail-closed: a fresh governed request is PENDING (not granted). */
  requireApproval(request: ApprovalRequest): Promise<ApprovalDecision> {
    return this.delegate.requireApproval(request);
  }

  /** Out-of-band human GRANT (the only path to `granted: true`). */
  approve(id: string, approver: string): Promise<ApprovalRecord> {
    return this.delegate.approve(id, approver);
  }

  /** Out-of-band human DENY. */
  reject(id: string, reason?: string): Promise<ApprovalRecord> {
    return this.delegate.reject(id, reason);
  }

  /** Read the current decision for an id (fail-closed for unknown/expired). */
  decisionFor(id: string): Promise<ApprovalDecision> {
    return this.delegate.decisionFor(id);
  }

  /** List records, optionally filtered by status. */
  list(status?: ApprovalStatus): Promise<readonly ApprovalRecord[]> {
    return this.delegate.list(status);
  }
}
