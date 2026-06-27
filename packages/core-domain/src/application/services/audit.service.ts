import type { DomainEvent } from '../../domain/events/domain-event';
import type { AuditEntry, AuditQuery } from '../../domain/audit/audit-entry';
import type { IAuditRepository } from '../../domain/audit/audit-repository.port';
import type { IDomainEventBus } from '../ports/event-bus.port';

/**
 * Application service for the durable audit ledger.
 *
 * Responsibilities:
 *  - Map `DomainEvent` envelopes to `AuditEntry` records.
 *  - Persist entries via the injected `IAuditRepository`.
 *  - Optionally subscribe to an `IDomainEventBus` to auto-record all events.
 */
export class AuditService {
  constructor(
    private readonly repo: IAuditRepository,
    private readonly eventBus?: IDomainEventBus,
  ) {
    if (this.eventBus) {
      // Subscribe with a wildcard — the bus delivers every event regardless of type.
      // We use '*' as a convention; implementations that don't support wildcards
      // should call subscribeAll() on the bus instead.
      this.eventBus.subscribe<unknown>('*', async (event) => {
        await this.record(event);
      });
    }
  }

  /**
   * Map a `DomainEvent` to an `AuditEntry` and append it to the ledger.
   *
   * The mapping extracts well-known fields from the payload when it conforms
   * to `{ actor?: string; tenantId?: string; phaseId?: string }`.
   */
  async record(event: DomainEvent<unknown>): Promise<void> {
    const p = event.payload as Record<string, unknown> | null | undefined;

    const entry: AuditEntry = {
      id: event.eventId,
      eventType: event.eventType,
      correlationId: event.correlationId,
      actor: typeof p?.['actor'] === 'string' ? p['actor'] : undefined,
      tenantId: typeof p?.['tenantId'] === 'string' ? p['tenantId'] : undefined,
      phaseId: typeof p?.['phaseId'] === 'string' ? p['phaseId'] : undefined,
      payload: event.payload,
      occurredAt: event.occurredAt,
    };

    await this.repo.append(entry);
  }

  /**
   * Query the audit ledger using the supplied filter criteria.
   */
  async queryAudit(q: AuditQuery): Promise<AuditEntry[]> {
    return this.repo.query(q);
  }

  /**
   * Retrieve a single audit entry by its unique identifier.
   */
  async findById(id: string): Promise<AuditEntry | null> {
    return this.repo.findById(id);
  }
}
