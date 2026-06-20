# Serverless Topology Profile

> **Bilingual Navigation:** [Version en Espanol](./README.es.md)

**Status:** Draft  
**Dimension:** `execution`  
**Topology ID:** `serverless`  
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

`serverless` can combine with `modular-monolith`, `distributed-modules`, `microservices`, `event-driven`, `data-mesh`, and `agentic-ai` when the execution unit is governed by explicit contracts and telemetry.

## Business Boundary

This draft profile is technical-only. It does not define ROI, cost model, cloud spend, staffing, delivery timing, prioritization, or Funnel 0. Evolith Tracker owns those business concerns through its ACL.

---
[Back to Topology Hub](../../README.md)
