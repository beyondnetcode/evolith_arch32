import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as crypto from 'node:crypto';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';

/**
 * API-key guard for CORE-API (closes ARCH item 26 — previously the API had no
 * auth guard). Consistent with the MCP server: the key is read from
 * `EVOLITH_API_KEY` and presented by callers as `Authorization: Bearer <key>`
 * or `x-api-key: <key>`, compared in constant time.
 *
 * MIGRATION-SAFE ROLLOUT (deliberate): enforcement is OPT-IN.
 *   - If `EVOLITH_API_KEY` is NOT set, the guard allows requests (logging a
 *     one-time warning). This preserves the currently-deployed unauthenticated
 *     core-api until the key is provisioned and consumers (Tracker BFF, CLI
 *     remote mode) are updated to send it — so enabling auth never breaks prod
 *     in a single deploy.
 *   - Set `CORE_API_AUTH_REQUIRED=true` to fail-closed even when no key is
 *     configured (protects against accidentally shipping with auth disabled).
 *   - Once `EVOLITH_API_KEY` is set, every non-`@Public()` route requires it.
 *
 * `@Public()` routes (health/readiness probes) are always allowed.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger('ApiKeyGuard');
  private warnedNoKey = false;

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const configured = process.env.EVOLITH_API_KEY;
    const required = process.env.CORE_API_AUTH_REQUIRED === 'true';

    if (!configured) {
      if (required) {
        throw new UnauthorizedException(
          'CORE_API_AUTH_REQUIRED=true but EVOLITH_API_KEY is not configured.',
        );
      }
      if (!this.warnedNoKey) {
        this.warnedNoKey = true;
        this.logger.warn(
          'EVOLITH_API_KEY is not set — CORE-API is running UNAUTHENTICATED. ' +
            'Set EVOLITH_API_KEY to enforce API-key auth.',
        );
      }
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const presented = this.extractKey(req);
    if (!this.safeKeyEqual(presented, configured)) {
      throw new UnauthorizedException('Missing or invalid API key.');
    }
    return true;
  }

  private extractKey(req: Request): string | undefined {
    const headerKey = req.headers['x-api-key'];
    if (typeof headerKey === 'string' && headerKey.length > 0) return headerKey;
    const auth = req.headers['authorization'];
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
    return undefined;
  }

  /** Constant-time comparison (mirrors the MCP server's safeKeyEqual). */
  private safeKeyEqual(presented: string | undefined, configured: string): boolean {
    if (!presented) return false;
    const a = crypto.createHash('sha256').update(presented).digest();
    const b = crypto.createHash('sha256').update(configured).digest();
    return crypto.timingSafeEqual(a, b);
  }
}
