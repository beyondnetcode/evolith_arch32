# Topology Hub

> **Bilingual Navigation:** [Version en Espanol](./README.es.md)

This area is the canonical human-readable corpus for Evolith Core architecture topologies.

Topology guidance is dimensional, manifest-driven, and executable through the shared Evolith control plane. A product can combine topology profiles across dimensions when the corresponding `topology.manifest.json` files allow that composition.

## Reading Order

| Document | Purpose | Mandatory |
|---|---|---|
| [Topology Dimensions Model](./topology-dimensions.md) | Defines dimensions, composition rules, F1/F2/F3 compatibility, profile contract, and business boundary | Yes |
| [Modular Monolith Profile](./progressive-axis/modular-monolith/README.md) | Canonical F1-compatible starting topology | Yes |
| [Distributed Modules Profile](./progressive-axis/distributed-modules/README.md) | Canonical F2-compatible controlled extraction topology | Yes |
| [Microservices Profile](./progressive-axis/microservices/README.md) | Canonical F3-compatible service topology | Yes |
| [Serverless Profile](../../../../src/rulesets/topologies/serverless/README.md) | Accepted managed execution topology | Yes |
| [Edge Computing Profile](../../../../src/rulesets/topologies/edge-computing/README.md) | Accepted locality-driven execution topology | Yes |
| [Event-Driven Profile](../../../../src/rulesets/topologies/event-driven/README.md) | Accepted asynchronous integration topology | Yes |
| [Data Mesh Profile](../../../../src/rulesets/topologies/data-mesh/README.md) | Accepted distributed analytical ownership topology | Yes |
| [Agentic AI Profile](../../../../src/rulesets/topologies/agentic-ai/README.md) | Draft AI-first and agentic workflow topology | No |

## Governed Dimensions

| Dimension | Canonical Topologies | Purpose |
|---|---|---|
| `progressive-axis` | `modular-monolith`, `distributed-modules`, `microservices` | Preserve F1/F2/F3 compatibility while fitting the broader topology model. |
| `execution` | `serverless`, `edge-computing` | Govern managed, event-scaled, and edge execution models. |
| `integration` | `event-driven` | Govern asynchronous coordination and event contracts. |
| `data` | `data-mesh` | Govern distributed analytical and domain data ownership. |
| `ai` | `agentic-ai` | Govern AI-first and agentic architecture patterns. |

## Authority Rules

- Topology profiles reference universal Core ADRs; they do not duplicate them.
- Every topology profile must provide a `topology.manifest.json` before it becomes executable.
- Human-readable topology guidance lives here under `reference/core/architecture/topologies/`.
- Executable topology rules live under `src/rulesets/topologies/`.
- CLI, MCP, and Service CORE API remain one control plane; topology behavior is resolved through manifests.
- Core topology artifacts remain technical-only. Evolith Tracker owns business timing, ownership, prioritization, ROI, cost, and Funnel 0.

## Related Authority

| Artifact | Role |
|---|---|
| [ADR-0079: Multi-Topology Reference Corpus](../adrs/core/0079-multi-topology-reference-corpus.md) | Governing decision for the corpus model |
| [Repository Taxonomy](../../control-center/taxonomy/repository-taxonomy.md) | Authorizes this path and prohibits root `/topologies/` |
| [Topology Manifest Schema](../../../../src/rulesets/schema/topology-manifest.schema.json) | Machine-readable manifest contract |
| [Multi-Topology Implementation Plan](../../control-center/audits/multi-topology-reference-corpus-implementation-plan.md) | Supporting execution plan |
| [Gap Tracking Board](../../control-center/gaps/gap-tracking.md) | Canonical status tracker |
| [Execution — Operational Budgets Runbook](./execution/operational-budgets-runbook.md) | Operational budgets and runbook for topology execution |

---
[Back to Architecture Hub](../README.md)
