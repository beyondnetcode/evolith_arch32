# [ADR 0016](0016-immutable-business-audit-trail.md): Immutable Business Audit Trail and Change Tracking

## Status
Approved

## Date
2026-05-09

## Context
Regulated operations require absolute traceability. Simply capturing the final state of entities does not suffice for forensic or audit purposes; we must accurately detect *who* changed the data, *when*, from *what* network vector, and recording exact delta differentials of *before* and *after* values.

## Decision
Deploy a **Hybrid Audit Strategy** balancing performant direct reading with deep historical archiving:

1. **Metadata Layer (Row-Level)**: Physical entities inherit standard persistent audit columns: `created_at`, `created_by`, `updated_at`, `updated_by`, and a concurrency tracking `version` integer. 
2. **Ledger Layer (Application Deltas)**: Application command handlers generate application-level events forwarding structured old/new value JSON bundles directly toward the audit infrastructure connector.
3. **Permanent Persistence**: Write final resolved ledger records toward an append-only target. Apply database triggers directly overriding the physical DB engine to throw blocking exceptions on any generic SQL user attempting `DELETE` or `UPDATE` actions against current audit archives.

## Consequences

### Positive
- Dual benefit: super-fast local visibility of latest modifier, plus absolute legal replay capability from append-only ledger.
- Eliminates vendor trigger coupling by handling intent aggregation inside application flow.

### Negative
- Developer rigor is required to ensure all write operations faithfully hook auditing dispatch hooks.
- Physical storage footprint linearly expands indefinitely via continuous appends; archivals will eventually require lifecycle rotation policies.

## References
- [ADR-0031: Domain Event Catalog](../../adrs/core/0031-schema-per-context-domain-event-catalog.md)
- [ADR-0015: Event Driven Architecture](../../adrs/core/0015-event-driven-architecture-intra-domain.md)





## Objective and Scope

Historical backfill: Address the architectural tension where regulated operations require absolute traceability, establishing a standard boundary.

## Options Considered

- **Selected:** Immutable Business Audit Trail and Change Tracking
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [ADR-0031: Domain Event Catalog](../../adrs/core/0031-schema-per-context-domain-event-catalog.md)
- [ADR-0015: Event Driven Architecture](../../adrs/core/0015-event-driven-architecture-intra-domain.md)

---
[Back to Index](./README.md)
