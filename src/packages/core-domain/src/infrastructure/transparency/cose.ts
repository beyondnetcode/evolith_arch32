/**
 * GT-588 — COSE_Sign1 encoding for SCITT Signed Statements and RFC 9942 Receipts.
 *
 * WHAT THE STANDARDS ACTUALLY SAY (checked against the published RFCs, not against
 * the gap row, which attributes the receipt encoding to the wrong document):
 *
 *  - **RFC 9943** — *An Architecture for Trustworthy and Transparent Digital Supply
 *    Chains*, Standards Track, June 2026. Defines the ROLES and the flow: an Issuer
 *    produces a **Signed Statement** (a COSE_Sign1 about an Artifact); a
 *    **Transparency Service** registers it in a Verifiable Data Structure and returns
 *    a **Receipt**; the pair is a **Transparent Statement**. It explicitly does NOT
 *    define the receipt encoding — it defers to RFC 9942.
 *
 *  - **RFC 9942** — *CBOR Object Signing and Encryption (COSE) Receipts*, Standards
 *    Track, June 2026. Defines the receipt bytes: `vds` (label **395**) in the
 *    PROTECTED header names the verifiable data structure, `vdp` (label **396**) in
 *    the UNPROTECTED header carries the proofs, inclusion proofs sit at label **−1**
 *    as an array of `bstr .cbor RFC9162_SHA256_Inclusion_Proof_Content`, and that
 *    content is `[tree-size: uint, leaf-index: uint, inclusion-path: [+ bstr]]`.
 *    The initial registry entry `RFC9162_SHA256` has value **1**. The receipt
 *    payload SHOULD be detached, so the tree head is supplied to the verifier
 *    out-of-band and appears only inside the `Sig_structure`.
 *
 *  - **RFC 9162** — the SHA-256 binary Merkle tree those proofs are over. Implemented
 *    in the domain layer (`domain/transparency/merkle.ts`).
 *
 * WHAT THIS MODULE IS NOT. It writes and reads the COSE_Sign1 structures above; it
 * is not a full COSE implementation. Only EdDSA (alg −8) is wired, because only
 * Ed25519 is available from `node:crypto` without a dependency, and the signature
 * algorithm is a deployment choice the signer port already abstracts.
 */

import { CborMap, CborTag, decodeCbor, encodeCbor, type CborValue } from './cbor';

/** COSE_Sign1 CBOR tag (RFC 9052 §2). */
export const COSE_SIGN1_TAG = 18;

/** COSE header labels used here (RFC 9052 §3.1, RFC 9942 §Registrations). */
export const COSE_HEADER = {
  alg: 1,
  content_type: 3,
  kid: 4,
  /** RFC 9597 CWT Claims in COSE headers — SCITT carries `iss`/`sub` here. */
  cwt_claims: 15,
  typ: 16,
  /** RFC 9942 — verifiable data structure identifier (protected). */
  vds: 395,
  /** RFC 9942 — verifiable data structure proofs (unprotected). */
  vdp: 396,
} as const;

/** RFC 9942 proof-type label for an inclusion proof inside `vdp`. */
export const VDP_INCLUSION_PROOF = -1;

/** RFC 9942 verifiable data structure registry: SHA-256 binary Merkle tree. */
export const VDS_RFC9162_SHA256 = 1;

/** COSE algorithm registry: EdDSA. */
export const COSE_ALG_EDDSA = -8;

/** CWT claim keys (RFC 8392): 1 = iss, 2 = sub. */
export const CWT_CLAIM = { iss: 1, sub: 2 } as const;

export const SCITT_STATEMENT_CONTENT_TYPE = 'application/vnd.evolith.decision+json';

/** The bytes a signature is computed over (RFC 9052 §4.4 `Sig_structure`). */
export function sigStructure(protectedHeaderBytes: Uint8Array, payload: Uint8Array): Uint8Array {
  return encodeCbor([
    'Signature1',
    protectedHeaderBytes,
    new Uint8Array(0), // external_aad — unused
    payload,
  ]);
}

export interface CoseSign1 {
  readonly protectedBytes: Uint8Array;
  readonly protectedHeader: CborMap;
  readonly unprotectedHeader: CborMap;
  /** `undefined` when the payload is detached (encoded as CBOR null). */
  readonly payload?: Uint8Array;
  readonly signature: Uint8Array;
}

/**
 * Assemble a tagged COSE_Sign1. `payload === undefined` produces a detached payload.
 *
 * Takes the ALREADY-ENCODED protected header rather than the map, so the caller can
 * feed the identical bytes to {@link sigStructure}. Re-encoding here would be
 * byte-identical (the encoder is deterministic) but would leave the invariant
 * implicit; this makes it structural.
 */
export function encodeCoseSign1(input: {
  protectedBytes: Uint8Array;
  unprotectedHeader?: CborMap;
  payload?: Uint8Array;
  signature: Uint8Array;
}): Uint8Array {
  return encodeCbor(
    new CborTag(COSE_SIGN1_TAG, [
      input.protectedBytes,
      input.unprotectedHeader ?? new CborMap([]),
      input.payload ?? null,
      input.signature,
    ] as CborValue[]),
  );
}

/** Parse a tagged (or untagged) COSE_Sign1. Throws on anything else. */
export function decodeCoseSign1(bytes: Uint8Array): CoseSign1 {
  const decoded = decodeCbor(bytes);
  const body = decoded instanceof CborTag
    ? (decoded.tag === COSE_SIGN1_TAG
      ? decoded.value
      : (() => { throw new Error(`cose: expected tag ${COSE_SIGN1_TAG}, got ${decoded.tag}`); })())
    : decoded;

  if (!Array.isArray(body) || body.length !== 4) {
    throw new Error('cose: COSE_Sign1 must be a 4-element array');
  }
  const [protectedBytes, unprotected, payload, signature] = body as CborValue[];
  if (!(protectedBytes instanceof Uint8Array)) throw new Error('cose: protected header must be a bstr');
  if (!(signature instanceof Uint8Array)) throw new Error('cose: signature must be a bstr');
  if (!(unprotected instanceof CborMap)) throw new Error('cose: unprotected header must be a map');

  const protectedHeader = protectedBytes.length === 0 ? new CborMap([]) : decodeCbor(protectedBytes);
  if (!(protectedHeader instanceof CborMap)) throw new Error('cose: protected header must encode a map');

  return {
    protectedBytes,
    protectedHeader,
    unprotectedHeader: unprotected,
    ...(payload instanceof Uint8Array ? { payload } : {}),
    signature,
  };
}

/** RFC 9942 inclusion-proof-content: `[tree-size, leaf-index, inclusion-path]`. */
export interface InclusionProofContent {
  readonly treeSize: number;
  readonly leafIndex: number;
  readonly inclusionPath: readonly Uint8Array[];
}

export function encodeInclusionProof(proof: InclusionProofContent): Uint8Array {
  return encodeCbor([proof.treeSize, proof.leafIndex, proof.inclusionPath as CborValue[]]);
}

export function decodeInclusionProof(bytes: Uint8Array): InclusionProofContent {
  const decoded = decodeCbor(bytes);
  if (!Array.isArray(decoded) || decoded.length !== 3) {
    throw new Error('cose: inclusion-proof-content must be a 3-element array');
  }
  const [treeSize, leafIndex, path] = decoded as CborValue[];
  if (typeof treeSize !== 'number' || typeof leafIndex !== 'number') {
    throw new Error('cose: tree-size and leaf-index must be integers');
  }
  if (!Array.isArray(path) || !path.every((p): p is Uint8Array => p instanceof Uint8Array)) {
    throw new Error('cose: inclusion-path must be an array of bstr');
  }
  return { treeSize, leafIndex, inclusionPath: path };
}

/** Build the RFC 9942 unprotected header carrying one inclusion proof. */
export function inclusionProofHeader(proof: InclusionProofContent): CborMap {
  return new CborMap([
    [COSE_HEADER.vdp, new CborMap([[VDP_INCLUSION_PROOF, [encodeInclusionProof(proof)]]])],
  ]);
}

/** Read back the first inclusion proof from an RFC 9942 unprotected header. */
export function readInclusionProof(unprotected: CborMap): InclusionProofContent | undefined {
  const vdp = unprotected.get(COSE_HEADER.vdp);
  if (!(vdp instanceof CborMap)) return undefined;
  const proofs = vdp.get(VDP_INCLUSION_PROOF);
  if (!Array.isArray(proofs) || proofs.length === 0) return undefined;
  const first = proofs[0];
  if (!(first instanceof Uint8Array)) return undefined;
  return decodeInclusionProof(first);
}

/** Read the CWT `iss` claim from a protected header, when present. */
export function readIssuer(protectedHeader: CborMap): string | undefined {
  const claims = protectedHeader.get(COSE_HEADER.cwt_claims);
  if (!(claims instanceof CborMap)) return undefined;
  const iss = claims.get(CWT_CLAIM.iss);
  return typeof iss === 'string' ? iss : undefined;
}
