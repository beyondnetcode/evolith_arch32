/**
 * HttpSlackClient — a REAL {@link SlackClient} that delivers an approval message
 * to a Slack Incoming Webhook (GT-441). `post(message)` issues a single HTTP
 * POST of `{ text: message }` as JSON to the ONE webhook URL configured at
 * construction; a 2xx is success, anything else throws.
 *
 * This is the concrete client the {@link SlackApprovalTransport} was designed to
 * accept — with it wired, the Slack HITL channel is real end-to-end (pending →
 * webhook → human). The webhook URL itself is runtime config (an operator sets
 * `SLACK_WEBHOOK_URL` or equivalent at bootstrap); the client code is real and
 * unit-tested against an injected transport (no live network in tests).
 *
 * SAFETY — no SSRF surface:
 *   - The POST target is EXCLUSIVELY the webhook URL captured in the constructor.
 *     It is NEVER derived from the message, the approval record, or any request
 *     field, so an attacker who controls an intent/skill/context string cannot
 *     redirect delivery to an internal host. The message only ever rides in the
 *     JSON BODY (`text`), never in the URL.
 *   - The URL is validated once, up front, to be http(s); a malformed or
 *     non-http scheme is rejected at construction, not at send time.
 *   - Every request is bounded by an AbortController timeout so a hung webhook
 *     cannot wedge the approval flow.
 */

import type { SlackClient } from './slack-approval.adapter';

interface FetchResponse {
  readonly ok: boolean;
  readonly status: number;
}
type FetchLike = (url: string, init: Record<string, unknown>) => Promise<FetchResponse>;

export interface HttpSlackClientOptions {
  /**
   * The Slack Incoming Webhook URL. The SOLE POST target — delivery never goes
   * anywhere else. Runtime config (secret); http(s) only.
   */
  readonly webhookUrl: string;
  /** Inject a fetch implementation (defaults to global fetch). Keeps tests offline. */
  readonly fetchImpl?: FetchLike;
  /** Abort the POST after this many ms (default 5000). */
  readonly timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5000;

export class HttpSlackClient implements SlackClient {
  private readonly webhookUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;

  constructor(options: HttpSlackClientOptions) {
    this.webhookUrl = validateWebhookUrl(options.webhookUrl);
    const globalFetch = (globalThis as { fetch?: FetchLike }).fetch;
    const impl = options.fetchImpl ?? globalFetch;
    if (!impl) {
      throw new Error('HttpSlackClient requires fetch (Node 18+) or an injected fetchImpl.');
    }
    this.fetchImpl = impl;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * POST `{ text: message }` to the configured webhook. Throws on a non-2xx
   * response or a timeout. The target URL is ALWAYS `this.webhookUrl` — the
   * `message` argument only ever becomes the JSON body, never the URL.
   */
  async post(message: string): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(this.webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: message }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Slack webhook delivery failed: HTTP ${res.status}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Reject anything that is not a syntactically valid http(s) URL, up front. */
function validateWebhookUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('HttpSlackClient requires a valid webhook URL.');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`HttpSlackClient webhook URL must be http(s), got '${parsed.protocol}'.`);
  }
  return raw;
}
