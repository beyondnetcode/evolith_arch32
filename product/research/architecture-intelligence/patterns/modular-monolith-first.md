# Modular Monolith First

## Source

- Progressive architecture strategy
- Domain-Driven Design
- Evolith architecture journey

## Problem

Teams often jump to microservices before domain boundaries, operational maturity, and delivery discipline are ready.

This creates:

- distributed complexity too early
- fragile integration
- harder debugging
- more operational cost
- slower delivery

## Context

This pattern applies when a product needs enterprise structure but does not yet justify physical distribution.

## Solution

Start with a modular monolith that separates domains conceptually and technically before separating them physically.

## Rules

- Modules must represent meaningful domain boundaries.
- Modules must avoid direct persistence coupling.
- Internal integration must be explicit.
- Future extraction readiness must be preserved.
- Runtime distribution is optional, not the starting assumption.

## Benefits

- faster initial delivery
- lower operational complexity
- clearer domain ownership
- smoother future extraction
- better learning curve for teams and providers

## Tradeoffs

- requires discipline to avoid becoming a layered big ball of mud
- module boundaries must be actively governed
- teams may misuse shared database convenience
- extraction still requires planning and maturity checks

## Evolith Position

Recommended.

## Adoption Level

Enterprise.

## AI Impact

High. A well-structured modular monolith gives AI agents enough context to work locally inside bounded areas without introducing unnecessary distributed complexity.

## Related ADRs

- [ADR-0045: Microservice Extraction Readiness Criteria](../../../../reference/core/architecture/adrs/core/0045-microservice-extraction-readiness-criteria.md)
- [ADR-0047: Architectural Patterns Monolith SOA Microservices](../../../../reference/core/architecture/adrs/core/0047-architectural-patterns-monolith-soa-microservices.md)
- [ADR-0057: Architecture Intelligence Catalog](../../../../reference/core/architecture/adrs/core/0057-architecture-intelligence-catalog.md)

## Anti-Patterns

- treating folder separation as real modularity
- using one shared domain model across all modules
- using one global persistence model for every context
- starting with microservices to compensate for unclear domain design

---

[Back to Architecture Intelligence](../README.md)
