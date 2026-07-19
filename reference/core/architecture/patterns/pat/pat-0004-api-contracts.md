# PAT-0004: Explicit Versioned API Contracts

> **Bilingual Navigation:** [Versión en Español](./pat-0004-api-contracts.es.md)

**Type:** Canonical Architectural Pattern — runtime-agnostic  
**Kind:** Pattern  
**Category:** Contracts  
**Status:** Accepted  
**Also known as:** Contract-First Development, Inter-Module Contracts  

---

## Problem

When the interface between two components exists only as code, its shape is discovered by reading the implementation, its changes are unreviewable, and every consumer learns about a breaking change by failing.

## Forces

- Schema languages add a design step before implementation can start.
- Contract-first enables parallel development through generated mocks.
- A registry is required for versioning and compatibility checking to be automatic rather than social.

## Solution (Norm)

All inter-component communication uses explicit contract definitions in a machine-readable schema language — Protobuf, JSON Schema, or OpenAPI. Contracts are registered, versioned, and backward-compatible within a major version. The contract is designed before the implementation and is the primary inter-component documentation.

## Applicability by Topology

| Topology | Applicability | Guidance |
|---|---|---|
| Distributed Modules | Required | Protobuf for high-performance internal RPC; OpenAPI for HTTP/REST exposed externally; all registered in a central schema registry. Enforced by DM-R02. |
| Microservices | Required | Contract-first is the precondition for independent deployability under MS-R01. |
| Modular Monolith | Required | Every cross-module interaction is governed by an OpenAPI specification or equivalent; undocumented interactions are violations. |
| Event-Driven | Required | The contract is the AsyncAPI event schema; ED-R01 requires strictAsyncApi=true. |
| Data Mesh | Recommended | Data products express their interface as data contracts — see PAT-0006. |

## Enforcement

| Rule | Title | Engine | Ruleset |
|---|---|---|---|
| **DM-R02** | Inter-Module Contracts are Explicit and Versioned | topology-ruleset | `src/rulesets/topologies/progressive-axis/distributed-modules/distributed-modules.rules.json` |

## Governing ADRs

None. No ADR in the corpus records a decision covering this pattern; enforcement exists without a recorded decision.

## Variants

None recorded.

## Relationships

- **complements PAT-0002** — Contract tests verify at build time what the contract asserts.
- **complements PAT-0001** — Published contracts are the only sanctioned path across a data ownership boundary.

## Implementations

None yet. This pattern has no runtime-specific canonical implementation (CP-NN) yet.

## Sources

- `reference/core/architecture/topologies/progressive-axis/distributed-modules/patterns.md` — API Contracts and Contract-First Development sections.
- `reference/core/architecture/topologies/progressive-axis/modular-monolith/patterns.md` — Module Boundary Contracts section.

---

**[Back to the Pattern Catalogue](../README.md)**
