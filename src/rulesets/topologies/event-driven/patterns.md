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

## CQRS (Command Query Responsibility Segregation)

- Separate write model (commands) from read model (queries) for independent scaling.
- Synchronize read model via events published from the write side.
- Accept eventual consistency between write and read models; design UIs accordingly.

## Saga Pattern

- Coordinate multi-step business processes as a sequence of local transactions.
- Implement compensating transactions for rollback when a step fails.
- Prefer choreography (event-driven) for simple sagas; use orchestration (central coordinator) for complex, long-running workflows.

## Transactional Outbox — ED-R02

- Ensure reliable event publication by writing events to an outbox within the same DB transaction as the business write.
- Use CDC (Debezium) or a polling publisher to relay outbox events to the broker.
- Deduplicate at the consumer side; the outbox may publish duplicates during failover.

## Change Data Capture (CDC)

- Stream database changes as events without modifying application code.
- Use Debezium or equivalent connectors for PostgreSQL, MySQL, or SQL Server.
- Monitor connector lag; alert when lag exceeds 5 minutes.

## Choreography vs. Orchestration — ED-R04

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

- **ADR-0015**: Event sourcing and CQRS adoption criteria.
- **ADR-0079**: Saga orchestration vs. choreography decision framework.

---

[Back to Event-Driven Profile](./README.md)
