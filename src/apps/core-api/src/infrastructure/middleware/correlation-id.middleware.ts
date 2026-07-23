import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import { requestContextStorage } from '@beyondnet/evolith-core-domain/common/request-context';

/** M12: Validate header values contain only safe characters (alphanumeric, hyphens, underscores, dots). */
const SAFE_HEADER_REGEX = /^[a-zA-Z0-9_\-\.]+$/;

function sanitizeHeaderValue(value: string | undefined, maxLength = 256): string | undefined {
  if (!value || typeof value !== 'string') return undefined;
  const trimmed = value.trim().slice(0, maxLength);
  return SAFE_HEADER_REGEX.test(trimmed) ? trimmed : undefined;
}

export const als = new AsyncLocalStorage<{ correlationId: string }>();

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // M12: Sanitize all header values before reflecting them in responses
  const correlationId = sanitizeHeaderValue(req.headers['x-correlation-id'] as string) || randomUUID();
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  const headerInitiative = sanitizeHeaderValue(req.headers['x-evolith-initiative'] as string);
  const headerTenant = sanitizeHeaderValue(req.headers['x-evolith-tenant'] as string);
  const headerPhase = sanitizeHeaderValue(req.headers['x-evolith-phase'] as string);
  const query = req.query as Record<string, unknown>;
  const body = (req.body as Record<string, unknown> | undefined) ?? {};

  const initiative =
    headerInitiative ??
    (query.initiative as string | undefined) ??
    (body.initiative as string | undefined);
  const tenant =
    headerTenant ??
    (query.tenant as string | undefined) ??
    (body.tenant as string | undefined);
  const phase =
    headerPhase ??
    (query.phase as string | undefined) ??
    (body.phase as string | undefined);

  if (initiative) res.setHeader('x-evolith-initiative', initiative);
  if (tenant) res.setHeader('x-evolith-tenant', tenant);
  if (phase) res.setHeader('x-evolith-phase', phase);

  als.run({ correlationId }, () => {
    requestContextStorage.run({ correlationId, initiative, tenant, phase }, () => {
      next();
    });
  });
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use = correlationIdMiddleware;
}

export function getCorrelationId(): string | undefined {
  return als.getStore()?.correlationId;
}
