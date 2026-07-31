/**
 * GT-588 — the verification adapter: does this COSE_Sign1 check out, under which key?
 *
 * TRUST ANCHORS ARE THE WHOLE ARGUMENT. A verifier that takes its public key from
 * the same file it is verifying proves only that the file is internally consistent —
 * whoever rewrote the ledger could rewrite the key alongside it. So this class is
 * constructed with an EXPLICIT anchor set, and a caller that has none must say so by
 * constructing it in `self-asserted` mode. That mode still catches accidental
 * corruption and after-the-fact edits by anyone without the key, and it is reported
 * upward as `self-asserted` so no surface can present it as third-party verification.
 *
 * Offline by construction: no key resolution over the network, ever.
 */

import { createPublicKey, verify as nodeVerify, type KeyObject } from 'node:crypto';

import { fromBase64 } from '../../domain/transparency/codec';
import type {
  ICoseVerifier,
  ReceiptVerification,
  SignedStatementVerification,
} from '../../domain/transparency/ports/cose-verifier.port';
import { COSE_HEADER, decodeCoseSign1, readInclusionProof, readIssuer, sigStructure } from './cose';

/** Where the public key used for verification came from. */
export type TrustAnchorMode =
  /** Keys supplied out of band by the relying party. The only mode that means anything. */
  | 'anchored'
  /** Keys taken from the artefact being verified. Consistency only, NOT identity. */
  | 'self-asserted';

export interface TrustAnchor {
  /** COSE `kid` this key answers to. */
  readonly keyId: string;
  /** base64 SPKI DER of the Ed25519 public key. */
  readonly publicKeySpki: string;
}

export class Ed25519CoseVerifier implements ICoseVerifier {
  private readonly keys = new Map<string, KeyObject>();

  constructor(
    anchors: readonly TrustAnchor[],
    /** Declared for the record — surfaces must report it alongside the verdict. */
    readonly mode: TrustAnchorMode,
  ) {
    for (const anchor of anchors) {
      try {
        this.keys.set(anchor.keyId, createPublicKey({
          key: Buffer.from(anchor.publicKeySpki, 'base64'),
          format: 'der',
          type: 'spki',
        }));
      } catch (error) {
        throw new Error(
          `trust anchor for kid "${anchor.keyId}" is not a usable SPKI public key: ` +
          `${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  verifySignedStatement(coseBase64: string): SignedStatementVerification {
    let decoded;
    try {
      decoded = decodeCoseSign1(fromBase64(coseBase64));
    } catch (error) {
      return { signatureValid: false, reason: describe(error) };
    }

    const keyId = readKeyId(decoded.protectedHeader.get(COSE_HEADER.kid));
    const issuer = readIssuer(decoded.protectedHeader);
    if (!decoded.payload) {
      return { signatureValid: false, keyId, issuer, reason: 'signed statement has no attached payload' };
    }

    const key = keyId ? this.keys.get(keyId) : undefined;
    if (!key) {
      return {
        signatureValid: false,
        payload: decoded.payload,
        keyId,
        issuer,
        reason: keyId
          ? `no trust anchor for kid "${keyId}"`
          : 'signed statement carries no kid in its protected header',
      };
    }

    const ok = safeVerify(sigStructure(decoded.protectedBytes, decoded.payload), decoded.signature, key);
    return {
      signatureValid: ok,
      payload: decoded.payload,
      keyId,
      issuer,
      ...(ok ? {} : { reason: 'Ed25519 signature does not verify under the anchored key' }),
    };
  }

  verifyReceipt(coseBase64: string, detachedRoot: Uint8Array): ReceiptVerification {
    let decoded;
    try {
      decoded = decodeCoseSign1(fromBase64(coseBase64));
    } catch (error) {
      return { signatureValid: false, reason: describe(error) };
    }

    const keyId = readKeyId(decoded.protectedHeader.get(COSE_HEADER.kid));
    const vdsValue = decoded.protectedHeader.get(COSE_HEADER.vds);
    const vds = typeof vdsValue === 'number' ? vdsValue : undefined;

    let proof;
    try {
      proof = readInclusionProof(decoded.unprotectedHeader);
    } catch (error) {
      return { signatureValid: false, keyId, vds, reason: describe(error) };
    }

    const key = keyId ? this.keys.get(keyId) : undefined;
    const base = {
      keyId,
      vds,
      ...(proof
        ? { treeSize: proof.treeSize, leafIndex: proof.leafIndex, inclusionPath: proof.inclusionPath }
        : {}),
    };
    if (!key) {
      return {
        ...base,
        signatureValid: false,
        reason: keyId ? `no trust anchor for kid "${keyId}"` : 'receipt carries no kid',
      };
    }

    // Detached payload: the tree head is supplied by the caller, never read from the
    // envelope — which is what makes it impossible to swap a root into the receipt.
    const ok = safeVerify(sigStructure(decoded.protectedBytes, detachedRoot), decoded.signature, key);
    return {
      ...base,
      signatureValid: ok,
      ...(ok ? {} : { reason: 'Ed25519 signature does not verify over the supplied tree head' }),
    };
  }
}

function readKeyId(value: unknown): string | undefined {
  if (value instanceof Uint8Array) return new TextDecoder().decode(value);
  return typeof value === 'string' ? value : undefined;
}

function safeVerify(message: Uint8Array, signature: Uint8Array, key: KeyObject): boolean {
  try {
    return nodeVerify(null, message, key, signature);
  } catch {
    return false;
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
