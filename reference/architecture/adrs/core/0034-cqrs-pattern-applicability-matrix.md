# [ADR 0034](0034-cqrs-pattern-applicability-matrix.md): CQRS Pattern Application Matrix

## Status
Approved

## Date
2026-05-11

## Context
Implementing **Command Query Responsibility Segregation (CQRS)** introduces architectural complexity due to the separation of data models, distinct code paths, and eventual consistency mechanics. Applying full CQRS blindly to every simple entity results in massive unnecessary overhead. We require rigid corporate governance rules defining WHEN this pattern should be implemented.

## Decision
Adopt the following **Evaluation Matrix** to determine if a specific Use Case requires Full CQRS enforcement:

### Tier 1: Standard Path (No CQRS Required)
* **Criteria**: Basic CRUD operations, simple state changes, low to medium concurrent access.
* **Approach**: Single model logic using Hexagonal Repository implementation reading and writing to the same Domain Entity.

### Tier 2: Read-Model Aggregation (BFF level CQRS)
* **Criteria**: Domain models must be combined, joined, or refiltered for specialized UI Views.
* **Approach**: The BFF creates specialized "Read-Only Projections" of data using optimized SQL, while keeping commands directed to the core repository.

### Tier 3: Full CQRS Enforcement (Mandatory)
Mandate complete physical code/logic separation ONLY if at least **TWO** of the following conditions are met:
1. **Volume Asymmetry**: The ratio of Read queries to Write updates exceeds **100:1**.
2. **High Contention**: Heavy analytical reads disrupt transaction performance and lock rows, requiring a separate "Read-Replica Projection".
3. **Complex View Projections**: Multiple distinct views of the same data exist that cannot be mathematically derived from the core Domain Aggregate without heavy compute overhead.
4. **State Reconstruction**: Business audit logic requires storing the stream of history (Event Sourcing prerequisite).

## Consequences

### Positive
- Defends against over-engineering in simple domains.
- Directs resources to build CQRS ONLY for high-throughput contention zones.
- Ensures clear segregation of scaling concerns.

### Negative
- Teams require training to differentiate between Tier 2 (BFF Read Aggregation) and Tier 3 (Full CQRS).

## References
- [CQRS pattern (Martin Fowler)](https://martinfowler.com/bliki/CQRS.html)
- [ADR-0002: Clean Hexagonal Architecture](../../adrs/nodejs/0002-clean-architecture-nestjs.md)





## Objective and Scope

Historical backfill: Address the architectural tension where implementing **Command Query Responsibility Segregation (CQRS)** introduces architectural complexity due to the separation of data models, distinct code paths, and eventual consistency mechanics, establishing a standard boundary.

## Options Considered

- **Selected:** CQRS Pattern Application Matrix
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [CQRS pattern (Martin Fowler)](https://martinfowler.com/bliki/CQRS.html)
- [ADR-0002: Clean Hexagonal Architecture](../../adrs/nodejs/0002-clean-architecture-nestjs.md)

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
