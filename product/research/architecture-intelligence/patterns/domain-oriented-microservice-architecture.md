# Domain-Oriented Microservice Architecture (DOMA)

## Source Inspiration

- Domain-Driven Design (bounded contexts and context mapping)
- Uber's Domain-Oriented Microservice Architecture
- Strangler-fig and microservice extraction-readiness practices
- "Group by business capability, not by technical layer" architectural principle

## Problem

When a product reaches the F3 microservices stage, decomposition often drifts toward technical layers (a data service, an API service, a notification service) or one service per entity. Both produce a *distributed monolith*: services that release together, share entangled data, and chatter synchronously across the network — the cost of distribution without its autonomy.

## Evolith Position

DOMA is the canonical organizing principle for F3 decomposition. It is governed by [ADR-0076](../../../../reference/core/architecture/adrs/core/0076-domain-oriented-microservice-architecture.md) and bound to the domain-model design standard and its review gates.

## Principle

- Group microservices into **bounded business domains**, not technical layers or entities.
- The domain — not the individual service — is the autonomy and ownership boundary.
- The DDD bounded-context map authored in Design is the source of truth for domain boundaries; extraction never crosses a context boundary.

## Allowed Integration

- Direct calls **within** a domain.
- Asynchronous, event-driven interaction **across** domains, through a stable, versioned domain gateway contract.

## Forbidden Integration

- Synchronous cross-domain call chains.
- Cross-domain database joins or shared schemas.
- Service boundaries that split a single bounded context.

## Benefits

- Predictable, reviewable microservice boundaries (they must match a bounded context).
- Lower cross-service coupling and smaller blast radius.
- The Design-time domain model directly drives the F3 topology — one artifact, two uses.

## Tradeoffs

- More upfront domain-modeling rigor in exchange for cheaper, safer decomposition later.
- A domain that grows too large can still hide internal coupling; mitigated by periodic boundary audits and the extraction-readiness criteria.

## AI Impact

AI-assisted tools can validate a proposed service decomposition against the bounded-context map, flagging any service that crosses a context boundary or introduces a synchronous cross-domain dependency.

## Related ADR Candidates

- ADR-0076: Domain-Oriented Microservice Architecture (DOMA)
- ADR-0047: Architectural Patterns — Monolith, SOA, Microservices
- ADR-0045: Microservice Extraction Readiness Criteria
- ADR-0031: Schema per Context and Domain Event Catalog

---

[Back to Architecture Intelligence](../README.md)
