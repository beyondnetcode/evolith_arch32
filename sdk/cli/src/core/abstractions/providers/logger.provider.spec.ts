import { NestLoggerProvider, NoOpLoggerProvider, ConsoleLoggerProvider } from './logger.provider';

jest.mock('@nestjs/common', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

describe('NestLoggerProvider', () => {
  let provider: NestLoggerProvider;

  beforeEach(() => {
    provider = new NestLoggerProvider();
  });

  describe('createLogger', () => {
    it('should create a logger with the given context', () => {
      const logger = provider.createLogger('TestContext');

      expect(logger).toBeDefined();
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should create different loggers for different contexts', () => {
      const logger1 = provider.createLogger('Context1');
      const logger2 = provider.createLogger('Context2');

      expect(logger1).not.toBe(logger2);
    });
  });
});

describe('NoOpLoggerProvider', () => {
  let provider: NoOpLoggerProvider;

  beforeEach(() => {
    provider = new NoOpLoggerProvider();
  });

  describe('createLogger', () => {
    it('should create a NoOp logger', () => {
      const logger = provider.createLogger('TestContext');

      expect(logger).toBeDefined();
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });
  });
});

describe('NoOpLogger', () => {
  let provider: NoOpLoggerProvider;
  let logger: any;

  beforeEach(() => {
    provider = new NoOpLoggerProvider();
    logger = provider.createLogger('TestContext');
  });

  describe('debug', () => {
    it('should store debug log entry', () => {
      logger.debug('debug message');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('debug');
      expect(logs[0].message).toBe('debug message');
      expect(logs[0].timestamp).toBeDefined();
    });
  });

  describe('info', () => {
    it('should store info log entry', () => {
      logger.info('info message');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('info');
      expect(logs[0].message).toBe('info message');
    });
  });

  describe('warn', () => {
    it('should store warn log entry', () => {
      logger.warn('warn message');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('warn');
      expect(logs[0].message).toBe('warn message');
    });
  });

  describe('error', () => {
    it('should store error log entry', () => {
      logger.error('error message');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('error');
      expect(logs[0].message).toBe('error message');
    });
  });

  describe('getLogs', () => {
    it('should return a copy of logs', () => {
      logger.info('message 1');
      logger.info('message 2');

      const logs1 = logger.getLogs();
      const logs2 = logger.getLogs();

      expect(logs1).toEqual(logs2);
      expect(logs1).not.toBe(logs2);
    });

    it('should return all logged entries', () => {
      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(4);
      expect(logs.map(l => l.level)).toEqual(['debug', 'info', 'warn', 'error']);
    });
  });

  describe('clear', () => {
    it('should clear all logs', () => {
      logger.info('message 1');
      logger.info('message 2');

      logger.clear();

      expect(logger.getLogs()).toHaveLength(0);
    });

    it('should allow logging after clear', () => {
      logger.info('before clear');
      logger.clear();
      logger.info('after clear');

      expect(logger.getLogs()).toHaveLength(1);
      expect(logger.getLogs()[0].message).toBe('after clear');
    });
  });
});

describe('ConsoleLoggerProvider', () => {
  let provider: ConsoleLoggerProvider;

  beforeEach(() => {
    provider = new ConsoleLoggerProvider();
  });

  describe('createLogger', () => {
    it('should create a console logger', () => {
      const logger = provider.createLogger('TestContext');

      expect(logger).toBeDefined();
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });
  });
});

describe('ConsoleLogger', () => {
  let logger: any;
  let debugSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    const provider = new ConsoleLoggerProvider();
    logger = provider.createLogger('TestContext');

    debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    debugSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('debug', () => {
    it('should call console.debug with formatted message', () => {
      logger.debug('debug message');

      expect(debugSpy).toHaveBeenCalled();
      const callArg = debugSpy.mock.calls[0][0];
      expect(callArg).toContain('DEBUG');
      expect(callArg).toContain('TestContext');
      expect(callArg).toContain('debug message');
    });
  });

  describe('info', () => {
    it('should call console.info with formatted message', () => {
      logger.info('info message');

      expect(infoSpy).toHaveBeenCalled();
      const callArg = infoSpy.mock.calls[0][0];
      expect(callArg).toContain('INFO');
      expect(callArg).toContain('TestContext');
      expect(callArg).toContain('info message');
    });
  });

  describe('warn', () => {
    it('should call console.warn with formatted message', () => {
      logger.warn('warn message');

      expect(warnSpy).toHaveBeenCalled();
      const callArg = warnSpy.mock.calls[0][0];
      expect(callArg).toContain('WARN');
      expect(callArg).toContain('TestContext');
      expect(callArg).toContain('warn message');
    });
  });

  describe('error', () => {
    it('should call console.error with formatted message', () => {
      logger.error('error message');

      expect(errorSpy).toHaveBeenCalled();
      const callArg = errorSpy.mock.calls[0][0];
      expect(callArg).toContain('ERROR');
      expect(callArg).toContain('TestContext');
      expect(callArg).toContain('error message');
    });
  });

  describe('format', () => {
    it('should include timestamp in output', () => {
      logger.info('test');

      const callArg = infoSpy.mock.calls[0][0];
      expect(callArg).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
    });
  });
});
