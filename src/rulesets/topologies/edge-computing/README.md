# Edge Computing Topology Profile

> **Bilingual Navigation:** [Version en Espanol](./README.es.md)

**Status:** Accepted  
**Dimension:** `execution`  
**Topology ID:** `edge-computing`  
**Compatibility Alias:** `F2-compatible`  
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

## Required Authority

| Artifact | Role |
|---|---|
| [ADR-0079: Multi-Topology Reference Corpus](../../../reference/core/architecture/adrs/core/0079-multi-topology-reference-corpus.md) | Governs topology manifests and composition. |
| [ADR-0096: Edge Computing Architecture Governance](../../../reference/core/architecture/adrs/core/0096-edge-computing-architecture-governance.md) | Governs edge-specific architecture constraints. |
| [Edge Computing Architecture Rules](./edge-computing.rules.json) | Existing executable compatibility rules. |
| [Topology Dimensions Model](../../../reference/core/architecture/topologies/topology-dimensions.md) | Defines composition and compatibility rules. |

## Executable Contract

Satellites adopting this topology must declare an `edge-computing.config.json` file in their root. This JSON acts as the executable machine-readable contract evaluated by the Evolith Governance Engine.

```json
{
  "syncStrategy": "offline-first",
  "edgeIsolation": true,
  "conflictResolution": "last-write-wins"
}
```

EC-R01 through EC-R03 require that contract, enforcing a declared synchronization strategy, edge node isolation for autonomous operation, and an explicit conflict resolution mode. The Native evaluator and [OPA policy](./edge-computing.rego) evaluate these fields.

### Offline-First Persistence Patterns

A critical aspect of the Edge Computing topology is handling intermittent connectivity. To comply with `EC-R01` (Mandatory Synchronization Strategy) and `EC-R03` (Conflict Resolution), edges must implement offline-first persistence patterns:

1.  **Local-First Reads & Writes:** Use local databases (e.g., SQLite, IndexedDB) as the primary data store for the edge workload. This ensures the application remains fully functional during network partitions (`edgeIsolation: true`).
2.  **Background Synchronization:** Utilize background workers or service workers to synchronize local changes with the central control plane when connectivity is restored.
3.  **Conflict Resolution:** Explicitly declare and handle state conflicts resulting from offline modifications (e.g., `last-write-wins`, manual merging).

## Composition

`edge-computing` can combine with:

| Topology | Why It Can Compose |
|---|---|
| `microservices` | Places individual service workloads at the edge with governed synchronization. |
| `distributed-modules` | Extends module boundaries to edge locations with explicit sync contracts. |
| `event-driven` | Coordinates edge state changes through observable event channels. |
| `serverless` | Deploys managed execution units at edge locations with bounded initialization. |
| `agentic-ai` | Runs AI-agent inference at the edge with offline-capable governance. |

## Business Boundary

This profile is technical-only. It does not define ROI, cost model, hardware spend, staffing, delivery timing, prioritization, or Funnel 0. Evolith Tracker owns those business concerns through its ACL.

## Operational Budgets

This topology declares architectural envelopes for latency, cold-start, and per-execution cost in `spec.operationalBudgets` of [`topology.manifest.json`](./topology.manifest.json). Operators verify satellites against these envelopes following the shared [Operational Budgets Runbook](../../../reference/core/architecture/topologies/execution/operational-budgets-runbook.md).

---
[Back to Topology Hub](../../README.md)
