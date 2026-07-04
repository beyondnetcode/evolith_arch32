import type { IDomainEventBus } from '../../application/ports/event-bus.port';
import type { DomainEvent } from '../../domain/events/domain-event';

// ---------------------------------------------------------------------------
// Outbox entry
// ---------------------------------------------------------------------------

export type OutboxEntryStatus = 'pending' | 'published' | 'failed';

export interface OutboxEntry {
  /** Mirrors the DomainEvent.eventId — unique per entry. */
  readonly id: string;
  readonly eventType: string;
  readonly payload: DomainEvent<unknown>;
  status: OutboxEntryStatus;
  readonly createdAt: string;
  processedAt?: string;
  /** Error message captured on failure. */
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Outbox repository port
// ---------------------------------------------------------------------------

/**
 * Persistence port for the transactional outbox.
 *
 * A real implementation would write entries inside the same DB transaction
 * as the domain state change, ensuring at-least-once delivery semantics.
 */
export interface IOutboxRepository {
  /** Persist a new pending entry. Must be called within the same transaction as the domain write. */
  save(entry: OutboxEntry): Promise<void>;
  /** Return all entries with status = 'pending', ordered by createdAt ASC. */
  findPending(): Promise<OutboxEntry[]>;
  /** Persist the updated status / processedAt / errorMessage of an existing entry. */
  update(entry: OutboxEntry): Promise<void>;
}

// ---------------------------------------------------------------------------
// Outbox service
// ---------------------------------------------------------------------------

/**
 * Dispatches pending outbox entries to the domain event bus.
 *
 * Run periodically (e.g. via a scheduled job or after each request) to drain
 * the outbox. Entries that fail are marked `failed` and can be retried.
 */
export class OutboxService {
  constructor(
    private readonly outboxRepo: IOutboxRepository,
    private readonly eventBus: IDomainEventBus,
  ) {}

  /**
   * Process all pending outbox entries.
   * Returns counts of published and failed entries.
   */
  async dispatchPending(): Promise<{ published: number; failed: number }> {
    const pending = await this.outboxRepo.findPending();
    let published = 0;
    let failed = 0;

    for (const entry of pending) {
      try {
        await this.eventBus.publish(entry.payload);
        entry.status = 'published';
        entry.processedAt = new Date().toISOString();
        published++;
      } catch (err) {
        entry.status = 'failed';
        entry.processedAt = new Date().toISOString();
        entry.errorMessage = err instanceof Error ? err.message : String(err);
        failed++;
      }
      await this.outboxRepo.update(entry);
    }

    return { published, failed };
  }

  /**
   * Convenience: create and immediately save a new pending entry.
   * Call this inside the same transaction as your domain write.
   */
  async enqueue(event: DomainEvent<unknown>): Promise<OutboxEntry> {
    const entry: OutboxEntry = {
      id: event.eventId,
      eventType: event.eventType,
      payload: event,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await this.outboxRepo.save(entry);
    return entry;
  }
}
