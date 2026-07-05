import type { IDomainEventBus } from '../../application/ports/event-bus.port';
import type { DomainEvent } from '../../domain/events/domain-event';

type Handler<T = unknown> = (event: DomainEvent<T>) => Promise<void>;

/**
 * Simple in-memory event bus.
 *
 * Suitable for unit tests, CLI sessions, and environments where a durable
 * broker is not required. Handlers are invoked synchronously in publish order.
 * Errors from one handler do NOT prevent subsequent handlers from running.
 */
export class InMemoryEventBus implements IDomainEventBus {
  private readonly handlers = new Map<string, Handler[]>();

  subscribe<T>(eventType: string, handler: (event: DomainEvent<T>) => Promise<void>): void {
    const list = this.handlers.get(eventType) ?? [];
    list.push(handler as Handler);
    this.handlers.set(eventType, list);
  }

  async publish(event: DomainEvent<unknown>): Promise<void> {
    const list = this.handlers.get(event.eventType) ?? [];
    await Promise.all(list.map((h) => h(event)));
  }

  /** Returns the number of handlers registered for a given eventType. */
  handlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.length ?? 0;
  }

  /** Removes all subscriptions — useful for test teardown. */
  clear(): void {
    this.handlers.clear();
  }
}
