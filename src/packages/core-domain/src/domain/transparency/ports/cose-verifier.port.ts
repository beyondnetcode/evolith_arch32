/**
 * GT-588 — the verification seam.
 *
 * The domain decides what a valid receipt CHAIN is (`../receipt-chain-verifier.ts`);
 * this port supplies the two things it cannot compute itself without importing
 * crypto: whether a COSE_Sign1 signature checks out, and what the signed bytes were.
 *
 * Verification is intentionally SYNCHRONOUS and takes no network: `audit verify` must
 * work offline, on a laptop, against a file — a verifier that phoned home for a key
 * would make the criterion unmeetable by construction.
 */

/** Result of verifying a Signed Statement (attached payload). */
export interface SignedStatementVerification {
  readonly signatureValid: boolean;
  /** The bytes that were signed, recovered from the COSE_Sign1 payload. */
  readonly payload?: Uint8Array;
  /** COSE `kid` from the protected header. */
  readonly keyId?: string;
  /** RFC 9943 `iss` from the CWT claims in the protected header. */
  readonly issuer?: string;
  /** Why verification failed, when it did. */
  readonly reason?: string;
}

/** Decoded + verified RFC 9942 receipt. */
export interface ReceiptVerification {
  readonly signatureValid: boolean;
  /** RFC 9942 `vds` (395). 1 = `RFC9162_SHA256`. */
  readonly vds?: number;
  /** RFC 9162 inclusion-proof-content: tree-size. */
  readonly treeSize?: number;
  /** RFC 9162 inclusion-proof-content: leaf-index. */
  readonly leafIndex?: number;
  /** RFC 9162 inclusion-proof-content: inclusion-path. */
  readonly inclusionPath?: readonly Uint8Array[];
  readonly keyId?: string;
  readonly reason?: string;
}

/**
 * Cryptographic verification of the two COSE objects, with NO trust decisions:
 * this port never says "acceptable", only "the signature checks out under the key
 * material I was given". Whether that key material is a production identity is a
 * governance question, answered in `application/validators/governance`.
 */
export interface ICoseVerifier {
  /** Verify an attached-payload COSE_Sign1 Signed Statement. */
  verifySignedStatement(coseBase64: string): SignedStatementVerification;
  /**
   * Verify a detached-payload COSE_Sign1 Receipt against `detachedRoot` (the Merkle
   * tree head the receipt endorses) and decode its inclusion proof.
   */
  verifyReceipt(coseBase64: string, detachedRoot: Uint8Array): ReceiptVerification;
}
