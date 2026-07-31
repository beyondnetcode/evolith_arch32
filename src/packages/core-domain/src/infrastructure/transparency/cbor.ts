/**
 * GT-588 — the deterministic CBOR subset COSE needs (RFC 8949).
 *
 * WHY HAND-ROLLED. A signature is over BYTES. If the encoder is free to choose
 * between representations, a verifier can re-encode the same logical value
 * differently and read a valid signature as invalid — so COSE requires the
 * "core deterministic encoding" of RFC 8949 §4.2.1: shortest-form integers and map
 * keys sorted bytewise by their encoded form. This module implements exactly that,
 * for exactly the types COSE_Sign1 and RFC 9942 receipts use (unsigned and negative
 * integers, byte strings, text strings, arrays, maps, tags, null). It is not a
 * general CBOR library and does not try to be: floats, indefinite-length items and
 * the rest of major type 7 are rejected rather than guessed at.
 *
 * Adding a CBOR dependency was the alternative. This repository has none, and a new
 * runtime dependency in the innermost published package is a larger commitment than
 * ~200 lines whose entire contract is pinned by a round-trip test.
 */

export type CborKey = number | string;
export type CborValue =
  | number
  | string
  | Uint8Array
  | null
  | readonly CborValue[]
  | CborMap
  | CborTag;

/** A CBOR map. Key order is irrelevant on input — encoding sorts deterministically. */
export class CborMap {
  constructor(public readonly entries: ReadonlyArray<readonly [CborKey, CborValue]>) {}
  get(key: CborKey): CborValue | undefined {
    return this.entries.find(([k]) => k === key)?.[1];
  }
  get size(): number {
    return this.entries.length;
  }
}

/** A CBOR tagged value (major type 6). */
export class CborTag {
  constructor(public readonly tag: number, public readonly value: CborValue) {}
}

// ---------------------------------------------------------------------------
// Encoding
// ---------------------------------------------------------------------------

function encodeHead(major: number, argument: number): Uint8Array {
  if (!Number.isInteger(argument) || argument < 0) {
    throw new Error(`cbor: invalid head argument ${argument}`);
  }
  const mt = major << 5;
  // Shortest form (RFC 8949 §4.2.1) — never encode a value in more bytes than needed.
  if (argument < 24) return new Uint8Array([mt | argument]);
  if (argument < 0x100) return new Uint8Array([mt | 24, argument]);
  if (argument < 0x10000) return new Uint8Array([mt | 25, argument >> 8, argument & 0xff]);
  if (argument < 0x100000000) {
    return new Uint8Array([
      mt | 26,
      (argument >>> 24) & 0xff,
      (argument >>> 16) & 0xff,
      (argument >>> 8) & 0xff,
      argument & 0xff,
    ]);
  }
  // 64-bit form, split so we never rely on 32-bit bit-shift semantics.
  const hi = Math.floor(argument / 0x100000000);
  const lo = argument >>> 0;
  return new Uint8Array([
    mt | 27,
    (hi >>> 24) & 0xff, (hi >>> 16) & 0xff, (hi >>> 8) & 0xff, hi & 0xff,
    (lo >>> 24) & 0xff, (lo >>> 16) & 0xff, (lo >>> 8) & 0xff, lo & 0xff,
  ]);
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Bytewise lexicographic comparison — the deterministic map-key ordering. */
function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

export function encodeCbor(value: CborValue): Uint8Array {
  if (value === null) return new Uint8Array([0xf6]);

  if (typeof value === 'number') {
    if (!Number.isInteger(value)) throw new Error('cbor: only integers are supported');
    return value >= 0 ? encodeHead(0, value) : encodeHead(1, -value - 1);
  }

  if (typeof value === 'string') {
    const bytes = new TextEncoder().encode(value);
    return concat([encodeHead(3, bytes.length), bytes]);
  }

  if (value instanceof Uint8Array) {
    return concat([encodeHead(2, value.length), value]);
  }

  if (value instanceof CborTag) {
    return concat([encodeHead(6, value.tag), encodeCbor(value.value)]);
  }

  if (value instanceof CborMap) {
    const encoded = value.entries.map(([k, v]) => ({ k: encodeCbor(k), v: encodeCbor(v) }));
    encoded.sort((a, b) => compareBytes(a.k, b.k));
    return concat([encodeHead(5, encoded.length), ...encoded.flatMap((e) => [e.k, e.v])]);
  }

  if (Array.isArray(value)) {
    return concat([encodeHead(4, value.length), ...value.map(encodeCbor)]);
  }

  throw new Error(`cbor: unsupported value of type ${typeof value}`);
}

// ---------------------------------------------------------------------------
// Decoding
// ---------------------------------------------------------------------------

interface Cursor {
  readonly bytes: Uint8Array;
  offset: number;
}

function readHead(c: Cursor): { major: number; argument: number } {
  if (c.offset >= c.bytes.length) throw new Error('cbor: unexpected end of input');
  const ib = c.bytes[c.offset++];
  const major = ib >> 5;
  const ai = ib & 0x1f;
  if (ai < 24) return { major, argument: ai };
  let n: number;
  switch (ai) {
    case 24: n = 1; break;
    case 25: n = 2; break;
    case 26: n = 4; break;
    case 27: n = 8; break;
    default: throw new Error(`cbor: unsupported additional information ${ai}`);
  }
  if (c.offset + n > c.bytes.length) throw new Error('cbor: truncated head');
  let argument = 0;
  for (let i = 0; i < n; i++) argument = argument * 256 + c.bytes[c.offset++];
  if (!Number.isSafeInteger(argument)) throw new Error('cbor: argument exceeds safe integer range');
  return { major, argument };
}

function decodeValue(c: Cursor): CborValue {
  const { major, argument } = readHead(c);
  switch (major) {
    case 0:
      return argument;
    case 1:
      return -argument - 1;
    case 2: {
      if (c.offset + argument > c.bytes.length) throw new Error('cbor: truncated byte string');
      const out = c.bytes.slice(c.offset, c.offset + argument);
      c.offset += argument;
      return out;
    }
    case 3: {
      if (c.offset + argument > c.bytes.length) throw new Error('cbor: truncated text string');
      const out = new TextDecoder().decode(c.bytes.subarray(c.offset, c.offset + argument));
      c.offset += argument;
      return out;
    }
    case 4: {
      const items: CborValue[] = [];
      for (let i = 0; i < argument; i++) items.push(decodeValue(c));
      return items;
    }
    case 5: {
      const entries: [CborKey, CborValue][] = [];
      for (let i = 0; i < argument; i++) {
        const k = decodeValue(c);
        if (typeof k !== 'number' && typeof k !== 'string') {
          throw new Error('cbor: only integer and text map keys are supported');
        }
        entries.push([k, decodeValue(c)]);
      }
      return new CborMap(entries);
    }
    case 6:
      return new CborTag(argument, decodeValue(c));
    case 7:
      if (argument === 22) return null; // null
      throw new Error(`cbor: unsupported simple value ${argument}`);
    default:
      throw new Error(`cbor: unsupported major type ${major}`);
  }
}

/** Decode a single CBOR item. Trailing bytes are an error — COSE objects are exact. */
export function decodeCbor(bytes: Uint8Array): CborValue {
  const c: Cursor = { bytes, offset: 0 };
  const value = decodeValue(c);
  if (c.offset !== bytes.length) throw new Error('cbor: trailing bytes after top-level item');
  return value;
}
