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
import type { CircuitBreaker } from '../resilience/circuit-breaker';

type FetchLike = (url: string, init: Record<string, unknown>) => Promise<{ ok: boolean; status: number }>;

export interface HttpTrackerOptions {
  /** e.g. 'https://tracker.example.com/api/v1/traces'. */
  readonly endpoint: string;
  readonly headers?: Readonly<Record<string, string>>;
  /** Inject a fetch implementation (defaults to global fetch). */
  readonly fetchImpl?: FetchLike;
  /**
   * Optional ADR-0011 breaker (GT-443). "Best-effort" only holds if the call is
   * BOUNDED: without a timeout a hung Tracker keeps a publish pending for
   * undici's 300 s default, which is not best-effort, it is a stall.
   */
  readonly breaker?: CircuitBreaker;
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
    const body = JSON.stringify(event);
    const call = (signal?: AbortSignal) => this.post(body, signal);
    const breaker = this.options.breaker;
    return breaker ? breaker.execute((signal) => call(signal)) : call();
  }

  private async post(body: string, signal?: AbortSignal): Promise<void> {
    const res = await this.fetchImpl(this.options.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(this.options.headers ?? {}) },
      body,
      ...(signal ? { signal } : {}),
    });
    if (!res.ok) {
      throw new Error(`Tracker publish failed: HTTP ${res.status}`);
    }
  }
}
