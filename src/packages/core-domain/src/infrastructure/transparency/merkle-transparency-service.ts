/**
 * GT-588 — the RFC 9943 Transparency Service role, backed by an RFC 9162 Merkle log.
 *
 * Registers a Signed Statement as a new leaf, then issues an RFC 9942 Receipt: a
 * detached-payload COSE_Sign1 over the new tree head, with `vds` (395) = 1
 * (`RFC9162_SHA256`) in the protected header and the inclusion proof under
 * `vdp` (396) at label −1.
 *
 * HONEST LIMITATION, stated where the code is rather than only in a report: RFC 9943
 * puts this role in an entity SEPARATE from the Issuer, and a Transparency Service
 * co-located with the Issuer — same process, same deployment, frequently the same
 * key — provides tamper-EVIDENCE and not non-repudiation. It will catch an edit made
 * after the fact, by anyone who does not also hold the signing key. It will not catch
 * the party that holds the key rewriting its own history, because that party can
 * re-sign every leaf and every head. Splitting the roles is a deployment decision
 * (point `ITransparencyService` at a remote service); the seam is here so that
 * decision does not require a rewrite.
 */

import { sign as nodeSign } from 'node:crypto';

import { fromBase64, toBase64, toHex } from '../../domain/transparency/codec';
import { inclusionPath, merkleTreeHead } from '../../domain/transparency/merkle';
import type { IHasher } from '../../domain/transparency/ports/hasher.port';
import type { ITransparencyService } from '../../domain/transparency/ports/statement-signer.port';
import type {
  SignedStatement,
  SigningIdentity,
  TransparentStatement,
} from '../../domain/transparency/transparency-statement';
import { CborMap, encodeCbor } from './cbor';
import {
  COSE_HEADER,
  VDS_RFC9162_SHA256,
  encodeCoseSign1,
  inclusionProofHeader,
  sigStructure,
} from './cose';
import type { SigningKeyMaterial } from './signing-key';
import { utf8Bytes } from '../../domain/transparency/codec';

export class MerkleTransparencyService implements ITransparencyService {
  /** Raw COSE_Sign1 bytes of every registered statement, in append order. */
  private readonly leaves: Uint8Array[] = [];

  constructor(
    private readonly key: SigningKeyMaterial,
    private readonly hasher: IHasher,
    /** Existing log entries to continue from, so restarts do not fork the tree. */
    seedStatementsCose: readonly string[] = [],
  ) {
    for (const cose of seedStatementsCose) this.leaves.push(fromBase64(cose));
  }

  get identity(): SigningIdentity {
    return this.key.identity;
  }

  get treeSize(): number {
    return this.leaves.length;
  }

  async register(statement: SignedStatement): Promise<TransparentStatement> {
    const entryBytes = fromBase64(statement.cose);
    const leafIndex = this.leaves.length;
    this.leaves.push(entryBytes);

    const treeSize = this.leaves.length;
    const root = merkleTreeHead(this.leaves, this.hasher);
    const path = inclusionPath(this.leaves, leafIndex, this.hasher);

    const protectedHeader = new CborMap([
      [COSE_HEADER.alg, this.key.identity.algorithm],
      [COSE_HEADER.kid, utf8Bytes(this.key.identity.keyId)],
      [COSE_HEADER.vds, VDS_RFC9162_SHA256],
    ]);
    const protectedBytes = encodeCbor(protectedHeader);

    // RFC 9942: the receipt payload SHOULD be detached. The tree head therefore
    // appears only inside the Sig_structure and is supplied to the verifier
    // out-of-band — here, as the `treeRoot` the ledger line carries and that
    // `verifyReceiptChain` independently recomputes before trusting it.
    const toBeSigned = sigStructure(protectedBytes, root);
    const signature = new Uint8Array(nodeSign(null, toBeSigned, this.key.privateKey));

    const receiptCose = toBase64(encodeCoseSign1({
      protectedBytes,
      unprotectedHeader: inclusionProofHeader({ treeSize, leafIndex, inclusionPath: path }),
      signature,
    }));

    return {
      // The Signed Statement is passed through UNCHANGED — including its Issuer
      // identity. A Transparency Service that rewrote the issuer would be attesting
      // to something it did not receive.
      statement,
      receipt: {
        statementId: statement.statementId,
        leafIndex,
        treeSize,
        treeRoot: toHex(root),
        cose: receiptCose,
        identity: this.key.identity,
      },
    };
  }
}
