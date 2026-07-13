import * as http from 'node:http';
import * as crypto from 'node:crypto';
import { ErrorCodes } from '../common/errors';
import { failure, generateCorrelationId } from '../common/envelopes';
import type { McpUserContext } from './mcp-user-context';
import { verifyOAuthToken, type OAuthConfig, type JwksKeyResolver } from './oauth-resource-server';

/**
 * Constant-time API-key comparison (GAP MCP-TIMING). Guards against the timing
 * side-channel of `===` by hashing to fixed-length buffers before comparing.
 * A configured key is required; empty/undefined presented tokens never match.
 */
function safeKeyEqual(presented: string | undefined, configured: string | undefined): boolean {
  if (!presented || !configured) return false;
  const a = crypto.createHash('sha256').update(presented).digest();
  const b = crypto.createHash('sha256').update(configured).digest();
  return crypto.timingSafeEqual(a, b);
}

const ADMIN_CONTEXT: McpUserContext = Object.freeze({
  id: 'admin-api-key',
  role: 'admin',
  roles: ['admin'],
  tenant: 'default',
  environment: process.env.NODE_ENV || 'development',
  scopes: ['read', 'write', 'admin'],
}) as McpUserContext;

function writeUnauthorized(res: http.ServerResponse, message: string): null {
  const correlationId = generateCorrelationId();
  const err = failure(ErrorCodes.UNAUTHORIZED, message, { correlationId, tool: 'auth', durationMs: 0 });
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(err));
  return null;
}

/**
 * GT-520 · EAG-15 / AC1 — remote Streamable HTTP authentication entry point.
 *
 * Order of precedence:
 *  1. When OAuth is configured ({@link OAuthConfig}) and the request carries a
 *     `Bearer` token that is NOT the shared API key, the token is validated as an
 *     OAuth 2.1 access token (signature + iss/aud/exp). A valid token yields a
 *     {@link McpUserContext} built from its VERIFIED claims — this is the identity
 *     that flows into per-identity ABAC, never a raw request header.
 *  2. Otherwise the existing local path ({@link validateAuth}: shared API key,
 *     local HS256 JWT, or the dev `allowNoAuth` bypass) applies — preserving the
 *     stdio/local developer experience unchanged.
 *
 * A remote request with no accepted credential is rejected with 401. When OAuth
 * is configured, an unauthenticated request whose only credential is an
 * invalid/expired bearer falls through to {@link validateAuth}, which 401s it
 * (unless a shared API key or dev bypass independently authorizes it).
 */
export async function authenticateHttpRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  apiKey: string | undefined,
  allowNoAuth = false,
  oauthConfig?: OAuthConfig | null,
  keyResolver?: JwksKeyResolver,
): Promise<McpUserContext | null> {
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (oauthConfig && bearerToken && !safeKeyEqual(bearerToken, apiKey)) {
    const payload = await verifyOAuthToken(bearerToken, oauthConfig, keyResolver);
    if (payload) return getContextFromPayload(payload);
    // A bearer was presented but is not a valid OAuth token. It may still be a
    // local HS256 JWT (validateAuth handles that); if not, validateAuth 401s.
    // But if OAuth is the ONLY configured credential source (no shared API key,
    // no local JWT secret, not a dev bypass), reject here so an invalid/expired
    // OAuth bearer never silently degrades to an unauthenticated path.
    const hasLocalCredential = !!apiKey || !!process.env.JWT_SECRET || allowNoAuth;
    if (!hasLocalCredential) {
      return writeUnauthorized(res, 'Invalid or expired OAuth bearer token');
    }
  }

  return validateAuth(req, res, apiKey, allowNoAuth);
}

export function validateAuth(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  apiKey: string | undefined,
  allowNoAuth = false,
): McpUserContext | null {
  const env = process.env.NODE_ENV || 'development';

  if (!apiKey) {
    if (env === 'production' || !allowNoAuth) {
      const correlationId = generateCorrelationId();
      const err = failure(
        ErrorCodes.UNAUTHORIZED,
        'MCP server requires an API key. Set EVOLITH_API_KEY or --api-key.',
        { correlationId, tool: 'auth', durationMs: 0 },
      );
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(err));
      return null;
    }
    return { ...ADMIN_CONTEXT, environment: env };
  }

  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const apiKeyHeader = req.headers['x-api-key'] as string | undefined;

  if (safeKeyEqual(bearerToken, apiKey) || safeKeyEqual(apiKeyHeader, apiKey)) {
    return { ...ADMIN_CONTEXT, environment: process.env.NODE_ENV || 'development' };
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (bearerToken && jwtSecret) { // codeql[js/user-controlled-val-in-sensitive-action] — intentional: JWT auth requires user-provided token
    const payload = verifyJwtToken(bearerToken, jwtSecret);
    if (payload) return getContextFromPayload(payload);
  }

  const correlationId = generateCorrelationId();
  const err = failure(
    ErrorCodes.UNAUTHORIZED,
    'Invalid or missing API key or JWT token',
    { correlationId, tool: 'auth', durationMs: 0 },
  );
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(err));
  return null;
}

export function verifyJwtToken(token: string, secret: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${headerB64}.${payloadB64}`);
    const expectedSignature = hmac.digest('base64url');
    if (signatureB64 !== expectedSignature) return null;

    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);
    if (payload.exp && Date.now() >= payload.exp * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getContextFromPayload(payload: Record<string, unknown>): McpUserContext {
  const role: string = typeof payload.role === 'string' ? payload.role : 'reader';
  let roles: string[];
  if (Array.isArray(payload.roles)) {
    roles = payload.roles.filter((r): r is string => typeof r === 'string');
  } else {
    roles = [role];
  }

  const id: string = typeof payload.sub === 'string' ? payload.sub
    : typeof payload.id === 'string' ? payload.id : 'unknown';
  const tenant: string = typeof payload.tenant === 'string' ? payload.tenant : 'default';
  const environment: string = typeof payload.environment === 'string'
    ? payload.environment : process.env.NODE_ENV || 'development';

  let scopes: string[];
  if (typeof payload.scope === 'string') {
    scopes = payload.scope.split(' ').map(s => s.trim()).filter(Boolean);
  } else if (Array.isArray(payload.scopes)) {
    scopes = payload.scopes.filter((s): s is string => typeof s === 'string');
  } else if (role === 'admin') {
    scopes = ['read', 'write', 'admin'];
  } else if (role === 'operator' || role === 'write') {
    scopes = ['read', 'write'];
  } else {
    scopes = ['read'];
  }

  return { id, role, roles, tenant, environment, scopes };
}
