# [ADR 0029](0029-tactical-ddd-primitives-library.md): Adoption of Tactical DDD Primitives Library

## Status
Approved

## Date
2026-05-09

## Context
Crafting robust Hexagonal core logic invites repetitive, boiler-heavy development. Creating base comparison methods for IDs, structural identity for Value Objects, and collecting in-memory Domain Events inside Aggregate Roots results in thousands of duplicated utility lines. We require standardized, pure-TypeScript primitives without breaking Hexagonal boundaries.

## Decision
Standardize on utilizing the **`@nestjslatam/ddd`** primitives ecosystem within core domains to accelerate velocity:

1. **Pure Typescript Only**: Adhering to core purity constraints, this specific package has 0 external NPM dependencies, making it totally safe for placement directly in the Domain innermost layer.
2. **Tactical Classes**: Deploy standard base parent implementations of `AggregateRoot`, `Entity<T>`, `ValueObject`, and native `DomainEvent` definitions.
3. **Local Barrel Barrier**: To prevent long-term library lock-in, developers import and re-export these types via a local shared library proxy file. The business code imports from local paths, permitting future drops-in replacement without widespread edits.

## Constraints
- **Readonly Restriction**: All properties mapped to `ValueObject` extension classes MUST remain `readonly` immutable.
- **Zero-ORM pollution**: Explicitly forbidden to utilize relational decorators (`@Entity`, `@Column`) inside code extending DDD primitives. Domain rules remain pure; SQL maps remain outside in Infrastructure.

## Consequences

### Positive
- Shreds heavy routine boilerplate.
- Establishes uniform coding vernacular across multiple distributed backend teams instantly.

### Negative
- Introduces another shallow internal dependency. (Mitigated cleanly via the Barrel abstraction).

## References
- [ADR-0002: Hexagonal Architecture](../../adrs/nodejs/0002-clean-architecture-nestjs.md)
- [@nestjslatam/ddd docs](https://github.com/nestjslatam/ddd)





## Objective and Scope

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Evidence and Evaluation Criteria

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Related Decisions and Standards

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Current Sources

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

---
[Back to Index](./README.md)
