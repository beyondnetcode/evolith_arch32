import * as crypto from 'node:crypto';

/**
 * GT-520 · EAG-15 / AC1 — OAuth 2.1 resource-server bearer validation.
 *
 * A GENERIC, IdP-agnostic validator for OAuth access tokens presented as
 * `Authorization: Bearer <jwt>` on the remote Streamable HTTP surface. It is
 * deliberately NOT wired to a single identity provider: the concrete IdP (and
 * whether it is one shared IdP or per-tenant) is an org decision tracked as
 * EAG-01 in the Tracker. Everything here works against ANY standards-compliant
 * OAuth 2.1 / OIDC issuer:
 *
 *   - asymmetric tokens (RS/PS/ES family) verified against the issuer's published
 *     JWKS (`EVOLITH_MCP_OAUTH_JWKS_URI`), keyed by the token header `kid`;
 *   - or symmetric tokens (HS*) verified against a shared secret
 *     (`EVOLITH_MCP_OAUTH_SECRET`) for IdPs/gateways that mint HMAC tokens;
 *   - issuer (`iss`), audience (`aud`), expiry (`exp`) and not-before (`nbf`)
 *     are all enforced, with a small configurable clock-skew tolerance.
 *
 * The verified claims map to the same {@link McpUserContext} shape the rest of
 * the server already threads through per-identity ABAC, so the identity used by
 * authorization comes from the cryptographically verified token — never from an
 * unauthenticated request header.
 */
export interface OAuthConfig {
  /** Expected `iss` claim (the OAuth/OIDC issuer). Required to enable OAuth. */
  issuer: string;
  /** Expected audience; when set, the token `aud` must contain it. */
  audience?: string;
  /** JWKS endpoint for asymmetric (RS/PS/ES family) signature verification. */
  jwksUri?: string;
  /** Shared secret for symmetric (HS*) token verification. */
  secret?: string;
  /** Allowed clock skew in seconds for exp/nbf checks (default 60). */
  clockToleranceSec?: number;
}

/**
 * Resolves the verification key for an asymmetric token. Given the token header
 * `kid` (may be undefined) and `alg`, returns a public key (KeyObject or PEM) or
 * `null` when no matching key is known. Injectable so tests need no network.
 */
export type JwksKeyResolver = (
  kid: string | undefined,
  alg: string,
) => Promise<crypto.KeyObject | string | null>;

/**
 * Build an {@link OAuthConfig} from environment variables, or `null` when OAuth
 * is not configured (in which case the server falls back to the existing
 * API-key / local-JWT path). OAuth is considered enabled only when an issuer AND
 * at least one verification source (JWKS URI or shared secret) are present.
 */
export function loadOAuthConfig(env: NodeJS.ProcessEnv): OAuthConfig | null {
  const issuer = env.EVOLITH_MCP_OAUTH_ISSUER?.trim();
  const jwksUri = env.EVOLITH_MCP_OAUTH_JWKS_URI?.trim();
  const secret = env.EVOLITH_MCP_OAUTH_SECRET?.trim();
  const audience = env.EVOLITH_MCP_OAUTH_AUDIENCE?.trim();
  if (!issuer || (!jwksUri && !secret)) return null;
  const tolRaw = env.EVOLITH_MCP_OAUTH_CLOCK_TOLERANCE_SEC;
  const clockToleranceSec = tolRaw ? parseInt(tolRaw, 10) : undefined;
  return {
    issuer,
    audience: audience || undefined,
    jwksUri: jwksUri || undefined,
    secret: secret || undefined,
    clockToleranceSec: Number.isFinite(clockToleranceSec as number) ? clockToleranceSec : undefined,
  };
}

interface Jwk {
  kid?: string;
  alg?: string;
  kty?: string;
  use?: string;
  [k: string]: unknown;
}

/**
 * Default JWKS resolver: fetches the issuer's JWKS document and converts the
 * matching JWK into a public {@link crypto.KeyObject}. Keys are cached in-memory
 * by `kid` with a TTL; a cache miss (e.g. key rotation) triggers one refetch.
 */
export function createJwksResolver(
  jwksUri: string,
  opts: { ttlMs?: number; fetchImpl?: typeof fetch } = {},
): JwksKeyResolver {
  const ttlMs = opts.ttlMs ?? 5 * 60 * 1000;
  const fetchImpl = opts.fetchImpl ?? fetch;
  let cache: { keys: Map<string, crypto.KeyObject>; fetchedAt: number } | null = null;

  async function refresh(): Promise<Map<string, crypto.KeyObject>> {
    const res = await fetchImpl(jwksUri);
    if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
    const doc = (await res.json()) as { keys?: Jwk[] };
    const keys = new Map<string, crypto.KeyObject>();
    for (const jwk of doc.keys ?? []) {
      try {
        const key = crypto.createPublicKey({ key: jwk, format: 'jwk' } as crypto.JsonWebKeyInput);
        // A JWK without a kid is still usable when it is the only key.
        keys.set(jwk.kid ?? '', key);
      } catch {
        // Skip malformed keys rather than failing the whole set.
      }
    }
    cache = { keys, fetchedAt: Date.now() };
    return keys;
  }

  return async (kid: string | undefined): Promise<crypto.KeyObject | null> => {
    const lookup = (keys: Map<string, crypto.KeyObject>): crypto.KeyObject | null => {
      if (kid && keys.has(kid)) return keys.get(kid)!;
      // No kid on the token (or unmatched): fall back to the sole key if unambiguous.
      if (!kid && keys.size === 1) return [...keys.values()][0];
      if (!kid && keys.has('')) return keys.get('')!;
      return null;
    };

    const fresh = cache && Date.now() - cache.fetchedAt < ttlMs;
    if (fresh) {
      const hit = lookup(cache!.keys);
      if (hit) return hit;
    }
    const keys = await refresh();
    return lookup(keys);
  };
}

function verifyAsymmetric(
  alg: string,
  signingInput: string,
  signature: Buffer,
  rawKey: crypto.KeyObject | string,
): boolean {
  const data = Buffer.from(signingInput);
  try {
    const key = typeof rawKey === 'string' ? crypto.createPublicKey(rawKey) : rawKey;
    switch (alg) {
      case 'RS256':
        return crypto.verify('RSA-SHA256', data, key, signature);
      case 'RS384':
        return crypto.verify('RSA-SHA384', data, key, signature);
      case 'RS512':
        return crypto.verify('RSA-SHA512', data, key, signature);
      case 'PS256':
        return crypto.verify(
          'sha256',
          data,
          { key, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST },
          signature,
        );
      case 'PS384':
        return crypto.verify(
          'sha384',
          data,
          { key, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST },
          signature,
        );
      case 'PS512':
        return crypto.verify(
          'sha512',
          data,
          { key, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST },
          signature,
        );
      case 'ES256':
        return crypto.verify('sha256', data, { key, dsaEncoding: 'ieee-p1363' }, signature);
      case 'ES384':
        return crypto.verify('sha384', data, { key, dsaEncoding: 'ieee-p1363' }, signature);
      case 'ES512':
        return crypto.verify('sha512', data, { key, dsaEncoding: 'ieee-p1363' }, signature);
      default:
        return false;
    }
  } catch {
    return false;
  }
}

function verifySymmetric(alg: string, signingInput: string, signature: Buffer, secret: string): boolean {
  const hashAlg = alg === 'HS256' ? 'sha256' : alg === 'HS384' ? 'sha384' : alg === 'HS512' ? 'sha512' : '';
  if (!hashAlg) return false;
  const expected = crypto.createHmac(hashAlg, secret).update(signingInput).digest();
  return expected.length === signature.length && crypto.timingSafeEqual(expected, signature);
}

/**
 * Verify an OAuth 2.1 access token (compact JWS). Returns the decoded claim set
 * when the signature and all registered claims (iss/aud/exp/nbf) check out, or
 * `null` on any failure. Never throws.
 *
 * @param keyResolver overrides the config's JWKS-derived resolver (for tests /
 *        pre-warmed keys). Ignored for symmetric (HS*) tokens.
 */
export async function verifyOAuthToken(
  token: string,
  config: OAuthConfig,
  keyResolver?: JwksKeyResolver,
): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;

    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8')) as {
      alg?: string;
      kid?: string;
    };
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as Record<string, unknown>;
    const alg = typeof header.alg === 'string' ? header.alg : '';
    if (!alg || alg === 'none') return null;

    const signingInput = `${headerB64}.${payloadB64}`;
    const signature = Buffer.from(sigB64, 'base64url');

    let verified = false;
    if (alg.startsWith('HS')) {
      if (!config.secret) return null;
      verified = verifySymmetric(alg, signingInput, signature, config.secret);
    } else {
      const resolver =
        keyResolver ?? (config.jwksUri ? createJwksResolver(config.jwksUri) : undefined);
      if (!resolver) return null;
      const key = await resolver(header.kid, alg);
      if (!key) return null;
      verified = verifyAsymmetric(alg, signingInput, signature, key);
    }
    if (!verified) return null;

    // Registered-claim checks (RFC 7519 §4.1).
    const now = Math.floor(Date.now() / 1000);
    const skew = config.clockToleranceSec ?? 60;

    if (typeof payload.exp === 'number' && now > payload.exp + skew) return null;
    if (typeof payload.nbf === 'number' && now + skew < payload.nbf) return null;
    if (config.issuer && payload.iss !== config.issuer) return null;
    if (config.audience) {
      const aud = payload.aud;
      const ok = Array.isArray(aud) ? aud.includes(config.audience) : aud === config.audience;
      if (!ok) return null;
    }
    return payload;
  } catch {
    return null;
  }
}
