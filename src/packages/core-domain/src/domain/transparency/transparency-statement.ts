/**
 * GT-588 — the canonical shapes of a signed decision and its transparency receipt.
 *
 * WHAT THIS FIXES. `Provenance{collectedBy, adapterVersion, artifactHash, timestamp}`
 * is mandatory on every `Evidence`, and it is entirely self-asserted: an
 * `artifactHash` a producer computes over its own output proves that the producer
 * hashed something, not that nobody changed it afterwards. GT-576 downgraded the
 * Pillar-1 "immutable audit trails" claim from `Validated` to `Designed` for exactly
 * that reason. A record becomes tamper-EVIDENT only when a third party can recompute
 * the binding without trusting the producer.
 *
 * WHAT SHAPE. RFC 9943 (*An Architecture for Trustworthy and Transparent Digital
 * Supply Chains*, Standards Track, June 2026) defines the three roles used here:
 *
 *   - a **Signed Statement** — a COSE_Sign1 message an Issuer makes about an Artifact;
 *   - a **Receipt** — a COSE Single Signer Data Object proving the Signed Statement
 *     was registered in a Verifiable Data Structure. RFC 9943 does NOT define the
 *     receipt encoding; it delegates to **RFC 9942** (*COSE Receipts*), which is where
 *     the `vds` (395) / `vdp` (396) headers and the `RFC9162_SHA256` verifiable data
 *     structure (value 1, inclusion proof at label −1) actually live;
 *   - a **Transparent Statement** — a Signed Statement augmented with its Receipt.
 *
 * WHAT IS DELIBERATELY *NOT* CLAIMED HERE. RFC 9943 places the Receipt-issuing
 * authority in a **Transparency Service** — an entity SEPARATE from the Issuer that
 * maintains the append-only log and endorses its state. A statement and a receipt
 * produced by the same process, with the same key, is a self-attestation with extra
 * ceremony: it detects accident and after-the-fact edits, and it does NOT establish
 * non-repudiation against the party that produced it. The types below therefore keep
 * the Issuer identity and the Transparency Service identity as separate fields even
 * when a development deployment happens to fill both with the same key, so the
 * governance rule can tell the difference and refuse to call it non-repudiation.
 *
 * LAYERING. Everything here is PURE. `cose` members are opaque base64 blobs to the
 * domain; encoding, hashing and signing live in `infrastructure/transparency/*`
 * behind the ports in `./ports`. That is not ceremony — a `node:crypto` import in
 * this layer is a boundary violation the package's ESLint config exists to catch.
 */

/** Lowercase hex SHA-256 digest. */
export type HexDigest = string;

/**
 * The decision content a statement is made ABOUT — the readable half of a ledger
 * entry, kept alongside the signed bytes so a reviewer can read the log without a
 * CBOR decoder AND so `audit verify` can prove the readable copy still matches the
 * signed one.
 */
export interface DecisionStatement {
  /** Stable id of the decision (mirrors `AuditEntry.id`). */
  readonly statementId: string;
  /** RFC 9943 `sub` — what the decision is about (gate id, evaluation subject, …). */
  readonly subject: string;
  /** Event/decision type (mirrors `AuditEntry.eventType`). */
  readonly eventType: string;
  /** Canonical verdict when the decision produced one (`PASS` | `FAIL` | …). */
  readonly verdict?: string;
  /** ISO-8601 instant the decision occurred. */
  readonly occurredAt: string;
  /** Tenant the decision belongs to, when scoped. */
  readonly tenantId?: string;
  /** Actor that triggered the decision. */
  readonly actor?: string;
  /** Arbitrary JSON-serialisable decision detail. */
  readonly payload?: unknown;
}

/** How trustworthy the identity behind a signature is — see {@link SigningIdentity}. */
export type IdentityAssurance =
  /** An ephemeral key this process minted for itself. Never a production identity. */
  | 'development'
  /** A key supplied by the deployment (KMS, HSM, file) whose custody is external. */
  | 'external-custody';

/**
 * The identity a signer signs as.
 *
 * `assurance` is the field that makes the key-custody question un-hideable: a
 * development signer cannot describe itself as anything but `development`, and the
 * governance rule reads this, not a comment.
 */
export interface SigningIdentity {
  /** COSE `kid` — key identifier, carried in the protected header. */
  readonly keyId: string;
  /** RFC 9943 `iss` — the issuer this key speaks for. */
  readonly issuer: string;
  readonly assurance: IdentityAssurance;
  /** COSE algorithm identifier (e.g. −8 = EdDSA). */
  readonly algorithm: number;
  /**
   * base64 SPKI of the public key, when the ledger CARRIES its own verification key.
   *
   * Present so a ledger can be checked for internal consistency by someone with no
   * key distribution at all. It is worth being blunt about what that is worth: a key
   * a file asserts about itself proves that the file is self-consistent and NOTHING
   * about who signed it — anyone who can rewrite the ledger can rewrite this field
   * and re-sign every line. It is a convenience for development and for detecting
   * accidental corruption. Real verification requires a trust anchor supplied
   * OUT OF BAND, which is why `audit verify` takes `--trust-anchors` and reports
   * loudly when it had to fall back to this field.
   */
  readonly publicKeySpki?: string;
}

/** RFC 9943 §Terminology — a Signed Statement (COSE_Sign1 over the decision bytes). */
export interface SignedStatement {
  readonly statementId: string;
  readonly issuer: string;
  readonly subject: string;
  /** base64 COSE_Sign1 bytes. Opaque to the domain. */
  readonly cose: string;
  /** Hex SHA-256 of the COSE_Sign1 bytes — the log entry this statement contributes. */
  readonly statementHash: HexDigest;
  readonly identity: SigningIdentity;
}

/**
 * RFC 9942 — a Receipt: a COSE_Sign1 with a DETACHED payload (the Merkle tree head),
 * `vds` (395) = 1 (`RFC9162_SHA256`) in the protected header and an inclusion proof
 * under `vdp` (396) at label −1 in the unprotected header.
 */
export interface Receipt {
  readonly statementId: string;
  /** 0-based leaf index of the statement in the append-only log. */
  readonly leafIndex: number;
  /** Number of leaves the signed tree head covers. */
  readonly treeSize: number;
  /** Hex Merkle tree head (RFC 9162 MTH) the receipt signs as its detached payload. */
  readonly treeRoot: HexDigest;
  /** base64 COSE_Sign1 receipt bytes. Opaque to the domain. */
  readonly cose: string;
  /** The Transparency Service identity that registered the statement. */
  readonly identity: SigningIdentity;
}

/** RFC 9943 §Terminology — a Signed Statement augmented with a Receipt. */
export interface TransparentStatement {
  readonly statement: SignedStatement;
  readonly receipt: Receipt;
}

/**
 * One line of the append-only ledger: the readable decision, plus the signed
 * statement and the receipt that make it checkable by someone who was not there.
 */
export interface TransparencyLedgerEntry {
  readonly decision: DecisionStatement;
  readonly transparentStatement: TransparentStatement;
}
