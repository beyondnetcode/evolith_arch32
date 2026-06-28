import { IWebhookNotifier } from '@evolith/core-domain/application/ports/webhook-notifier.port';
import { GateEvidence } from '@evolith/core-domain/domain/gate-evidence';
import { requestContextStorage } from '@evolith/core-domain/common/request-context';

/** Tunables for {@link WebhookAdapter}. All optional with safe defaults. */
export interface WebhookAdapterOptions {
  /** Per-attempt timeout in ms (AbortController). Default 10_000. */
  timeoutMs?: number;
  /** Max delivery attempts (1 = no retry). Default 3. */
  maxAttempts?: number;
  /** Base backoff in ms between retries (exponential). Default 250. */
  baseDelayMs?: number;
  /** Allowed URL schemes. Default ['http:', 'https:']. */
  allowedProtocols?: string[];
  /** Injectable fetch (defaults to global fetch) — for tests. */
  fetchImpl?: typeof fetch;
  /** Injectable sleep (defaults to setTimeout) — for tests. */
  sleepImpl?: (ms: number) => Promise<void>;
}

/**
 * Delivers gate evidence to an external webhook over HTTP POST.
 * Shared adapter so any consumer (CLI, MCP Gateway, API) can notify webhooks.
 *
 * GT-351 hardening: validates the URL scheme (SSRF guard), bounds each attempt
 * with an AbortController timeout (no indefinite hangs), and retries transient
 * failures (network errors / 5xx) with exponential backoff — never retrying
 * non-retryable 4xx responses.
 */
export class WebhookAdapter implements IWebhookNotifier {
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly allowedProtocols: string[];
  private readonly fetchImpl: typeof fetch;
  private readonly sleepImpl: (ms: number) => Promise<void>;

  constructor(options: WebhookAdapterOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.maxAttempts = Math.max(1, options.maxAttempts ?? 3);
    this.baseDelayMs = options.baseDelayMs ?? 250;
    this.allowedProtocols = options.allowedProtocols ?? ['http:', 'https:'];
    // Late-bind global fetch so the call respects a fetch reassigned after
    // construction (test mocks) and never captures a stale reference.
    this.fetchImpl = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));
    this.sleepImpl = options.sleepImpl ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  async notify(url: string, evidence: GateEvidence): Promise<void> {
    this.assertSafeUrl(url);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const context = requestContextStorage.getStore();
    if (context) {
      if (context.correlationId) headers['x-correlation-id'] = context.correlationId;
      if (context.initiative) headers['x-evolith-initiative'] = context.initiative;
      if (context.tenant) headers['x-evolith-tenant'] = context.tenant;
      if (context.phase) headers['x-evolith-phase'] = context.phase;
    }
    const body = JSON.stringify(evidence);

    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(url, { method: 'POST', headers, body, signal: controller.signal });
        if (response.ok) return;
        // 4xx are caller/permanent errors — do not retry.
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`Webhook delivery failed with status: ${response.status}`);
        }
        lastError = new Error(`Webhook delivery failed with status: ${response.status}`);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        // A non-retryable 4xx surfaced above re-throws immediately.
        if (/status: 4\d\d/.test(err.message)) throw err;
        lastError = err;
      } finally {
        clearTimeout(timer);
      }

      if (attempt < this.maxAttempts) {
        await this.sleepImpl(this.baseDelayMs * 2 ** (attempt - 1));
      }
    }

    throw new Error(`Webhook delivery failed after ${this.maxAttempts} attempt(s): ${lastError?.message ?? 'unknown error'}`);
  }

  private assertSafeUrl(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(`Invalid webhook URL: ${url}`);
    }
    if (!this.allowedProtocols.includes(parsed.protocol)) {
      throw new Error(`Webhook URL protocol not allowed: ${parsed.protocol} (allowed: ${this.allowedProtocols.join(', ')})`);
    }
  }
}
