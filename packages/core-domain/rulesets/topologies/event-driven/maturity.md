# Event-Driven Adoption, Operations, and Evolution Guide

> **Bilingual Navigation:** [Version en Espanol](./maturity.es.md)

## Adoption

Adopt this topology when bounded contexts, modules, or services must coordinate without tight synchronous coupling. Start with explicit event contracts, reliable publication via Transactional Outbox, and idempotent consumer design.

## Operations

Operate one or more message brokers or event buses. Monitor event flow correlation, consumer lag, dead-letter queue depth, and replay evidence as part of normal architecture validation.

## Security

Authorize event production and consumption at the broker and application boundaries. Never embed sensitive data in event payloads; use reference identifiers and a secure data plane for payload retrieval.

## Resilience

Design consumers for idempotent retry, dead-letter escalation for unprocessable events, and schema evolution tolerance. Prefer broker-managed redelivery over application-level retry loops.

## Patterns and Anti-Patterns

Use explicit AsyncAPI contracts, Transactional Outbox for reliable publication, Dead Letter Queues for failed message handling, and event versioning with backward compatibility. Do not share domain internals through events, use events for workflow orchestration, or assume in-order delivery without explicit sequencing.

## Evolution

Move to event-driven integration only when asynchronous coordination is justified by business workflow requirements. Preserve event contracts and schema registries so that consumer migration remains deliberate.

## Validation Checklist

- Validate the topology configuration against `topology.config.schema.json` and both fixtures.
- Run Native and OPA policy evaluation through the shared control plane.
- Confirm approved ADRs, bilingual guidance, and reproducible positive and negative tests.

---
[Back to Event-Driven Profile](./README.md)
