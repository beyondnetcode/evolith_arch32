# [ADR 0023](0023-centralized-ums-vs-decentralized-access.md): Centralized Authorization Core Strategy

## Status
Approved

## Date
2026-05-09

## Context
Enterprise platform clusters suffer from disjointed identity silos. Spreading role verification across downstream applications invites fragmented policy enforcement, hidden security holes, massive administrative latency, and fragmented legal auditability. We require a consolidated authorization "kernel".

## Decision
Commit to building and deploying the system as the **Centralized Authorization Nucleus** serving all satellite company tools:

1. **Kernel Consolidation**: Centralize the responsibility of analyzing identities, aggregating active role trees, and executing logic gates into a single, highly-hardened domain.
2. **Decoupled Delivery**: Retain functional abstraction: identity validation (finding *who*) stays decoupled from logical authorization compilation (granting *what*), delegated cleanly via established Strategy injection layers.
3. **Multi-Projection Output**: Produce canonical permission payloads formatted on-the-fly into either heavy JSON trees for portal rendering or efficient compressed JWT claim-sets for internal microservices verification.
4. **Massive Velocity**: Anchor retrieval stability on Distributed Redis clusters executing permission resolutions under **<5ms total latency budgets**.

## Consequences

### Positive
- Absolute separation of concerns (SoC). Downstream apps focus only on business flow, leaving auth security to the consolidated kernel.
- Singular, authoritative governance record of all system accesses and privilege mutations.
- Exceptional response velocities via Multi-Layer Distributed caching.

### Negative
- Forms a single architectural point of failure if not heavily scaled and redundant across zone clusters.

## References
- [ADR-0021: High Performance Authorization Graph](../../adrs/nodejs/0021-high-performance-auth-and-graph-compilation.md)
- [ADR-0022: Contextual Auth and Projections](../../adrs/nodejs/0022-contextual-auth-and-pluggable-projections.md)







## Objective and Scope

Historical backfill: Address the architectural tension where enterprise platform clusters suffer from disjointed identity silos, establishing a standard boundary.

## Options Considered

- **Selected:** Centralized Authorization Core Strategy
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [ADR-0021: High Performance Authorization Graph](../../adrs/nodejs/0021-high-performance-auth-and-graph-compilation.md)
- [ADR-0022: Contextual Auth and Projections](../../adrs/nodejs/0022-contextual-auth-and-pluggable-projections.md)

## Technology Watch (Trends, Maturity, Adoption, Support)

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Current Sources

Unknown (historical record).

---
[Back to Index](./README.md)
