/**
 * Per-tenant corpus isolation guard for the Agent Runtime service (GT-439).
 *
 * Runs as a global guard AFTER {@link ApiKeyGuard}, which has attached the
 * authenticated principal. This guard enforces that a tenant-scoped principal
 * may only drive requests targeting its own tenant/corpus:
 *
 *   - `@Public()` routes are exempt.
 *   - No principal on a protected route → DENY (fail-closed; auth must precede).
 *   - A service-level / wildcard principal (shared API key, dev no-auth) may act
 *     across tenants and is allowed.
 *   - A tenant-scoped principal (from a verified JWT) whose request targets a
 *     DIFFERENT tenant's corpus is denied. The requested tenant is read from
 *     `x-evolith-tenant` / `x-tenant-id` headers, the `tenant` query param, or
 *     the request body `context.tenantId`.
 */

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { PRINCIPAL_KEY, RequestWithPrincipal, WILDCARD_TENANT } from './principal';

@Injectable()
export class TenantCorpusGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<RequestWithPrincipal>();
    const principal = req[PRINCIPAL_KEY];

    // Fail-closed: a protected route with no authenticated principal means the
    // authentication guard did not run or did not authenticate. Refuse.
    if (!principal) {
      throw new ForbiddenException(
        'No authenticated principal; tenant scope cannot be established.',
      );
    }

    // Service-level / unscoped credential may act across tenants.
    if (principal.tenantId === WILDCARD_TENANT) return true;

    const requestedTenant = this.extractRequestedTenant(req);
    if (requestedTenant && requestedTenant !== principal.tenantId) {
      throw new ForbiddenException(
        `Access denied: tenant '${principal.tenantId}' cannot access corpus of tenant '${requestedTenant}'.`,
      );
    }

    return true;
  }

  /** Resolve the tenant whose corpus the request targets, if any. */
  private extractRequestedTenant(req: RequestWithPrincipal): string | undefined {
    const header =
      this.headerString(req, 'x-evolith-tenant') ?? this.headerString(req, 'x-tenant-id');
    if (header) return header;

    const query = req.query?.['tenant'];
    if (typeof query === 'string' && query.trim().length > 0) return query.trim();

    const body = req.body as { context?: { tenantId?: unknown } } | undefined;
    const bodyTenant = body?.context?.tenantId;
    if (typeof bodyTenant === 'string' && bodyTenant.trim().length > 0) {
      return bodyTenant.trim();
    }

    return undefined;
  }

  private headerString(req: RequestWithPrincipal, name: string): string | undefined {
    const value = req.headers[name];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    return undefined;
  }
}
