/**
 * GT-588 — pure byte codecs for the transparency layer.
 *
 * The domain layer models statements, receipts and Merkle proofs as raw bytes,
 * but it must not reach for `node:crypto` or `Buffer`: hashing and signing are
 * ADAPTER concerns behind {@link IHasher} / {@link IStatementSigner}, and the
 * transports that carry a receipt (JSONL, HTTP, a CLI argument) speak base64.
 * These are the only conversions the domain needs, written as pure functions so
 * the layer keeps zero runtime dependencies.
 */

const HEX = '0123456789abcdef';
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Lowercase hex encoding of a byte string. */
export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += HEX[(b >> 4) & 0x0f] + HEX[b & 0x0f];
  return out;
}

/** Decode lowercase/uppercase hex. Throws on an odd length or a non-hex digit. */
export function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error(`invalid hex length: ${hex.length}`);
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error(`invalid hex at offset ${i * 2}`);
    out[i] = byte;
  }
  return out;
}

/** Standard (padded) base64 encoding. */
export function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? '=' : B64[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? '=' : B64[b2 & 0x3f];
  }
  return out;
}

/** Standard base64 decoding. Throws on a character outside the alphabet. */
export function fromBase64(b64: string): Uint8Array {
  const clean = b64.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let acc = 0;
  let bits = 0;
  let o = 0;
  for (const ch of clean) {
    const v = B64.indexOf(ch);
    if (v < 0) throw new Error(`invalid base64 character: ${ch}`);
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >> bits) & 0xff;
    }
  }
  return out.subarray(0, o);
}

/** UTF-8 encode without depending on Node's `Buffer`. */
export function utf8Bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** Concatenate byte strings. */
export function concatBytes(...parts: readonly Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/** Constant-length structural equality for byte strings. */
export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Deterministic JSON serialisation (RFC 8785-style key ordering) — the bytes a
 * statement is signed over.
 *
 * A signature is only meaningful if signer and verifier agree byte-for-byte on
 * what was signed. `JSON.stringify` does NOT: it preserves insertion order, so
 * the same logical decision read back from a ledger can serialise differently
 * and break verification for a reason that has nothing to do with tampering.
 * Keys are therefore sorted at every depth and `undefined` members dropped.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const source = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) {
    if (source[key] === undefined) continue;
    out[key] = canonicalize(source[key]);
  }
  return out;
}
