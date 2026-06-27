# Edge Computing Adoption, Operations, and Evolution Guide

> **Bilingual Navigation:** [Version en Espanol](./maturity.es.md)

## Adoption

Adopt this topology when latency, locality, offline tolerance, regulatory placement, or device-adjacent processing requires execution outside the central runtime. Start with documented locality justification, explicit synchronization strategy, and edge node isolation.

## Operations

Operate edge nodes with store-and-forward observability, conflict-aware synchronization, and intermittent connectivity tolerance. Monitor sync lag, conflict rates, and offline duration as part of normal architecture validation.

## Security

Enforce authentication and authorization at each edge node. Use environment-injected secrets with rotation capability appropriate to constrained environments. Never embed credentials in edge deployment artifacts.

## Resilience

Design edge nodes for autonomous operation during network partitions with offline-first persistence patterns. Prefer background synchronization with explicit conflict resolution over real-time coupling.

## Patterns and Anti-Patterns

Use offline-first local databases with background sync, explicit conflict resolution strategies (last-write-wins, merge, manual), and store-and-forward observability. Do not fork domain logic at the edge, assume always-on connectivity, or bypass central governance for edge convenience.

## Evolution

Move to edge computing only when latency, locality, or regulatory constraints justify the operational complexity. Preserve domain ownership boundaries and synchronization contracts so that workload relocation remains deliberate.

## Validation Checklist

- Validate the topology configuration against `topology.config.schema.json` and both fixtures.
- Run Native and OPA policy evaluation through the shared control plane.
- Confirm approved ADRs, bilingual guidance, and reproducible positive and negative tests.

---
[Back to Edge Computing Profile](./README.md)
