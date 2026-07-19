# ADR-0076: Domain-Oriented Microservice Architecture (DOMA)

> **Bilingual Navigation:** [Versión en Español](./0076-domain-oriented-microservice-architecture.es.md)

## Status

Accepted — Evolith Architecture Board, 2026-06-14.

## Date

2026-06-14

## Context and Problem

Evolith's progressive evolution path moves a product from a modular monolith (F1) toward independently deployable services (F3) only when demand justifies it ([ADR-0006](./0006-microservices-transition-sidecar-pattern.md), [ADR-0045](./0045-microservice-extraction-readiness-criteria.md), [ADR-0047](./0047-architectural-patterns-monolith-soa-microservices.md)). When a product does reach the F3 microservices stage, the **organizing principle** for how those services are grouped is left implicit.

Without an explicit principle, microservice decomposition tends to drift toward technical layering (a "data service", a "notification service", an "API service") or per-entity granularity. Both produce a *distributed monolith*: services that must be released together, share entangled data, and chatter synchronously across the network — inheriting the cost of distribution without its autonomy benefit. This directly contradicts Evolith's anti-pattern immunization and its bounded-context discipline ([ADR-0031](./0031-schema-per-context-domain-event-catalog.md)).

The problem requiring a decision: **at F3, around what axis are microservices grouped, and how is that alignment governed during domain modeling and review?**

## Objective and Scope

**Objective:** Adopt Domain-Oriented Microservice Architecture (DOMA) as the canonical organizing principle for F3 decomposition — services are grouped around bounded business domains, not technical layers or individual entities — and bind that principle to the domain-model design standard and its review gates.

**In scope:**
- The agnostic rule for grouping services by business domain at F3.
- Integration of DOMA into the domain-model design standard (the DDD model artifact).
- A review checkpoint in the Phase 2/Phase 3 gates and the Architecture Intelligence portal.

**Out of scope:**
- The concrete runtime, mesh, or transport (a companion Platform ADR records any tool selection).
- Forcing premature decomposition: F1/F2 products remain a modular monolith until the extraction-readiness criteria of [ADR-0045](./0045-microservice-extraction-readiness-criteria.md) are met.

## Options Considered

- **Layer-oriented services** — group services by technical concern (data, API, workflow). Rejected: maximizes cross-service coupling and synchronous fan-out; produces a distributed monolith.
- **Entity/CRUD-oriented services** — one service per aggregate/entity. Rejected: explodes service count, fragments transactional consistency, and scatters a single business capability across many deployables.
- **Domain-Oriented Microservice Architecture (DOMA)** — group services into domains (layers of related capabilities) aligned with bounded contexts, with a thin, contract-first gateway per domain and asynchronous events across domains. Adopted.

## Decision and Rationale

Evolith adopts **DOMA** as the F3 decomposition principle:

1. **Domains are the unit of grouping.** Each microservice belongs to exactly one bounded business domain (e.g. Discovery, Construction, Release). A domain may contain several collaborating services, but the domain — not the service — is the autonomy and ownership boundary.
2. **Bounded contexts map to domains.** The DDD bounded-context map authored during Design is the source of truth for domain boundaries; DOMA extraction never crosses a context boundary.
3. **Contract-first domain gateways.** Each domain exposes a stable, versioned contract; intra-domain calls may be direct, cross-domain interaction is asynchronous and event-driven, never a synchronous cross-domain chain.
4. **Data ownership follows the domain.** No cross-domain joins or shared schemas — consistent with schema-per-context ([ADR-0031](./0031-schema-per-context-domain-event-catalog.md)).

Rationale: grouping by domain keeps the high-cohesion/low-coupling property of the modular monolith while gaining independent deployability where demand requires it, and it reuses Evolith's existing DDD and bounded-context machinery rather than inventing a parallel taxonomy.

## Evidence and Evaluation Criteria

Options were judged against: coupling (cross-service synchronous calls), independent deployability, blast radius of change, data-ownership clarity, and reuse of existing Evolith primitives.

- DOMA scores highest on coupling and deployability while preserving data-ownership clarity. Layer- and entity-oriented options fail the coupling and blast-radius criteria.
- Prior art: Uber's domain-oriented microservice architecture, the strangler-fig and bounded-context patterns already canonical in Evolith ([ADR-0047](./0047-architectural-patterns-monolith-soa-microservices.md)), and the extraction-readiness criteria ([ADR-0045](./0045-microservice-extraction-readiness-criteria.md)).

## Consequences, Risks, and Trade-offs

**Positive**
- Microservice boundaries become predictable and reviewable: they must match a bounded context.
- Lower cross-service coupling and smaller blast radius; the distributed-monolith anti-pattern is actively prevented.
- The domain model authored in Design directly drives the F3 topology — one artifact, two uses.

**Negative / Risks**
- A domain that grows too large can still hide internal coupling; mitigated by periodic boundary audits and the extraction-readiness criteria.
- Requires discipline to keep cross-domain interaction asynchronous; mitigated by the domain-gateway contract rule and the review checkpoint.

**Trade-offs**
- DOMA accepts more upfront domain-modeling rigor in exchange for cheaper, safer decomposition later. Products that never reach F3 carry no runtime cost — the principle only governs *when* they decompose.

## References

- [ADR-0047 Architectural Patterns: Monolith, SOA, Microservices](./0047-architectural-patterns-monolith-soa-microservices.md)
- [ADR-0045 Microservice Extraction Readiness Criteria](./0045-microservice-extraction-readiness-criteria.md)
- [ADR-0031 Schema per Context and Domain Event Catalog](./0031-schema-per-context-domain-event-catalog.md)
- [DDD Model Template](../../../sdlc/04-artifact-templates/ddd-model-template.md)
- [Architecture Intelligence Portal](../../../../../product/research/architecture-intelligence/README.md)

## Related Decisions and Standards

- [ADR-0006 Microservices Transition via Sidecar Pattern](./0006-microservices-transition-sidecar-pattern.md)
- [ADR-0015 Event-Driven Architecture (intra-domain)](./0015-event-driven-architecture-intra-domain.md)
- [ADR-0029 Tactical DDD Primitives Library](../nodejs/0029-tactical-ddd-primitives-library.md)
- [SDLC Quality Gates](../../../sdlc/quality-gates.md)
- [DOMA Pattern — Architecture Intelligence](../../../../../product/research/architecture-intelligence/patterns/domain-oriented-microservice-architecture.md)

---
[Back to ADR Registry](../README.md)

> **Agent Signature:** Architect Agent
