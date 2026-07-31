/**
 * GT-588 — the Issuer side: COSE_Sign1 Signed Statements over decision bytes.
 *
 * Implements `IStatementSigner` with EdDSA (COSE alg −8) using key material the
 * caller supplies. The class never mints a key and never reads one from the
 * environment or the filesystem; see `signing-key.ts`.
 */

import { sign as nodeSign } from 'node:crypto';

import { canonicalJson, toBase64, toHex, utf8Bytes } from '../../domain/transparency/codec';
import type { IHasher } from '../../domain/transparency/ports/hasher.port';
import type { IStatementSigner } from '../../domain/transparency/ports/statement-signer.port';
import type {
  DecisionStatement,
  SignedStatement,
  SigningIdentity,
} from '../../domain/transparency/transparency-statement';
import { CborMap, encodeCbor } from './cbor';
import {
  COSE_HEADER,
  CWT_CLAIM,
  SCITT_STATEMENT_CONTENT_TYPE,
  encodeCoseSign1,
  sigStructure,
} from './cose';
import type { SigningKeyMaterial } from './signing-key';

export class Ed25519StatementSigner implements IStatementSigner {
  constructor(
    private readonly key: SigningKeyMaterial,
    private readonly hasher: IHasher,
  ) {}

  get identity(): SigningIdentity {
    return this.key.identity;
  }

  async signStatement(decision: DecisionStatement): Promise<SignedStatement> {
    // The payload is the CANONICAL serialisation, not `JSON.stringify` of whatever
    // object happened to be passed: verification re-derives these bytes from the
    // readable ledger line, and it must land on the same bytes every time.
    const payload = utf8Bytes(canonicalJson(decision));

    const protectedHeader = new CborMap([
      [COSE_HEADER.alg, this.key.identity.algorithm],
      [COSE_HEADER.content_type, SCITT_STATEMENT_CONTENT_TYPE],
      [COSE_HEADER.kid, utf8Bytes(this.key.identity.keyId)],
      [COSE_HEADER.cwt_claims, new CborMap([
        [CWT_CLAIM.iss, this.key.identity.issuer],
        [CWT_CLAIM.sub, decision.subject],
      ])],
    ]);

    // Encode ONCE: the bytes that go into the Sig_structure must be the same bytes
    // the envelope carries, or a verifier that re-reads the envelope checks a
    // different message than the one that was signed.
    const protectedBytes = encodeCbor(protectedHeader);
    const toBeSigned = sigStructure(protectedBytes, payload);
    // Ed25519 takes a null algorithm argument in Node's one-shot sign API.
    const signature = new Uint8Array(nodeSign(null, toBeSigned, this.key.privateKey));

    const cose = encodeCoseSign1({ protectedBytes, payload, signature });
    return {
      statementId: decision.statementId,
      issuer: this.key.identity.issuer,
      subject: decision.subject,
      cose: toBase64(cose),
      statementHash: toHex(this.hasher.hash(cose)),
      identity: this.key.identity,
    };
  }
}
