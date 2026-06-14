import { ProposePhaseAdvanceUseCase } from './propose-phase-advance.use-case';
import { EvaluateGateUseCase } from './evaluate-gate.use-case';
import { GateEvidence, GatePhase } from '../../domain/gate-evidence';

describe('ProposePhaseAdvanceUseCase', () => {
  let evaluateGateUseCaseMock: jest.Mocked<EvaluateGateUseCase>;
  let useCase: ProposePhaseAdvanceUseCase;

  beforeEach(() => {
    evaluateGateUseCaseMock = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<EvaluateGateUseCase>;

    useCase = new ProposePhaseAdvanceUseCase(evaluateGateUseCaseMock);
  });

  it('should recommend transition when evidence verdict is "passed"', async () => {
    const fakeEvidence: GateEvidence = {
      gateId: 'design',
      phase: 'design',
      verdict: 'passed',
      rulesetRef: 'test',
      rulesetVersion: '1.0',
      violations: [],
      evaluatedAt: new Date().toISOString(),
      evaluatedBy: 'agent',
    };
    evaluateGateUseCaseMock.execute.mockResolvedValue(fakeEvidence);

    const result = await useCase.execute({
      fromPhase: 'design',
      toPhase: 'construction',
      projectPath: '/path/to/project',
    });

    expect(evaluateGateUseCaseMock.execute).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'design' })
    );
    expect(result.fromPhase).toBe('design');
    expect(result.toPhase).toBe('construction');
    expect(result.evidence).toBe(fakeEvidence);
    expect(result.isRecommended).toBe(true);
    expect(result.proposedAt).toBeDefined();
  });

  it('should not recommend transition when evidence verdict is "failed"', async () => {
    const fakeEvidence: GateEvidence = {
      gateId: 'design',
      phase: 'design',
      verdict: 'failed',
      rulesetRef: 'test',
      rulesetVersion: '1.0',
      violations: [
        {
          ruleId: 'err-1',
          severity: 'error',
          location: 'some-file',
          message: 'Error message',
        },
      ],
      evaluatedAt: new Date().toISOString(),
      evaluatedBy: 'agent',
    };
    evaluateGateUseCaseMock.execute.mockResolvedValue(fakeEvidence);

    const result = await useCase.execute({
      fromPhase: 'design',
      toPhase: 'construction',
      projectPath: '/path/to/project',
    });

    expect(result.isRecommended).toBe(false);
  });
});
