import {
  IObservabilityEvidenceSource,
  ObservabilityEvidence,
  LangfuseTrace,
  mapLangfuseTrace,
} from '@beyondnet/evolith-core-domain/domain/observability-evidence';

/**
 * Injected transport for fetching a Langfuse trace by id. Keeping the network
 * concern behind this port keeps {@link LangfuseEvidenceAdapter} pure of HTTP/
 * config so it can be unit-tested with a stub. Returns `null` when the trace
 * does not exist.
 */
export interface LangfuseHttpClient {
  getTrace(traceId: string): Promise<LangfuseTrace | null>;
}

/**
 * Langfuse connector adapter (GT-530 · axis 1 — positioning §8.1 / §9-5).
 *
 * The infra/connector step behind {@link IObservabilityEvidenceSource}: fetches
 * a raw trace via the injected {@link LangfuseHttpClient}, then maps it to
 * Evolith's canonical, portable {@link ObservabilityEvidence} using the pure
 * core-domain mapper {@link mapLangfuseTrace}. No mapping logic lives here.
 */
export class LangfuseEvidenceAdapter implements IObservabilityEvidenceSource {
  constructor(private readonly client: LangfuseHttpClient) {}

  async fetchEvidence(traceId: string): Promise<ObservabilityEvidence | null> {
    const trace = await this.client.getTrace(traceId);
    if (!trace) return null;
    return mapLangfuseTrace(trace);
  }
}
