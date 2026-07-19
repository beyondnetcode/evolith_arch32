# PAT-0005: Data as a Product

> **Bilingual Navigation:** [Versión en Español](./pat-0005-data-as-a-product.es.md)

**Type:** Canonical Architectural Pattern — runtime-agnostic  
**Kind:** Pattern  
**Category:** Governance  
**Status:** Accepted  
**Also known as:** Data Product  

---

## Problem

Data shared as ad-hoc extracts and views has no owner, no service level, and no lifecycle. Consumers build on it, it changes without notice, and there is nobody accountable for the breakage.

## Forces

- Product-grade data costs more to publish than an extract, and the cost is borne by the producer while the benefit accrues to consumers.
- Discoverability and trustworthiness are properties of the surrounding platform, not of the dataset.
- Draft data must be excluded from consumption without blocking domain experimentation.

## Solution (Norm)

Data products are first-class architectural entities with explicit ownership, SLAs, schemas, and lifecycle management. They are managed assets, not ad-hoc extracts or views. Each product exposes a stable interface defined by its schema and must be discoverable, addressable, and trustworthy.

## Applicability by Topology

| Topology | Applicability | Guidance |
|---|---|---|
| Data Mesh | Required | The satellite declares isDataProduct=true in data-mesh.config.json; products in draft status are excluded from the discovery index. Enforced by DAM-R01. |
| Microservices | Recommended | A service publishing analytical data to other domains publishes it as a product, not as a database export. |
| Distributed Modules | Optional | Applies where a module's data is consumed beyond its own bounded context. |

## Enforcement

| Rule | Title | Engine | Ruleset |
|---|---|---|---|
| **DAM-R01** | Data Product Designation | topology-ruleset | `src/rulesets/topologies/data-mesh/data-mesh.rules.json` |

## Governing ADRs

| ADR | Recorded title | Verification | Note |
|---|---|---|---|
| [ADR-0084](../../adrs/core/0084-data-mesh-data-products.md) | Data Mesh and Data as a Product (core) | verified | — |

## Variants

None recorded.

## Relationships

- **requires PAT-0006** — A product without a data contract has no stable interface.
- **requires PAT-0009** — Discovery registration is a prerequisite for publication.
- **complements PAT-0007** — Domain ownership is what federated governance federates to.

## Implementations

None yet. This pattern has no runtime-specific canonical implementation (CP-NN) yet.

## Sources

- `reference/core/architecture/topologies/data/data-mesh/patterns.md` — Data as a Product and Domain Ownership sections.

---

**[Back to the Pattern Catalogue](../README.md)**
