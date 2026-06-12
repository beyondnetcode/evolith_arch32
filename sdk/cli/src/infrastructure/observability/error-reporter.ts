import { logger, LogLevel } from './structured-logger';
import { EvolithError, isEvolithError, getErrorContext, getErrorCode } from '../../core/errors';

export interface ErrorReport {
  id: string;
  timestamp: string;
  error: {
    name: string;
    message: string;
    code?: string;
    stack?: string;
  };
  context: Record<string, unknown>;
  operation?: string;
  durationMs?: number;
  suggestion?: string;
}

export interface ErrorContext {
  operation?: string;
  command?: string;
  phase?: string;
  tool?: string;
  file?: string;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

export class ErrorReporter {
  private reports: ErrorReport[] = [];
  private operationStartTime: number = 0;

  startOperation(operationName: string): void {
    this.operationStartTime = performance.now();
    logger.startOperation(operationName);
  }

  report(error: unknown, context?: ErrorContext): ErrorReport {
    const report = this.createReport(error, context);
    this.reports.push(report);
    this.emitReport(report);
    return report;
  }

  private createReport(error: unknown, context?: ErrorContext): ErrorReport {
    const now = new Date();
    const durationMs = this.operationStartTime
      ? performance.now() - this.operationStartTime
      : undefined;

    let errorInfo: ErrorReport['error'];
    let suggestion: string | undefined;

    if (isEvolithError(error)) {
      errorInfo = {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack,
      };
      suggestion = this.getSuggestionForCode(error.code);
    } else if (error instanceof Error) {
      errorInfo = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
      suggestion = this.getSuggestionForError(error);
    } else {
      errorInfo = {
        name: 'Unknown',
        message: String(error),
      };
    }

    return {
      id: this.generateId(),
      timestamp: now.toISOString(),
      error: errorInfo,
      context: context || {},
      operation: context?.operation,
      durationMs,
      suggestion,
    };
  }

  private emitReport(report: ErrorReport): void {
    logger.error(report.error.message, {
      errorId: report.id,
      errorCode: report.error.code,
      operation: report.operation,
      durationMs: report.durationMs,
      context: report.context,
    });

    if (report.suggestion) {
      logger.info(`Suggestion: ${report.suggestion}`);
    }
  }

  private getSuggestionForCode(code: string): string {
    const suggestions: Record<string, string> = {
      PLATFORM_NOT_FOUND: 'Install the required platform or check if it is in your PATH',
      PHASE_TRANSITION_ERROR: 'Check that you are transitioning to the correct next phase',
      CATALOG_LOAD_ERROR: 'Check that catalog files exist in the config directory',
      TOOL_VALIDATION_ERROR: 'Verify the tool is supported by Evolith',
      COMMAND_EXECUTION_ERROR: 'Check command syntax and that the tool is installed',
      VALIDATION_ERROR: 'Review validation errors and fix the input',
    };
    return suggestions[code] || 'Check the error message for details';
  }

  private getSuggestionForError(error: Error): string {
    if (error.message.includes('ENOENT')) {
      return 'File or directory not found. Check the path and ensure it exists.';
    }
    if (error.message.includes('EACCES')) {
      return 'Permission denied. Check file/directory permissions.';
    }
    if (error.message.includes('ENOEXEC')) {
      return 'Executable not found. Install the required tool.';
    }
    return 'An unexpected error occurred. Check logs for details.';
  }

  private generateId(): string {
    return `ERR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  }

  getReports(): ErrorReport[] {
    return [...this.reports];
  }

  getLastReport(): ErrorReport | undefined {
    return this.reports[this.reports.length - 1];
  }

  clearReports(): void {
    this.reports = [];
  }

  printSummary(): void {
    if (this.reports.length === 0) {
      logger.info('No errors reported.');
      return;
    }

    logger.info(`Error Summary: ${this.reports.length} error(s)`);

    this.reports.forEach((report, index) => {
      console.log(`\n[${index + 1}] ${report.error.name}: ${report.error.message}`);
      if (report.error.code) {
        console.log(`    Code: ${report.error.code}`);
      }
      if (report.operation) {
        console.log(`    Operation: ${report.operation}`);
      }
      if (report.suggestion) {
        console.log(`    Suggestion: ${report.suggestion}`);
      }
    });
  }
}

export const errorReporter = new ErrorReporter();

export function withErrorReporting<T extends (...args: unknown[]) => Promise<unknown>>(
  operation: T,
  operationName?: string
): T {
  const name = operationName || operation.name;

  return (async (...args: unknown[]) => {
    const reporter = new ErrorReporter();
    reporter.startOperation(name);

    try {
      const result = await reporter.report(
        await operation(...args),
        { operation: name }
      );
      return result;
    } catch (error) {
      reporter.report(error, { operation: name });
      reporter.printSummary();
      throw error;
    }
  }) as T;
}

export class OperationContext {
  private static currentContext: Record<string, unknown> = {};

  static set(key: string, value: unknown): void {
    this.currentContext[key] = value;
  }

  static get(key: string): unknown {
    return this.currentContext[key];
  }

  static clear(): void {
    this.currentContext = {};
  }

  static getAll(): Record<string, unknown> {
    return { ...this.currentContext };
  }
}