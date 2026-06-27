import type { AuditEntry, AuditQuery } from './audit-entry';

/**
 * Persistence port for the durable audit ledger.
 *
 * Design constraints:
 *  - APPEND-ONLY: `append` is the only mutation. There is no `update` or `delete`.
 *  - Implementations must be thread-safe with respect to concurrent appends.
 */
export interface IAuditRepository {
  /**
   * Persist a new audit entry.
   * The entry must be written atomically and must not overwrite existing entries.
   */
  append(entry: AuditEntry): Promise<void>;

  /**
   * Query the ledger using the supplied filter criteria.
   * Results are ordered by `occurredAt` ascending.
   */
  query(q: AuditQuery): Promise<AuditEntry[]>;

  /**
   * Retrieve a single entry by its unique identifier.
   * Returns `null` when no entry with that id exists.
   */
  findById(id: string): Promise<AuditEntry | null>;
}
