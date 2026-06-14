import { Logger } from '@nestjs/common';
import { ILogger, ILoggerProvider, LogLevel, LogEntry } from '../../domain/interfaces';

export class NestLoggerProvider implements ILoggerProvider {
  createLogger(context: string): ILogger {
    return new NestLogger(context);
  }
}

class NestLogger implements ILogger {
  private logger: Logger;

  constructor(context: string) {
    this.logger = new Logger(context);
  }

  debug(message: string, context?: unknown): void {
    this.logger.debug(message, context);
  }

  info(message: string, context?: unknown): void {
    this.logger.log(message, context);
  }

  warn(message: string, context?: unknown): void {
    this.logger.warn(message, context);
  }

  error(message: string, context?: unknown): void {
    this.logger.error(message, context);
  }
}

export class NoOpLoggerProvider implements ILoggerProvider {
  createLogger(_context: string): ILogger {
    return new NoOpLogger();
  }
}

class NoOpLogger implements ILogger {
  private logs: LogEntry[] = [];

  debug(message: string, _context?: unknown): void {
    this.logs.push({ level: 'debug', message, timestamp: new Date().toISOString() });
  }

  info(message: string, _context?: unknown): void {
    this.logs.push({ level: 'info', message, timestamp: new Date().toISOString() });
  }

  warn(message: string, _context?: unknown): void {
    this.logs.push({ level: 'warn', message, timestamp: new Date().toISOString() });
  }

  error(message: string, _context?: unknown): void {
    this.logs.push({ level: 'error', message, timestamp: new Date().toISOString() });
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}

export class ConsoleLoggerProvider implements ILoggerProvider {
  createLogger(context: string): ILogger {
    return new ConsoleLogger(context);
  }
}

class ConsoleLogger implements ILogger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private format(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}`;
  }

  debug(message: string, _context?: unknown): void {
    console.debug(this.format('debug', message));
  }

  info(message: string, _context?: unknown): void {
    console.info(this.format('info', message));
  }

  warn(message: string, _context?: unknown): void {
    console.warn(this.format('warn', message));
  }

  error(message: string, _context?: unknown): void {
    console.error(this.format('error', message));
  }
}