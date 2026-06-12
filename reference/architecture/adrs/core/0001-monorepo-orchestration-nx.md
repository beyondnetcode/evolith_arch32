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

Historical backfill: Address the architectural tension where managing multiple related applications (API, Web, shared libraries) as isolated repositories causes friction: duplicated CI/CD configs, version drift between shared code, and complex local setups, establishing a standard boundary.

## Options Considered

- **Selected:** Monorepo Orchestration with Nx
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [Nx Documentation](https://nx.dev)
- [ADR-0003: Strict TypeScript Standards](../../adrs/nodejs/0003-strict-typescript-standards.md)

---
[Back to Index](./README.md)
