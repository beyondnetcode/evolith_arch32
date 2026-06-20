# Microservices Adoption, Operations, and Evolution Guide

> **Bilingual Navigation:** [Version en Espanol](./maturity.es.md)

## Adoption

Adopt microservices only for mature bounded domains with independent deployment, scale, reliability, or ownership requirements that outweigh distributed-systems cost.

## Operations

Operate every service with an accountable owner, independent deployability, observable service-level objectives, and incident runbooks. The platform must make dependencies and version compatibility visible.

## Security

Authenticate workloads, authorize every service-to-service request, and propagate only the minimum verified identity and tenant claims. Treat network location as untrusted.

## Resilience

Use timeouts, bounded retries, idempotent handlers, backpressure, and degradation paths. Cross-service changes must recover safely from partial completion.

## Patterns and Anti-Patterns

Use bounded-context ownership, API or event contracts, data ownership, and a Transactional Outbox for cross-service events. Do not share databases, coordinate releases globally, or use distributed transactions as routine integration.

## Evolution

Consolidate services when their independent operations no longer earn their cost. Evolve contracts compatibly, retain audit evidence, and avoid coupling a service's internal model to consumers.

## Validation Checklist

- Validate the topology configuration against `topology.config.schema.json` and both fixtures.
- Run Native and OPA policy evaluation through the shared control plane.
- Confirm approved ADRs, bilingual guidance, and reproducible positive and negative tests.

---
[Back to Microservices Profile](./README.md)
