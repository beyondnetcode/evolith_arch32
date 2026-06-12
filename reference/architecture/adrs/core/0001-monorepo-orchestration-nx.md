# [ADR 0001](0001-monorepo-orchestration-nx.md): Monorepo Orchestration with Nx

## Status
Approved

## Date
2026-05-08

## Context
Managing multiple related applications (API, Web, shared libraries) as isolated repositories causes friction: duplicated CI/CD configs, version drift between shared code, and complex local setups. A monorepo strategy is required to keep all artifacts in a single, coherent codebase.

## Decision
Adopt **Nx** as the monorepo orchestration tool, combined with **npm workspaces** for native package resolution.

- All applications reside under `apps/`.
- All shared libraries reside under `libs/`.
- Nx task pipeline (`nx.json`) defines build, test, and lint dependency graphs for intelligent caching and parallel execution.
- `eslint-plugin-boundaries` enforces strict import rules between layers and workspaces.

## Consequences

### Positive
- Unified CI/CD pipeline - one lock file, one lint config, one test runner.
- Nx Computation Cache keeps CI under 1 minute for unchanged projects.
- `dependency-cruiser` enforces hexagonal layer rules globally across all packages.

### Negative
- Developers must learn Nx CLI conventions.
- Large repositories can be slower to clone without sparse checkout configuration.

## References
- [Nx Documentation](https://nx.dev)
- [ADR-0003: Strict TypeScript Standards](../../adrs/nodejs/0003-strict-typescript-standards.md)





## Objective and Scope

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Options Considered

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Evidence and Evaluation Criteria

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Related Decisions and Standards

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

---
[Back to Index](./README.md)
