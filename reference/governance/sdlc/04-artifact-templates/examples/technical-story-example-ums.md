# Technical Story: Implement Tenant Role Assignment Use Case

> ID: TS-014
> Status: Done
> Parent Functional Story: FS-02 Assign Tenant-Scoped Role
> Bounded Context: Identity and Access Governance
> Owner: UMS Engineering Team

---

## 1. Technical Objective

Implement the application use case that assigns an approved tenant-scoped role to a user after validating tenant boundary, role status, user status, and audit requirements.

---

## 2. Implementation Scope

| Area | Change |
|---|---|
| Domain | Add role assignment aggregate behavior and validation rules |
| Application | Add `AssignTenantRoleUseCase` |
| Infrastructure | Persist assignment and audit event in the same transaction boundary |
| API | Add role assignment endpoint for tenant administrators |
| Tests | Add unit, integration, and authorization tests |
| Documentation | Link implementation to ADR-UMS-001 and FS-02 |

---

## 3. Technical Acceptance Criteria

- [x] Same-tenant role assignment succeeds.
- [x] Different-tenant role assignment is rejected.
- [x] Suspended users cannot receive assignments.
- [x] Every attempt is auditable.

---

## 4. Definition of Done

- [x] Code implemented and reviewed.
- [x] Tests updated.
- [x] CI passing.
- [x] Documentation delta completed.
- [x] Observability impact reviewed.

---

## 5. Traceability

| Item | Link / Notes |
|---|---|
| Functional Story | FS-02 Assign Tenant-Scoped Role |
| Governing ADRs | ADR-UMS-001 |
| Pull Request | PR-142 |
| Test evidence | CI run and Test Summary Report |
