# [ADR 0019](0019-tactical-design-patterns-future-proofing.md): Tactical Design Patterns for Future-Proofing

## Status
Approved

## Date
2026-05-08

## Context
Tight coupling between domain controllers and infrastructure (like throwing `HttpException` inside a database service) destroys code reusability. We need foundational idioms ensuring domain logic flows cleanly independent of network transports or failure handlers.

## Decision
Mandate specific Functional and Structure patterns protecting core purity:

1. **The Result Pattern**: Eliminate raw error throwing from inside application use cases. Methods strictly return a typed functional `Result<V, E>` wrapper. Outer adapters (e.g., HTTP Controller) interrogate `result.isFailure()` and map domain domain errors to transport errors (e.g., 404).
2. **Null Object Avoidance**: Forbid standard `null` usage for common logical outcomes. Return strongly typed semantic empty objects or `Optional` representations to force client null-handling verification.
3. **Decorator Boundary separation**: Offload global cross-cutting filters (metrics, tracing, logging) into transparent Typescript method Decorators at the entry gate, preventing telemetry poisoning of actual algorithm code.
4. **Unit of Work Pattern**: All database state mutations within a single Application Use Case transaction must operate under an atomic `IUnitOfWork` context. This guarantees that multiple repository updates and secondary effects (like audit logging inserts) either commit successfully together as a single transaction or rollback totally upon any intermediary failure, preserving consistent aggregate states.

## Consequences

### Positive
- Guarantees flawless transitions to alternate transports (gRPC, MessageBus) requiring zero edits inside logic modules.
- Strongly typed error vectors produce self-documenting safety trails.

### Negative
- Introduces verbal noise (checking success booleans) for developers habituated to unstructured try/catch cascades.

## References
- [Result Pattern Guide](https://khalilstemmler.com/articles/enterprise-typescript-nodejs/functional-error-handling-design-patterns/)
- [ADR-0029: Tactical DDD Primitives](../../adrs/nodejs/0029-tactical-ddd-primitives-library.md)





## Objective and Scope

Historical backfill: Address the architectural tension where tight coupling between domain controllers and infrastructure (like throwing `HttpException` inside a database service) destroys code reusability, establishing a standard boundary.

## Options Considered

- **Selected:** Tactical Design Patterns for Future-Proofing
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [Result Pattern Guide](https://khalilstemmler.com/articles/enterprise-typescript-nodejs/functional-error-handling-design-patterns/)
- [ADR-0029: Tactical DDD Primitives](../../adrs/nodejs/0029-tactical-ddd-primitives-library.md)

---
[Back to Index](./README.md)
