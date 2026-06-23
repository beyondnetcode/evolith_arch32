# Microservices — Evolution Guide

> **Bilingual Navigation:** [English](./evolution.md) | [Español](./evolution.es.md)

**Owner:** Architecture Board
**Topology:** Microservices

## Service Decomposition

Decompose monoliths along domain boundaries using Domain-Driven Design (DDD). Identify bounded contexts first, then extract services. Do not split by technical layer (e.g., separate "UI service" or "database service"). Each service must own a cohesive business capability.

## Data Ownership Migration

When extracting a service, migrate its data from the shared database. Use the Strangler Fig pattern: route reads to the new service, backfill data, then cut over writes. Respect **MS-R06** (No Shared Persistence) — the old service must stop accessing migrated data immediately after cutover.

## Merging Services

Services can be merged when the boundary between them causes more overhead than value. Signs include: constant cross-service coordination, shared data schemas, and coupled release cycles. Merge only when both teams agree and the merged service maintains clear internal structure.

## Domain-Oriented Architecture

Follow **ADR-0076** (Domain-Oriented Data Ownership). Each domain owns its data, APIs, and operational responsibility. Domains may be served by one or more services. Use domain reviews to evaluate service boundaries annually.

## API Versioning

Version all public APIs. Use semantic versioning for REST and gRPC. Deprecate old versions with a sunset header and documented migration timeline. Never remove a version without at least one release cycle of deprecation notice.

## Backward Compatibility

Maintain backward compatibility for at least two versions. Use additive-only schema changes. Breaking changes require a new API version and a coordinated migration plan with consumers.

## Decommissioning

Define a decommissioning checklist: archive data, remove DNS entries, update service catalog, notify dependent teams, and delete infrastructure. Services must not leave orphaned resources or undocumented dependencies.

## References

| Rule | Description |
|------|-------------|
| **MS-R01** | Independent Deployability |
| **MS-R06** | No Shared Persistence |
| **ADR-0076** | Domain-oriented data ownership |

---
[Back to Microservices Profile](./README.md)
