/**
 * JWT Signing — HS256 only (dev/test tooling).
 * Production issuer is gated infrastructure and lives elsewhere.
 */

import { createHmac } from 'node:crypto';
import type { JwtHeader, JwtPayload } from './jwt-types';
import { base64UrlEncode } from './jwt-encoding.util';

export function signHs256(
  payload: JwtPayload,
  secret: string,
  header: JwtHeader = {},
): string {
  const fullHeader = { alg: 'HS256', typ: 'JWT', ...header };
  const headerSeg = base64UrlEncode(JSON.stringify(fullHeader));
  const payloadSeg = base64UrlEncode(JSON.stringify(payload));
  const signatureSeg = base64UrlEncode(
    createHmac('sha256', secret).update(`${headerSeg}.${payloadSeg}`).digest(),
  );
  return `${headerSeg}.${payloadSeg}.${signatureSeg}`;
}
