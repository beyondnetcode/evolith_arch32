# Template: Functional Story

> **Bilingual navigation:** [Versión en Español](./functional-story-template.es.md)
> **Phase:** 2 — Design and Architecture
> **Exit gate:** Design Baseline Approved
> **Parent:** [Artifact Templates](./README.md)
> **Normative standard:** [Functional Story Writing Standard](../03-documentation/functional-story-writing-standard.md)

---

## About This Template

A Functional Story describes a discrete business capability. It is written so that a Product Owner can validate the business behavior, and an engineer can implement it without ambiguity. The two concerns are separated: business narrative first, technical constraints last.

The structure below is mandated by the [Functional Story Writing Standard](../03-documentation/functional-story-writing-standard.md). Do not remove or reorder sections.

---

## Section 1 — Blank Template

```markdown
# FS-[NUMBER]: [Functional Story Title]

> Status: [Draft | Reviewed | Approved | Implemented | Deprecated]
> Epic: [EP-XX — Epic Name]
> Phase: [MVP | Post-MVP]
> Owner: [Product Owner]
> Reviewed by: [Tech Lead / Architect]
> Date: [YYYY-MM-DD]

---

## 1. Business Purpose

[What business problem does this story solve and why does it matter?
Write for a Product Owner. No technical terms.]

---

## 2. Actors

| Actor | Role |
|---|---|
| **[Primary actor]** | [Their business responsibility in this story] |
| **[Secondary actor]** | [Supporting role, if any] |
| **System** | [What the system does autonomously, if applicable] |

---

## 3. Business Preconditions

- [Condition 1: The actor must already exist in the system]
- [Condition 2: The relevant configuration must be active]

---

## 4. Main Functional Flow

1. [Step 1: Actor initiates action — describe in business language]
2. [Step 2: System validates or processes]
3. [Step 3: System responds to the actor]
4. [Step 4: State is updated and outcome is visible]

---

## 5. Alternative Flows and Exceptions

| Scenario | Trigger | Business Outcome |
|---|---|---|
| [Alt-01] | [What triggers this alternative] | [What the actor experiences] |
| [Exc-01] | [What error condition occurs] | [How the system informs the actor] |

---

## 6. Business Rules

- BR-01: [Rule in plain language — e.g. "A user may not hold two conflicting roles simultaneously."]
- BR-02: [Rule in plain language]

---

## 7. Acceptance Criteria

- AC-01: [Observable outcome 1 — e.g. "The administrator can see the new user in the tenant user list."]
- AC-02: [Observable outcome 2]
- AC-03: [Edge case — e.g. "If the email is already registered, the user is informed without creating a duplicate."]

---

## 8. Technical Requirements

> This section is for engineering. Product Owners and Business Analysts
> do not need to read past this point.

### API / Endpoints

| Method | Path | Description |
|---|---|---|
| [HTTP method] | [/path] | [What it does] |

### Entities and Tables

| Entity | Table | Key Columns |
|---|---|---|
| [EntityName] | [schema.table_name] | [id, root_tenant_id, relevant columns] |

### Security Controls

- Authentication: [Required / Optional — token type]
- Authorization: [Required permission or role]
- Multi-tenancy: [SESSION_CONTEXT set before query execution]
- Audit: [Audit event name and trigger]

### Cache Behavior

- [Cache key pattern if applicable]
- [Invalidation trigger]

### Events

| Event | Published When | Consumer(s) |
|---|---|---|
| [EventName] | [Trigger condition] | [Consuming contexts] |

---

## 9. Traceability

| Reference Type | ID / Link |
|---|---|
| Governing ADRs | [ADR-XXXX, ADR-YYYY] |
| Bounded Context | [EP-XX — Context name] |
| Technical Enablers | [TE-XX — Enabler name] |
| Technical Stories | [TS-XXX through TS-XXX] |
| Parent PRD | [PRD: Product Name — link] |
```

---

## Section 2 — Worked Example

The following is a complete Functional Story based on UMS FS-01.

---

```markdown
# FS-01: User Registration and Identity Lifecycle

> Status: Approved
> Epic: EP-01 — Identity
> Phase: MVP
> Owner: Evolith Product Board
> Reviewed by: UMS Tech Lead, Architecture Board
> Date: 2026-01-20

---

## 1. Business Purpose

The organization needs to create, activate, suspend, and permanently remove
user accounts in a governed and auditable way. Without this capability, there
is no reliable record of who has access to what, nor a mechanism to revoke
access when a user leaves or changes responsibilities.

---

## 2. Actors

| Actor | Role |
|---|---|
| **Tenant Administrator** | Creates and manages users within their organization |
| **System Administrator** | Manages global user policies and cross-tenant operations |
| **System** | Enforces policies, triggers events, writes audit records automatically |

---

## 3. Business Preconditions

- The tenant organization must already exist in the system.
- The Tenant Administrator must be authenticated and hold an active administrative role.

---

## 4. Main Functional Flow

1. The Tenant Administrator provides the new user's name, email address, and initial role.
2. The system verifies the email is not already registered within the same organization.
3. The system creates the user account in a Pending state and sends an activation invitation.
4. The new user activates their account by accepting the invitation and setting credentials.
5. The system marks the user as Active and the Tenant Administrator sees the user in the organization directory.

---

## 5. Alternative Flows and Exceptions

| Scenario | Trigger | Business Outcome |
|---|---|---|
| Alt-01: Duplicate email | Email already exists in this tenant | User is informed the address is already registered; no duplicate is created |
| Alt-02: Invitation expiry | Invitation not accepted within 72 hours | Invitation expires; Administrator can re-send from the user management panel |
| Exc-01: Missing required field | Name or email not provided | The form highlights missing fields; submission is blocked |
| Exc-02: Invalid email format | Email does not conform to RFC 5322 | The administrator is informed the email format is invalid |

---

## 6. Business Rules

- BR-01: Each email address must be unique within a single organization.
- BR-02: A newly created user has no permissions until a role is explicitly assigned by an administrator.
- BR-03: A Suspended user cannot authenticate, but their account data and audit history are preserved.
- BR-04: A Deleted user's account is soft-deleted; their audit history is retained indefinitely for compliance.

---

## 7. Acceptance Criteria

- AC-01: A Tenant Administrator can create a new user by providing a name and email; the user appears in the tenant directory with status "Pending".
- AC-02: After accepting the invitation, the user's status changes to "Active" and they can authenticate.
- AC-03: If the email is already registered in the same tenant, the system informs the administrator without creating a duplicate.
- AC-04: A Suspended user cannot log in and receives an informative message when they attempt to do so.
- AC-05: Every lifecycle event (create, activate, suspend, delete) is visible in the audit history for that user.

---

## 8. Technical Requirements

### API / Endpoints

| Method | Path | Description |
|---|---|---|
| POST | /api/v1/users | Create user (command — REST, ADR-0032) |
| PATCH | /api/v1/users/{id}/status | Change user lifecycle status |
| GET | /api/v1/users/{id} | Read user profile |
| DELETE | /api/v1/users/{id} | Soft-delete user |
| GraphQL Query | users(tenantId, filters) | List users with filtering (read projection, ADR-0034) |

### Entities and Tables

| Entity | Table | Key Columns |
|---|---|---|
| User | identity.users | id, root_tenant_id, email, display_name, status, created_at, created_by, tenant_id |
| UserInvitation | identity.user_invitations | id, root_tenant_id, user_id, token_hash, expires_at, status |

Composite PK (id, root_tenant_id) on all tables — ADR-0010, ADR-0054.

### Security Controls

- Authentication: Bearer JWT required (ADR-0020). Claims must include tenant_id and sub.
- Authorization: `identity:users:write` permission required for create/update/delete operations.
- Multi-tenancy: SESSION_CONTEXT set to tenant_id before every query execution (ADR-0010 TE-03).
- Audit: `UserCreated`, `UserActivated`, `UserSuspended`, `UserDeleted` events written to audit.domain_events (ADR-0016).

### Cache Behavior

- User profile cached in Redis with key `user:{tenant_id}:{user_id}` and TTL of 300 seconds.
- Cache invalidated on any status change or profile update.

### Events

| Event | Published When | Consumer(s) |
|---|---|---|
| UserCreated | User record persisted | EP-04 Audit, EP-02 Authorization (graph pre-warm) |
| UserActivated | Invitation accepted | EP-04 Audit, EP-06 Approvals (if MFA enrollment required) |
| UserSuspended | Status set to Suspended | EP-04 Audit, EP-02 Authorization (permission graph eviction) |

---

## 9. Traceability

| Reference Type | ID / Link |
|---|---|
| Governing ADRs | ADR-0010, ADR-0016, ADR-0020, ADR-0026, ADR-0031, ADR-0032, ADR-0034, ADR-0054 |
| Bounded Context | EP-01 — Identity |
| Technical Enablers | TE-01 (JWT/OIDC Flow), TE-03 (Tenant Provisioning + RLS), TE-04 (Transactional Outbox) |
| Technical Stories | TS-001 through TS-007 |
| Parent PRD | PRD: User Management System (UMS) — MVP |
```

---

[Back to Artifact Templates](./README.md)
