# Event-Driven Topology Profile

> **Bilingual Navigation:** [Version en Espanol](./README.es.md)

**Status:** Draft  
**Dimension:** `integration`  
**Topology ID:** `event-driven`  
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

`event-driven` can combine with every progressive-axis profile and with `serverless`, `edge-computing`, `data-mesh`, and `agentic-ai` when contracts and telemetry are explicit.

## Business Boundary

This draft profile is technical-only. It does not define business prioritization, timing, ROI, cost, budget, staffing, or Funnel 0. Evolith Tracker owns those business concerns through its ACL.

---
[Back to Topology Hub](../../README.md)
