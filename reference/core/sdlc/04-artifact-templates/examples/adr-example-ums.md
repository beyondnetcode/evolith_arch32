# ADR-UMS-001: Tenant-Aware Authorization Boundary

> Status: Accepted
> Date: 2026-01-15
> Owner: Evolith Architecture Board
> Related phase: Design and Architecture
> Related artifacts: UMS PRD, FS-01, FS-02

---

## 1. Context

UMS must centralize authorization while preserving tenant isolation. The product needs to support system-level administration, tenant-level administration, and user-level access without allowing cross-tenant privilege leakage.

---

## 2. Decision Drivers

- Prevent cross-tenant access escalation.
- Keep authorization logic auditable and testable.
- Align UMS with Evolith multi-tenancy and security standards.

---

## 3. Options Considered

| Option | Summary | Pros | Cons |
|---|---|---|---|
| Application-only tenant filtering | Filter tenant access in application services | Simple implementation | High risk of missed checks |
| Database row-level isolation | Enforce tenant boundary at persistence layer | Strong isolation | Requires disciplined schema and test strategy |
| External policy engine only | Delegate all decisions externally | Centralized policy | Higher operational dependency |

---

## 4. Decision

UMS will apply tenant-aware authorization at the application boundary and persist data using tenant-isolated rules, with explicit tests proving that cross-tenant access is blocked.

---

## 5. Consequences

### Positive

- Tenant isolation becomes testable and auditable.
- Authorization decisions are traceable to role and tenant scope.

### Trade-offs

- More test cases are required for every authorization path.
- Persistence and application layers must stay aligned.

---

## 6. Compliance and Traceability

| Item | Link / Notes |
|---|---|
| Parent PRD | UMS MVP PRD |
| Functional Stories | FS-01 Manage tenant users, FS-02 Assign tenant roles |
| Affected bounded context | Identity and Access Governance |
| Related Evolith ADRs | ADR-0010 Multi-Tenancy, ADR-0056 Naming and Design Conventions |
