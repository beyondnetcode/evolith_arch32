# PAT-0011: Data Mapper and Repository

> **Bilingual Navigation:** [Versión en Español](./pat-0011-data-mapper-and-repository.es.md)

**Type:** Canonical Architectural Pattern — runtime-agnostic  
**Kind:** Pattern  
**Category:** Structure  
**Status:** Accepted  
**Also known as:** Repository Pattern, Pure Domain Model  

---

## Problem

An Active Record entity is simultaneously a business object and a row. Its business rules cannot be tested without a database, and every persistence concern — lazy loading, change tracking, connection lifetime — leaks into domain reasoning.

## Forces

- Active Record is faster to write for simple CRUD and slower to change for real domains.
- Explicit mapping duplicates field lists; the duplication is the cost of the boundary.
- Transaction boundaries must live somewhere, and the domain is the wrong place.

## Solution (Norm)

Domain entities are pure business objects with no persistence awareness and no reference to persistence frameworks. Repository interfaces are defined in the domain layer and implemented in infrastructure. Data mappers translate between domain entities and persistence models. Transaction boundaries are managed at the module level. Active Record is prohibited.

## Applicability by Topology

| Topology | Applicability | Guidance |
|---|---|---|
| Modular Monolith | Required | Applied per module; the repository interface lives in the module's domain layer and the implementation in its infrastructure layer. Enforced by MM-R12. |
| Distributed Modules | Recommended | Unchanged by the split; the repository implementation may become a remote client. |
| Microservices | Recommended | Keeps the service's domain independently testable from its data store. |

## Enforcement

| Rule | Title | Engine | Ruleset |
|---|---|---|---|
| **MM-R12** | Pure Domain Model (Data Mapper Enforcement) | topology-ruleset | `src/rulesets/topologies/progressive-axis/modular-monolith/modular-monolith.rules.json` |

## Governing ADRs

None. No ADR in the corpus records a decision covering this pattern; enforcement exists without a recorded decision.

## Variants

None recorded.

## Relationships

- **is a variant of PAT-0010** — The persistence-specific case of the ports-and-adapters boundary.

## Implementations

None yet. This pattern has no runtime-specific canonical implementation (CP-NN) yet.

## Sources

- `reference/core/architecture/topologies/progressive-axis/modular-monolith/patterns.md` — Data Mapper & Repository Pattern section.

---

**[Back to the Pattern Catalogue](../README.md)**
