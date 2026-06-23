# Microservices — Patterns Guide

> **Bilingual Navigation:** [English](./patterns.md) | [Español](./patterns.es.md)

**Owner:** Architecture Board
**Topology:** Microservices

## Saga Orchestration

Use the Saga pattern for distributed transactions that span multiple services. Choose orchestration (central coordinator) over choreography when the business process has complex decision logic. Each saga step must be compensatable. Define rollback actions for every forward action.

## CQRS (Command Query Responsibility Segregation)

Separate read and write models when read and write workloads have different scaling or consistency requirements. Use CQRS for services with high read-to-write ratios. Publish read-model projections from write-side events. Accept eventual consistency in read models.

## Event Sourcing

Store state as an immutable sequence of events rather than mutable rows. Event sourcing provides a complete audit trail and enables temporal queries. Pair with CQRS for practical read-side materialization. Use event schema registries to manage evolution.

## API Gateway

Deploy an API gateway as the single entry point for external consumers. The gateway handles routing, authentication, rate limiting, and protocol translation. Avoid god-gateway anti-pattern — keep gateway logic thin and domain-agnostic.

## Service Discovery

Use a service registry (Consul, Kubernetes DNS, or Eureka) for dynamic service location. Health-check registered instances and auto-remove unhealthy endpoints. Prefer client-side discovery for latency-sensitive paths and server-side for simplicity.

## Database per Service

Enforce **MS-R06** (No Shared Persistence) — each service owns its database. No service may read or write another service's database directly. Cross-service data access goes through published APIs or events. Use data mesh principles (**ADR-0076**) for domain-oriented data ownership.

## Contract Testing

Apply **MS-R05** (Contract Tests/Pact) to validate API compatibility between consumers and providers. Run contract tests in CI for every change. Reject deployments that break published contracts. Use Pact or similar consumer-driven contract frameworks.

## References

| Rule | Description |
|------|-------------|
| **MS-R05** | Contract Tests / Pact |
| **MS-R06** | No Shared Persistence |
| **ADR-0076** | Domain-oriented data ownership |

---
[Back to Microservices Profile](./README.md)
