import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as crypto from 'crypto';

/**
 * Constant-time API key comparison to prevent timing side-channel attacks (CWE-208).
 * Mirrors the pattern from ApiKeyGuard.safeKeyEqual.
 */
function safeKeyEqual(presented: string, configured: string): boolean {
  const a = crypto.createHash('sha256').update(presented).digest();
  const b = crypto.createHash('sha256').update(configured).digest();
  return crypto.timingSafeEqual(a, b);
}

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
  private cachedKey: string | null = null;

  constructor(private readonly reflector: Reflector) {}

  private async getConfiguredKey(): Promise<string | undefined> {
    if (this.cachedKey !== null) return this.cachedKey;

    if (process.env.EVOLITH_API_KEY) {
      this.cachedKey = process.env.EVOLITH_API_KEY;
      return this.cachedKey;
    }

    try {
      const port = process.env.DAPR_HTTP_PORT || 3500;
      const url = `http://localhost:${port}/v1.0/secrets/kubernetes-secret-store/core-api-auth`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json() as Record<string, string>;
        if (data.EVOLITH_API_KEY) {
          this.cachedKey = data.EVOLITH_API_KEY;
          return this.cachedKey;
        }
      }
    } catch (err) {
      // Dapr sidecar not reachable or secret not found
    }

    return undefined;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const configured = await this.getConfiguredKey();
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
    if (!safeKeyEqual(token, configured)) {
      throw new UnauthorizedException('Invalid API key.');
    }

    return true;
  }
}
