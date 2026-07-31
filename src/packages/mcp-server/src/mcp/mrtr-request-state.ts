/**
 * GT-582 — the sealed `requestState` of the MRTR pattern (SEP-2322).
 *
 * MRTR is how the human-in-the-loop approval gate survives the removal of
 * protocol-level sessions: instead of parking pending state in a session, the
 * server hands the client an opaque blob, the client echoes it back on a retry
 * of the ORIGINAL request, and the server reconstitutes what it needs from the
 * blob alone. Nothing is stored server-side, so any instance can serve the
 * retry.
 *
 * The specification is explicit that a returned `requestState` is
 * attacker-controlled input, and that a server whose `requestState` influences
 * authorization "MUST protect its integrity (e.g. HMAC or AEAD) and MUST reject
 * state that fails verification". Ours gates a mutative tool call, so it is
 * sealed with AES-256-GCM — confidentiality AND integrity — and carries the
 * three replay bounds the specification asks for:
 *
 *   - the authenticated principal, rejected when a different principal presents it;
 *   - a short TTL, rejected once lapsed;
 *   - a digest of the originating request (method + tool + salient arguments),
 *     rejected when presented on a request that does not match.
 *
 * Clients MUST NOT inspect or modify it; encrypting (rather than only signing)
 * makes that structurally true rather than a request.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

/** Sealed-state format marker; a version bump invalidates older blobs by design. */
const STATE_VERSION = 'evmrtr1';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** Default TTL. Short: an approval decision is a human action, not a bookmark. */
export const DEFAULT_REQUEST_STATE_TTL_MS = 10 * 60 * 1000;

/** What the server needs back to finish a gated call, sealed inside the blob. */
export interface RequestStatePayload {
  /** Authenticated principal at the time the state was issued. */
  principal: string;
  /** Tenant the original call was scoped to (identity is principal + tenant). */
  tenant: string;
  /** JSON-RPC method of the originating request (e.g. `tools/call`). */
  method: string;
  /** Digest binding the state to the salient parameters of that request. */
  requestDigest: string;
  /** Correlation id, so the retry lands in the audit trail as one operation. */
  correlationId: string;
  /** Epoch millis after which the state is refused. */
  expiresAt: number;
}

export type RequestStateRejection =
  | 'malformed'
  | 'tampered'
  | 'expired'
  | 'principal-mismatch'
  | 'request-mismatch';

export type RequestStateVerification =
  | { ok: true; payload: RequestStatePayload }
  | { ok: false; reason: RequestStateRejection };

/**
 * Stable digest of the parameters that make a retry "the same request".
 *
 * Approval-bearing keys are excluded on purpose: `apply` and the MRTR response
 * envelope are exactly what the retry ADDS, so including them would make every
 * legitimate retry mismatch. Everything else — the tool name and every other
 * argument — is bound, so a state issued for `evolith-scaffold` on repo A
 * cannot be replayed to approve repo B.
 */
const NON_BINDING_ARG_KEYS = new Set(['apply', 'approvalToken', 'inputResponses', 'requestState', '_meta']);

export function computeRequestDigest(method: string, params: Record<string, unknown>): string {
  const args = (params.arguments as Record<string, unknown> | undefined) ?? {};
  const bound: Record<string, unknown> = {};
  for (const key of Object.keys(args).sort()) {
    if (NON_BINDING_ARG_KEYS.has(key)) continue;
    bound[key] = args[key];
  }
  const canonical = JSON.stringify({ method, name: params.name ?? null, arguments: bound });
  return createHash('sha256').update(canonical).digest('base64url');
}

/**
 * Per-process fallback key. Used ONLY when no secret is configured; it makes a
 * single instance correct while making a multi-instance deployment fail closed
 * (a retry landing on another instance is rejected as tampered rather than
 * silently trusted). Configure `EVOLITH_MCP_REQUEST_STATE_SECRET` in any
 * deployment with more than one replica.
 */
let ephemeralSecret: string | undefined;

export function resolveStateSecret(env: NodeJS.ProcessEnv = process.env): string {
  const configured =
    env.EVOLITH_MCP_REQUEST_STATE_SECRET?.trim() ||
    env.EVOLITH_API_KEY?.trim() ||
    env.JWT_SECRET?.trim();
  if (configured) return configured;
  if (!ephemeralSecret) ephemeralSecret = randomBytes(32).toString('base64url');
  return ephemeralSecret;
}

function deriveKey(secret: string): Buffer {
  // Domain-separated so a shared API key cannot be reused as a key elsewhere.
  return Buffer.from(hkdfSync('sha256', Buffer.from(secret, 'utf8'), Buffer.alloc(0), Buffer.from('evolith/mcp/mrtr-request-state'), 32));
}

/** Seal a payload into the opaque string handed to the client. */
export function sealRequestState(
  payload: RequestStatePayload,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const key = deriveKey(resolveStateSecret(env));
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  // The version marker is authenticated but not encrypted, so a blob from a
  // future format is rejected by the tag rather than mis-parsed.
  cipher.setAAD(Buffer.from(STATE_VERSION, 'utf8'));
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const sealed = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [STATE_VERSION, iv.toString('base64url'), sealed.toString('base64url'), tag.toString('base64url')].join('.');
}

/**
 * Open and validate a `requestState` presented by a client.
 *
 * Every failure mode returns a reason rather than throwing, so the caller can
 * decide between "ask again" and "refuse" without a try/catch around a hot path.
 */
export function verifyRequestState(
  state: unknown,
  expected: { principal: string; tenant: string; method: string; requestDigest: string },
  options: { now?: number; env?: NodeJS.ProcessEnv } = {},
): RequestStateVerification {
  if (typeof state !== 'string' || state.length === 0) return { ok: false, reason: 'malformed' };
  const parts = state.split('.');
  if (parts.length !== 4 || parts[0] !== STATE_VERSION) return { ok: false, reason: 'malformed' };

  let payload: RequestStatePayload;
  try {
    const iv = Buffer.from(parts[1], 'base64url');
    const sealed = Buffer.from(parts[2], 'base64url');
    const tag = Buffer.from(parts[3], 'base64url');
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) return { ok: false, reason: 'malformed' };
    const decipher = createDecipheriv(ALGORITHM, deriveKey(resolveStateSecret(options.env ?? process.env)), iv);
    decipher.setAAD(Buffer.from(STATE_VERSION, 'utf8'));
    decipher.setAuthTag(tag);
    const opened = Buffer.concat([decipher.update(sealed), decipher.final()]);
    payload = JSON.parse(opened.toString('utf8')) as RequestStatePayload;
  } catch {
    // A failed GCM tag check lands here: the blob was altered or is not ours.
    return { ok: false, reason: 'tampered' };
  }

  const now = options.now ?? Date.now();
  if (typeof payload.expiresAt !== 'number' || now > payload.expiresAt) return { ok: false, reason: 'expired' };
  if (!constantTimeEquals(payload.principal, expected.principal) || payload.tenant !== expected.tenant) {
    return { ok: false, reason: 'principal-mismatch' };
  }
  if (payload.method !== expected.method || !constantTimeEquals(payload.requestDigest, expected.requestDigest)) {
    return { ok: false, reason: 'request-mismatch' };
  }
  return { ok: true, payload };
}

function constantTimeEquals(a: unknown, b: string): boolean {
  if (typeof a !== 'string') return false;
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  return timingSafeEqual(left, right);
}

/** Reset the process-local fallback key. Test seam only. */
export function __resetEphemeralStateSecret(): void {
  ephemeralSecret = undefined;
}
