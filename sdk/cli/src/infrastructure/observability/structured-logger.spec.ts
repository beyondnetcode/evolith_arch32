import { StructuredLogger, LogLevel } from './structured-logger';

describe('StructuredLogger', () => {
  let logger: StructuredLogger;
  let infoSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new StructuredLogger({ level: LogLevel.DEBUG });
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    debugSpy.mockRestore();
  });

  describe('log levels', () => {
    it('should log debug messages', () => {
      logger.debug('debug message');

      expect(debugSpy).toHaveBeenCalled();
    });

    it('should log info messages', () => {
      logger.info('info message');

      expect(infoSpy).toHaveBeenCalled();
    });

    it('should log warn messages', () => {
      logger.warn('warn message');

      expect(warnSpy).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      logger.error('error message');

      expect(errorSpy).toHaveBeenCalled();
    });

    it('should log fatal messages', () => {
      logger.fatal('fatal message');

      expect(errorSpy).toHaveBeenCalled();
    });

    it('should respect log level filter', () => {
      const warnLogger = new StructuredLogger({ level: LogLevel.WARN });

      warnLogger.debug('should not appear');
      warnLogger.info('should not appear');

      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
    });
  });

  describe('log formatting', () => {
    it('should include timestamp in log output', () => {
      logger.info('timestamp test');

      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T/)
      );
    });

    it('should include level name in log output', () => {
      logger.info('level test');

      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO ]')
      );
    });

    it('should include operation name when set', () => {
      logger.startOperation('test-op');

      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('{test-op}')
      );
    });

    it('should format context as JSON when enabled', () => {
      logger.info('context test', { key: 'value' });

      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('{"key":"value"}')
      );
    });

    it('should not format context when disabled', () => {
      const noContextLogger = new StructuredLogger({ enableContext: false });

      noContextLogger.info('no context', { key: 'value' });

      expect(infoSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('{"key":"value"}')
      );
    });
  });

  describe('operation tracking', () => {
    it('should start operation', () => {
      logger.startOperation('my-operation');

      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Started: my-operation')
      );
    });

    it('should end operation with duration', () => {
      logger.startOperation('timed-op');
      logger.endOperation('timed-op', 100);

      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completed: timed-op')
      );
    });

    it('should handle nested operations', () => {
      logger.startOperation('outer');
      logger.startOperation('inner');
      logger.info('nested test');

      const calls = infoSpy.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall).toContain('{inner}');
    });

    it('should pop operation from stack when ended', () => {
      logger.startOperation('outer');
      logger.startOperation('inner');
      logger.endOperation('inner', 50);
      logger.info('after inner');

      const calls = infoSpy.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall).toContain('{outer}');
    });

    it('should warn on operation mismatch', () => {
      logger.startOperation('expected-op');
      logger.endOperation('different-op', 50);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Operation mismatch')
      );
    });
  });

  describe('getBuffer', () => {
    it('should return all log entries', () => {
      logger.info('entry 1');
      logger.warn('entry 2');

      const buffer = logger.getBuffer();

      expect(buffer).toHaveLength(2);
    });

    it('should return a copy of buffer', () => {
      logger.info('entry 1');

      const buffer = logger.getBuffer();
      buffer.length = 0;

      expect(logger.getBuffer()).toHaveLength(1);
    });
  });

  describe('clearBuffer', () => {
    it('should clear all log entries', () => {
      logger.info('entry 1');
      logger.info('entry 2');

      logger.clearBuffer();

      expect(logger.getBuffer()).toHaveLength(0);
    });
  });

  describe('setLevel', () => {
    it('should update log level', () => {
      logger.setLevel(LogLevel.ERROR);

      logger.debug('should not appear');
      logger.info('should not appear');
      logger.error('should appear');

      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('getLastError', () => {
    it('should return undefined when no error objects logged', () => {
      logger.error('first error');
      logger.error('second error');

      const lastError = logger.getLastError();

      expect(lastError).toBeUndefined();
    });

    it('should return undefined when no errors', () => {
      logger.info('info message');

      expect(logger.getLastError()).toBeUndefined();
    });
  });

  describe('getErrorCount', () => {
    it('should count errors', () => {
      logger.error('error 1');
      logger.fatal('fatal 1');
      logger.info('info 1');

      expect(logger.getErrorCount()).toBe(2);
    });

    it('should return zero when no errors', () => {
      logger.info('info 1');
      logger.debug('debug 1');

      expect(logger.getErrorCount()).toBe(0);
    });
  });

  describe('getWarningCount', () => {
    it('should count warnings', () => {
      logger.warn('warn 1');
      logger.warn('warn 2');
      logger.error('error 1');

      expect(logger.getWarningCount()).toBe(2);
    });

    it('should return zero when no warnings', () => {
      logger.info('info 1');

      expect(logger.getWarningCount()).toBe(0);
    });
  });

  describe('custom config', () => {
    it('should use custom log level', () => {
      const customLogger = new StructuredLogger({ level: LogLevel.FATAL });

      customLogger.error('should not appear');

      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should disable timestamp when configured', () => {
      const noTimeLogger = new StructuredLogger({ enableTimestamp: false });

      noTimeLogger.info('no time test');

      const call = infoSpy.mock.calls[0][0];
      expect(call).not.toMatch(/^\[\d{4}-/);
    });

    it('should use default config when no options', () => {
      const defaultLogger = new StructuredLogger();

      defaultLogger.info('default test');

      expect(infoSpy).toHaveBeenCalled();
    });
  });
});
