# [ADR 0061](0061-transactional-event-lifecycle-ef-core.md): Transactional Event Lifecycle in EF Core

## 1. Status
**Status**: Proposed
**Date**: 2026-05-23
**Scope**: Technology Stack - .NET Transactional Reliability

---

## 2. Context
In high-throughput event-driven microservices, ensuring that domain events are persisted and dispatched without silent data loss is critical. The transactional outbox pattern requires that domain events are mapped to outbox entries and saved atomically in the same database transaction as the aggregate state changes. However, many .NET repositories clear aggregate events inside memory *before* saving changes, which introduces silent event loss if database connection dropouts trigger EF Core retries or absolute write failures.

---

## 3. Decision
We standardize a strict **Post-Commit Event Clearing** sequence for all SQL repositories using EF Core:

### A. Sequence Constraints
1. **Map and Track**: The repository maps aggregate domain events to `OutboxMessages` and registers them with the EF DbContext change tracker.
2. **Execute Transaction**: The repository calls `SaveChangesAsync` within a transaction.
3. **Commit Success Stamping**: Only *after* `SaveChangesAsync` successfully completes and returns control, the aggregate's internal event queue can be cleared using `MarkChangesAsCommitted()`.

### B. Pattern Blueprint
```csharp
public async Task<bool> SaveEntitiesAsync(CancellationToken ct = default)
{
    foreach (var aggregate in _trackedAggregates)
    {
        _dbContext.OutboxMessages.AddRange(OutboxMessageFactory.CreateFromAggregate(aggregate));
    }
    
    // Attempt database transaction commit
    await _dbContext.SaveChangesAsync(ct);
    
    // Clear only after database write succeeds
    foreach (var aggregate in _trackedAggregates)
    {
        aggregate.DomainEvents.MarkChangesAsCommitted();
    }
    _trackedAggregates.Clear();
    return true;
}
```

---

## 4. Consequences

### Positive
- **No Event Loss**: Under EF Core's built-in retry loops (e.g. `EnableRetryOnFailure`), transient failures will successfully retry the database write with outbox entries intact.
- **Audit Consistency**: Outbox state is strictly synchronized with real database commits.

### Negative
- **Memory Overhead**: Keeps event payloads in memory slightly longer until the database roundtrip completes.

---

## 5. Review
Conduct automated tests evaluating resilience under simulated network failure injection in continuous integration.







## Objective and Scope

Historical backfill: Address the architectural tension where context is unavailable, establishing a standard boundary.

## Options Considered

- **Selected:** Transactional Event Lifecycle in EF Core
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

None explicitly linked.

## Technology Watch (Trends, Maturity, Adoption, Support)

Transactional event lifecycle management with EF Core is a mature pattern for maintaining data consistency in .NET applications. The outbox pattern has gained mainstream adoption for reliable event publishing. EF Core's transaction and interception capabilities are well-established and production-proven. Expected vigencia: 5+ years for the transactional outbox pattern; specific implementation details evolve with EF Core versions.

## Current Sources

- EF Core transaction documentation — https://learn.microsoft.com/en-us/ef/core/saving/transactions, consulted 2026-06-20.
- Microsoft outbox pattern guidance — https://learn.microsoft.com/en-us/azure/architecture/patterns/outbox, consulted 2026-06-20.

---
[Back to Index](./README.md)
