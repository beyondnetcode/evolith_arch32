import {
  createArchitectureKindEvaluator,
  createCheckpointKindEvaluator,
  createTopologyKindEvaluator,
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
});
