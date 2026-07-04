# Event-Driven — Resilience Guide

> **Bilingual Navigation:** [English](./resilience.md) | [Español](./resilience.es.md)

**Owner:** Architecture Board
**Topology:** Event-Driven

## Purpose

Define resilience patterns for event-driven architectures: idempotent consumers, exactly-once semantics, poison pill handling, retry backoff, consumer rebalancing, and transactional outbox.

## Idempotent Consumers — ED-R05

- Every consumer MUST process events idempotently; duplicate delivery is assumed.
- Use deduplication keys composed of `(event-id, consumer-group)` stored in a durable cache.
- Set deduplication window to at least 2x the broker's maximum retention period.

## Exactly-Once Semantics

- Prefer idempotent producers with producer IDs over broker-level exactly-once guarantees.
- For critical workflows, use transactional producers that atomically write to multiple topics.
- Document the semantic guarantee level (at-least-once, effectively-once) per consumer.

## Poison Pill Handling — ED-R03

- Detect poison pills by tracking per-message retry counts in consumer state.
- After configurable retry exhaustion (default: 3), route message to DLQ with full context.
- Alert on poison pill rate exceeding 0.1% of total message volume.

## Retry Backoff

- Implement exponential backoff with jitter: `base * 2^attempt + random(0, base)`.
- Cap maximum retry delay at 5 minutes; escalate to DLQ after cap is reached.
- Use separate retry queues for transient vs. permanent failure categories.

## Consumer Rebalancing

- Design consumers to handle rebalance events gracefully; pause processing during rebalance.
- Use cooperative sticky partition assignment to minimize partition movement.
- Monitor rebalance frequency; investigate if rebalances exceed 1 per hour per consumer group.

## Transactional Outbox — ED-R02

- Write domain events to an outbox table within the same transaction as business state changes.
- Publish outbox events via CDC or polling publisher to the broker.
- Guarantee that outbox records are eventually published; monitor outbox depth.

## Composable Applicability

| Composable | Guidance |
|---|---|
| Modular Monolith | Outbox is intra-database; idempotency via shared cache. |
| Distributed Modules | Cross-module outbox requires careful transaction boundary design. |
| Microservices | Per-service outbox; consumer isolation per service boundary. |
| Serverless | Managed deduplication; outbox via database triggers. |
| Edge Computing | Local outbox with eventual sync to cloud broker. |

## ADR References

- **ADR-0015**: Consumer resilience and retry policy standards.
- **ADR-0079**: Transactional outbox implementation pattern.

---

[Back to Event-Driven Profile](./README.md)
