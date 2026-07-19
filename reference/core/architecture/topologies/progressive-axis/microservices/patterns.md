# Microservices — Patterns Guide

> **Bilingual Navigation:** [English](./patterns.md) | [Español](./patterns.es.md)

**Owner:** Architecture Board
**Topology:** Microservices

## Saga Orchestration

Use the Saga pattern for distributed transactions that span multiple services. Per **ADR-0035**, apply the Local First Rule before reaching for a Saga: if the process fits in a single bounded context, use a local ACID transaction. When a Saga is warranted, the style is set by step count — choreography for short chains (**2 to 3 steps**), orchestration with a dedicated Saga Orchestrator for complex workflows (**more than 3 steps**). Each saga step must be compensatable. Define rollback actions for every forward action.

## CQRS (Command Query Responsibility Segregation)

**Applicability gate — ADR-0034 (Accepted).** CQRS is not the default for a service. Basic CRUD and simple state changes stay on the Tier 1 single-model path; view-shaping needs are met at Tier 2 with BFF-level read projections while commands still go to the core repository. Full CQRS (Tier 3) is mandated only when **at least two** of these hold: read-to-write ratio above **100:1**; heavy analytical reads contending with transactions and requiring a read-replica projection; multiple distinct view projections not derivable from the aggregate without heavy compute; or audit logic requiring history-stream storage.

Once Tier 3 applies, separate read and write models, publish read-model projections from write-side events, and accept eventual consistency in read models.

## Event Sourcing

Store state as an immutable sequence of events rather than mutable rows. Event sourcing provides a complete audit trail and enables temporal queries. Pair with CQRS for practical read-side materialization. Use event schema registries to manage evolution.

## API Gateway

Deploy an API gateway as the single entry point for external consumers. The gateway handles routing, authentication, rate limiting, and protocol translation. Avoid god-gateway anti-pattern — keep gateway logic thin and domain-agnostic.

## Service Discovery

Use a service registry (Consul, Kubernetes DNS, or Eureka) for dynamic service location. Health-check registered instances and auto-remove unhealthy endpoints. Prefer client-side discovery for latency-sensitive paths and server-side for simplicity.

## Database per Service

Enforce **MS-R06** (No Shared Persistence) — each service owns its database. No service may read or write another service's database directly. Cross-service data access goes through published APIs or events. Use data mesh principles (**ADR-0084**) for domain-oriented decentralized data ownership. Service grouping itself is governed separately by **ADR-0076** (DOMA), which does not address data ownership.

## Contract Testing

Apply **MS-R05** (Contract Tests/Pact) to validate API compatibility between consumers and providers. Run contract tests in CI for every change. Reject deployments that break published contracts. Use Pact or similar consumer-driven contract frameworks.

## References

| Rule | Description |
|------|-------------|
| **MS-R05** | Contract Tests / Pact |
| **MS-R06** | No Shared Persistence |
| **ADR-0034** | CQRS Pattern Application Matrix (applicability gate) |
| **ADR-0035** | Distributed Saga Pattern Implementation Strategy (choreography/orchestration threshold) |
| **ADR-0076** | Domain-Oriented Microservice Architecture (DOMA) — service grouping |
| **ADR-0084** | Data Mesh and Data as a Product — domain-oriented data ownership |

---
[Back to Microservices Profile](./README.md)
