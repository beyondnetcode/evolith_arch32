/**
 * A single immutable audit record.
 * Once appended, an entry must never be modified or deleted.
 */
export interface AuditEntry {
  /** Globally unique identifier for this audit record (UUID v4). */
  readonly id: string;
  /** Stable event-type string (mirrors DomainEvent.eventType when sourced from the bus). */
  readonly eventType: string;
  /** Identity of the actor that triggered the event (user id, service name, etc.). */
  readonly actor?: string;
  /** Tenant the event belongs to. */
  readonly tenantId?: string;
  /** SDLC phase the event relates to. */
  readonly phaseId?: string;
  /** Cross-service correlation / saga identifier. */
  readonly correlationId?: string;
  /** Arbitrary event data — must be JSON-serialisable. */
  readonly payload: unknown;
  /** ISO-8601 UTC timestamp when the event occurred. */
  readonly occurredAt: string;
}

/**
 * Filtering criteria for `IAuditRepository.query()`.
 * All provided fields are combined with AND logic.
 * Omitted fields are treated as wildcards.
 */
export interface AuditQuery {
  tenantId?: string;
  phaseId?: string;
  actor?: string;
  correlationId?: string;
  /** Inclusive lower bound (ISO-8601). */
  from?: string;
  /** Inclusive upper bound (ISO-8601). */
  to?: string;
  /** Maximum number of entries to return (default: no limit). */
  limit?: number;
}
