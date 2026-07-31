/**
 * TrackerApprovalHttpClient — the live {@link TrackerApprovalClient} behind the
 * GT-441 seam. It performs the real HTTP call the {@link TrackerApprovalAdapter}
 * delegates to and returns the Tracker's decision verbatim for the adapter to
 * interpret; it makes no judgement of its own and owns no approval state.
 *
 * Contract (Tracker CD-23 — `RuntimeApprovalEndpoints`):
 *   · Route : POST {baseUrl}/runtime-approvals  (baseUrl includes the /api/v1 prefix)
 *   · Auth  : `x-api-key: <CoreMachine key>`. The Tracker derives the TENANT from
 *             WHICH key matched — so the tenant is NEVER sent in the body. Sending
 *             it would let any key open approvals for any tenant, the exact hole
 *             the Tracker's machine-auth handler exists to close, so
 *             `submission.tenantId` is deliberately dropped from the wire body.
 *   · Body  : { skillId, intent, productId?, initiativeId?, correlationId?,
 *             requestedBy?, executionMode? } — idempotent by `correlationId`.
 *   · Result: { status, approver?, reason?, approvalId? } — returned as-is (the
 *             Tracker BFF does not envelope its responses).
 *
 * A non-2xx (absent/invalid key → 401, malformed submission → 400, outage → 5xx)
 * is THROWN, never swallowed: the adapter maps a throw to a fail-closed "I could
 * not ask the Tracker" (unavailable), which it keeps distinct from a Tracker
 * decision. The request is abort-bounded by `timeoutMs` so a hung Tracker cannot
 * wedge the caller on its own — a second belt beside the adapter's timeout.
 *
 * Uses the global `fetch` (Node 18+); inject `fetchImpl` for tests. Mirrors the
 * thin, dependency-free shape of {@link HttpCoreEvaluationAdapter}.
 */

import type {
  TrackerApprovalClient,
  TrackerApprovalResponse,
  TrackerApprovalSubmission,
} from './tracker-approval.adapter';

interface FetchResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
  text?(): Promise<string>;
}
type FetchLike = (url: string, init: Record<string, unknown>) => Promise<FetchResponse>;

export interface TrackerApprovalHttpClientOptions {
  /** Tracker BFF base URL INCLUDING the versioned prefix, e.g. 'http://tracker-api:8080/api/v1'. */
  readonly baseUrl: string;
  /** CoreMachine key the Tracker binds to a tenant; sent as `x-api-key`. */
  readonly apiKey?: string;
  /** Abort the request after this many ms (default 10s). */
  readonly timeoutMs?: number;
  /** Inject a fetch implementation (defaults to global fetch). */
  readonly fetchImpl?: FetchLike;
}

const DEFAULT_TIMEOUT_MS = 10_000;

export class TrackerApprovalHttpClient implements TrackerApprovalClient {
  private readonly endpoint: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(options: TrackerApprovalHttpClientOptions) {
    const globalFetch = (globalThis as { fetch?: FetchLike }).fetch;
    const impl = options.fetchImpl ?? globalFetch;
    if (!impl) {
      throw new Error(
        'TrackerApprovalHttpClient requires fetch (Node 18+) or an injected fetchImpl.',
      );
    }
    this.fetchImpl = impl;
    // Trim trailing slashes so a base with or without one yields one clean join.
    this.endpoint = `${options.baseUrl.replace(/\/+$/, '')}/runtime-approvals`;
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async submit(submission: TrackerApprovalSubmission): Promise<TrackerApprovalResponse> {
    // tenantId is deliberately NOT sent — the Tracker derives it from the machine
    // key. Everything else is the received context, verbatim; undefined fields are
    // dropped by JSON.stringify.
    const body = {
      skillId: submission.skillId,
      intent: submission.intent,
      productId: submission.productId,
      initiativeId: submission.initiativeId,
      correlationId: submission.correlationId,
      requestedBy: submission.requestedBy,
      executionMode: submission.executionMode,
      // GT-590 — WHAT is being decided, when the skill id does not say. Undefined is dropped by
      // JSON.stringify, so a submission without a subject serializes exactly as it did before.
      subject: submission.subject,
    };

    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (this.apiKey) headers['x-api-key'] = this.apiKey;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs) as unknown as {
      unref?: () => void;
    };
    timer.unref?.();

    let res: FetchResponse;
    try {
      res = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer as unknown as ReturnType<typeof setTimeout>);
    }

    if (!res.ok) {
      // A non-2xx means the Core could not obtain a decision (outage/refusal),
      // NOT that a human said no — surface it as a throw so the adapter denies
      // fail-closed as "unavailable".
      let detail = '';
      if (res.text) {
        detail = await res
          .text()
          .then((t) => t.slice(0, 200))
          .catch(() => '');
      }
      throw new Error(
        `Tracker runtime-approval request failed: HTTP ${res.status}${detail ? ` — ${detail}` : ''}`,
      );
    }

    return (await res.json()) as TrackerApprovalResponse;
  }
}
