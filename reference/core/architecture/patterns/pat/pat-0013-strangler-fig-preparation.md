# PAT-0013: Strangler Fig Preparation

> **Bilingual Navigation:** [Versión en Español](./pat-0013-strangler-fig-preparation.es.md)

**Type:** Canonical Architectural Pattern — runtime-agnostic  
**Kind:** Pattern  
**Category:** Delivery  
**Status:** Accepted  
**Also known as:** Extraction Readiness, Migration-Ready Modularity  

---

## Problem

Extracting a module from a monolith is a rewrite whenever the module shares in-memory state, has no interface boundary, or cannot have its schema separated. The decision to extract then arrives years after the code that made it impossible.

## Forces

- Preparing for an extraction that may never happen is speculative work with real present cost.
- Readiness is only credible if it is measured continuously, not asserted at migration time.
- The score must gate a phase, otherwise it is a report nobody reads.

## Solution (Norm)

Modules are structured so they can be surgically extracted without a rewrite: every module exposes a well-defined API boundary, modules share no in-memory state or static variables, each module's schema can be migrated to a standalone database, and modules publish domain events that an extracted service can subscribe to. Extraction readiness is scored continuously and the score gates the design phase.

## Applicability by Topology

| Topology | Applicability | Guidance |
|---|---|---|
| Modular Monolith | Required | The satellite tracks an extraction readiness score that must be at least 70% to pass the Phase 2 Design gate when a distributed-modules step is planned. Enforced by MM-R07. |
| Distributed Modules | Required | The same score is re-evaluated against microservices-specific criteria and must be at least 80%. Enforced by DM-R08. |
| Microservices | Not applicable | The extraction has already happened; the score no longer gates anything. |

## Enforcement

| Rule | Title | Engine | Ruleset |
|---|---|---|---|
| **MM-R07** | Maintain Extraction Readiness Score (`>= 70%`) | topology-ruleset | `src/rulesets/topologies/progressive-axis/modular-monolith/modular-monolith.rules.json` |
| **DM-R08** | Maintain F2 Extraction Score (`>= 80%`) | topology-ruleset | `src/rulesets/topologies/progressive-axis/distributed-modules/distributed-modules.rules.json` |
| **CORE-0045-01** | Conform to ADR-0045 | adr-ruleset | `src/rulesets/adr/generated/adr-0045-microservice-extraction-readiness-criteria.rules.json` |

## Governing ADRs

| ADR | Recorded title | Verification | Note |
|---|---|---|---|
| [ADR-0045](../../adrs/core/0045-microservice-extraction-readiness-criteria.md) | Microservice Extraction Readiness Criteria (core) | verified | — |

## Variants

None recorded.

## Relationships

- **requires PAT-0012** — A module whose schema is not separable cannot reach a passing readiness score.
- **requires PAT-0010** — The well-defined API boundary the score measures is the module's port surface.

## Implementations

None yet. This pattern has no runtime-specific canonical implementation (CP-NN) yet.

## Sources

- `reference/core/architecture/topologies/progressive-axis/modular-monolith/patterns.md` — Strangler Fig Preparation section.

---

**[Back to the Pattern Catalogue](../README.md)**
