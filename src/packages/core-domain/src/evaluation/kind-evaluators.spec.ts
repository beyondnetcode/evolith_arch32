import {
  createArchitectureKindEvaluator,
  createCheckpointKindEvaluator,
  createTopologyKindEvaluator,
  createBlueprintKindEvaluator,
  createDeploymentKindEvaluator,
  createDesignKindEvaluator,
  createPhaseArtifactKindEvaluator,
  nextPhase,
  severityToRisk,
} from './kind-evaluators';
import { Verdict } from '../domain/verdict/verdict';

const ctx: any = { kinds: ['architecture'], workspaceRef: 'ws', topologyRef: 'modular-monolith', phaseId: 'design' };
const ws = { satellitePath: '/ws/sat', corePath: '/ws/core' };

describe('kind-evaluators (GT-379)', () => {
  describe('helpers', () => {
    it('maps severities to risk levels', () => {
      expect(severityToRisk('MUST')).toBe('high');
      expect(severityToRisk('SHOULD')).toBe('medium');
      expect(severityToRisk('COULD')).toBe('low');
    });
    it('computes the next canonical phase (and clamps at release)', () => {
      expect(nextPhase('discovery')).toBe('design');
      expect(nextPhase('qa')).toBe('release');
      expect(nextPhase('release')).toBe('release');
    });
  });

  describe('architecture', () => {
    it('maps a DriftReport with violations to FAIL + risks/gaps', async () => {
      const driftService: any = {
        detectDrift: jest.fn(async () => ({
          detectedLevel: 'F2',
          driftDetected: true,
          driftSeverity: 'high',
          newViolations: [{ ruleId: 'ARC-1', severity: 'MUST', category: 'architecture', title: 'leak', description: 'boundary leak', blocking: true }],
          persistentViolations: [],
        })),
      };
      const ev = createArchitectureKindEvaluator(driftService);
      const r = await ev.evaluate(ctx, ws);
      expect(driftService.detectDrift).toHaveBeenCalledWith({ projectPath: '/ws/sat', corePath: '/ws/core', declaredLevel: 'modular-monolith' });
      expect(r.verdict).toBe(Verdict.FAIL);
      expect(r.results.architecture?.verdict).toBe(Verdict.FAIL);
      expect(r.risks?.[0]).toMatchObject({ id: 'ARC-1', level: 'high' });
      expect(r.gaps?.[0]).toMatchObject({ id: 'ARC-1', severity: 'error' });
    });
    it('maps no drift to PASS', async () => {
      const driftService: any = { detectDrift: jest.fn(async () => ({ detectedLevel: 'F2', driftDetected: false, driftSeverity: 'none', newViolations: [], persistentViolations: [] })) };
      const r = await createArchitectureKindEvaluator(driftService).evaluate(ctx, ws);
      expect(r.verdict).toBe(Verdict.PASS);
    });
  });

  describe('checkpoint', () => {
    it('SKIPs when no phaseId', async () => {
      const proposeAdvance: any = { execute: jest.fn() };
      const r = await createCheckpointKindEvaluator(proposeAdvance).evaluate({ ...ctx, phaseId: undefined }, ws);
      expect(r.verdict).toBe(Verdict.SKIP);
      expect(proposeAdvance.execute).not.toHaveBeenCalled();
    });
    it('maps a recommended proposal to PASS with a checkpoint result', async () => {
      const proposeAdvance: any = {
        execute: jest.fn(async () => ({ fromPhase: 'design', toPhase: 'construction', isRecommended: true, evidence: { violations: [] } })),
      };
      const r = await createCheckpointKindEvaluator(proposeAdvance).evaluate(ctx, ws);
      expect(proposeAdvance.execute).toHaveBeenCalledWith(expect.objectContaining({ fromPhase: 'design', toPhase: 'construction', projectPath: '/ws/sat' }));
      expect(r.verdict).toBe(Verdict.PASS);
      expect(r.results.checkpoint?.[0]).toMatchObject({ phaseId: 'design', verdict: Verdict.PASS });
    });
    it('maps a non-recommended proposal to FAIL with gaps from violations', async () => {
      const proposeAdvance: any = {
        execute: jest.fn(async () => ({ fromPhase: 'design', toPhase: 'construction', isRecommended: false, evidence: { violations: [{ ruleId: 'G-1', severity: 'error', message: 'missing ADR' }] } })),
      };
      const r = await createCheckpointKindEvaluator(proposeAdvance).evaluate(ctx, ws);
      expect(r.verdict).toBe(Verdict.FAIL);
      expect(r.gaps?.[0]).toMatchObject({ id: 'G-1', severity: 'error' });
    });
  });

  describe('topology', () => {
    it('SKIPs when no topology is confirmed at all', async () => {
      const cat: any = { get: jest.fn(), list: jest.fn() };
      const r = await createTopologyKindEvaluator(cat, () => '/core').evaluate({ ...ctx, topologyRef: undefined }, ws);
      expect(r.verdict).toBe(Verdict.SKIP);
    });
    it('PASSes when the topology exists in the catalog', async () => {
      const cat: any = { get: jest.fn(async () => ({ metadata: { id: 'modular-monolith' } })), list: jest.fn(async () => []) };
      const r = await createTopologyKindEvaluator(cat, () => '/core').evaluate(ctx, ws);
      expect(r.verdict).toBe(Verdict.PASS);
      // GT-688: `results.topology` is an ARRAY now; the scalar shorthand yields
      // exactly one entry, so a pre-GT-688 caller loses nothing.
      expect(r.results.topology?.[0]?.conformant).toBe(true);
      expect(r.results.topology).toHaveLength(1);
    });
    it('FAILs unknown topology and recommends available ones', async () => {
      const cat: any = { get: jest.fn(async () => undefined), list: jest.fn(async () => [{ metadata: { id: 'microservices' } }, { metadata: { id: 'serverless' } }]) };
      const r = await createTopologyKindEvaluator(cat, () => '/core').evaluate(ctx, ws);
      expect(r.verdict).toBe(Verdict.FAIL);
      expect(r.results.topology?.[0]?.conformant).toBe(false);
      expect(r.recommendations?.[0].references).toEqual(['microservices', 'serverless']);
    });

    // -----------------------------------------------------------------------
    // GT-688 — the kind used to read ONLY `ctx.topologyRef`, so a consumer that
    // confirmed a composition in `design` got Verdict.SKIP and an empty result:
    // the engine judged nothing and reported a pass.
    // -----------------------------------------------------------------------

    it('no longer SKIPs on a composition without topologyRef', async () => {
      const cat: any = {
        get: jest.fn(async (_c: string, id: string) => ({ metadata: { id } })),
        list: jest.fn(async () => []),
      };
      const r = await createTopologyKindEvaluator(cat, () => '/core').evaluate(
        { ...ctx, topologyRef: undefined, design: { topologyConfirmedRefs: ['modular-monolith', 'agentic-ai'] } },
        ws,
      );
      expect(r.verdict).toBe(Verdict.PASS);
      expect(r.results.topology).toHaveLength(2);
      expect(r.results.topology?.map((t) => t.topologyRef)).toEqual(['modular-monolith', 'agentic-ai']);
      expect(r.results.topology?.every((t) => t.conformant)).toBe(true);
    });

    it('refuses two progressive-axis members instead of unioning them', async () => {
      // MM-R01 ("Single Deployment Unit") and MS-R01 are both blocking and both
      // unsatisfiable on one repository. `notApplicableReason` is an OR, so a
      // union would put both in scope. Fail loudly rather than emit a contradiction.
      const cat: any = {
        get: jest.fn(async (_c: string, id: string) => ({ metadata: { id } })),
        list: jest.fn(async () => []),
      };
      const r = await createTopologyKindEvaluator(cat, () => '/core').evaluate(
        { ...ctx, topologyRef: undefined, design: { topologyConfirmedRefs: ['modular-monolith', 'microservices'] } },
        ws,
      );
      expect(r.verdict).toBe(Verdict.FAIL);
      const conflict = r.gaps?.find((g) => g.id === 'TOPOLOGY_COMPOSITION_CONFLICT');
      expect(conflict).toBeDefined();
      expect(conflict!.message).toContain('modular-monolith');
      expect(conflict!.message).toContain('microservices');
    });

    it('does not report the conflicting entries as conformant PASSes', async () => {
      // The run-level verdict said FAIL while BOTH array entries said
      // `verdict: PASS, conformant: true`, because `conformant` was answering
      // "is it in the catalog" — which it is. Any consumer folding the array
      // (`results.topology.every(t => t.conformant)`) therefore read a green out
      // of a refused run: the two halves of one document contradicted each other.
      const cat: any = {
        get: jest.fn(async (_c: string, id: string) => ({ metadata: { id } })),
        list: jest.fn(async () => []),
      };
      const r = await createTopologyKindEvaluator(cat, () => '/core').evaluate(
        { ...ctx, topologyRef: undefined, design: { topologyConfirmedRefs: ['modular-monolith', 'microservices'] } },
        ws,
      );

      expect(r.results.topology).toHaveLength(2);
      expect(r.results.topology!.every((t) => t.conformant)).toBe(false);
      for (const entry of r.results.topology!) {
        expect(entry.verdict).toBe(Verdict.FAIL);
        expect(entry.conformant).toBe(false);
        // The reason travels WITH the entry, so a consumer reading one topology
        // out of the array is told why it was refused.
        expect(entry.gaps?.some((g) => g.id === 'TOPOLOGY_COMPOSITION_CONFLICT')).toBe(true);
      }
      // …and the run-level list still carries the conflict exactly ONCE, not
      // once per conflicting member.
      expect(r.gaps!.filter((g) => g.id === 'TOPOLOGY_COMPOSITION_CONFLICT')).toHaveLength(1);
    });

    it('leaves a NON-conflicting member of the same composition conformant', async () => {
      // Only the progressive-axis members collide. A cross-axis member of a
      // conflicting composition is still a truthful, catalogued confirmation and
      // must not be tarred with the refusal.
      const cat: any = {
        get: jest.fn(async (_c: string, id: string) => ({ metadata: { id } })),
        list: jest.fn(async () => []),
      };
      const r = await createTopologyKindEvaluator(cat, () => '/core').evaluate(
        {
          ...ctx,
          topologyRef: undefined,
          design: { topologyConfirmedRefs: ['modular-monolith', 'microservices', 'agentic-ai'] },
        },
        ws,
      );

      const byId = new Map(r.results.topology!.map((t) => [t.topologyRef, t]));
      expect(byId.get('agentic-ai')!.conformant).toBe(true);
      expect(byId.get('agentic-ai')!.verdict).toBe(Verdict.PASS);
      expect(byId.get('modular-monolith')!.conformant).toBe(false);
      expect(byId.get('microservices')!.conformant).toBe(false);
    });

    it('reports a shadowed scalar instead of dropping it in silence', async () => {
      const cat: any = {
        get: jest.fn(async (_c: string, id: string) => ({ metadata: { id } })),
        list: jest.fn(async () => []),
      };
      const r = await createTopologyKindEvaluator(cat, () => '/core').evaluate(
        { ...ctx, topologyRef: 'serverless', design: { topologyConfirmedRefs: ['event-driven'] } },
        ws,
      );
      expect(r.results.topology).toHaveLength(1);
      expect(r.results.topology?.[0]?.topologyRef).toBe('event-driven');
      const shadowed = r.recommendations?.find((x) => x.id === 'topology-scalar-shadowed');
      expect(shadowed).toBeDefined();
      expect(shadowed!.message).toContain('serverless');
    });
  });

  describe('blueprint (GT-379 AC-3)', () => {
    const exists = (v: boolean) => jest.fn(async () => v);
    it('SKIPs when no blueprintRef is declared', async () => {
      const probe = exists(true);
      const r = await createBlueprintKindEvaluator(probe, () => '/core').evaluate({ ...ctx, blueprintRef: undefined }, ws);
      expect(r.verdict).toBe(Verdict.SKIP);
      expect(probe).not.toHaveBeenCalled();
    });
    it('PASSes when the blueprintRef resolves to a Core definition', async () => {
      const r = await createBlueprintKindEvaluator(exists(true), () => '/core').evaluate({ ...ctx, blueprintRef: 'authoritative-tech-stack-nodejs' }, ws);
      expect(r.verdict).toBe(Verdict.PASS);
      expect(r.results.blueprint).toMatchObject({ blueprintRef: 'authoritative-tech-stack-nodejs', verdict: Verdict.PASS });
      expect(r.gaps).toEqual([]);
    });
    it('FAILs an unknown blueprintRef with a gap + required action', async () => {
      const r = await createBlueprintKindEvaluator(exists(false), () => '/core').evaluate({ ...ctx, blueprintRef: 'nope' }, ws);
      expect(r.verdict).toBe(Verdict.FAIL);
      expect(r.gaps?.[0]).toMatchObject({ id: 'BLUEPRINT_UNKNOWN', requirementRef: 'nope', severity: 'error' });
      expect(r.requiredActions?.[0]).toMatchObject({ blocking: true });
    });
  });

  describe('deployment (GT-379 AC-3)', () => {
    it('SKIPs when no deployment context is declared', async () => {
      const r = await createDeploymentKindEvaluator().evaluate({ ...ctx, deployment: undefined }, ws);
      expect(r.verdict).toBe(Verdict.SKIP);
    });
    it('PASSes a complete deployment context', async () => {
      const r = await createDeploymentKindEvaluator().evaluate({ ...ctx, deployment: { environment: 'prod', releaseRef: 'v1.2.3' } }, ws);
      expect(r.verdict).toBe(Verdict.PASS);
      expect(r.results.deployment).toMatchObject({ environment: 'prod', releaseRef: 'v1.2.3', verdict: Verdict.PASS });
    });
    it('FAILs when required deployment fields are missing', async () => {
      const r = await createDeploymentKindEvaluator().evaluate({ ...ctx, deployment: { environment: '', releaseRef: '' } }, ws);
      expect(r.verdict).toBe(Verdict.FAIL);
      expect(r.gaps?.map((g) => g.id)).toEqual(expect.arrayContaining(['DEPLOY-ENV-MISSING', 'DEPLOY-RELEASE-MISSING']));
    });
    it('flags an adverse declared deployment status as a risk', async () => {
      const r = await createDeploymentKindEvaluator().evaluate({ ...ctx, deployment: { environment: 'prod', releaseRef: 'v1', status: 'rolled-back' } }, ws);
      expect(r.risks?.[0]).toMatchObject({ id: 'DEPLOY-STATUS-ADVERSE', level: 'high' });
    });
  });

  describe('design (GT-429 / ADR-0104)', () => {
    it('SKIPs when no design context is declared', async () => {
      const gp = jest.fn();
      const r = await createDesignKindEvaluator(gp, () => '/core').evaluate({ ...ctx, design: undefined }, ws);
      expect(r.verdict).toBe(Verdict.SKIP);
      expect(gp).not.toHaveBeenCalled();
    });

    it('measures maturity as present/expected over the confirmed composition (advisory PASS)', async () => {
      const gp = jest.fn(async (_c: string, ref: string) =>
        ref === 'serverless' ? { required: [{ artifactKind: 'performance-plan' }, { artifactKind: 'infrastructure-plan' }] } : undefined,
      );
      const design = {
        topologyConfirmedRefs: ['serverless'],
        blocks: [
          { blockKind: 'architecture-blueprint' },
          { blockKind: 'testing-strategy' },
          { blockKind: 'adr-registry' },
          { blockKind: 'topology-compliance-matrix' },
          { blockKind: 'technical-maturity-evaluation' },
          { blockKind: 'performance-plan' },
        ],
      };
      const r = await createDesignKindEvaluator(gp, () => '/core').evaluate({ ...ctx, design }, ws);
      // advisory: never fails the overall verdict
      expect(r.verdict).toBe(Verdict.PASS);
      // required = 5 universal + performance-plan + infrastructure-plan = 7; present = 6 → 86
      expect(r.results.design?.technicalMaturity).toBe(86);
      expect(r.results.design?.missingArtifacts).toEqual(['infrastructure-plan']);
      expect(r.gaps?.every((g) => g.severity === 'warning')).toBe(true);
    });

    it('records a non-blocking deviation → ADR when a concern uses an off-composition topology', async () => {
      const gp = jest.fn(async () => ({ required: [] }));
      const design = {
        topologyConfirmedRefs: ['serverless'],
        concerns: [{ concern: 'legacy', topologies: ['microservices'], blocks: [] }],
      };
      const r = await createDesignKindEvaluator(gp, () => '/core').evaluate({ ...ctx, design }, ws);
      expect(r.results.design?.deviationsRequiringAdr).toHaveLength(1);
      expect(r.requiredActions?.[0]).toMatchObject({ blocking: false });
      expect(r.results.design?.perConcernMaturity[0]).toMatchObject({ concern: 'legacy' });
    });

    it('derives downstream criteria from present blocks (generative contract, GT-432)', async () => {
      const gp = jest.fn(async () => ({ required: [{ artifactKind: 'performance-plan' }] }));
      const design = {
        topologyConfirmedRefs: ['serverless'],
        blocks: [{ blockKind: 'performance-plan' }, { blockKind: 'testing-strategy' }],
      };
      const r = await createDesignKindEvaluator(gp, () => '/core').evaluate({ ...ctx, design }, ws);
      const dc = r.results.design?.downstreamCriteria ?? [];
      const phases = dc.map((c) => c.message.match(/^\[(\w+)\]/)?.[1]);
      // performance-plan → quality + deployment; testing-strategy → quality
      expect(phases).toEqual(expect.arrayContaining(['quality', 'deployment']));
      expect(dc.some((c) => c.references?.includes('performance-plan'))).toBe(true);
    });
  });

  describe('phase-artifacts (GT-434 / ADR-0104 · DN-06)', () => {
    it('SKIPs when phaseId is absent or maps to no downstream phase', async () => {
      const gp = jest.fn();
      const noPhase = await createPhaseArtifactKindEvaluator(gp, () => '/core').evaluate({ ...ctx, phaseId: undefined }, ws);
      expect(noPhase.verdict).toBe(Verdict.SKIP);
      // 'design' is an SDLC phase but has no downstream artifact profile.
      const designPhase = await createPhaseArtifactKindEvaluator(gp, () => '/core').evaluate({ ...ctx, phaseId: 'design' }, ws);
      expect(designPhase.verdict).toBe(Verdict.SKIP);
      expect(gp).not.toHaveBeenCalled();
    });

    it('maps qa → quality and measures completeness over the confirmed composition (advisory PASS)', async () => {
      const gp = jest.fn(async (_c: string, ref: string) =>
        ref === 'microservices' ? { quality: { required: [{ artifactKind: 'consumer-contract-verification' }] } } : undefined,
      );
      const context = {
        ...ctx,
        phaseId: 'qa',
        design: { topologyConfirmedRefs: ['microservices'] },
        artifacts: {
          // 6 of the 7 universal quality artifacts present; the topology adds a
          // distinct required artifact that stays missing → measure a partial.
          presented: [
            { artifactId: 'test-summary-report' },
            { artifactId: 'coverage-report' },
            { artifactId: 'security-scan-result' },
            { artifactId: 'contract-test-result' },
            { artifactId: 'cfr-metric' },
            { artifactId: 'defect-log' },
            { artifactId: 'exception-status' },
          ],
        },
      };
      const r = await createPhaseArtifactKindEvaluator(gp, () => '/core').evaluate(context, ws);
      expect(gp).toHaveBeenCalledWith('/ws/core', 'microservices');
      expect(r.verdict).toBe(Verdict.PASS); // advisory
      expect(r.results.phaseArtifacts?.phase).toBe('quality');
      // required = 10 universal + consumer-contract-verification = 11; present = 7 → 64.
      //
      // Was 88 until GT-650 / ADR-0125. The quality phase gained `acceptance-validation`,
      // `integration-evidence` and `pyramid-distribution`, all three REQUIRED BY gate-f4 and all
      // three missing from the hand-written constant. The declared set in this test did not
      // change, so the drop is the correction: this evaluation was reporting 88% complete against
      // a list that omitted three of its own gate's requirements.
      expect(r.results.phaseArtifacts?.completeness).toBe(64);
      // The three gate-f4 requirements the constant used to omit now show as MISSING, which is
      // the whole correction: they always were missing from this declaration and nothing said so.
      expect(r.results.phaseArtifacts?.missingArtifacts).toEqual([
        'acceptance-validation', 'integration-evidence', 'pyramid-distribution',
        'consumer-contract-verification',
      ]);
      expect(r.gaps?.every((g) => g.severity === 'warning')).toBe(true);
    });

    it('falls back to ctx.topologyRef and release → deployment', async () => {
      const gp = jest.fn(async () => undefined);
      const context = { ...ctx, phaseId: 'release', design: undefined, topologyRef: 'serverless', artifacts: { presented: [] } };
      const r = await createPhaseArtifactKindEvaluator(gp, () => '/core').evaluate(context, ws);
      expect(gp).toHaveBeenCalledWith('/ws/core', 'serverless');
      expect(r.results.phaseArtifacts?.phase).toBe('deployment');
      // no declared artifacts → 0 completeness against the 6 universal deployment artifacts
      expect(r.results.phaseArtifacts?.completeness).toBe(0);
      expect(r.results.phaseArtifacts?.missingArtifacts).toContain('release-plan');
    });
  });
});
