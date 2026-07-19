# PAT-0010: Ports and Adapters

> **Bilingual Navigation:** [Versión en Español](./pat-0010-ports-and-adapters.es.md)

**Type:** Canonical Architectural Pattern — runtime-agnostic  
**Kind:** Pattern  
**Category:** Structure  
**Status:** Accepted  
**Also known as:** Hexagonal Architecture, Clean Architecture  

---

## Problem

When business logic imports the framework, the ORM, and the vendor SDK, the domain cannot be tested without booting infrastructure, cannot be reasoned about without knowing the framework, and cannot survive replacing either.

## Forces

- Indirection through ports costs a layer of interfaces that pays off only over time.
- Cross-cutting concerns are the hardest to keep out of the core, because they genuinely apply everywhere.
- Fast domain tests are the observable proof that the boundary holds.

## Solution (Norm)

The domain layer contains only pure business types and port interfaces, with zero framework, ORM, or SDK dependencies. The application layer imports the domain only. Infrastructure adapters implement the ports and hold every framework and SDK import. The dependency direction is Infrastructure to Application to Core, never the reverse. Cross-cutting concerns are implemented exclusively as infrastructure wrappers, never as decorators inside the core. Domain tests run without any framework bootstrap.

## Applicability by Topology

| Topology | Applicability | Guidance |
|---|---|---|
| Modular Monolith | Required | Each bounded context follows the hexagon internally; cross-context calls use application-layer ports, never infrastructure-to-infrastructure. Enforced by MM-R03 and MM-R04. |
| Distributed Modules | Recommended | The hexagon survives the split; the outbound adapter simply becomes a network client. |
| Microservices | Recommended | Each service is its own hexagon; the boundary is what makes extraction mechanical. |
| Agentic AI | Required | Domain writes stay in deterministic application adapters behind the tool contract; the agent never reaches the domain directly. |

## Enforcement

| Rule | Title | Engine | Ruleset |
|---|---|---|---|
| **MM-R03** | Ports and Adapters Boundary | topology-ruleset | `src/rulesets/topologies/progressive-axis/modular-monolith/modular-monolith.rules.json` |
| **HXA-01** | Core (Domain) has zero framework dependencies | adr-ruleset | `src/rulesets/adr/adr-0002-hexagonal-architecture.rules.json` |
| **HXA-02** | Application layer imports Core only | adr-ruleset | `src/rulesets/adr/adr-0002-hexagonal-architecture.rules.json` |
| **HXA-03** | Infrastructure (Adapters) implements Core ports | adr-ruleset | `src/rulesets/adr/adr-0002-hexagonal-architecture.rules.json` |
| **HXA-04** | Dependency direction: Infrastructure to Application to Core | adr-ruleset | `src/rulesets/adr/adr-0002-hexagonal-architecture.rules.json` |
| **HXA-05** | AOP concerns prohibited in Core/Application layers | adr-ruleset | `src/rulesets/adr/adr-0002-hexagonal-architecture.rules.json` |
| **HXA-06** | AOP implemented exclusively in Infrastructure layer | adr-ruleset | `src/rulesets/adr/adr-0002-hexagonal-architecture.rules.json` |
| **HXA-07** | Core domain tests run without framework bootstrap | adr-ruleset | `src/rulesets/adr/adr-0002-hexagonal-architecture.rules.json` |
| **MM-R04** | Inter-Context Communication via Ports | topology-ruleset | `src/rulesets/topologies/progressive-axis/modular-monolith/modular-monolith.rules.json` |
| **MM-R11** | Strict UI and Logic Isolation (SoC) | topology-ruleset | `src/rulesets/topologies/progressive-axis/modular-monolith/modular-monolith.rules.json` |

## Governing ADRs

| ADR | Recorded title | Verification | Note |
|---|---|---|---|
| [ADR-0002](../../adrs/nodejs/0002-clean-architecture-nestjs.md) | Clean Hexagonal Architecture with NestJS (nodejs) | verified | MM-R03 and HXA-01..07 both reference 'core/ADR-0002', but no ADR numbered 0002 exists in the core track; the hexagonal ruleset is bound to the nodejs track ADR-0002. The rule text's track qualifier is wrong, the decision itself is real. |

## Variants

None recorded.

## Relationships

- **complements PAT-0011** — Data Mapper is how the persistence adapter keeps the domain model pure.
- **complements PAT-0018** — An anti-corruption layer is an adapter whose job is refusing foreign models.
- **complements PAT-0013** — Clean port boundaries are the precondition for surgical extraction.

## Implementations

- [CP-04](../dotnet/cp-04-aop-logging-decorator.md) — dotnet

## Sources

- `reference/core/architecture/topologies/progressive-axis/modular-monolith/patterns.md` — Ports & Adapters (Hexagonal Architecture) section.

> **Note:** Nine rule identifiers across two engines already enforce this pattern; none of them were linked from the prose that describes it.

---

**[Back to the Pattern Catalogue](../README.md)**
