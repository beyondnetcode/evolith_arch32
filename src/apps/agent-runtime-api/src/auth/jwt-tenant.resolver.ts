/**
 * Tenant Claim Resolver — extracts tenant identity from JWT payload.
 * Separated from verification logic (SRP).
 */

import type { JwtPayload } from './jwt-types';

/** Tenant claim names accepted, in priority order. */
const TENANT_CLAIMS = ['tenant', 'tenantId', 'tenant_id', 'tid'] as const;

/** Extract the tenant claim from a payload, or undefined if none present. */
export function extractTenantClaim(payload: JwtPayload): string | undefined {
  for (const claim of TENANT_CLAIMS) {
    const value = payload[claim];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}
