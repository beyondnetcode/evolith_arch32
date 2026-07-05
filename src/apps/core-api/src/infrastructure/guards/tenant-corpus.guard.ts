import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

/**
 * GT-394: Per-tenant ABAC guard for corpus access.
 *
 * Prevents a tenant from reading another tenant's rulesets/corpus.
 * Extracts tenant ID from the request context and validates it against
 * the resource being accessed.
 *
 * When no tenant context is present (single-tenant mode), allows access.
 * When tenant context is present, validates that the requested resource
 * belongs to the same tenant.
 */
@Injectable()
export class TenantCorpusGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract tenant from various sources
    const tenantId = this.extractTenant(request);
    if (!tenantId) {
      // Single-tenant mode or no tenant context — allow
      return true;
    }

    // Check if the request targets a specific tenant's corpus
    const resourceTenant = this.extractResourceTenant(request);
    if (resourceTenant && resourceTenant !== tenantId) {
      throw new ForbiddenException(
        `Access denied: tenant '${tenantId}' cannot access resources belonging to tenant '${resourceTenant}'`,
      );
    }

    return true;
  }

  private extractTenant(request: Request): string | undefined {
    // Check Authorization header for tenant claim
    const authHeader = request.headers.authorization;
    if (authHeader) {
      // In production, decode JWT and extract tenant claim
      // For now, check X-Tenant-ID header
    }

    return (request.headers['x-tenant-id'] as string) ||
           (request.query?.tenant as string) ||
           undefined;
  }

  private extractResourceTenant(request: Request): string | undefined {
    // Extract tenant from the resource path or query params
    return (request.params?.tenantId as string) ||
           (request.query?.tenant as string) ||
           undefined;
  }
}
