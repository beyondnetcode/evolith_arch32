/**
 * Observability evidence adapter (GT-530 · axis 1 — positioning §8.1 / §9-5).
 *
 * Maps an LLM/agent-execution TRACE from a specialized observability platform (Langfuse first)
 * to Evolith's canonical, PORTABLE evidence shape — trace id, model, prompt version, cost,
 * latency, tokens, tool calls, evaluations — so a governance gate can consume AI-execution
 * evidence WITHOUT Evolith rebuilding an LLM telemetry platform. §9-5 requires this evidence to
 * be portable; {@link ObservabilityEvidence} is that provider-neutral shape.
 *
 * Layering: PURE. Fetching a trace from the Langfuse API is the connector/infra step behind
 * {@link IObservabilityEvidenceSource} (follow-on); this maps an already-fetched trace.
 */

/** One evaluation/score attached to a trace (e.g. a Langfuse score). */
export interface EvaluationScore {
  readonly name: string;
  readonly value: number | string;
}

/** Provider-neutral evidence for one AI execution, portable across observability backends. */
export interface ObservabilityEvidence {
  readonly traceId: string;
  readonly source: string; // 'langfuse'
  readonly model?: string;
  readonly promptName?: string;
  readonly promptVersion?: string | number;
  readonly costUsd?: number;
  readonly latencyMs?: number;
  readonly totalTokens?: number;
  readonly toolCalls: readonly string[];
  readonly evaluations: readonly EvaluationScore[];
  readonly url?: string;
  readonly timestamp?: string;
}

/** The port an observability connector implements to supply a trace by id (infra, follow-on). */
export interface IObservabilityEvidenceSource {
  fetchEvidence(traceId: string): Promise<ObservabilityEvidence | null>;
}

// ---------------------------------------------------------------------------
// Langfuse mapper (the first observability backend)
// ---------------------------------------------------------------------------

export interface LangfuseObservation {
  readonly type?: string; // 'GENERATION' | 'SPAN' | 'EVENT'
  readonly name?: string;
  readonly model?: string;
  readonly promptName?: string;
  readonly promptVersion?: string | number;
  readonly usage?: { readonly totalTokens?: number };
  readonly calculatedTotalCost?: number;
  readonly latency?: number; // ms
  readonly toolCalls?: readonly { readonly name?: string }[];
}

export interface LangfuseScore {
  readonly name?: string;
  readonly value?: number | string;
}

export interface LangfuseTrace {
  readonly id?: string;
  readonly timestamp?: string;
  readonly htmlPath?: string; // url back to the trace
  readonly latency?: number; // trace-level ms, when present
  readonly totalCost?: number; // trace-level cost, when present
  readonly observations?: readonly LangfuseObservation[];
  readonly scores?: readonly LangfuseScore[];
}

function sum(values: readonly (number | undefined)[]): number | undefined {
  const nums = values.filter((v): v is number => typeof v === 'number');
  return nums.length ? nums.reduce((a, b) => a + b, 0) : undefined;
}

/**
 * Map a Langfuse trace to canonical {@link ObservabilityEvidence}. Aggregates cost/tokens/latency
 * across observations (trace-level values win when present), takes model/prompt from the first
 * GENERATION, collects tool-call names, and maps scores to evaluations. Returns `null` for a
 * trace with no id (no identity → cannot be evidence).
 */
export function mapLangfuseTrace(trace: LangfuseTrace): ObservabilityEvidence | null {
  const traceId = trace.id;
  if (!traceId) return null;
  const observations = trace.observations ?? [];
  const generation = observations.find((o) => o.type === 'GENERATION') ?? observations[0];

  const toolCalls = [
    ...new Set(
      observations.flatMap((o) => (o.toolCalls ?? []).map((t) => t.name).filter((n): n is string => !!n)),
    ),
  ];
  const evaluations: EvaluationScore[] = (trace.scores ?? [])
    .filter((s): s is Required<Pick<LangfuseScore, 'name' | 'value'>> => s.name != null && s.value != null)
    .map((s) => ({ name: s.name, value: s.value }));

  return {
    traceId,
    source: 'langfuse',
    model: generation?.model,
    promptName: generation?.promptName,
    promptVersion: generation?.promptVersion,
    costUsd: trace.totalCost ?? sum(observations.map((o) => o.calculatedTotalCost)),
    latencyMs: trace.latency ?? sum(observations.map((o) => o.latency)),
    totalTokens: sum(observations.map((o) => o.usage?.totalTokens)),
    toolCalls,
    evaluations,
    url: trace.htmlPath,
    timestamp: trace.timestamp,
  };
}
