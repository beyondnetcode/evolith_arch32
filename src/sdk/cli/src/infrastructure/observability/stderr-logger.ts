import { LoggerService } from '@nestjs/common';

/**
 * A Nest logger that writes exclusively to STDERR.
 *
 * The CLI's `--format json` mode is an ADR-0073 machine-consumption contract:
 * stdout MUST be a single parseable JSON envelope. Nest's default ConsoleLogger
 * routes `warn`/`log` to process.stdout, which prepends `[Nest] … WARN …` lines
 * to the envelope and makes `JSON.parse(stdout)` fail. Routing every diagnostic
 * line to stderr keeps stdout clean while preserving the warnings for humans.
 *
 * Level visibility mirrors the previous `logger: ['warn', 'error']` filter:
 * `log`/`debug`/`verbose` are suppressed; only `warn` and `error` are emitted
 * (to stderr).
 */
export class StderrLogger implements LoggerService {
  log(): void {
    /* suppressed — matches prior ['warn','error'] filter */
  }

  verbose(): void {
    /* suppressed */
  }

  debug(): void {
    /* suppressed */
  }

  warn(message: unknown, context?: string): void {
    this.write('WARN', message, context);
  }

  error(message: unknown, ...rest: unknown[]): void {
    // Nest calls error(message, stack?, context?) with varying arity; the last
    // string arg is the context, and a multi-line string is typically the stack.
    const context = rest.filter((r): r is string => typeof r === 'string').pop();
    this.write('ERROR', message, context);
    for (const r of rest) {
      if (typeof r === 'string' && r.includes('\n')) process.stderr.write(`${r}\n`);
    }
  }

  private write(level: string, message: unknown, context?: string): void {
    const ctx = context ? ` [${context}]` : '';
    const text = typeof message === 'string' ? message : JSON.stringify(message);
    process.stderr.write(`[Nest]${ctx} ${level} ${text}\n`);
  }
}
