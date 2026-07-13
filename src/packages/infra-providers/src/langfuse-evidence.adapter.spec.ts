import { LangfuseEvidenceAdapter, LangfuseHttpClient } from './langfuse-evidence.adapter';
import { LangfuseTrace } from '@beyondnet/evolith-core-domain/domain/observability-evidence';

const cannedTrace: LangfuseTrace = {
  id: 'trace-abc',
  timestamp: '2026-07-13T00:00:00.000Z',
  htmlPath: 'https://cloud.langfuse.com/trace/trace-abc',
  observations: [
    {
      type: 'GENERATION',
      name: 'llm-call',
      model: 'claude-opus-4-8',
      promptName: 'governance-gate',
      promptVersion: 3,
      usage: { totalTokens: 1234 },
      calculatedTotalCost: 0.0456,
      latency: 800,
      toolCalls: [{ name: 'search_repo' }, { name: 'read_file' }],
    },
  ],
  scores: [
    { name: 'faithfulness', value: 0.9 },
    { name: 'verdict', value: 'pass' },
  ],
};

const stubClient = (trace: LangfuseTrace | null): LangfuseHttpClient => ({
  getTrace: jest.fn().mockResolvedValue(trace),
});

describe('LangfuseEvidenceAdapter (GT-530 connector)', () => {
  it('fetches a trace and maps it to canonical ObservabilityEvidence', async () => {
    const client = stubClient(cannedTrace);
    const adapter = new LangfuseEvidenceAdapter(client);

    const evidence = await adapter.fetchEvidence('trace-abc');

    expect(client.getTrace).toHaveBeenCalledWith('trace-abc');
    expect(evidence).not.toBeNull();
    expect(evidence!.traceId).toBe('trace-abc');
    expect(evidence!.source).toBe('langfuse');
    expect(evidence!.model).toBe('claude-opus-4-8');
    expect(evidence!.costUsd).toBeCloseTo(0.0456);
    expect(evidence!.totalTokens).toBe(1234);
    expect(evidence!.toolCalls).toEqual(['search_repo', 'read_file']);
    expect(evidence!.evaluations).toEqual([
      { name: 'faithfulness', value: 0.9 },
      { name: 'verdict', value: 'pass' },
    ]);
  });

  it('returns null for an unknown trace id', async () => {
    const client = stubClient(null);
    const adapter = new LangfuseEvidenceAdapter(client);

    const evidence = await adapter.fetchEvidence('does-not-exist');

    expect(client.getTrace).toHaveBeenCalledWith('does-not-exist');
    expect(evidence).toBeNull();
  });
});
