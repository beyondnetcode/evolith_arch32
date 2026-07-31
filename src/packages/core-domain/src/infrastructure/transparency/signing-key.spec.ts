/**
 * GT-588 — the development signer must be impossible to mistake for a real identity.
 *
 * These assertions are the guard rail around the part of this gap that cannot be
 * finished in the repository: nobody should be able to ship the development key by
 * accident, and no reader of a ledger should have to guess whether they are looking
 * at one.
 */

import { generateKeyPairSync } from 'node:crypto';

import {
  DEVELOPMENT_ISSUER,
  DEVELOPMENT_KEY_ID_PREFIX,
  createDevelopmentSigningKey,
  externalSigningKey,
  isDevelopmentIdentity,
} from './signing-key';

describe('GT-588 · development signing identity', () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('labels itself "development", never "external-custody"', () => {
    expect(createDevelopmentSigningKey().identity.assurance).toBe('development');
  });

  it('says NOT-A-PRODUCTION-IDENTITY in the kid and the issuer', () => {
    const { identity } = createDevelopmentSigningKey({ role: 'issuer' });
    expect(identity.keyId).toContain('NOT-A-PRODUCTION-IDENTITY');
    expect(identity.keyId.startsWith(DEVELOPMENT_KEY_ID_PREFIX)).toBe(true);
    expect(identity.issuer).toBe(DEVELOPMENT_ISSUER);
    expect(isDevelopmentIdentity(identity)).toBe(true);
  });

  it('is ephemeral: two calls never produce the same key', () => {
    const a = createDevelopmentSigningKey();
    const b = createDevelopmentSigningKey();
    expect(a.identity.keyId).not.toBe(b.identity.keyId);
    expect(a.identity.publicKeySpki).not.toBe(b.identity.publicKeySpki);
  });

  it('REFUSES to construct under NODE_ENV=production', () => {
    process.env.NODE_ENV = 'production';
    expect(() => createDevelopmentSigningKey()).toThrow(/refuses to run under NODE_ENV=production/);
  });

  it('does not read a key from the environment or the filesystem', () => {
    // There is no env var and no path that turns into a production identity: the
    // only route is externalSigningKey(), which takes the KeyObject directly.
    process.env.EVOLITH_SIGNING_KEY = 'pretend-this-is-a-key';
    try {
      expect(createDevelopmentSigningKey().identity.assurance).toBe('development');
    } finally {
      delete process.env.EVOLITH_SIGNING_KEY;
    }
  });
});

describe('GT-588 · externally-custodied signing identity', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');

  it('carries the caller-supplied kid and issuer with external-custody assurance', () => {
    const key = externalSigningKey({
      keyId: 'kms://evolith/prod/issuer-1',
      issuer: 'https://evolith.example',
      privateKey,
      publicKey,
    });
    expect(key.identity.assurance).toBe('external-custody');
    expect(key.identity.keyId).toBe('kms://evolith/prod/issuer-1');
    expect(key.identity.issuer).toBe('https://evolith.example');
    expect(isDevelopmentIdentity(key.identity)).toBe(false);
  });

  it('exports only the PUBLIC key alongside the identity', () => {
    const key = externalSigningKey({ keyId: 'k', issuer: 'i', privateKey, publicKey });
    expect(key.identity.publicKeySpki).toBe(publicKey.export({ type: 'spki', format: 'der' }).toString('base64'));
    // The identity object must not carry private material anywhere.
    expect(JSON.stringify(key.identity)).not.toContain('PRIVATE');
  });

  it('rejects a blank kid or issuer rather than signing anonymously', () => {
    expect(() => externalSigningKey({ keyId: '  ', issuer: 'i', privateKey, publicKey })).toThrow(/keyId is required/);
    expect(() => externalSigningKey({ keyId: 'k', issuer: '', privateKey, publicKey })).toThrow(/issuer is required/);
  });
});
