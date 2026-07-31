/**
 * GT-588 — the use case: turn a decision into a Transparent Statement and append it.
 *
 * Sits between the ports and knows none of the crypto: sign → register → append.
 * Wiring it to `AuditService` is what makes criterion 1's "every decision" true of a
 * surface rather than of one call site — see `audit.service.ts`, where the recorder
 * is an OPTIONAL collaborator so a deployment with no key still runs, and so the
 * governance rule (not a silent fallback) is what decides whether that is acceptable.
 */

import type { IStatementSigner, ITransparencyService } from '../../domain/transparency/ports/statement-signer.port';
import type { ITransparencyLedger } from '../../domain/transparency/ports/transparency-ledger.port';
import type {
  DecisionStatement,
  TransparencyLedgerEntry,
} from '../../domain/transparency/transparency-statement';

export class TransparencyRecorderService {
  constructor(
    private readonly signer: IStatementSigner,
    private readonly transparencyService: ITransparencyService,
    private readonly ledger: ITransparencyLedger,
  ) {}

  /**
   * Sign, register and append one decision.
   *
   * Appends are serialised by the ledger adapter; the Merkle service assigns leaf
   * indices in call order, so a caller that needs a deterministic chain must await
   * each call (as `AuditService.record` does).
   */
  async record(decision: DecisionStatement): Promise<TransparencyLedgerEntry> {
    const statement = await this.signer.signStatement(decision);
    const transparentStatement = await this.transparencyService.register(statement);
    const entry: TransparencyLedgerEntry = { decision, transparentStatement };
    await this.ledger.append(entry);
    return entry;
  }
}
