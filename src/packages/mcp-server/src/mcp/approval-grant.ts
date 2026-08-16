/**
 * GT-679 — the approval grant: what a human actually approved, in a form the
 * server can verify.
 *
 * WHAT THIS REPLACES, read verbatim from `mcp-tool-dispatch.ts` before the fix:
 *
 *   if (args.apply !== true || !args.approvalToken || typeof args.approvalToken !== 'string'
 *       || args.approvalToken.trim() === '')
 *
 * That was the entire predicate on the 20 mutative tools. No issuer, no store, no
 * signature, no expiry, no single use, no binding to principal, tool or arguments
 * — so the gate added ZERO authorization beyond the `write` scope the caller
 * already held and the ABAC decision that had already run. Nothing anywhere
 * issued a token: `grep -rnE "issueApproval|redeemApproval|mintApproval|createApprovalToken" src`
 * returned nothing outside doc comments. An agent holding a valid write key
 * approved its own irreversible calls by typing any non-empty string.
 *
 * The crypto is deliberately NOT new. `mrtr-request-state.ts` already seals with
 * AES-256-GCM under an HKDF-derived key and already computes a request digest
 * that binds the tool name and every salient argument; this reuses both. The one
 * thing that must differ is the HKDF `info` string, so that a sealed request
 * state can never be presented as a grant, or the reverse — two blobs from the
 * same secret with different meanings is how a replay becomes an authorization.
 *
 * WHO CAN ISSUE ONE is the property that makes this worth having. A grant is
 * minted by the SERVER on the MRTR retry leg, after `verifyRequestState` has
 * proved the request is the one shown to the human and the human accepted. The
 * caller never mints it, which is exactly what it could do before.
 */

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { computeRequestDigest, resolveStateSecret } from './mrtr-request-state';

/** Grant format marker; a version bump invalidates older grants by design. */
const GRANT_VERSION = 'evgrant1';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

/**
 * Default TTL. Short on purpose: a grant is the residue of a human decision
 * taken seconds ago, not a credential. `GT-158` promised an approval "issued
 * out-of-band" and shipped a string with no lifetime at all.
 */
export const DEFAULT_GRANT_TTL_MS = 5 * 60 * 1000;

export interface ApprovalGrantPayload {
  /** Unique id of THIS grant — the key single use is enforced on. */
  jti: string;
  /**
   * Who approved. Not the caller: the identity that answered the elicitation.
   * This is the field an auditor asking "who approved this" is answered with,
   * and before this row the audit line carried a fingerprint of a string nobody
   * had issued.
   */
  approver: string;
  /** The principal this grant was minted FOR. A grant is not bearer-transferable. */
  principal: string;
  /** Tenant the approval was scoped to; identity is principal + tenant. */
  tenant: string;
  /** The tool that was approved. A grant for tool A cannot redeem tool B. */
  tool: string;
  /** Digest binding the grant to the arguments the human saw. */
  requestDigest: string;
  issuedAt: number;
  /** Epoch millis after which the grant is refused. */
  expiresAt: number;
}

export type GrantRejection =
  | 'missing'
  | 'malformed'
  | 'tampered'
  | 'expired'
  | 'principal-mismatch'
  | 'tenant-mismatch'
  | 'tool-mismatch'
  | 'request-mismatch'
  | 'already-redeemed';

export type GrantVerification =
  | { ok: true; payload: ApprovalGrantPayload }
  | { ok: false; reason: GrantRejection };

/**
 * Single use, as a port.
 *
 * In-memory by default, which is honest about what it is: single use holds
 * within one process and a multi-replica deployment can redeem the same grant
 * once per replica. That is a strictly smaller hole than the one this row
 * closes — before, every grant was infinitely redeemable everywhere — and the
 * durable ledger it wants is `GT-680`, which is open and says so. A host that
 * has one injects it here rather than editing this file.
 */
export interface IGrantRedemptionStore {
  /** Returns false when this `jti` has already been redeemed. */
  redeem(jti: string, expiresAt: number, now: number): boolean;
}

export class InMemoryGrantRedemptionStore implements IGrantRedemptionStore {
  private readonly seen = new Map<string, number>();

  redeem(jti: string, expiresAt: number, now: number): boolean {
    // Prune on write: a grant past its expiry can never be accepted again by
    // `verifyApprovalGrant`, so keeping its id would only grow the map.
    for (const [id, exp] of this.seen) {
      if (exp <= now) this.seen.delete(id);
    }
    if (this.seen.has(jti)) return false;
    this.seen.set(jti, expiresAt);
    return true;
  }
}

function deriveKey(secret: string): Buffer {
  // Domain-separated from `mrtr-request-state`'s key. Two blobs sealed under one
  // secret with different meanings is how a replay becomes an authorization.
  return Buffer.from(
    hkdfSync('sha256', Buffer.from(secret, 'utf8'), Buffer.alloc(0), Buffer.from('evolith/mcp/approval-grant'), 32),
  );
}

/**
 * Mint a grant. Called by the SERVER after a human accepted, never by a caller.
 */
export function issueApprovalGrant(
  payload: Omit<ApprovalGrantPayload, 'jti' | 'issuedAt' | 'expiresAt'> & { jti?: string; issuedAt?: number; ttlMs?: number },
  env: NodeJS.ProcessEnv = process.env,
): { token: string; payload: ApprovalGrantPayload } {
  const issuedAt = payload.issuedAt ?? Date.now();
  const full: ApprovalGrantPayload = {
    jti: payload.jti ?? randomBytes(16).toString('base64url'),
    approver: payload.approver,
    principal: payload.principal,
    tenant: payload.tenant,
    tool: payload.tool,
    requestDigest: payload.requestDigest,
    issuedAt,
    expiresAt: issuedAt + (payload.ttlMs ?? DEFAULT_GRANT_TTL_MS),
  };

  const key = deriveKey(resolveStateSecret(env));
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  // Authenticated but not encrypted, so a blob from a future format is rejected
  // by the tag rather than mis-parsed.
  cipher.setAAD(Buffer.from(GRANT_VERSION, 'utf8'));
  const sealed = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(full), 'utf8')), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    token: [GRANT_VERSION, iv.toString('base64url'), sealed.toString('base64url'), tag.toString('base64url')].join('.'),
    payload: full,
  };
}

/**
 * Mint a grant for a specific call, computing the argument digest from the call
 * itself.
 *
 * The digest is the one place a caller can get this subtly wrong — bind the
 * wrong shape and every legitimate redemption fails, bind nothing and the grant
 * stops covering the arguments the human saw. One implementation, used by the
 * server's issuance leg and by every test, so the two cannot drift.
 */
export function issueGrantForCall(
  call: {
    approver: string;
    principal: string;
    tenant: string;
    tool: string;
    args: Record<string, unknown>;
    issuedAt?: number;
    ttlMs?: number;
  },
  env: NodeJS.ProcessEnv = process.env,
): { token: string; payload: ApprovalGrantPayload } {
  return issueApprovalGrant(
    {
      approver: call.approver,
      principal: call.principal,
      tenant: call.tenant,
      tool: call.tool,
      requestDigest: computeRequestDigest('tools/call', { name: call.tool, arguments: call.args }),
      issuedAt: call.issuedAt,
      ttlMs: call.ttlMs,
    },
    env,
  );
}

function equal(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Verify a presented grant against the call being made.
 *
 * Every failure returns a REASON rather than throwing, so the gate can say what
 * was wrong without a try/catch on a hot path — and so the refusal message can
 * be specific, which is what the falsifiability criterion asks for.
 *
 * Redemption is attempted LAST, after every other check has passed: a grant
 * rejected for the wrong tool must not burn its single use, or an attacker could
 * invalidate a legitimate approval by replaying it at the wrong target.
 */
export function verifyApprovalGrant(
  token: unknown,
  expected: { principal: string; tenant: string; tool: string; requestDigest: string },
  options: { now?: number; env?: NodeJS.ProcessEnv; redemptions?: IGrantRedemptionStore } = {},
): GrantVerification {
  if (typeof token !== 'string' || token.trim() === '') return { ok: false, reason: 'missing' };

  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== GRANT_VERSION) return { ok: false, reason: 'malformed' };

  let payload: ApprovalGrantPayload;
  try {
    const key = deriveKey(resolveStateSecret(options.env ?? process.env));
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(parts[1], 'base64url'));
    decipher.setAAD(Buffer.from(GRANT_VERSION, 'utf8'));
    decipher.setAuthTag(Buffer.from(parts[3], 'base64url'));
    const opened = Buffer.concat([decipher.update(Buffer.from(parts[2], 'base64url')), decipher.final()]);
    payload = JSON.parse(opened.toString('utf8')) as ApprovalGrantPayload;
  } catch {
    // A wrong key, a mangled blob and a forged tag are one class: not ours.
    return { ok: false, reason: 'tampered' };
  }

  const now = options.now ?? Date.now();
  if (typeof payload.expiresAt !== 'number' || now > payload.expiresAt) return { ok: false, reason: 'expired' };
  if (!equal(String(payload.principal ?? ''), expected.principal)) return { ok: false, reason: 'principal-mismatch' };
  if (!equal(String(payload.tenant ?? ''), expected.tenant)) return { ok: false, reason: 'tenant-mismatch' };
  if (!equal(String(payload.tool ?? ''), expected.tool)) return { ok: false, reason: 'tool-mismatch' };
  if (!equal(String(payload.requestDigest ?? ''), expected.requestDigest)) return { ok: false, reason: 'request-mismatch' };

  if (options.redemptions && !options.redemptions.redeem(String(payload.jti ?? ''), payload.expiresAt, now)) {
    return { ok: false, reason: 'already-redeemed' };
  }

  return { ok: true, payload };
}

/** Human-readable remediation per rejection, so a refusal tells the caller what to do. */
export function describeGrantRejection(reason: GrantRejection, tool: string): string {
  switch (reason) {
    case 'missing':
      return `Mutative operation '${tool}' requires a server-issued approval grant. Obtain one through the elicitation round trip; a caller-supplied string is not an approval.`;
    case 'malformed':
    case 'tampered':
      return `The approval grant presented for '${tool}' is not a grant this server issued.`;
    case 'expired':
      return `The approval grant for '${tool}' has expired. Approvals are short-lived by design; request approval again.`;
    case 'already-redeemed':
      return `The approval grant for '${tool}' has already been redeemed. Each approval authorises exactly one call.`;
    case 'tool-mismatch':
      return `The approval grant presented was issued for a different tool, not '${tool}'.`;
    case 'request-mismatch':
      return `The approval grant presented was issued for different arguments than this call to '${tool}'.`;
    case 'principal-mismatch':
    case 'tenant-mismatch':
      return `The approval grant presented was issued for a different principal or tenant.`;
  }
}
