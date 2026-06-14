import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';

export const als = new AsyncLocalStorage<{ correlationId: string }>();

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  als.run({ correlationId }, () => {
    next();
  });
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use = correlationIdMiddleware;
}

export function getCorrelationId(): string | undefined {
  return als.getStore()?.correlationId;
}
