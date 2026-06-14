import { getValidateTools } from './validate';

jest.mock('../../../application/validators/ruleset-validator.service', () => ({
  RulesetValidatorService: jest.fn().mockImplementation(() => ({
    validate: jest.fn(),
    loadRulesetById: jest.fn(),
  })),
}));

import { RulesetValidatorService } from '@evolith/core-domain/application/validators/ruleset-validator.service';


const handleValidateTool = async (args: unknown, deps?: unknown) => {
  const tools = getValidateTools({} as unknown, {} as unknown);
  const tool = tools.find((t: unknown) => t.schema.name === 'evolith-validate');
  if (!tool) throw new Error('Unknown tool');
  let toolDeps = deps;
  if (deps && !deps.validator) {
    toolDeps = { validator: deps };
  }
  return tool.execute(args, toolDeps);
};

describe('MCP Tools - validate', () => {
  let mockValidator: jest.Mocked<RulesetValidatorService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidator = new RulesetValidatorService() as jest.Mocked<RulesetValidatorService>;
  });

  describe('handleValidateTool', () => {
    it('should return error when path is missing', async () => {
      const result = await handleValidateTool({}, mockValidator);

      expect(result).toHaveProperty('error', true);
      expect(result).toHaveProperty('message', 'path is required');
    });

    it('should validate repository when path provided', async () => {
      mockValidator.validate.mockResolvedValue({
        status: 'passed',
        rulesChecked: 10,
        issues: [],
      } as unknown);

      const result = await handleValidateTool({ path: '/test/repo' }, mockValidator);

      expect(mockValidator.validate).toHaveBeenCalledWith('/test/repo', undefined);
      expect(result).toHaveProperty('status', 'passed');
    });

    it('should pass corePath to validator', async () => {
      mockValidator.validate.mockResolvedValue({
        status: 'passed',
        rulesChecked: 5,
        issues: [],
      } as unknown);

      await handleValidateTool({ path: '/test/repo', corePath: '/core' }, mockValidator);

      expect(mockValidator.validate).toHaveBeenCalledWith('/test/repo', '/core');
    });

    it('should return summary format when requested', async () => {
      mockValidator.validate.mockResolvedValue({
        status: 'passed',
        rulesChecked: 10,
        issues: [],
      } as unknown);

      const result = await handleValidateTool({ path: '/test/repo', format: 'summary' }, mockValidator);

      expect(typeof result).toBe('string');
      expect(result).toContain('PASSED');
    });

    it('should return table format when requested', async () => {
      mockValidator.validate.mockResolvedValue({
        status: 'failed',
        rulesChecked: 10,
        issues: [
          { ruleId: 'GOV-01', severity: 'MUST', title: 'Missing evolith.yaml', blocking: true, category: 'Governance' },
        ],
      } as unknown);

      const result = await handleValidateTool({ path: '/test/repo', format: 'table' }, mockValidator);

      expect(typeof result).toBe('string');
      expect(result).toContain('| Rule |');
      expect(result).toContain('GOV-01');
    });

    it('should return JSON format by default', async () => {
      mockValidator.validate.mockResolvedValue({
        status: 'passed',
        rulesChecked: 10,
        issues: [],
      } as unknown);

      const result = await handleValidateTool({ path: '/test/repo' }, mockValidator);

      expect(typeof result).not.toBe('string');
      expect(result).toHaveProperty('status');
    });

    it('should load ruleset by ID when ruleset parameter provided', async () => {
      mockValidator.loadRulesetById.mockResolvedValue([{ id: 'R-01' }] as unknown);

      const result = await handleValidateTool({
        path: '/test/repo',
        ruleset: 'governance',
        corePath: '/core',
      }, mockValidator);

      expect(mockValidator.loadRulesetById).toHaveBeenCalledWith('/core', 'governance');
      expect(result).toHaveProperty('ruleset', 'governance');
      expect(result).toHaveProperty('issues');
    });

    it('should find core path automatically when not provided', async () => {
      mockValidator.loadRulesetById.mockResolvedValue([] as unknown);

      const result = await handleValidateTool({
        path: '/test/repo',
        ruleset: 'governance',
      }, mockValidator);

      expect(mockValidator.loadRulesetById).toHaveBeenCalled();
      expect(result).toHaveProperty('corePath');
    });

    it('should include timestamp in ruleset response', async () => {
      mockValidator.loadRulesetById.mockResolvedValue([] as unknown);

      const result = await handleValidateTool({
        path: '/test/repo',
        ruleset: 'governance',
      }, mockValidator);

      expect(result).toHaveProperty('timestamp');
    });

    it('should format summary with issue count', async () => {
      mockValidator.validate.mockResolvedValue({
        status: 'failed',
        rulesChecked: 15,
        issues: [
          { ruleId: 'GOV-01', severity: 'MUST', title: 'Issue 1', blocking: true },
          { ruleId: 'GOV-02', severity: 'SHOULD', title: 'Issue 2', blocking: false },
        ],
      } as unknown);

      const result = await handleValidateTool({ path: '/test/repo', format: 'summary' }, mockValidator);

      expect(result).toContain('Issues: 2');
    });

    it('should format table with blocking indicator', async () => {
      mockValidator.validate.mockResolvedValue({
        status: 'failed',
        rulesChecked: 10,
        issues: [
          { ruleId: 'GOV-01', severity: 'MUST', title: 'Blocking issue', blocking: true, category: 'Governance' },
          { ruleId: 'GOV-02', severity: 'SHOULD', title: 'Non-blocking', blocking: false, category: 'Governance' },
        ],
      } as unknown);

      const result = await handleValidateTool({ path: '/test/repo', format: 'table' }, mockValidator);

      expect(result).toContain('YES');
      expect(result).toContain('no');
    });
  });
});
