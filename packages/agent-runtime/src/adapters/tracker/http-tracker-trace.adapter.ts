/**
 * HttpTrackerTraceAdapter — publishes trazability events to Evolith Tracker over
 * HTTP. Uses the global `fetch` (Node 18+). Delivery is best-effort: the runtime
 * already wraps publish() so a Tracker outage never blocks a governed result.
 *
 * This is intentionally thin; auth headers / retry / batching are wired by the
 * caller via `headers` and the optional `fetchImpl` injection (keeps it testable
 * and free of an HTTP-client dependency).
 */

import type { ITrackerTracePort } from '../../domain/ports/tracker-trace.port';
import type { TraceEvent } from '../../domain/contracts/trace';

type FetchLike = (url: string, init: Record<string, unknown>) => Promise<{ ok: boolean; status: number }>;

export interface HttpTrackerOptions {
  /** e.g. 'https://tracker.example.com/api/v1/traces'. */
  readonly endpoint: string;
  readonly headers?: Readonly<Record<string, string>>;
  /** Inject a fetch implementation (defaults to global fetch). */
  readonly fetchImpl?: FetchLike;
}

export class HttpTrackerTraceAdapter implements ITrackerTracePort {
  private readonly fetchImpl: FetchLike;

  constructor(private readonly options: HttpTrackerOptions) {
    const globalFetch = (globalThis as { fetch?: FetchLike }).fetch;
    const impl = options.fetchImpl ?? globalFetch;
    if (!impl) {
      throw new Error('HttpTrackerTraceAdapter requires fetch (Node 18+) or an injected fetchImpl.');
    }
    this.fetchImpl = impl;
  }

  async publish(event: TraceEvent): Promise<void> {
    const res = await this.fetchImpl(this.options.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(this.options.headers ?? {}) },
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      throw new Error(`Tracker publish failed: HTTP ${res.status}`);
    }
  }
}
