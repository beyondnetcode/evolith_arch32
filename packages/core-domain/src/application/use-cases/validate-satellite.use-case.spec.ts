import { ValidateSatelliteUseCase } from './validate-satellite.use-case';
import { RulesetValidatorService, ValidationResult } from '../../application/validators/ruleset-validator.service';

jest.mock('../../application/validators/ruleset-validator.service');

describe('ValidateSatelliteUseCase', () => {
  let mockValidator: jest.Mocked<RulesetValidatorService>;
  let useCase: ValidateSatelliteUseCase;

  const mockResult: ValidationResult = {
    status: 'passed',
    rulesChecked: 5,
    issues: [],
    coreRef: { version: '1.0.0', path: '/core' },
    timestamp: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    mockValidator = {
      validate: jest.fn().mockResolvedValue(mockResult),
      loadRulesetById: jest.fn().mockResolvedValue([]),
    } as unknown;

    useCase = new ValidateSatelliteUseCase(mockValidator);
  });

  describe('execute', () => {
    it('should validate satellite with default options', async () => {
      const { result } = await useCase.execute({
        satellitePath: '/satellite',
      });

      expect(result).toBe(mockResult);
      expect(mockValidator.validate).toHaveBeenCalledWith('/satellite', undefined);
    });

    it('should validate with custom core path', async () => {
      const { result } = await useCase.execute({
        satellitePath: '/satellite',
        corePath: '/custom-core',
      });

      expect(mockValidator.validate).toHaveBeenCalledWith('/satellite', '/custom-core');
    });

    it('should load specific ruleset when rulesetId provided', async () => {
      const resultWithRuleset = {
        ...mockResult,
        issues: [{ ruleId: 'TEST', severity: 'MUST' as const, category: 'test', title: 'Test', description: 'Test issue', blocking: true }],
      };
      mockValidator.loadRulesetById.mockResolvedValue(resultWithRuleset.issues);

      const { result } = await useCase.execute({
        satellitePath: '/satellite',
        rulesetId: 'acl',
      });

      expect(mockValidator.loadRulesetById).toHaveBeenCalledWith(expect.any(String), 'acl');
      expect(result.status).toBe('failed');
    });

    it('should return warning status when non-blocking issues exist', async () => {
      const warningResult = {
        ...mockResult,
        status: 'warning' as const,
        issues: [{ ruleId: 'WARN', severity: 'SHOULD' as const, category: 'test', title: 'Warning', description: 'Warning issue', blocking: false }],
      };
      mockValidator.validate.mockResolvedValue(warningResult);

      const { result } = await useCase.execute({
        satellitePath: '/satellite',
      });

      expect(result.status).toBe('warning');
    });
  });

  describe('executeWithFormat', () => {
    it('should return markdown formatted output', async () => {
      const { result, formattedOutput } = await useCase.executeWithFormat(
        { satellitePath: '/satellite' },
        'markdown',
      );

      expect(result).toBe(mockResult);
      expect(formattedOutput).toContain('# Validation Report');
      expect(formattedOutput).toContain('**Status:** PASSED');
      expect(formattedOutput).toContain('**Rules Checked:** 5');
    });

    it('should include blocking issues in markdown', async () => {
      const resultWithIssues: ValidationResult = {
        status: 'failed',
        rulesChecked: 3,
        issues: [
          {
            ruleId: 'GOV-01',
            severity: 'MUST',
            category: 'governance',
            title: 'Missing file',
            description: 'evolith.yaml is missing',
            file: '/satellite/evolith.yaml',
            blocking: true,
          },
        ],
        coreRef: { version: null, path: null },
        timestamp: '2024-01-01T00:00:00.000Z',
      };
      mockValidator.validate.mockResolvedValue(resultWithIssues);

      const { formattedOutput } = await useCase.executeWithFormat(
        { satellitePath: '/satellite' },
        'markdown',
      );

      expect(formattedOutput).toContain('## Blocking Issues');
      expect(formattedOutput).toContain('**GOV-01**');
      expect(formattedOutput).toContain('Missing file');
    });

    it('should return json format without formatted output', async () => {
      const { result, formattedOutput } = await useCase.executeWithFormat(
        { satellitePath: '/satellite' },
        'json',
      );

      expect(result).toBe(mockResult);
      expect(formattedOutput).toBeUndefined();
    });
  });
});