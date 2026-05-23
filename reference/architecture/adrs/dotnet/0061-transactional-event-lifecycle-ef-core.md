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

---
[Back to Index](./README.md)
