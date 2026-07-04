import { LoggerService } from '@nestjs/common';
import pino, { Logger, DestinationStream } from 'pino';

/**
 * NestJS logger that writes structured logs to **stderr**.
 *
 * Critical for the stdio transport: stdout is reserved for the MCP JSON-RPC
 * stream, so any log written there would corrupt the protocol. All diagnostic
 * output therefore goes to fd 2 (stderr).
 */
export class StderrLogger implements LoggerService {
  private readonly logger: Logger;

  constructor(
    level: string = process.env.LOG_LEVEL ?? 'info',
    destination: DestinationStream = pino.destination(2),
  ) {
    this.logger = pino({ level, base: { name: 'evolith-mcp' } }, destination);
  }

  log(message: unknown, context?: string): void {
    this.logger.info({ context }, String(message));
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.logger.error({ context, trace }, String(message));
  }

  warn(message: unknown, context?: string): void {
    this.logger.warn({ context }, String(message));
  }

  debug(message: unknown, context?: string): void {
    this.logger.debug({ context }, String(message));
  }

  verbose(message: unknown, context?: string): void {
    this.logger.trace({ context }, String(message));
  }
}
