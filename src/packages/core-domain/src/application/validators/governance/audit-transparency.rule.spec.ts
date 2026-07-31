/**
 * GT-588 · criterion 3 — the governance rule FAILS when receipts do not verify.
 *
 * This is the spec that makes the ledger load-bearing rather than ornamental. Each
 * case builds a real ledger, tampers with it (or leaves the identity as shipped),
 * and asserts a `FAIL` verdict carrying a specific rule id — so a regression that
 * downgraded any of these to advisory would go red here.
 */

import { verifyReceiptChain } from '../../../domain/transparency/receipt-chain-verifier';
import type { ITransparencyLedger } from '../../../domain/transparency/ports/transparency-ledger.port';
import type {
  DecisionStatement,
  SigningIdentity,
  TransparencyLedgerEntry,
} from '../../../domain/transparency/transparency-statement';
import { Verdict } from '../../../domain/verdict/verdict';
import { Ed25519CoseVerifier, type TrustAnchor } from '../../../infrastructure/transparency/ed25519-cose-verifier';
import { Ed25519StatementSigner } from '../../../infrastructure/transparency/ed25519-statement-signer';
import { MerkleTransparencyService } from '../../../infrastructure/transparency/merkle-transparency-service';
import { NodeSha256Hasher } from '../../../infrastructure/transparency/node-hasher';
import { createDevelopmentSigningKey } from '../../../infrastructure/transparency/signing-key';
import { TransparencyRecorderService } from '../../services/transparency-recorder.service';
import {
  AUDIT_TRANSPARENCY_RULES,
  evaluateAuditTransparency,
  type AuditTransparencyInput,
} from './audit-transparency.rule';

const hasher = new NodeSha256Hasher();
const LEDGER_PATH = 'logs/transparency.jsonl';

class ArrayLedger implements ITransparencyLedger {
  readonly entries: TransparencyLedgerEntry[] = [];
  async append(e: TransparencyLedgerEntry): Promise<void> { this.entries.push(e); }
  async readAll(): Promise<readonly TransparencyLedgerEntry[]> { return this.entries; }
}

function decision(n: number): DecisionStatement {
  return {
    statementId: `decision-${n}`,
    subject: `gate/quality-${n}`,
    eventType: 'gate.evaluated',
    verdict: n === 1 ? 'FAIL' : 'PASS',
    occurredAt: `2026-07-2${n}T09:00:00.000Z`,
    payload: { score: 70 + n },
  };
}

/**
 * Build a ledger. `assurance: 'external-custody'` re-labels the SAME development key
 * so the spec can isolate rules 01–03 from rule 04 — the labelling is a test double
 * for key custody, never a way to obtain it.
 */
async function build(options: {
  entries?: number;
  pretendExternalCustody?: boolean;
  separateKeys?: boolean;
} = {}) {
  const issuerKey = createDevelopmentSigningKey({ role: 'issuer' });
  const serviceKey = options.separateKeys === false ? issuerKey : createDevelopmentSigningKey({ role: 'ts' });

  const relabel = (identity: SigningIdentity): SigningIdentity =>
    options.pretendExternalCustody ? { ...identity, assurance: 'external-custody' } : identity;

  const issuer = { ...issuerKey, identity: relabel(issuerKey.identity) };
  const service = { ...serviceKey, identity: relabel(serviceKey.identity) };

  const ledger = new ArrayLedger();
  const recorder = new TransparencyRecorderService(
    new Ed25519StatementSigner(issuer, hasher),
    new MerkleTransparencyService(service, hasher),
    ledger,
  );
  for (let i = 0; i < (options.entries ?? 3); i++) await recorder.record(decision(i));

  const anchors: TrustAnchor[] = [
    { keyId: issuer.identity.keyId, publicKeySpki: issuer.identity.publicKeySpki! },
    { keyId: service.identity.keyId, publicKeySpki: service.identity.publicKeySpki! },
  ];
  return { ledger, anchors, issuer, service };
}

function evaluate(
  entries: readonly TransparencyLedgerEntry[],
  anchors: readonly TrustAnchor[],
  overrides: Partial<AuditTransparencyInput> = {},
) {
  const verification = verifyReceiptChain(entries, {
    hasher,
    verifier: new Ed25519CoseVerifier(anchors, 'anchored'),
  });
  return evaluateAuditTransparency({
    verification,
    ledgerPath: LEDGER_PATH,
    issuerIdentities: dedupe(entries.map((e) => e.transparentStatement.statement.identity)),
    serviceIdentities: dedupe(entries.map((e) => e.transparentStatement.receipt.identity)),
    trustAnchors: 'anchored',
    ...overrides,
  });
}

function dedupe(identities: readonly SigningIdentity[]): SigningIdentity[] {
  const seen = new Map<string, SigningIdentity>();
  for (const i of identities) if (!seen.has(i.keyId)) seen.set(i.keyId, i);
  return [...seen.values()];
}

const ruleIds = (r: { violations: readonly { ruleId: string }[] }) => [...new Set(r.violations.map((v) => v.ruleId))];

describe('GT-588 · AUD-TRANSP governance rule', () => {
  describe('AUD-TRANSP-01 · a signed ledger must exist', () => {
    it('FAILS when there is no transparency ledger at all', () => {
      const result = evaluateAuditTransparency({
        ledgerPath: LEDGER_PATH,
        issuerIdentities: [],
        serviceIdentities: [],
        trustAnchors: 'anchored',
      });
      expect(result.verdict).toBe(Verdict.FAIL);
      expect(ruleIds(result)).toEqual([AUDIT_TRANSPARENCY_RULES.LEDGER_PRESENT]);
      expect(result.cryptographicallyIntact).toBe(false);
      expect(result.violations[0].message).toMatch(/not tamper-evidence/);
    });

    it('FAILS on an empty ledger rather than passing vacuously', async () => {
      const { anchors } = await build();
      const result = evaluate([], anchors);
      expect(result.verdict).toBe(Verdict.FAIL);
      expect(ruleIds(result)).toContain(AUDIT_TRANSPARENCY_RULES.LEDGER_PRESENT);
    });
  });

  describe('AUD-TRANSP-02 · every receipt must verify', () => {
    it('FAILS when a decision was edited after signing', async () => {
      const { ledger, anchors } = await build({ pretendExternalCustody: true });
      const tampered = JSON.parse(JSON.stringify(ledger.entries)) as TransparencyLedgerEntry[];
      (tampered[1].decision as { verdict?: string }).verdict = 'PASS';

      const result = evaluate(tampered, anchors);
      expect(result.verdict).toBe(Verdict.FAIL);
      expect(ruleIds(result)).toContain(AUDIT_TRANSPARENCY_RULES.RECEIPTS_VERIFY);
      expect(result.cryptographicallyIntact).toBe(false);
      expect(result.violations.some((v) => /STATEMENT_PAYLOAD_MISMATCH/.test(v.message))).toBe(true);
    });

    it('FAILS when the receipt was signed by an unanchored key', async () => {
      const { ledger } = await build({ pretendExternalCustody: true });
      const result = evaluate(ledger.entries, []);
      expect(result.verdict).toBe(Verdict.FAIL);
      expect(ruleIds(result)).toContain(AUDIT_TRANSPARENCY_RULES.RECEIPTS_VERIFY);
    });

    it('reports the offending ledger line, not just the file', async () => {
      const { ledger, anchors } = await build({ pretendExternalCustody: true });
      const tampered = JSON.parse(JSON.stringify(ledger.entries)) as TransparencyLedgerEntry[];
      (tampered[2].decision as { verdict?: string }).verdict = 'WAIVE';

      const result = evaluate(tampered, anchors);
      const violation = result.violations.find((v) => /STATEMENT_PAYLOAD_MISMATCH/.test(v.message));
      expect(violation?.line).toBe(3);
      expect(violation?.file).toBe(LEDGER_PATH);
    });
  });

  describe('AUD-TRANSP-03 · the log must be append-only', () => {
    it('FAILS when an entry is deleted from the middle', async () => {
      const { ledger, anchors } = await build({ entries: 4, pretendExternalCustody: true });
      const tampered = JSON.parse(JSON.stringify(ledger.entries)) as TransparencyLedgerEntry[];
      tampered.splice(1, 1);

      const result = evaluate(tampered, anchors);
      expect(result.verdict).toBe(Verdict.FAIL);
      expect(ruleIds(result)).toContain(AUDIT_TRANSPARENCY_RULES.APPEND_ONLY);
    });
  });

  describe('AUD-TRANSP-04 · the identity behind the signatures', () => {
    it('FAILS on the development signer even though every receipt verifies', async () => {
      // This is the shipped state of the repository, and it is supposed to be red.
      const { ledger, anchors } = await build();
      const result = evaluate(ledger.entries, anchors);

      expect(result.cryptographicallyIntact).toBe(true); // the maths is fine …
      expect(result.verdict).toBe(Verdict.FAIL);          // … and it still does not pass
      expect(ruleIds(result)).toEqual([AUDIT_TRANSPARENCY_RULES.IDENTITY_ASSURED]);
      expect(result.violations.some((v) => /development/.test(v.message))).toBe(true);
      expect(result.violations.some((v) => /externalSigningKey/.test(v.message))).toBe(true);
    });

    it('FAILS when the verifier fell back to keys carried inside the ledger', async () => {
      const { ledger, anchors } = await build({ pretendExternalCustody: true });
      const result = evaluate(ledger.entries, anchors, { trustAnchors: 'self-asserted' });
      expect(result.verdict).toBe(Verdict.FAIL);
      expect(result.violations.some((v) => /rewrite the key/.test(v.message))).toBe(true);
    });

    it('FAILS when the Issuer and the Transparency Service share one key', async () => {
      const { ledger, anchors } = await build({ pretendExternalCustody: true, separateKeys: false });
      const result = evaluate(ledger.entries, anchors);
      expect(result.verdict).toBe(Verdict.FAIL);
      expect(result.violations.some((v) => /separate from issuance/.test(v.message))).toBe(true);
    });
  });

  describe('the only configuration that PASSES', () => {
    it('passes with verified receipts, external custody, distinct keys and out-of-band anchors', async () => {
      const { ledger, anchors } = await build({ pretendExternalCustody: true, separateKeys: true });
      const result = evaluate(ledger.entries, anchors);

      expect(result.verdict).toBe(Verdict.PASS);
      expect(result.violations).toEqual([]);
      expect(result.cryptographicallyIntact).toBe(true);
    });

    it('every violation is an error-severity governance finding', async () => {
      const { ledger, anchors } = await build();
      const result = evaluate(ledger.entries, anchors);
      expect(result.violations.every((v) => v.severity === 'error')).toBe(true);
      expect(result.violations.every((v) => v.category === 'governance')).toBe(true);
      expect(result.violations.every((v) => v.fingerprint.length > 0)).toBe(true);
    });
  });
});
