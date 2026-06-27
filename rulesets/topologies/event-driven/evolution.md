# Event-Driven — Evolution Guide

> **Bilingual Navigation:** [English](./evolution.md) | [Español](./evolution.es.md)

**Owner:** Architecture Board
**Topology:** Event-Driven

## Purpose

Guide the evolution of event-driven systems: migrating from synchronous to asynchronous patterns, schema evolution, versioning strategies, and event catalog governance.

## Sync-to-Async Migration

- Identify synchronous call chains that block on external dependencies; candidates for event extraction.
- Start with non-critical paths (notifications, analytics) before migrating transactional flows.
- Run synchronous and asynchronous paths in parallel during migration; deprecate sync after validation.

## Schema Evolution — ED-R06

- Prefer additive changes: add optional fields with defaults over removing or renaming fields.
- Maintain backward compatibility for at least 2 major release cycles.
- Use schema registry compatibility modes: BACKWARD (consumers tolerate new fields), FORWARD (producers tolerate old consumers), FULL (both).

## Versioning Strategy

- Embed version in the event envelope: `event-version: "1.2.0"`.
- Use semantic versioning for schema changes: major (breaking), minor (additive), patch (fixes).
- Maintain a version mapping table for migration paths between major versions.

## Event Catalog Governance — ED-R07

- Register every event type in a centralized catalog with ownership, domain, and retention metadata.
- Require catalog entry before publishing a new event type to any environment.
- Review catalog quarterly; archive unused events after stakeholder confirmation.

## Deprecation Process

- Mark deprecated events with `deprecated: true` in the catalog and schema registry.
- Maintain deprecated events for a minimum of 6 months or 2 release cycles, whichever is longer.
- Monitor consumer usage of deprecated events; notify owning teams when consumers remain.

## Composable Applicability

| Composable | Guidance |
|---|---|
| Modular Monolith | Schema evolution within module; catalog is intra-process. |
| Distributed Modules | Cross-module schema coordination; shared catalog required. |
| Microservices | Per-domain event catalog; schema registry as shared infrastructure. |
| Serverless | Managed schema registry; versioning enforced by platform. |
| Edge Computing | Local schema cache with periodic sync from central catalog. |

## ADR References

- **ADR-0015**: Schema evolution and versioning policy.
- **ADR-0079**: Event catalog governance and lifecycle management.

---

[Back to Event-Driven Profile](./README.md)
