import { StructuredLogger, LogLevel } from './structured-logger';
import { OperationTimer, measureTime, measureTimeSync } from './timing';
import { ErrorReporter } from './error-reporter';

describe('StructuredLogger', () => {
  let testLogger: StructuredLogger;

  beforeEach(() => {
    testLogger = new StructuredLogger({ level: LogLevel.DEBUG });
  });

  afterEach(() => {
    testLogger.clearBuffer();
  });

  describe('log levels', () => {
    it('should log debug messages', () => {
      testLogger.debug('debug message');
      const buffer = testLogger.getBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0].level).toBe(LogLevel.DEBUG);
      expect(buffer[0].message).toBe('debug message');
    });

    it('should log info messages', () => {
      testLogger.info('info message');
      const buffer = testLogger.getBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0].level).toBe(LogLevel.INFO);
    });

    it('should log warn messages', () => {
      testLogger.warn('warn message');
      const buffer = testLogger.getBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0].level).toBe(LogLevel.WARN);
    });

    it('should log error messages', () => {
      testLogger.error('error message');
      const buffer = testLogger.getBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0].level).toBe(LogLevel.ERROR);
    });

    it('should log fatal messages', () => {
      testLogger.fatal('fatal message');
      const buffer = testLogger.getBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0].level).toBe(LogLevel.FATAL);
    });

    it('should filter messages below configured level', () => {
      const filteredLogger = new StructuredLogger({ level: LogLevel.ERROR });
      filteredLogger.debug('debug message');
      filteredLogger.info('info message');
      filteredLogger.warn('warn message');
      filteredLogger.error('error message');

      const buffer = filteredLogger.getBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0].level).toBe(LogLevel.ERROR);
    });
  });

  describe('context', () => {
    it('should include context in log entry', () => {
      testLogger.info('message with context', { key: 'value', number: 42 });
      const buffer = testLogger.getBuffer();
      expect(buffer[0].context).toEqual({ key: 'value', number: 42 });
    });

    it('should include operation in log entry', () => {
      testLogger.startOperation('test-operation');
      testLogger.info('inside operation');
      const buffer = testLogger.getBuffer();
      expect(buffer[1].operation).toBe('test-operation');
    });
  });

  describe('startOperation/endOperation', () => {
    it('should track operation stack', () => {
      testLogger.startOperation('op1');
      testLogger.startOperation('op2');
      testLogger.endOperation('op2', 100);
      testLogger.endOperation('op1', 200);

      const buffer = testLogger.getBuffer();
      expect(buffer).toHaveLength(4);
    });
  });

  describe('getErrorCount', () => {
    it('should count error and fatal messages', () => {
      testLogger.error('error 1');
      testLogger.error('error 2');
      testLogger.fatal('fatal');
      testLogger.info('info');

      expect(testLogger.getErrorCount()).toBe(3);
    });
  });

  describe('getWarningCount', () => {
    it('should count warn messages', () => {
      testLogger.warn('warn 1');
      testLogger.warn('warn 2');
      testLogger.error('error');

      expect(testLogger.getWarningCount()).toBe(2);
    });
  });
});

describe('OperationTimer', () => {
  it('should measure operation duration', async () => {
    const timer = new OperationTimer();
    timer.start('test-operation');

    await new Promise(resolve => setTimeout(resolve, 50));

    const duration = timer.end();
    // Timers can fire a few ms early under CI load, so allow a small tolerance on
    // the lower bound (the point of the test is that a real duration is measured,
    // not the exact value). Keeps a generous upper bound to catch a stuck timer.
    expect(duration).toBeGreaterThanOrEqual(40);
    expect(duration).toBeLessThan(2000);
  });

  it('should get current duration without ending', () => {
    const timer = new OperationTimer();
    timer.start('test-operation');

    // No delay needed for this check
    const currentDuration = timer.getDuration();
    expect(currentDuration).toBeGreaterThanOrEqual(0);
    timer.end();
  });
});

describe('measureTime', () => {
  it('should measure async operation duration', async () => {
    const operation = async () => {
      await new Promise(resolve => setTimeout(resolve, 30));
      return 'result';
    };

    const { result, duration } = await measureTime(operation, 'async-op');
    expect(result).toBe('result');
    expect(duration).toBeGreaterThanOrEqual(25);
  });

  it('should throw error if operation fails', async () => {
    const failingOperation = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      throw new Error('operation failed');
    };

    await expect(measureTime(failingOperation, 'failing-op')).rejects.toThrow('operation failed');
  });
});

describe('measureTimeSync', () => {
  it('should measure sync operation duration', () => {
    const operation = () => {
      return 'result';
    };

    const { result, duration } = measureTimeSync(operation, 'sync-op');
    expect(result).toBe('result');
    expect(duration).toBeGreaterThanOrEqual(0);
  });
});

describe('ErrorReporter', () => {
  let reporter: ErrorReporter;

  beforeEach(() => {
    reporter = new ErrorReporter();
  });

  describe('report', () => {
    it('should create error report for Error object', () => {
      const error = new Error('test error');
      const report = reporter.report(error, { operation: 'test-op' });

      expect(report.id).toBeDefined();
      expect(report.error.name).toBe('Error');
      expect(report.error.message).toBe('test error');
      expect(report.operation).toBe('test-op');
      expect(report.context).toEqual({ operation: 'test-op' });
    });

    it('should create error report with any error object', () => {
      const error = new Error('custom error message');
      const report = reporter.report(error, { operation: 'test' });

      expect(report.id).toBeDefined();
      expect(report.error.message).toBe('custom error message');
    });

    it('should include duration if operation was started', () => {
      reporter.startOperation('timed-op');
      const error = new Error('test');
      const report = reporter.report(error);

      expect(report.durationMs).toBeDefined();
      expect(report.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getReports', () => {
    it('should return all reports', () => {
      reporter.report(new Error('error 1'));
      reporter.report(new Error('error 2'));

      const reports = reporter.getReports();
      expect(reports).toHaveLength(2);
    });

    it('should return copy of reports array', () => {
      reporter.report(new Error('error'));
      const reports = reporter.getReports();
      reports.push({} as any);

      expect(reporter.getReports()).toHaveLength(1);
    });
  });

  describe('getLastReport', () => {
    it('should return last report', () => {
      reporter.report(new Error('first'));
      reporter.report(new Error('second'));

      const last = reporter.getLastReport();
      expect(last?.error.message).toBe('second');
    });

    it('should return undefined if no reports', () => {
      const last = reporter.getLastReport();
      expect(last).toBeUndefined();
    });
  });

  describe('clearReports', () => {
    it('should clear all reports', () => {
      reporter.report(new Error('error'));
      reporter.clearReports();

      expect(reporter.getReports()).toHaveLength(0);
    });
  });

  describe('suggestions', () => {
    it('should provide suggestion based on error message patterns', () => {
      const error = new Error('npm not found in PATH');
      const report = reporter.report(error);

      expect(report.suggestion).toBeDefined();
      expect(typeof report.suggestion).toBe('string');
    });

    it('should provide suggestion for ENOENT errors', () => {
      const error = new Error('ENOENT: file not found');
      const report = reporter.report(error);

      expect(report.suggestion).toContain('not found');
    });

    it('should provide suggestion for EACCES errors', () => {
      const error = new Error('EACCES: permission denied');
      const report = reporter.report(error);

      expect(report.suggestion).toContain('Permission');
    });
  });
});
