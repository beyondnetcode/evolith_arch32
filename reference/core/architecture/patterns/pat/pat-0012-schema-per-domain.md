# PAT-0012: Schema per Domain

> **Bilingual Navigation:** [Versión en Español](./pat-0012-schema-per-domain.es.md)

**Type:** Canonical Architectural Pattern — runtime-agnostic  
**Kind:** Pattern  
**Category:** Data Ownership  
**Status:** Accepted  
**Also known as:** Schema-per-Bounded-Context, Modular Monolith Persistence Boundaries  

---

## Problem

A monolith whose source is modular but whose persistence is an unconstrained shared model develops hidden coupling through direct table access, cross-domain joins, and migration conflicts that are very difficult to remove later.

## Forces

- A single database instance makes cross-schema joins physically possible even when they are prohibited.
- Foreign keys across schemas are the most convenient and most damaging shortcut available.
- Independent migrations per module trade convenience for a future extraction path.

## Solution (Norm)

Each bounded context owns its database schema exclusively. Shared schemas are prohibited and cross-module data access occurs only through published APIs. Each module runs its migrations independently, with no cross-module migration dependencies. Foreign keys across module schemas are prohibited; use application-level references instead.

## Applicability by Topology

| Topology | Applicability | Guidance |
|---|---|---|
| Modular Monolith | Required | Each bounded context has its own schema or database instance; naming follows {module_name}_{domain_entity}. Enforced by MM-R05 and MM-R02. |
| Distributed Modules | Required | Schema ownership hardens into module data isolation under DM-R03. |
| Microservices | Required | Scales up to instance granularity — see PAT-0001. |

## Enforcement

| Rule | Title | Engine | Ruleset |
|---|---|---|---|
| **MM-R05** | No Shared Database Across Bounded Contexts | topology-ruleset | `src/rulesets/topologies/progressive-axis/modular-monolith/modular-monolith.rules.json` |
| **MM-R02** | Explicit Bounded Context Boundaries | topology-ruleset | `src/rulesets/topologies/progressive-axis/modular-monolith/modular-monolith.rules.json` |
| **CORE-0031-01** | Conform to ADR-0031 | adr-ruleset | `src/rulesets/adr/generated/adr-0031-schema-per-bounded-context-and-domain-event-catalog.rules.json` |

## Governing ADRs

| ADR | Recorded title | Verification | Note |
|---|---|---|---|
| [ADR-0067](../../adrs/core/0067-modular-monolith-schema-per-domain.md) | Modular Monolith Persistence Boundaries (core) | verified | The modular-monolith patterns guide heads this section 'Schema-per-Domain (ADR-0067)'; the ADR's recorded title is 'Modular Monolith Persistence Boundaries'. The decision covers the claim. |
| [ADR-0031](../../adrs/core/0031-schema-per-context-domain-event-catalog.md) | Schema-per-Bounded-Context and Domain Event Catalog (core) | verified | — |

## Variants

| Variant | Scope | Invariant | PAT |
|---|---|---|---|
| Schema-per-Domain | bounded-context | A bounded context owns its schema exclusively inside one database instance. | PAT-0012 |
| Database-per-Service | service | A service owns its database instance exclusively. The same invariant at deployment granularity. | PAT-0001 |

## Relationships

- **is a variant of PAT-0001** — Same invariant — nobody touches another owner's persistence — at schema rather than instance granularity.
- **complements PAT-0013** — A module whose schema is already independent can be migrated to a standalone database.

## Implementations

None yet. This pattern has no runtime-specific canonical implementation (CP-NN) yet.

## Sources

- `reference/core/architecture/topologies/progressive-axis/modular-monolith/patterns.md` — Schema-per-Domain section.

---

**[Back to the Pattern Catalogue](../README.md)**
