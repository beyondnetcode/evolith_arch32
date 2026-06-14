import { NestLoggerProvider, ConsoleLoggerProvider, NoOpLoggerProvider } from './logger.provider';

describe('Logger Providers', () => {
  describe('NestLoggerProvider', () => {
    const provider = new NestLoggerProvider();

    it('should create a logger', () => {
      const logger = provider.createLogger('TestContext');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should not throw on info call', () => {
      const logger = provider.createLogger('Test');
      expect(() => logger.info('test message')).not.toThrow();
    });

    it('should not throw on warn call', () => {
      const logger = provider.createLogger('Test');
      expect(() => logger.warn('warning')).not.toThrow();
    });

    it('should not throw on error call', () => {
      const logger = provider.createLogger('Test');
      expect(() => logger.error('error')).not.toThrow();
    });

    it('should not throw on debug call', () => {
      const logger = provider.createLogger('Test');
      expect(() => logger.debug('debug')).not.toThrow();
    });

    it('should accept context parameter', () => {
      const logger = provider.createLogger('Test');
      expect(() => logger.info('msg', { extra: 'data' })).not.toThrow();
    });
  });

  describe('ConsoleLoggerProvider', () => {
    it('should create a console logger', () => {
      const provider = new ConsoleLoggerProvider();
      const logger = provider.createLogger('Test');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should log without throwing', () => {
      const provider = new ConsoleLoggerProvider();
      const logger = provider.createLogger('Console');
      expect(() => logger.info('test')).not.toThrow();
      expect(() => logger.warn('test')).not.toThrow();
      expect(() => logger.error('test')).not.toThrow();
      expect(() => logger.debug('test')).not.toThrow();
    });
  });

  describe('NoOpLoggerProvider', () => {
    it('should create a no-op logger', () => {
      const provider = new NoOpLoggerProvider();
      const logger = provider.createLogger('Test');
      expect(typeof logger.info).toBe('function');
    });

    it('should collect logs', () => {
      const provider = new NoOpLoggerProvider();
      const logger = provider.createLogger('Test');
      logger.info('msg1');
      logger.warn('msg2');
      const logs = (logger as any).getLogs();
      expect(logs.length).toBe(2);
      expect(logs[0].level).toBe('info');
      expect(logs[1].level).toBe('warn');
    });

    it('should support clear', () => {
      const provider = new NoOpLoggerProvider();
      const logger = provider.createLogger('Test');
      logger.info('msg');
      (logger as any).clear();
      expect((logger as any).getLogs().length).toBe(0);
    });
  });
});
