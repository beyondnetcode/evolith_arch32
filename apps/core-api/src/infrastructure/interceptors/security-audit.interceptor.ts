import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { Logger } from '@nestjs/common';

@Injectable()
export class SecurityAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('SecurityAudit');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const start = Date.now();

    const auditEntry = {
      ip: request.ip || request.socket.remoteAddress,
      method: request.method,
      path: request.url,
      userAgent: this.sanitize(request.headers['user-agent']),
      correlationId: request.headers['x-correlation-id'],
      timestamp: new Date().toISOString(),
    };

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<Response>();
          this.logger.log(JSON.stringify({
            ...auditEntry,
            statusCode: response.statusCode,
            outcome: 'ALLOW',
            durationMs: Date.now() - start,
          }));
        },
        error: (error: Error) => {
          const response = context.switchToHttp().getResponse<Response>();
          this.logger.warn(JSON.stringify({
            ...auditEntry,
            statusCode: response.statusCode || 500,
            outcome: 'DENY',
            error: error.message,
            durationMs: Date.now() - start,
          }));
        },
      }),
    );
  }

  private sanitize(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    return value.substring(0, 200);
  }
}
