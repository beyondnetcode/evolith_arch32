# PAT-0016: Fallback Behavior

> **Bilingual Navigation:** [Versión en Español](./pat-0016-fallback-behavior.es.md)

**Type:** Canonical Architectural Pattern — runtime-agnostic  
**Kind:** Pattern  
**Category:** Resilience  
**Status:** Accepted  
**Also known as:** Graceful Degradation  

---

## Problem

A call whose only failure path is to propagate the error converts every downstream outage into a full outage of the caller, even when a degraded but useful response was available.

## Forces

- A stale or partial answer may be worse than no answer for some operations and better for most.
- Fallbacks hide outages from users and therefore must be observable to operators.
- Defining the degraded response is a product decision, not only an engineering one.

## Solution (Norm)

Every call to an external or downstream component has a defined behaviour for when that component is unavailable. Graceful degradation is required: the caller returns a degraded but defined response rather than propagating the failure.

## Applicability by Topology

| Topology | Applicability | Guidance |
|---|---|---|
| Microservices | Required | All inter-service calls have defined fallback behaviour when the downstream service is unavailable. Enforced by MS-R04. |
| Distributed Modules | Recommended | Pairs with the circuit breaker required by DM-R07: the fallback defines what an open breaker returns. |
| Edge Computing | Recommended | Disconnected operation is the fallback path, not an exceptional one. |

## Enforcement

| Rule | Title | Engine | Ruleset |
|---|---|---|---|
| **MS-R04** | Fallback Behavior for All External Calls | topology-ruleset | `src/rulesets/topologies/progressive-axis/microservices/microservices.rules.json` |

## Governing ADRs

None. No ADR in the corpus records a decision covering this pattern; enforcement exists without a recorded decision.

## Variants

None recorded.

## Relationships

- **complements PAT-0014** — The breaker decides when to stop calling; the fallback decides what to return instead.

## Implementations

None yet. This pattern has no runtime-specific canonical implementation (CP-NN) yet.

## Sources

- `src/rulesets/topologies/progressive-axis/microservices/microservices.rules.json` — MS-R04 rule statement, the only description of this pattern in the corpus.

> **Note:** No ADR in the corpus records a decision on fallback behaviour. MS-R04 enforces it unilaterally.

---

**[Back to the Pattern Catalogue](../README.md)**
