# ADR-0044: Configurable Security Persistence Strategy (Agnosticism vs. Native RLS)

## Status
Proposed

## Date
2026-05-12

## Context
We must enforce row-level data visibility and security rules across the system without sacrificing hexagonal independence. RLS (Row Level Security) is a robust database feature available in systems like PostgreSQL but may not be present if we migrate to NoSQL, In-Memory, or lightweight relational engines.
Relying purely on infrastructure locks us into specific engines (vendor lock-in). Conversely, filtering only in-memory (application level) might incur performance penalties under high-load conditions due to data transfer overhead. We need a system where the Domain retains absolute control over visibility rules but retains the flexibility to leverage native infrastructure optimizations where they exist.

## Decision
Adopt a **Configurable Persistence Strategy** utilizing the Strategy Pattern in the Infrastructure layer. The active approach will be determined at system bootstrap by a structural configuration flag (`SECURITY_STRATEGY_MODE`).

1. **Domain Policies (Source of Truth)**: All visibility criteria are defined as pure **Specifications** within the Core Domain layer.
2. **Strategy Injection**: The persistence factory evaluates the flag to instantiate the appropriate Adapter:
 * **Agnostic Adapter (`APP_FILTER`)**: Translates domain specifications into in-memory iteration filters (e.g., using code-level predicates), ensuring correctness on ANY data engine (NoSQL, In-Memory).
 * **Native Adapter (`INFRA_NATIVE`)**: Translates the same domain specifications into database-native constructs (e.g., `SET SESSION` context, native RLS policies, or optimized SQL).

## Implementation Map

| Component | Responsibility |
| :--- | :--- |
| **Domain Policy** | Defines visibility criteria as pure Specifications. |
| **Feature Flag** | `SECURITY_STRATEGY_MODE` (Values: `APP_FILTER`, `INFRA_NATIVE`). |
| **Persistence Factory** | Decides which adapter to instantiate based on the flag. |
| **Agnostic Adapter** | Translates Specification into runtime code filters (Binary/In-Memory). |
| **Native Adapter** | Translates Specification into `SET SESSION` context + Native SQL. |

## Consequences

### Positive
- **Absolute Portability**: Total control over switching infrastructure. The binary executes successfully even on environments lacking RLS.
- **Testability**: Facilitates rapid unit testing of security policies without spinning up real database containers.
- **Evolutive Control**: The domain remains the exclusive master of the visibility rules.

### Negative / Risks
- **Logic Parity**: Developers must maintain and guarantee logical equivalence between both adapters.
- **Integration Complexity**: Requires parameterized integration tests to ensure coverage over both active strategies.

### CAP & System Impact
- **Latency**: `APP_FILTER` may increase bandwidth usage (retrieving larger datasets to filter locally), while `INFRA_NATIVE` optimizes network transfer but could introduce overhead at connection initiation if not properly pooled.
- **Consistency**: Identical under both strategies as authority originates strictly within Domain.

## References
- [ADR-0002: Clean Hexagonal Architecture with NestJS](../../adrs/nodejs/0002-clean-architecture-nestjs.md)
- [ADR-0010: Multi-Tenancy Architecture Strategy](../../adrs/core/0010-multi-tenancy-architecture-strategy.md)





## Objective and Scope

Historical backfill: Address the architectural tension where we must enforce row-level data visibility and security rules across the system without sacrificing hexagonal independence, establishing a standard boundary.

## Options Considered

- **Selected:** Configurable Security Persistence Strategy (Agnosticism vs. Native RLS)
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [ADR-0002: Clean Hexagonal Architecture with NestJS](../../adrs/nodejs/0002-clean-architecture-nestjs.md)
- [ADR-0010: Multi-Tenancy Architecture Strategy](../../adrs/core/0010-multi-tenancy-architecture-strategy.md)

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
