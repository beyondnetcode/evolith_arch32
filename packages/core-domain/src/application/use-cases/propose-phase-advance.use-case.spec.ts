import { ProposePhaseAdvanceUseCase } from './propose-phase-advance.use-case';
import { EvaluateGateUseCase } from './evaluate-gate.use-case';
import { GateEvidence } from '../../domain/gate-evidence';

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

  // GT-379 AC-1: the checkpoint engine evaluates exit criteria WITHOUT mutating
  // canonical state — it emits a non-binding, idempotent proposal derived purely
  // from the evidence, via the read-only agent evaluation path (no persisted
  // decision, no phase advance).
  it('does not mutate canonical state — emits a non-binding, idempotent proposal', async () => {
    const fakeEvidence: GateEvidence = {
      gateId: 'design', phase: 'design', verdict: 'passed', rulesetRef: 'test',
      rulesetVersion: '1.0', violations: [], evaluatedAt: new Date().toISOString(), evaluatedBy: 'agent',
    };
    evaluateGateUseCaseMock.execute.mockResolvedValue(fakeEvidence);
    const input = { fromPhase: 'design' as const, toPhase: 'construction' as const, projectPath: '/p' };

    const first = await useCase.execute(input);
    const second = await useCase.execute(input);

    // Read-only agent evaluation path — never a commit/approve action.
    expect(evaluateGateUseCaseMock.execute).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'design', evaluatedBy: 'agent' }),
    );
    // The sole collaborator is the gate evaluator; the use case persists/advances nothing.
    expect((useCase as unknown as { evaluateGateUseCase: unknown }).evaluateGateUseCase).toBe(evaluateGateUseCaseMock);
    // Idempotent: no canonical state accumulates across proposals.
    expect(second.fromPhase).toBe(first.fromPhase);
    expect(second.toPhase).toBe(first.toPhase);
    expect(second.isRecommended).toBe(first.isRecommended);
    // Advisory only: recommendation is a pure function of the evidence verdict.
    expect(first.isRecommended).toBe(true);
  });
});
