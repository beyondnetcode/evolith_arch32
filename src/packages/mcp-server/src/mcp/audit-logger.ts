import { Injectable, Logger } from '@nestjs/common';

export interface AuditEvent {
  readonly tool: string;
  readonly args: Record<string, unknown>;
  readonly context: {
    readonly initiative?: string;
    readonly tenant?: string;
    readonly phase?: string;
    readonly userId?: string;
    readonly role?: string;
  };
  readonly durationMs: number;
  readonly status: 'success' | 'error' | 'denied';
  readonly correlationId: string;
  readonly timestamp: string;
  readonly errorMessage?: string;
}

@Injectable()
export class AuditLogger {
  private readonly logger = new Logger('AuditLogger');
  private readonly events: AuditEvent[] = [];
  private static readonly MAX_EVENTS = 1000;

  log(event: AuditEvent): void {
    this.events.unshift(event);
    if (this.events.length > AuditLogger.MAX_EVENTS) {
      this.events.length = AuditLogger.MAX_EVENTS;
    }
    this.logger.log(JSON.stringify(event));
  }

  logToolCall(params: {
    tool: string;
    args: Record<string, unknown>;
    context: AuditEvent['context'];
    durationMs: number;
    status: 'success' | 'error' | 'denied';
    correlationId: string;
    errorMessage?: string;
  }): void {
    this.log({
      tool: params.tool,
      args: params.args,
      context: params.context,
      durationMs: params.durationMs,
      status: params.status,
      correlationId: params.correlationId,
      timestamp: new Date().toISOString(),
      errorMessage: params.errorMessage,
    });
  }

  logResourceAccess(params: {
    tool: string;
    args: Record<string, unknown>;
    context: AuditEvent['context'];
    durationMs: number;
    status: 'success' | 'error' | 'denied';
    correlationId: string;
    errorMessage?: string;
  }): void {
    this.log({
      ...params,
      timestamp: new Date().toISOString(),
    });
  }

  logPromptAccess(params: {
    tool: string;
    args: Record<string, unknown>;
    context: AuditEvent['context'];
    durationMs: number;
    status: 'success' | 'error' | 'denied';
    correlationId: string;
    errorMessage?: string;
  }): void {
    this.log({
      ...params,
      timestamp: new Date().toISOString(),
    });
  }

  getRecentEvents(limit = 50): readonly AuditEvent[] {
    return this.events.slice(0, limit);
  }

  getEventCount(): number {
    return this.events.length;
  }
}
