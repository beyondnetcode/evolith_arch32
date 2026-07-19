# [ADR 0002](0002-clean-architecture-nestjs.md): Clean Hexagonal Architecture with NestJS

## Status
Accepted

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

Historical backfill: Address the architectural tension where standard NestJS tutorials encourage placing business logic directly inside services decorated with `@Injectable()`, creating tight coupling between the domain and the framework, establishing a standard boundary.

## Options Considered

- **Selected:** Clean Hexagonal Architecture with NestJS
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [ADR-0003: Strict TypeScript Standards](../../adrs/nodejs/0003-strict-typescript-standards.md)
- [ADR-0029: Tactical DDD Primitives](../../adrs/nodejs/0029-tactical-ddd-primitives-library.md)
- [Architecture Spec - Level 3 Component Diagram](../../blueprints/c4-topology-spec.md)

## Technology Watch (Trends, Maturity, Adoption, Support)

NestJS is a mature Node.js framework in the growth stage with strong enterprise adoption. The framework maintains regular releases following Angular-style versioning with active support from the NestJS core team and community. Large GitHub community (60k+ stars), extensive adoption in enterprise Node.js ecosystems. Expected vigencia: 3-5 years as primary choice for structured Node.js backends.

## Current Sources

- NestJS official documentation and release notes — https://docs.nestjs.com, consulted 2026-06-20.
- npm downloads and GitHub release history — https://www.npmjs.com/package/@nestjs/core, consulted 2026-06-20.
- State of Node.js surveys on framework adoption trends — https://stateofjs.com, consulted 2026-06-20.

---
[Back to Index](./README.md)
