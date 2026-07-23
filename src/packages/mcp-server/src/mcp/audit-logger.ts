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

/** Parameters for logEvent — shared by tool, resource, and prompt access logging. */
export interface AuditEventParams {
  tool: string;
  args: Record<string, unknown>;
  context: AuditEvent['context'];
  durationMs: number;
  status: 'success' | 'error' | 'denied';
  correlationId: string;
  errorMessage?: string;
}

@Injectable()
export class AuditLogger {
  private readonly logger = new Logger('AuditLogger');
  private readonly events: AuditEvent[] = [];
  private static readonly MAX_EVENTS = Number(process.env.AUDIT_MAX_EVENTS) || 1000;

  constructor() {
    if (process.env.NODE_ENV === 'production') {
      this.logger.warn(
        'AuditLogger is using in-memory storage — audit events will be lost on restart. ' +
        'For production use, implement persistent audit storage (e.g. database or external sink).',
      );
    }
  }

  log(event: AuditEvent): void {
    this.events.unshift(event);
    if (this.events.length > AuditLogger.MAX_EVENTS) {
      this.events.length = AuditLogger.MAX_EVENTS;
    }
    this.logger.log(JSON.stringify(event));
  }

  /**
   * Log any access event (tool, resource, or prompt).
   * Single method replacing the previous logToolCall/logResourceAccess/logPromptAccess
   * which were identical in behavior (DRY refactoring).
   */
  logEvent(params: AuditEventParams): void {
    this.log({
      ...params,
      timestamp: new Date().toISOString(),
    });
  }

  /** @deprecated Use logEvent() instead. Kept for backward compatibility. */
  logToolCall(params: AuditEventParams): void {
    this.logEvent(params);
  }

  /** @deprecated Use logEvent() instead. Kept for backward compatibility. */
  logResourceAccess(params: AuditEventParams): void {
    this.logEvent(params);
  }

  /** @deprecated Use logEvent() instead. Kept for backward compatibility. */
  logPromptAccess(params: AuditEventParams): void {
    this.logEvent(params);
  }

  getRecentEvents(limit = Number(process.env.AUDIT_DEFAULT_QUERY_LIMIT) || 50): readonly AuditEvent[] {
    return this.events.slice(0, limit);
  }

  getEventCount(): number {
    return this.events.length;
  }
}
