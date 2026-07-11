import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable, map } from 'rxjs';
import { Request } from 'express';
import { requestContextStorage } from '@beyondnet/evolith-core-domain/common/request-context';

export interface EnvelopeContext {
  initiative?: string;
  tenant?: string;
  phase?: string;
}

export interface EnvelopeMeta {
  command: string;
  executedAt: string;
  durationMs: number;
  correlationId: string;
  context: EnvelopeContext;
  schemaVersion: string;
}

export interface SuccessEnvelope<T = unknown> {
  success: true;
  data: T;
  meta: EnvelopeMeta;
}

export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: EnvelopeMeta;
}

export type Envelope<T = unknown> = SuccessEnvelope<T> | ErrorEnvelope;

export const ENVELOPE_SCHEMA_VERSION = '1.0.0';

function deriveCommand(req: Request): string {
  const route = (req.route?.path as string | undefined) ?? req.url;
  return `http ${req.method} ${route}`;
}

function deriveContext(req: Request): EnvelopeContext {
  const ctx: EnvelopeContext = {};
  const headerInitiative = req.headers['x-evolith-initiative'];
  const headerTenant = req.headers['x-evolith-tenant'];
  const headerPhase = req.headers['x-evolith-phase'];
  const query = req.query as Record<string, unknown>;
  const body = (req.body as Record<string, unknown> | undefined) ?? {};

  const initiative =
    (headerInitiative as string | undefined) ??
    (query.initiative as string | undefined) ??
    (body.initiative as string | undefined);
  const tenant =
    (headerTenant as string | undefined) ??
    (query.tenant as string | undefined) ??
    (body.tenant as string | undefined);
  const phase =
    (headerPhase as string | undefined) ??
    (query.phase as string | undefined) ??
    (body.phase as string | undefined);

  if (initiative) ctx.initiative = initiative;
  if (tenant) ctx.tenant = tenant;
  if (phase) ctx.phase = phase;
  return ctx;
}

export function buildEnvelopeMeta(req: Request, startedAt: number): EnvelopeMeta {
  const sharedCtx = requestContextStorage.getStore();
  const correlationId =
    sharedCtx?.correlationId ??
    (req.headers['x-correlation-id'] as string | undefined) ??
    `evl-${randomUUID()}`;

  const context: EnvelopeContext = {
    ...deriveContext(req),
    ...(sharedCtx?.initiative ? { initiative: sharedCtx.initiative } : {}),
    ...(sharedCtx?.tenant ? { tenant: sharedCtx.tenant } : {}),
    ...(sharedCtx?.phase ? { phase: sharedCtx.phase } : {}),
  };

  return {
    command: deriveCommand(req),
    executedAt: new Date(startedAt).toISOString(),
    durationMs: Date.now() - startedAt,
    correlationId,
    context,
    schemaVersion: ENVELOPE_SCHEMA_VERSION,
  };
}

@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<Request>();
    const startedAt = Date.now();

    return next.handle().pipe(
      map((data: unknown) => {
        if (data && typeof data === 'object' && 'success' in (data as object)) {
          return data;
        }
        const envelope: SuccessEnvelope = {
          success: true,
          data: data ?? null,
          meta: buildEnvelopeMeta(req, startedAt),
        };
        return envelope;
      }),
    );
  }
}
