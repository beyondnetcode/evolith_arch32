import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class AuditThrottlerGuard extends ThrottlerGuard implements CanActivate {
  private readonly logger = new Logger('Throttler');

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return await super.canActivate(context);
    } catch (error) {
      const request = context.switchToHttp().getRequest<Request>();
      this.logger.warn(JSON.stringify({
        event: 'RATE_LIMIT_HIT',
        ip: request.ip,
        method: request.method,
        path: request.url,
        timestamp: new Date().toISOString(),
      }));
      throw error;
    }
  }
}
