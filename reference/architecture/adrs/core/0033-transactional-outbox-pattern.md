# [ADR 0033](0033-transactional-outbox-pattern.md): Transactional Outbox Pattern for Async Messaging

## Status
Proposed (Approved via Maturity Roadmap)

## Date
2026-05-11

## Context
Standard decoupled communication relies on updating a database and emitting an event to the message broker (RabbitMQ/Kafka). However, these are separate network operations. If the database commit succeeds but the broker falls offline before the event is sent, the system enters a ghost state (data persisted but downstream actions never trigger). Dual-write failure is a known data consistency risk.

## Decision
Formally adopt the **Transactional Outbox Pattern** to guarantee atomic state propagation between the relational store and async event channels:

1. **Outbox Table**: Every bounded context includes an `outbox_events` table inside its isolated PostgreSQL schema.
2. **Atomic Transaction**: The Application layer writes the Business Entity mutation AND saves the intended `DomainEvent` into the `outbox_events` table within the exact same local ACID SQL transaction (governed via the Unit of Work pattern).
3. **Relay Processor**: An external, guaranteed message relay (e.g., Debezium for CDC or a dedicated background polling worker) reads the `outbox_events` and pushes them into the Message Bus.
4. **Acknowledge & Prune**: Once the Message Bus acknowledges receipt (ACK), the event is flagged as `sent` in the outbox or archived.

## Consequences

### Positive
- **Guaranteed At-Least-Once Delivery**: Eliminates dual-write inconsistency. If the system crashes, the event resides safely in PostgreSQL pending retry.
- **100% Async Stability**: Protects operational flows from temporary RabbitMQ network drops.

### Negative
- Introduces marginal database write overhead (saving the event row).
- Requires the operational deployment of a Relay worker/service to forward the queued events.

## References
- [Transactional Outbox Pattern (Microservices.io)](https://microservices.io/patterns/data/transactional-outbox.html)
- [ADR-0015: Injectable Event Bus](./0015-event-driven-architecture-intra-domain.md)





## Objective and Scope

Historical backfill: Address the architectural tension where standard decoupled communication relies on updating a database and emitting an event to the message broker (RabbitMQ/Kafka), establishing a standard boundary.

## Options Considered

- **Selected:** Transactional Outbox Pattern for Async Messaging
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [Transactional Outbox Pattern (Microservices.io)](https://microservices.io/patterns/data/transactional-outbox.html)
- [ADR-0015: Injectable Event Bus](./0015-event-driven-architecture-intra-domain.md)

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
