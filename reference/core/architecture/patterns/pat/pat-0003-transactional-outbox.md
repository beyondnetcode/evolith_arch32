# PAT-0003: Transactional Outbox

> **Bilingual Navigation:** [Versión en Español](./pat-0003-transactional-outbox.es.md)

**Type:** Canonical Architectural Pattern — runtime-agnostic  
**Kind:** Pattern  
**Category:** Integration  
**Status:** Accepted  
**Also known as:** Outbox Pattern, Reliable Event Publication  

---

## Problem

Writing to the database and publishing to the broker are two separate operations. If the process dies between them, the state change is durable but the event never reaches subscribers, and no retry can recover an event that was never recorded.

## Forces

- Distributed transactions across a database and a broker are unavailable or unacceptably expensive.
- At-least-once relay is achievable; exactly-once publication is not.
- The relay adds latency between the business write and the event becoming visible.

## Solution (Norm)

Events are written to an outbox table within the same database transaction as the business write. A separate relay — change data capture or a polling publisher — moves outbox rows to the broker. Because the relay is at-least-once, consumers must deduplicate.

## Applicability by Topology

| Topology | Applicability | Guidance |
|---|---|---|
| Event-Driven | Required | The satellite declares transactionalOutbox=true in event-driven.config.json. Enforced by ED-R02. |
| Microservices | Recommended | Each service relays its own outbox; the outbox never crosses a service's data boundary. |
| Distributed Modules | Recommended | Applied per module, alongside schema-validated event payloads under DM-R04. |
| Modular Monolith | Optional | The outbox is intra-database; the durability gap it closes is narrower inside a single deployment unit. |

## Enforcement

| Rule | Title | Engine | Ruleset |
|---|---|---|---|
| **ED-R02** | Transactional Outbox | topology-ruleset | `src/rulesets/topologies/event-driven/event-driven.rules.json` |
| **CORE-0033-01** | Honor design decision in ADR-0033 | adr-ruleset | `src/rulesets/adr/generated/adr-0033-transactional-outbox-pattern-for-async-messaging.rules.json` |

## Governing ADRs

| ADR | Recorded title | Verification | Note |
|---|---|---|---|
| [ADR-0033](../../adrs/core/0033-transactional-outbox-pattern.md) | Transactional Outbox Pattern for Async Messaging (core) | verified | — |

## Variants

| Variant | Scope | Invariant | PAT |
|---|---|---|---|
| CDC relay | service | A change data capture connector streams committed outbox rows to the broker without application code. | — |
| Polling publisher | service | A scheduled publisher reads unsent outbox rows and marks them dispatched after broker acknowledgement. | — |

## Relationships

- **requires PAT-0017** — The outbox publishes duplicates during failover; without idempotent consumers the pattern moves the defect rather than fixing it.

## Implementations

None yet. This pattern has no runtime-specific canonical implementation (CP-NN) yet.

## Sources

- `src/rulesets/topologies/event-driven/patterns.md` — Transactional Outbox section.

> **Note:** This pattern is enforced by two independent engines: the event-driven topology ruleset (ED-R02) and the generated ADR ruleset (CORE-0033-01).

---

**[Back to the Pattern Catalogue](../README.md)**
