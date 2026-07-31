/**
 * MCP HTTP Authentication — Orchestrator.
 *
 * Routes authentication through a chain: OAuth → API Key → JWT → Dev Bypass.
 * Delegates to focused modules:
 * - mcp-auth-crypto.ts      → constant-time key comparison
 * - mcp-auth-contexts.ts    → pre-built user contexts
 * - mcp-auth-response.ts    → 401 response helper
 * - oauth-resource-server.ts → OAuth 2.1 token verification
 */

import * as http from 'node:http';
import * as crypto from 'node:crypto';
import type { McpUserContext } from './mcp-user-context';
import { verifyOAuthToken, type OAuthConfig, type JwksKeyResolver } from './oauth-resource-server';
import { safeKeyEqual } from './mcp-auth-crypto';
import { ADMIN_CONTEXT, READER_CONTEXT } from './mcp-auth-contexts';
import { writeUnauthorized } from './mcp-auth-response';

/**
 * GT-520 · EAG-15 / AC1 — remote Streamable HTTP authentication entry point.
 *
 * Order of precedence:
 *  1. OAuth 2.1 bearer token (when configured)
 *  2. Shared API key (Bearer or x-api-key header)
 *  3. Local HS256 JWT
 *  4. Dev allowNoAuth bypass (reader role only)
 */
export async function authenticateHttpRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  apiKey: string | undefined,
  allowNoAuth = false,
  oauthConfig?: OAuthConfig | null,
  keyResolver?: JwksKeyResolver,
  /** GT-582 — `WWW-Authenticate` challenge attached to any 401 this raises. */
  challenge?: string,
): Promise<McpUserContext | null> {
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  // 1. OAuth path
  if (oauthConfig && bearerToken && !safeKeyEqual(bearerToken, apiKey)) {
    const payload = await verifyOAuthToken(bearerToken, oauthConfig, keyResolver);
    if (payload) return getContextFromPayload(payload);

    const hasLocalCredential = !!apiKey || !!process.env.JWT_SECRET || allowNoAuth;
    if (!hasLocalCredential) {
      return writeUnauthorized(res, 'Invalid or expired OAuth bearer token', challenge);
    }
  }

  // 2-4. Local path
  return validateAuth(req, res, apiKey, allowNoAuth, challenge);
}

export function validateAuth(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  apiKey: string | undefined,
  allowNoAuth = false,
  challenge?: string,
): McpUserContext | null {
  const env = process.env.NODE_ENV || 'production';

  // No API key configured
  if (!apiKey) {
    if (env === 'production' || !allowNoAuth) {
      return writeUnauthorized(res, 'MCP server requires an API key. Set EVOLITH_API_KEY or --api-key.', challenge);
    }
    return { ...READER_CONTEXT, environment: env };
  }

  // API key validation
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const apiKeyHeader = req.headers['x-api-key'] as string | undefined;

  if (safeKeyEqual(bearerToken, apiKey) || safeKeyEqual(apiKeyHeader, apiKey)) {
    return { ...ADMIN_CONTEXT, environment: process.env.NODE_ENV || 'development' };
  }

  // JWT fallback
  const jwtSecret = process.env.JWT_SECRET;
  if (bearerToken && jwtSecret) { // codeql[js/user-controlled-val-in-sensitive-action]
    const payload = verifyJwtToken(bearerToken, jwtSecret);
    if (payload) return getContextFromPayload(payload);
  }

  return writeUnauthorized(res, 'Invalid or missing API key or JWT token', challenge);
}

export function verifyJwtToken(token: string, secret: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${headerB64}.${payloadB64}`);
    const expectedSignature = hmac.digest('base64url');

    // Constant-time comparison to prevent timing side-channel (CWE-208)
    const sigBuf = Buffer.from(signatureB64, 'base64url');
    const expectedBuf = Buffer.from(expectedSignature, 'base64url');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

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
