/**
 * GT-588 — RFC 9162 binary Merkle tree, the `RFC9162_SHA256` verifiable data
 * structure that RFC 9942 registers as `vds` value 1.
 *
 * This is PURE DOMAIN LOGIC and it belongs here rather than in an adapter: what gets
 * hashed, in what order, with which domain-separation prefix, IS the tamper-evidence
 * argument. Only the hash primitive is injected ({@link IHasher}) — the tree math is
 * the part a reviewer has to be able to read without a crypto library in the way.
 *
 * Domain separation (RFC 9162 §2.1.1) — leaves are hashed with a `0x00` prefix and
 * interior nodes with `0x01`. Without it an attacker can present an interior node as
 * a leaf and forge an inclusion proof; with it the two hash spaces cannot collide.
 */

import { concatBytes, bytesEqual } from './codec';
import type { IHasher } from './ports/hasher.port';

const LEAF_PREFIX = new Uint8Array([0x00]);
const NODE_PREFIX = new Uint8Array([0x01]);

/** RFC 9162 §2.1.1 — leaf hash: `HASH(0x00 || entry)`. */
export function leafHash(entry: Uint8Array, hasher: IHasher): Uint8Array {
  return hasher.hash(concatBytes(LEAF_PREFIX, entry));
}

/** RFC 9162 §2.1.1 — interior node hash: `HASH(0x01 || left || right)`. */
export function nodeHash(left: Uint8Array, right: Uint8Array, hasher: IHasher): Uint8Array {
  return hasher.hash(concatBytes(NODE_PREFIX, left, right));
}

/** Largest power of two strictly smaller than `n` (RFC 9162's `k`). Requires n > 1. */
function largestPowerOfTwoBelow(n: number): number {
  let k = 1;
  while (k * 2 < n) k *= 2;
  return k;
}

/**
 * RFC 9162 §2.1.1 — Merkle Tree Hash over the given entries (NOT leaf hashes:
 * the `0x00` prefix is applied here).
 */
export function merkleTreeHead(entries: readonly Uint8Array[], hasher: IHasher): Uint8Array {
  if (entries.length === 0) return hasher.hash(new Uint8Array(0));
  if (entries.length === 1) return leafHash(entries[0], hasher);
  const k = largestPowerOfTwoBelow(entries.length);
  return nodeHash(
    merkleTreeHead(entries.slice(0, k), hasher),
    merkleTreeHead(entries.slice(k), hasher),
    hasher,
  );
}

/**
 * RFC 9162 §2.1.3.1 — the audit path (inclusion proof) for the entry at `index`
 * within `entries`, ordered leaf-ward → root-ward.
 */
export function inclusionPath(
  entries: readonly Uint8Array[],
  index: number,
  hasher: IHasher,
): Uint8Array[] {
  if (index < 0 || index >= entries.length) {
    throw new RangeError(`leaf index ${index} out of range for tree of size ${entries.length}`);
  }
  if (entries.length === 1) return [];
  const k = largestPowerOfTwoBelow(entries.length);
  if (index < k) {
    return [
      ...inclusionPath(entries.slice(0, k), index, hasher),
      merkleTreeHead(entries.slice(k), hasher),
    ];
  }
  return [
    ...inclusionPath(entries.slice(k), index - k, hasher),
    merkleTreeHead(entries.slice(0, k), hasher),
  ];
}

/** Inputs to {@link verifyInclusionProof} — mirrors RFC 9942's `inclusion-proof-content`. */
export interface InclusionProof {
  /** RFC 9162 leaf hash of the entry being proved (`HASH(0x00 || entry)`). */
  readonly leaf: Uint8Array;
  readonly leafIndex: number;
  readonly treeSize: number;
  readonly path: readonly Uint8Array[];
}

/**
 * RFC 9162 §2.1.3.2 — recompute the tree head from a leaf and its audit path.
 *
 * This is the whole point of the exercise: a verifier that holds only the leaf, the
 * path and the SIGNED root can decide inclusion without the log operator's help and
 * without trusting them. Returns the recomputed root, or `undefined` when the proof
 * is structurally impossible (bad index, exhausted path, wrong length).
 */
export function recomputeRootFromProof(proof: InclusionProof, hasher: IHasher): Uint8Array | undefined {
  const { leaf, leafIndex, treeSize, path } = proof;
  if (!Number.isInteger(leafIndex) || !Number.isInteger(treeSize)) return undefined;
  if (leafIndex < 0 || treeSize <= 0 || leafIndex >= treeSize) return undefined;

  let fn = leafIndex;
  let sn = treeSize - 1;
  let r = leaf;

  for (const sibling of path) {
    if (sn === 0) return undefined; // path longer than the tree can justify
    if (fn % 2 === 1 || fn === sn) {
      r = nodeHash(sibling, r, hasher);
      while (fn !== 0 && fn % 2 === 0) {
        fn = Math.floor(fn / 2);
        sn = Math.floor(sn / 2);
      }
    } else {
      r = nodeHash(r, sibling, hasher);
    }
    fn = Math.floor(fn / 2);
    sn = Math.floor(sn / 2);
  }

  // A well-formed path is exactly long enough: too short and `sn` never reaches 0.
  return sn === 0 ? r : undefined;
}

/** Recompute and compare against the expected (signed) root. */
export function verifyInclusionProof(
  proof: InclusionProof,
  expectedRoot: Uint8Array,
  hasher: IHasher,
): boolean {
  const recomputed = recomputeRootFromProof(proof, hasher);
  return recomputed !== undefined && bytesEqual(recomputed, expectedRoot);
}
