/**
 * GT-588 — offline verification of a receipt chain.
 *
 * WHAT IT PROVES. Given only a ledger file and the public key material embedded in
 * the verifier, this decides — with no network, no log operator and no trust in the
 * producer — whether:
 *
 *   1. the readable decision in each line is byte-identical to the bytes that were
 *      actually signed (`STATEMENT_PAYLOAD_MISMATCH` otherwise);
 *   2. each Signed Statement's COSE_Sign1 signature verifies;
 *   3. each Receipt's COSE_Sign1 signature verifies over the tree head it claims;
 *   4. each Receipt's RFC 9162 inclusion proof recomputes that same tree head;
 *   5. the tree head the receipt signs is the one an INDEPENDENT recomputation over
 *      the first `treeSize` statements produces (`ROOT_MISMATCH`).
 *
 * Check 5 is what makes deletion and reordering detectable. Checks 1–4 bind a
 * statement to a root; only 5 binds the ROOT to the ledger you are holding, so a log
 * operator cannot drop line 7 and hand you a file whose remaining receipts all still
 * verify individually.
 *
 * WHAT IT DOES NOT PROVE. Nothing here establishes that the signing key belongs to
 * anyone in particular, or that the Issuer and the Transparency Service are distinct
 * parties. Both are identity questions, answered against {@link SigningIdentity} by
 * the governance rule in `application/validators/governance` — see AUD-TRANSP-04.
 * A chain signed by a development key verifies perfectly and is still worthless as
 * non-repudiation, and the two results are reported separately so nobody can mistake
 * one for the other.
 */

import { canonicalJson, fromBase64, fromHex, utf8Bytes, bytesEqual, toHex } from './codec';
import { leafHash, merkleTreeHead, verifyInclusionProof } from './merkle';
import type { IHasher } from './ports/hasher.port';
import type { ICoseVerifier } from './ports/cose-verifier.port';
import type { TransparencyLedgerEntry } from './transparency-statement';

/** RFC 9942 registry: `RFC9162_SHA256` verifiable data structure. */
export const VDS_RFC9162_SHA256 = 1;

export type ReceiptFailureCode =
  /** Leaf indices are not the contiguous run 0..n-1 — an entry was dropped or reordered. */
  | 'INDEX_NOT_CONTIGUOUS'
  /** The receipt's `treeSize` does not match its position in an append-only log. */
  | 'TREE_SIZE_MISMATCH'
  /** The receipt declares a verifiable data structure this verifier cannot check. */
  | 'UNSUPPORTED_VDS'
  /** The readable decision no longer serialises to the bytes that were signed. */
  | 'STATEMENT_PAYLOAD_MISMATCH'
  /** The Signed Statement's COSE_Sign1 signature does not verify. */
  | 'STATEMENT_SIGNATURE_INVALID'
  /** The Receipt's COSE_Sign1 signature does not verify over the claimed tree head. */
  | 'RECEIPT_SIGNATURE_INVALID'
  /** The RFC 9162 inclusion proof does not recompute the claimed tree head. */
  | 'INCLUSION_PROOF_INVALID'
  /** The claimed tree head is not the one the ledger's own statements produce. */
  | 'ROOT_MISMATCH'
  /** The ledger line is structurally unreadable (bad base64, missing member, …). */
  | 'MALFORMED_ENTRY';

export interface ReceiptFailure {
  readonly code: ReceiptFailureCode;
  /** Leaf index the failure attaches to, when it is entry-scoped. */
  readonly leafIndex?: number;
  readonly statementId?: string;
  readonly message: string;
}

export interface EntryVerification {
  readonly leafIndex: number;
  readonly statementId: string;
  readonly verified: boolean;
  readonly failures: readonly ReceiptFailure[];
}

export interface ReceiptChainVerification {
  /** True only when EVERY entry verified and the chain itself is well-formed. */
  readonly verified: boolean;
  readonly entryCount: number;
  readonly entries: readonly EntryVerification[];
  /** Chain-scoped failures (contiguity), plus every entry-scoped failure. */
  readonly failures: readonly ReceiptFailure[];
  /** Hex tree head recomputed over the whole ledger — the value to publish/compare. */
  readonly recomputedRoot?: string;
}

/**
 * Verify a whole ledger offline.
 *
 * Deliberately does NOT stop at the first failure: an auditor investigating a
 * tampered ledger needs to know how much of it is still sound, and a verifier that
 * aborts at line 1 answers "no" without answering "where".
 */
export function verifyReceiptChain(
  ledger: readonly TransparencyLedgerEntry[],
  deps: { readonly hasher: IHasher; readonly verifier: ICoseVerifier },
): ReceiptChainVerification {
  const { hasher, verifier } = deps;
  const chainFailures: ReceiptFailure[] = [];
  const entries: EntryVerification[] = [];

  if (ledger.length === 0) {
    return { verified: true, entryCount: 0, entries: [], failures: [] };
  }

  // ---- Structural pass: decode every statement into its log entry bytes ---------
  const statementBytes: (Uint8Array | undefined)[] = ledger.map((entry) => {
    try {
      return fromBase64(entry.transparentStatement.statement.cose);
    } catch {
      return undefined;
    }
  });

  // ---- Chain pass: leaf indices must be the contiguous run 0..n-1 ---------------
  for (let i = 0; i < ledger.length; i++) {
    const receipt = ledger[i].transparentStatement.receipt;
    if (receipt.leafIndex !== i) {
      chainFailures.push({
        code: 'INDEX_NOT_CONTIGUOUS',
        leafIndex: i,
        statementId: ledger[i].decision.statementId,
        message: `ledger position ${i} carries leafIndex ${receipt.leafIndex}: an entry was removed or reordered`,
      });
    }
  }

  // ---- Entry pass ---------------------------------------------------------------
  for (let i = 0; i < ledger.length; i++) {
    const entry = ledger[i];
    const { statement, receipt } = entry.transparentStatement;
    const failures: ReceiptFailure[] = [];
    const at = { leafIndex: i, statementId: entry.decision.statementId };

    const entryBytes = statementBytes[i];
    if (!entryBytes) {
      failures.push({ ...at, code: 'MALFORMED_ENTRY', message: 'signed statement is not valid base64' });
      entries.push({ ...at, verified: false, failures });
      continue;
    }

    // 1 + 2 — the signature, and whether the readable copy still matches it.
    const statementCheck = verifier.verifySignedStatement(statement.cose);
    if (!statementCheck.signatureValid) {
      failures.push({
        ...at,
        code: 'STATEMENT_SIGNATURE_INVALID',
        message: `signed statement does not verify: ${statementCheck.reason ?? 'signature mismatch'}`,
      });
    }
    if (statementCheck.payload) {
      const expected = utf8Bytes(canonicalJson(entry.decision));
      if (!bytesEqual(statementCheck.payload, expected)) {
        failures.push({
          ...at,
          code: 'STATEMENT_PAYLOAD_MISMATCH',
          message: 'the readable decision does not match the bytes that were signed',
        });
      }
    }

    // 5 — independent recomputation of the tree head over the first treeSize entries.
    const declaredSize = receipt.treeSize;
    if (declaredSize !== i + 1) {
      failures.push({
        ...at,
        code: 'TREE_SIZE_MISMATCH',
        message: `receipt declares treeSize ${declaredSize} at ledger position ${i}: an append-only log must declare ${i + 1}`,
      });
    }
    const prefix = statementBytes.slice(0, Math.min(Math.max(declaredSize, 0), ledger.length));
    const prefixComplete = prefix.length === declaredSize && prefix.every((b): b is Uint8Array => b !== undefined);
    const independentRoot = prefixComplete ? merkleTreeHead(prefix as Uint8Array[], hasher) : undefined;

    let claimedRoot: Uint8Array | undefined;
    try {
      claimedRoot = fromHex(receipt.treeRoot);
    } catch {
      failures.push({ ...at, code: 'MALFORMED_ENTRY', message: 'receipt treeRoot is not valid hex' });
    }

    if (claimedRoot && independentRoot && !bytesEqual(claimedRoot, independentRoot)) {
      failures.push({
        ...at,
        code: 'ROOT_MISMATCH',
        message:
          `receipt endorses tree head ${receipt.treeRoot} but the ledger's own statements produce ` +
          `${toHex(independentRoot)}: the ledger has been altered`,
      });
    }

    // 3 + 4 — the receipt signature over the detached root, and the inclusion proof.
    if (claimedRoot) {
      const receiptCheck = verifier.verifyReceipt(receipt.cose, claimedRoot);
      if (!receiptCheck.signatureValid) {
        failures.push({
          ...at,
          code: 'RECEIPT_SIGNATURE_INVALID',
          message: `receipt does not verify: ${receiptCheck.reason ?? 'signature mismatch'}`,
        });
      }
      if (receiptCheck.vds !== undefined && receiptCheck.vds !== VDS_RFC9162_SHA256) {
        failures.push({
          ...at,
          code: 'UNSUPPORTED_VDS',
          message: `receipt declares vds ${receiptCheck.vds}; this verifier only checks RFC9162_SHA256 (1)`,
        });
      } else if (receiptCheck.inclusionPath) {
        const ok = verifyInclusionProof(
          {
            leaf: leafHash(entryBytes, hasher),
            leafIndex: receiptCheck.leafIndex ?? receipt.leafIndex,
            treeSize: receiptCheck.treeSize ?? receipt.treeSize,
            path: receiptCheck.inclusionPath,
          },
          claimedRoot,
          hasher,
        );
        if (!ok) {
          failures.push({
            ...at,
            code: 'INCLUSION_PROOF_INVALID',
            message: 'the RFC 9162 inclusion proof does not recompute the endorsed tree head',
          });
        }
      } else if (receiptCheck.signatureValid) {
        failures.push({
          ...at,
          code: 'INCLUSION_PROOF_INVALID',
          message: 'receipt carries no inclusion proof under vdp (396) label -1',
        });
      }
    }

    entries.push({ ...at, verified: failures.length === 0, failures });
  }

  const allComplete = statementBytes.every((b): b is Uint8Array => b !== undefined);
  const recomputedRoot = allComplete ? toHex(merkleTreeHead(statementBytes as Uint8Array[], hasher)) : undefined;
  const failures = [...chainFailures, ...entries.flatMap((e) => e.failures)];

  return {
    verified: failures.length === 0,
    entryCount: ledger.length,
    entries,
    failures,
    ...(recomputedRoot ? { recomputedRoot } : {}),
  };
}
