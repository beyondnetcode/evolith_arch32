# [ADR 0003](0003-strict-typescript-standards.md): Strict TypeScript Standards

## Status
Approved

## Date
2026-05-08

## Context
Loosely typed TypeScript (`any` usage, missing return types, implicit `any` from libraries) creates the same class of bugs as plain JavaScript while maintaining a false sense of type safety. This negates the primary value of TypeScript in enterprise development.

## Decision
Enforce strict TypeScript configuration and ESLint rules across the entire monorepo.

**`tsconfig.json` mandatory flags:**
```json
{
 "compilerOptions": {
 "strict": true,
 "noImplicitAny": true,
 "strictNullChecks": true,
 "noUnusedLocals": true,
 "noUnusedParameters": true
 }
}
```

**ESLint mandatory rules:**
- `@typescript-eslint/no-explicit-any`: error
- `@typescript-eslint/explicit-function-return-type`: error
- `@typescript-eslint/no-floating-promises`: error
- `eslint-plugin-boundaries`: enforces layer import rules (Core cannot import Infrastructure)

All rules are enforced in CI - PRs with TypeScript errors are blocked from merging.

## Consequences

### Positive
- Eliminates an entire class of null/undefined runtime errors at compile time.
- Enforces self-documenting code via explicit return types.
- `eslint-plugin-boundaries` makes hexagonal layer violations a build error, not a code review finding.

### Negative
- Higher initial development overhead - developers must be explicit about all types.
- Third-party libraries with poor TypeScript definitions require careful wrapper typing.

## References
- [ADR-0001: Monorepo Orchestration](../../adrs/core/0001-monorepo-orchestration-principle.md)
- [ADR-0002: Clean Hexagonal Architecture](../../adrs/nodejs/0002-clean-architecture-nestjs.md)







## Objective and Scope

Historical backfill: Address the architectural tension where loosely typed TypeScript (`any` usage, missing return types, implicit `any` from libraries) creates the same class of bugs as plain JavaScript while maintaining a false sense of type safety, establishing a standard boundary.

## Options Considered

- **Selected:** Strict TypeScript Standards
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [ADR-0001: Monorepo Orchestration](../../adrs/core/0001-monorepo-orchestration-principle.md)
- [ADR-0002: Clean Hexagonal Architecture](../../adrs/nodejs/0002-clean-architecture-nestjs.md)

## Technology Watch (Trends, Maturity, Adoption, Support)

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Current Sources

Unknown (historical record).

---
[Back to Index](./README.md)
