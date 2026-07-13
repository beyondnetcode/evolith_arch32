import { mapLangfuseTrace, type LangfuseTrace } from './observability-evidence';

const trace = (over: Partial<LangfuseTrace> = {}): LangfuseTrace => ({
  id: 'trace-1',
  timestamp: '2026-07-12T00:00:00.000Z',
  htmlPath: 'https://cloud.langfuse.com/trace/trace-1',
  observations: [
    {
      type: 'GENERATION',
      model: 'claude-opus-4-8',
      promptName: 'summarize',
      promptVersion: 3,
      usage: { totalTokens: 1200 },
      calculatedTotalCost: 0.021,
      latency: 800,
      toolCalls: [{ name: 'search' }, { name: 'fetch' }],
    },
    { type: 'SPAN', calculatedTotalCost: 0.004, latency: 120, toolCalls: [{ name: 'search' }] },
  ],
  scores: [{ name: 'helpfulness', value: 0.9 }, { name: 'grounded', value: 'yes' }],
  ...over,
});

describe('mapLangfuseTrace (GT-530 — Langfuse → portable evidence)', () => {
  it('maps model, prompt version, and the trace url/timestamp', () => {
    const e = mapLangfuseTrace(trace())!;
    expect(e).toMatchObject({
      traceId: 'trace-1',
      source: 'langfuse',
      model: 'claude-opus-4-8',
      promptName: 'summarize',
      promptVersion: 3,
      url: 'https://cloud.langfuse.com/trace/trace-1',
      timestamp: '2026-07-12T00:00:00.000Z',
    });
  });

  it('aggregates cost, tokens and latency across observations', () => {
    const e = mapLangfuseTrace(trace())!;
    expect(e.costUsd).toBeCloseTo(0.025); // 0.021 + 0.004
    expect(e.totalTokens).toBe(1200);
    expect(e.latencyMs).toBe(920); // 800 + 120
  });

  it('prefers trace-level cost/latency when present', () => {
    const e = mapLangfuseTrace(trace({ totalCost: 0.05, latency: 1000 }))!;
    expect(e.costUsd).toBe(0.05);
    expect(e.latencyMs).toBe(1000);
  });

  it('collects distinct tool-call names and maps scores to evaluations', () => {
    const e = mapLangfuseTrace(trace())!;
    expect(e.toolCalls.sort()).toEqual(['fetch', 'search']);
    expect(e.evaluations).toEqual([{ name: 'helpfulness', value: 0.9 }, { name: 'grounded', value: 'yes' }]);
  });

  it('returns null for a trace with no id (no identity → not evidence)', () => {
    expect(mapLangfuseTrace({ observations: [] })).toBeNull();
  });

  it('handles a sparse trace (no observations/scores) without throwing', () => {
    const e = mapLangfuseTrace({ id: 't' })!;
    expect(e).toMatchObject({ traceId: 't', source: 'langfuse', toolCalls: [], evaluations: [] });
    expect(e.costUsd).toBeUndefined();
  });
});
