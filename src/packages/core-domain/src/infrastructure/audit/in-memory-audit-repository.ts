import type { AuditEntry, AuditQuery } from '../../domain/audit/audit-entry';
import type { IAuditRepository } from '../../domain/audit/audit-repository.port';

/**
 * In-memory implementation of `IAuditRepository`.
 *
 * Intended for unit tests only — data is not persisted across process restarts.
 */
export class InMemoryAuditRepository implements IAuditRepository {
  private readonly entries: AuditEntry[] = [];

  async append(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
  }

  async query(q: AuditQuery): Promise<AuditEntry[]> {
    let results = this.entries.filter(e => {
      if (q.tenantId && e.tenantId !== q.tenantId) return false;
      if (q.phaseId && e.phaseId !== q.phaseId) return false;
      if (q.actor && e.actor !== q.actor) return false;
      if (q.correlationId && e.correlationId !== q.correlationId) return false;
      if (q.from && e.occurredAt < q.from) return false;
      if (q.to && e.occurredAt > q.to) return false;
      return true;
    });

    // Sort ascending by occurredAt
    results = results.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

    if (q.limit !== undefined) {
      results = results.slice(0, q.limit);
    }

    return results;
  }

  async findById(id: string): Promise<AuditEntry | null> {
    return this.entries.find(e => e.id === id) ?? null;
  }

  /** Test helper — returns the total number of stored entries. */
  size(): number {
    return this.entries.length;
  }

  /** Test helper — clears all entries. */
  clear(): void {
    this.entries.length = 0;
  }
}
