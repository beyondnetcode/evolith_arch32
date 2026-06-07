import { ValidateCommand } from './validate.command';

jest.mock('@clack/prompts', () => ({
  intro: jest.fn(),
  outro: jest.fn(),
  spinner: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    message: jest.fn(),
  },
}));

jest.mock('chalk', () => {
  const chalkFn = (str: string) => str;
  chalkFn.green = (str: string) => str;
  chalkFn.red = (str: string) => str;
  chalkFn.bold = (str: string) => str;
  chalkFn.yellow = (str: string) => str;
  chalkFn.blue = (str: string) => str;
  chalkFn.cyan = (str: string) => str;
  return chalkFn;
});

jest.mock('../../application/use-cases/validate-satellite.use-case', () => ({
  ValidateSatelliteUseCase: jest.fn().mockImplementation(() => ({
    execute: jest.fn(),
  })),
}));

jest.mock('../../core/validators/ruleset-validator.service', () => ({
  RulesetValidatorService: jest.fn().mockImplementation(() => ({
    validate: jest.fn(),
    validateArchitecture: jest.fn(),
    loadRulesetById: jest.fn(),
  })),
}));

jest.mock('../../core/observability', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../infrastructure/formatters/output-formatter.service', () => ({
  OutputFormatterService: jest.fn().mockImplementation(() => ({
    format: jest.fn((_data, _opts) => 'formatted output'),
  })),
}));

import * as p from '@clack/prompts';
import { ValidateSatelliteUseCase } from '../../application/use-cases/validate-satellite.use-case';
import { RulesetValidatorService } from '../../core/validators/ruleset-validator.service';
import { OutputFormatterService } from '../../infrastructure/formatters/output-formatter.service';
import { logger } from '../../core/observability';

const mockExecute = jest.fn();
const mockValidateArchitecture = jest.fn();
const mockFormat = jest.fn();

(ValidateSatelliteUseCase as jest.Mock).mockImplementation(() => ({
  execute: mockExecute,
}));

(RulesetValidatorService as jest.Mock).mockImplementation(() => ({
  validateArchitecture: mockValidateArchitecture,
}));

(OutputFormatterService as jest.Mock).mockImplementation(() => ({
  format: mockFormat,
}));

describe('ValidateCommand', () => {
  let command: ValidateCommand;
  let logSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    command = new ValidateCommand();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    jest.clearAllMocks();
    mockExecute.mockReset();
    mockValidateArchitecture.mockReset();
    mockFormat.mockReset();
    mockFormat.mockReturnValue('formatted output');
  });

  afterEach(() => {
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  describe('run', () => {
    const defaultResult = {
      status: 'passed' as const,
      rulesChecked: 5,
      issues: [],
      coreRef: { version: '1.0.0', path: '/core' },
      timestamp: '2024-01-01T00:00:00.000Z',
    };

    it('should show intro and run validation', async () => {
      mockExecute.mockResolvedValue({ result: defaultResult });

      await command.run([], {});

      expect(p.intro).toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalled();
    });

    it('should use current working directory when no satellite path is provided', async () => {
      mockExecute.mockResolvedValue({ result: defaultResult });

      await command.run([], {});

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({ satellitePath: expect.any(String) })
      );
    });

    it('should use provided satellite path', async () => {
      mockExecute.mockResolvedValue({ result: defaultResult });

      await command.run([], { satellite: '/custom/satellite' });

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({ satellitePath: '/custom/satellite' })
      );
    });

    it('should use provided core path', async () => {
      mockExecute.mockResolvedValue({ result: defaultResult });

      await command.run([], { core: '/custom/core' });

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({ corePath: '/custom/core' })
      );
    });

    it('should validate specific ruleset when --ruleset is passed', async () => {
      mockExecute.mockResolvedValue({ result: defaultResult });

      await command.run([], { ruleset: 'adr-0002' });

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({ rulesetId: 'adr-0002' })
      );
    });

    it('should include architecture validation when --arch is passed', async () => {
      mockExecute.mockResolvedValue({ result: defaultResult });
      mockValidateArchitecture.mockResolvedValue({
        status: 'passed',
        levels: ['F1', 'F2', 'F3'],
        rulesChecked: 10,
        issues: [],
        timestamp: '2024-01-01T00:00:00.000Z',
      });

      await command.run([], { architecture: true });

      expect(mockValidateArchitecture).toHaveBeenCalled();
    });

    it('should use custom arch level when --arch-level is passed', async () => {
      mockExecute.mockResolvedValue({ result: defaultResult });
      mockValidateArchitecture.mockResolvedValue({
        status: 'passed',
        levels: ['F1'],
        rulesChecked: 3,
        issues: [],
        timestamp: '2024-01-01T00:00:00.000Z',
      });

      await command.run([], { architecture: true, archLevel: 'F1' });

      expect(mockValidateArchitecture).toHaveBeenCalledWith(
        expect.any(String),
        undefined,
        'F1'
      );
    });

    it('should update result with architecture issues', async () => {
      mockExecute.mockResolvedValue({ result: defaultResult });
      mockValidateArchitecture.mockResolvedValue({
        status: 'failed',
        levels: ['F1'],
        rulesChecked: 3,
        issues: [{
          ruleId: 'F1-R01',
          severity: 'MUST',
          category: 'architecture',
          title: 'Architecture issue',
          description: 'Test',
          blocking: true,
        }],
        timestamp: '2024-01-01T00:00:00.000Z',
      });

      await command.run([], { architecture: true });

      expect(p.outro).toHaveBeenCalledWith(
        expect.stringContaining('fallado')
      );
    });

    it('should output JSON when format is json', async () => {
      mockExecute.mockResolvedValue({ result: defaultResult });

      await command.run([], { format: 'json' });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('passed')
      );
    });

    it('should write JSON to file when output is specified', async () => {
      const mockWriteFile = jest.fn().mockResolvedValue(undefined);
      jest.doMock('fs-extra', () => ({ writeFile: mockWriteFile }));

      mockExecute.mockResolvedValue({ result: defaultResult });

      await command.run([], { format: 'json', output: '/tmp/report.json' });

      expect(p.log.success).toHaveBeenCalled();
    });

    it('should output table format when format is table', async () => {
      mockExecute.mockResolvedValue({ result: defaultResult });

      await command.run([], { format: 'table' });

      expect(mockFormat).toHaveBeenCalled();
    });

    it('should output yaml format when format is yaml', async () => {
      mockExecute.mockResolvedValue({ result: defaultResult });

      await command.run([], { format: 'yaml' });

      expect(mockFormat).toHaveBeenCalled();
    });

    it('should output markdown format when format is markdown', async () => {
      mockExecute.mockResolvedValue({ result: defaultResult });

      await command.run([], { format: 'markdown' });

      expect(mockFormat).toHaveBeenCalled();
    });

    it('should print human report when format is not recognized', async () => {
      mockExecute.mockResolvedValue({ result: defaultResult });

      await command.run([], { format: 'unknown' });

      expect(p.log.success).toHaveBeenCalledWith(
        expect.stringContaining('problemas')
      );
    });

    it('should show passed outro when status is passed', async () => {
      mockExecute.mockResolvedValue({ result: defaultResult });

      await command.run([], {});

      expect(p.outro).toHaveBeenCalledWith(
        expect.stringContaining('cumple')
      );
    });

    it('should show warning outro when status is warning', async () => {
      mockExecute.mockResolvedValue({
        result: {
          ...defaultResult,
          status: 'warning' as const,
          issues: [{
            ruleId: 'GOV-01',
            severity: 'SHOULD',
            category: 'governance',
            title: 'Warning issue',
            description: 'Test warning',
            blocking: false,
          }],
        },
      });

      await command.run([], {});

      expect(p.outro).toHaveBeenCalledWith(
        expect.stringContaining('advertencias')
      );
    });

    it('should show failed outro and exit when status is failed', async () => {
      mockExecute.mockResolvedValue({
        result: {
          ...defaultResult,
          status: 'failed' as const,
          issues: [{
            ruleId: 'GOV-01',
            severity: 'MUST',
            category: 'governance',
            title: 'Blocking issue',
            description: 'Test error',
            blocking: true,
          }],
        },
      });

      await command.run([], {});

      expect(p.outro).toHaveBeenCalledWith(
        expect.stringContaining('fallado')
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle validation errors and exit', async () => {
      mockExecute.mockRejectedValue(new Error('Validation failed'));
      exitSpy.mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await expect(command.run([], {})).rejects.toThrow('process.exit called');

      expect(p.log.error).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should display blocking issues in human report', async () => {
      mockExecute.mockResolvedValue({
        result: {
          ...defaultResult,
          status: 'failed' as const,
          issues: [{
            ruleId: 'GOV-01',
            severity: 'MUST',
            category: 'governance',
            title: 'Blocking issue',
            description: 'Test error',
            file: 'evolith.yaml',
            blocking: true,
          }],
        },
      });

      await command.run([], { format: 'unknown' });

      expect(p.log.error).toHaveBeenCalledWith(
        expect.stringContaining('bloqueante')
      );
    });

    it('should display warnings in human report', async () => {
      mockExecute.mockResolvedValue({
        result: {
          ...defaultResult,
          status: 'warning' as const,
          issues: [{
            ruleId: 'GOV-02',
            severity: 'SHOULD',
            category: 'governance',
            title: 'Warning issue',
            description: 'Test warning',
            blocking: false,
          }],
        },
      });

      await command.run([], { format: 'unknown' });

      expect(p.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('advertencia')
      );
    });

    it('should show core version in human report', async () => {
      mockExecute.mockResolvedValue({
        result: {
          ...defaultResult,
          issues: [{
            ruleId: 'GOV-02',
            severity: 'SHOULD',
            category: 'governance',
            title: 'Warning',
            description: 'Test',
            blocking: false,
          }],
        },
      });

      await command.run([], { format: 'unknown' });

      expect(p.log.info).toHaveBeenCalledWith(
        expect.stringContaining('1.0.0')
      );
    });
  });

  describe('parseFormat', () => {
    it('should return the value', () => {
      expect(command.parseFormat('json')).toBe('json');
    });
  });

  describe('parseOutput', () => {
    it('should return the value', () => {
      expect(command.parseOutput('/tmp/report.json')).toBe('/tmp/report.json');
    });
  });

  describe('parseSatellite', () => {
    it('should return the value', () => {
      expect(command.parseSatellite('/satellite')).toBe('/satellite');
    });
  });

  describe('parseCore', () => {
    it('should return the value', () => {
      expect(command.parseCore('/core')).toBe('/core');
    });
  });

  describe('parseRuleset', () => {
    it('should return the value', () => {
      expect(command.parseRuleset('adr-0002')).toBe('adr-0002');
    });
  });

  describe('parseArchitecture', () => {
    it('should return true', () => {
      expect(command.parseArchitecture()).toBe(true);
    });
  });

  describe('parseArchLevel', () => {
    it('should return the value', () => {
      expect(command.parseArchLevel('F1')).toBe('F1');
    });
  });
});
