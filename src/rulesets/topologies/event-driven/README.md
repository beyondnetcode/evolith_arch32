# Event-Driven Topology Profile

> **Bilingual Navigation:** [Version en Espanol](./README.es.md)

**Status:** Accepted  
**Dimension:** `integration`  
**Topology ID:** `event-driven`  
**Compatibility Alias:** `F2-compatible`  
**Manifest:** [topology.manifest.json](./topology.manifest.json)

Event-driven architecture is an integration topology for asynchronous coordination through explicit event contracts, reliable publication, idempotent consumers, and observable message flow.

## Purpose

Use this topology when bounded contexts, modules, services, functions, or edge workloads must coordinate without tight synchronous coupling.

Event-driven integration is not permission to hide business workflows in infrastructure. Events must express explicit domain facts, ownership, schema evolution rules, and failure semantics.

## Governance Rules

| Rule | Requirement |
|---|---|
| Event contracts | Events must be explicit, versioned, and backward-compatible. |
| Reliability | Cross-boundary publication should use Transactional Outbox or an equivalent reliability pattern. |
| Idempotency | Consumers must tolerate duplicate delivery and retries. |
| Observability | Event flow must expose correlation, lag, failures, and replay evidence. |
| Ownership | Event producers own event meaning; consumers own local reactions. |

## Required Authority

| Artifact | Role |
|---|---|
| [ADR-0015: Event-Driven Architecture Intra-Domain](../../../reference/core/architecture/adrs/core/0015-event-driven-architecture-intra-domain.md) | Governs event-driven coordination within bounded contexts. |
| [ADR-0079: Multi-Topology Reference Corpus](../../../reference/core/architecture/adrs/core/0079-multi-topology-reference-corpus.md) | Governs topology manifests and composition. |
| [Event-Driven Architecture Rules](./event-driven.rules.json) | Existing executable compatibility rules. |
| [Topology Dimensions Model](../../../reference/core/architecture/topologies/topology-dimensions.md) | Defines composition and compatibility rules. |

## Executable Contract

Every adopting satellite provides `event-driven.config.json`:

```json
{
  "strictAsyncApi": true,
  "transactionalOutbox": true,
  "deadLetterQueue": true
}
```

ED-R01 through ED-R03 require that contract, enforcing explicit AsyncAPI definition, the Transactional Outbox pattern for reliability, and a Dead Letter Queue (DLQ) for failed message handling. The Native evaluator and [OPA policy](./event-driven.rego) evaluate these fields.

## Composition

`event-driven` can combine with:

| Topology | Why It Can Compose |
|---|---|
| `modular-monolith` | Adds decoupled event-driven integration while preserving one deployable system. |
| `distributed-modules` | Enables async coordination across module boundaries with explicit contracts. |
| `microservices` | Provides reliable event-driven communication between independently owned services. |
| `serverless` | Drives event-triggered serverless execution governed by explicit contracts. |
| `edge-computing` | Supports async event flow to and from edge-located workloads. |
| `data-mesh` | Enables event-driven data product updates with governed analytical ownership. |
| `agentic-ai` | Coordinates AI-agent workflows through observable event channels. |

## Business Boundary

This profile is technical-only. It does not define business prioritization, timing, ROI, cost, budget, staffing, or Funnel 0. Evolith Tracker owns those business concerns through its ACL.

---
[Back to Topology Hub](../../README.md)
