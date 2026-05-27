# Bounded Context Isolation

## Source Inspiration

- Domain-Driven Design
- Enterprise modular monolith practices
- Modern distributed architecture patterns
- "Do not join tables across modular boundaries" architectural principle

## Problem

Many modular monoliths are only modular at code level.

The persistence layer remains fully coupled through:
- cross-domain joins
- shared DbContexts
- direct entity access
- shared repositories
- cross-module foreign keys

This creates:
- hidden coupling
- low autonomy
- difficult evolution
- AI reasoning complexity
- poor scalability

## Evolith Position

Recommended.

## Principle

Each bounded context must:
- own its persistence
- own its rules
- expose contracts
- avoid direct persistence access from external domains

## Allowed Integration

- contracts
- APIs
- events
- projections
- read models
- query services

## Forbidden Integration

- cross-domain joins
- shared repositories
- direct DbSet access across domains
- global DbContexts

## Benefits

- modular autonomy
- independent evolution
- clearer ownership
- better AI-assisted engineering
- safer decomposition into distributed systems

## Tradeoffs

- increased integration complexity
- possible data duplication
- eventual consistency scenarios
- more explicit contracts

## AI Impact

High.

AI agents reason significantly better when domains are isolated conceptually and technically.

## Related ADR Candidates

- ADR: Bounded Context Isolation
- ADR: No Cross-Domain Database Joins
- ADR: Contract First Integration

---

[Back to Architecture Intelligence](../README.md)
