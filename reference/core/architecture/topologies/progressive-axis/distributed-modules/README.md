# Distributed Modules Topology Profile

> **Bilingual Navigation:** [Version en Espanol](./README.es.md)

**Status:** Accepted  
**Dimension:** `progressive-axis`  
**Topology ID:** `distributed-modules`  
**Compatibility Alias:** `F2`  
**Manifest:** [topology.manifest.json](./topology.manifest.json)

Distributed modules are the Evolith topology for controlled extraction after a modular monolith needs independently deployable or independently scalable boundaries, but before the organization accepts full microservice operational complexity.

## Purpose

Use this topology when modules need stronger deployment or scaling autonomy and the product has explicit contracts, extraction readiness evidence, and operational ownership mature enough to support distribution.

This topology is not a halfway distributed monolith. Each distributed module must expose clear contracts, own its integration boundary, and preserve domain isolation.

## Governance Rules

| Rule | Requirement |
|---|---|
| Extraction evidence | F2 adoption must be justified by ADR-0045 readiness criteria. |
| Module autonomy | Distributed modules must have explicit ownership, contracts, and deployability boundaries. |
| Contract-first integration | Inter-module communication must use explicit schemas, APIs, or event contracts. |
| Data ownership | Shared data coupling must be reduced or governed before extraction. |
| Observability | Distributed boundaries require traceability, health signals, and failure visibility. |

## Required Authority

| Artifact | Role |
|---|---|
| [ADR-0045: Microservice Extraction Readiness Criteria](../../../adrs/core/0045-microservice-extraction-readiness-criteria.md) | Defines quantitative readiness for extraction. |
| [ADR-0047: Progressive Architecture Evolution Framework](../../../adrs/core/0047-architectural-patterns-monolith-soa-microservices.md) | Governs progressive evolution and over-design prevention. |
| [ADR-0079: Multi-Topology Reference Corpus](../../../adrs/core/0079-multi-topology-reference-corpus.md) | Governs topology manifests and composition. |
| [F2 Architecture Rules](./distributed-modules.rules.json) | Existing executable compatibility rules. |
| [Topology Dimensions Model](../../topology-dimensions.md) | Defines composition and compatibility rules. |

## Composition

`distributed-modules` can combine with:

| Topology | Why It Can Compose |
|---|---|
| `event-driven` | Provides resilient coordination across independently deployable modules. |
| `data-mesh` | Aligns module boundaries with analytical data product ownership. |
| `serverless` | Allows selected module capabilities to run as managed execution units. |
| `edge-computing` | Enables selected workloads to move closer to users or devices. |
| `agentic-ai` | Adds governed AI-agent workflows across distributed module boundaries. |

## Business Boundary

This profile is technical-only. It defines architecture constraints and validation context. It does not define delivery timing, ownership, staffing, ROI, cost, budget, or Funnel 0 prioritization. Evolith Tracker owns those business concerns through its ACL.

---
[Back to Topology Hub](../../README.md)
