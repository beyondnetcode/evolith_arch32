# Serverless Topology Profile

> **Bilingual Navigation:** [Version en Espanol](./README.es.md)

**Status:** Accepted  
**Dimension:** `execution`  
**Topology ID:** `serverless`  
**Compatibility Alias:** `F1-compatible`  
**Manifest:** [topology.manifest.json](./topology.manifest.json)

Serverless is an execution topology for managed, event-scaled workloads where the platform owns runtime provisioning and Evolith Core governs contracts, observability, security, idempotency, and integration boundaries.

## Purpose

Use this topology for isolated capabilities that benefit from managed scaling, event triggers, scheduled jobs, asynchronous processing, or bursty workloads without introducing a separately owned service topology.

Serverless does not replace domain architecture. It composes with `modular-monolith`, `distributed-modules`, or `microservices` when the manifest and architecture review allow the execution boundary.

## Governance Rules

| Rule | Requirement |
|---|---|
| Idempotency | Event-triggered handlers must tolerate retries and duplicate delivery. |
| Contracts | Inputs, outputs, events, and external dependencies must be explicitly versioned. |
| Observability | Each function or managed workflow must emit traceable evidence and failure signals. |
| Boundary control | Serverless handlers must not bypass domain ownership or persistence boundaries. |
| Provider neutrality | Core guidance remains provider-neutral; provider choices belong to product or platform profiles. |

## Required Authority

| Artifact | Role |
|---|---|
| [ADR-0079: Multi-Topology Reference Corpus](../../../reference/core/architecture/adrs/core/0079-multi-topology-reference-corpus.md) | Governs topology manifests and composition. |
| [ADR-0095: Serverless Architecture Governance](../../../reference/core/architecture/adrs/core/0095-serverless-architecture-governance.md) | Governs serverless-specific architecture constraints. |
| [Serverless Architecture Rules](./serverless.rules.json) | Existing executable compatibility rules. |
| [Topology Dimensions Model](../../../reference/core/architecture/topologies/topology-dimensions.md) | Defines composition and compatibility rules. |

## Executable Contract

Every adopting satellite provides `serverless.config.json`:

```json
{
  "stateless": true,
  "package": { "maxSizeMb": 25 },
  "coldStart": { "maxInitMilliseconds": 500, "lazyInitialization": true }
}
```

SV-R01 through SV-R04 require that contract, stateless execution, a package no larger than 50 MB, and bounded lazy initialization. The Native evaluator and [OPA policy](./serverless.rego) evaluate the same fields.

## Composition

`serverless` can combine with:

| Topology | Why It Can Compose |
|---|---|
| `modular-monolith` | Adds managed execution points without forcing full service extraction. |
| `distributed-modules` | Allows serverless handlers within controlled module boundaries. |
| `microservices` | Supports individual service functions with event-scaled execution. |
| `event-driven` | Enables event-triggered serverless handlers governed by contracts. |
| `data-mesh` | Provides analytical data product execution without transactional coupling. |
| `agentic-ai` | Hosts AI-agent workflows governed by MCP context and rulesets. |

## Business Boundary

This profile is technical-only. It does not define ROI, cost model, cloud spend, staffing, delivery timing, prioritization, or Funnel 0. Evolith Tracker owns those business concerns through its ACL.

## Operational Budgets

This topology declares architectural envelopes for latency, cold-start, and per-execution cost in `spec.operationalBudgets` of [`topology.manifest.json`](./topology.manifest.json). Operators verify satellites against these envelopes following the shared [Operational Budgets Runbook](../../../reference/core/architecture/topologies/execution/operational-budgets-runbook.md).

---
[Back to Topology Hub](../../README.md)
