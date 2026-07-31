/**
 * GT-588 · criterion 2 — a receipt chain verifies OFFLINE and FAILS on a tampered entry.
 *
 * Every case here writes a real ledger with a real Ed25519 key, then edits the file
 * the way an attacker (or a corrupting disk) would, and asserts the specific failure
 * code. The point is not that verification returns `false` somewhere; it is that each
 * distinct attack is distinguishable, because an auditor's next question after "did
 * it verify?" is always "what changed, and where?".
 */

import { verifyReceiptChain } from '../../domain/transparency/receipt-chain-verifier';
import type { TransparencyLedgerEntry, DecisionStatement } from '../../domain/transparency/transparency-statement';
import { TransparencyRecorderService } from '../../application/services/transparency-recorder.service';
import type { ITransparencyLedger } from '../../domain/transparency/ports/transparency-ledger.port';
import { Ed25519CoseVerifier, type TrustAnchor } from './ed25519-cose-verifier';
import { Ed25519StatementSigner } from './ed25519-statement-signer';
import { MerkleTransparencyService } from './merkle-transparency-service';
import { NodeSha256Hasher } from './node-hasher';
import { createDevelopmentSigningKey } from './signing-key';
import { parseLedger } from './jsonl-transparency-ledger';

/** In-memory ledger so the spec exercises the seam without touching a disk. */
class ArrayLedger implements ITransparencyLedger {
  readonly entries: TransparencyLedgerEntry[] = [];
  async append(entry: TransparencyLedgerEntry): Promise<void> {
    this.entries.push(entry);
  }
  async readAll(): Promise<readonly TransparencyLedgerEntry[]> {
    return this.entries;
  }
}

const hasher = new NodeSha256Hasher();

function decision(n: number, verdict: string): DecisionStatement {
  return {
    statementId: `decision-${n}`,
    subject: `gate/quality-${n}`,
    eventType: 'gate.evaluated',
    verdict,
    occurredAt: `2026-07-3${n}T10:00:00.000Z`,
    tenantId: 'tenant-a',
    actor: 'ci@evolith',
    payload: { score: 80 + n, blocking: verdict === 'FAIL' },
  };
}

/** Build a 5-entry ledger plus a verifier anchored on the real public key. */
async function buildLedger(): Promise<{
  entries: TransparencyLedgerEntry[];
  verifier: Ed25519CoseVerifier;
  anchors: TrustAnchor[];
}> {
  const issuerKey = createDevelopmentSigningKey({ role: 'issuer' });
  const serviceKey = createDevelopmentSigningKey({ role: 'transparency-service' });
  const ledger = new ArrayLedger();
  const recorder = new TransparencyRecorderService(
    new Ed25519StatementSigner(issuerKey, hasher),
    new MerkleTransparencyService(serviceKey, hasher),
    ledger,
  );

  for (let i = 0; i < 5; i++) {
    await recorder.record(decision(i, i === 3 ? 'FAIL' : 'PASS'));
  }

  const anchors: TrustAnchor[] = [
    { keyId: issuerKey.identity.keyId, publicKeySpki: issuerKey.identity.publicKeySpki! },
    { keyId: serviceKey.identity.keyId, publicKeySpki: serviceKey.identity.publicKeySpki! },
  ];
  return { entries: ledger.entries, verifier: new Ed25519CoseVerifier(anchors, 'anchored'), anchors };
}

/** Deep clone through JSON — the same round trip a ledger file makes. */
function reload(entries: readonly TransparencyLedgerEntry[]): TransparencyLedgerEntry[] {
  return JSON.parse(JSON.stringify(entries)) as TransparencyLedgerEntry[];
}

function codes(entries: readonly TransparencyLedgerEntry[], verifier: Ed25519CoseVerifier): string[] {
  return verifyReceiptChain(entries, { hasher, verifier }).failures.map((f) => f.code);
}

describe('GT-588 · receipt chain verification (offline)', () => {
  it('verifies an untampered ledger', async () => {
    const { entries, verifier } = await buildLedger();
    const result = verifyReceiptChain(entries, { hasher, verifier });

    expect(result.verified).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.entryCount).toBe(5);
    expect(result.entries.every((e) => e.verified)).toBe(true);
    expect(result.recomputedRoot).toMatch(/^[0-9a-f]{64}$/);
  });

  it('verifies after a full JSON round trip through a file', async () => {
    const { entries, verifier } = await buildLedger();
    const serialised = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    expect(verifyReceiptChain(parseLedger(serialised), { hasher, verifier }).verified).toBe(true);
  });

  it('needs no network, clock or log operator: the same file verifies twice identically', async () => {
    const { entries, anchors } = await buildLedger();
    const first = verifyReceiptChain(entries, { hasher, verifier: new Ed25519CoseVerifier(anchors, 'anchored') });
    const second = verifyReceiptChain(reload(entries), {
      hasher,
      verifier: new Ed25519CoseVerifier(anchors, 'anchored'),
    });
    expect(second.verified).toBe(true);
    expect(second.recomputedRoot).toBe(first.recomputedRoot);
  });

  describe('tampering', () => {
    it('FAILS when the readable decision is edited (STATEMENT_PAYLOAD_MISMATCH)', async () => {
      const { entries, verifier } = await buildLedger();
      const tampered = reload(entries);
      // The single most valuable edit an attacker could make: flip a blocking FAIL.
      (tampered[3].decision as { verdict?: string }).verdict = 'PASS';

      const result = verifyReceiptChain(tampered, { hasher, verifier });
      expect(result.verified).toBe(false);
      expect(result.failures.map((f) => f.code)).toContain('STATEMENT_PAYLOAD_MISMATCH');
      expect(result.entries[3].verified).toBe(false);
      // Untouched entries still verify — the failure is localised, not smeared.
      expect(result.entries.filter((e) => e.verified).map((e) => e.leafIndex)).toEqual([0, 1, 2, 4]);
    });

    it('FAILS when the signed statement bytes are altered', async () => {
      const { entries, verifier } = await buildLedger();
      const tampered = reload(entries);
      const cose = tampered[1].transparentStatement.statement.cose;
      // Flip one base64 character in the middle of the signature.
      const flipped = cose.slice(0, 40) + (cose[40] === 'A' ? 'B' : 'A') + cose.slice(41);
      (tampered[1].transparentStatement.statement as { cose: string }).cose = flipped;

      const result = verifyReceiptChain(tampered, { hasher, verifier });
      expect(result.verified).toBe(false);
      // Changing the statement changes its leaf, so the endorsed root no longer
      // matches what the ledger produces — the tree notices, not just the signature.
      expect(result.failures.map((f) => f.code)).toEqual(
        expect.arrayContaining(['ROOT_MISMATCH']),
      );
    });

    it('FAILS when an entry is deleted from the middle (INDEX_NOT_CONTIGUOUS + ROOT_MISMATCH)', async () => {
      const { entries, verifier } = await buildLedger();
      const tampered = reload(entries);
      tampered.splice(2, 1);

      const result = verifyReceiptChain(tampered, { hasher, verifier });
      expect(result.verified).toBe(false);
      const failureCodes = result.failures.map((f) => f.code);
      expect(failureCodes).toContain('INDEX_NOT_CONTIGUOUS');
      // Deletion is exactly the attack individual receipt checks miss.
      expect(failureCodes).toContain('ROOT_MISMATCH');
    });

    it('FAILS when two entries are swapped', async () => {
      const { entries, verifier } = await buildLedger();
      const tampered = reload(entries);
      [tampered[1], tampered[2]] = [tampered[2], tampered[1]];

      expect(codes(tampered, verifier)).toContain('INDEX_NOT_CONTIGUOUS');
      expect(verifyReceiptChain(tampered, { hasher, verifier }).verified).toBe(false);
    });

    it('FAILS when an entry is appended without a receipt from the service', async () => {
      const { entries, verifier } = await buildLedger();
      const tampered = reload(entries);
      // Copy the last line and renumber it — a forged append.
      const forged = JSON.parse(JSON.stringify(tampered[4])) as TransparencyLedgerEntry;
      (forged.decision as { statementId: string }).statementId = 'decision-forged';
      (forged.transparentStatement.receipt as { leafIndex: number }).leafIndex = 5;
      (forged.transparentStatement.receipt as { treeSize: number }).treeSize = 6;
      tampered.push(forged);

      const result = verifyReceiptChain(tampered, { hasher, verifier });
      expect(result.verified).toBe(false);
      expect(result.failures.map((f) => f.code)).toEqual(
        expect.arrayContaining(['STATEMENT_PAYLOAD_MISMATCH', 'ROOT_MISMATCH']),
      );
    });

    it('FAILS when the endorsed tree root is rewritten', async () => {
      const { entries, verifier } = await buildLedger();
      const tampered = reload(entries);
      (tampered[2].transparentStatement.receipt as { treeRoot: string }).treeRoot = 'ab'.repeat(32);

      const result = verifyReceiptChain(tampered, { hasher, verifier });
      expect(result.verified).toBe(false);
      expect(result.failures.map((f) => f.code)).toEqual(
        expect.arrayContaining(['ROOT_MISMATCH', 'RECEIPT_SIGNATURE_INVALID']),
      );
    });

    it('FAILS when the inclusion proof is stripped or corrupted', async () => {
      const { entries, verifier } = await buildLedger();
      const tampered = reload(entries);
      // Re-sign nothing: just replace the receipt with entry 0's, which carries a
      // proof for a different leaf and a different tree size.
      (tampered[4].transparentStatement.receipt as { cose: string }).cose =
        tampered[0].transparentStatement.receipt.cose;

      const result = verifyReceiptChain(tampered, { hasher, verifier });
      expect(result.verified).toBe(false);
      expect(result.failures.map((f) => f.code)).toEqual(
        expect.arrayContaining(['RECEIPT_SIGNATURE_INVALID']),
      );
    });

    it('FAILS on a malformed ledger line rather than skipping it', async () => {
      const { entries, verifier } = await buildLedger();
      const lines = entries.map((e) => JSON.stringify(e));
      lines.splice(2, 0, '{ this is not json');

      const result = verifyReceiptChain(parseLedger(lines.join('\n')), { hasher, verifier });
      expect(result.verified).toBe(false);
      expect(result.failures.map((f) => f.code)).toContain('MALFORMED_ENTRY');
    });

    it('FAILS when verified against the wrong key (a re-signed ledger is not accepted)', async () => {
      const { entries } = await buildLedger();
      const otherKey = createDevelopmentSigningKey({ role: 'impostor' });
      const wrongAnchors = entries.slice(0, 1).flatMap((e) => [
        { keyId: e.transparentStatement.statement.identity.keyId, publicKeySpki: otherKey.identity.publicKeySpki! },
        { keyId: e.transparentStatement.receipt.identity.keyId, publicKeySpki: otherKey.identity.publicKeySpki! },
      ]);

      const result = verifyReceiptChain(entries, {
        hasher,
        verifier: new Ed25519CoseVerifier(wrongAnchors, 'anchored'),
      });
      expect(result.verified).toBe(false);
      expect(result.failures.map((f) => f.code)).toEqual(
        expect.arrayContaining(['STATEMENT_SIGNATURE_INVALID', 'RECEIPT_SIGNATURE_INVALID']),
      );
    });

    it('FAILS when no trust anchor covers the signing key at all', async () => {
      const { entries } = await buildLedger();
      const result = verifyReceiptChain(entries, {
        hasher,
        verifier: new Ed25519CoseVerifier([], 'anchored'),
      });
      expect(result.verified).toBe(false);
      expect(result.failures.some((f) => /no trust anchor/.test(f.message))).toBe(true);
    });
  });

  it('an empty ledger verifies vacuously — the governance rule, not the verifier, rejects it', () => {
    const result = verifyReceiptChain([], { hasher, verifier: new Ed25519CoseVerifier([], 'anchored') });
    expect(result.verified).toBe(true);
    expect(result.entryCount).toBe(0);
  });
});
