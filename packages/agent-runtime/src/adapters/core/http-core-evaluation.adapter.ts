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
 */

import type {
  ICoreEvaluationPort,
  EvaluationContext,
  EvaluationResult,
} from '../../domain/ports/core-evaluation.port';

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
    const res = await this.fetchImpl(this.options.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(this.options.headers ?? {}) },
      body: JSON.stringify(context),
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
