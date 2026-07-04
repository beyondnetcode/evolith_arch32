/**
 * Base domain event contract.
 *
 * Every event emitted by the Evolith core domain extends this type.
 * The combination of `eventType` + `version` is the stable consumer contract:
 * changing either is a breaking change requiring a new version.
 */
export interface DomainEvent<T = unknown> {
  /** Globally unique event identifier (UUID v4). */
  readonly eventId: string;
  /** Stable, namespaced event type string (e.g. "phase.started"). */
  readonly eventType: string;
  /** Monotonic schema version for this event type. Starts at 1. */
  readonly version: number;
  /** ISO-8601 UTC timestamp when the event was created. */
  readonly occurredAt: string;
  /** Optional cross-service trace / saga id. */
  readonly correlationId?: string;
  /** Strongly-typed event data. */
  readonly payload: T;
}

/**
 * Helper to build a DomainEvent without boilerplate.
 * The caller supplies eventType, version, payload, and optionally correlationId.
 */
export function createEvent<T>(
  eventType: string,
  version: number,
  payload: T,
  correlationId?: string,
): DomainEvent<T> {
  return {
    eventId: crypto.randomUUID(),
    eventType,
    version,
    occurredAt: new Date().toISOString(),
    correlationId,
    payload,
  };
}
