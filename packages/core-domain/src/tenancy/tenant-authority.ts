import { Role, hasRole, hasAnyRole } from '../domain/rbac';

export interface Tenant {
  readonly id: string;
  readonly name: string;
  readonly tier: 'free' | 'pro' | 'enterprise';
  readonly allowedTopologies: string[];
  readonly maxSatellites: number;
}

export interface TenantContext {
  readonly tenantId: string;
  readonly actorId: string;
  /** Typed actor roles — use Role enum values for ABAC checks. */
  readonly roles: Role[];
}

export class TenantAuthorityService {
  private tenants = new Map<string, Tenant>();

  register(tenant: Tenant): void {
    this.tenants.set(tenant.id, tenant);
  }

  get(tenantId: string): Tenant | undefined {
    return this.tenants.get(tenantId);
  }

  canUseTopology(tenantId: string, topology: string): boolean {
    const tenant = this.tenants.get(tenantId);
    return tenant?.allowedTopologies.includes(topology) ?? false;
  }

  isWithinSatelliteLimit(tenantId: string, currentCount: number): boolean {
    const tenant = this.tenants.get(tenantId);
    return tenant ? currentCount < tenant.maxSatellites : false;
  }

  /** ABAC: returns true when the actor's roles include `requiredRole` (hierarchy-aware). */
  actorHasRole(context: TenantContext, requiredRole: Role): boolean {
    return hasRole(context.roles, requiredRole);
  }

  /** ABAC: returns true when the actor holds at least one of `requiredRoles` (hierarchy-aware). */
  actorHasAnyRole(context: TenantContext, requiredRoles: Role[]): boolean {
    return hasAnyRole(context.roles, requiredRoles);
  }
}
