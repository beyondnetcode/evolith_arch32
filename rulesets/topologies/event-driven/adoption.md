# Event-Driven — Adoption Guide

> **Bilingual Navigation:** [English](./adoption.md) | [Español](./adoption.es.md)

**Owner:** Architecture Board
**Topology:** Event-Driven

## Purpose

Define entry criteria, setup procedures, and adoption checklists for teams adopting event-driven architecture: event catalog setup, producer/consumer contracts, and readiness validation.

## Entry Criteria

Before adopting event-driven patterns, verify:

- At least one asynchronous use case is identified (e.g., cross-domain notification, eventual consistency requirement).
- Team has access to a message broker (managed or self-hosted).
- Team understands event-driven tradeoffs vs. synchronous alternatives.
- Schema registry infrastructure is available or planned.

## Event Catalog Setup

- Create catalog entry for each event type with: name, domain, owner, schema version, retention policy.
- Assign a domain owner responsible for schema changes and deprecation.
- Publish catalog to a discoverable location (wiki, portal, or code repository).

## Producer Contracts — ED-R01

- Register AsyncAPI specification for every event type before first publication.
- Define required and optional fields with types and defaults.
- Include event metadata: event-id, event-version, timestamp, correlation-id.

## Consumer Contracts — ED-R05

- Declare expected event types and schema versions in consumer registration.
- Document idempotency strategy and deduplication window.
- Define lag tolerance and alert thresholds for the consumer.

## Readiness Checklist

- [ ] AsyncAPI specification registered in schema registry
- [ ] Event catalog entry created with owner and retention
- [ ] Producer implements schema validation before publish
- [ ] Consumer implements idempotent processing
- [ ] DLQ routing configured with retry policy
- [ ] Monitoring dashboards created for lag and throughput
- [ ] Runbooks documented for failure scenarios
- [ ] Team trained on event-driven patterns and tradeoffs

## Composable Applicability

| Composable | Guidance |
|---|---|
| Modular Monolith | Lightweight catalog; embedded broker; intra-process event validation. |
| Distributed Modules | Shared catalog; cross-module contract review required. |
| Microservices | Full catalog with domain ownership; per-service contract registration. |
| Serverless | Platform-managed catalog; contract enforcement via platform policies. |
| Edge Computing | Local catalog with cloud sync; simplified contract for edge constraints. |

## ADR References

- **ADR-0015**: Event catalog and producer contract standards.
- **ADR-0079**: Consumer contract and readiness requirements.

---

[Back to Event-Driven Profile](./README.md)
