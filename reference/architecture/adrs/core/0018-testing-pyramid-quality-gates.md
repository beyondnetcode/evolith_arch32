# [ADR 0018](0018-testing-pyramid-quality-gates.md): Testing Pyramid and Automated Quality Gates

## Status
Approved

## Date
2026-05-08

## Context
Without rigid test requirements, gradual codebase regression quickly turns maintainable monoliths into unstable legacy bundles. We require strict testing criteria bounding execution confidence automatically enforced before code enters target branch flows.

## Decision
Commit to a standard software testing hierarchy and mechanical deployment blocking:

1. **Unit Layer (Fast)**: Dominate total test volume using standard Jest executions isolating pure core and application classes. Tests must not execute IO or container startups.
2. **Integration Layer (Safe)**: Test Persistence and Gateway adapters against active databases using testcontainer engines (e.g., live PostgreSQL/Redis in ephemeral containers).
3. **e2e Layer (Complete)**: Deploy isolated `supertest` routines orchestrating full HTTP routes (Controller Service Database) testing actual external boundary security and transport.
4. **Binary Gates**: The CI pipeline rigorously denies processing merge commits that collapse general test coverage thresholds underneath established corporate minima (**70% baseline**).

## Consequences

### Positive
- Protects against regression cascades at infinite release speed.
- Encourages safe developer refactoring confidence.

### Negative
- Marginal time addition required during the creation phase of complex routines.
- Requires active orchestration (testcontainers) to maintain local speed optimization.

## References
- [ADR-0005: Security Gates](../../adrs/core/0005-automated-sast-quality-gates.md)





## Objective and Scope

Historical backfill: Address the architectural tension where without rigid test requirements, gradual codebase regression quickly turns maintainable monoliths into unstable legacy bundles, establishing a standard boundary.

## Options Considered

- **Selected:** Testing Pyramid and Automated Quality Gates
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [ADR-0005: Security Gates](../../adrs/core/0005-automated-sast-quality-gates.md)

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
