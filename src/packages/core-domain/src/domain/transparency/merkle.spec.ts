/**
 * GT-588 — RFC 9162 Merkle tree conformance.
 *
 * Anchored against the Certificate Transparency reference test inputs (the
 * RFC 6962 → RFC 9162 lineage), whose 8-entry tree head is a published value:
 * `5dc9da79a70659a9ad559cb701ded9a2ab9d823aad2f4960cfe370eff4604328`. The empty
 * tree is SHA-256 of the empty string and the single-entry tree is SHA-256(0x00),
 * both independently checkable with `shasum` — so a regression in the domain
 * implementation cannot be papered over by regenerating expectations from itself.
 */

import { createHash } from 'node:crypto';

import { fromHex, toHex } from './codec';
import { inclusionPath, leafHash, merkleTreeHead, recomputeRootFromProof, verifyInclusionProof } from './merkle';
import type { IHasher } from './ports/hasher.port';

const sha256: IHasher = {
  algorithm: 'sha-256',
  hash: (input) => new Uint8Array(createHash('sha256').update(input).digest()),
};

/** The Certificate Transparency reference entries, hex-encoded. */
const CT_ENTRIES = [
  '',
  '00',
  '10',
  '2021',
  '3031',
  '40414243',
  '5051525354555657',
  '606162636465666768696a6b6c6d6e6f',
].map(fromHex);

/** Published tree heads for the first n reference entries. */
const CT_ROOTS = [
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  '6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d',
  'fac54203e7cc696cf0dfcb42c92a1d9dbaf70ad9e621f4bd8d98662f00e3c125',
  'aeb6bcfe274b70a14fb067a5e5578264db0fa9b51af5e0ba159158f329e06e77',
  'd37ee418976dd95753c1c73862b9398fa2a2cf9b4ff0fdfe8b30cd95209614b7',
  '4e3bbb1f7b478dcfe71fb631631519a3bca12c9aefca1612bfce4c13a86264d4',
  '76e67dadbcdf1e10e1b74ddc608abd2f98dfb16fbce75277b5232a127f2087ef',
  'ddb89be403809e325750d3d263cd78929c2942b7942a34b77e122c9594a74c8c',
  '5dc9da79a70659a9ad559cb701ded9a2ab9d823aad2f4960cfe370eff4604328',
];

describe('RFC 9162 Merkle tree (GT-588)', () => {
  describe('merkleTreeHead', () => {
    it.each(CT_ROOTS.map((root, n) => [n, root]))(
      'matches the reference tree head for %i entries',
      (n, expected) => {
        expect(toHex(merkleTreeHead(CT_ENTRIES.slice(0, n as number), sha256))).toBe(expected);
      },
    );

    it('hashes the empty tree as SHA-256 of the empty string', () => {
      expect(toHex(merkleTreeHead([], sha256))).toBe(toHex(new Uint8Array(createHash('sha256').digest())));
    });

    it('applies domain separation: a single-entry head is HASH(0x00 || entry)', () => {
      const entry = new Uint8Array([0xaa, 0xbb]);
      expect(toHex(merkleTreeHead([entry], sha256))).toBe(toHex(leafHash(entry, sha256)));
    });
  });

  describe('inclusion proofs', () => {
    it('verifies every leaf of every tree size from 1 to 8', () => {
      for (let size = 1; size <= CT_ENTRIES.length; size++) {
        const entries = CT_ENTRIES.slice(0, size);
        const root = merkleTreeHead(entries, sha256);
        for (let index = 0; index < size; index++) {
          const path = inclusionPath(entries, index, sha256);
          const ok = verifyInclusionProof(
            { leaf: leafHash(entries[index], sha256), leafIndex: index, treeSize: size, path },
            root,
            sha256,
          );
          expect({ size, index, ok }).toEqual({ size, index, ok: true });
        }
      }
    });

    it('rejects a proof whose leaf was altered', () => {
      const entries = CT_ENTRIES.slice(0, 5);
      const root = merkleTreeHead(entries, sha256);
      const path = inclusionPath(entries, 2, sha256);
      const tampered = leafHash(new Uint8Array([0xff]), sha256);
      expect(verifyInclusionProof({ leaf: tampered, leafIndex: 2, treeSize: 5, path }, root, sha256)).toBe(false);
    });

    it('rejects a proof presented at the wrong index', () => {
      const entries = CT_ENTRIES.slice(0, 7);
      const root = merkleTreeHead(entries, sha256);
      const path = inclusionPath(entries, 3, sha256);
      expect(verifyInclusionProof(
        { leaf: leafHash(entries[3], sha256), leafIndex: 4, treeSize: 7, path },
        root,
        sha256,
      )).toBe(false);
    });

    it('rejects a truncated path rather than accepting a short recomputation', () => {
      const entries = CT_ENTRIES.slice(0, 8);
      const root = merkleTreeHead(entries, sha256);
      const path = inclusionPath(entries, 0, sha256).slice(0, 1);
      expect(recomputeRootFromProof({ leaf: leafHash(entries[0], sha256), leafIndex: 0, treeSize: 8, path }, sha256))
        .toBeUndefined();
      expect(verifyInclusionProof({ leaf: leafHash(entries[0], sha256), leafIndex: 0, treeSize: 8, path }, root, sha256))
        .toBe(false);
    });

    it('rejects an out-of-range leaf index', () => {
      expect(recomputeRootFromProof({ leaf: new Uint8Array(32), leafIndex: 5, treeSize: 5, path: [] }, sha256))
        .toBeUndefined();
      expect(() => inclusionPath(CT_ENTRIES.slice(0, 3), 3, sha256)).toThrow(RangeError);
    });

    it('keeps leaf and interior hash spaces disjoint (domain separation)', () => {
      // The guarantee the 0x00/0x01 prefixes actually provide: an attacker who
      // submits the CONCATENATED CHILDREN of an interior node as a new log entry
      // cannot have it hash to that interior node, so a second-preimage attack that
      // reinterprets an interior node as a leaf is closed off. (It is NOT a claim
      // about a caller who is handed a pre-computed digest and asserts it is a leaf
      // hash — at that point the caller has already skipped the hashing step.)
      const entries = CT_ENTRIES.slice(0, 4);
      const left = merkleTreeHead(entries.slice(0, 2), sha256);
      const right = merkleTreeHead(entries.slice(2), sha256);
      const interiorHash = merkleTreeHead(entries, sha256);

      const forgedEntry = new Uint8Array([...left, ...right]);
      expect(toHex(leafHash(forgedEntry, sha256))).not.toBe(toHex(interiorHash));
    });
  });
});
