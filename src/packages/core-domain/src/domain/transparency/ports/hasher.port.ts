/**
 * GT-588 — the single cryptographic primitive the domain's Merkle math needs.
 *
 * The RFC 9162 tree algorithms in `../merkle.ts` are pure logic and belong in the
 * domain; SHA-256 itself does not. This port is the seam: the domain owns WHAT is
 * hashed and in what order, an adapter owns HOW.
 */
export interface IHasher {
  /** Hash algorithm name, for diagnostics and the COSE `vds` mapping (e.g. 'sha-256'). */
  readonly algorithm: string;
  /** Digest of `input`. Must be deterministic and collision-resistant. */
  hash(input: Uint8Array): Uint8Array;
}
