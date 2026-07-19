# PAT-0017: Idempotent Consumer

> **Bilingual Navigation:** [Versión en Español](./pat-0017-idempotent-consumer.es.md)

**Type:** Canonical Architectural Pattern — runtime-agnostic  
**Kind:** Pattern  
**Category:** Resilience  
**Status:** Accepted  
**Also known as:** Deduplicated Consumer, Exactly-Once Effect  

---

## Problem

Every reliable delivery mechanism available — broker redelivery, outbox relay, client retry, saga compensation — is at-least-once. A consumer that assumes single delivery produces duplicate aggregates or inconsistent state the first time a failover occurs.

## Forces

- Exactly-once delivery is not achievable; exactly-once effect is, and only at the consumer.
- Deduplication state must be durable for at least as long as the redelivery window.
- The deduplication key must be supplied by the producer or derived deterministically, never generated on receipt.

## Solution (Norm)

Every consumer implements idempotency using a deduplicated message key. The key identifies the logical operation, not the delivery attempt. A repeated key produces the recorded outcome without re-executing the handler.

## Applicability by Topology

| Topology | Applicability | Guidance |
|---|---|---|
| Event-Driven | Required | Consumers declare hasIdempotencyKey=true in event-driven.config.json. Enforced by ED-R05. |
| Distributed Modules | Required | Event consumers must handle duplicate delivery gracefully; cross-module ordering is only best-effort. |
| Microservices | Required | Applies to mutating HTTP endpoints as well as to event handlers, since retries reach both. |
| Serverless | Required | Managed event sources retry on any non-success result, making duplicate invocation routine. |

## Enforcement

| Rule | Title | Engine | Ruleset |
|---|---|---|---|
| **ED-R05** | Idempotent Consumer Contract | topology-ruleset | `src/rulesets/topologies/event-driven/event-driven.rules.json` |

## Governing ADRs

| ADR | Recorded title | Verification | Note |
|---|---|---|---|
| [ADR-0036](../../adrs/core/0036-message-bus-delivery-strategy-fifo-dlq.md) | Message Bus Delivery & Flow Control Strategy (core) | verified | Section 6 of the ADR records an 'Idempotent Consumer Mandate'. |

## Variants

| Variant | Scope | Invariant | PAT |
|---|---|---|---|
| Idempotency-key middleware | service | A client-supplied key is recorded with its response and replayed verbatim on repeat, without invoking the handler. Realised for .NET in CP-03. | — |
| Consumer-side deduplication store | service | Processed message keys are persisted and checked before handling. | — |

## Relationships

- **requires PAT-0003** — The outbox is the most common source of the duplicates this pattern absorbs.

## Implementations

- [CP-03](../dotnet/cp-03-lightweight-http-idempotency.md) — dotnet

## Sources

- `src/rulesets/topologies/event-driven/event-driven.rules.json` — ED-R05 rule statement.
- `reference/core/architecture/topologies/progressive-axis/distributed-modules/patterns.md` — Event Choreography section, idempotent consumers bullet.

---

**[Back to the Pattern Catalogue](../README.md)**
