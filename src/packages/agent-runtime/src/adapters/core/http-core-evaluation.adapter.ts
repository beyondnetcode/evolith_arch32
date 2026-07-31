/**
 * HttpCoreEvaluationAdapter — the PRODUCTION {@link ICoreEvaluationPort} that
 * calls the stateless Core over HTTP (the Core API `POST /api/v1/evaluate`,
 * ADR-0101 / GT-384). Uses the global `fetch` (Node 18+); inject `fetchImpl`
 * for tests. Intentionally thin — auth headers are passed via `headers`, keeping
 * the adapter free of an HTTP-client dependency (mirrors HttpTrackerTraceAdapter).
 *
 * The Core API wraps the EvaluationResult in the ADR-0073 SuccessEnvelope
 * (`{ success: true, data: <EvaluationResult> }`); this adapter unwraps `data`,
 * tolerating a raw (un-enveloped) body for resilience.
 *
 * GT-443: this is the runtime's one MANDATORY outbound dependency (the
 * production profile refuses to boot without `AGENT_RUNTIME_CORE_ENDPOINT`), so
 * an optional {@link CircuitBreaker} may be injected. When present, every call
 * runs under it and the breaker's `AbortSignal` is forwarded to fetch, so a hung
 * Core is cancelled at `timeoutMs` instead of stalling behind undici's 300 s
 * default. Absent, behaviour is byte-for-byte what it was (unprotected) — the
 * option is additive, so the published contract does not change.
 */

import type {
  ICoreEvaluationPort,
  EvaluationContext,
  EvaluationResult,
} from '../../domain/ports/core-evaluation.port';
import type { CircuitBreaker } from '../resilience/circuit-breaker';

interface FetchResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}
type FetchLike = (url: string, init: Record<string, unknown>) => Promise<FetchResponse>;

export interface HttpCoreOptions {
  /** Core API evaluate endpoint, e.g. 'https://core.example.com/api/v1/evaluate'. */
  readonly endpoint: string;
  readonly headers?: Readonly<Record<string, string>>;
  /** Inject a fetch implementation (defaults to global fetch). */
  readonly fetchImpl?: FetchLike;
  /**
   * Optional ADR-0011 breaker guarding this outbound call (GT-443). Omit and the
   * call is unprotected, exactly as before.
   */
  readonly breaker?: CircuitBreaker;
}

export class HttpCoreEvaluationAdapter implements ICoreEvaluationPort {
  private readonly fetchImpl: FetchLike;

  constructor(private readonly options: HttpCoreOptions) {
    const globalFetch = (globalThis as { fetch?: FetchLike }).fetch;
    const impl = options.fetchImpl ?? globalFetch;
    if (!impl) {
      throw new Error('HttpCoreEvaluationAdapter requires fetch (Node 18+) or an injected fetchImpl.');
    }
    this.fetchImpl = impl;
  }

  async evaluate(context: EvaluationContext): Promise<EvaluationResult> {
    const body = JSON.stringify(context);
    const call = (signal?: AbortSignal) => this.post(body, signal);
    const breaker = this.options.breaker;
    return breaker ? breaker.execute((signal) => call(signal)) : call();
  }

  private async post(body: string, signal?: AbortSignal): Promise<EvaluationResult> {
    const res = await this.fetchImpl(this.options.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(this.options.headers ?? {}) },
      body,
      ...(signal ? { signal } : {}),
    });
    if (!res.ok) {
      throw new Error(`Core evaluation failed: HTTP ${res.status}`);
    }
    return unwrapEnvelope(await res.json());
  }
}

/** Unwrap the ADR-0073 SuccessEnvelope (`{ success, data }`); tolerate a raw result. */
function unwrapEnvelope(body: unknown): EvaluationResult {
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    return (body as { data: EvaluationResult }).data;
  }
  return body as EvaluationResult;
}
