/**
 * API-key guard for the Agent Runtime service.
 *
 * The runtime executes governed capabilities, so the public endpoint is
 * protected by default. The key is read from the `AGENT_RUNTIME_API_KEY` env var
 * (encrypted in Coolify) and supplied by callers as either:
 *   - `Authorization: Bearer <key>`, or
 *   - `x-api-key: <key>`.
 *
 * Fail-closed: in production, a missing `AGENT_RUNTIME_API_KEY` denies every
 * non-public route unless `AGENT_RUNTIME_ALLOW_NO_AUTH=true` is set explicitly.
 * Routes marked `@Public()` (health, root) are always allowed.
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const configured = process.env.AGENT_RUNTIME_API_KEY;
    const allowNoAuth = process.env.AGENT_RUNTIME_ALLOW_NO_AUTH === 'true';
    const isProd = process.env.NODE_ENV === 'production';

    if (!configured) {
      // No key configured: allow in dev or when explicitly opted in; deny in prod.
      if (!isProd || allowNoAuth) return true;
      throw new UnauthorizedException(
        'AGENT_RUNTIME_API_KEY is not configured; refusing requests (set AGENT_RUNTIME_ALLOW_NO_AUTH=true to override).',
      );
    }

    const presented = this.extractKey(context);
    if (!presented || !this.safeEqual(presented, configured)) {
      throw new UnauthorizedException('Missing or invalid API key.');
    }
    return true;
  }

  private extractKey(context: ExecutionContext): string | undefined {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const headerKey = req.headers['x-api-key'];
    if (typeof headerKey === 'string' && headerKey.length > 0) return headerKey;

    const auth = req.headers['authorization'];
    if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
      return auth.slice(7).trim();
    }
    return undefined;
  }

  /** Constant-time-ish comparison to avoid trivial timing leaks. */
  private safeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }
}
