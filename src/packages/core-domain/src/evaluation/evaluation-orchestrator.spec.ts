import { EvaluationOrchestrator, UnsupportedEvaluationKindError } from './evaluation-orchestrator.service';
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

  describe('traceability of what actually ran (GT-601)', () => {
    /** Mixed run: OPA for the `.rego` phase gate, the native evaluator for the corpus. */
    function dualEngineVerdict(): EvaluationVerdict {
      const v = makeVerdict(false);
      v.gates.push({
        gateId: 'general-rulesets',
        gateName: 'Canonical Ruleset Enforcement',
        phase: 'cross',
        verdict: 'failed',
        artifactEvaluations: [
          {
            ruleId: 'HXA-01',
            rulePath: 'rulesets/hexagonal/HXA-01',
            artifact: 'src/domain/x.ts',
            passed: false,
            message: 'domain imports infrastructure',
            severity: 'error',
            remediation: 'invert the dependency',
            gateRef: 'general-rulesets',
          },
        ],
      });
      return v;
    }

    it('carries the true engine per rule end to end (opa AND native in one run)', async () => {
      const pipeline: IEvaluationPipeline = { evaluate: async () => dualEngineVerdict() };
      const orch = new EvaluationOrchestrator(pipeline, resolver, '1.0.5');
      const r = await orch.evaluate(ctx);

      const byRule = new Map(r.policiesApplied.map((p) => [p.ruleId, p.engine]));
      expect(byRule.get('PG-F1-001')).toBe('opa');
      expect(byRule.get('HXA-01')).toBe('native'); // hardcoded 'opa' before GT-601
      expect(r.rulesExecuted.map((x) => x.ruleId).sort()).toEqual(['HXA-01', 'PG-F1-001', 'PG-F2-001']);
    });

    it('threads the pipeline coverage into risks and the context artifacts into missingEvidence', async () => {
      const pipeline: IEvaluationPipeline = {
        evaluate: async () => ({
          ...dualEngineVerdict(),
          coverage: {
            rulesChecked: 3,
            rulesSkipped: 1,
            rulesErrored: 1,
            rulesTotal: 5,
            skippedRuleIds: ['PG-F1-999'],
            erroredRuleIds: ['CFG-09'],
          },
        }),
      };
      const orch = new EvaluationOrchestrator(pipeline, resolver, '1.0.5');
      const r = await orch.evaluate({
        ...ctx,
        artifacts: { required: ['prd.md', 'threat-model.md'], presented: [] },
      });

      expect(r.risks.map((x) => x.level).sort()).toEqual(['high', 'medium']);
      expect(r.missingEvidence).toEqual(['threat-model.md']);
    });
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

    it('REFUSES a requested kind with no registered evaluator instead of dropping it (GT-614)', async () => {
      const pipeline: IEvaluationPipeline = { evaluate: async () => makeVerdict(true) };
      const orch = new EvaluationOrchestrator(pipeline, resolver, '1.0.5'); // no evaluators

      // Before GT-614 this returned a PASS shaped entirely by gates the consumer
      // never asked for, with `results.blueprint` silently absent.
      await expect(orch.evaluate({ ...ctx, kinds: ['gate', 'blueprint'] })).rejects.toThrow(
        UnsupportedEvaluationKindError,
      );
      await expect(orch.evaluate({ ...ctx, kinds: ['gate', 'blueprint'] })).rejects.toThrow(
        /blueprint/,
      );
    });
  });

  describe('kinds are read BEFORE the pipeline executes (GT-614)', () => {
    const designEvaluator = () => ({
      kind: 'design' as const,
      evaluate: jest.fn(async () => ({
        verdict: Verdict.PASS,
        results: {
          design: {
            verdict: Verdict.PASS,
            technicalMaturity: 80,
            perConcernMaturity: [],
            artifactStatus: [],
            missingArtifacts: [],
            deviationsRequiringAdr: [],
            gaps: [],
            recommendations: [],
          },
        },
      })),
    });

    it('does not execute the rule pipeline when no pipeline kind was requested', async () => {
      const evaluate = jest.fn(async () => makeVerdict(false)); // would FAIL if it ran
      const orch = new EvaluationOrchestrator({ evaluate }, resolver, '1.0.5', [designEvaluator()]);

      const r = await orch.evaluate({ ...ctx, kinds: ['design'] });

      expect(evaluate).not.toHaveBeenCalled(); // ran in full before GT-614
      expect(r.results.design?.technicalMaturity).toBe(80);
      // The verdict is shaped ONLY by what was asked for: the failing gates never ran.
      expect(r.overallVerdict).toBe(Verdict.PASS);
      expect(r.results.gate).toBeUndefined();
      expect(r.results.artifact).toBeUndefined();
    });

    it('keeps the denominator honest: an unrequested kind is OUT OF SCOPE, not 0/0 compliance', async () => {
      const evaluate = jest.fn(async () => makeVerdict(true));
      const orch = new EvaluationOrchestrator({ evaluate }, resolver, '1.0.5', [designEvaluator()]);

      const r = await orch.evaluate({ ...ctx, kinds: ['design'] });

      // Absent, NOT a zeroed ComplianceResult that would read as "0/0 checks passed",
      // and distinct from GT-569 skipped/errored (unknown) and GT-571 not-applicable.
      expect(r.results.compliance).toBeUndefined();
      expect(r.rulesExecuted).toEqual([]);
      expect(r.policiesApplied).toEqual([]);
      expect(r.rationale).toMatch(/not executed/i);
    });

    it('still runs the pipeline when a pipeline kind IS requested alongside another kind', async () => {
      const evaluate = jest.fn(async () => makeVerdict(true));
      const orch = new EvaluationOrchestrator({ evaluate }, resolver, '1.0.5', [designEvaluator()]);

      const r = await orch.evaluate({ ...ctx, kinds: ['compliance', 'design'] });

      expect(evaluate).toHaveBeenCalledTimes(1);
      expect(r.results.compliance?.passedChecks).toBe(2);
      expect(r.results.design?.technicalMaturity).toBe(80);
    });

    it('treats an EMPTY kinds array as the legacy whole-pipeline request', async () => {
      // `evaluation.controller.ts` sends `kinds: []` for inline callers that predate
      // the field; that must keep meaning "nothing declared", not "nothing wanted".
      const evaluate = jest.fn(async () => makeVerdict(true));
      const orch = new EvaluationOrchestrator({ evaluate }, resolver, '1.0.5');

      const r = await orch.evaluate({ ...ctx, kinds: [] });

      expect(evaluate).toHaveBeenCalledTimes(1);
      expect(r.results.gate).toHaveLength(2);
    });

    it('reports which kinds it can serve, evaluator set included', () => {
      const orch = new EvaluationOrchestrator(
        { evaluate: async () => makeVerdict(true) },
        resolver,
        '1.0.5',
        [designEvaluator()],
      );
      expect([...orch.supportedKinds].sort()).toEqual(
        ['artifact', 'compliance', 'design', 'gate', 'rule'].sort(),
      );
    });

    it('refuses BEFORE resolving the workspace, so an unanswerable request costs no I/O', async () => {
      const evaluate = jest.fn(async () => makeVerdict(true));
      const resolve = jest.fn(async () => ({ satellitePath: '/ws/sat', corePath: '/ws/core' }));
      const orch = new EvaluationOrchestrator({ evaluate }, { resolve }, '1.0.5');

      await expect(orch.evaluate({ ...ctx, kinds: ['topology'] })).rejects.toThrow(
        UnsupportedEvaluationKindError,
      );
      expect(resolve).not.toHaveBeenCalled();
      expect(evaluate).not.toHaveBeenCalled();
    });
  });

  describe('requester and revision attribution (GT-586)', () => {
    const requester = {
      actorType: 'agent' as const,
      actorId: 'winston',
      modelRef: 'claude-opus-5',
      sessionId: 'sess-77',
    };
    const repositoryRevision = {
      revision: '9f3c1ab',
      repositoryRef: 'github.com/beyondnetcode/evolith',
      branch: 'main',
      dirty: false,
    };

    it('echoes the requester and the repository revision onto the verdict', async () => {
      const pipeline: IEvaluationPipeline = { evaluate: async () => makeVerdict(true) };
      const orch = new EvaluationOrchestrator(pipeline, resolver, '1.0.5');

      const r = await orch.evaluate({ ...ctx, requester, repositoryRevision });

      expect(r.requester).toEqual(requester);
      expect(r.requester?.actorType).toBe('agent'); // human vs agent, answerable at last
      expect(r.repositoryRevision?.revision).toBe('9f3c1ab');
    });

    it('carries attribution even when the rule pipeline is out of scope (GT-614 path)', async () => {
      const orch = new EvaluationOrchestrator(
        { evaluate: jest.fn(async () => makeVerdict(true)) },
        resolver,
        '1.0.5',
        [
          {
            kind: 'design' as const,
            evaluate: async () => ({ verdict: Verdict.PASS, results: {} }),
          },
        ],
      );

      const r = await orch.evaluate({ ...ctx, kinds: ['design'], requester, repositoryRevision });

      expect(r.requester?.actorId).toBe('winston');
      expect(r.repositoryRevision?.revision).toBe('9f3c1ab');
    });

    it('is additive: a context with neither field still yields a valid verdict', async () => {
      const pipeline: IEvaluationPipeline = { evaluate: async () => makeVerdict(true) };
      const orch = new EvaluationOrchestrator(pipeline, resolver, '1.0.5');

      const r = await orch.evaluate(ctx); // no requester, no revision

      expect(r.overallVerdict).toBe(Verdict.PASS);
      expect(r.requester).toBeUndefined();
      // Absent means "the consumer supplied none" — the Core never invents a sha.
      expect(r.repositoryRevision).toBeUndefined();
      expect('repositoryRevision' in r ? r.repositoryRevision : undefined).toBeUndefined();
    });

    it('never derives a revision from the workspace', async () => {
      const pipeline: IEvaluationPipeline = { evaluate: async () => makeVerdict(true) };
      const orch = new EvaluationOrchestrator(pipeline, resolver, '1.0.5');

      const r = await orch.evaluate({ ...ctx, requester });

      expect(r.requester).toEqual(requester);
      expect(r.repositoryRevision).toBeUndefined();
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
