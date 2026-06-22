import { SpanStatusCode } from '@opentelemetry/api';
import { logger } from './structured-logger';
import { CommandResult } from '../../infrastructure/cli/command-executor';
import { commandExecutor } from '../../infrastructure/cli/command-executor';
import { cliTracer, isOtelEnabled } from './otel-tracing';

export interface CommandTrace {
  id: string;
  command: string;
  cwd?: string;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  exitCode?: number;
  success?: boolean;
  stdout?: string;
  stderr?: string;
  platformCheck?: {
    name: string;
    available: boolean;
    version?: string;
  };
}

export class CommandWatcher {
  private traces: CommandTrace[] = [];
  private currentTrace: CommandTrace | null = null;

  async executeWithTrace(
    command: string,
    cwd?: string,
    platformCheck?: { name: string; command: string }
  ): Promise<CommandTrace> {
    const trace: CommandTrace = {
      id: this.generateTraceId(),
      command,
      cwd,
      startTime: new Date().toISOString(),
    };

    this.currentTrace = trace;
    this.traces.push(trace);

    const otelEnabled = isOtelEnabled();
    const span = otelEnabled
      ? cliTracer.startSpan(`cli.exec.${command.split(' ')[0]}`, {
          attributes: {
            'cli.trace_id': trace.id,
            'cli.command': command,
            'cli.cwd': cwd ?? '',
          },
        })
      : null;

    logger.info(`Executing command: ${command}`, {
      traceId: trace.id,
      cwd,
      platform: platformCheck?.name,
    });

    if (platformCheck) {
      const check = await commandExecutor.checkTool(
        platformCheck.name,
        platformCheck.command
      );
      trace.platformCheck = {
        name: check.name,
        available: check.available,
        version: check.version,
      };

      if (!check.available) {
        logger.warn(`Platform ${check.name} not available`, {
          traceId: trace.id,
          installHint: check.installHint,
        });
      }
    }

    const startTime = performance.now();

    try {
      const result = await commandExecutor.execute(command, cwd);
      const durationMs = performance.now() - startTime;

      trace.endTime = new Date().toISOString();
      trace.durationMs = durationMs;
      trace.exitCode = result.exitCode;
      trace.success = result.success;
      trace.stdout = result.stdout;
      trace.stderr = result.stderr;

      if (otelEnabled && span) {
        span.setAttributes({
          'cli.duration_ms': durationMs,
          'cli.exit_code': result.exitCode,
          'cli.success': result.success,
        });
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
      }

      if (result.success) {
        logger.info(`Command succeeded: ${command}`, {
          traceId: trace.id,
          durationMs,
          exitCode: result.exitCode,
        });
      } else {
        logger.error(`Command failed: ${command}`, {
          traceId: trace.id,
          durationMs,
          exitCode: result.exitCode,
          stderr: result.stderr,
        });
      }

      this.currentTrace = null;
      return trace;
    } catch (error) {
      const durationMs = performance.now() - startTime;
      const err = error as Error;

      trace.endTime = new Date().toISOString();
      trace.durationMs = durationMs;
      trace.success = false;
      trace.stderr = err.message;

      if (otelEnabled && span) {
        span.setAttributes({
          'cli.duration_ms': durationMs,
          'cli.exit_code': -1,
          'cli.success': false,
        });
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        span.recordException(err);
        span.end();
      }

      logger.error(`Command exception: ${command}`, {
        traceId: trace.id,
        durationMs,
        error: err.message,
        stack: err.stack,
      });

      this.currentTrace = null;
      throw error;
    }
  }

  private generateTraceId(): string {
    return `CMD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }

  getTraces(): CommandTrace[] {
    return [...this.traces];
  }

  getLastTrace(): CommandTrace | undefined {
    return this.traces[this.traces.length - 1];
  }

  getFailedTraces(): CommandTrace[] {
    return this.traces.filter(t => t.success === false);
  }

  getSuccessfulTraces(): CommandTrace[] {
    return this.traces.filter(t => t.success === true);
  }

  clearTraces(): void {
    this.traces = [];
  }

  printSummary(): void {
    const total = this.traces.length;
    const succeeded = this.getSuccessfulTraces().length;
    const failed = this.getFailedTraces().length;
    const totalDuration = this.traces.reduce((sum, t) => sum + (t.durationMs || 0), 0);

    logger.info('Command Execution Summary', {
      total,
      succeeded,
      failed,
      totalDurationMs: totalDuration,
      avgDurationMs: total > 0 ? Math.round(totalDuration / total) : 0,
    });

    if (failed > 0) {
      logger.warn(`\nFailed commands (${failed}):`);
      this.getFailedTraces().forEach(trace => {
        console.log(`  - [${trace.id}] ${trace.command}`);
        console.log(`    Exit code: ${trace.exitCode}`);
        console.log(`    Duration: ${trace.durationMs}ms`);
        if (trace.stderr) {
          console.log(`    Error: ${trace.stderr.substring(0, 100)}`);
        }
      });
    }
  }

  async checkPlatformAndReport(name: string, versionCommand: string): Promise<boolean> {
    const check = await commandExecutor.checkTool(name, versionCommand);

    logger.info(`Platform check: ${name}`, {
      available: check.available,
      version: check.version,
      installHint: check.installHint,
    });

    return check.available;
  }
}

export const commandWatcher = new CommandWatcher();

export class CommandBuilder {
  private parts: string[] = [];
  private cwd?: string;
  private traceEnabled: boolean = true;

  constructor(command?: string) {
    if (command) {
      this.parts = command.split(' ');
    }
  }

  append(arg: string): CommandBuilder {
    this.parts.push(arg);
    return this;
  }

  withCwd(cwd: string): CommandBuilder {
    this.cwd = cwd;
    return this;
  }

  disableTrace(): CommandBuilder {
    this.traceEnabled = false;
    return this;
  }

  build(): string {
    return this.parts.join(' ');
  }

  async execute(): Promise<CommandTrace> {
    const command = this.build();
    const watcher = new CommandWatcher();
    return watcher.executeWithTrace(command, this.cwd);
  }
}