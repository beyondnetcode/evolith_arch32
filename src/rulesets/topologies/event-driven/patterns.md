# Event-Driven — Patterns Guide

> **Bilingual Navigation:** [English](./patterns.md) | [Español](./patterns.es.md)

**Owner:** Architecture Board
**Topology:** Event-Driven

## Purpose

Document core event-driven patterns: event sourcing, CQRS, saga, transactional outbox, change data capture (CDC), and choreography vs. orchestration tradeoffs.

## Event Sourcing

- Persist state as an immutable sequence of events rather than current-state snapshots.
- Rebuild state by replaying events from the beginning of the stream.
- Use snapshots periodically to bound replay time (e.g., every 1,000 events).

> **Governance status:** no ADR governs Event Sourcing adoption on its own. It appears in the corpus only as criterion 4 ("State Reconstruction") of the ADR-0034 Tier 3 matrix. Treat the guidance above as descriptive, not mandated.

## CQRS (Command Query Responsibility Segregation)

**Applicability gate — ADR-0034 (Accepted).** CQRS is not a default. ADR-0034 exists to stop blind adoption: basic CRUD and simple state changes stay on the Tier 1 single-model path, and view-shaping needs are met at Tier 2 with BFF-level read projections while commands still go to the core repository. Full CQRS (Tier 3, physical code/logic separation) is mandated only when **at least two** of these hold: read-to-write ratio above **100:1**; heavy analytical reads contending with transactions and requiring a read-replica projection; multiple distinct view projections not derivable from the aggregate without heavy compute; or audit logic requiring history-stream storage.

Once Tier 3 applies:

- Separate write model (commands) from read model (queries) for independent scaling.
- Synchronize read model via events published from the write side.
- Accept eventual consistency between write and read models; design UIs accordingly.

## Saga Pattern

- Coordinate multi-step business processes as a sequence of local transactions.
- Implement compensating transactions for rollback when a step fails.
- **Style threshold — ADR-0035 (Accepted):** choreography is the standard recommendation for short chains (**2 to 3 steps**); orchestration with a dedicated Saga Orchestrator is the mandatory recommendation for complex workflows (**more than 3 steps**).
- Before deploying a Saga at all, apply the ADR-0035 Local First Rule: if the process fits in a single bounded context, use a local ACID transaction instead.

## Transactional Outbox — ED-R02

- Ensure reliable event publication by writing events to an outbox within the same DB transaction as the business write.
- Use CDC (Debezium) or a polling publisher to relay outbox events to the broker.
- Deduplicate at the consumer side; the outbox may publish duplicates during failover.

## Change Data Capture (CDC)

- Stream database changes as events without modifying application code.
- Use Debezium or equivalent connectors for PostgreSQL, MySQL, or SQL Server.
- Monitor connector lag; alert when lag exceeds 5 minutes.

## Choreography vs. Orchestration

The choice is governed by ADR-0035 (2–3 steps → choreography; more than 3 steps → orchestration), not by any executable rule. ED-R04 governs only the ordering guarantee a satellite must declare, and does not decide this tradeoff.

| Aspect | Choreography | Orchestration |
|---|---|---|
| Coupling | Loose; services react to events | Tighter; coordinator invokes services |
| Visibility | Distributed; harder to trace | Centralized; easier to monitor |
| Error handling | Compensating events per service | Centralized retry and compensation |
| Use case | Simple, few-step workflows | Complex, multi-service, long-running |

## Composable Applicability

| Composable | Guidance |
|---|---|
| Modular Monolith | Event sourcing and CQRS within module boundaries; outbox is intra-DB. |
| Distributed Modules | Saga across modules; choreography preferred for loose coupling. |
| Microservices | Full saga with orchestration or choreography; CDC for data synchronization. |
| Serverless | Event sourcing with managed streams; CDC via managed connectors. |
| Edge Computing | Local event sourcing with periodic cloud synchronization. |

## ADR References

- **ADR-0034**: CQRS Pattern Application Matrix — the applicability gate (Tiers 1–3) for CQRS.
- **ADR-0035**: Distributed Saga Pattern Implementation Strategy — saga applicability and the choreography vs. orchestration threshold.
- **ADR-0015**: Event-Driven Architecture for Intra-Domain Communication — the event bus these patterns publish to.
- **Event Sourcing**: no governing ADR; covered only as a Tier 3 criterion inside ADR-0034.

---

[Back to Event-Driven Profile](./README.md)
