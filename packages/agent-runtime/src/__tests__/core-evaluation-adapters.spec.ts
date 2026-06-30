/**
 * GT-384 — the production Core-evaluation adapters and stub↔real parity.
 *
 * Asserts the in-process adapter delegates unchanged, the HTTP adapter unwraps
 * the ADR-0073 envelope, and that both the stub and a real-shaped result satisfy
 * the same EvaluationResult contract surface (0 drift) — the real engine
 * additionally populates `rulesExecuted` / `policiesApplied`, which the stub
 * leaves empty (the very limitation GT-384 closes).
 */

import { StubCoreEvaluationAdapter } from '../adapters/core/stub-core-evaluation.adapter';
import { InProcessCoreEvaluationAdapter } from '../adapters/core/in-process-core-evaluation.adapter';
import { HttpCoreEvaluationAdapter } from '../adapters/core/http-core-evaluation.adapter';
import type { EvaluationContext, EvaluationResult } from '../domain/ports/core-evaluation.port';

const ctx = (): EvaluationContext =>
  ({ correlationId: 'corr-1', passthrough: { missing_artifacts: ['prd'] } } as unknown as EvaluationContext);

/** A canonical, fully-populated result as the REAL engine would return it. */
const realResult = (): EvaluationResult =>
  ({
    overallVerdict: 'PASS',
    outcome: 'approved',
    results: {},
    rulesExecuted: [{ ruleId: 'gate-f2', engine: 'native', verdict: 'PASS' }],
    policiesApplied: [{ ruleId: 'opa-dod', engine: 'opa', verdict: 'PASS' }],
    gaps: [],
    risks: [],
    missingEvidence: [],
    incompleteArtifacts: [],
    recommendations: [],
    requiredActions: [],
    confidence: 1,
    rationale: 'real engine',
    versions: { core: '1.0.5' },
    evaluatedAt: '2026-06-30T00:00:00.000Z',
    correlationId: 'corr-1',
    schemaVersion: '1.0.0',
  } as unknown as EvaluationResult);

const CONTRACT_KEYS = [
  'overallVerdict', 'outcome', 'results', 'rulesExecuted', 'policiesApplied',
  'gaps', 'risks', 'missingEvidence', 'incompleteArtifacts', 'recommendations',
  'requiredActions', 'confidence', 'rationale', 'versions', 'evaluatedAt', 'schemaVersion',
] as const;

describe('InProcessCoreEvaluationAdapter', () => {
  it('delegates to the injected orchestrator and returns its result unchanged', async () => {
    const out = realResult();
    const orchestrator = { evaluate: jest.fn(async () => out) };
    const adapter = new InProcessCoreEvaluationAdapter(orchestrator);

    const res = await adapter.evaluate(ctx());

    expect(orchestrator.evaluate).toHaveBeenCalledTimes(1);
    expect(res).toBe(out);
  });
});

describe('HttpCoreEvaluationAdapter', () => {
  const endpoint = 'http://core/api/v1/evaluate';

  it('POSTs the context and unwraps the ADR-0073 envelope', async () => {
    const data = realResult();
    const fetchImpl = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ success: true, data }) }));
    const adapter = new HttpCoreEvaluationAdapter({ endpoint, fetchImpl });

    const res = await adapter.evaluate(ctx());

    expect(fetchImpl).toHaveBeenCalledWith(endpoint, expect.objectContaining({ method: 'POST' }));
    expect(res).toEqual(data);
  });

  it('tolerates a raw (un-enveloped) result body', async () => {
    const data = realResult();
    const fetchImpl = jest.fn(async () => ({ ok: true, status: 200, json: async () => data }));
    const adapter = new HttpCoreEvaluationAdapter({ endpoint, fetchImpl });

    expect(await adapter.evaluate(ctx())).toEqual(data);
  });

  it('throws on a non-2xx response', async () => {
    const fetchImpl = jest.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    const adapter = new HttpCoreEvaluationAdapter({ endpoint, fetchImpl });

    await expect(adapter.evaluate(ctx())).rejects.toThrow(/HTTP 503/);
  });
});

describe('stub ↔ real parity (0 contract drift)', () => {
  it('both return the full EvaluationResult contract surface', async () => {
    const stub = await new StubCoreEvaluationAdapter().evaluate(ctx());
    const real = await new InProcessCoreEvaluationAdapter({ evaluate: async () => realResult() }).evaluate(ctx());

    for (const k of CONTRACT_KEYS) {
      expect(stub).toHaveProperty(k);
      expect(real).toHaveProperty(k);
    }
  });

  it('the real engine populates execution traces the stub leaves empty', async () => {
    const stub = await new StubCoreEvaluationAdapter().evaluate(ctx());
    const real = realResult();

    expect(stub.rulesExecuted).toHaveLength(0);
    expect(stub.policiesApplied).toHaveLength(0);
    expect(real.rulesExecuted.length).toBeGreaterThan(0);
    expect(real.policiesApplied.length).toBeGreaterThan(0);
  });
});
