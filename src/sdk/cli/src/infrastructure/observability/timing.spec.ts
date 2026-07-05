import { Timed, TimedSync, measureTime, measureTimeSync, OperationTimer, profile } from './timing';

jest.mock('./structured-logger', () => ({
  logger: {
    startOperation: jest.fn(),
    endOperation: jest.fn(),
    error: jest.fn(),
  },
}));

import { logger } from './structured-logger';

describe('Timing utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Timed decorator', () => {
    it('should wrap async method and log timing', async () => {
      class TestClass {
        @Timed('test-operation')
        async testMethod(): Promise<string> {
          return 'result';
        }
      }

      const instance = new TestClass();
      const result = await instance.testMethod();

      expect(result).toBe('result');
      expect(logger.startOperation).toHaveBeenCalledWith('test-operation');
      expect(logger.endOperation).toHaveBeenCalled();
    });

    it('should use default operation name when not provided', async () => {
      class TestClass {
        @Timed()
        async myMethod(): Promise<number> {
          return 42;
        }
      }

      const instance = new TestClass();
      await instance.myMethod();

      expect(logger.startOperation).toHaveBeenCalledWith('TestClass.myMethod');
    });

    it('should handle errors and log them', async () => {
      class TestClass {
        @Timed('failing-operation')
        async failingMethod(): Promise<void> {
          throw new Error('Test error');
        }
      }

      const instance = new TestClass();

      await expect(instance.failingMethod()).rejects.toThrow('Test error');
      expect(logger.startOperation).toHaveBeenCalledWith('failing-operation');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('TimedSync decorator', () => {
    it('should wrap sync method and log timing', () => {
      class TestClass {
        @TimedSync('sync-operation')
        syncMethod(): string {
          return 'sync-result';
        }
      }

      const instance = new TestClass();
      const result = instance.syncMethod();

      expect(result).toBe('sync-result');
      expect(logger.startOperation).toHaveBeenCalledWith('sync-operation');
      expect(logger.endOperation).toHaveBeenCalled();
    });

    it('should use default operation name for sync methods', () => {
      class TestClass {
        @TimedSync()
        anotherSyncMethod(): number {
          return 100;
        }
      }

      const instance = new TestClass();
      instance.anotherSyncMethod();

      expect(logger.startOperation).toHaveBeenCalledWith('TestClass.anotherSyncMethod');
    });

    it('should handle sync errors and log them', () => {
      class TestClass {
        @TimedSync('sync-failing')
        syncFailingMethod(): void {
          throw new Error('Sync error');
        }
      }

      const instance = new TestClass();

      expect(() => instance.syncFailingMethod()).toThrow('Sync error');
      expect(logger.startOperation).toHaveBeenCalledWith('sync-failing');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('measureTime', () => {
    it('should measure async operation duration', async () => {
      const operation = async () => 'test-result';

      const { result, duration } = await measureTime(operation, 'measure-test');

      expect(result).toBe('test-result');
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(logger.startOperation).toHaveBeenCalledWith('measure-test');
      expect(logger.endOperation).toHaveBeenCalled();
    });

    it('should use default name for anonymous operations', async () => {
      const operation = async () => 42;

      await measureTime(operation);

      expect(logger.startOperation).toHaveBeenCalledWith('anonymous-operation');
    });

    it('should handle errors in measured operations', async () => {
      const operation = async () => {
        throw new Error('Measured error');
      };

      await expect(measureTime(operation, 'error-measure')).rejects.toThrow('Measured error');
      expect(logger.startOperation).toHaveBeenCalledWith('error-measure');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('measureTimeSync', () => {
    it('should measure sync operation duration', () => {
      const operation = () => 'sync-result';

      const { result, duration } = measureTimeSync(operation, 'sync-measure');

      expect(result).toBe('sync-result');
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(logger.startOperation).toHaveBeenCalledWith('sync-measure');
      expect(logger.endOperation).toHaveBeenCalled();
    });

    it('should handle errors in sync operations', () => {
      const operation = () => {
        throw new Error('Sync measure error');
      };

      expect(() => measureTimeSync(operation, 'sync-error')).toThrow('Sync measure error');
      expect(logger.startOperation).toHaveBeenCalledWith('sync-error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('OperationTimer', () => {
    it('should start and end timing', () => {
      const timer = new OperationTimer();

      timer.start('timer-test');
      const duration = timer.end();

      expect(duration).toBeGreaterThanOrEqual(0);
      expect(logger.startOperation).toHaveBeenCalledWith('timer-test');
      expect(logger.endOperation).toHaveBeenCalled();
    });

    it('should get current duration', () => {
      const timer = new OperationTimer();

      timer.start('duration-test');
      const duration = timer.getDuration();

      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('profile', () => {
    it('should wrap async function with timing', async () => {
      const asyncFn = async () => 'profiled-result';
      const profiledFn = profile(asyncFn, 'profile-test');

      const result = await profiledFn();

      expect(result).toBe('profiled-result');
      expect(logger.startOperation).toHaveBeenCalledWith('profile-test');
      expect(logger.endOperation).toHaveBeenCalled();
    });

    it('should use function name when operation name not provided', async () => {
      async function namedFn(): Promise<number> {
        return 42;
      }

      const profiledFn = profile(namedFn);

      await profiledFn();

      expect(logger.startOperation).toHaveBeenCalledWith('namedFn');
    });

    it('should handle errors in profiled functions', async () => {
      const asyncFn = async () => {
        throw new Error('Profile error');
      };
      const profiledFn = profile(asyncFn, 'profile-error');

      await expect(profiledFn()).rejects.toThrow('Profile error');
      expect(logger.startOperation).toHaveBeenCalledWith('profile-error');
      expect(logger.endOperation).toHaveBeenCalled();
    });
  });
});
