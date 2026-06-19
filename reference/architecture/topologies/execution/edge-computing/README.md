# Edge Computing Topology Profile

> **Bilingual Navigation:** [Version en Espanol](./README.es.md)

**Status:** Draft  
**Dimension:** `execution`  
**Topology ID:** `edge-computing`  
**Manifest:** [topology.manifest.json](./topology.manifest.json)

Edge computing is an execution topology for workloads that must run close to users, devices, regions, or constrained network boundaries while remaining governed by the same Evolith Core architecture contracts.

## Purpose

Use this topology when latency, locality, offline tolerance, regulatory placement, or device-adjacent processing requires execution outside the central runtime.

Edge workloads must remain governed by explicit synchronization, security, observability, deployment, and data-boundary rules. Edge placement is not permission to duplicate domain logic without ownership.

## Governance Rules

| Rule | Requirement |
|---|---|
| Locality rationale | Edge placement must be justified by latency, resiliency, locality, or regulatory constraints. |
| Synchronization | State synchronization must be explicit, observable, and conflict-aware. |
| Security | Edge nodes must enforce authentication, authorization, and secret handling appropriate to constrained environments. |
| Observability | Edge workloads must report health, failure, and trace context despite intermittent connectivity. |
| Domain ownership | Edge logic must not fork domain behavior outside the owning bounded context. |

## Composition

`edge-computing` can combine with `microservices`, `distributed-modules`, `event-driven`, `serverless`, and `agentic-ai` when locality and synchronization rules are explicit.

## Business Boundary

This draft profile is technical-only. It does not define ROI, cost model, hardware spend, staffing, delivery timing, prioritization, or Funnel 0. Evolith Tracker owns those business concerns through its ACL.

---
[Back to Topology Hub](../../README.md)
