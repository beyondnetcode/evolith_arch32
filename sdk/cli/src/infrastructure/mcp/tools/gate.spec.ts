import { getGateTools } from './gate';
// eslint-disable-next-line boundaries/element-types
import { EvaluateGateUseCase } from '@evolith/core-domain/application/use-cases/evaluate-gate.use-case';

jest.mock('../../../application/use-cases/evaluate-gate.use-case');

describe('handleGateEvaluateTool', () => {
  let mockExecute: jest.Mock;
  let executeHandler: (args: unknown) => Promise<unknown>;

  beforeEach(() => {
    mockExecute = jest.fn();
    (EvaluateGateUseCase as jest.Mock).mockImplementation(() => ({
      execute: mockExecute
    }));

    const tools = getGateTools({} as unknown, {} as unknown);
    const handler = tools.find(t => t.schema.name === 'evolith-gate-evaluate');
    executeHandler = handler!.execute;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return error for invalid phase', async () => {
    const result = await executeHandler({ phase: 'invalid-phase', projectPath: '/fake' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_PHASE');
    }
  });

  it('should return error if projectPath is missing', async () => {
    const result = await executeHandler({ phase: 'discovery' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('IO_ERROR');
    }
  });

  it('should return success envelope in full mode', async () => {
    const fakeEvidence = {
      gateId: 'discovery-gate',
      phase: 'discovery',
      verdict: 'passed',
      rulesetRef: 'test-ref',
      rulesetVersion: '1.0',
      violations: [
        { severity: 'warning', message: 'Test warning' }
      ],
      evaluatedAt: '2023-01-01T00:00:00Z',
      evaluatedBy: 'agent'
    };
    mockExecute.mockResolvedValue(fakeEvidence);

    const result = await executeHandler({
      phase: 'discovery',
      projectPath: '/fake',
      evidenceMode: 'full'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(fakeEvidence);
      expect(result.meta.command).toBe('evolith gate evaluate');
    }
  });

  it('should return summary evidence when requested', async () => {
    const fakeEvidence = {
      gateId: 'discovery-gate',
      phase: 'discovery',
      verdict: 'failed',
      rulesetRef: 'test-ref',
      rulesetVersion: '1.0',
      violations: [
        { severity: 'error', message: 'E1' },
        { severity: 'error', message: 'E2' },
        { severity: 'warning', message: 'W1' }
      ],
      evaluatedAt: '2023-01-01T00:00:00Z',
      evaluatedBy: 'agent'
    };
    mockExecute.mockResolvedValue(fakeEvidence);

    const result = await executeHandler({
      phase: 'discovery',
      projectPath: '/fake',
      evidenceMode: 'summary'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as unknown;
      expect(data.violations).toEqual([]);
      expect(data.summary).toEqual({ errors: 2, warnings: 1 });
    }
  });

  it('should catch unhandled errors and wrap them in INTERNAL_ERROR', async () => {
    mockExecute.mockRejectedValue(new Error('Something bad'));

    const result = await executeHandler({ phase: 'discovery', projectPath: '/fake' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.message).toBe('Something bad');
    }
  });
  
  it('should include context in meta if initiative and tenant are passed', async () => {
    mockExecute.mockResolvedValue({ violations: [] });

    const result = await executeHandler({
      phase: 'discovery',
      projectPath: '/fake',
      initiative: 'init-1',
      tenant: 'tnt-A'
    });

    expect(result.meta.context).toEqual({
      phase: 'discovery',
      initiative: 'init-1',
      tenant: 'tnt-A'
    });
  });
});
