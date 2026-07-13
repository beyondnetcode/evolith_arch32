import {
  decodeJwt,
  extractTenantClaim,
  looksLikeJwt,
  signHs256,
  verifyHs256,
} from './jwt.util';

describe('jwt.util (HS256, GT-439)', () => {
  const secret = 'test-shared-secret';

  it('signs and verifies a round-trip token', () => {
    const token = signHs256({ sub: 'user-1', tenant: 'tenant-a' }, secret);
    expect(looksLikeJwt(token)).toBe(true);

    const result = verifyHs256(token, secret);
    expect(result.ok).toBe(true);
    expect(result.payload?.sub).toBe('user-1');
    expect(extractTenantClaim(result.payload!)).toBe('tenant-a');
  });

  it('rejects a token signed with a different secret (bad signature)', () => {
    const token = signHs256({ tenant: 'tenant-a' }, secret);
    const result = verifyHs256(token, 'wrong-secret');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('bad-signature');
  });

  it('rejects a tampered payload', () => {
    const token = signHs256({ tenant: 'tenant-a' }, secret);
    const [h, , s] = token.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ tenant: 'tenant-b' }))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const tampered = `${h}.${forgedPayload}.${s}`;
    expect(verifyHs256(tampered, secret).ok).toBe(false);
  });

  it('rejects an expired token', () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    const token = signHs256({ tenant: 'tenant-a', exp: past }, secret);
    const result = verifyHs256(token, secret);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('expired');
  });

  it('rejects a not-yet-valid token (nbf in the future)', () => {
    const future = Math.floor(Date.now() / 1000) + 300;
    const token = signHs256({ tenant: 'tenant-a', nbf: future }, secret);
    const result = verifyHs256(token, secret);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('not-yet-valid');
  });

  it('rejects an unsupported algorithm', () => {
    const token = signHs256({ tenant: 'tenant-a' }, secret, { alg: 'none' });
    const result = verifyHs256(token, secret);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('unsupported-alg');
  });

  it('rejects malformed tokens', () => {
    expect(verifyHs256('not-a-jwt', secret).reason).toBe('malformed');
    expect(looksLikeJwt('a.b')).toBe(false);
    expect(decodeJwt('a.b')).toBeNull();
  });

  it('extracts tenant from alternate claim names in priority order', () => {
    expect(extractTenantClaim({ tenant: 't1' })).toBe('t1');
    expect(extractTenantClaim({ tenantId: 't2' })).toBe('t2');
    expect(extractTenantClaim({ tenant_id: 't3' })).toBe('t3');
    expect(extractTenantClaim({ tid: 't4' })).toBe('t4');
    // priority: `tenant` wins over the others
    expect(extractTenantClaim({ tid: 't4', tenant: 't1' })).toBe('t1');
  });

  it('returns undefined when no tenant claim is present or it is empty', () => {
    expect(extractTenantClaim({ sub: 'user-1' })).toBeUndefined();
    expect(extractTenantClaim({ tenant: '   ' })).toBeUndefined();
  });
});
