/**
 * HTTP response helpers for MCP authentication.
 * Single responsibility: writing 401 responses.
 */

import type * as http from 'node:http';
import { ErrorCodes } from '../common/errors';
import { failure, generateCorrelationId } from '../common/envelopes';

export function writeUnauthorized(res: http.ServerResponse, message: string): null {
  const correlationId = generateCorrelationId();
  const err = failure(ErrorCodes.UNAUTHORIZED, message, { correlationId, tool: 'auth', durationMs: 0 });
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(err));
  return null;
}
