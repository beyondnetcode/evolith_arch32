# ADR-0071: .NET Data Access Strategy — EF Core as Default ORM, Dapper for Optimized Reads

## 1. Status

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-15 |
| **Scope** | Technology Stack — .NET Data Access |
| **Supersedes** | Partial guidance in [ADR-0041](./0041-canonical-dotnet-backend-architecture.md) |
| **Related** | [ADR-0034: CQRS Applicability](../core/0034-cqrs-pattern-applicability-matrix.md), [ADR-0033: Transactional Outbox](../core/0033-transactional-outbox-pattern.md), [ADR-0010: Multi-Tenancy RLS](../core/0010-multi-tenancy-architecture-strategy.md) |

---

## 2. Context

The .NET platform within this architecture handles high-compute workloads including authorization graph resolution, compliance reporting, IGA role promotion workflows, and multi-tenant data operations. [ADR-0041](./0041-canonical-dotnet-backend-architecture.md) established Entity Framework Core (EF Core) as the primary ORM and authorized Dapper for performance-sensitive, high-read workloads, but left the boundary between the two undefined.

Without explicit boundaries, teams risk:

- Mixing ORM strategies ad-hoc, creating inconsistent data access patterns across bounded contexts
- Prematurely optimizing read paths with Dapper before profiling has confirmed an EF Core bottleneck
- Using Dapper for command-side operations and inadvertently bypassing change tracking, aggregate consistency, and the Unit of Work pattern
- Losing the audit and domain-event infrastructure provided by EF Core interceptors when switching to Dapper without awareness of the consequences

This ADR establishes a clear, enforceable policy governing when each tool is appropriate, ensuring consistency, maintainability, and alignment with DDD and Clean Architecture principles.

---

## 3. Problem Statement

Teams face three unresolved tensions:

1. **Uniformity vs. Performance**: EF Core is productive and well-integrated with the domain model, but can generate suboptimal SQL for complex projections or reporting. Dapper gives full SQL control at the cost of losing change tracking, interceptors, and the Unit of Work.

2. **Premature Optimization**: Switching to Dapper is often done for perceived performance reasons before evidence from profiling exists, adding complexity without measurable benefit.

3. **Aggregate Safety on Writes**: Using Dapper for command-side (write) operations risks bypassing domain invariants enforced through EF Core's change tracking and `SaveChangesAsync` interceptors — including the Outbox pattern and RLS session context injection.

---

## 4. Decision

**Entity Framework Core 8+ is the default and mandatory ORM for all .NET data access in this platform.**

Dapper is a conditionally authorized secondary tool, permitted **only** for read-side (query) operations that meet explicit justification criteria defined in section 7.

Commands (writes) must always use EF Core. No exceptions.

---

## 5. Rationale

### 5.1 Why EF Core as Default

EF Core is not simply an ORM — it is the integration point for several cross-cutting concerns in this architecture:

| Concern | EF Core Mechanism |
|---------|------------------|
| Multi-tenant RLS | `DbConnectionInterceptor` injects `SESSION_CONTEXT` before each query |
| Transactional Outbox | `SaveChangesInterceptor` writes domain events to `outbox_events` atomically |
| Soft-delete / Audit trail | Global query filters enforce `is_deleted = false`; interceptors populate audit columns |
| Unit of Work | `DbContext` tracks all changes in a transaction; `SaveChangesAsync` flushes atomically |
| Optimistic concurrency | `[ConcurrencyToken]` / `rowversion` managed automatically |
| Domain-Event dispatch | Events collected on aggregates are harvested in the repository's `Save()` before commit |

Bypassing EF Core for writes removes all of the above silently. Dapper has no equivalent facility for any of these.

### 5.2 Why Dapper Is Conditionally Allowed for Reads

For **query-only projections** where:
- The read model is structurally decoupled from the domain aggregate (CQRS read side)
- The query involves multi-table joins, window functions, or recursive CTEs that EF Core maps poorly
- Profiling has confirmed EF Core-generated SQL as a bottleneck (query time > threshold defined in section 6.2)

Dapper provides ergonomic, explicit SQL with minimal overhead and zero N+1 risk on complex projections.

---

## 6. Performance Considerations

### 6.1 EF Core Query Optimization First

Before authorizing Dapper, the following EF Core optimizations must be attempted and documented as insufficient:

```csharp
// 1. Use AsNoTracking() for all read-only queries
var users = await _dbContext.Users
    .AsNoTracking()
    .Where(u => u.TenantId == tenantId)
    .Select(u => new UserSummaryDto(u.Id, u.Email, u.DisplayName))
    .ToListAsync();

// 2. Use split queries for collection includes to avoid cartesian explosion
var tenants = await _dbContext.Tenants
    .AsNoTracking()
    .Include(t => t.Users)
    .AsSplitQuery()
    .ToListAsync();

// 3. Use compiled queries for hot paths
private static readonly Func<AppDbContext, Guid, Task<UserSummaryDto?>> _getUserById =
    EF.CompileAsyncQuery((AppDbContext ctx, Guid id) =>
        ctx.Users.AsNoTracking()
            .Where(u => u.Id == id)
            .Select(u => new UserSummaryDto(u.Id, u.Email, u.DisplayName))
            .FirstOrDefault());

// 4. Use raw SQL via EF Core for complex queries — keeps interceptors active
var results = await _dbContext.Database
    .SqlQuery<UserProjection>($"SELECT ...")
    .ToListAsync();
```

### 6.2 Dapper Authorization Threshold

A Dapper usage is authorized when **all** of the following are true:

- [ ] The operation is read-only (no INSERT / UPDATE / DELETE)
- [ ] EF Core `AsNoTracking` + projection was implemented and profiled
- [ ] Query execution time on production-representative data exceeds **200 ms at p95**, OR the EF-generated SQL plan shows a full table scan that cannot be resolved with an index
- [ ] The Dapper usage is documented in the `DataAccessDecisions.md` file of the bounded context

### 6.3 Connection and Context Management with Dapper

When Dapper is authorized, it must share the same `DbConnection` as the active `DbContext` to ensure:

- The same RLS `SESSION_CONTEXT` is already set (established by the EF Core interceptor on connection open)
- The same transaction scope is honored for hybrid operations

```csharp
// Correct: reuse DbContext connection — RLS context already set
public async Task<IReadOnlyList<AuthGraphProjection>> GetAuthGraphAsync(Guid tenantId)
{
    var connection = _dbContext.Database.GetDbConnection();
    // Connection already has SESSION_CONTEXT set by EF Core interceptor
    return (await connection.QueryAsync<AuthGraphProjection>(
        "SELECT user_id, role_ids, permission_ids FROM vw_auth_graph WHERE tenant_id = @TenantId",
        new { TenantId = tenantId }
    )).ToList();
}
```

---

## 7. When EF Core Should Be Preferred

Use EF Core in **all** of the following scenarios:

| Scenario | Reason |
|----------|--------|
| Any write operation (INSERT / UPDATE / DELETE) | Preserves Unit of Work, change tracking, and outbox integration |
| Standard CRUD for aggregate roots | Change tracking detects mutations; no manual mapping needed |
| Operations requiring optimistic concurrency | `rowversion` / `[ConcurrencyToken]` managed automatically |
| Queries within the same transaction as a write | Atomic visibility; consistent with Unit of Work |
| Any query where RLS context must be guaranteed | EF Core interceptor ensures `SESSION_CONTEXT` is set |
| New query paths without profiling data | Default choice; optimize only when evidence demands |
| Soft-delete-aware queries | Global query filter applies automatically |
| Audit-column-populated writes | `SaveChangesInterceptor` populates `created_by`, `updated_at`, etc. |

---

## 8. When Dapper Is Allowed

Dapper may be authorized **only** for read-side operations that satisfy the threshold in section 6.2:

| Scenario | Justification |
|----------|--------------|
| Complex reporting queries (cross-context aggregation) | Multi-CTE or window-function SQL impractical with EF Core Linq |
| Authorization graph resolution (hot, compiled projection) | Sub-millisecond latency requirement; heavily denormalized view |
| Compliance export with 100k+ row result sets | Streaming via `QueryUnbufferedAsync`; EF Core materializes everything |
| Hierarchical / recursive CTE queries | EF Core 8 supports `ExecuteSqlRaw`; use that first, Dapper as fallback |
| Read model rebuild for CQRS projections | Bulk read from event store; no domain model needed |

**Dapper is never authorized for:**

- Command handlers or application services that modify state
- Operations within an aggregate transaction
- Queries that produce data fed back into the domain model for further mutation

---

## 9. DDD and Clean Architecture Alignment

### 9.1 Layer Discipline

```
Domain Layer          (zero persistence dependency)
    │
    ▼
Application Layer     (orchestrates use cases, calls IRepository<T>)
    │
    ▼
Infrastructure Layer  (implements IRepository<T> using EF Core or Dapper)
    │
    ├── EF Core Repositories     ← default; all writes; most reads
    └── Dapper Query Services    ← read-only; authorized projections only
```

Domain and Application layers are completely unaware of which persistence technology is used. The port (interface) is the only contract visible to the application.

### 9.2 Aggregate Consistency Rule

The Aggregate Root is the unit of consistency. All mutations must:

1. Go through the domain method on the Aggregate Root
2. Be persisted via the EF Core repository using `SaveChangesAsync`
3. Produce Domain Events harvested by the repository before commit (Outbox integration)

Dapper **must not** be the write path for any data that is part of an aggregate boundary.

### 9.3 Read Model Isolation

CQRS read models are structurally separate from write models. A Dapper query service targeting a read-only view or a denormalized projection table is aligned with CQRS principles — it does not touch aggregate state and does not need change tracking.

```csharp
// Clean separation: read service uses Dapper, write repository uses EF Core
public interface IAuthGraphReadService   // Read side — Dapper allowed
{
    Task<AuthGraphDto> GetByUserAsync(Guid userId, Guid tenantId);
}

public interface IUserRepository          // Write side — EF Core required
{
    Task<User?> FindByIdAsync(Guid id);
    Task SaveAsync(User user);
}
```

---

## 10. Maintainability Considerations

### 10.1 Cognitive Overhead of Dual-ORM Codebases

Mixing EF Core and Dapper across the same bounded context increases:

- Onboarding time for engineers unfamiliar with the boundary
- Risk of inconsistent query behavior (one path respects global filters, the other doesn't)
- Test surface area (two code paths to verify)

Mitigation: Dapper usage is **bounded context-local** and must be isolated in dedicated `*QueryService` classes within the Infrastructure layer.

### 10.2 SQL Maintainability

Dapper SQL strings are not refactoring-safe. Mandatory practices when Dapper is used:

```csharp
// Mandatory: use file-embedded SQL or constants — never inline magic strings
public static class AuthGraphQueries
{
    public const string GetByUser = """
        SELECT
            u.id            AS UserId,
            r.id            AS RoleId,
            r.name          AS RoleName,
            p.code          AS PermissionCode
        FROM ums.users u
        INNER JOIN ums.user_roles ur ON ur.user_id = u.id
        INNER JOIN ums.roles r       ON r.id = ur.role_id
        INNER JOIN ums.role_permissions rp ON rp.role_id = r.id
        INNER JOIN ums.permissions p ON p.id = rp.permission_id
        WHERE u.id = @UserId
          AND u.tenant_id = @TenantId
          AND u.is_deleted = FALSE
        """;
}
```

### 10.3 Schema Migration Ownership

EF Core Migrations are the single source of truth for the database schema. Dapper SQL must never contain DDL or assume schema structures not tracked in Migrations. Any view or function used by Dapper must be created via a Migration.

---

## 11. Anti-Patterns to Avoid

| Anti-Pattern | Risk | Rule |
|-------------|------|------|
| Dapper for command (write) operations | Bypasses Unit of Work, outbox, RLS interceptor | **Forbidden** |
| Inline SQL strings in handler/service classes | Unmaintainable, no single source of truth | **Forbidden** |
| Opening a new `DbConnection` in a Dapper query instead of reusing `DbContext`'s | Breaks RLS session context; separate connection pool entry | **Forbidden** |
| Switching to Dapper without profiling evidence | Premature optimization; adds complexity without benefit | **Forbidden** |
| Mixing Dapper and EF Core writes in the same transaction without shared connection | Inconsistent transaction scope | **Forbidden** |
| Using Dapper results as domain entities for further mutation | Bypasses aggregate invariant enforcement | **Forbidden** |
| EF Core `Database.ExecuteSqlRaw` for writes in application layer | Bypasses change tracking and interceptors | **Forbidden** |
| `context.SaveChanges()` (synchronous) in async code path | Blocks thread pool; breaks async pattern | **Forbidden** |

---

## 12. Recommended Implementation Guidelines

### 12.1 Repository Pattern (EF Core)

```csharp
// infrastructure/persistence/repositories/UserRepository.cs
public sealed class UserRepository : IUserRepository
{
    private readonly AppDbContext _ctx;

    public UserRepository(AppDbContext ctx) => _ctx = ctx;

    public async Task<User?> FindByIdAsync(Guid id, CancellationToken ct = default)
    {
        // AsNoTracking NOT used here — we may mutate and save
        return await _ctx.Users
            .Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.Id == id, ct);
    }

    public async Task SaveAsync(User user, CancellationToken ct = default)
    {
        _ctx.Users.Update(user);
        // SaveChangesAsync triggers:
        //   1. RLS interceptor (SESSION_CONTEXT already set on connection)
        //   2. Audit interceptor (populates updated_at, updated_by)
        //   3. Outbox interceptor (writes domain events to outbox_events)
        await _ctx.SaveChangesAsync(ct);
    }
}
```

### 12.2 Dapper Query Service (Read Side)

```csharp
// infrastructure/persistence/queries/AuthGraphQueryService.cs
public sealed class AuthGraphQueryService : IAuthGraphReadService
{
    private readonly AppDbContext _ctx;

    public AuthGraphQueryService(AppDbContext ctx) => _ctx = ctx;

    public async Task<AuthGraphDto?> GetByUserAsync(Guid userId, Guid tenantId, CancellationToken ct = default)
    {
        // Reuse EF Core's connection — RLS SESSION_CONTEXT already set by interceptor
        var conn = _ctx.Database.GetDbConnection();
        if (conn.State != ConnectionState.Open)
            await conn.OpenAsync(ct);

        var rows = await conn.QueryAsync<AuthGraphRow>(
            AuthGraphQueries.GetByUser,
            new { UserId = userId, TenantId = tenantId }
        );

        return rows.Any()
            ? AuthGraphMapper.Map(rows)
            : null;
    }
}
```

### 12.3 DI Registration

```csharp
// infrastructure/DependencyInjection.cs
services.AddScoped<IUserRepository, UserRepository>();          // EF Core — writes
services.AddScoped<IAuthGraphReadService, AuthGraphQueryService>(); // Dapper — reads
```

### 12.4 Dapper Authorization Record

When Dapper is introduced for a new query, the engineer must add an entry to the bounded context's `DataAccessDecisions.md`:

```markdown
<!-- DA-001 — Auth Graph Projection (Dapper) -->
- **Date**: 2026-05-15
- **Author**: @engineer
- **Query**: `GetByUserAsync` in `AuthGraphQueryService`
- **EF Core Attempt**: Implemented with `AsNoTracking` + `Select` projection
- **Profiling Result**: 340 ms p95 on 500k-row dataset; EF Core generated 4 N+1 queries
- **Justification**: Recursive role hierarchy join requires recursive CTE; EF Core Linq cannot express it
- **Approved By**: @architect
```

---

## 13. Benefits

| Benefit | Description |
|---------|-------------|
| **Single default** | All engineers know EF Core is the starting point; no decision fatigue |
| **Infrastructure consistency** | RLS, outbox, audit interceptors apply uniformly to all write paths |
| **Aggregate safety** | EF Core change tracking enforces that mutations go through aggregate methods |
| **Schema single source** | EF Core Migrations own the schema; Dapper queries never drift from it |
| **Optimized reads on evidence** | Dapper is available when genuinely needed — not forbidden |
| **DDD alignment** | Read/write separation supports CQRS without over-engineering read paths |

---

## 14. Trade-offs

| Trade-off | Mitigation |
|-----------|-----------|
| EF Core can generate suboptimal SQL for complex joins | `AsNoTracking` + `Select` projections resolve most cases; Dapper as escape hatch |
| Dapper requires manual SQL maintenance | SQL constants in dedicated files; migration-managed schema |
| Two mental models for data access | Strict naming convention (`*Repository` = EF Core, `*QueryService` = Dapper) |
| Dapper bypasses global query filters (soft-delete, RLS) | Dapper queries must explicitly include `WHERE is_deleted = FALSE AND tenant_id = @TenantId` |

---

## 15. Consequences

### Positive
- Unified, predictable data access model with a clear escalation path
- Domain events, audit trail, and RLS enforced on 100% of write operations
- Teams spend less time debating ORM choice and more time on domain logic
- Integration tests are simpler — one ORM path to verify for writes

### Negative
- Engineers must learn the authorization threshold for Dapper and document usage
- Dapper SQL bypassing global filters creates a correctness risk if the guideline is not followed (mitigated by code review and `DataAccessDecisions.md` process)
- In repositories where EF Core is clearly the bottleneck, the profiling step adds time before Dapper can be used

---

## 16. Alternatives Considered

| Alternative | Decision | Reason Rejected |
|-------------|----------|----------------|
| Dapper everywhere | Rejected | No change tracking; must reimplement Unit of Work, audit, outbox, RLS manually |
| EF Core exclusively (no Dapper) | Rejected | Impractical for complex reporting queries; EF Core Linq cannot express all SQL constructs |
| RepoDb as unified ORM | Rejected | Smaller ecosystem, less mature than EF Core; adds a third dependency |
| NHibernate | Rejected | Legacy technology; community and tooling investment declining in .NET ecosystem |
| ADO.NET directly | Rejected | Lowest abstraction; appropriate for drivers but not for domain-aligned persistence |
| Marten (event store + document DB) | Deferred | Valid for event-sourced contexts; evaluate when full event sourcing is adopted |

---

## 17. Review

Evaluate in **Q4 2026** whether:
- The Dapper authorization threshold (200 ms p95) requires adjustment based on production data
- EF Core 9/10 improvements (e.g., native complex type support, JSON column mapping) eliminate any active Dapper justifications
- Marten should be formally adopted for event-sourced bounded contexts

---

[Back to .NET Index](./README.md) | [Back to ADR Navigator](../README.md)

## Objective and Scope

Historical backfill: Address the architectural tension where context is unavailable, establishing a standard boundary.

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

None explicitly linked.

## Technology Watch (Trends, Maturity, Adoption, Support)

EF Core and Dapper are both mature, mainstream data access technologies in .NET. EF Core (Microsoft-maintained) is the primary ORM with strong LTS alignment and ecosystem integration. Dapper (community-maintained, Stack Overflow origin) provides lightweight, high-performance data access for optimized reads. The dual-strategy (EF Core + Dapper) is a well-documented pattern in the .NET community. Expected vigencia: 5+ years for both libraries; the dual-strategy pattern is durable.

## Current Sources

- EF Core documentation — https://learn.microsoft.com/en-us/ef/core, consulted 2026-06-20.
- Dapper GitHub repository — https://github.com/DapperLib/Dapper, consulted 2026-06-20.
- NuGet download statistics — https://www.nuget.org/packages/Microsoft.EntityFrameworkCore, consulted 2026-06-20.
