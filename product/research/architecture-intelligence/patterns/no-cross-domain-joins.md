# No Cross-Domain Joins

## Source

- Domain-Driven Design
- Modular Monolith architecture practice
- Bounded Context Isolation pattern

## Problem

A system may appear modular in code while remaining tightly coupled in the database.

This usually happens when one domain queries another domain's internal tables directly through:

- SQL joins
- shared ORM navigation properties
- shared repositories
- global database contexts
- cross-domain foreign keys

## Context

This pattern applies when a product is organized by bounded contexts, modules, or domains and must preserve future extraction options.

## Solution

Do not join database tables across bounded-context ownership boundaries.

Each context must expose required information through explicit integration mechanisms.

## Allowed Alternatives

- application contracts
- internal APIs
- domain events
- integration events
- read models
- projections
- replicated reference data
- anti-corruption layers

## Benefits

- reduces hidden coupling
- improves modular autonomy
- protects domain ownership
- improves future microservice extraction readiness
- makes architecture easier for AI agents to reason about

## Tradeoffs

- may require duplicated read data
- may introduce eventual consistency
- requires explicit integration contracts
- may increase implementation effort for cross-domain views

## Evolith Position

Recommended.

## Adoption Level

Enterprise.

## AI Impact

High. AI agents can work more safely when module boundaries are explicit and persistence ownership is not ambiguous.

## Related ADRs

- [ADR-0031: Schema per Context and Domain Event Catalog](../../../../reference/core/architecture/adrs/core/0031-schema-per-context-domain-event-catalog.md)
- [ADR-0045: Microservice Extraction Readiness Criteria](../../../../reference/core/architecture/adrs/core/0045-microservice-extraction-readiness-criteria.md)
- [ADR-0057: Architecture Intelligence Catalog](../../../../reference/core/architecture/adrs/core/0057-architecture-intelligence-catalog.md)

## Anti-Patterns

- one global DbContext for all domains
- direct SQL joins across bounded contexts
- shared repositories used by multiple domains
- using reporting convenience to justify domain coupling

---

[Back to Architecture Intelligence](../README.md)
