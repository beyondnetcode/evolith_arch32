# [ADR 0010](0010-multi-tenancy-architecture-strategy.md): Multi-Tenancy Architecture Strategy for SaaS Evolution

## Status
Approved

## Date
2026-05-08

## Context
As the system matures into a SaaS offering, we must isolate data for multiple tenants securely without exploding cloud infrastructure bills. There are three main partitioning approaches:
1. **Database-per-Tenant**: Max isolation, maximum operational cost overhead.
2. **Schema-per-Tenant**: Logical separation, but harder schema migration management.
3. **Shared Database (Pooled)**: Single table space, discriminator IDs, high efficiency but potential data leakage if developers forget WHERE clauses.

We need absolute leakage prevention alongside efficient resource scaling.

## Decision
Adopt a **Hybrid "Pooled" Multi-Tenancy Strategy** utilizing a mandatory **"Defense in Depth" Dual-Layer Isolation Framework**:

1. **Layer 1: Application-Level Isolation (Primary - Engine Agnostic)**:
 The persistence adapter layer MUST automatically inject the active `tenant_id` filter into all queries executed via ORM/Query Builders (e.g., using global filters or base repository query interceptors). This ensures functional data isolation remains completely agnostic of specific database engine capabilities.

2. **Layer 2: Database-Level Failsafe (Engine-Specific Native Enforcement)**:
 As an absolute safety net against human error (e.g., developer-written raw SQL queries skipping ORM filters), teams SHOULD leverage native database enforcement when the selected engine supports it. Examples include **PostgreSQL Row-Level Security (RLS)** or **SQL Server Row-Level Security** backed by session context. This layer is secondary by design and must never replace Layer 1.

3. **Execution Scoping**: Pass `tenant_id` claims securely within verified JWTs or equivalent trusted identity context. The runtime-specific request context holder (e.g., NestJS `AsyncLocalStorage`, .NET scoped tenant context) serves as the single source of truth used by both Layer 1 and Layer 2 resolvers.

4. **VIP Isolation Readiness**: While 90% of tenants share the pool, the persistence abstraction layer must inherently support routing Enterprise clients to completely isolated physical database cluster end-points based on resolved tenant metadata, completely transparent to the domain.

## Consequences

### Positive
- **Defense in Depth**: Row isolation combines application-layer correctness with native database enforcement as a safety net.
- **Extreme Scalability**: Run hundreds of basic tenants on a single Postgres instance without managing hundreds of separate schemas.
- **Simplified Upgrades**: One single migration path applies cleanly to all Pooled tenants instantly.

### Negative
- **Noisy Neighbors**: A rogue query by one tenant can steal hardware capability. Requires strict throttling strategies.
- **Restore Complexity**: Restoring the data lifecycle of only *one* tenant from backup is significantly more labor-intensive in a pooled model.

## References
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [SQL Server Row-Level Security](https://learn.microsoft.com/sql/relational-databases/security/row-level-security)
- [ADR-0031: Schema-per-Context Strategy](../../adrs/core/0031-schema-per-context-domain-event-catalog.md)





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
