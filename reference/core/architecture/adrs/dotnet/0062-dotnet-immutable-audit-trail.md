# [ADR 0062](0062-dotnet-immutable-audit-trail.md): .NET Immutable Audit Trail via DDL Triggers & Delta Capture

## 1. Status
**Status**: Accepted
**Ratified**: 2026-07-19 by repository owner, formalizing enforcement already active via the generated ruleset `adr-dotnet-0062-net-immutable-audit-trail-via-ddl-triggers-delta-capture.rules.json`.
**Date**: 2026-05-23
**Scope**: Technology Stack - .NET Security Compliance

---

## 2. Context
Corporate compliance frameworks mandate that security and transactional audit trails remain strictly immutable — once written, records must never be modified or deleted, not even by administrators or automated background operations. Application-only checks are insufficient to block accidental overrides or malicious database tampering. We need an enforcement pattern that combines database-level immutability with application-layer delta generation.

---

## 3. Decision
We adopt a **DDL Trigger and Delta Serialization** strategy to enforce audit trail immutability:

### A. Database-Level Blockers (DDL Triggers)
All audit tables in SQL Server are bound to DDL triggers that immediately reject any `UPDATE` or `DELETE` statements:
```sql
CREATE OR ALTER TRIGGER trg_security_events_immutable
ON ums_audit.security_events
AFTER UPDATE, DELETE
AS
BEGIN
    RAISERROR ('Audit log is immutable. UPDATE and DELETE are prohibited.', 16, 1);
    ROLLBACK TRANSACTION;
END;
```

### B. Application-Layer State Delta Generation
Command handlers snapshot the state before and after execution using a structured `DeltaCapture` serializer to record change history inside audit payloads:
```csharp
public static class DeltaCapture
{
    public static AuditDelta Capture<T>(T before, T after, string actorId) where T : class
    {
        var beforeJson = JsonSerializer.Serialize(before, DefaultOptions);
        var afterJson = JsonSerializer.Serialize(after, DefaultOptions);
        return new AuditDelta(beforeJson, afterJson, actorId, DateTimeOffset.UtcNow, beforeJson != afterJson);
    }
}
```

---

## 4. Consequences

### Positive
- **Compliance Enforcement**: Immutability is physically guaranteed at the database engine level, preventing any application-layer bugs from silently overwriting logs.
- **Fidelity**: Complete snapshots record exact changes, allowing point-in-time state reconstruction.

### Negative
- **GDPR Operations**: Hard-deletes for data privacy require out-of-band maintenance scripts executing under dedicated bypassing privileges.

---

## 5. Review
Audit the coverage of immutable triggers on all transactional log tables in the yearly security review.







## Objective and Scope

Historical backfill: Address the architectural tension where context is unavailable, establishing a standard boundary.

## Options Considered

- **Selected:** .NET Immutable Audit Trail via DDL Triggers & Delta Capture
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

None explicitly linked.

## Technology Watch (Trends, Maturity, Adoption, Support)

Immutable audit trail patterns using DDL triggers and delta capture are mature and extensively documented in enterprise data architecture. SQL Server provides mature change tracking and temporal table features that support immutable audit requirements. The pattern addresses SOX, GDPR, and other compliance requirements that mandate immutable audit logs. Expected vigencia: 5+ years; the immutable audit requirement is permanent while specific implementation technology evolves.

## Current Sources

- SQL Server temporal tables documentation — https://learn.microsoft.com/en-us/sql/relational-databases/tables/temporal-tables, consulted 2026-06-20.
- OWASP audit logging guidelines — https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html, consulted 2026-06-20.

---
[Back to Index](./README.md)
