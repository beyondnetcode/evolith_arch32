/**
 * GT-441 — Chat HITL approval: DELIVERY (transport) + fail-closed convenience adapter.
 *
 * History: {@link ChatApprovalAdapter} (GT-387) used to AUTO-GRANT (`granted: true`)
 * whenever no external chat system was configured — a security footgun, because
 * selecting it silently bypassed HITL entirely. It predated
 * {@link PendingApprovalAdapter} and was never reconciled.
 *
 * Reconciliation: the fail-closed decision now lives ONLY in
 * {@link PendingApprovalAdapter}. Chat's job is DELIVERY, not deciding —
 * {@link ChatApprovalTransport} implements {@link IApprovalTransport} and merely
 * NOTIFIES a human of a pending / resolved approval. {@link ChatApprovalAdapter}
 * is now a thin convenience composition over a `PendingApprovalAdapter` wired
 * with that transport, so `new ChatApprovalAdapter()` gives the REAL pending
 * flow (fail-closed) instead of auto-granting.
 *
 * Following the GT-531 CoworkAgentEngineAdapter pattern, the live chat call is an
 * injectable {@link ChatClient}. Without a client the transport is DETERMINISTIC
 * and side-effect-safe: it logs a structured line — it NEVER grants anything.
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
 * The live chat call, injected. Follow-on infra (Slack message, Tracker task,
 * email…); the transport works without it. Mirrors the GT-531 `CoworkClient` seam.
 */
export interface ChatClient {
  post(message: string): Promise<void>;
}

/** Render a pending/resolved approval record as a human-readable chat line. */
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
 * ChatApprovalTransport — {@link IApprovalTransport} that DELIVERS an approval to
 * a human over chat. NEVER decides: it has no `requireApproval`, no grant path.
 * With an injected {@link ChatClient} it posts the request; without one it is
 * deterministic and side-effect-safe (structured log line only).
 */
export class ChatApprovalTransport implements IApprovalTransport {
  constructor(
    private readonly client?: ChatClient,
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

export interface ChatApprovalOptions {
  /** Live chat client (default: none → deterministic log-only delivery). */
  readonly client?: ChatClient;
  /** Override the whole transport (e.g. a Slack/Tracker one). Wins over `client`. */
  readonly transport?: IApprovalTransport;
  /** Persistence for approval records (default: in-memory). */
  readonly store?: IApprovalStore;
  /** Epoch-millis clock; injectable for deterministic tests (default: Date.now). */
  readonly now?: () => number;
  /** Time-to-live before a pending request auto-expires to a deny. */
  readonly ttlMs?: number;
}

/**
 * ChatApprovalAdapter — fail-closed convenience composition (NOT an auto-grant).
 * Delegates the decision to a {@link PendingApprovalAdapter} wired with a
 * {@link ChatApprovalTransport}, so a fresh `requireApproval` returns
 * `granted: false` (pending) and ONLY an explicit human `approve` grants.
 */
export class ChatApprovalAdapter implements IApprovalPort {
  private readonly delegate: PendingApprovalAdapter;

  constructor(options: ChatApprovalOptions = {}) {
    const transport = options.transport ?? new ChatApprovalTransport(options.client);
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
