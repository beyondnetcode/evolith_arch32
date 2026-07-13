import { EvaluationOrchestrator } from './evaluation-orchestrator.service';
import type { IEvaluationPipeline } from './ports/evaluation-pipeline.port';
import type { IWorkspaceReferenceResolver } from './ports/workspace-reference-resolver.port';
import type { EvaluationContext } from './contracts';
import { normalizeEvidence } from './contracts';
import type { EvaluationVerdict } from '../domain/satellite-manifest';
import { Verdict } from '../domain/verdict/verdict';

function makeVerdict(passed: boolean): EvaluationVerdict {
  return {
    passed,
    resolvedTopology: 'modular-monolith',
    gates: [
      {
        gateId: 'gate-f1',
        gateName: 'Business Sign-Off',
        phase: 'f1',
        verdict: 'passed',
        artifactEvaluations: [
          { ruleId: 'PG-F1-001', rulePath: 'rulesets/opa/phase-gates.rego', artifact: 'prd.md', passed: true, message: 'ok', severity: 'error', remediation: '', gateRef: 'gate-f1' },
        ],
      },
      {
        gateId: 'gate-f2',
        gateName: 'Design Baseline',
        phase: 'f2',
        verdict: passed ? 'passed' : 'failed',
        artifactEvaluations: [
          { ruleId: 'PG-F2-001', rulePath: 'rulesets/opa/phase-gates.rego', artifact: 'adr-registry.md', passed, message: passed ? 'ok' : 'ADR registry missing', severity: 'error', remediation: 'Create the ADR registry', gateRef: 'gate-f2' },
        ],
      },
    ],
    summary: { totalGates: 2, passedGates: passed ? 2 : 1, failedGates: passed ? 0 : 1, totalRules: 2, passedRules: passed ? 2 : 1, failedRules: passed ? 0 : 1 },
    evaluatedAt: '2026-06-28T12:00:00.000Z',
  };
}

const resolver: IWorkspaceReferenceResolver = {
  resolve: async () => ({ satellitePath: '/ws/sat', corePath: '/ws/core' }),
};

const ctx: EvaluationContext = {
  kinds: ['gate', 'compliance'],
  tenant: { tenantId: 't-1' },
  product: { productId: 'p-1' },
  initiative: { initiativeId: 'i-1' },
  phaseId: 'design',
  gateId: 'gate-f2',
  workspaceRef: 'ws-opaque',
  correlationId: 'corr-1',
};

describe('EvaluationOrchestrator (GT-378)', () => {
  it('maps a passing pipeline verdict to a canonical approved result', async () => {
    const pipeline: IEvaluationPipeline = { evaluate: async () => makeVerdict(true) };
    const orch = new EvaluationOrchestrator(pipeline, resolver, '1.0.5');
    const r = await orch.evaluate(ctx);

    expect(r.overallVerdict).toBe(Verdict.PASS);
    expect(r.outcome).toBe('approved');
    expect(r.results.gate).toHaveLength(2);
    expect(r.results.gate?.[0].phaseId).toBe('discovery'); // f1 normalized
    expect(r.results.compliance?.passedChecks).toBe(2);
    expect(r.incompleteArtifacts).toHaveLength(0);
    expect(r.decisionRecommendation?.binding).toBe(false);
    expect(r.decisionRecommendation?.recommendedVerdict).toBe(Verdict.PASS);
    expect(r.decisionRecommendation?.subjectType).toBe('gate');
    expect(r.versions.core).toBe('1.0.5');
    expect(r.correlationId).toBe('corr-1');
  });

  it('maps a failing verdict to rejected with gaps and required actions', async () => {
    const pipeline: IEvaluationPipeline = { evaluate: async () => makeVerdict(false) };
    const orch = new EvaluationOrchestrator(pipeline, resolver, '1.0.5');
    const r = await orch.evaluate(ctx);

    expect(r.overallVerdict).toBe(Verdict.FAIL);
    expect(r.outcome).toBe('rejected');
    expect(r.gaps.length).toBeGreaterThan(0);
    expect(r.requiredActions.some((a) => a.blocking && a.remediation.includes('ADR registry'))).toBe(true);
    expect(r.incompleteArtifacts).toContain('adr-registry.md');
    expect(r.decisionRecommendation?.recommendedVerdict).toBe(Verdict.FAIL);
    expect(r.policiesApplied.every((p) => p.engine === 'opa')).toBe(true);
  });

  it('requires a workspaceRef', async () => {
    const pipeline: IEvaluationPipeline = { evaluate: async () => makeVerdict(true) };
    const orch = new EvaluationOrchestrator(pipeline, resolver, '1.0.5');
    await expect(orch.evaluate({ kinds: ['gate'] } as EvaluationContext)).rejects.toThrow(/workspaceRef/);
  });

  describe('multi-kind dispatch (GT-379)', () => {
    it('merges a registered KindEvaluator result and folds its verdict into the overall', async () => {
      const pipeline: IEvaluationPipeline = { evaluate: async () => makeVerdict(true) }; // pipeline PASS
      const archEvaluator = {
        kind: 'architecture' as const,
        evaluate: jest.fn(async () => ({
          verdict: Verdict.FAIL,
          results: {
            architecture: {
              verdict: Verdict.FAIL,
              risks: [{ id: 'r1', level: 'high' as const, category: 'architecture', message: 'layer leak' }],
              gaps: [{ id: 'g1', requirementRef: 'ADR-0002', severity: 'error' as const, message: 'boundary violation' }],
              recommendations: [],
            },
          },
          gaps: [{ id: 'g1', requirementRef: 'ADR-0002', severity: 'error' as const, message: 'boundary violation' }],
          risks: [{ id: 'r1', level: 'high' as const, category: 'architecture', message: 'layer leak' }],
        })),
      };

      const orch = new EvaluationOrchestrator(pipeline, resolver, '1.0.5', [archEvaluator]);
      const r = await orch.evaluate({ ...ctx, kinds: ['gate', 'architecture'] });

      expect(archEvaluator.evaluate).toHaveBeenCalledTimes(1);
      expect(r.results.gate).toHaveLength(2);          // pipeline kinds still present
      expect(r.results.architecture?.verdict).toBe(Verdict.FAIL);
      expect(r.overallVerdict).toBe(Verdict.FAIL);     // pipeline PASS folded with arch FAIL -> FAIL
      expect(r.outcome).toBe('rejected');
      expect(r.gaps.some((g) => g.id === 'g1')).toBe(true);
      expect(r.risks.some((x) => x.id === 'r1')).toBe(true);
      expect(r.decisionRecommendation?.recommendedVerdict).toBe(Verdict.FAIL);
    });

    it('ignores a requested kind with no registered evaluator (sub-result absent)', async () => {
      const pipeline: IEvaluationPipeline = { evaluate: async () => makeVerdict(true) };
      const orch = new EvaluationOrchestrator(pipeline, resolver, '1.0.5'); // no evaluators
      const r = await orch.evaluate({ ...ctx, kinds: ['gate', 'blueprint'] });

      expect(r.overallVerdict).toBe(Verdict.PASS);
      expect(r.results.blueprint).toBeUndefined();
      expect(r.results.gate).toHaveLength(2);
    });
  });

  describe('quality-signal seam wiring (GT-533 · ADR-0111)', () => {
    const perf = normalizeEvidence({
      source: 'lighthouse',
      dimension: 'performance',
      determinism: 'deterministic',
      metrics: { score: 0.42 },
      findings: [{ code: 'lcp', severity: 'high', message: 'slow LCP' }],
      provenance: { collectedBy: 'lighthouse', adapterVersion: '11.0.0', artifactHash: 'sha256:abc' },
    });

    it('surfaces the evidence-derived signal on the result when the context carries qualitySignals', async () => {
      const pipeline: IEvaluationPipeline = { evaluate: async () => makeVerdict(true) };
      const orch = new EvaluationOrchestrator(pipeline, resolver, '1.0.5');
      const r = await orch.evaluate({ ...ctx, qualitySignals: [perf] });

      expect(r.qualitySignals).toEqual([
        { dimension: 'performance', status: 'present', evidence: [perf] },
      ]);
      // Received Evidence[] actually influenced the result's signals.
      expect(r.qualitySignals?.[0].evidence[0].findings[0].code).toBe('lcp');
      // Advisory only: the verdict is untouched by the presence of evidence.
      expect(r.overallVerdict).toBe(Verdict.PASS);
    });

    it('surfaces a no-evidence signal and still succeeds when the context carries NO qualitySignals', async () => {
      const pipeline: IEvaluationPipeline = { evaluate: async () => makeVerdict(true) };
      const orch = new EvaluationOrchestrator(pipeline, resolver, '1.0.5');
      const r = await orch.evaluate(ctx); // no qualitySignals

      expect(r.qualitySignals).toEqual([
        { dimension: 'quality', status: 'no-evidence', evidence: [] },
      ]);
      // Absence of evidence is advisory — it never fails the evaluation.
      expect(r.overallVerdict).toBe(Verdict.PASS);
      expect(r.outcome).toBe('approved');
    });

    it('does not fail a passing evaluation merely because evidence is absent (empty array)', async () => {
      const pipeline: IEvaluationPipeline = { evaluate: async () => makeVerdict(true) };
      const orch = new EvaluationOrchestrator(pipeline, resolver, '1.0.5');
      const r = await orch.evaluate({ ...ctx, qualitySignals: [] });

      expect(r.qualitySignals?.[0].status).toBe('no-evidence');
      expect(r.overallVerdict).toBe(Verdict.PASS);
    });
  });
});
