# PAT-0007: Federated Governance

> **Bilingual Navigation:** [Versión en Español](./pat-0007-federated-governance.es.md)

**Type:** Canonical Architectural Pattern — runtime-agnostic  
**Kind:** Pattern  
**Category:** Governance  
**Status:** Accepted  
**Also known as:** Federated Computational Governance  

---

## Problem

Fully centralised governance becomes a review bottleneck that domains route around; fully decentralised governance produces as many standards as there are domains.

## Forces

- Central bodies have the mandate for consistency but not the domain knowledge to apply it.
- Domains have the knowledge but no incentive toward organisational consistency.
- Exceptions are inevitable and must be visible rather than informal.

## Solution (Norm)

Governance operates at two levels. A central body defines policy — classification, security, compliance — and domains enforce it within their own product boundaries. Governance exceptions require formal approval and are tracked in the governance registry.

## Applicability by Topology

| Topology | Applicability | Guidance |
|---|---|---|
| Data Mesh | Required | data-mesh.config.json declares federatedGovernance=true; exceptions are tracked in the governance registry. Enforced by DAM-R03. |
| Microservices | Recommended | Central policy with per-service enforcement mirrors the same split at service granularity. |

## Enforcement

| Rule | Title | Engine | Ruleset |
|---|---|---|---|
| **DAM-R03** | Federated Governance | topology-ruleset | `src/rulesets/topologies/data-mesh/data-mesh.rules.json` |

## Governing ADRs

| ADR | Recorded title | Verification | Note |
|---|---|---|---|
| [ADR-0084](../../adrs/core/0084-data-mesh-data-products.md) | Data Mesh and Data as a Product (core) | verified | — |

## Variants

None recorded.

## Relationships

- **complements PAT-0005** — Federated governance presupposes clear domain ownership of each product.

## Implementations

None yet. This pattern has no runtime-specific canonical implementation (CP-NN) yet.

## Sources

- `reference/core/architecture/topologies/data/data-mesh/patterns.md` — Federated Governance section.

---

**[Back to the Pattern Catalogue](../README.md)**
