import * as crypto from 'node:crypto';
import {
  loadOAuthConfig,
  verifyOAuthToken,
  createJwksResolver,
  type OAuthConfig,
  type JwksKeyResolver,
} from './oauth-resource-server';

// --- test helpers ---------------------------------------------------------

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

/** Sign a JWT with an RSA (RS256) or EC (ES256) private key. */
function signJwt(
  privateKey: crypto.KeyObject,
  alg: 'RS256' | 'ES256' | 'HS256',
  payload: Record<string, unknown>,
  kid = 'k1',
  secret?: string,
): string {
  const header = { alg, typ: 'JWT', kid };
  const signingInput = `${b64url(header)}.${b64url(payload)}`;
  let sig: Buffer;
  if (alg === 'HS256') {
    sig = crypto.createHmac('sha256', secret!).update(signingInput).digest();
  } else if (alg === 'ES256') {
    sig = crypto.sign('sha256', Buffer.from(signingInput), { key: privateKey, dsaEncoding: 'ieee-p1363' });
  } else {
    sig = crypto.sign('RSA-SHA256', Buffer.from(signingInput), privateKey);
  }
  return `${signingInput}.${sig.toString('base64url')}`;
}

const nowSec = (): number => Math.floor(Date.now() / 1000);

describe('loadOAuthConfig', () => {
  it('returns null when no issuer is set', () => {
    expect(loadOAuthConfig({ EVOLITH_MCP_OAUTH_JWKS_URI: 'https://idp/jwks' } as NodeJS.ProcessEnv)).toBeNull();
  });

  it('returns null when issuer is set but neither JWKS nor secret is', () => {
    expect(loadOAuthConfig({ EVOLITH_MCP_OAUTH_ISSUER: 'https://idp' } as NodeJS.ProcessEnv)).toBeNull();
  });

  it('enables OAuth with issuer + JWKS', () => {
    const cfg = loadOAuthConfig({
      EVOLITH_MCP_OAUTH_ISSUER: 'https://idp',
      EVOLITH_MCP_OAUTH_JWKS_URI: 'https://idp/jwks',
      EVOLITH_MCP_OAUTH_AUDIENCE: 'evolith-mcp',
    } as NodeJS.ProcessEnv);
    expect(cfg).toEqual({
      issuer: 'https://idp',
      audience: 'evolith-mcp',
      jwksUri: 'https://idp/jwks',
      secret: undefined,
      clockToleranceSec: undefined,
    });
  });

  it('enables OAuth with issuer + shared secret (HS)', () => {
    const cfg = loadOAuthConfig({
      EVOLITH_MCP_OAUTH_ISSUER: 'https://idp',
      EVOLITH_MCP_OAUTH_SECRET: 's3cret',
    } as NodeJS.ProcessEnv);
    expect(cfg?.secret).toBe('s3cret');
    expect(cfg?.issuer).toBe('https://idp');
  });
});

describe('verifyOAuthToken — asymmetric (RS256 via injected JWKS resolver)', () => {
  let publicKey: crypto.KeyObject;
  let privateKey: crypto.KeyObject;
  let resolver: JwksKeyResolver;
  const config: OAuthConfig = {
    issuer: 'https://idp.example.com',
    audience: 'evolith-mcp',
  };

  beforeAll(() => {
    const pair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    publicKey = pair.publicKey;
    privateKey = pair.privateKey;
    resolver = async (kid) => (kid === 'k1' ? publicKey : null);
  });

  it('accepts a valid token and returns the claim set', async () => {
    const token = signJwt(privateKey, 'RS256', {
      sub: 'agent-42',
      iss: config.issuer,
      aud: config.audience,
      role: 'operator',
      tenant: 'acme',
      scope: 'read write',
      exp: nowSec() + 300,
    });
    const payload = await verifyOAuthToken(token, config, resolver);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe('agent-42');
    expect(payload?.tenant).toBe('acme');
  });

  it('rejects a token with a tampered payload (signature mismatch)', async () => {
    const token = signJwt(privateKey, 'RS256', {
      sub: 'agent-42',
      iss: config.issuer,
      aud: config.audience,
      exp: nowSec() + 300,
    });
    const [h, , s] = token.split('.');
    const forged = `${h}.${b64url({ sub: 'root', iss: config.issuer, aud: config.audience, exp: nowSec() + 300 })}.${s}`;
    expect(await verifyOAuthToken(forged, config, resolver)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = signJwt(privateKey, 'RS256', {
      sub: 'agent-42',
      iss: config.issuer,
      aud: config.audience,
      exp: nowSec() - 120,
    });
    expect(await verifyOAuthToken(token, config, resolver)).toBeNull();
  });

  it('rejects a wrong issuer', async () => {
    const token = signJwt(privateKey, 'RS256', {
      sub: 'agent-42',
      iss: 'https://evil.example.com',
      aud: config.audience,
      exp: nowSec() + 300,
    });
    expect(await verifyOAuthToken(token, config, resolver)).toBeNull();
  });

  it('rejects a wrong audience', async () => {
    const token = signJwt(privateKey, 'RS256', {
      sub: 'agent-42',
      iss: config.issuer,
      aud: 'some-other-api',
      exp: nowSec() + 300,
    });
    expect(await verifyOAuthToken(token, config, resolver)).toBeNull();
  });

  it('accepts an array audience that contains the expected value', async () => {
    const token = signJwt(privateKey, 'RS256', {
      sub: 'agent-42',
      iss: config.issuer,
      aud: ['other', config.audience],
      exp: nowSec() + 300,
    });
    expect(await verifyOAuthToken(token, config, resolver)).not.toBeNull();
  });

  it('rejects when the resolver has no key for the kid', async () => {
    const token = signJwt(privateKey, 'RS256', { sub: 'x', iss: config.issuer, aud: config.audience }, 'unknown-kid');
    expect(await verifyOAuthToken(token, config, resolver)).toBeNull();
  });

  it('rejects the alg=none downgrade', async () => {
    const header = { alg: 'none', typ: 'JWT' };
    const payload = { sub: 'x', iss: config.issuer, aud: config.audience };
    const token = `${b64url(header)}.${b64url(payload)}.`;
    expect(await verifyOAuthToken(token, config, resolver)).toBeNull();
  });
});

describe('verifyOAuthToken — symmetric (HS256 shared secret)', () => {
  const config: OAuthConfig = { issuer: 'https://idp', audience: 'evolith-mcp', secret: 'top-secret' };

  it('accepts a valid HS256 token', async () => {
    const token = signJwt({} as crypto.KeyObject, 'HS256', {
      sub: 'svc',
      iss: config.issuer,
      aud: config.audience,
      exp: nowSec() + 300,
    }, 'k1', config.secret);
    const payload = await verifyOAuthToken(token, config);
    expect(payload?.sub).toBe('svc');
  });

  it('rejects an HS256 token signed with the wrong secret', async () => {
    const token = signJwt({} as crypto.KeyObject, 'HS256', {
      sub: 'svc',
      iss: config.issuer,
      aud: config.audience,
      exp: nowSec() + 300,
    }, 'k1', 'wrong-secret');
    expect(await verifyOAuthToken(token, config)).toBeNull();
  });
});

describe('createJwksResolver', () => {
  it('fetches the JWKS document and resolves the key by kid', async () => {
    const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'kid-a', use: 'sig', alg: 'RS256' };
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [jwk] }),
    }) as unknown as typeof fetch;

    const resolver = createJwksResolver('https://idp/jwks', { fetchImpl });
    const key = await resolver('kid-a', 'RS256');
    expect(key).not.toBeNull();
    // Second lookup is served from cache (no second fetch).
    await resolver('kid-a', 'RS256');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('returns null when the JWKS fetch fails', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    const resolver = createJwksResolver('https://idp/jwks', { fetchImpl });
    // verifyOAuthToken swallows the thrown fetch error and yields null.
    await expect(resolver('kid-a', 'RS256')).rejects.toThrow();
  });
});
