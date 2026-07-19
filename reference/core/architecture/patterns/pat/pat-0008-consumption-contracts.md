# PAT-0008: Consumption Contracts

> **Bilingual Navigation:** [Versión en Español](./pat-0008-consumption-contracts.es.md)

**Type:** Canonical Architectural Pattern — runtime-agnostic  
**Kind:** Pattern  
**Category:** Contracts  
**Status:** Accepted  
**Also known as:** Consumer Registration  

---

## Problem

A producer that does not know who consumes its product, which fields they depend on, or at what volume, cannot assess the blast radius of any change and cannot notify anyone before making it.

## Forces

- Registration is friction imposed on consumers to benefit producers.
- Unregistered consumption is invisible and therefore unbreakable-by-accident only until it breaks.
- Access control and consumption registration answer the same question and should not diverge.

## Solution (Norm)

Consumers register explicit consumption contracts declaring the fields, freshness SLO, and volume expectations they depend on, plus their query patterns, access scope, and usage constraints. Unregistered consumers may be blocked from accessing products pending contract registration.

## Applicability by Topology

| Topology | Applicability | Guidance |
|---|---|---|
| Data Mesh | Required | data-mesh.config.json declares hasConsumptionContracts=true; consumption contracts complement production contracts. Enforced by DAM-R06. |

## Enforcement

| Rule | Title | Engine | Ruleset |
|---|---|---|---|
| **DAM-R06** | Explicit Consumption Contracts | topology-ruleset | `src/rulesets/topologies/data-mesh/data-mesh.rules.json` |

## Governing ADRs

None. No ADR in the corpus records a decision covering this pattern; enforcement exists without a recorded decision.

## Variants

None recorded.

## Relationships

- **complements PAT-0006** — The producer side of the same agreement.

## Implementations

None yet. This pattern has no runtime-specific canonical implementation (CP-NN) yet.

## Sources

- `src/rulesets/topologies/data-mesh/patterns.md` — Consumption Contracts section.

---

**[Back to the Pattern Catalogue](../README.md)**
