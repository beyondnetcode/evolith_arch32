import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';

/**
 * GT-549 — dedicated fail-closed guard for `/metrics`.
 *
 * The Prometheus endpoint leaks operational shape (routes, request volumes, error
 * counts, and — since GT-546 — agent-execution counts), so it must not be readable by
 * anonymous callers. This mirrors core-api's `MetricsAuthGuard` (GT-393): with a
 * credential configured it requires a matching Bearer/`x-api-key`; without one it fails
 * closed UNLESS the operator explicitly opts out via `AGENT_RUNTIME_ALLOW_NO_AUTH=true`
 * (the same trusted-network escape hatch the runtime's ApiKeyGuard honours), so local
 * dev / in-cluster scraping behind a NetworkPolicy is unaffected.
 *
 * It runs via a route-level `@UseGuards`, independent of the global ApiKeyGuard, so the
 * scrape credential is decoupled from the runtime's request auth.
 */
@Injectable()
export class MetricsAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const configured = process.env.AGENT_RUNTIME_API_KEY;
    const allowNoAuth = process.env.AGENT_RUNTIME_ALLOW_NO_AUTH === 'true';

    if (!configured) {
      if (allowNoAuth) return true;
      throw new UnauthorizedException(
        'Metrics endpoint requires AGENT_RUNTIME_API_KEY (or AGENT_RUNTIME_ALLOW_NO_AUTH=true in a trusted network).',
      );
    }

    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers.authorization;
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const xApiKey = req.headers['x-api-key'];
    const presented = bearer ?? (typeof xApiKey === 'string' ? xApiKey : undefined);

    if (presented && this.safeEqual(presented, configured)) return true;
    throw new UnauthorizedException('Missing or invalid metrics credential.');
  }

  /**
   * Constant-time comparison of two secrets. A length mismatch is a fast reject
   * (an unequal-length credential is trivially wrong; the real key's length is not
   * sensitive), and equal-length inputs are compared with `timingSafeEqual` so no
   * per-byte timing leaks. No hashing — this is a shared-secret equality check, not
   * password storage.
   */
  private safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a, 'utf8');
    const bb = Buffer.from(b, 'utf8');
    if (ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
  }
}
