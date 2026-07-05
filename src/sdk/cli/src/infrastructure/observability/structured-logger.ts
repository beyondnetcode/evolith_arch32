export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  levelName: string;
  message: string;
  context?: Record<string, unknown>;
  operation?: string;
  duration?: number;
  error?: LogError;
}

export interface LogError {
  name: string;
  message: string;
  stack?: string;
  code?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableColors: boolean;
  enableTimestamp: boolean;
  enableContext: boolean;
  output: 'console' | 'file' | 'both';
  filePath?: string;
}

const defaultConfig: LoggerConfig = {
  level: LogLevel.INFO,
  enableColors: true,
  enableTimestamp: true,
  enableContext: true,
  output: 'console',
};

export class StructuredLogger {
  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private operationStack: string[] = [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  fatal(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, message, context);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (level < this.config.level) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      levelName: LogLevel[level],
      message,
      context,
      operation: this.operationStack[this.operationStack.length - 1],
    };

    this.buffer.push(entry);
    this.emit(entry);
  }

  private emit(entry: LogEntry): void {
    const parts: string[] = [];

    if (this.config.enableTimestamp) {
      parts.push(`[${entry.timestamp}]`);
    }

    parts.push(`[${entry.levelName.padEnd(5)}]`);

    if (entry.operation) {
      parts.push(`{${entry.operation}}`);
    }

    parts.push(entry.message);

    if (this.config.enableContext && entry.context) {
      parts.push(JSON.stringify(entry.context));
    }

    if (entry.error) {
      parts.push(`ERROR: ${entry.error.name}: ${entry.error.message}`);
      if (entry.error.stack) {
        parts.push(entry.error.stack);
      }
    }

    const output = parts.join(' ');

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      case LogLevel.INFO:
        console.info(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(output);
        break;
    }
  }

  startOperation(name: string): void {
    this.operationStack.push(name);
    this.info(`Started: ${name}`, { operation: name, depth: this.operationStack.length });
  }

  endOperation(name: string, duration: number): void {
    const currentOp = this.operationStack.pop();
    if (currentOp !== name) {
      this.warn(`Operation mismatch: expected ${name}, got ${currentOp}`);
    }
    this.info(`Completed: ${name}`, { operation: name, durationMs: duration });
  }

  getBuffer(): LogEntry[] {
    return [...this.buffer];
  }

  clearBuffer(): void {
    this.buffer = [];
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  getLastError(): LogError | undefined {
    const errorEntries = this.buffer.filter(e => e.level >= LogLevel.ERROR);
    return errorEntries[errorEntries.length - 1]?.error;
  }

  getErrorCount(): number {
    return this.buffer.filter(e => e.level >= LogLevel.ERROR).length;
  }

  getWarningCount(): number {
    return this.buffer.filter(e => e.level === LogLevel.WARN).length;
  }
}

export const logger = new StructuredLogger({ level: LogLevel.INFO });