# PAT-0001: Database per Service

> **Bilingual Navigation:** [Versión en Español](./pat-0001-database-per-service.es.md)

**Type:** Canonical Architectural Pattern — runtime-agnostic  
**Kind:** Pattern  
**Category:** Data Ownership  
**Status:** Accepted  
**Also known as:** No Shared Persistence, Service Owns Its Data  

---

## Problem

Services that share a database couple their release cycles: one team's schema migration breaks another team's service at runtime, and the dependency is invisible to contract review because it never crosses an API.

## Forces

- Independent deployability pulls data apart; join convenience pulls it together.
- Reading another service's tables is always cheaper in the short term than publishing an interface.
- Denormalised copies cost storage and introduce staleness, but they are the price of ownership.

## Solution (Norm)

Each service owns its data store exclusively. No service may read or write another service's database directly. Cross-service data access goes through published APIs or events.

## Applicability by Topology

| Topology | Applicability | Guidance |
|---|---|---|
| Microservices | Required | Each service owns its data store exclusively; no shared databases and no cross-service table access. Enforced by MS-R06. |
| Distributed Modules | Required | No module queries another module's persistence layer; access flows through the owning module's published interface. Enforced by DM-R03. |
| Modular Monolith | Recommended | Applied at schema rather than instance granularity — see the Schema-per-Domain variant in PAT-0012. |
| Data Mesh | Required | Each data product's storage is owned by exactly one domain; ownership is never shared. |

## Enforcement

| Rule | Title | Engine | Ruleset |
|---|---|---|---|
| **MS-R06** | Service Owns Its Data — No Shared Persistence | topology-ruleset | `src/rulesets/topologies/progressive-axis/microservices/microservices.rules.json` |
| **DM-R03** | Module Data Isolation Enforced | topology-ruleset | `src/rulesets/topologies/progressive-axis/distributed-modules/distributed-modules.rules.json` |

## Governing ADRs

| ADR | Recorded title | Verification | Note |
|---|---|---|---|
| [ADR-0076](../../adrs/core/0076-domain-oriented-microservice-architecture.md) | Domain-Oriented Microservice Architecture (DOMA) (core) | verified | The microservices patterns guide cites this ADR as 'Domain-oriented data ownership'; the recorded title is 'Domain-Oriented Microservice Architecture (DOMA)'. The decision does cover domain data ownership, but the label in the citing document is not the ADR's own. |

## Variants

| Variant | Scope | Invariant | PAT |
|---|---|---|---|
| Schema-per-Domain | bounded-context | A bounded context owns its schema exclusively; foreign keys across module schemas are prohibited. Same invariant — nobody touches another owner's persistence — applied at schema granularity inside a single deployment unit. | PAT-0012 |
| Database-per-Service | service | A service owns its database instance exclusively. | PAT-0001 |

## Relationships

- **complements PAT-0004** — Published API contracts are the sanctioned replacement for direct table access.
- **complements PAT-0003** — The outbox is how an owner publishes its data changes without giving up ownership.

## Implementations

None yet. This pattern has no runtime-specific canonical implementation (CP-NN) yet.

## Sources

- `reference/core/architecture/topologies/progressive-axis/microservices/patterns.md` — Database per Service section.

---

**[Back to the Pattern Catalogue](../README.md)**
