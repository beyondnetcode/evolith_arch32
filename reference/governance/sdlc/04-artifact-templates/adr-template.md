# Template: Architectural Decision Record (ADR)

> **Bilingual navigation:** [Versión en Español](./adr-template.es.md)
> **Phase:** 2 — Design and Architecture (and throughout construction)
> **Exit gate:** Design Baseline Approved (initial ADRs); Successful Build (runtime ADRs)
> **Parent:** [Artifact Templates](./README.md)

---

## About This Template

An ADR captures a single architectural decision: the context that forced the decision, the options considered, the choice made, and the consequences that follow. ADRs are immutable once approved — they are never updated in place. A superseded decision requires a new ADR that references the old one.

Every ADR in Evolith must be registered in the [ADR Registry](../../../architecture/adrs/README.md) and cross-linked in the [ADR Decision Matrix](../../../architecture/adrs/adr-matrix.md) before the Design Baseline gate fires.

---

## Section 1 — Blank Template

### Source — Copy and paste

```markdown
# ADR-[NUMBER]: [Short Decision Title]

> Status: [Proposed | Accepted | Deprecated | Superseded by ADR-XXXX]
> Date: [YYYY-MM-DD]
> Deciders: [Architecture Board / Tech Lead / relevant team]
> Reviewed by: [Names or roles]
> Runtime: [Core (agnostic) | Node.js | .NET | Android | All]

---

## Context

[Describe the situation that forces a decision to be made.
Include the forces at play: technical, business, team, regulatory.
Do not yet mention the decision itself.
3–6 sentences is the right length. Longer context belongs in a design doc, not here.]

---

## Decision Drivers

- [Driver 1: e.g. We need to support multiple tenants with data isolation guarantees]
- [Driver 2: e.g. The domain layer must remain free of infrastructure imports]
- [Driver 3: e.g. The solution must be testable without a running database]

---

## Considered Options

| Option | Summary | Pros | Cons |
|---|---|---|---|
| **Option A** | [Brief description] | [Key advantage] | [Key drawback] |
| **Option B** | [Brief description] | [Key advantage] | [Key drawback] |
| **Option C** | [Brief description] | [Key advantage] | [Key drawback] |

---

## Decision

**We choose Option [X].**

[State the decision clearly in one sentence.
Then explain the reasoning in 2–4 sentences.
Reference other ADRs if this decision depends on or constrains them.]

---

## Consequences

### Positive

- [Benefit 1]
- [Benefit 2]

### Negative

- [Accepted trade-off 1]
- [Accepted trade-off 2]

### Risks

- [Risk 1 and mitigation approach]

---

## Implementation Notes

[Optional: If the decision requires a specific implementation pattern,
describe the key constraint here. Reference a Canonical Pattern if one exists.]

---

## Links

- Supersedes: [ADR-XXXX — Title, if applicable]
- Superseded by: [ADR-XXXX — Title, if applicable]
- Related: [ADR-XXXX — Title]
- Canonical Pattern: [Link to canonical-patterns/ if one exists]
- External reference: [Link to relevant RFC, paper, or standard]
```

---

### Preview

# ADR-[NUMBER]: [Short Decision Title]

> Status: [Proposed | Accepted | Deprecated | Superseded by ADR-XXXX]
> Date: [YYYY-MM-DD]
> Deciders: [Architecture Board / Tech Lead / relevant team]
> Reviewed by: [Names or roles]
> Runtime: [Core (agnostic) | Node.js | .NET | Android | All]

---

## Context

[Describe the situation that forces a decision to be made.
Include the forces at play: technical, business, team, regulatory.
Do not yet mention the decision itself.
3–6 sentences is the right length. Longer context belongs in a design doc, not here.]

---

## Decision Drivers

- [Driver 1: e.g. We need to support multiple tenants with data isolation guarantees]
- [Driver 2: e.g. The domain layer must remain free of infrastructure imports]
- [Driver 3: e.g. The solution must be testable without a running database]

---

## Considered Options

| Option | Summary | Pros | Cons |
|---|---|---|---|
| **Option A** | [Brief description] | [Key advantage] | [Key drawback] |
| **Option B** | [Brief description] | [Key advantage] | [Key drawback] |
| **Option C** | [Brief description] | [Key advantage] | [Key drawback] |

---

## Decision

**We choose Option [X].**

[State the decision clearly in one sentence.
Then explain the reasoning in 2–4 sentences.
Reference other ADRs if this decision depends on or constrains them.]

---

## Consequences

### Positive

- [Benefit 1]
- [Benefit 2]

### Negative

- [Accepted trade-off 1]
- [Accepted trade-off 2]

### Risks

- [Risk 1 and mitigation approach]

---

## Implementation Notes

[Optional: If the decision requires a specific implementation pattern,
describe the key constraint here. Reference a Canonical Pattern if one exists.]

---

## Links

- Supersedes: [ADR-XXXX — Title, if applicable]
- Superseded by: [ADR-XXXX — Title, if applicable]
- Related: [ADR-XXXX — Title]
- Canonical Pattern: [Link to canonical-patterns/ if one exists]
- External reference: [Link to relevant RFC, paper, or standard]

---

## Section 2 — Worked Example

The following is a complete ADR example in the style and depth expected by the Architecture Board.

### Source — Copy and paste

````markdown
# ADR-0010: Multi-Tenancy Dual-Layer Security Strategy

> Status: Accepted
> Date: 2025-11-04
> Deciders: Evolith Architecture Board
> Reviewed by: Security Engineering, DBA, Tech Lead
> Runtime: Core (agnostic)

---

## Context

UMS must serve multiple independent organizations (tenants) from a single
database instance. Rows belonging to Tenant A must never be visible to a query
executing in the context of Tenant B, regardless of whether the application
layer enforces this correctly. A single-layer approach that relies exclusively
on application-level filtering introduces an unacceptable blast radius: a single
bug in a query builder, an ORM misconfiguration, or a raw SQL escape could silently
expose cross-tenant data. The solution must be verifiable, defense-in-depth, and
compatible with connection pooling.

---

## Decision Drivers

- Cross-tenant data exposure must be impossible even if the application layer has a bug.
- The domain layer must not contain SQL-level security predicates.
- The solution must be testable with Testcontainers (no live SQL Server required for unit tests).
- Connection pooling must remain viable at scale (SESSION_CONTEXT must not leak across connections).

---

## Considered Options

| Option | Summary | Pros | Cons |
|---|---|---|---|
| **Option A — App-only filter** | EF Core global query filter appends `WHERE root_tenant_id = @tid` to every query | Simple, testable, no DB objects | Single point of failure — one missing `Include` or raw query bypasses it |
| **Option B — DB-only RLS** | SQL Server native Row-Level Security predicate on every table | Enforced at engine level, impossible to bypass from app code | Requires DDL on every table, complicates Testcontainers setup, harder to debug |
| **Option C — Dual layer (App + DB)** | Layer 1: EF Core global query filter (primary); Layer 2: SQL Server RLS predicate (failsafe) | Defense-in-depth, neither layer alone is a single point of failure | More moving parts, SESSION_CONTEXT cleanup required on connection return |

---

## Decision

**We choose Option C — Dual Layer.**

The application layer (EF Core global query filter via `DbConnectionInterceptor`)
is the primary enforcement mechanism because it is testable and debuggable.
The SQL Server RLS predicate (`fn_SecurityPredicate`) acts as a failsafe:
if a raw query or future code change bypasses the EF Core filter, the database
engine silently filters out cross-tenant rows before they leave SQL Server.
The `SESSION_CONTEXT` is set at connection open and cleared at connection return
to ensure safe behavior under connection pool reuse.

---

## Consequences

### Positive

- Cross-tenant data cannot be exposed even if a future developer writes a raw SQL query.
- The EF Core layer is fully testable with NSubstitute and in-memory providers.
- The dual-layer approach satisfies ISO/IEC 27001:2022 A.8 data access controls.

### Negative

- Every new table requires both a composite PK (`id`, `root_tenant_id`) and a matching RLS predicate.
- SESSION_CONTEXT cleanup must be implemented in `DbConnectionInterceptor.ConnectionClosingAsync`.
- Debugging cross-tenant leaks requires checking two independent layers.

### Risks

- Connection pool leaks: if the interceptor throws before clearing SESSION_CONTEXT, the next
  borrower of the connection inherits the wrong tenant context. Mitigation: Polly retry policy
  with fallback that explicitly clears SESSION_CONTEXT before re-throwing.

---

## Implementation Notes

The `DbConnectionInterceptor` must call:
```sql
EXEC sp_set_session_context @key = N'TenantId', @value = @tenantId, @read_only = 1;
```
on `ConnectionOpenedAsync` and clear it on `ConnectionClosingAsync`.
The RLS predicate function must be created on every schema; a DDL migration
generator is included in TE-03.
See Canonical Pattern: `.NET Multi-Tenancy Dual-Layer`.

---

## Links

- Related: ADR-0044 — Configurable Security Persistence Strategy
- Related: ADR-0031 — Schema-per-Context
- Related: ADR-0054 — Database Design and Normalization Standards
- Canonical Pattern: [.NET Multi-Tenancy Dual-Layer](../../../architecture/canonical-patterns/README.md)
- External reference: [SQL Server Row-Level Security — Microsoft Docs](https://learn.microsoft.com/en-us/sql/relational-databases/security/row-level-security)
````

---

### Preview

# ADR-0010: Multi-Tenancy Dual-Layer Security Strategy

> Status: Accepted
> Date: 2025-11-04
> Deciders: Evolith Architecture Board
> Reviewed by: Security Engineering, DBA, Tech Lead
> Runtime: Core (agnostic)

---

## Context

UMS must serve multiple independent organizations (tenants) from a single
database instance. Rows belonging to Tenant A must never be visible to a query
executing in the context of Tenant B, regardless of whether the application
layer enforces this correctly. A single-layer approach that relies exclusively
on application-level filtering introduces an unacceptable blast radius: a single
bug in a query builder, an ORM misconfiguration, or a raw SQL escape could silently
expose cross-tenant data. The solution must be verifiable, defense-in-depth, and
compatible with connection pooling.

---

## Decision Drivers

- Cross-tenant data exposure must be impossible even if the application layer has a bug.
- The domain layer must not contain SQL-level security predicates.
- The solution must be testable with Testcontainers (no live SQL Server required for unit tests).
- Connection pooling must remain viable at scale (SESSION_CONTEXT must not leak across connections).

---

## Considered Options

| Option | Summary | Pros | Cons |
|---|---|---|---|
| **Option A — App-only filter** | EF Core global query filter appends `WHERE root_tenant_id = @tid` to every query | Simple, testable, no DB objects | Single point of failure — one missing `Include` or raw query bypasses it |
| **Option B — DB-only RLS** | SQL Server native Row-Level Security predicate on every table | Enforced at engine level, impossible to bypass from app code | Requires DDL on every table, complicates Testcontainers setup, harder to debug |
| **Option C — Dual layer (App + DB)** | Layer 1: EF Core global query filter (primary); Layer 2: SQL Server RLS predicate (failsafe) | Defense-in-depth, neither layer alone is a single point of failure | More moving parts, SESSION_CONTEXT cleanup required on connection return |

---

## Decision

**We choose Option C — Dual Layer.**

The application layer (EF Core global query filter via `DbConnectionInterceptor`)
is the primary enforcement mechanism because it is testable and debuggable.
The SQL Server RLS predicate (`fn_SecurityPredicate`) acts as a failsafe:
if a raw query or future code change bypasses the EF Core filter, the database
engine silently filters out cross-tenant rows before they leave SQL Server.
The `SESSION_CONTEXT` is set at connection open and cleared at connection return
to ensure safe behavior under connection pool reuse.

---

## Consequences

### Positive

- Cross-tenant data cannot be exposed even if a future developer writes a raw SQL query.
- The EF Core layer is fully testable with NSubstitute and in-memory providers.
- The dual-layer approach satisfies ISO/IEC 27001:2022 A.8 data access controls.

### Negative

- Every new table requires both a composite PK (`id`, `root_tenant_id`) and a matching RLS predicate.
- SESSION_CONTEXT cleanup must be implemented in `DbConnectionInterceptor.ConnectionClosingAsync`.
- Debugging cross-tenant leaks requires checking two independent layers.

### Risks

- Connection pool leaks: if the interceptor throws before clearing SESSION_CONTEXT, the next
  borrower of the connection inherits the wrong tenant context. Mitigation: Polly retry policy
  with fallback that explicitly clears SESSION_CONTEXT before re-throwing.

---

## Implementation Notes

The `DbConnectionInterceptor` must call:

```sql
EXEC sp_set_session_context @key = N'TenantId', @value = @tenantId, @read_only = 1;
```

on `ConnectionOpenedAsync` and clear it on `ConnectionClosingAsync`.
The RLS predicate function must be created on every schema; a DDL migration
generator is included in TE-03.
See Canonical Pattern: `.NET Multi-Tenancy Dual-Layer`.

---

## Links

- Related: ADR-0044 — Configurable Security Persistence Strategy
- Related: ADR-0031 — Schema-per-Context
- Related: ADR-0054 — Database Design and Normalization Standards
- Canonical Pattern: [.NET Multi-Tenancy Dual-Layer](../../../architecture/canonical-patterns/README.md)
- External reference: [SQL Server Row-Level Security — Microsoft Docs](https://learn.microsoft.com/en-us/sql/relational-databases/security/row-level-security)

---

[Back to Artifact Templates](./README.md)
