import * as crypto from 'node:crypto';
import * as http from 'node:http';
import { authenticateHttpRequest } from './mcp-server-auth';
import type { OAuthConfig, JwksKeyResolver } from './oauth-resource-server';

// --- test doubles ---------------------------------------------------------

function fakeReq(headers: Record<string, string> = {}): http.IncomingMessage {
  return { headers } as unknown as http.IncomingMessage;
}

interface CapturedRes extends http.ServerResponse {
  _status?: number;
  _body?: string;
}

function fakeRes(): CapturedRes {
  const res: Partial<CapturedRes> = { headersSent: false };
  res.writeHead = ((status: number) => {
    res._status = status;
    (res as CapturedRes).headersSent = true;
    return res as CapturedRes;
  }) as http.ServerResponse['writeHead'];
  res.end = ((body?: string) => {
    if (body) res._body = body;
    return res as CapturedRes;
  }) as http.ServerResponse['end'];
  return res as CapturedRes;
}

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function signRs256(privateKey: crypto.KeyObject, payload: Record<string, unknown>, kid = 'k1'): string {
  const signingInput = `${b64url({ alg: 'RS256', typ: 'JWT', kid })}.${b64url(payload)}`;
  const sig = crypto.sign('RSA-SHA256', Buffer.from(signingInput), privateKey).toString('base64url');
  return `${signingInput}.${sig}`;
}

const nowSec = (): number => Math.floor(Date.now() / 1000);

// --- GT-520 · EAG-15 / AC1 -------------------------------------------------
// Remote MCP (Streamable HTTP) requires OAuth: the identity that reaches ABAC
// comes from a verified bearer token, not a header.

describe('authenticateHttpRequest — OAuth resource-server (GT-520 AC1)', () => {
  let publicKey: crypto.KeyObject;
  let privateKey: crypto.KeyObject;
  let resolver: JwksKeyResolver;
  const oauthConfig: OAuthConfig = { issuer: 'https://idp.example.com', audience: 'evolith-mcp' };
  const OLD_ENV = { ...process.env };

  beforeAll(() => {
    const pair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    publicKey = pair.publicKey;
    privateKey = pair.privateKey;
    resolver = async (kid) => (kid === 'k1' ? publicKey : null);
  });

  beforeEach(() => {
    // OAuth is the ONLY configured credential source: no API key, no local JWT,
    // no dev bypass. This is the hardened remote posture.
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('rejects a remote request with no bearer (401)', async () => {
    const res = fakeRes();
    const ctx = await authenticateHttpRequest(fakeReq(), res, undefined, false, oauthConfig, resolver);
    expect(ctx).toBeNull();
    expect(res._status).toBe(401);
  });

  it('rejects an invalid/garbage bearer (401)', async () => {
    const res = fakeRes();
    const ctx = await authenticateHttpRequest(
      fakeReq({ authorization: 'Bearer not-a-jwt' }),
      res,
      undefined,
      false,
      oauthConfig,
      resolver,
    );
    expect(ctx).toBeNull();
    expect(res._status).toBe(401);
  });

  it('rejects an expired bearer (401)', async () => {
    const token = signRs256(privateKey, {
      sub: 'agent-1',
      iss: oauthConfig.issuer,
      aud: oauthConfig.audience,
      exp: nowSec() - 300,
    });
    const res = fakeRes();
    const ctx = await authenticateHttpRequest(
      fakeReq({ authorization: `Bearer ${token}` }),
      res,
      undefined,
      false,
      oauthConfig,
      resolver,
    );
    expect(ctx).toBeNull();
    expect(res._status).toBe(401);
  });

  it('accepts a valid bearer and threads the token identity into the ABAC context', async () => {
    const token = signRs256(privateKey, {
      sub: 'agent-42',
      iss: oauthConfig.issuer,
      aud: oauthConfig.audience,
      role: 'operator',
      tenant: 'acme',
      scope: 'read write',
      exp: nowSec() + 300,
    });
    const res = fakeRes();
    const ctx = await authenticateHttpRequest(
      fakeReq({ authorization: `Bearer ${token}` }),
      res,
      undefined,
      false,
      oauthConfig,
      resolver,
    );
    expect(res._status).toBeUndefined();
    expect(ctx).not.toBeNull();
    // Identity is derived from the VERIFIED token claims (not any request header).
    expect(ctx).toMatchObject({
      id: 'agent-42',
      role: 'operator',
      tenant: 'acme',
      scopes: ['read', 'write'],
    });
  });

  it('does not treat a header-supplied identity as authenticated (no bearer, spoofed headers → 401)', async () => {
    const res = fakeRes();
    const ctx = await authenticateHttpRequest(
      // An attacker setting role/tenant headers must NOT become an identity.
      fakeReq({ 'x-role': 'admin', 'x-tenant': 'victim', 'x-user-id': 'root' }),
      res,
      undefined,
      false,
      oauthConfig,
      resolver,
    );
    expect(ctx).toBeNull();
    expect(res._status).toBe(401);
  });
});

describe('authenticateHttpRequest — local/dev path preserved (OAuth off)', () => {
  const OLD_ENV = { ...process.env };
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('accepts the shared API key via Bearer when OAuth is not configured', async () => {
    process.env.NODE_ENV = 'production';
    const res = fakeRes();
    const ctx = await authenticateHttpRequest(
      fakeReq({ authorization: 'Bearer super-secret-key' }),
      res,
      'super-secret-key',
      false,
      null,
    );
    expect(ctx).not.toBeNull();
    expect(ctx?.role).toBe('admin');
  });

  it('accepts the shared API key even when OAuth IS configured (back-compat)', async () => {
    process.env.NODE_ENV = 'production';
    const res = fakeRes();
    const ctx = await authenticateHttpRequest(
      fakeReq({ 'x-api-key': 'super-secret-key' }),
      res,
      'super-secret-key',
      false,
      { issuer: 'https://idp', secret: 'unused-here' },
    );
    expect(ctx).not.toBeNull();
    expect(ctx?.role).toBe('admin');
  });

  it('rejects a bad API key (401) when OAuth is off', async () => {
    process.env.NODE_ENV = 'production';
    const res = fakeRes();
    const ctx = await authenticateHttpRequest(
      fakeReq({ authorization: 'Bearer wrong' }),
      res,
      'super-secret-key',
      false,
      null,
    );
    expect(ctx).toBeNull();
    expect(res._status).toBe(401);
  });
});
