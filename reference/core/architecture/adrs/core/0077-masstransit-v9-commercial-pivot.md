# ADR-0077: MassTransit v9 Commercial Pivot — Stay on v8, Monitor OpenTransit

> **Bilingual Navigation:** [Versión en Español](./0077-masstransit-v9-commercial-pivot.es.md)

## Status

Approved — Evolith Architecture Board, 2026-06-15.

## Date

2026-06-15

## Context and Problem

MassTransit v9 transitioned to a purely commercial license. The last open-source version (v8, Apache 2.0) is community-supported only until end-of-year 2026. Any .NET product in the Evolith ecosystem that relies on MassTransit for message-bus abstraction faces a forced migration by 2027-01-01 unless a decision is made and executed.

The Stack Audit ([RED Alert 2](../../../governance/standards/engineering/detailed-stack-audit-2026.md)) flags this as a top-critical item tracked under [GT-111](../../../governance/standards/vision/gap-reference-catalog.md#gt-111).

Three viable paths exist:

1. **Stay on v8 within support window** — pin to MassTransit 8.3.x (latest OSS tree) through EOY 2026, then migrate.
2. **Migrate to Rebus** — a mature, MIT-licensed .NET service bus with saga support and multiple transport backends (RabbitMQ, Azure SB, SQL, SQS).
3. **Direct driver injection** — remove the bus abstraction and use transport-specific clients directly.

Additionally, a new community fork — **OpenTransit** (fork of MassTransit v8 for .NET 10+) — emerged in mid-2026 as a potential long-term OSS continuation.

## Objective and Scope

**Objective:** Choose a path that keeps the messaging abstraction on a sustainable OSS footing, minimises migration cost, and preserves the transport-agnostic `IEventBusPort` pattern defined in [ADR-0015](./0015-event-driven-architecture-intra-domain.md).

**In scope:**
- The decision for .NET products in the Evolith ecosystem (UMS, Tracker, and future .NET satellites) through 2027.
- The impact on the `IEventBusPort` abstraction and the existing RabbitMQ transport.

**Out of scope:**
- Other .NET messaging concerns (saga orchestration patterns, DLQ policies — covered by ADR-0036).
- Node.js/TypeScript messaging (uses `@golevelup/nestjs-rabbitmq` and `EventEmitter2` — unaffected).

## Decision

**Stay on MassTransit v8 (8.3.x) through the end-of-year 2026 support window, and monitor OpenTransit as the primary post-2026 OSS continuation path.**

Rationale:

| Criterion | v8 (stay) | Rebus | Direct Driver | OpenTransit (future) |
|---|---|---|---|---|
| Migration cost | Zero (current) | High (API-breaking rewrite) | Very high (lose all bus features) | Low (API-compatible fork) |
| Support window | Through EOY 2026 | Indefinite (MIT) | N/A | TBD (community, early stage) |
| Feature parity | Full | Sagas, pub/sub, retries | None (DIY) | v8 compatible |
| Production readiness | Proven | Proven (since 2015) | Transport-dependent | Pre-production |
| Ecosystem maturity | Large | Medium | N/A | Minimal |

The recommendation maximises the remaining v8 support window (6 months) to:
- Avoid an immediate, costly migration to Rebus or a driver rewrite.
- Let OpenTransit mature enough to assess its community health and API stability.
- Keep the fallback to Rebus or direct driver if OpenTransit fails to gain traction.

A re-evaluation gate is set for Q1 2027.

## Consequences

**Positive:**
- Zero migration cost through 2026.
- OpenTransit may provide a drop-in replacement path, eliminating migration entirely.
- Rebus remains a known fallback if neither v8 extension nor OpenTransit materialises.

**Negative:**
- Must execute the migration on a fixed timeline (Q1 2027) regardless of which path is chosen.
- OpenTransit is pre-production; if it stalls, the fallback migration to Rebus is still needed.
- The v8 support window creates schedule pressure: any .NET satellite that adopts MassTransit after mid-2026 should plan for the migration upfront.

**Mitigations:**
- The `IEventBusPort` abstraction ([ADR-0015](./0015-event-driven-architecture-intra-domain.md)) already decouples the application from the bus implementation, limiting migration blast radius to the adapter layer.
- A dated migration plan will be drafted by Q4 2026, triggered by the OpenTransit maturity assessment.
- Schedule a re-evaluation checkpoint for 2027-01-15 in the Architecture Intelligence Portal.

## Technology Watch

| Item | Schedule | Owner |
| :--- | :--- | :--- |
| MassTransit v8 EOL | 2026-12-31 | .NET Platform Team |
| Re-evaluation checkpoint | 2027-01-15 | Architecture Board |
| OpenTransit maturity assessment | Q4 2026 | .NET Platform Team |

A calendar reminder for the **2027-01-15 re-evaluation checkpoint** has been registered in the Architecture Intelligence Portal. The .NET Platform Team should begin the OpenTransit maturity assessment by **Q4 2026** to inform the re-evaluation decision.

## Compliance

The decision applies to all .NET product repositories in the Evolith ecosystem that use MassTransit. Any satellite that adopts MassTransit after this ADR's approval must pin to v8.3.x and follow the Q1 2027 re-evaluation.

## References

- Stack Audit: `reference/core/foundations/common-rules/detailed-stack-audit-2026.md` (RED Alert 2)
- Gap tracking: [GT-111](../../../governance/standards/vision/gap-reference-catalog.md#gt-111)
- ADR-0015: [Event-Driven Architecture (Intra-Domain)](./0015-event-driven-architecture-intra-domain.md)
- ADR-0036: [Message Delivery and Dead-Letter Strategy](./0036-message-bus-delivery-strategy-fifo-dlq.md)
- OpenTransit project: [https://opentransitlab.github.io/OpenTransit/](https://opentransitlab.github.io/OpenTransit/)
- Rebus project: [https://github.com/rebus-org/Rebus](https://github.com/rebus-org/Rebus)

> **Agent Signature:** Architect Agent
