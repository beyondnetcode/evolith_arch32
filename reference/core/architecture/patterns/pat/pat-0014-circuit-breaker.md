# PAT-0014: Circuit Breaker

> **Bilingual Navigation:** [Versión en Español](./pat-0014-circuit-breaker.es.md)

**Type:** Canonical Architectural Pattern — runtime-agnostic  
**Kind:** Pattern  
**Category:** Resilience  
**Status:** Accepted  
**Also known as:** Distributed Circuit Breaker  

---

## Problem

Synchronous failures, excessive latency, or transient timeouts at an outbound dependency cascade backwards: calling threads block, local resource pools fill, and the caller becomes unavailable because its callee is.

## Forces

- An open breaker fails fast at the cost of rejecting calls that might have succeeded.
- Per-process breaker state means each node must independently rediscover the same outage.
- Threshold calibration — error count, timeout, cooldown — is where the pattern is usually gotten wrong.

## Solution (Norm)

Every synchronous call to a component the caller does not own is wrapped in a circuit breaker placed in the outbound infrastructure adapter. A failure in the callee must not cascade into a failure of the caller. Breaker state is shared across the cluster rather than held per process, so one node tripping the breaker propagates immediately to its peers.

## Applicability by Topology

| Topology | Applicability | Guidance |
|---|---|---|
| Distributed Modules | Required | All synchronous inter-module calls implement the breaker; a module failure must not cascade to caller failure. Enforced by DM-R07. |
| Microservices | Required | Combined with bulkhead isolation (PAT-0015) and fallback behaviour (PAT-0016) on every inter-service call. |
| Modular Monolith | Optional | In-process calls have no network failure mode; the breaker applies only to outbound third-party integrations. |
| Agentic AI | Recommended | Tool invocations that reach external systems are outbound calls and are wrapped identically. |

## Enforcement

| Rule | Title | Engine | Ruleset |
|---|---|---|---|
| **DM-R07** | Circuit Breaker for Inter-Module Calls | topology-ruleset | `src/rulesets/topologies/progressive-axis/distributed-modules/distributed-modules.rules.json` |
| **CORE-0011-01** | Conform to ADR-0011 | adr-ruleset | `src/rulesets/adr/generated/adr-0011-fault-tolerance-and-resiliency-patterns.rules.json` |

## Governing ADRs

| ADR | Recorded title | Verification | Note |
|---|---|---|---|
| [ADR-0011](../../adrs/core/0011-fault-tolerance-resiliency-patterns.md) | Fault Tolerance and Resiliency Patterns (core) | verified | The ADR mandates a distributed circuit breaker with cluster-shared state, plus retry with exponential backoff. It does not cover bulkheads or fallbacks. |

## Variants

None recorded.

## Relationships

- **complements PAT-0015** — The bulkhead limits how much of the caller one failing dependency can consume; the breaker stops calling it.
- **requires PAT-0016** — An open breaker must return something; the fallback defines what.

## Implementations

None yet. This pattern has no runtime-specific canonical implementation (CP-NN) yet.

## Sources

- `src/rulesets/topologies/progressive-axis/distributed-modules/distributed-modules.rules.json` — DM-R07 rule statement. No prose pattern guide documents this pattern.
- `reference/core/architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.md` — Recorded decision.

> **Note:** This pattern had complete enforcement and zero documentation anywhere in the corpus before this record. Its content is derived from the rule statement and the ADR, not from prose.

---

**[Back to the Pattern Catalogue](../README.md)**
