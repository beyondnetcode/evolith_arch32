import { StandardsCommand } from './standards.command';

jest.mock('@clack/prompts', () => ({
  intro: jest.fn(),
  outro: jest.fn(),
  select: jest.fn(),
  text: jest.fn(),
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
  chalkFn.bgCyan = { white: { bold: (str: string) => str } };
  return chalkFn;
});

jest.mock('@evolith/core-domain/domain/services/standards.service', () => ({
  StandardsService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    list: jest.fn(),
    get: jest.fn(),
    validate: jest.fn(),
    export: jest.fn(),
  })),
  StandardCategory: {},
}));

jest.mock('../../infrastructure/observability', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import * as p from '@clack/prompts';
import { StandardsService } from '@evolith/core-domain/domain/services/standards.service';

const mockInitialize = jest.fn();
const mockList = jest.fn();
const mockGet = jest.fn();
const mockValidate = jest.fn();
const mockExport = jest.fn();

(StandardsService as jest.Mock).mockImplementation(() => ({
  initialize: mockInitialize,
  list: mockList,
  get: mockGet,
  validate: mockValidate,
  export: mockExport,
}));

describe('StandardsCommand', () => {
  let command: StandardsCommand;
  let logSpy: jest.SpyInstance;
  let tableSpy: jest.SpyInstance;
  let clearSpy: jest.SpyInstance;

  beforeEach(() => {
    command = new StandardsCommand();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    tableSpy = jest.spyOn(console, 'table').mockImplementation(() => {});
    clearSpy = jest.spyOn(console, 'clear').mockImplementation(() => {});
    jest.clearAllMocks();
    mockInitialize.mockReset();
    mockList.mockReset();
    mockGet.mockReset();
    mockValidate.mockReset();
    mockExport.mockReset();
  });

  afterEach(() => {
    logSpy.mockRestore();
    tableSpy.mockRestore();
    clearSpy.mockRestore();
  });

  describe('run', () => {
    it('should call initializeStandards when --init is passed', async () => {
      mockInitialize.mockResolvedValue(undefined);

      await command.run([], { init: true });

      expect(mockInitialize).toHaveBeenCalled();
      expect(p.log.success).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      mockInitialize.mockRejectedValue(new Error('Init failed'));

      await command.run([], { init: true });

      expect(p.log.error).toHaveBeenCalled();
    });

    it('should call listStandards when --list is passed', async () => {
      mockList.mockResolvedValue([
        {
          id: 'STD-001',
          name: 'Test Standard',
          version: '1.0.0',
          category: 'architecture',
          description: 'Test',
          rules: [{ id: 'R1', name: 'Rule 1', severity: 'error' as const, description: 'Test' }],
        },
      ]);

      await command.run([], { list: true });

      expect(mockList).toHaveBeenCalled();
      expect(tableSpy).toHaveBeenCalled();
    });

    it('should show warning when no standards are registered', async () => {
      mockList.mockResolvedValue([]);

      await command.run([], { list: true });

      expect(p.log.warn).toHaveBeenCalled();
      expect(tableSpy).not.toHaveBeenCalled();
    });

    it('should filter by category when --category is passed', async () => {
      mockList.mockResolvedValue([]);

      await command.run([], { list: true, category: 'governance' });

      expect(mockList).toHaveBeenCalledWith('governance');
    });

    it('should call getStandard when --get is passed', async () => {
      mockGet.mockResolvedValue({
        id: 'STD-001',
        name: 'Test Standard',
        version: '1.0.0',
        category: 'architecture',
        description: 'A test standard',
        rules: [
          {
            id: 'R1',
            name: 'Rule 1',
            severity: 'error' as const,
            description: 'Test rule',
            remediation: 'Fix it',
          },
        ],
      });

      await command.run([], { get: 'STD-001' });

      expect(mockGet).toHaveBeenCalledWith('STD-001');
      expect(p.log.info).toHaveBeenCalled();
    });

    it('should show error when standard is not found', async () => {
      mockGet.mockResolvedValue(undefined);

      await command.run([], { get: 'NONEXISTENT' });

      expect(p.log.error).toHaveBeenCalledWith(
        expect.stringContaining('no encontrado')
      );
    });

    it('should call validateStandards when --validate is passed', async () => {
      mockValidate.mockResolvedValue({
        totalRules: 5,
        passed: 3,
        failed: 2,
        results: [
          {
            standardId: 'STD-001',
            ruleId: 'R1',
            ruleName: 'Rule 1',
            severity: 'error',
            passed: false,
            message: 'Failed',
          },
        ],
      });

      await command.run([], { validate: 'some-code' });

      expect(mockValidate).toHaveBeenCalledWith('some-code');
      expect(p.log.info).toHaveBeenCalled();
    });

    it('should enter interactive mode when --validate has empty string', async () => {
      (p.select as jest.Mock).mockResolvedValue('list');
      mockList.mockResolvedValue([]);

      await command.run([], { validate: '' });

      expect(p.intro).toHaveBeenCalled();
      expect(mockValidate).not.toHaveBeenCalled();
    });

    it('should call exportStandard when --export is passed', async () => {
      mockExport.mockResolvedValue('# Standard: Test');

      await command.run([], { export: 'STD-001', format: 'markdown' });

      expect(mockExport).toHaveBeenCalledWith('STD-001', 'markdown');
    });

    it('should default to markdown format when no format is specified', async () => {
      mockExport.mockResolvedValue('# Standard: Test');

      await command.run([], { export: 'STD-001' });

      expect(mockExport).toHaveBeenCalledWith('STD-001', 'markdown');
    });

    it('should handle export errors', async () => {
      mockExport.mockRejectedValue(new Error('Export failed'));

      await command.run([], { export: 'STD-001' });

      expect(p.log.error).toHaveBeenCalled();
    });

    it('should enter interactive mode when no options are passed', async () => {
      (p.select as jest.Mock).mockResolvedValue('list');
      mockList.mockResolvedValue([]);

      await command.run([], {});

      expect(p.intro).toHaveBeenCalled();
      expect(p.select).toHaveBeenCalled();
    });

    it('should handle init action in interactive mode', async () => {
      (p.select as jest.Mock).mockResolvedValue('init');
      mockInitialize.mockResolvedValue(undefined);

      await command.run([], {});

      expect(mockInitialize).toHaveBeenCalled();
    });

    it('should handle get action in interactive mode', async () => {
      (p.select as jest.Mock).mockResolvedValue('get');
      (p.text as jest.Mock).mockResolvedValue('STD-001');
      mockGet.mockResolvedValue(undefined);

      await command.run([], {});

      expect(p.text).toHaveBeenCalled();
      expect(mockGet).toHaveBeenCalledWith('STD-001');
    });

    it('should handle validate action in interactive mode', async () => {
      (p.select as jest.Mock).mockResolvedValue('validate');
      (p.text as jest.Mock).mockResolvedValue('test-code');
      mockValidate.mockResolvedValue({
        totalRules: 1,
        passed: 1,
        failed: 0,
        results: [],
      });

      await command.run([], {});

      expect(mockValidate).toHaveBeenCalledWith('test-code');
    });

    it('should handle export action in interactive mode', async () => {
      (p.select as jest.Mock)
        .mockResolvedValueOnce('export')
        .mockResolvedValueOnce('json');
      (p.text as jest.Mock).mockResolvedValue('STD-001');
      mockExport.mockResolvedValue('{}');

      await command.run([], {});

      expect(mockExport).toHaveBeenCalledWith('STD-001', 'json');
    });
  });

  describe('parseInit', () => {
    it('should return true', () => {
      expect(command.parseInit()).toBe(true);
    });
  });

  describe('parseList', () => {
    it('should return true', () => {
      expect(command.parseList()).toBe(true);
    });
  });

  describe('parseGet', () => {
    it('should return the value', () => {
      expect(command.parseGet('STD-001')).toBe('STD-001');
    });
  });

  describe('parseValidate', () => {
    it('should return the value', () => {
      expect(command.parseValidate('test-code')).toBe('test-code');
    });
  });

  describe('parseExport', () => {
    it('should return the value', () => {
      expect(command.parseExport('STD-001')).toBe('STD-001');
    });
  });

  describe('parseFormat', () => {
    it('should return the value', () => {
      expect(command.parseFormat('json')).toBe('json');
    });
  });

  describe('parseCategory', () => {
    it('should return the value', () => {
      expect(command.parseCategory('architecture')).toBe('architecture');
    });
  });
});
