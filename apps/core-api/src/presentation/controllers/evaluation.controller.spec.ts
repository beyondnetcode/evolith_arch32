import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationController } from './evaluation.controller';
import { ValidateSatelliteUseCase } from '@evolith/core-domain/application/use-cases';
import { EvaluationOrchestrator } from '@evolith/core-domain/evaluation';
import { EvaluateSatelliteDto, EvaluationContextDto } from '../dtos/evaluation.dto';

const SAMPLE_GATE_EVAL = {
  artifactEvaluations: [
    {
      ruleId: 'GATE-F1-PRD',
      artifact: 'docs/prd.md',
      passed: false,
      message: 'Missing required artifact: docs/prd.md',
      severity: 'error' as const,
      remediation: 'Ensure docs/prd.md exists and defines scope boundaries',
      gateRef: 'gate-f1',
      rulePath: 'rulesets/opa/governance.rego',
    },
  ],
  gateId: 'gate-f1',
  gateName: 'Business Sign-Off',
  verdict: 'failed' as const,
};

const SAMPLE_ENVELOPE = {
  success: true as const,
  data: {
    topology: 'modular-monolith',
    gates: [SAMPLE_GATE_EVAL],
    summary: {
      totalGates: 1,
      passedGates: 0,
      failedGates: 1,
      totalRules: 1,
      passedRules: 0,
      failedRules: 1,
    },
  },
  meta: {
    command: 'evolith validate',
    executedAt: '2026-06-28T00:00:00.000Z',
    durationMs: 12,
    correlationId: 'ev-abc123',
    schemaVersion: '1.0.0',
  },
};

describe('EvaluationController (GT-361)', () => {
  let controller: EvaluationController;
  let useCase: jest.Mocked<ValidateSatelliteUseCase>;
  let orchestrator: { evaluate: jest.Mock };

  beforeEach(async () => {
    const mockUseCase = {
      execute: jest.fn(),
    };
    orchestrator = { evaluate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvaluationController],
      providers: [
        { provide: EvaluationOrchestrator, useValue: orchestrator },
        { provide: ValidateSatelliteUseCase, useValue: mockUseCase },
      ],
    }).compile();

    controller = module.get<EvaluationController>(EvaluationController);
    useCase = module.get(ValidateSatelliteUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  const body: EvaluateSatelliteDto = {
    satellitePath: '/satellite',
    corePath: '/core',
    topology: 'modular-monolith',
    phase: 'f1',
  };

  describe('ADR-0073 envelope shape', () => {
    it('returns the outputEnvelope from the pipeline (success:true, data, meta)', async () => {
      useCase.execute.mockResolvedValue({
        result: {} as any,
        evaluationVerdict: { ...({} as any), outputEnvelope: SAMPLE_ENVELOPE },
      });

      const response = await controller.evaluate(body);

      expect(response).toBe(SAMPLE_ENVELOPE);
      expect((response as typeof SAMPLE_ENVELOPE).success).toBe(true);
      expect((response as typeof SAMPLE_ENVELOPE).meta.command).toBe('evolith validate');
      expect((response as typeof SAMPLE_ENVELOPE).meta.schemaVersion).toBe('1.0.0');
    });

    it('propagates severity, remediation, and gateRef in gate evaluations', async () => {
      useCase.execute.mockResolvedValue({
        result: {} as any,
        evaluationVerdict: { ...({} as any), outputEnvelope: SAMPLE_ENVELOPE },
      });

      const response = await controller.evaluate(body) as typeof SAMPLE_ENVELOPE;
      const ev = response.data.gates[0].artifactEvaluations[0];

      expect(ev.severity).toBe('error');
      expect(ev.remediation).toBeTruthy();
      expect(ev.remediation.length).toBeGreaterThan(0);
      expect(ev.gateRef).toBe('gate-f1');
    });

    it('propagates topology and summary in the data envelope', async () => {
      useCase.execute.mockResolvedValue({
        result: {} as any,
        evaluationVerdict: { ...({} as any), outputEnvelope: SAMPLE_ENVELOPE },
      });

      const response = await controller.evaluate(body) as typeof SAMPLE_ENVELOPE;

      expect(response.data.topology).toBe('modular-monolith');
      expect(response.data.summary.totalGates).toBe(1);
      expect(response.data.summary.failedGates).toBe(1);
    });
  });

  describe('use case delegation', () => {
    it('forwards satellitePath, corePath, topology and phase as manifest', async () => {
      useCase.execute.mockResolvedValue({
        result: {} as any,
        evaluationVerdict: { ...({} as any), outputEnvelope: SAMPLE_ENVELOPE },
      });

      await controller.evaluate(body);

      expect(useCase.execute).toHaveBeenCalledWith({
        satellitePath: '/satellite',
        corePath: '/core',
        manifest: {
          satellitePath: '/satellite',
          corePath: '/core',
          topology: 'modular-monolith',
          phase: 'f1',
        },
      });
    });

    it('works with minimal body (only satellitePath)', async () => {
      const minimalEnvelope = { ...SAMPLE_ENVELOPE };
      useCase.execute.mockResolvedValue({
        result: {} as any,
        evaluationVerdict: { ...({} as any), outputEnvelope: minimalEnvelope },
      });

      const minimalBody: EvaluateSatelliteDto = { satellitePath: '/satellite' };
      const response = await controller.evaluate(minimalBody);

      expect(useCase.execute).toHaveBeenCalledWith({
        satellitePath: '/satellite',
        corePath: undefined,
        manifest: {
          satellitePath: '/satellite',
          corePath: undefined,
          topology: undefined,
          phase: undefined,
        },
      });
      expect(response).toBe(minimalEnvelope);
    });
  });

  describe('canonical EvaluationContext path (GT-378)', () => {
    const CANONICAL_RESULT = {
      overallVerdict: 'PASS',
      outcome: 'approved',
      results: {},
      rulesExecuted: [],
      policiesApplied: [],
      gaps: [],
      risks: [],
      missingEvidence: [],
      incompleteArtifacts: [],
      recommendations: [],
      requiredActions: [],
      confidence: 1,
      rationale: 'ok',
      versions: { core: '1.0.5' },
      evaluatedAt: '2026-06-28T12:00:00.000Z',
      schemaVersion: '1.0.0',
    };

    it('delegates to the orchestrator and returns the raw EvaluationResult', async () => {
      orchestrator.evaluate.mockResolvedValue(CANONICAL_RESULT);
      const ctx: EvaluationContextDto = { kinds: ['gate', 'compliance'], workspaceRef: 'ws-3f9a', phaseId: 'design', gateId: 'gate-f2' };

      const response = await controller.evaluate(ctx);

      expect(orchestrator.evaluate).toHaveBeenCalledWith(ctx);
      expect(useCase.execute).not.toHaveBeenCalled();
      expect(response).toBe(CANONICAL_RESULT);
    });

    it('rejects a body with neither workspaceRef nor satellitePath', async () => {
      await expect(controller.evaluate({ kinds: ['gate'] } as EvaluationContextDto)).rejects.toThrow(/workspaceRef.*satellitePath/);
      expect(orchestrator.evaluate).not.toHaveBeenCalled();
      expect(useCase.execute).not.toHaveBeenCalled();
    });
  });
});
