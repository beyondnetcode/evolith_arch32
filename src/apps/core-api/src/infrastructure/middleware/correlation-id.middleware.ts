import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import { requestContextStorage } from '@beyondnet/evolith-core-domain/common/request-context';

export const als = new AsyncLocalStorage<{ correlationId: string }>();

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('x-correlation-id', correlationId);

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
