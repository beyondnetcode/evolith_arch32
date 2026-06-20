# Modular Monolith Topology Profile

> **Bilingual Navigation:** [Version en Espanol](./README.es.md)

**Status:** Accepted  
**Dimension:** `progressive-axis`  
**Topology ID:** `modular-monolith`  
**Compatibility Alias:** `F1`  
**Manifest:** [topology.manifest.json](./topology.manifest.json)

The modular monolith is the canonical Evolith starting topology. It keeps deployment simple while enforcing strict domain boundaries, explicit contracts, Data Mapper and Repository patterns, and extraction readiness from the beginning.

## Purpose

Use this topology when the product must move fast without paying distributed-systems cost before the business and operations justify it.

The topology is not an unstructured monolith. It is one deployable system organized as explicit bounded contexts with stable contracts, isolated domain logic, controlled persistence boundaries, and a clear future extraction path.

## Governance Rules

| Rule | Requirement |
|---|---|
| Bounded contexts | Domain capabilities must be isolated as explicit modules or bounded contexts. |
| Persistence | Domain logic must stay decoupled from persistence through Data Mapper and Repository patterns. |
| Integration | Cross-context communication should prefer explicit contracts and events over direct hidden coupling. |
| Extraction readiness | Module boundaries, contracts, and data ownership must remain ready for F2/F3 evolution. |
| Distribution restraint | Do not extract services until ADR-0045 readiness criteria justify the operational cost. |

## Required Authority

| Artifact | Role |
|---|---|
| [ADR-0047: Progressive Architecture Evolution Framework](../../../adrs/core/0047-architectural-patterns-monolith-soa-microservices.md) | Governs progressive evolution and over-design prevention. |
| [ADR-0067: Modular Monolith Schema per Domain](../../../adrs/core/0067-modular-monolith-schema-per-domain.md) | Governs data boundary isolation for modular monoliths. |
| [ADR-0079: Multi-Topology Reference Corpus](../../../adrs/core/0079-multi-topology-reference-corpus.md) | Governs topology manifests and composition. |
| [F1 Architecture Rules](./modular-monolith.rules.json) | Existing executable compatibility rules. |
| [Topology Dimensions Model](../../topology-dimensions.md) | Defines composition and compatibility rules. |

## Composition

`modular-monolith` can combine with:

| Topology | Why It Can Compose |
|---|---|
| `event-driven` | Adds decoupled integration while preserving one deployable system. |
| `serverless` | Allows isolated managed execution points without forcing full service extraction. |
| `data-mesh` | Can introduce analytical ownership models while transactional ownership remains bounded. |
| `agentic-ai` | Can add AI-agent workflows governed by MCP context and rulesets. |

## Business Boundary

This profile is technical-only. It defines architecture constraints and validation context. It does not define delivery timing, ownership, staffing, ROI, cost, budget, or Funnel 0 prioritization. Evolith Tracker owns those business concerns through its ACL.

---
[Back to Topology Hub](../../README.md)
