import * as http from 'node:http';
import * as crypto from 'node:crypto';
import { ErrorCodes } from '../common/errors';
import { failure, generateCorrelationId } from '../common/envelopes';
import type { McpUserContext } from './mcp-user-context';

const ADMIN_CONTEXT: McpUserContext = Object.freeze({
  id: 'admin-api-key',
  role: 'admin',
  roles: ['admin'],
  tenant: 'default',
  environment: process.env.NODE_ENV || 'development',
  scopes: ['read', 'write', 'admin'],
}) as McpUserContext;

export function validateAuth(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  apiKey: string | undefined,
): McpUserContext | null {
  if (!apiKey) {
    return { ...ADMIN_CONTEXT, environment: process.env.NODE_ENV || 'development' };
  }

  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const apiKeyHeader = req.headers['x-api-key'] as string | undefined;

  if (bearerToken === apiKey || apiKeyHeader === apiKey) {
    return { ...ADMIN_CONTEXT, environment: process.env.NODE_ENV || 'development' };
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (bearerToken && jwtSecret) {
    const payload = verifyJwtToken(bearerToken, jwtSecret);
    if (payload) return getContextFromPayload(payload);
  }

  const correlationId = generateCorrelationId();
  const env = failure(
    ErrorCodes.UNAUTHORIZED,
    'Invalid or missing API key or JWT token',
    { correlationId, tool: 'auth', durationMs: 0 },
  );
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(env));
  return null;
}

export function verifyJwtToken(token: string, secret: string): any {
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

export function getContextFromPayload(payload: any): McpUserContext {
  const role = payload.role || 'reader';
  let roles = payload.roles;
  if (!roles) roles = [role];
  else if (!Array.isArray(roles)) roles = [roles];

  const id = payload.sub || payload.id || 'unknown';
  const tenant = payload.tenant || 'default';
  const environment = payload.environment || process.env.NODE_ENV || 'development';

  let scopes: string[];
  if (typeof payload.scope === 'string') {
    scopes = payload.scope.split(' ').map((s: string) => s.trim()).filter(Boolean);
  } else if (Array.isArray(payload.scopes)) {
    scopes = payload.scopes;
  } else if (role === 'admin') {
    scopes = ['read', 'write', 'admin'];
  } else if (role === 'operator' || role === 'write') {
    scopes = ['read', 'write'];
  } else {
    scopes = ['read'];
  }

  return { id, role, roles, tenant, environment, scopes };
}
