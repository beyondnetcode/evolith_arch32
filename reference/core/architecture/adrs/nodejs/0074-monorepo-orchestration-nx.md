# [ADR 0074](0074-monorepo-orchestration-nx.md): Monorepo Orchestration with Nx

## Status
Accepted

## Date
2026-06-12

## Context and Problem
The Node.js ecosystem requires a robust tool to enforce the [Core ADR-0001: Monorepo Orchestration Principle](../core/0001-monorepo-orchestration-principle.md). The tool must handle TypeScript compilation, linting boundaries, and intelligent caching for Node.js workloads (APIs, Web, and shared libraries) seamlessly.

## Objective and Scope
Select the specific monorepo orchestration tool for the Node.js platform that fulfills the requirements of the Core Monorepo Orchestration Principle.

## Options Considered
- **Selected:** Nx
- **Others:** 
  - **Lerna:** Rejected due to lack of advanced computation caching and slower execution for large graphs.
  - **Turborepo:** Considered, but Nx offers stronger plugin ecosystem support for Angular/NestJS/React and better boundary enforcement out of the box.

## Decision and Rationale
Adopt **Nx** as the monorepo orchestration tool for Node.js, combined with **npm workspaces** for native package resolution.
- `nx.json` defines build, test, and lint dependency graphs for intelligent caching and parallel execution.
- `eslint-plugin-boundaries` and `dependency-cruiser` enforce strict import rules between layers and workspaces.

## Evidence and Evaluation Criteria
Nx Computation Cache keeps CI under 1 minute for unchanged Node.js projects. Nx natively supports dependency visualization and provides powerful code generators for our standard Node.js tech stack.

## Consequences, Risks, and Trade-offs

### Positive
- Unified CI/CD pipeline tailored for Node.js projects.
- Extensible through Nx plugins for custom structural generators.

### Negative
- Developers must learn Nx CLI conventions.
- Requires configuration tuning as the workspace grows.

## Technology Watch
- **Market Direction:** Nx is the leading monorepo tool in the JavaScript/TypeScript ecosystem, actively maintained.
- **Maturity Stage:** Mature.
- **Review Trigger:** Re-evaluate if Nx introduces breaking architectural changes or if the JS community coalesces around a newer standard like Turborepo.

## Current Sources
- [Nx Documentation](https://nx.dev) (Consulted 2026-06-12)

## References
- [Nx Documentation](https://nx.dev)

## Related Decisions and Standards
- [Core ADR-0001: Monorepo Orchestration Principle](../core/0001-monorepo-orchestration-principle.md)
- [Node.js ADR-0003: Strict TypeScript Standards](./0003-strict-typescript-standards.md)

---
[Back to Index](./README.md)
