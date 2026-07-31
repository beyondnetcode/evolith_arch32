import type { DomainEvent } from '../../domain/events/domain-event';
import type { AuditEntry, AuditQuery } from '../../domain/audit/audit-entry';
import type { IAuditRepository } from '../../domain/audit/audit-repository.port';
import type { DecisionStatement } from '../../domain/transparency/transparency-statement';
import type { IDomainEventBus } from '../ports/event-bus.port';
import type { TransparencyRecorderService } from './transparency-recorder.service';

/**
 * Application service for the durable audit ledger.
 *
 * Responsibilities:
 *  - Map `DomainEvent` envelopes to `AuditEntry` records.
 *  - Persist entries via the injected `IAuditRepository`.
 *  - Optionally subscribe to an `IDomainEventBus` to auto-record all events.
 *  - GT-588 — when a transparency recorder is injected, ALSO emit a signed
 *    statement and a verifiable receipt for the same decision.
 *
 * GT-588 — why the recorder is optional. The audit ledger is unconditional; the
 * SIGNED ledger cannot be, because signing requires key material this repository
 * does not have and must not invent. Making it mandatory would force either a
 * fabricated default key (a lie) or a hard failure on every deployment (unshippable).
 * So it is injected, its absence is visible in the ledger (there is none), and the
 * governance rule AUD-TRANSP-01 is what turns that absence into a FAIL. The decision
 * of whether an unsigned trail is acceptable belongs to policy, not to a constructor
 * default.
 */
export class AuditService {
  constructor(
    private readonly repo: IAuditRepository,
    private readonly eventBus?: IDomainEventBus,
    /** GT-588 — when present, every recorded event also becomes a Transparent Statement. */
    private readonly transparency?: TransparencyRecorderService,
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

    if (this.transparency) {
      await this.transparency.record(toDecisionStatement(entry, p));
    }
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

/**
 * GT-588 — project an `AuditEntry` onto the decision a statement is signed over.
 *
 * The projection is deliberately TOTAL over the audit entry: `payload` carries the
 * whole event body, so the signature covers everything the ledger recorded and not a
 * summary of it. A signature over a summary would let the interesting half of a
 * decision change without breaking anything.
 */
export function toDecisionStatement(
  entry: AuditEntry,
  payloadFields?: Record<string, unknown> | null,
): DecisionStatement {
  const verdict = typeof payloadFields?.['verdict'] === 'string' ? payloadFields['verdict'] : undefined;
  return {
    statementId: entry.id,
    subject: entry.correlationId ?? entry.phaseId ?? entry.eventType,
    eventType: entry.eventType,
    occurredAt: entry.occurredAt,
    ...(verdict ? { verdict } : {}),
    ...(entry.tenantId ? { tenantId: entry.tenantId } : {}),
    ...(entry.actor ? { actor: entry.actor } : {}),
    ...(entry.payload !== undefined ? { payload: entry.payload } : {}),
  };
}
