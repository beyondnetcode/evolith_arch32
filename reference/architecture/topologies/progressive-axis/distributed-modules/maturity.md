# Distributed Modules Adoption, Operations, and Evolution Guide

> **Bilingual Navigation:** [Version en Espanol](./maturity.es.md)

## Adoption

Adopt this topology only after bounded contexts have stable contracts and independently managed operational needs. Define ownership, deployment boundaries, and compatibility expectations before distribution.

## Operations

Operate each module with observable dependencies, versioned contracts, and a clear rollback path. Monitor availability, contract failures, and delivery ownership at module boundaries.

## Security

Use workload identities and explicit service-to-service authorization. Do not transfer credentials, tenant scope, or privileged access through implicit internal calls.

## Resilience

Design for partial failure with bounded timeouts, idempotency, retries, and durable recovery paths. A module outage must not silently corrupt a neighboring module's data.

## Patterns and Anti-Patterns

Use contract-first integration, owned data, and transactional outbox patterns when events cross a module boundary. Do not create a distributed monolith through shared databases, synchronous dependency chains, or release lockstep.

## Evolution

Promote a module to a microservice only when its autonomy, operational ownership, and data boundary justify the additional platform cost. Preserve compatibility contracts during every extraction.

## Validation Checklist

- Validate the topology configuration against `topology.config.schema.json` and both fixtures.
- Run Native and OPA policy evaluation through the shared control plane.
- Confirm approved ADRs, bilingual guidance, and reproducible positive and negative tests.

---
[Back to Distributed Modules Profile](./README.md)
