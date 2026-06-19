# Microservices Topology Profile

> **Bilingual Navigation:** [Version en Espanol](./README.es.md)

**Status:** Accepted  
**Dimension:** `progressive-axis`  
**Topology ID:** `microservices`  
**Compatibility Alias:** `F3`  
**Manifest:** [topology.manifest.json](./topology.manifest.json)

Microservices are the Evolith topology for independently deployable services with explicit contracts, domain-oriented ownership, mature operations, and strong observability. This topology is adopted only when product and operational evidence justify the distribution cost.

## Purpose

Use this topology when bounded contexts require independent deployment, scaling, reliability isolation, or team autonomy that cannot be satisfied by modular monolith or distributed modules.

This topology is not a reward for codebase growth. It is a high-governance operating model that requires contract discipline, deployment automation, failure isolation, service ownership, and measurable readiness.

## Governance Rules

| Rule | Requirement |
|---|---|
| Readiness evidence | F3 adoption must satisfy ADR-0045 extraction readiness thresholds. |
| Domain orientation | Services must align to bounded domains, not technical layers or individual entities. |
| Contract ownership | Service APIs, events, and data contracts must be explicit, versioned, and backward-compatible. |
| Operational maturity | Services require observability, deployment automation, rollback strategy, and failure containment. |
| Data isolation | Each service must own its data boundary; shared database coupling is prohibited unless explicitly waived. |

## Required Authority

| Artifact | Role |
|---|---|
| [ADR-0045: Microservice Extraction Readiness Criteria](../../../adrs/core/0045-microservice-extraction-readiness-criteria.md) | Defines quantitative readiness for service extraction. |
| [ADR-0047: Progressive Architecture Evolution Framework](../../../adrs/core/0047-architectural-patterns-monolith-soa-microservices.md) | Governs progressive evolution and over-design prevention. |
| [ADR-0076: Domain-Oriented Microservice Architecture](../../../adrs/core/0076-domain-oriented-microservice-architecture.md) | Governs F3 service grouping by bounded domains. |
| [ADR-0079: Multi-Topology Reference Corpus](../../../adrs/core/0079-multi-topology-reference-corpus.md) | Governs topology manifests and composition. |
| [F3 Architecture Rules](../../../../../rulesets/architecture/f3-microservices.rules.json) | Existing executable compatibility rules. |
| [Topology Dimensions Model](../../topology-dimensions.md) | Defines composition and compatibility rules. |

## Composition

`microservices` can combine with:

| Topology | Why It Can Compose |
|---|---|
| `event-driven` | Reduces synchronous coupling and supports resilient service coordination. |
| `data-mesh` | Aligns analytical data products with domain-oriented service ownership. |
| `edge-computing` | Allows selected service capabilities to run close to users, devices, or regions. |
| `serverless` | Supports managed execution for selected service-adjacent workflows. |
| `agentic-ai` | Enables governed AI-agent workflows across service boundaries. |

## Business Boundary

This profile is technical-only. It defines architecture constraints and validation context. It does not define delivery timing, ownership, staffing, ROI, cost, budget, or Funnel 0 prioritization. Evolith Tracker owns those business concerns through its ACL.

---
[Back to Topology Hub](../../README.md)
