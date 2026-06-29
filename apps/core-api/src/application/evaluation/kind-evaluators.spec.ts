import {
  createArchitectureKindEvaluator,
  createCheckpointKindEvaluator,
  createTopologyKindEvaluator,
  createBlueprintKindEvaluator,
  createDeploymentKindEvaluator,
  nextPhase,
  severityToRisk,
} from './kind-evaluators';
import { Verdict } from '@evolith/core-domain';

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
    it('SKIPs when no topologyRef', async () => {
      const cat: any = { get: jest.fn(), list: jest.fn() };
      const r = await createTopologyKindEvaluator(cat, () => '/core').evaluate({ ...ctx, topologyRef: undefined }, ws);
      expect(r.verdict).toBe(Verdict.SKIP);
    });
    it('PASSes when the topology exists in the catalog', async () => {
      const cat: any = { get: jest.fn(async () => ({ metadata: { id: 'modular-monolith' } })), list: jest.fn() };
      const r = await createTopologyKindEvaluator(cat, () => '/core').evaluate(ctx, ws);
      expect(r.verdict).toBe(Verdict.PASS);
      expect(r.results.topology?.conformant).toBe(true);
    });
    it('FAILs unknown topology and recommends available ones', async () => {
      const cat: any = { get: jest.fn(async () => undefined), list: jest.fn(async () => [{ metadata: { id: 'microservices' } }, { metadata: { id: 'serverless' } }]) };
      const r = await createTopologyKindEvaluator(cat, () => '/core').evaluate(ctx, ws);
      expect(r.verdict).toBe(Verdict.FAIL);
      expect(r.results.topology?.conformant).toBe(false);
      expect(r.recommendations?.[0].references).toEqual(['microservices', 'serverless']);
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
});
