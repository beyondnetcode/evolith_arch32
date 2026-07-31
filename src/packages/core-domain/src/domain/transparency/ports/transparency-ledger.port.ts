/**
 * GT-588 — persistence seam for the append-only transparency ledger.
 *
 * Mirrors `IAuditRepository`'s append-only constraint: `append` is the only
 * mutation, and there is deliberately no `update` or `delete`. Unlike that port,
 * removing a line here is DETECTABLE — the Merkle tree head signed into every
 * later receipt no longer recomputes.
 */

import type { TransparencyLedgerEntry } from '../transparency-statement';

export interface ITransparencyLedger {
  /** Append one entry. Must never overwrite or reorder existing entries. */
  append(entry: TransparencyLedgerEntry): Promise<void>;
  /** Read the whole ledger in append order — what offline verification needs. */
  readAll(): Promise<readonly TransparencyLedgerEntry[]>;
}
