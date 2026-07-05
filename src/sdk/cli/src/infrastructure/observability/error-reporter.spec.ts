import { ErrorReporter, ErrorContext, OperationContext } from './error-reporter';

jest.mock('./structured-logger', () => ({
  logger: {
    startOperation: jest.fn(),
    endOperation: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
  LogLevel: {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    FATAL: 'FATAL',
  },
}));

jest.mock('@beyondnet/evolith-core-domain/domain/errors', () => ({
  isEvolithError: jest.fn(() => false),
  getErrorContext: jest.fn(),
  getErrorCode: jest.fn(),
  EvolithError: class EvolithError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
      this.name = 'EvolithError';
    }
  },
}));

import { logger } from './structured-logger';
import * as errors from '@beyondnet/evolith-core-domain/domain/errors';

const mockIsEvolithError = errors.isEvolithError as jest.MockedFunction<typeof errors.isEvolithError>;

describe('ErrorReporter', () => {
  let reporter: ErrorReporter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEvolithError.mockReturnValue(false);
    reporter = new ErrorReporter();
  });

  describe('startOperation', () => {
    it('should start operation timing', () => {
      reporter.startOperation('test-operation');

      expect(logger.startOperation).toHaveBeenCalledWith('test-operation');
    });
  });

  describe('report', () => {
    it('should report standard Error', () => {
      const error = new Error('Test error');
      const context: ErrorContext = { operation: 'test', command: 'evolith validate' };

      const report = reporter.report(error, context);

      expect(report.error.name).toBe('Error');
      expect(report.error.message).toBe('Test error');
      expect(report.operation).toBe('test');
      expect(report.context).toEqual(context);
    });

    it('should report EvolithError with code', () => {
      mockIsEvolithError.mockReturnValue(true);
      const evolithError = new errors.EvolithError('Validation failed', 'GOV-01');

      const report = reporter.report(evolithError, { operation: 'validate' });

      expect(report.error.code).toBe('GOV-01');
      expect(report.suggestion).toBeDefined();
    });

    it('should report unknown error type', () => {
      const report = reporter.report('string error', { operation: 'test' });

      expect(report.error.name).toBe('Unknown');
      expect(report.error.message).toBe('string error');
    });

    it('should report error without context', () => {
      const error = new Error('No context error');

      const report = reporter.report(error);

      expect(report.context).toEqual({});
      expect(report.operation).toBeUndefined();
    });

    it('should include duration when operation was started', () => {
      reporter.startOperation('timed-operation');
      const error = new Error('Timed error');

      const report = reporter.report(error, { operation: 'timed-operation' });

      expect(report.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should emit report to logger', () => {
      const error = new Error('Emit test');

      reporter.report(error, { operation: 'emit-test' });

      expect(logger.error).toHaveBeenCalled();
    });

    it('should log suggestion when present', () => {
      mockIsEvolithError.mockReturnValue(true);
      const evolithError = new errors.EvolithError('Config error', 'GOV-01');

      reporter.report(evolithError);

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Suggestion'));
    });
  });

  describe('getReports', () => {
    it('should return all reports', () => {
      reporter.report(new Error('Error 1'));
      reporter.report(new Error('Error 2'));

      const reports = reporter.getReports();

      expect(reports).toHaveLength(2);
    });

    it('should return a copy of reports', () => {
      reporter.report(new Error('Error 1'));

      const reports = reporter.getReports();
      reports.length = 0;

      expect(reporter.getReports()).toHaveLength(1);
    });
  });

  describe('getLastReport', () => {
    it('should return the last report', () => {
      reporter.report(new Error('Error 1'));
      reporter.report(new Error('Error 2'));

      const last = reporter.getLastReport();

      expect(last?.error.message).toBe('Error 2');
    });

    it('should return undefined when no reports', () => {
      const last = reporter.getLastReport();

      expect(last).toBeUndefined();
    });
  });

  describe('clearReports', () => {
    it('should clear all reports', () => {
      reporter.report(new Error('Error 1'));
      reporter.report(new Error('Error 2'));

      reporter.clearReports();

      expect(reporter.getReports()).toHaveLength(0);
    });
  });

  describe('printSummary', () => {
    it('should print no errors message when empty', () => {
      reporter.printSummary();

      expect(logger.info).toHaveBeenCalledWith('No errors reported.');
    });

    it('should print error summary', () => {
      reporter.report(new Error('Test error'), { operation: 'test' });

      reporter.printSummary();

      expect(logger.info).toHaveBeenCalledWith('Error Summary: 1 error(s)');
    });

    it('should print error details', () => {
      mockIsEvolithError.mockReturnValue(true);
      const evolithError = new errors.EvolithError('Config error', 'GOV-01');
      reporter.report(evolithError, { operation: 'validate' });

      reporter.printSummary();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Config error')
      );
    });
  });

  describe('getSuggestionForCode', () => {
    it('should return suggestion for PLATFORM_NOT_FOUND', () => {
      mockIsEvolithError.mockReturnValue(true);
      const evolithError = new errors.EvolithError('test', 'PLATFORM_NOT_FOUND');

      const report = reporter.report(evolithError);

      expect(report.suggestion).toContain('Install');
    });

    it('should return suggestion for PHASE_TRANSITION_ERROR', () => {
      mockIsEvolithError.mockReturnValue(true);
      const evolithError = new errors.EvolithError('test', 'PHASE_TRANSITION_ERROR');

      const report = reporter.report(evolithError);

      expect(report.suggestion).toContain('transitioning');
    });

    it('should return suggestion for CATALOG_LOAD_ERROR', () => {
      mockIsEvolithError.mockReturnValue(true);
      const evolithError = new errors.EvolithError('test', 'CATALOG_LOAD_ERROR');

      const report = reporter.report(evolithError);

      expect(report.suggestion).toContain('catalog');
    });

    it('should return suggestion for TOOL_VALIDATION_ERROR', () => {
      mockIsEvolithError.mockReturnValue(true);
      const evolithError = new errors.EvolithError('test', 'TOOL_VALIDATION_ERROR');

      const report = reporter.report(evolithError);

      expect(report.suggestion).toContain('supported');
    });

    it('should return suggestion for COMMAND_EXECUTION_ERROR', () => {
      mockIsEvolithError.mockReturnValue(true);
      const evolithError = new errors.EvolithError('test', 'COMMAND_EXECUTION_ERROR');

      const report = reporter.report(evolithError);

      expect(report.suggestion).toContain('syntax');
    });

    it('should return suggestion for VALIDATION_ERROR', () => {
      mockIsEvolithError.mockReturnValue(true);
      const evolithError = new errors.EvolithError('test', 'VALIDATION_ERROR');

      const report = reporter.report(evolithError);

      expect(report.suggestion).toContain('Review');
    });

    it('should return generic suggestion for unknown code', () => {
      mockIsEvolithError.mockReturnValue(true);
      const evolithError = new errors.EvolithError('test', 'UNKNOWN_CODE');

      const report = reporter.report(evolithError);

      expect(report.suggestion).toContain('details');
    });
  });

  describe('getSuggestionForError', () => {
    it('should return suggestion for ENOENT errors', () => {
      const enoentError = new Error('ENOENT: no such file');

      const report = reporter.report(enoentError);

      expect(report.suggestion).toContain('not found');
    });

    it('should return suggestion for EACCES errors', () => {
      const eaccesError = new Error('EACCES: permission denied');

      const report = reporter.report(eaccesError);

      expect(report.suggestion).toContain('Permission denied');
    });

    it('should return suggestion for ENOEXEC errors', () => {
      const enoexecError = new Error('ENOEXEC: not executable');

      const report = reporter.report(enoexecError);

      expect(report.suggestion).toContain('Install');
    });

    it('should return generic suggestion for other errors', () => {
      const genericError = new Error('Something went wrong');

      const report = reporter.report(genericError);

      expect(report.suggestion).toContain('unexpected');
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const report1 = reporter.report(new Error('Error 1'));
      const report2 = reporter.report(new Error('Error 2'));

      expect(report1.id).not.toBe(report2.id);
    });

    it('should generate IDs with ERR- prefix', () => {
      const report = reporter.report(new Error('Test'));

      expect(report.id).toMatch(/^ERR-/);
    });
  });
});

describe('OperationContext', () => {
  beforeEach(() => {
    OperationContext.clear();
  });

  it('should set and get values', () => {
    OperationContext.set('key', 'value');

    expect(OperationContext.get('key')).toBe('value');
  });

  it('should return undefined for missing keys', () => {
    expect(OperationContext.get('missing')).toBeUndefined();
  });

  it('should clear all values', () => {
    OperationContext.set('key1', 'value1');
    OperationContext.set('key2', 'value2');

    OperationContext.clear();

    expect(OperationContext.get('key1')).toBeUndefined();
    expect(OperationContext.get('key2')).toBeUndefined();
  });

  it('should return copy of all values', () => {
    OperationContext.set('key1', 'value1');
    OperationContext.set('key2', 'value2');

    const all = OperationContext.getAll();

    expect(all).toEqual({ key1: 'value1', key2: 'value2' });

    all.key1 = 'modified';
    expect(OperationContext.get('key1')).toBe('value1');
  });
});
