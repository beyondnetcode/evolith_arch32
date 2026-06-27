import type { DomainEvent } from '../../domain/events/domain-event';

/**
 * Domain event bus port.
 *
 * The event bus is the primary mechanism for broadcasting domain events within
 * Evolith Core. Implementations may be in-memory (tests/dev), transactional
 * outbox-backed (production), or bridged to an external broker (future).
 */
export interface IDomainEventBus {
  /**
   * Publish a single domain event. Implementations should be non-blocking
   * from the caller's perspective (fire-and-forget or queue-backed).
   */
  publish(event: DomainEvent<unknown>): Promise<void>;

  /**
   * Subscribe a handler to all events of a given type.
   * The handler receives a strongly-typed event envelope.
   */
  subscribe<T>(
    eventType: string,
    handler: (event: DomainEvent<T>) => Promise<void>,
  ): void;
}
