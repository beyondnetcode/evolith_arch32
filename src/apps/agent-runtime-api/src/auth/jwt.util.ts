/**
 * JWT utilities — barrel re-export for backward compatibility.
 *
 * New code should import from the specific modules:
 * - jwt-types.ts        → type definitions
 * - jwt-encoding.util.ts → base64 encoding/decoding
 * - jwt-verifier.ts     → verification (Strategy pattern)
 * - jwt-signer.ts       → signing
 * - jwt-tenant.resolver.ts → tenant claim extraction
 *
 * This file exists only to avoid breaking existing imports.
 */

// Types
export type { JwtHeader, JwtPayload, JwtVerifyResult } from './jwt-types';

// Encoding
export { looksLikeJwt, decodeJwtPayload as decodeJwt } from './jwt-encoding.util';

// Verification (Strategy pattern)
export { Hs256Verifier, JwtVerifierRouter } from './jwt-verifier';
export type { IJwtVerifier } from './jwt-verifier';

// Signing
export { signHs256 } from './jwt-signer';

// Tenant resolution
export { extractTenantClaim } from './jwt-tenant.resolver';

// Legacy convenience function — delegates to router
import { JwtVerifierRouter } from './jwt-verifier';
import type { JwtVerifyResult } from './jwt-types';

const defaultRouter = new JwtVerifierRouter();

/**
 * Verify an HS256-signed JWT. Convenience wrapper around JwtVerifierRouter.
 * @deprecated Import JwtVerifierRouter directly for new code.
 */
export function verifyHs256(
  token: string,
  secret: string,
  now: number = Date.now(),
): JwtVerifyResult {
  return defaultRouter.verify(token, secret, now);
}
