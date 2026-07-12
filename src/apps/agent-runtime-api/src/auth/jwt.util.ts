/**
 * Minimal, dependency-free HS256 JWT helpers for the Agent Runtime service.
 *
 * The live multi-tenant JWT issuer (JWKS / asymmetric keys) is gated behind the
 * real deploy. For the verifiable slice we support symmetric HS256 verification
 * against a shared secret (`AGENT_RUNTIME_JWT_SECRET`), which is fully
 * deterministic and exercisable under jest without external infrastructure.
 *
 * Verification is fail-closed: a malformed token, an unsupported algorithm, a
 * bad signature, or an expired/not-yet-valid token all yield `{ ok: false }`.
 * The signature is compared in constant time.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export interface JwtHeader {
  alg?: string;
  typ?: string;
  kid?: string;
}

export interface JwtPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  [claim: string]: unknown;
}

export interface JwtVerifyResult {
  ok: boolean;
  payload?: JwtPayload;
  /** Machine-readable failure reason when `ok` is false. */
  reason?:
    | 'malformed'
    | 'unsupported-alg'
    | 'bad-signature'
    | 'expired'
    | 'not-yet-valid';
}

/**
 * Tenant claim names accepted, in priority order. The live issuer may emit any
 * of these; the first non-empty string wins.
 */
const TENANT_CLAIMS = ['tenant', 'tenantId', 'tenant_id', 'tid'] as const;

/** True when the token has the shape `header.payload.signature`. */
export function looksLikeJwt(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, 'base64');
}

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Decode a JWT WITHOUT verifying its signature. Returns null if malformed. */
export function decodeJwt(
  token: string,
): { header: JwtHeader; payload: JwtPayload } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(base64UrlDecode(parts[0]).toString('utf8')) as JwtHeader;
    const payload = JSON.parse(base64UrlDecode(parts[1]).toString('utf8')) as JwtPayload;
    return { header, payload };
  } catch {
    return null;
  }
}

/**
 * Verify an HS256-signed JWT against `secret`, checking signature + exp/nbf.
 * Fail-closed: any problem yields `{ ok: false, reason }`.
 */
export function verifyHs256(
  token: string,
  secret: string,
  now: number = Date.now(),
): JwtVerifyResult {
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };
  const [headerSeg, payloadSeg, signatureSeg] = parts;

  const decoded = decodeJwt(token);
  if (!decoded) return { ok: false, reason: 'malformed' };
  if (decoded.header.alg !== 'HS256') return { ok: false, reason: 'unsupported-alg' };

  const expected = createHmac('sha256', secret)
    .update(`${headerSeg}.${payloadSeg}`)
    .digest();
  const provided = base64UrlDecode(signatureSeg);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return { ok: false, reason: 'bad-signature' };
  }

  const nowSec = Math.floor(now / 1000);
  if (typeof decoded.payload.exp === 'number' && nowSec >= decoded.payload.exp) {
    return { ok: false, reason: 'expired' };
  }
  if (typeof decoded.payload.nbf === 'number' && nowSec < decoded.payload.nbf) {
    return { ok: false, reason: 'not-yet-valid' };
  }

  return { ok: true, payload: decoded.payload };
}

/**
 * Sign an HS256 JWT. Used by dev/test tooling to mint tokens; the production
 * issuer is gated infra and lives elsewhere.
 */
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
