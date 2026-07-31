import {
  DEFAULT_REQUEST_STATE_TTL_MS,
  computeRequestDigest,
  sealRequestState,
  verifyRequestState,
  __resetEphemeralStateSecret,
} from './mrtr-request-state';

/**
 * GT-582 — the sealed `requestState` is the only thing standing between "the
 * approval gate survived the removal of sessions" and "the approval gate is now
 * a client-supplied string". The specification says a server whose requestState
 * influences authorization MUST protect its integrity and MUST reject state that
 * fails verification, and SHOULD bind principal, expiry and originating request
 * so it cannot be replayed across users, time or calls. Each of those is a test
 * here — a bypass in any one of them is a bypass of the whole gate.
 */
describe('MRTR requestState (GT-582)', () => {
  const env = { EVOLITH_MCP_REQUEST_STATE_SECRET: 'unit-test-secret' } as unknown as NodeJS.ProcessEnv;
  const now = 1_800_000_000_000;

  const params = { name: 'evolith-scaffold', arguments: { repo: 'alpha', tenant: 'acme' } };
  const digest = computeRequestDigest('tools/call', params);

  const payload = {
    principal: 'user-1',
    tenant: 'acme',
    method: 'tools/call',
    requestDigest: digest,
    correlationId: 'evl-test',
    expiresAt: now + DEFAULT_REQUEST_STATE_TTL_MS,
  };
  const expected = { principal: 'user-1', tenant: 'acme', method: 'tools/call', requestDigest: digest };

  beforeEach(() => __resetEphemeralStateSecret());

  it('round-trips a sealed payload', () => {
    const state = sealRequestState(payload, env);
    const result = verifyRequestState(state, expected, { now, env });
    expect(result).toEqual({ ok: true, payload });
  });

  it('is opaque: the plaintext is not readable from the blob', () => {
    const state = sealRequestState(payload, env);
    expect(state).not.toContain('user-1');
    expect(state).not.toContain('acme');
    expect(state).not.toContain('evl-test');
    // Nor is it decodable by simply base64-decoding the middle segment.
    const decoded = Buffer.from(state.split('.')[2], 'base64url').toString('utf8');
    expect(decoded).not.toContain('principal');
  });

  it('rejects a tampered blob (AEAD tag check)', () => {
    const state = sealRequestState(payload, env);
    const parts = state.split('.');
    const sealed = Buffer.from(parts[2], 'base64url');
    sealed[0] ^= 0xff;
    parts[2] = sealed.toString('base64url');
    expect(verifyRequestState(parts.join('.'), expected, { now, env })).toEqual({ ok: false, reason: 'tampered' });
  });

  it('rejects a blob sealed under a different secret', () => {
    const state = sealRequestState(payload, { EVOLITH_MCP_REQUEST_STATE_SECRET: 'other' } as unknown as NodeJS.ProcessEnv);
    expect(verifyRequestState(state, expected, { now, env })).toEqual({ ok: false, reason: 'tampered' });
  });

  it('rejects state presented after its TTL lapses', () => {
    const state = sealRequestState(payload, env);
    const later = payload.expiresAt + 1;
    expect(verifyRequestState(state, expected, { now: later, env })).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects state presented by a different principal', () => {
    const state = sealRequestState(payload, env);
    expect(verifyRequestState(state, { ...expected, principal: 'user-2' }, { now, env }))
      .toEqual({ ok: false, reason: 'principal-mismatch' });
  });

  it('rejects state presented under a different tenant', () => {
    const state = sealRequestState(payload, env);
    expect(verifyRequestState(state, { ...expected, tenant: 'other-co' }, { now, env }))
      .toEqual({ ok: false, reason: 'principal-mismatch' });
  });

  it('rejects state replayed onto a different call', () => {
    const state = sealRequestState(payload, env);
    const otherDigest = computeRequestDigest('tools/call', { name: 'evolith-scaffold', arguments: { repo: 'BETA', tenant: 'acme' } });
    expect(verifyRequestState(state, { ...expected, requestDigest: otherDigest }, { now, env }))
      .toEqual({ ok: false, reason: 'request-mismatch' });
  });

  it('rejects state replayed onto a different method', () => {
    const state = sealRequestState(payload, env);
    expect(verifyRequestState(state, { ...expected, method: 'prompts/get' }, { now, env }))
      .toEqual({ ok: false, reason: 'request-mismatch' });
  });

  it.each([undefined, null, '', 'not-a-state', 'evmrtr1.a.b', 'evmrtr9.a.b.c'])(
    'rejects malformed input %p',
    (input) => {
      const result = verifyRequestState(input, expected, { now, env });
      expect(result.ok).toBe(false);
    },
  );

  describe('request digest', () => {
    it('ignores the fields a legitimate retry adds', () => {
      const retry = {
        name: 'evolith-scaffold',
        arguments: { repo: 'alpha', tenant: 'acme', apply: true, approvalToken: 'tok' },
      };
      expect(computeRequestDigest('tools/call', retry)).toBe(digest);
    });

    it('is insensitive to argument ordering', () => {
      const reordered = { name: 'evolith-scaffold', arguments: { tenant: 'acme', repo: 'alpha' } };
      expect(computeRequestDigest('tools/call', reordered)).toBe(digest);
    });

    it('changes when a bound argument changes', () => {
      const other = { name: 'evolith-scaffold', arguments: { repo: 'beta', tenant: 'acme' } };
      expect(computeRequestDigest('tools/call', other)).not.toBe(digest);
    });

    it('changes when the tool name changes', () => {
      const other = { name: 'evolith-satellite-create', arguments: { repo: 'alpha', tenant: 'acme' } };
      expect(computeRequestDigest('tools/call', other)).not.toBe(digest);
    });
  });
});
