# [ADR 0060](0060-dotnet-multi-tenancy-dual-layer-strategy.md): .NET Multi-Tenancy Dual-Layer Strategy (EF Core & SQL Server)

## 1. Status
**Status**: Proposed
**Date**: 2026-05-23
**Scope**: Technology Stack - .NET Persistence & Security

---

## 2. Context
The parent corporate baseline (ADR-0010) mandates multi-tenancy isolation using Row-Level Security (RLS) but provides canonical details primarily for PostgreSQL. To implement this baseline reliably in high-compute .NET applications running on Microsoft SQL Server and EF Core, we must define the integration model to prevent data leaks (cross-tenant anomalies) and ensure performance and compliance at scale.

---

## 3. Decision
We adopt a **Dual-Layer Tenant Isolation (Defense in Depth)** strategy for .NET APIs using EF Core and SQL Server:

### A. Primary Layer: EF Core Global Query Filters
All tenant-scoped entity configurations in the DbContext must apply a query filter that limits rows based on the current request's tenant context:
```csharp
modelBuilder.Entity<TenantScopedEntity>()
    .HasQueryFilter(x => !tenantContext.OrganizationId.HasValue || x.TenantId == tenantContext.OrganizationId.Value);
```
- **System Context Bypass**: When `OrganizationId` is null (background tasks, outbox workers), the filter is bypassed.
- **Global Records**: Nullable `TenantId` properties include a fallback to allow global system records (`TenantId == null`) to always remain visible.

### B. Secondary Layer: SQL Server Session Context RLS (Failsafe)
We implement an EF Core `DbConnectionInterceptor` to push the tenant ID into the SQL Server session immediately upon opening a connection:
```csharp
public override async Task ConnectionOpenedAsync(
    DbConnection connection, ConnectionEndEventData eventData, CancellationToken ct = default)
{
    if (_tenantContext.OrganizationId.HasValue)
    {
        using var command = connection.CreateCommand();
        command.CommandText = "EXEC sp_set_session_context @key = N'current_organization_id', @value = @organizationId;";
        var param = command.CreateParameter();
        param.ParameterName = "@organizationId";
        param.Value = _tenantContext.OrganizationId.Value;
        command.Parameters.Add(param);
        await command.ExecuteNonQueryAsync(ct);
    }
    await base.ConnectionOpenedAsync(connection, eventData, ct);
}
```
At the database layer, security policies enforce filters based on `SESSION_CONTEXT(N'current_organization_id')`.

---

## 4. Consequences

### Positive
- **Defense in Depth**: Prevents leaks even if a query explicitly disables global filters via `.IgnoreQueryFilters()`.
- **Developer Safety**: Eliminates the risk of forgetting a manual `WHERE TenantId` clause inside repository classes.

### Negative
- **Interceptor Overhead**: Adds a minor database roundtrip on connection initialization to set the session context.

---

## 5. Review
Evaluate standard performance impacts under high concurrent loads in the next architectural board meeting.







## Objective and Scope

Historical backfill: Address the architectural tension where context is unavailable, establishing a standard boundary.

## Options Considered

- **Selected:** .NET Multi-Tenancy Dual-Layer Strategy (EF Core & SQL Server)
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

None explicitly linked.

## Technology Watch (Trends, Maturity, Adoption, Support)

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Current Sources

Unknown (historical record).

---
[Back to Index](./README.md)
