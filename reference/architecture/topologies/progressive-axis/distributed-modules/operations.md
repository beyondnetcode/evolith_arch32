# Distributed Modules — Operations Guide

> **Bilingual Navigation:** [English](./operations.md) | [Español](./operations.es.md)

**Owner:** Architecture Board
**Topology:** Distributed Modules

## Overview

This guide defines operational practices for distributed modules, covering independent deployment, contract versioning, service discovery, health checks, distributed tracing, and incident response.

## Independent Deployment

Each module must deploy independently without requiring coordinated releases across the system. Module lifecycle is owned by its designated team (DM-R01).

- **Deploy pipeline isolation**: Each module has its own CI/CD pipeline with module-scoped build, test, and deploy stages.
- **Database migration strategy**: Modules own their schemas; migrations run within module deployment context using expand-contract pattern.
- **Rollback capability**: Every deployment must support automated rollback within a defined window.

## Contract Versioning

Explicit versioned contracts govern inter-module communication (DM-R02). Breaking changes require a new major version and a deprecation window.

- **Semantic versioning**: Modules apply semver to API and event contracts.
- **Backward compatibility window**: Minimum 90-day overlap for deprecated contract versions.
- **Contract registry**: Centralized registry catalogs all active and deprecated contract versions.

## Service Discovery

Modules register with the service mesh or discovery mechanism at startup. Discovery data includes version, capabilities, and health endpoint.

- **Registration**: Automatic registration on startup, deregistration on graceful shutdown.
- **Lookup**: Consumers resolve module endpoints via discovery, not hardcoded addresses.
- **Version filtering**: Discovery supports routing to specific contract versions during transitions.

## Health Checks

Every module exposes liveness and readiness endpoints. Health status feeds into the orchestrator and load balancer.

- **Liveness**: Verifies the module process is running and responsive.
- **Readiness**: Verifies the module can accept traffic, including downstream dependencies.
- **Custom health probes**: Modules define domain-specific health checks beyond basic connectivity.

## Distributed Tracing

All inter-module calls propagate trace context (DM-R05). Traces span the full request lifecycle across module boundaries.

- **Trace propagation**: HTTP headers and message metadata carry trace and span IDs.
- **Sampling strategy**: Adaptive sampling balances visibility with overhead; errors always traced.
- **Trace storage**: Traces stored in a centralized observability backend with configurable retention.

## Incident Response

Incident response procedures account for module isolation. Failures in one module must not cascade to unrelated areas.

- **Escalation path**: Module owner is first responder; architecture board for cross-module incidents.
- **Runbook linkage**: Each module maintains operational runbooks for known failure modes.
- **Post-incident review**: Root cause analysis documents lessons; findings feed back into module and governance updates.

---

[Back to Distributed Modules Profile](./README.md)
