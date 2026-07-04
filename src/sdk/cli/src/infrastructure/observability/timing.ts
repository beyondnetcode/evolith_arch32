import { logger } from './structured-logger';

export interface TimingResult {
  duration: number;
  success: boolean;
  error?: Error;
}

export function Timed(operationName?: string) {
  return function (
    target: unknown,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const opName = operationName || `${(target as { constructor: { name: string } }).constructor.name}.${String(propertyKey)}`;
      const startTime = performance.now();

      logger.startOperation(opName);

      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - startTime;

        logger.endOperation(opName, duration);

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        const err = error as Error;

        logger.error(`Operation failed: ${opName}`, {
          durationMs: duration,
          error: err.message,
          stack: err.stack,
        });

        throw error;
      }
    };

    return descriptor;
  };
}

export function TimedSync(operationName?: string) {
  return function (
    target: unknown,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: unknown[]): unknown {
      const opName = operationName || `${(target as { constructor: { name: string } }).constructor.name}.${String(propertyKey)}`;
      const startTime = performance.now();

      logger.startOperation(opName);

      try {
        const result = originalMethod.apply(this, args);
        const duration = performance.now() - startTime;

        logger.endOperation(opName, duration);

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        const err = error as Error;

        logger.error(`Operation failed: ${opName}`, {
          durationMs: duration,
          error: err.message,
          stack: err.stack,
        });

        throw error;
      }
    };

    return descriptor;
  };
}

export async function measureTime<T>(
  operation: () => Promise<T>,
  operationName?: string
): Promise<{ result: T; duration: number }> {
  const name = operationName || 'anonymous-operation';
  const startTime = performance.now();

  logger.startOperation(name);

  try {
    const result = await operation();
    const duration = performance.now() - startTime;

    logger.endOperation(name, duration);

    return { result, duration };
  } catch (error) {
    const duration = performance.now() - startTime;
    const err = error as Error;

    logger.error(`Operation failed: ${name}`, {
      durationMs: duration,
      error: err.message,
    });

    throw error;
  }
}

export function measureTimeSync<T>(
  operation: () => T,
  operationName?: string
): { result: T; duration: number } {
  const name = operationName || 'anonymous-operation';
  const startTime = performance.now();

  logger.startOperation(name);

  try {
    const result = operation();
    const duration = performance.now() - startTime;

    logger.endOperation(name, duration);

    return { result, duration };
  } catch (error) {
    const duration = performance.now() - startTime;
    const err = error as Error;

    logger.error(`Operation failed: ${name}`, {
      durationMs: duration,
      error: err.message,
    });

    throw error;
  }
}

export class OperationTimer {
  private startTime: number = 0;
  private operationName: string = '';

  start(operationName: string): void {
    this.operationName = operationName;
    this.startTime = performance.now();
    logger.startOperation(operationName);
  }

  end(): number {
    const duration = performance.now() - this.startTime;
    logger.endOperation(this.operationName, duration);
    return duration;
  }

  getDuration(): number {
    return performance.now() - this.startTime;
  }
}

export function profile<T extends (...args: unknown[]) => unknown>(
  fn: T,
  operationName?: string
): T {
  const name = operationName || fn.name;

  return (async (...args: unknown[]) => {
    const timer = new OperationTimer();
    timer.start(name);

    try {
      const result = await fn(...args);
      timer.end();
      return result;
    } catch (error) {
      timer.end();
      throw error;
    }
  }) as T;
}