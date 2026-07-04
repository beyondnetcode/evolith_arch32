# Design & Architecture Phase — Governance (Canonical)

> **Bilingual Navigation:** [Versión en Español](./design-phase-governance.es.md)

**Status:** Active · **Decision:** [ADR-0104](./adrs/core/0104-topology-driven-advisory-design-governance.md) · **Epic:** GT-425 (F0–F8)

---

## 1. What the Core does in Design

Evolith Core governs the Design phase as an **advisory Evaluation Engine** (ADR-0101): it **recommends, validates, and measures technical maturity** over an extensible catalogue of architectural blocks. It is **stateless** and **non-binding** — the tenant's gate decides any blocking; the Tracker persists state.

The unit of evaluation is the **initiative** (grouped or solo); stories/backlog are `ExternalReference`, never Core entities.

## 2. The blueprint is the box of blocks

A **blueprint is a detailed scheme that guides the development of a project, process, or system.** It is composed from **blocks** across **concerns** (frontend/backend/services/mobile/data) under **Convention over Configuration** — a new block/concern/topology is added by convention (via the registry), never by changing the engine.

## 3. The end-to-end flow

```
signals ──► topology recommendation ──► confirm composition (mixable)
        (F5)                        (evolith.yaml design.topology)
   ──► compose blueprint (blocks per concern, F3)
   ──► Core evaluates: technical MATURITY + missing artifacts + deviations→ADR (F4)
   ──► derive downstream Construction/Quality/Deployment criteria (F7)
   All advisory / non-binding. The tenant confirms and decides blocking.
```

## 4. Artifacts & contracts

| Concern | Artifact |
|---|---|
| Topology profile per topology | `spec.designProfile` in each [topology manifest](./topologies/README.md) |
| Blueprint composition | [`blueprint.schema.json`](../../../src/rulesets/schema/blueprint.schema.json) |
| Design block (base) | [`design-block.schema.json`](../../../src/rulesets/schema/design-block.schema.json) |
| Block-type registry (22 kinds) | [`design-block-registry.json`](../../../src/rulesets/schema/design-block-registry.json) |
| Reusable template | [`design-template.schema.json`](../../../src/rulesets/schema/design-template.schema.json) |
| Topology recommendation rules | [`topology-recommendation.rules.json`](../../../src/rulesets/architecture/topology-recommendation.rules.json) |
| Evaluation contracts | `EvaluationContext.design` / `EvaluationResult.results.design` |

## 5. How to consume it

| Surface | How |
|---|---|
| **Core API** | `POST /api/v1/evaluate` with `kinds: ["design"]`; `POST /api/v1/architecture/recommend-topology` |
| **MCP** | `evolith-evaluate` (kind `design`); `evolith-topology-recommend` (follow-on) |
| **CLI** | `evolith evaluate --kind design`; `evolith topology recommend` (follow-on) |
| **Agents** | skills `design-template-proposal` (simple/medium/complex) + `template-promotion` (UP-NNN) |

## 6. Growth (Open-Core)

Everything here is community-extensible under governance. Tenants keep a **private collection** of ADRs/templates/rulesets (Tracker scope, ADR-0104 §11); reusable templates are promoted to the canonical corpus via **Upstream Proposals (UP-NNN)** and Architecture Board review, tiered `community → certified → official`.

## 7. References

- [ADR-0104 — Topology-Driven Advisory Design Governance](./adrs/core/0104-topology-driven-advisory-design-governance.md)
- [Tracker Design Flow (learning record)](../foundations/agent-skills/tracker-design-flow.md)
- [Agent Authority Model](../foundations/agent-skills/agent-authority-model.md)
- E2E verification: `src/packages/core-domain/src/evaluation/design-flow.e2e.spec.ts`

---
[Back to Architecture Hub](./README.md)
