/**
 * GT-582 — OAuth 2.0 Protected Resource Metadata (RFC 9728).
 *
 * The 2026-07-28 revision makes this a hard requirement of the authorization
 * framework: "MCP servers **MUST** implement OAuth 2.0 Protected Resource
 * Metadata (RFC9728)" and "MCP clients **MUST** use [it] for authorization
 * server discovery". Until now this server validated bearer tokens
 * (`oauth-resource-server.ts`) but published nothing, so a client had no
 * standards-defined way to find out WHICH authorization server to go to — it
 * had to be told out of band.
 *
 * On client registration, the same revision deprecates Dynamic Client
 * Registration in favour of Client ID Metadata Documents. Note where that
 * obligation lands: `client_id_metadata_document_supported` is a field of
 * AUTHORIZATION SERVER metadata (RFC 8414), not of resource metadata, and this
 * server is a resource server. What a resource server owes is (a) to publish
 * this document so the client can reach the authorization server at all, and
 * (b) not to make registration flow through itself. Both hold here: nothing in
 * this package implements or requires an RFC 7591 `registration_endpoint`, and
 * `dcr-independence.spec.ts` fails the build if that ever changes.
 */

/** RFC 9728 §3 — the document a resource server publishes about itself. */
export interface ProtectedResourceMetadata {
  /** Canonical URI of this MCP server (RFC 8707 resource identifier). */
  resource: string;
  /** At least one authorization server. Required by MCP, beyond RFC 9728. */
  authorization_servers: string[];
  /** Scopes a client is expected to request for basic functionality. */
  scopes_supported: string[];
  /** How a token may be presented. MCP mandates the Authorization header. */
  bearer_methods_supported: string[];
  /** Human-readable documentation for this resource. */
  resource_documentation?: string;
  /** Signing algorithms accepted for JWT access tokens, when known. */
  resource_signing_alg_values_supported?: string[];
}

export interface ResourceMetadataInput {
  /** Canonical URI of this server, e.g. `https://mcp.example.com/mcp`. */
  resource: string;
  /** Authorization server issuer identifiers. */
  authorizationServers: string[];
  scopesSupported?: string[];
  documentation?: string;
}

/**
 * Scopes this server needs for basic functionality. Deliberately minimal —
 * `admin` is NOT here: the specification asks `scopes_supported` to be the
 * minimum for basic use, with anything more requested through a step-up
 * challenge.
 */
export const DEFAULT_RESOURCE_SCOPES = ['read', 'write'];

export function buildProtectedResourceMetadata(input: ResourceMetadataInput): ProtectedResourceMetadata {
  return {
    resource: input.resource,
    authorization_servers: [...input.authorizationServers],
    scopes_supported: input.scopesSupported ?? [...DEFAULT_RESOURCE_SCOPES],
    bearer_methods_supported: ['header'],
    ...(input.documentation ? { resource_documentation: input.documentation } : {}),
  };
}

/**
 * Resolve the metadata inputs from configuration, or `null` when this server is
 * not an OAuth-protected resource.
 *
 * Returning `null` rather than a partial document is deliberate: a Protected
 * Resource Metadata document without `authorization_servers` is not conformant,
 * and publishing an empty one would send clients into a discovery loop that
 * cannot terminate. When OAuth is off, the endpoint 404s and the API-key path
 * applies unchanged.
 */
export function resolveResourceMetadata(
  env: NodeJS.ProcessEnv,
  fallbackResource: string,
): ResourceMetadataInput | null {
  const explicitServers = env.EVOLITH_MCP_RESOURCE_AUTH_SERVERS?.split(',').map((s) => s.trim()).filter(Boolean);
  const issuer = env.EVOLITH_MCP_OAUTH_ISSUER?.trim();
  const authorizationServers = explicitServers?.length ? explicitServers : issuer ? [issuer] : [];
  if (authorizationServers.length === 0) return null;

  const resource = env.EVOLITH_MCP_RESOURCE_URI?.trim() || env.EVOLITH_MCP_OAUTH_AUDIENCE?.trim() || fallbackResource;
  const scopes = env.EVOLITH_MCP_RESOURCE_SCOPES?.split(/[ ,]+/).map((s) => s.trim()).filter(Boolean);
  return {
    resource,
    authorizationServers,
    scopesSupported: scopes?.length ? scopes : undefined,
    documentation: 'https://github.com/beyondnetcode/evolith_arch32#readme',
  };
}

/** RFC 9728 §3.1 — the well-known URIs a client probes, in the order it probes them. */
export function wellKnownMetadataPaths(resourcePath: string): string[] {
  const normalized = resourcePath.replace(/^\/+/, '').replace(/\/+$/, '');
  const root = '/.well-known/oauth-protected-resource';
  return normalized ? [`${root}/${normalized}`, root] : [root];
}

/** Whether a request path is one of this server's resource-metadata URIs. */
export function isResourceMetadataPath(pathname: string): boolean {
  return pathname === '/.well-known/oauth-protected-resource'
    || pathname.startsWith('/.well-known/oauth-protected-resource/');
}

/**
 * The `WWW-Authenticate` challenge for a 401/403, per RFC 9728 §5.1 and the
 * MCP scope-selection strategy. `resource_metadata` is the discovery mechanism
 * MCP clients must read before falling back to well-known probing; `scope` tells
 * the client what to ask for instead of making it request everything.
 */
export function buildWwwAuthenticate(options: {
  resourceMetadataUrl: string;
  scope?: string;
  error?: 'invalid_token' | 'insufficient_scope';
  errorDescription?: string;
}): string {
  const params: string[] = [];
  if (options.error) params.push(`error="${options.error}"`);
  if (options.errorDescription) params.push(`error_description="${options.errorDescription.replace(/"/g, "'")}"`);
  params.push(`resource_metadata="${options.resourceMetadataUrl}"`);
  if (options.scope) params.push(`scope="${options.scope}"`);
  return `Bearer ${params.join(', ')}`;
}
