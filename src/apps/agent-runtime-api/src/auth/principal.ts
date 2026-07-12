/**
 * Authenticated principal attached to a request by {@link ApiKeyGuard} and read
 * by {@link TenantCorpusGuard} to enforce per-tenant corpus isolation.
 *
 * The two global guards run in registration order (ApiKeyGuard authenticates
 * and attaches the principal; TenantCorpusGuard authorizes tenant scope), so
 * the principal is the contract shared between them.
 */

export type AuthMethod = 'api-key' | 'jwt' | 'none';

export interface AuthenticatedPrincipal {
  /** How the caller authenticated. `none` = dev / explicit no-auth posture. */
  authMethod: AuthMethod;
  /**
   * Tenant scope of the principal. {@link WILDCARD_TENANT} means the credential
   * is service-level / unscoped (a shared API key or the dev no-auth path) and
   * therefore bypasses tenant-corpus isolation. A concrete tenant id comes from
   * a verified JWT tenant claim and IS enforced.
   */
  tenantId: string;
  subject?: string;
  roles?: string[];
}

/**
 * Wildcard tenant: a trusted service credential (shared API key) or the dev
 * no-auth path. Bypasses tenant-corpus isolation because it is not scoped to a
 * single tenant. Only a verified JWT tenant claim produces a concrete,
 * enforced tenant id.
 */
export const WILDCARD_TENANT = '*';

/** Request property under which the authenticated principal is stashed. */
export const PRINCIPAL_KEY = 'evolithPrincipal';

/** Request shape carrying the (optional) authenticated principal. */
export interface RequestWithPrincipal {
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  [PRINCIPAL_KEY]?: AuthenticatedPrincipal;
}
