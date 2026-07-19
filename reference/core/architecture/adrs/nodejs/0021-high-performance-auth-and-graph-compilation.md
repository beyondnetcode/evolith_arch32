# [ADR 0021](0021-high-performance-auth-and-graph-compilation.md): High-Performance Authentication Graph Compilation

## Status
Accepted

## Date
2026-05-08

## Context
Login processes generate the absolute heaviest initial load footprint. Traversing dynamic recursive nested roles, generating dynamic menu matrices, and filtering multi-tenant capabilities directly from SQL tables upon every transaction generates unbearable latencies and kills total gateway throughput.

## Decision
Standardize authentication login gateways to yield lightweight, pre-digested **Hierarchical Authorization Graphs** boosted via Distributed memory side-caches:

1. **Stateless Signing**: Session legitimacy verification continues over asymmetric RS256 Token validation, rotated dynamically (RTR).
2. **Aggregated Graphing**: Instead of repeatedly joining relational tables, resolve the entirety of `Role System Menu Submenu Action` mappings once.
3. **Read-Aside Memory Burst**: Serialize this graph structure directly into Redis, partitioned by user and tenant context keys. Keep general access authorization resolution under physical **<5ms benchmarks**.
4. **Explicit-Deny Superiority**: Hardcode rule precedence such that local overrides (`DENY`) explicitly supersede general permissive structures (`ALLOW`) regardless of hierarchy position.

## Consequences

### Positive
- Dramatic latency subtraction. Achieves maximum density performance for end-users on mobile/web immediately post-handshake.
- Linear scalability: Authentication gateways may horizontally replicate indefinitely without impacting SQL disk capability.

### Negative
- Demands rigorous Redis cache invalidation logic explicitly bound to any permissions management write-events.

## References
- [ADR-0014: Redis Cache](../../adrs/core/0014-multi-layer-distributed-caching-strategy.md)
- [ADR-0022: Contextual Authorization](../../adrs/nodejs/0022-contextual-auth-and-pluggable-projections.md)







## Objective and Scope

Historical backfill: Address the architectural tension where login processes generate the absolute heaviest initial load footprint, establishing a standard boundary.

## Options Considered

- **Selected:** High-Performance Authentication Graph Compilation
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [ADR-0014: Redis Cache](../../adrs/core/0014-multi-layer-distributed-caching-strategy.md)
- [ADR-0022: Contextual Authorization](../../adrs/nodejs/0022-contextual-auth-and-pluggable-projections.md)

## Technology Watch (Trends, Maturity, Adoption, Support)

Authentication graph compilation is a specialized pattern within the mature authentication domain. JWT-based token patterns and session management are well-established in the growth/mainstream stage. The compilation approach for pre-computing authorization graphs is an emerging optimization pattern with limited production evidence outside large-scale deployments. Expected vigencia: the token/session model 5+ years; the graph compilation pattern depends on continued validation.

## Current Sources

- OAuth 2.0 and OIDC specifications — https://oauth.net/2, consulted 2026-06-20.
- JWT RFC 7519 — https://datatracker.ietf.org/doc/html/rfc7519, consulted 2026-06-20.

---
[Back to Index](./README.md)
