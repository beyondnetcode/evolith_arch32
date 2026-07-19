# PAT-0015: Bulkhead

> **Bilingual Navigation:** [Versión en Español](./pat-0015-bulkhead.es.md)

**Type:** Canonical Architectural Pattern — runtime-agnostic  
**Kind:** Pattern  
**Category:** Resilience  
**Status:** Accepted  
**Also known as:** Resource Pool Isolation  

---

## Problem

When every outbound dependency draws from one shared pool of connections and threads, a single slow dependency exhausts the pool and takes down calls to every other dependency, including healthy ones.

## Forces

- Partitioned pools waste capacity that a shared pool would have redistributed.
- Per-dependency sizing requires knowing each dependency's load profile.
- Isolation contains the failure but does not shorten it.

## Solution (Norm)

Resource pools — connections, threads — are isolated per upstream dependency, so exhaustion caused by one dependency cannot starve calls to any other.

## Applicability by Topology

| Topology | Applicability | Guidance |
|---|---|---|
| Microservices | Required | Each service implements bulkhead isolation with resource pools partitioned per upstream dependency. Enforced by MS-R03. |
| Distributed Modules | Recommended | Applies once module calls cross a process boundary and consume a connection pool. |
| Serverless | Optional | The platform's per-invocation isolation supplies much of the effect; explicit pools still matter for shared downstream connections. |

## Enforcement

| Rule | Title | Engine | Ruleset |
|---|---|---|---|
| **MS-R03** | Bulkhead Pattern per Service | topology-ruleset | `src/rulesets/topologies/progressive-axis/microservices/microservices.rules.json` |

## Governing ADRs

None. No ADR in the corpus records a decision covering this pattern; enforcement exists without a recorded decision.

## Variants

None recorded.

## Relationships

- **complements PAT-0014** — The bulkhead contains the blast radius; the breaker stops the bleeding.

## Implementations

None yet. This pattern has no runtime-specific canonical implementation (CP-NN) yet.

## Sources

- `src/rulesets/topologies/progressive-axis/microservices/microservices.rules.json` — MS-R03 rule statement, the only description of this pattern in the corpus.

> **Note:** No ADR in the corpus mentions bulkheads. ADR-0011 covers circuit breakers and retries only. MS-R03 enforces an invariant no recorded decision established.

---

**[Back to the Pattern Catalogue](../README.md)**
