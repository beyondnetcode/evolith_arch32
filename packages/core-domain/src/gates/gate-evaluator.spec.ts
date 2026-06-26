import { GateEvaluator, GateEvaluationResult } from './gate-evaluator';
import { PhaseGateValidatorService } from '../application/validators/phase-gate-validator.service';
import { ILogger } from '../domain/interfaces';

const createMockLogger = (): ILogger => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

const createMockValidator = (
  overrides?: Partial<PhaseGateValidatorService>,
): PhaseGateValidatorService => {
  const mock = {
    validateGate: jest.fn().mockResolvedValue({
      gateId: 'PG-1',
      phase: 1,
      name: 'Business Sign-Off',
      passed: true,
      evidenceResults: [
        { artifact: 'PRD', passed: true, found: true, schemaValid: true, validationMessage: 'OK', required: true },
        { artifact: 'Discovery Canvas', passed: true, found: true, schemaValid: true, validationMessage: 'OK', required: true },
      ],
      blockingChecks: [
        { criterion: 'Scope is ambiguous', triggered: false, action: 'BLOCK' },
      ],
      waiverAvailable: true,
      accountableRole: 'Product Owner',
      waiverAuthority: 'Executive Sponsor',
    }),
    ...overrides,
  };
  return mock as unknown as PhaseGateValidatorService;
};

describe('GateEvaluator', () => {
  let evaluator: GateEvaluator;
  let mockValidator: PhaseGateValidatorService;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockValidator = createMockValidator();
    evaluator = new GateEvaluator(mockValidator, mockLogger);
  });

  it('constructs without error using mocked dependencies', () => {
    expect(evaluator).toBeDefined();
  });

  it('returns a GateEvaluationResult with correct shape', async () => {
    const result: GateEvaluationResult = await evaluator.evaluate('/project', 1);

    expect(result).toHaveProperty('phase');
    expect(result).toHaveProperty('passed');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('violations');
    expect(result).toHaveProperty('timestamp');
  });

  it('computes score as 100 when all evidence passes', async () => {
    const result = await evaluator.evaluate('/project', 1);

    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('collects violation messages for failed evidence', async () => {
    const failingValidator = createMockValidator({
      validateGate: jest.fn().mockResolvedValue({
        gateId: 'PG-1',
        phase: 1,
        name: 'Business Sign-Off',
        passed: false,
        evidenceResults: [
          { artifact: 'PRD', passed: false, found: false, schemaValid: false, validationMessage: 'Artifact not found: PRD', required: true },
          { artifact: 'Discovery Canvas', passed: true, found: true, schemaValid: true, validationMessage: 'OK', required: true },
        ],
        blockingChecks: [
          { criterion: 'Scope is ambiguous', triggered: true, action: 'BLOCK — return to Phase 1' },
        ],
        waiverAvailable: true,
        accountableRole: 'Product Owner',
        waiverAuthority: 'Executive Sponsor',
      }),
    });

    const failingEvaluator = new GateEvaluator(failingValidator, mockLogger);
    const result = await failingEvaluator.evaluate('/project', 1);

    expect(result.passed).toBe(false);
    expect(result.score).toBe(50);
    expect(result.violations.length).toBe(2);
    expect(result.violations[0]).toContain('Artifact not found: PRD');
    expect(result.violations[1]).toContain('Scope is ambiguous');
  });

  it('returns score of 0 when there are no evidence results', async () => {
    const emptyValidator = createMockValidator({
      validateGate: jest.fn().mockResolvedValue({
        gateId: 'PG-1',
        phase: 1,
        name: 'Business Sign-Off',
        passed: true,
        evidenceResults: [],
        blockingChecks: [],
        waiverAvailable: true,
        accountableRole: 'Product Owner',
        waiverAuthority: 'Executive Sponsor',
      }),
    });

    const emptyEvaluator = new GateEvaluator(emptyValidator, mockLogger);
    const result = await emptyEvaluator.evaluate('/project', 1);

    expect(result.score).toBe(0);
  });
});
