import { EvaluateGateUseCase, PHASE_GATES_RULESET_REF, PHASE_TO_GATE_NUMBER } from './evaluate-gate.use-case';
import { GateValidationResult, PhaseGateValidatorService } from '../application/validators/phase-gate-validator.service';
import { GATE_PHASES } from '../../domain/gate-evidence';

function validationResult(overrides: Partial<GateValidationResult> = {}): GateValidationResult {
  return {
    gateId: 'PG-2',
    phase: 2,
    name: 'Design Baseline Approved',
    passed: false,
    evidenceResults: [
      {
        artifact: 'ADR Registry',
        passed: false,
        found: false,
        schemaValid: false,
        validationMessage: 'ADR registry not found',
        required: true,
      },
      {
        artifact: 'Bounded Context Map',
        passed: false,
        found: false,
        schemaValid: false,
        validationMessage: 'Bounded context map missing',
        required: false,
      },
      {
        artifact: 'Functional Stories',
        passed: true,
        found: true,
        schemaValid: true,
        validationMessage: 'ok',
        required: true,
      },
    ],
    blockingChecks: [
      { criterion: 'Architecture decisions are undocumented', triggered: true, action: 'Block transition' },
      { criterion: 'CI fails', triggered: false, action: 'Block transition' },
    ],
    waiverAvailable: true,
    accountableRole: 'Architecture Board',
    waiverAuthority: 'CTO',
    ...overrides,
  };
}

function useCaseWith(result: GateValidationResult, version = '1.0.0'): { useCase: EvaluateGateUseCase; validateGate: jest.Mock } {
  const validateGate = jest.fn().mockResolvedValue(result);
  const fakeValidator = {
    validateGate,
    getRulesetVersion: jest.fn().mockResolvedValue(version),
  } as unknown as PhaseGateValidatorService;
  return { useCase: new EvaluateGateUseCase(() => fakeValidator), validateGate };
}

describe('EvaluateGateUseCase (GT-03)', () => {
  it('maps every contract phase to its gate number', () => {
    expect(GATE_PHASES.map(ph => PHASE_TO_GATE_NUMBER[ph])).toEqual([1, 2, 3, 4, 5]);
  });

  it('converts failed required evidence to error violations and optional evidence to warnings', async () => {
    const { useCase } = useCaseWith(validationResult());
    const evidence = await useCase.execute({ phase: 'design', projectPath: '/tmp/x' });

    const severities = Object.fromEntries(evidence.violations.map(v => [v.ruleId, v.severity]));
    expect(severities['PG-2-EVIDENCE-adr-registry']).toBe('error');
    expect(severities['PG-2-EVIDENCE-bounded-context-map']).toBe('warning');
    expect(evidence.violations.find(v => v.ruleId.includes('functional-stories'))).toBeUndefined();
  });

  it('converts triggered blocking criteria to error violations', async () => {
    const { useCase } = useCaseWith(validationResult());
    const evidence = await useCase.execute({ phase: 'design', projectPath: '/tmp/x' });

    const blocking = evidence.violations.filter(v => v.ruleId.startsWith('PG-2-BLOCKING-'));
    expect(blocking).toHaveLength(1);
    expect(blocking[0].severity).toBe('error');
    expect(blocking[0].message).toContain('Architecture decisions are undocumented');
  });

  it('derives the verdict per contract: error violations fail the gate', async () => {
    const { useCase } = useCaseWith(validationResult());
    const evidence = await useCase.execute({ phase: 'design', projectPath: '/tmp/x' });
    expect(evidence.verdict).toBe('failed');
  });

  it('passes when only optional evidence fails (warnings do not block)', async () => {
    const result = validationResult({
      evidenceResults: [
        {
          artifact: 'Bounded Context Map',
          passed: false,
          found: false,
          schemaValid: false,
          validationMessage: 'missing',
          required: false,
        },
      ],
      blockingChecks: [],
    });
    const { useCase } = useCaseWith(result);
    const evidence = await useCase.execute({ phase: 'design', projectPath: '/tmp/x' });
    expect(evidence.verdict).toBe('passed');
    expect(evidence.violations).toHaveLength(1);
    expect(evidence.violations[0].severity).toBe('warning');
  });

  it('emits the full ADR-0073 contract fields', async () => {
    const { useCase, validateGate } = useCaseWith(validationResult(), '1.2.3');
    const evidence = await useCase.execute({ phase: 'qa', projectPath: '/tmp/x', evaluatedBy: 'ci' });

    expect(validateGate).toHaveBeenCalledWith(4, '/tmp/x');
    expect(evidence.gateId).toBe('design-baseline-approved');
    expect(evidence.phase).toBe('qa');
    expect(evidence.rulesetRef).toBe(PHASE_GATES_RULESET_REF);
    expect(evidence.rulesetVersion).toBe('1.2.3');
    expect(evidence.evaluatedBy).toBe('ci');
    expect(new Date(evidence.evaluatedAt).toString()).not.toBe('Invalid Date');
  });
});
