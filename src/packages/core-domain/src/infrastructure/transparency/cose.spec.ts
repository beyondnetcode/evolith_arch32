/**
 * GT-588 — deterministic CBOR and COSE_Sign1 conformance.
 *
 * Byte-level expectations are taken from RFC 8949's own worked examples, so the
 * encoder is pinned to the specification rather than to itself.
 */

import { toHex, fromHex } from '../../domain/transparency/codec';
import { CborMap, CborTag, decodeCbor, encodeCbor } from './cbor';
import {
  COSE_HEADER,
  COSE_SIGN1_TAG,
  VDP_INCLUSION_PROOF,
  decodeCoseSign1,
  decodeInclusionProof,
  encodeCoseSign1,
  encodeInclusionProof,
  inclusionProofHeader,
  readInclusionProof,
  sigStructure,
} from './cose';

describe('deterministic CBOR (RFC 8949) — GT-588', () => {
  it.each([
    [0, '00'],
    [1, '01'],
    [10, '0a'],
    [23, '17'],
    [24, '1818'],
    [25, '1819'],
    [100, '1864'],
    [1000, '1903e8'],
    [1000000, '1a000f4240'],
    [-1, '20'],
    [-10, '29'],
    [-100, '3863'],
    [-1000, '3903e7'],
  ])('encodes the integer %i in shortest form', (value, hex) => {
    expect(toHex(encodeCbor(value))).toBe(hex);
  });

  it('encodes the RFC 9942 header labels vds (395) and vdp (396)', () => {
    // 395 = 0x018b → 19 018b ; 396 = 0x018c → 19 018c
    expect(toHex(encodeCbor(COSE_HEADER.vds))).toBe('19018b');
    expect(toHex(encodeCbor(COSE_HEADER.vdp))).toBe('19018c');
    // The inclusion-proof label is the negative integer -1.
    expect(toHex(encodeCbor(VDP_INCLUSION_PROOF))).toBe('20');
  });

  it.each([
    ['', '60'],
    ['a', '6161'],
    ['IETF', '6449455446'],
  ])('encodes the text string %p', (value, hex) => {
    expect(toHex(encodeCbor(value))).toBe(hex);
  });

  it('encodes byte strings and arrays per RFC 8949', () => {
    expect(toHex(encodeCbor(fromHex('01020304')))).toBe('4401020304');
    expect(toHex(encodeCbor([1, 2, 3]))).toBe('83010203');
  });

  it('sorts map keys bytewise regardless of insertion order', () => {
    const a = encodeCbor(new CborMap([[1, 'x'], [10, 'y'], [-1, 'z']]));
    const b = encodeCbor(new CborMap([[-1, 'z'], [10, 'y'], [1, 'x']]));
    expect(toHex(a)).toBe(toHex(b));
    // 01 (1) < 0a (10) < 20 (-1) bytewise.
    expect(toHex(a)).toBe('a3016178' + '0a6179' + '20617a');
  });

  it('round-trips every structure COSE needs', () => {
    const value = new CborTag(18, [
      fromHex('a10126'),
      new CborMap([[4, fromHex('01020304')]]),
      null,
      fromHex('deadbeef'),
    ]);
    const decoded = decodeCbor(encodeCbor(value)) as CborTag;
    expect(decoded).toBeInstanceOf(CborTag);
    expect(decoded.tag).toBe(18);
    expect(toHex(encodeCbor(decoded))).toBe(toHex(encodeCbor(value)));
  });

  it('rejects trailing bytes rather than silently ignoring them', () => {
    expect(() => decodeCbor(fromHex('0100'))).toThrow(/trailing bytes/);
  });
});

describe('COSE_Sign1 framing — GT-588', () => {
  const protectedBytes = encodeCbor(new CborMap([[COSE_HEADER.alg, -8]]));

  it('emits a tag-18 COSE_Sign1 with an attached payload', () => {
    const bytes = encodeCoseSign1({
      protectedBytes,
      payload: fromHex('cafe'),
      signature: fromHex('0011'),
    });
    expect(bytes[0]).toBe(0xd2); // major 6, value 18 → tagged COSE_Sign1
    const decoded = decodeCoseSign1(bytes);
    expect(toHex(decoded.protectedBytes)).toBe(toHex(protectedBytes));
    expect(decoded.protectedHeader.get(COSE_HEADER.alg)).toBe(-8);
    expect(toHex(decoded.payload!)).toBe('cafe');
    expect(toHex(decoded.signature)).toBe('0011');
  });

  it('encodes a detached payload as CBOR null and reports it absent', () => {
    const decoded = decodeCoseSign1(encodeCoseSign1({ protectedBytes, signature: fromHex('00') }));
    expect(decoded.payload).toBeUndefined();
  });

  it('builds Sig_structure as ["Signature1", protected, external_aad, payload]', () => {
    const decoded = decodeCbor(sigStructure(protectedBytes, fromHex('cafe'))) as unknown[];
    expect(Array.isArray(decoded)).toBe(true);
    expect(decoded[0]).toBe('Signature1');
    expect(toHex(decoded[1] as Uint8Array)).toBe(toHex(protectedBytes));
    expect((decoded[2] as Uint8Array).length).toBe(0);
    expect(toHex(decoded[3] as Uint8Array)).toBe('cafe');
  });

  it('rejects an object that is not a COSE_Sign1', () => {
    expect(() => decodeCoseSign1(encodeCbor([1, 2]))).toThrow(/4-element array/);
    expect(() => decodeCoseSign1(encodeCbor(new CborTag(17, [])))).toThrow(/expected tag 18/);
    expect(COSE_SIGN1_TAG).toBe(18);
  });
});

describe('RFC 9942 inclusion proof carriage — GT-588', () => {
  const proof = {
    treeSize: 8,
    leafIndex: 3,
    inclusionPath: [fromHex('aa'.repeat(32)), fromHex('bb'.repeat(32))],
  };

  it('encodes inclusion-proof-content as [tree-size, leaf-index, inclusion-path]', () => {
    const decoded = decodeCbor(encodeInclusionProof(proof)) as unknown[];
    expect(decoded).toHaveLength(3);
    expect(decoded[0]).toBe(8);
    expect(decoded[1]).toBe(3);
    expect((decoded[2] as Uint8Array[]).map(toHex)).toEqual(proof.inclusionPath.map(toHex));
  });

  it('carries the proof under vdp (396) at label -1 as an array of bstr', () => {
    const header = inclusionProofHeader(proof);
    const vdp = header.get(COSE_HEADER.vdp) as CborMap;
    expect(vdp).toBeInstanceOf(CborMap);
    const proofs = vdp.get(VDP_INCLUSION_PROOF) as Uint8Array[];
    expect(Array.isArray(proofs)).toBe(true);
    expect(proofs[0]).toBeInstanceOf(Uint8Array);
    expect(decodeInclusionProof(proofs[0]).leafIndex).toBe(3);
  });

  it('reads the proof back out of an unprotected header', () => {
    const read = readInclusionProof(inclusionProofHeader(proof));
    expect(read).toEqual(proof);
  });

  it('returns undefined when there is no vdp header at all', () => {
    expect(readInclusionProof(new CborMap([]))).toBeUndefined();
  });
});
