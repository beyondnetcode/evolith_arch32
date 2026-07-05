# Data Ownership per Bounded Context

## Problem

A modular system loses clarity when several modules depend on the same internal data structures.

This creates unclear responsibility, weak boundaries, and higher change impact.

## Context

Use this pattern when a product is organized by bounded contexts, modules, or business capabilities.

## Solution

Each bounded context owns the data needed to enforce its rules.

Other contexts must use explicit contracts, events, projections, or read models instead of depending on internal persistence details.

## Rules

- A bounded context owns its write model.
- Other contexts do not modify owned data directly.
- Shared read needs must be modeled explicitly.
- Read duplication is acceptable when it reduces coupling.
- Cross-context reporting should use projections or reporting models.

## Benefits

- clearer ownership
- stronger boundaries
- safer evolution
- better auditability
- better future extraction readiness

## Tradeoffs

- may require selected read duplication
- may require synchronization patterns
- may introduce eventual consistency
- requires explicit reporting design

## Evolith Position

Recommended.

## Adoption Level

Enterprise.

## AI Impact

High. AI agents produce safer recommendations when ownership boundaries are clear.

## Related ADRs

- [ADR-0031: Schema per Context and Domain Event Catalog](../../../architecture/adrs/core/0031-schema-per-context-domain-event-catalog.md)
- [ADR-0033: Transactional Outbox Pattern](../../../architecture/adrs/core/0033-transactional-outbox-pattern.md)
- [ADR-0057: Architecture Intelligence Catalog](../../../architecture/adrs/core/0057-architecture-intelligence-catalog.md)

---

[Back to Architecture Intelligence](../README.md)
