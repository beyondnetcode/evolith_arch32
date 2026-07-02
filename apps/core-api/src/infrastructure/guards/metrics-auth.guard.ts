import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

/**
 * GT-393: Forces API key authentication on /metrics even when
 * EVOLITH_API_KEY is not set. Prometheus scrapers should never
 * reach the public listener without credentials.
 *
 * When EVOLITH_API_KEY is set, validates the Bearer token.
 * When not set, returns 401 to prevent open scraping.
 */
@Injectable()
export class MetricsAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const configured = process.env.EVOLITH_API_KEY;
    if (!configured) {
      // No API key configured — deny metrics access entirely
      throw new UnauthorizedException(
        'Metrics endpoint requires EVOLITH_API_KEY to be configured.',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header.');
    }

    const token = authHeader.slice(7);
    if (token !== configured) {
      throw new UnauthorizedException('Invalid API key.');
    }

    return true;
  }
}
