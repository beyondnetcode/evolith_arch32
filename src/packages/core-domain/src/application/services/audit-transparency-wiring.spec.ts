/**
 * GT-588 · criterion 1 (partial) — every event the audit ledger records also becomes
 * a Transparent Statement, when a signer is wired.
 *
 * Scope note, stated plainly: this proves the SEAM, not the criterion. Criterion 1
 * asks for a signed statement and a verifiable receipt per decision; what the code
 * can honestly deliver is that same process signing its own output with a key it
 * minted for itself. That is a self-attestation, and `AUD-TRANSP-04` fails it on
 * purpose. See `audit-transparency.rule.ts`.
 */

import { InMemoryAuditRepository } from '../../infrastructure/audit/in-memory-audit-repository';
import { verifyReceiptChain } from '../../domain/transparency/receipt-chain-verifier';
import type { ITransparencyLedger } from '../../domain/transparency/ports/transparency-ledger.port';
import type { TransparencyLedgerEntry } from '../../domain/transparency/transparency-statement';
import { Ed25519CoseVerifier } from '../../infrastructure/transparency/ed25519-cose-verifier';
import { Ed25519StatementSigner } from '../../infrastructure/transparency/ed25519-statement-signer';
import { MerkleTransparencyService } from '../../infrastructure/transparency/merkle-transparency-service';
import { NodeSha256Hasher } from '../../infrastructure/transparency/node-hasher';
import { createDevelopmentSigningKey } from '../../infrastructure/transparency/signing-key';
import { AuditService, toDecisionStatement } from './audit.service';
import { TransparencyRecorderService } from './transparency-recorder.service';

class ArrayLedger implements ITransparencyLedger {
  readonly entries: TransparencyLedgerEntry[] = [];
  async append(e: TransparencyLedgerEntry): Promise<void> { this.entries.push(e); }
  async readAll(): Promise<readonly TransparencyLedgerEntry[]> { return this.entries; }
}

const hasher = new NodeSha256Hasher();

function event(id: string, verdict: string) {
  return {
    eventId: id,
    eventType: 'gate.evaluated',
    correlationId: `corr-${id}`,
    occurredAt: '2026-07-31T08:00:00.000Z',
    payload: { actor: 'ci@evolith', tenantId: 't1', phaseId: 'design', verdict, score: 91 },
  };
}

describe('GT-588 · AuditService × transparency wiring', () => {
  it('records to the audit repository AND the transparency ledger', async () => {
    const repo = new InMemoryAuditRepository();
    const issuerKey = createDevelopmentSigningKey({ role: 'issuer' });
    const serviceKey = createDevelopmentSigningKey({ role: 'ts' });
    const ledger = new ArrayLedger();
    const service = new AuditService(
      repo,
      undefined,
      new TransparencyRecorderService(
        new Ed25519StatementSigner(issuerKey, hasher),
        new MerkleTransparencyService(serviceKey, hasher),
        ledger,
      ),
    );

    await service.record(event('e1', 'PASS'));
    await service.record(event('e2', 'FAIL'));

    expect((await repo.query({})).map((e) => e.id)).toEqual(['e1', 'e2']);
    expect(ledger.entries.map((e) => e.decision.statementId)).toEqual(['e1', 'e2']);

    const verifier = new Ed25519CoseVerifier([
      { keyId: issuerKey.identity.keyId, publicKeySpki: issuerKey.identity.publicKeySpki! },
      { keyId: serviceKey.identity.keyId, publicKeySpki: serviceKey.identity.publicKeySpki! },
    ], 'anchored');
    expect(verifyReceiptChain(ledger.entries, { hasher, verifier }).verified).toBe(true);
  });

  it('still records to the audit repository when no signer is wired', async () => {
    const repo = new InMemoryAuditRepository();
    const service = new AuditService(repo);
    await service.record(event('e3', 'PASS'));
    expect((await repo.findById('e3'))?.eventType).toBe('gate.evaluated');
  });

  it('signs the WHOLE event payload, not a summary of it', () => {
    const statement = toDecisionStatement(
      {
        id: 'e4',
        eventType: 'gate.evaluated',
        correlationId: 'c4',
        actor: 'ci@evolith',
        tenantId: 't1',
        phaseId: 'design',
        payload: { verdict: 'FAIL', score: 12, violations: ['HXA-01'] },
        occurredAt: '2026-07-31T08:00:00.000Z',
      },
      { verdict: 'FAIL' },
    );

    expect(statement.verdict).toBe('FAIL');
    expect(statement.payload).toEqual({ verdict: 'FAIL', score: 12, violations: ['HXA-01'] });
    expect(statement.subject).toBe('c4');
    expect(statement.actor).toBe('ci@evolith');
  });
});
