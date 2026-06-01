# Functional Story: Assign Tenant-Scoped Role

> ID: FS-02
> Status: Approved
> Parent PRD: UMS MVP PRD
> Bounded Context: Identity and Access Governance
> Owner: Evolith Product Board

---

## 1. Business Outcome

A tenant administrator can assign an approved role to a user within the same tenant so access can be governed without manual database or support-team intervention.

---

## 2. Actors

| Actor | Goal | Notes |
|---|---|---|
| Tenant Administrator | Assign a role to a tenant user | Must only affect users in the same tenant |
| User | Receive access based on assigned role | Access must be auditable |
| Compliance Officer | Review assignment history | Needs immutable audit evidence |

---

## 3. Main Flow

1. Tenant Administrator selects a user within the tenant.
2. Tenant Administrator selects an approved role.
3. UMS validates tenant scope and assignment policy.
4. UMS assigns the role and records an audit event.
5. User permissions become effective according to policy.

---

## 4. Business Rules

| Rule ID | Rule |
|---|---|
| BR-01 | A tenant administrator cannot assign roles outside their tenant. |
| BR-02 | Every role assignment must produce an immutable audit event. |
| BR-03 | Suspended users cannot receive new role assignments. |

---

## 5. Acceptance Criteria

- [x] Role assignment succeeds when user, admin, and role belong to the same tenant.
- [x] Cross-tenant role assignment is rejected.
- [x] Audit event is created for every assignment attempt.

---

## 6. Traceability

| Item | Link / Notes |
|---|---|
| PRD | UMS MVP PRD |
| Governing ADRs | ADR-UMS-001 Tenant-Aware Authorization Boundary |
| Technical Stories | TS-014 Role assignment use case |
