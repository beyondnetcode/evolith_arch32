/**
 * Authentication guard for the Agent Runtime service (GT-439).
 *
 * The runtime executes governed capabilities, so every non-public route is
 * authenticated. Two credential types are accepted:
 *
 *   - Shared API key (service credential): `x-api-key: <key>` or
 *     `Authorization: Bearer <key>`. Matched against `AGENT_RUNTIME_API_KEY`.
 *     A valid key yields a service-level, tenant-UNSCOPED principal (it may act
 *     across tenants).
 *   - Tenant JWT: `Authorization: Bearer <jwt>`, HS256-verified against
 *     `AGENT_RUNTIME_JWT_SECRET`. The verified `tenant` claim scopes the
 *     principal; {@link TenantCorpusGuard} then enforces corpus isolation.
 *
 * Fail-closed posture:
 *   - When NEITHER credential is configured, a production posture DENIES every
 *     non-public route (refuses to serve without auth). Dev still runs, and prod
 *     can opt out only via an explicit `AGENT_RUNTIME_ALLOW_NO_AUTH=true`.
 *   - A JWT-shaped bearer with no `AGENT_RUNTIME_JWT_SECRET` configured is
 *     denied (cannot verify → refuse). A verified JWT with a missing/invalid
 *     tenant claim is denied.
 *
 * On success the authenticated principal is attached to the request for
 * downstream guards. Routes marked `@Public()` (health, root, metrics) bypass
 * authentication entirely.
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import {
  AuthenticatedPrincipal,
  PRINCIPAL_KEY,
  RequestWithPrincipal,
  WILDCARD_TENANT,
} from './principal';
import { extractTenantClaim, looksLikeJwt, verifyHs256 } from './jwt.util';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<RequestWithPrincipal>();

    const apiKey = process.env.AGENT_RUNTIME_API_KEY;
    const jwtSecret = process.env.AGENT_RUNTIME_JWT_SECRET;
    const allowNoAuth = process.env.AGENT_RUNTIME_ALLOW_NO_AUTH === 'true';
    const isProd = process.env.NODE_ENV === 'production';

    // Fail-closed: no credential material configured at all.
    if (!apiKey && !jwtSecret) {
      if (!isProd || allowNoAuth) {
        this.attach(req, { authMethod: 'none', tenantId: WILDCARD_TENANT });
        return true;
      }
      throw new UnauthorizedException(
        'No auth is configured (set AGENT_RUNTIME_API_KEY and/or AGENT_RUNTIME_JWT_SECRET); ' +
          'refusing requests. Set AGENT_RUNTIME_ALLOW_NO_AUTH=true to override in a trusted network.',
      );
    }

    const xApiKey = this.headerString(req, 'x-api-key');
    const bearer = this.extractBearer(req);

    // 1. Explicit API-key header.
    if (xApiKey !== undefined) {
      if (apiKey && this.safeEqual(xApiKey, apiKey)) {
        this.attach(req, { authMethod: 'api-key', tenantId: WILDCARD_TENANT });
        return true;
      }
      throw new UnauthorizedException('Invalid API key.');
    }

    // 2. Bearer token: either a JWT (tenant-scoped) or the shared API key.
    if (bearer !== undefined) {
      if (looksLikeJwt(bearer)) {
        return this.authenticateJwt(req, bearer, jwtSecret);
      }
      if (apiKey && this.safeEqual(bearer, apiKey)) {
        this.attach(req, { authMethod: 'api-key', tenantId: WILDCARD_TENANT });
        return true;
      }
      throw new UnauthorizedException('Invalid API key.');
    }

    // 3. No credential presented on a protected route.
    throw new UnauthorizedException('Missing credentials (x-api-key or Authorization: Bearer).');
  }

  private authenticateJwt(
    req: RequestWithPrincipal,
    token: string,
    jwtSecret: string | undefined,
  ): boolean {
    if (!jwtSecret) {
      // JWT presented but no verification material — cannot verify → refuse.
      throw new UnauthorizedException(
        'Bearer JWT presented but AGENT_RUNTIME_JWT_SECRET is not configured; cannot verify token.',
      );
    }
    const result = verifyHs256(token, jwtSecret);
    if (!result.ok || !result.payload) {
      throw new UnauthorizedException(`Invalid bearer token (${result.reason ?? 'unverified'}).`);
    }
    const tenantId = extractTenantClaim(result.payload);
    if (!tenantId) {
      throw new UnauthorizedException('Bearer token is missing a valid tenant claim.');
    }
    const roles = Array.isArray(result.payload.roles)
      ? (result.payload.roles.filter((r) => typeof r === 'string') as string[])
      : undefined;
    this.attach(req, {
      authMethod: 'jwt',
      tenantId,
      subject: typeof result.payload.sub === 'string' ? result.payload.sub : undefined,
      roles,
    });
    return true;
  }

  private attach(req: RequestWithPrincipal, principal: AuthenticatedPrincipal): void {
    req[PRINCIPAL_KEY] = principal;
  }

  private headerString(req: RequestWithPrincipal, name: string): string | undefined {
    const value = req.headers[name];
    if (typeof value === 'string' && value.length > 0) return value;
    return undefined;
  }

  private extractBearer(req: RequestWithPrincipal): string | undefined {
    const auth = req.headers['authorization'];
    if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
      const token = auth.slice(7).trim();
      return token.length > 0 ? token : undefined;
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
