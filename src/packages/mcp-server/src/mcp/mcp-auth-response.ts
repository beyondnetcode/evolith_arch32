/**
 * HTTP response helpers for MCP authentication.
 * Single responsibility: writing 401 responses.
 */

import type * as http from 'node:http';
import { ErrorCodes } from '../common/errors';
import { failure, generateCorrelationId } from '../common/envelopes';

/**
 * GT-582 — a 401 carries the `WWW-Authenticate` challenge when this server is an
 * OAuth-protected resource. It is the FIRST of the two discovery mechanisms the
 * 2026-07-28 authorization spec requires ("include the resource metadata URL in
 * the `WWW-Authenticate` header under `resource_metadata` when returning 401"),
 * and the one clients must prefer over probing well-known URIs. Omitted when the
 * server is on the API-key path, where there is no authorization server to point
 * a client at.
 */
export function writeUnauthorized(res: http.ServerResponse, message: string, challenge?: string): null {
  const correlationId = generateCorrelationId();
  const err = failure(ErrorCodes.UNAUTHORIZED, message, { correlationId, tool: 'auth', durationMs: 0 });
  res.writeHead(401, {
    'Content-Type': 'application/json',
    ...(challenge ? { 'WWW-Authenticate': challenge } : {}),
  });
  res.end(JSON.stringify(err));
  return null;
}
