/**
 * GT-679 — the grant, at the unit level.
 *
 * The dispatch spec proves the gate refuses a made-up string end to end. These
 * cases pin the properties that make that true and that a refactor could quietly
 * lose: domain separation from the request state, argument binding, expiry,
 * single use, and the ordering rule that a rejected grant must not burn.
 */

import { computeRequestDigest, sealRequestState, __resetEphemeralStateSecret } from './mrtr-request-state';
import {
  InMemoryGrantRedemptionStore,
  issueApprovalGrant,
  issueGrantForCall,
  verifyApprovalGrant,
} from './approval-grant';

const env = { EVOLITH_MCP_REQUEST_STATE_SECRET: 'unit-test-secret-value' } as NodeJS.ProcessEnv;

const CALL = {
  approver: 'alice@example.com',
  principal: 'agent-7',
  tenant: 'acme',
  tool: 'evolith-write-file',
  args: { path: 'README.md', content: 'hello' },
};

const expected = {
  principal: CALL.principal,
  tenant: CALL.tenant,
  tool: CALL.tool,
  requestDigest: computeRequestDigest('tools/call', { name: CALL.tool, arguments: CALL.args }),
};

describe('approval grant · GT-679', () => {
  beforeEach(() => __resetEphemeralStateSecret());

  it('a grant the server issued for this call verifies', () => {
    const { token, payload } = issueGrantForCall(CALL, env);
    const result = verifyApprovalGrant(token, expected, { env });

    expect(result.ok).toBe(true);
    expect(result.ok && result.payload.approver).toBe('alice@example.com');
    expect(payload.expiresAt).toBeGreaterThan(payload.issuedAt);
  });

  it('a string is not a grant, whatever it says', () => {
    for (const candidate of ['', '   ', 'approved', 'evgrant1.aaa.bbb.ccc', 42, null, undefined]) {
      const result = verifyApprovalGrant(candidate, expected, { env });
      expect(result.ok).toBe(false);
    }
  });

  /**
   * The property the HKDF `info` string exists for. Both blobs are sealed from
   * the same secret; if they shared a key, a client holding a `requestState` —
   * which the server HANDS IT — could present it as an approval.
   */
  it('a sealed requestState cannot be presented as an approval grant', () => {
    const state = sealRequestState({
      principal: CALL.principal,
      tenant: CALL.tenant,
      method: 'tools/call',
      requestDigest: expected.requestDigest,
      correlationId: 'evl-1',
      expiresAt: Date.now() + 60_000,
    }, env);

    const result = verifyApprovalGrant(state, expected, { env });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('malformed');
  });

  it('binds the arguments the human saw', () => {
    const { token } = issueGrantForCall(CALL, env);
    const otherFile = {
      ...expected,
      requestDigest: computeRequestDigest('tools/call', {
        name: CALL.tool,
        arguments: { ...CALL.args, path: 'production.env' },
      }),
    };

    const result = verifyApprovalGrant(token, otherFile, { env });
    expect(result.ok === false && result.reason).toBe('request-mismatch');
  });

  it('binds the tool, the principal and the tenant', () => {
    const { token } = issueGrantForCall(CALL, env);

    expect(verifyApprovalGrant(token, { ...expected, tool: 'evolith-deploy' }, { env }))
      .toEqual({ ok: false, reason: 'tool-mismatch' });
    expect(verifyApprovalGrant(token, { ...expected, principal: 'agent-8' }, { env }))
      .toEqual({ ok: false, reason: 'principal-mismatch' });
    expect(verifyApprovalGrant(token, { ...expected, tenant: 'other' }, { env }))
      .toEqual({ ok: false, reason: 'tenant-mismatch' });
  });

  it('expires on the clock, not on a flag', () => {
    const issuedAt = 1_000_000;
    const { token } = issueApprovalGrant({ ...CALL, requestDigest: expected.requestDigest, issuedAt, ttlMs: 60_000 }, env);

    expect(verifyApprovalGrant(token, expected, { env, now: issuedAt + 59_000 }).ok).toBe(true);
    expect(verifyApprovalGrant(token, expected, { env, now: issuedAt + 61_000 }))
      .toEqual({ ok: false, reason: 'expired' });
  });

  it('is single use when a redemption store is supplied', () => {
    const redemptions = new InMemoryGrantRedemptionStore();
    const { token } = issueGrantForCall(CALL, env);

    expect(verifyApprovalGrant(token, expected, { env, redemptions }).ok).toBe(true);
    expect(verifyApprovalGrant(token, expected, { env, redemptions }))
      .toEqual({ ok: false, reason: 'already-redeemed' });
  });

  /**
   * Ordering, and it is a real attack rather than tidiness: if redemption ran
   * before the other checks, anyone who observed a grant could burn it by
   * replaying it at the wrong tool, and the legitimate holder's approval would
   * be gone.
   */
  it('a grant rejected for another reason does NOT burn its single use', () => {
    const redemptions = new InMemoryGrantRedemptionStore();
    const { token } = issueGrantForCall(CALL, env);

    expect(verifyApprovalGrant(token, { ...expected, tool: 'evolith-deploy' }, { env, redemptions }))
      .toEqual({ ok: false, reason: 'tool-mismatch' });

    // Still spendable by the caller it was minted for.
    expect(verifyApprovalGrant(token, expected, { env, redemptions }).ok).toBe(true);
  });

  it('a grant sealed under a different secret is rejected as tampered', () => {
    const { token } = issueGrantForCall(CALL, env);
    const otherEnv = { EVOLITH_MCP_REQUEST_STATE_SECRET: 'a-different-secret' } as NodeJS.ProcessEnv;

    expect(verifyApprovalGrant(token, expected, { env: otherEnv }))
      .toEqual({ ok: false, reason: 'tampered' });
  });
});
