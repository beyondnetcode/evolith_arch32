# [ADR 0002](0002-clean-architecture-nestjs.md): Clean Hexagonal Architecture with NestJS

## Status
Approved

## Date
2026-05-08

## Context
Standard NestJS tutorials encourage placing business logic directly inside services decorated with `@Injectable()`, creating tight coupling between the domain and the framework. This makes the codebase hard to test (requires NestJS test module bootstrapping even for pure business logic) and impossible to migrate to a different framework without a full rewrite.

## Decision
Adopt **Hexagonal Architecture (Ports & Adapters)** as the mandatory structural pattern for all NestJS applications in this monorepo.

The architecture is divided into three explicit layers:

1. **Core (Domain)** - Pure TypeScript classes. Zero imports from NestJS, TypeORM, or any external SDK. Contains entities, value objects, and port interfaces (`IUserRepository`, `IPasswordHasher`).
2. **Application** - Use-case classes that orchestrate Core logic. May import NestJS for DI decorators only (`@Injectable`). No infrastructure imports.
3. **Infrastructure (Adapters)** - Concrete implementations of Core ports (`TypeOrmUserRepository`, `BcryptPasswordHasher`). All framework and SDK imports live here.

Dependency direction is strictly enforced: Infrastructure -> Application -> Core. Never the reverse.

### 4. Aspect-Oriented Programming (AOP) Isolation
Cross-cutting concerns (Logging, Auditing, Distributed Tracing, Caching, Transaction Management) must NEVER hard-couple third-party library decorators or SDKs inside the Core or Application layers.
- **Prohibited**: Injecting `@SentryCapture`, `@OpentelemetrySpan`, or `@Cacheable` directly onto UseCase methods.
- **Allowed**: Encapsulating AOP concerns inside **NestJS Interceptors, Middleware, or Decorator Wrappers residing exclusively in the Adapter/Infrastructure layer**, wrapping the pure UseCase execution cleanly from the outside.

## Consequences

### Positive
- Pure domain tests run in milliseconds with no database or framework setup.
- The entire Core layer can be extracted and reused in a different framework (Fastify, Express) with zero changes.
- `eslint-plugin-boundaries` can statically enforce the dependency direction in CI.

### Negative
- Requires additional mapping code (Entity -> ORM Model) in the infrastructure layer.
- Steeper learning curve for developers accustomed to the standard NestJS service pattern.

## References
- [ADR-0003: Strict TypeScript Standards](../../adrs/nodejs/0003-strict-typescript-standards.md)
- [ADR-0029: Tactical DDD Primitives](../../adrs/nodejs/0029-tactical-ddd-primitives-library.md)
- [Architecture Spec - Level 3 Component Diagram](../../blueprints/c4-topology-spec.md)







## Objective and Scope

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Options Considered

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Evidence and Evaluation Criteria

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Related Decisions and Standards

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Technology Watch (Trends, Maturity, Adoption, Support)

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Current Sources

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

---
[Back to Index](./README.md)
