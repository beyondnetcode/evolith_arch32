/**
 * GT-588 — the signing seam.
 *
 * THE POINT OF THIS FILE. Evolith has no signing key and must not invent one. The
 * only honest way to ship this capability is to make the signer an INJECTED
 * dependency whose identity describes its own assurance level, so that:
 *
 *   - a deployment that supplies a real key gets real signatures, and
 *   - a deployment that supplies nothing gets a development identity that says so
 *     out loud and that the governance rule refuses to accept as production.
 *
 * There is no default. A caller that wants signed decisions must hand a signer in.
 */

import type {
  DecisionStatement,
  SignedStatement,
  SigningIdentity,
  TransparentStatement,
} from '../transparency-statement';

/** Signs decision statements as a single Issuer identity (RFC 9943 Issuer role). */
export interface IStatementSigner {
  readonly identity: SigningIdentity;
  /** Produce a COSE_Sign1 Signed Statement over the canonical bytes of `decision`. */
  signStatement(decision: DecisionStatement): Promise<SignedStatement>;
}

/**
 * The RFC 9943 Transparency Service role: maintains the append-only Verifiable Data
 * Structure and endorses its state by signing tree heads.
 *
 * Kept SEPARATE from {@link IStatementSigner} on purpose. RFC 9943 puts registration
 * in a different entity from issuance, and collapsing the two into one interface
 * would make it impossible to tell, later, whether a deployment actually separated
 * them. A development wiring may pass the same key to both — and then it is visibly
 * the same `keyId` in both identities, which is precisely what the governance rule
 * checks.
 */
export interface ITransparencyService {
  readonly identity: SigningIdentity;
  /**
   * Register a Signed Statement in the append-only log and return the Transparent
   * Statement (Signed Statement + Receipt) for it.
   */
  register(statement: SignedStatement): Promise<TransparentStatement>;
}
