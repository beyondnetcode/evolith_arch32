/**
 * JWT Verification — Strategy Pattern.
 *
 * IJwtVerifier is the strategy interface. Concrete implementations handle
 * specific algorithms (HS256, RS256, etc.). The router selects the right
 * verifier based on the token's `alg` header.
 *
 * This follows OCP: adding RS256 support requires a new class, not
 * modifying verifyHs256().
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { JwtPayload, JwtVerifyResult } from './jwt-types';
import { base64UrlDecode, decodeJwtPayload } from './jwt-encoding.util';

/** Strategy interface for JWT verification algorithms. */
export interface IJwtVerifier {
  readonly algorithm: string;
  verify(token: string, key: string, now?: number): JwtVerifyResult;
}

/** HS256 (HMAC-SHA256) verifier — symmetric key. */
export class Hs256Verifier implements IJwtVerifier {
  readonly algorithm = 'HS256';

  verify(token: string, secret: string, now: number = Date.now()): JwtVerifyResult {
    const parts = token.split('.');
    if (parts.length !== 3) return { ok: false, reason: 'malformed' };
    const [headerSeg, payloadSeg, signatureSeg] = parts;

    const decoded = decodeJwtPayload(token);
    if (!decoded) return { ok: false, reason: 'malformed' };
    if (decoded.header.alg !== this.algorithm) return { ok: false, reason: 'unsupported-alg' };

    const expected = createHmac('sha256', secret)
      .update(`${headerSeg}.${payloadSeg}`)
      .digest();
    const provided = base64UrlDecode(signatureSeg);
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
      return { ok: false, reason: 'bad-signature' };
    }

    const nowSec = Math.floor(now / 1000);
    const payload = decoded.payload as JwtPayload;
    if (typeof payload.exp === 'number' && nowSec >= payload.exp) {
      return { ok: false, reason: 'expired' };
    }
    if (typeof payload.nbf === 'number' && nowSec < payload.nbf) {
      return { ok: false, reason: 'not-yet-valid' };
    }

    return { ok: true, payload };
  }
}

/**
 * Selects the correct verifier based on the token's `alg` header.
 * Follows OCP: new algorithms are added by registering a new verifier,
 * not by modifying this router.
 */
export class JwtVerifierRouter {
  private readonly verifiers = new Map<string, IJwtVerifier>();

  constructor(verifiers: IJwtVerifier[] = [new Hs256Verifier()]) {
    for (const v of verifiers) {
      this.verifiers.set(v.algorithm, v);
    }
  }

  verify(token: string, key: string, now?: number): JwtVerifyResult {
    const decoded = decodeJwtPayload(token);
    if (!decoded) return { ok: false, reason: 'malformed' };

    const alg = decoded.header.alg as string | undefined;
    if (!alg) return { ok: false, reason: 'unsupported-alg' };

    const verifier = this.verifiers.get(alg);
    if (!verifier) return { ok: false, reason: 'unsupported-alg' };

    return verifier.verify(token, key, now);
  }
}
