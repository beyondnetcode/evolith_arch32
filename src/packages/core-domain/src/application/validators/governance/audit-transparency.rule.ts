/**
 * GT-588 — the governance rule that makes the ledger load-bearing.
 *
 * A transparency log nobody blocks on is a log nobody maintains. This is the rule
 * that turns a failed receipt into a FAIL verdict, expressed in the repository's own
 * canonical vocabulary (`Verdict` + `Violation`) so every surface that already
 * consumes violations — the drift gate, SARIF export, the CLI's exit codes — carries
 * it without new plumbing.
 *
 * The four rules, and why each exists:
 *
 *   AUD-TRANSP-01  There must BE a ledger. The failure mode this catches is the one
 *                  the gap describes: provenance recorded, nothing signed. An empty
 *                  or absent ledger is the default state of the system before this
 *                  gap, so it must fail rather than vacuously pass.
 *
 *   AUD-TRANSP-02  Every receipt must verify. Signature, RFC 9162 inclusion proof
 *                  and independent recomputation of the tree head — the substance of
 *                  `verifyReceiptChain`.
 *
 *   AUD-TRANSP-03  The chain must be append-only and contiguous. Separated from 02
 *                  because a deletion can leave every surviving receipt individually
 *                  valid; this is the rule that notices the gap in the numbering.
 *
 *   AUD-TRANSP-04  The signing identity must be one whose custody is external, and
 *                  the Transparency Service must not be the Issuer's own key. THIS
 *                  IS THE RULE THAT FAILS TODAY, and it is supposed to. Evolith ships
 *                  with a development signer and no key custody; a chain signed by it
 *                  verifies perfectly and establishes nothing about who signed it.
 *                  Rule 04 is the refusal to let a green 02 be read as non-repudiation.
 *                  It also fails when the verifier had to fall back to keys carried
 *                  inside the artefact being verified (`self-asserted` anchors).
 */

import { Verdict } from '../../../domain/verdict/verdict';
import { makeViolation, type Violation } from '../../../domain/violation';
import type { ReceiptChainVerification } from '../../../domain/transparency/receipt-chain-verifier';
import type { SigningIdentity } from '../../../domain/transparency/transparency-statement';

export const AUDIT_TRANSPARENCY_RULES = {
  LEDGER_PRESENT: 'AUD-TRANSP-01',
  RECEIPTS_VERIFY: 'AUD-TRANSP-02',
  APPEND_ONLY: 'AUD-TRANSP-03',
  IDENTITY_ASSURED: 'AUD-TRANSP-04',
} as const;

/** The tool label these violations carry, for SARIF and drift-gate grouping. */
export const AUDIT_TRANSPARENCY_TOOL = 'evolith-audit-transparency';

/** How the verifier obtained its public keys — see `Ed25519CoseVerifier`. */
export type TrustAnchorProvenance = 'anchored' | 'self-asserted';

export interface AuditTransparencyInput {
  /** Result of `verifyReceiptChain`, or `undefined` when there is no ledger at all. */
  readonly verification?: ReceiptChainVerification;
  /** Where the ledger was read from, for the violation's `file` field. */
  readonly ledgerPath: string;
  /** Distinct identities that signed statements in the ledger. */
  readonly issuerIdentities: readonly SigningIdentity[];
  /** Distinct identities that signed receipts in the ledger. */
  readonly serviceIdentities: readonly SigningIdentity[];
  readonly trustAnchors: TrustAnchorProvenance;
}

export interface AuditTransparencyResult {
  readonly verdict: Verdict;
  readonly violations: readonly Violation[];
  /**
   * True when the receipts verify cryptographically — reported SEPARATELY from the
   * verdict so a caller can never present "the maths checks out" as "this is
   * non-repudiable evidence". Rule 04 is the difference between them.
   */
  readonly cryptographicallyIntact: boolean;
}

export function evaluateAuditTransparency(input: AuditTransparencyInput): AuditTransparencyResult {
  const violations: Violation[] = [];
  const file = input.ledgerPath;

  // --- 01 · a ledger must exist and be non-empty ------------------------------
  if (!input.verification || input.verification.entryCount === 0) {
    violations.push(makeViolation({
      ruleId: AUDIT_TRANSPARENCY_RULES.LEDGER_PRESENT,
      tool: AUDIT_TRANSPARENCY_TOOL,
      file,
      severity: 'error',
      category: 'governance',
      message:
        'no signed transparency ledger: decisions are recorded with self-asserted provenance only, ' +
        'which is not tamper-evidence (GT-588 · GT-576 Pillar 1).',
    }));
    return { verdict: Verdict.FAIL, violations, cryptographicallyIntact: false };
  }

  const verification = input.verification;

  // --- 03 · append-only / contiguity ------------------------------------------
  const structural = verification.failures.filter(
    (f) => f.code === 'INDEX_NOT_CONTIGUOUS' || f.code === 'TREE_SIZE_MISMATCH' || f.code === 'MALFORMED_ENTRY',
  );
  for (const failure of structural) {
    violations.push(makeViolation({
      ruleId: AUDIT_TRANSPARENCY_RULES.APPEND_ONLY,
      tool: AUDIT_TRANSPARENCY_TOOL,
      file,
      ...(failure.leafIndex !== undefined && failure.leafIndex >= 0 ? { line: failure.leafIndex + 1 } : {}),
      severity: 'error',
      category: 'governance',
      message: `${failure.code}: ${failure.message}`,
    }));
  }

  // --- 02 · every receipt verifies --------------------------------------------
  const cryptographic = verification.failures.filter((f) => !structural.includes(f));
  for (const failure of cryptographic) {
    violations.push(makeViolation({
      ruleId: AUDIT_TRANSPARENCY_RULES.RECEIPTS_VERIFY,
      tool: AUDIT_TRANSPARENCY_TOOL,
      file,
      ...(failure.leafIndex !== undefined && failure.leafIndex >= 0 ? { line: failure.leafIndex + 1 } : {}),
      severity: 'error',
      category: 'governance',
      message: `${failure.code}: ${failure.message}`,
    }));
  }

  // --- 04 · the identity behind the signatures --------------------------------
  const developmentIdentities = [...input.issuerIdentities, ...input.serviceIdentities]
    .filter((identity) => identity.assurance !== 'external-custody');
  for (const identity of developmentIdentities) {
    violations.push(makeViolation({
      ruleId: AUDIT_TRANSPARENCY_RULES.IDENTITY_ASSURED,
      tool: AUDIT_TRANSPARENCY_TOOL,
      file,
      severity: 'error',
      category: 'governance',
      message:
        `statements are signed by "${identity.keyId}", whose assurance is "${identity.assurance}". ` +
        'A development identity produces a self-consistent ledger and no evidence about who signed it. ' +
        'Supply key material under external custody (KMS/HSM/mounted secret) via externalSigningKey().',
    }));
  }

  if (input.trustAnchors === 'self-asserted') {
    violations.push(makeViolation({
      ruleId: AUDIT_TRANSPARENCY_RULES.IDENTITY_ASSURED,
      tool: AUDIT_TRANSPARENCY_TOOL,
      file,
      severity: 'error',
      category: 'governance',
      message:
        'verification used public keys carried inside the ledger itself. That proves internal ' +
        'consistency and nothing about identity: whoever can rewrite the ledger can rewrite the key. ' +
        'Supply trust anchors out of band (--trust-anchors).',
    }));
  }

  // Issuer and Transparency Service sharing one key is RFC 9943's separation of roles
  // collapsed — worth naming explicitly rather than leaving it to be inferred.
  const issuerKeys = new Set(input.issuerIdentities.map((i) => i.keyId));
  const sharedKeys = input.serviceIdentities.filter((i) => issuerKeys.has(i.keyId));
  for (const identity of sharedKeys) {
    violations.push(makeViolation({
      ruleId: AUDIT_TRANSPARENCY_RULES.IDENTITY_ASSURED,
      tool: AUDIT_TRANSPARENCY_TOOL,
      file,
      severity: 'error',
      category: 'governance',
      message:
        `the Issuer and the Transparency Service both sign with "${identity.keyId}". RFC 9943 places ` +
        'registration in an entity separate from issuance; one key for both is a self-attestation and ' +
        'cannot be non-repudiation.',
    }));
  }

  return {
    verdict: violations.length > 0 ? Verdict.FAIL : Verdict.PASS,
    violations,
    cryptographicallyIntact: verification.verified,
  };
}
