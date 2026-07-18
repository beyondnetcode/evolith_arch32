/**
 * GT-441 — Tracker HITL approval: the Core ASKS, the Tracker DECIDES.
 *
 * WHY THIS ADAPTER IS SHAPED DIFFERENTLY FROM ITS SIBLINGS
 *
 * {@link SlackApprovalAdapter} and {@link ChatApprovalAdapter} are *delivery*
 * over a local {@link PendingApprovalAdapter}: the Core still owns the approval
 * record and the state machine, and Slack/chat merely reach a human. That is the
 * right shape when the channel is a notification medium.
 *
 * The Tracker is not a notification medium. Per ADR-0101 the Core recommends and
 * the Tracker decides, persists and audits — and **who may approve is configured
 * per tenant in the Tracker**, not here. So this adapter owns no record, no TTL
 * and no state machine. It asks, and it obeys. There is deliberately no
 * `approve()` / `reject()` on it: a resolution path in the Core would be a second
 * place where a grant could originate, which is exactly the authority this
 * adapter exists to give away.
 *
 * THE ASYMMETRY (mirrors `core-domain/src/domain/scope-contract.ts`)
 *
 * `resolveScope` returns a union whose failure branch carries *no scope field*,
 * so a `catch` has nothing wider to fall back to. The same trick is used here:
 * the failure branch carries **no `status`**. `ApprovalStatus` is the Tracker's
 * lifecycle, and the Core cannot know it when the Tracker could not be reached —
 * so it does not guess one. A decision with `granted: false` and no `status` is,
 * by construction, "I could not ask", and it is unwritable to accidentally
 * produce that from a real Tracker answer.
 *
 * TWO KINDS OF "NO", AND WHY THEY MUST NOT BLUR
 *
 *   - The Tracker said no      → a human decided; the follow-up is to talk to
 *                                that human, or drop the request.
 *   - The Core could not ask   → nobody decided anything; the follow-up is to
 *                                fix connectivity/config and retry.
 *
 * Both are `granted: false` — never anything else — but they are distinguished
 * on the wire by a stable machine-readable prefix on `reason`
 * ({@link TRACKER_DECISION_PREFIX} / {@link TRACKER_UNAVAILABLE_PREFIX}), with
 * {@link isTrackerUnavailable} as the predicate. `ApprovalDecision` is owned by
 * the port and is not extended for this.
 *
 * FAIL-CLOSED PATHS (every one of these denies)
 *
 *   - no tenant on the request      — routing is per-tenant; without one there is
 *                                     no question to ask. The client is never called.
 *   - the client throws             — network error, DNS, auth, 5xx…
 *   - the client hangs              — bounded by `timeoutMs`, then denied.
 *   - a malformed response          — null, non-object, or no `status` string.
 *   - an unrecognised status        — a status this Core does not model is not
 *                                     assumed benign.
 *
 * SCOPE — THIS REPOSITORY ONLY
 *
 * The Tracker is a separate repository and its approval endpoint does not exist
 * yet. {@link TrackerApprovalClient} is the injectable seam that will own the
 * live call (same pattern as `SlackClient` / the GT-531 `CoworkClient`). No URL
 * scheme is invented here. With no client wired the adapter is deterministic and
 * denies every governed request — which is the correct unconfigured behaviour.
 */

import type {
  ApprovalDecision,
  ApprovalRequest,
  ApprovalStatus,
  IApprovalPort,
} from '../../domain/ports/approval.port';
import type { RuntimeExecutionMode } from '../../domain/contracts/runtime-context';

/** Prefix on `reason` when the Tracker answered and the answer was not a grant. */
export const TRACKER_DECISION_PREFIX = 'tracker-decision:';

/** Prefix on `reason` when the Core could not obtain an answer from the Tracker. */
export const TRACKER_UNAVAILABLE_PREFIX = 'tracker-unavailable:';

/**
 * True when this denial means "nobody decided" rather than "a human said no".
 * The two call for completely different follow-ups, so callers branch on this
 * rather than parsing prose.
 */
export function isTrackerUnavailable(decision: ApprovalDecision): boolean {
  return decision.reason?.startsWith(TRACKER_UNAVAILABLE_PREFIX) ?? false;
}

/**
 * What the Core sends the Tracker. Purely the received {@link RuntimeContext} plus
 * the capability being gated — the Core adds no judgement of its own, and in
 * particular names no approver: the approver set is per-tenant Tracker config.
 */
export interface TrackerApprovalSubmission {
  /** Tenant whose per-tenant approver configuration governs this request. */
  readonly tenantId: string;
  /** Capability the approval gates. */
  readonly skillId: string;
  /** Intent the request expressed, for the human deciding. */
  readonly intent: string;
  readonly productId?: string;
  readonly initiativeId?: string;
  readonly correlationId?: string;
  /** Who/what asked (never interpreted as an approver). */
  readonly requestedBy?: string;
  readonly executionMode?: RuntimeExecutionMode;
}

/**
 * What the Tracker answers. `status` is typed `string`, NOT `ApprovalStatus`, on
 * purpose: it arrives off the wire from another repository and is untrusted until
 * this adapter validates it. Typing it as the enum here would be the Core
 * asserting a guarantee only the Tracker can make.
 */
export interface TrackerApprovalResponse {
  readonly status: string;
  /** Named by the Tracker. The Core never fills this in. */
  readonly approver?: string;
  readonly reason?: string;
  /** The Tracker's own id for the approval record it persisted. */
  readonly approvalId?: string;
}

/**
 * The live Tracker call, injected. The real HTTP request — endpoint, auth,
 * retry — lives behind this seam and belongs to whoever wires the Tracker in.
 * GATED: no implementation ships here, because the endpoint does not exist yet.
 */
export interface TrackerApprovalClient {
  submit(submission: TrackerApprovalSubmission): Promise<TrackerApprovalResponse>;
}

export interface TrackerApprovalOptions {
  /** Live Tracker client. Absent ⇒ every governed request is denied as unavailable. */
  readonly client?: TrackerApprovalClient;
  /** Bound on how long the Core waits for the Tracker before denying. Default 10s. */
  readonly timeoutMs?: number;
  /** Injectable timer, so timeout behaviour is testable without real waiting. */
  readonly setTimeoutImpl?: (fn: () => void, ms: number) => { unref?: () => void };
  readonly clearTimeoutImpl?: (handle: unknown) => void;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/** Statuses this Core models. Anything else is refused rather than assumed benign. */
const KNOWN_STATUSES: readonly ApprovalStatus[] = ['pending', 'approved', 'rejected', 'expired'];

function isKnownStatus(value: string): value is ApprovalStatus {
  return (KNOWN_STATUSES as readonly string[]).includes(value);
}

/** A denial for which no Tracker lifecycle status exists — carries no `status`. */
function unavailable(detail: string, approvalId?: string): ApprovalDecision {
  return {
    granted: false,
    reason: `${TRACKER_UNAVAILABLE_PREFIX} ${detail}`,
    ...(approvalId ? { approvalId } : {}),
  };
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export class TrackerApprovalAdapter implements IApprovalPort {
  private readonly client?: TrackerApprovalClient;
  private readonly timeoutMs: number;
  private readonly setTimeoutImpl: NonNullable<TrackerApprovalOptions['setTimeoutImpl']>;
  private readonly clearTimeoutImpl: NonNullable<TrackerApprovalOptions['clearTimeoutImpl']>;

  constructor(options: TrackerApprovalOptions = {}) {
    this.client = options.client;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.setTimeoutImpl =
      options.setTimeoutImpl ?? ((fn, ms) => setTimeout(fn, ms) as unknown as { unref?: () => void });
    this.clearTimeoutImpl =
      options.clearTimeoutImpl ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  }

  async requireApproval(request: ApprovalRequest): Promise<ApprovalDecision> {
    const ctx = request.request.context;
    const tenantId = ctx.tenantId?.trim();

    // Routing is per-tenant. Without a tenant there is no Tracker configuration
    // to consult, so there is no question to ask — and asking anyway would be
    // asking the wrong tenant. Deny without touching the client.
    if (!tenantId) {
      return unavailable(
        'the request carries no tenant, so the per-tenant approver configuration ' +
          'cannot be resolved; supply `tenant` on the request.',
      );
    }

    if (!this.client) {
      return unavailable(
        `no Tracker approval client is wired, so approval for skill '${request.skill.id}' ` +
          'cannot be requested; wire a TrackerApprovalClient.',
      );
    }

    const submission: TrackerApprovalSubmission = {
      tenantId,
      skillId: request.skill.id,
      intent: request.request.intent,
      productId: ctx.productId,
      initiativeId: ctx.initiativeId,
      correlationId: ctx.correlationId,
      requestedBy: ctx.requestedBy,
      executionMode: ctx.executionMode,
    };

    let response: TrackerApprovalResponse;
    try {
      response = await this.withTimeout(this.client.submit(submission), tenantId);
    } catch (error) {
      // Every failure to obtain an answer lands here, and this branch has no
      // status to carry — mirroring scope-contract's failure branch, which has
      // no scope to fall back to.
      return unavailable(
        `could not reach the Tracker for tenant '${tenantId}': ${errorText(error)}`,
      );
    }

    return this.decisionFrom(response, tenantId);
  }

  // --- internals -----------------------------------------------------------

  private withTimeout(
    pending: Promise<TrackerApprovalResponse>,
    tenantId: string,
  ): Promise<TrackerApprovalResponse> {
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) return pending;

    return new Promise<TrackerApprovalResponse>((resolve, reject) => {
      const handle = this.setTimeoutImpl(() => {
        reject(
          new Error(
            `no answer within ${this.timeoutMs}ms (tenant '${tenantId}')`,
          ),
        );
      }, this.timeoutMs);
      handle?.unref?.();

      const done = () => this.clearTimeoutImpl(handle);
      pending.then(
        (value) => {
          done();
          resolve(value);
        },
        (error: unknown) => {
          done();
          reject(error instanceof Error ? error : new Error(String(error)));
        },
      );
    });
  }

  private decisionFrom(response: TrackerApprovalResponse, tenantId: string): ApprovalDecision {
    if (response === null || typeof response !== 'object' || typeof response.status !== 'string') {
      return unavailable(
        `the Tracker returned a malformed approval response for tenant '${tenantId}' ` +
          '(no `status` string); treating it as no answer.',
      );
    }

    const status = response.status;
    if (!isKnownStatus(status)) {
      // An unmodelled status is not assumed benign — but it IS an answer we
      // failed to understand, not a human decision, so it reads as unavailable.
      return unavailable(
        `the Tracker returned status '${status}', which this Core does not model ` +
          `(expected one of ${KNOWN_STATUSES.join(', ')}); treating it as no answer.`,
        response.approvalId,
      );
    }

    const approvalId = response.approvalId;
    const base = approvalId ? { approvalId } : {};

    switch (status) {
      case 'approved':
        return {
          granted: true,
          status: 'approved',
          // Only ever the approver the Tracker NAMED. The Core does not fall
          // back to requestedBy, or to any other identity it happens to hold —
          // that would be the Core inventing an accountable human.
          ...(response.approver ? { approver: response.approver } : {}),
          ...(response.reason ? { reason: response.reason } : {}),
          ...base,
        };

      case 'rejected':
        return {
          granted: false,
          status: 'rejected',
          ...(response.approver ? { approver: response.approver } : {}),
          reason: `${TRACKER_DECISION_PREFIX} ${response.reason ?? 'rejected by the Tracker.'}`,
          ...base,
        };

      case 'expired':
        return {
          granted: false,
          status: 'expired',
          reason: `${TRACKER_DECISION_PREFIX} ${
            response.reason ?? 'the Tracker approval expired without a human decision.'
          }`,
          ...base,
        };

      case 'pending':
      default:
        // Faithful to the lifecycle: awaiting a human is PENDING and NOT granted.
        return {
          granted: false,
          status: 'pending',
          reason: `${TRACKER_DECISION_PREFIX} ${
            response.reason ?? 'awaiting a human decision in the Tracker.'
          }`,
          ...base,
        };
    }
  }
}
