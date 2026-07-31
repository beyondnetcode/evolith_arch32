/**
 * GT-588 — signing key material, and the one honest way to get some.
 *
 * READ THIS BEFORE WIRING ANYTHING. Evolith does not own a signing key and this
 * repository does not contain one. There is no key file here, no embedded PEM, no
 * environment-variable default that quietly becomes the production identity. The
 * ONLY two ways to obtain a {@link SigningKeyMaterial}:
 *
 *   1. {@link externalSigningKey} — the deployment hands in a `KeyObject` it got
 *      from wherever it keeps custody (a KMS, an HSM, a mounted secret, a hardware
 *      token). Evolith never reads, stores or logs the private key; it calls
 *      `sign()` on an object it was given. Marked `external-custody`.
 *
 *   2. {@link createDevelopmentSigningKey} — an EPHEMERAL keypair generated in
 *      memory at construction, never written to disk, different on every process
 *      start. Marked `development`, with a `keyId` that says so in words, and it
 *      refuses to construct under `NODE_ENV=production`. It exists so the tests and
 *      the CLI have something to exercise, and so the governance rule has something
 *      to REJECT. A ledger signed with it is internally consistent and evidentially
 *      worthless, and every layer above says so rather than rounding it up.
 *
 * There is deliberately no third option and no default. A caller that wants signed
 * decisions in production must pass a key in.
 */

import { generateKeyPairSync, randomBytes, type KeyObject } from 'node:crypto';

import type { IdentityAssurance, SigningIdentity } from '../../domain/transparency/transparency-statement';
import { COSE_ALG_EDDSA } from './cose';

export interface SigningKeyMaterial {
  readonly identity: SigningIdentity;
  readonly privateKey: KeyObject;
  readonly publicKey: KeyObject;
}

/**
 * Wrap key material whose custody lives OUTSIDE Evolith.
 *
 * @param keyId  COSE `kid` the receipts will carry — must match whatever the
 *               relying party's trust anchor set uses to look the key up.
 * @param issuer RFC 9943 `iss` this key speaks for (e.g. `https://evolith.example`).
 */
export function externalSigningKey(params: {
  keyId: string;
  issuer: string;
  privateKey: KeyObject;
  publicKey: KeyObject;
}): SigningKeyMaterial {
  if (!params.keyId?.trim()) throw new Error('signing key: keyId is required');
  if (!params.issuer?.trim()) throw new Error('signing key: issuer is required');
  return {
    identity: {
      keyId: params.keyId,
      issuer: params.issuer,
      assurance: 'external-custody' satisfies IdentityAssurance,
      algorithm: COSE_ALG_EDDSA,
      publicKeySpki: params.publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
    },
    privateKey: params.privateKey,
    publicKey: params.publicKey,
  };
}

/** The `kid` prefix a development key always carries. Grep-able, and checked by tests. */
export const DEVELOPMENT_KEY_ID_PREFIX = 'urn:evolith:development-key:NOT-A-PRODUCTION-IDENTITY:';

/** The `iss` a development key always claims. Never a resolvable production issuer. */
export const DEVELOPMENT_ISSUER = 'urn:evolith:development-issuer:NOT-A-PRODUCTION-IDENTITY';

/**
 * Mint an ephemeral development identity.
 *
 * Ephemeral by construction: the private key exists only in this process's memory
 * for the lifetime of the process, is never serialised, and is regenerated on every
 * call — so a ledger written in one run cannot be verified against a key from
 * another, which is the correct and instructive failure.
 */
export function createDevelopmentSigningKey(options: { role?: string } = {}): SigningKeyMaterial {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'GT-588: the development signer refuses to run under NODE_ENV=production. ' +
      'Supply real key material through externalSigningKey() instead.',
    );
  }
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const role = options.role ?? 'signer';
  return {
    identity: {
      keyId: `${DEVELOPMENT_KEY_ID_PREFIX}${role}:${randomBytes(8).toString('hex')}`,
      issuer: DEVELOPMENT_ISSUER,
      assurance: 'development' satisfies IdentityAssurance,
      algorithm: COSE_ALG_EDDSA,
      publicKeySpki: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
    },
    privateKey,
    publicKey,
  };
}

/** True when an identity is one this module minted for development. */
export function isDevelopmentIdentity(identity: SigningIdentity): boolean {
  return identity.assurance === 'development'
    || identity.keyId.startsWith(DEVELOPMENT_KEY_ID_PREFIX)
    || identity.issuer === DEVELOPMENT_ISSUER;
}
