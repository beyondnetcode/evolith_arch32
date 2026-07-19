# PAT-0006: Data Contracts

> **Bilingual Navigation:** [Versión en Español](./pat-0006-data-contracts.es.md)

**Type:** Canonical Architectural Pattern — runtime-agnostic  
**Kind:** Pattern  
**Category:** Contracts  
**Status:** Accepted  
**Also known as:** Producer Contracts, Data Product Interface  

---

## Problem

A producer and a consumer agreeing informally on a dataset's shape, quality, and freshness have no artefact the platform can enforce. The agreement degrades silently as the schema evolves.

## Forces

- Machine-readable contracts constrain producers but are the only kind a platform can check.
- Backward compatibility limits schema evolution; breaking it forces a new versioned product.
- Quality and freshness guarantees are as load-bearing as the schema itself.

## Solution (Norm)

A data contract is a formal, machine-readable, versioned agreement between producer and consumer specifying the schema, quality guarantees, freshness SLAs, and access policies of a data product. Manual agreements are not valid contracts. Schema changes maintain backward compatibility; breaking changes require a new versioned data product.

## Applicability by Topology

| Topology | Applicability | Guidance |
|---|---|---|
| Data Mesh | Required | data-mesh.config.json declares hasDataContracts=true and hasBackwardCompatibleContracts=true; the self-serve platform mediates the contract lifecycle. Enforced by DAM-R02 and DAM-R08. |
| Event-Driven | Recommended | Event schemas are the equivalent artefact; ED-R06 imposes the same backward-compatibility invariant. |

## Enforcement

| Rule | Title | Engine | Ruleset |
|---|---|---|---|
| **DAM-R02** | Data Contracts | topology-ruleset | `src/rulesets/topologies/data-mesh/data-mesh.rules.json` |
| **DAM-R08** | Data Contract Backward Compatibility | topology-ruleset | `src/rulesets/topologies/data-mesh/data-mesh.rules.json` |

## Governing ADRs

| ADR | Recorded title | Verification | Note |
|---|---|---|---|
| [ADR-0084](../../adrs/core/0084-data-mesh-data-products.md) | Data Mesh and Data as a Product (core) | verified | — |

## Variants

None recorded.

## Relationships

- **complements PAT-0008** — Consumption contracts document the consumer side of the same relationship.
- **is a variant of PAT-0004** — The same explicit-versioned-contract invariant applied to data products rather than to APIs.

## Implementations

None yet. This pattern has no runtime-specific canonical implementation (CP-NN) yet.

## Sources

- `reference/core/architecture/topologies/data/data-mesh/patterns.md` — Data Contracts section.

---

**[Back to the Pattern Catalogue](../README.md)**
