# PRD — User Management System (UMS)

<p align="right">
  <img src="https://img.shields.io/badge/Evolith%20Core-PRD%20User%20Management%20System-003c6b?style=for-the-badge&logoColor=white" alt="Evolith Core">
  <img src="https://img.shields.io/badge/Version-1.0.0-27ae60?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/Status-Approved-27ae60?style=flat-square" alt="Status">
  <img src="https://img.shields.io/badge/Scope-Functional%20Only-8e44ad?style=flat-square" alt="Functional Only">
</p>

> **Phase:** 1 — Conception and Discovery
> **Document scope:** This PRD describes **functional and business requirements only**. Technical decisions (stack, architecture, integration protocols, infrastructure diagrams) live in architecture artifacts and ADRs, not here.

---

## 1. Metadata

- **Identifier:** `PRD-UMS-001`
- **Product:** User Management System (UMS)
- **Version:** 1.0.0
- **Status:** Approved
- **Author(s):** Evolith Product Board
- **Business Approver:** Evolith Architecture Board
- **Approval Date:** 2026-01-15

## 2. Executive Summary

### 2.1 Problem Statement

Enterprise software frequently lacks a governed, auditable, tenant-aware approach for user identity, authorization, and access control. Permissions are scattered across applications, audit trails are incomplete, and role management is manual. Without a centralized identity layer, each product implements its own solution, generating duplication, inconsistencies, and security risks.

### 2.2 Proposed Solution

The **User Management System (UMS)** centralizes identity governance and exercises Evolith architecture standards. It provides user lifecycle management, tenant-aware RBAC/ABAC authorization, immutable audit logging, and an administrative console for tenant and user management.

### 2.3 MVP Scope

The MVP covers the following functionalities:

| Category | Functionalities |
| :------- | :-------------- |
| **Identity Management** | User registration, authentication, lifecycle (active/inactive) |
| **Authorization** | Tenant-aware RBAC, role and permission assignment |
| **Audit** | Immutable log of all state mutations |
| **Administration** | Console for tenant management, user management, and health monitoring |

### 2.4 Expected Benefits

| Benefit | Expected Value |
| :------ | :------------- |
| Identity centralization | 100% of authentication routed through the governed layer |
| Duplication elimination | Zero local permission tables post-migration |
| Complete auditability | Every state mutation captured in immutable log |

### 2.5 Delivery Phases

| Phase | Deliverable | Timeline |
| :---- | :---------- | :------- |
| **Phase 1 — MVP** | Identity management, RBAC, audit, admin console | Q1 2026 |
| **Phase 2 — Integration** | External marketplace integration, SSO federation | Q3 2026 |
| **Phase 3 — Advanced** | Full ABAC, dynamic policies, access analytics | Q1 2027 |

## 3. Context and Problem

### 3.1 Current Context

- **Current operation:** Every product in the Evolith ecosystem implements its own user and permission management. There is no centralized control plane. Audit trails are incomplete and role management is manual.
- **Average access configuration time:** {X} hours from request to active access
- **Error rate:** {X}% of permission assignments have inconsistencies
- **Tenant volume:** {X} active tenants with {Y} average users

### 3.2 Identified Problems

| Problem | Impact | Operational Consequence |
| :------ | :----- | :---------------------- |
| **No centralized governance** | Permissions scattered across products | Duplication, inconsistencies, security risks |
| **Incomplete audit trails** | Cannot track who made what change | Compliance failure, impossible audits |
| **Manual role management** | Manual assignment and revocation of access | Delays, human errors, excessive access |
| **No access traceability** | Cannot know permission usage patterns | Impossible to detect anomalous or unauthorized access |

### 3.3 Estimated Impact

| Metric | Estimated Value | Note |
| :----- | :------------- | :--- |
| Hours spent on access configuration | {X} hours/month | Manual assignment and revocation |
| Security incidents from excessive permissions | {X}/quarter | Permissions not revoked timely |
| Response time to access requests | {X} hours | Manual process without automation |

### 3.4 Strategic Vision

UMS is the foundational piece of the Evolith ecosystem. Beyond solving immediate identity problems, it enables:
- **Governed multi-tenancy:** Without centralized identity, real tenant isolation is impossible
- **Automated compliance:** Without immutable audit trails, there is no regulatory compliance
- **Module extraction:** Without identity decoupling, modules cannot be extracted independently
- **Developer experience:** Without a shared identity layer, every product reinvents the wheel

## 4. Objectives and Success Metrics

| Objective | Metric | Initial Value | Target | Timeline |
| :-------- | :----- | :------------ | :----- | :------- |
| Centralize identity governance | Authentication in governed layer | 0% | 100% | Q1 2026 |
| Reduce permission duplication | Local permission tables | {X} tables | 0 | Q1 2026 |
| Improve auditability | Mutations in immutable log | Partial | 100% | Q1 2026 |
| Eliminate manual role management | Access assignment time | {X} hours | < 5 min | Q1 2026 |

## 5. Scope

### 5.1 In Scope — MVP

| Category | Included Functionalities |
| :------- | :----------------------- |
| **Identity** | F-01 User registration, F-02 Authentication, F-03 Lifecycle (active/inactive), F-04 Password management |
| **Authorization** | F-05 Tenant-aware RBAC, F-06 Role assignment, F-07 Permission assignment, F-08 Basic ABAC policy evaluation |
| **Audit** | F-09 Immutable mutation log, F-10 Audit query, F-11 Evidence export |
| **Administration** | F-12 Tenant management console, F-13 User management console, F-14 Health monitoring, F-15 Metrics dashboard |

### 5.2 Out of Scope MVP — Future Phases

| Phase | Functionality | Timeline |
| :---- | :------------ | :------- |
| **Phase 2** | External marketplace integration | Q3 2026 |
| **Phase 2** | SSO federation (SAML, OIDC) | Q3 2026 |
| **Phase 3** | Full ABAC with dynamic policies | Q1 2027 |
| **Phase 3** | Access pattern analytics | Q1 2027 |
| **Post-MVP** | Full enterprise IdP replacement | To be defined |

### 5.3 MVP Functional Scope

The MVP is organized into the following functional blocks:

- **Identity Management** — user registration, authentication, and lifecycle within a tenant.
- **RBAC Authorization** — role and permission assignment with strict tenant isolation.
- **Audit** — immutable log of all state mutations for compliance and traceability.
- **Administrative Console** — interface for tenant management, user management, and system health monitoring.

**Main actors interacting with these blocks:** System Administrator (configures tenants and monitors), Tenant Administrator (manages users and roles), Compliance Officer (audits access patterns).

## 6. Actors and High-Level Use Cases

### 6.1 Actor Descriptions

| Actor | Role in System | Main Responsibilities |
| :---- | :------------- | :-------------------- |
| **System Administrator** | Operates UMS installation and tenants | Configure tenants, monitor health, manage global configuration |
| **Tenant Administrator** | Manages users, roles, and permissions | Assign access, create users, manage roles within the tenant |
| **Compliance Officer** | Audits access patterns | Generate evidence reports, review audit logs |
| **Developer** | Integrates UMS with products | Implement authentication and authorization flows in their products |

### 6.2 Use Cases by Actor

| Actor | Use Cases — MVP (Phase 1) | Use Cases — Phase 2+ |
| :---- | :------------------------ | :------------------- |
| **System Administrator** | F-12 Manage tenants, F-14 Monitor health, F-15 Dashboard | Advanced configuration, federation |
| **Tenant Administrator** | F-01 Register users, F-06 Assign roles, F-07 Assign permissions | Dynamic ABAC, custom policies |
| **Compliance Officer** | F-10 Query audit, F-11 Export evidence | Access pattern analytics, alerts |
| **Developer** | F-02 Authentication, F-08 Evaluate policies | Advanced SDK, webhooks |

### 6.3 Interaction Matrix

| Actor | UMS Web App | UMS API | Evolith Products | Audit Logs |
| :---- | :---------- | :------ | :--------------- | :--------- |
| **System Administrator** | Configures tenants | — | — | Reviews health |
| **Tenant Administrator** | Manages users | — | — | Queries logs |
| **Compliance Officer** | — | — | — | Exports evidence |
| **Developer** | — | Integrates SDK | Registers products | — |

## 7. Detailed MVP Functionalities

| ID | Functionality | Description |
| :-- | :------------ | :---------- |
| F-01 | User Registration | Account creation within a tenant, with email validation and initial status assignment |
| F-02 | Authentication | Login with email/password, session management, refresh tokens. MFA support in future phase |
| F-03 | Lifecycle | Activation, deactivation, and logical deletion with audit data preservation |
| F-04 | Password Management | Password policies, email recovery, forced change by admin |
| F-05 | Tenant-Aware RBAC | Roles and permissions with strict tenant isolation. A permission in tenant A does not apply in tenant B |
| F-06 | Role Assignment | Assignment and revocation of roles to users, with validation that the role belongs to the tenant |
| F-07 | Permission Assignment | Direct permission assignment to users, complementary to role-based assignment |
| F-08 | Basic ABAC Evaluation | Policy evaluation based on user and resource attributes (simplified version) |
| F-09 | Immutable Log | Recording of every state mutation: who, when, what changed, previous and new value |
| F-10 | Audit Query | Search and filter audit logs by user, action, date, and tenant |
| F-11 | Evidence Export | Generation of audit reports in PDF/CSV format for compliance |
| F-12 | Tenant Console | CRUD for tenants with limits, features, and status configuration |
| F-13 | User Console | Listing, search, and management of users with filters by tenant, role, and status |
| F-14 | Health Monitoring | System metrics dashboard: uptime, authentication latency, errors |
| F-15 | Metrics Dashboard | Business metrics visualization: active users, role distribution, access patterns |

## 8. Explicit Business Rules

> **Priority (MoSCoW):** **M** = Must (MVP essential) · **S** = Should (important, doesn't block MVP) · **C** = Could (desirable / future phase).

| ID | Rule | Priority |
| :-- | :--- | :------: |
| RN-01 | A user can belong to only one tenant at a time | M |
| RN-02 | Permissions assigned in one tenant do not apply in another tenant | M |
| RN-03 | A user cannot self-assign System Administrator roles | M |
| RN-04 | Every user state mutation must be recorded in the audit log | M |
| RN-05 | A deactivated user cannot authenticate but retains their data and history | M |
| RN-06 | Passwords must comply with tenant-configured security policy (minimum 8 characters, 1 uppercase, 1 number) | M |
| RN-07 | A tenant must have at least one active Tenant Administrator | M |
| RN-08 | Role assignment must be approved by a Tenant Administrator or higher | S |
| RN-09 | Audit logs must be retained for a minimum of 90 days | S |
| RN-10 | A user can have a maximum of 5 simultaneous role assignments | S |
| RN-11 | ABAC evaluation must complete in under 100ms (P99) | S |
| RN-12 | The system must support a minimum of 1000 simultaneous tenants | C |
| RN-13 | MFA must be available as an option for premium tenants | C |
| RN-14 | Audit logs must be exportable in standard format (CEF/OCSF) | C |

## 9. Constraints and Assumptions

### 9.1 Constraints

| ID | Constraint | Category |
| :-- | :--------- | :------- |
| R-01 | MVP does not include SSO federation (SAML/OIDC); it is Phase 2 | Scope |
| R-02 | Tenant master data is provided by the Evolith governance layer | Dependency |
| R-03 | MVP is limited to basic RBAC; full ABAC is Phase 3 | Scope |
| R-04 | Infrastructure must comply with Evolith security standards (ADR-0010) | Technical |

### 9.2 Assumptions

| ID | Assumption | Risk if Not Met |
| :-- | :--------- | :-------------- |
| S-01 | Evolith ecosystem products will adopt UMS as the identity layer | Persistent duplication of identity solutions |
| S-02 | Initial volume will be under 100 tenants | Possible need for earlier performance optimization |
| S-03 | Developers will have SDK access before launch | Delayed adoption by products |
| S-04 | Evolith governance layer will provide reliable tenant data | Incorrect tenant configuration |

## 10. Business Risks

| ID | Risk | Probability | Impact | Mitigation |
| :-- | :--- | :---------- | :----- | :--------- |
| RS-01 | Poor adoption by ecosystem products | Medium | High | Involve product owners from design; intuitive SDK; complete documentation |
| RS-02 | Audit compliance failure from incomplete logs | Low | High | Automatic audit coverage validation; traceability testing |
| RS-03 | Insufficient performance for high tenant volume | Low | Medium | Early benchmarks; scalable architecture from design |
| RS-04 | Compliance requirement changes during project | Medium | Medium | Continuous regulatory monitoring; parameterizable design |
| RS-05 | Governance layer dependency not available on time | Medium | High | Define interface as MVP priority; backup data |

## 11. PRD Acceptance Criteria

The PRD is considered approved when all the following criteria are met:

### 11.1 PRD Content

| ID | Criterion | Owner | Status |
| :-- | :-------- | :---- | :----- |
| CA-01 | Executive summary validated by Business Approver | Evolith Product Board | ☑ |
| CA-02 | Success metrics with measurable initial value and target | Evolith Product Board | ☑ |
| CA-03 | Scope (5.1 and 5.2) signed by Product | Evolith Product Board | ☑ |
| CA-04 | Business rules (RN-01 to RN-14) without contradictions and prioritized | Evolith Product Board | ☑ |
| CA-05 | Constraints and assumptions reviewed and approved | Evolith Product Board | ☑ |
| CA-06 | Actors and use cases validated with key stakeholders | Evolith Product Board | ☑ |
| CA-07 | Functionalities (F-01 to F-15) with individual acceptance criteria | Evolith Product Board | ☑ |
| CA-08 | Business rules prioritized (Must/Should/Could) | Evolith Product Board | ☑ |
| CA-09 | Glossary complete and consistent with the domain | Evolith Product Board | ☑ |

### 11.2 Product

| ID | Criterion | Owner | Status |
| :-- | :-------- | :---- | :----- |
| CA-10 | Prototypes/wireframes approved by UX | UX Designer | ☑ |
| CA-11 | Master data plan (mapping, quality, cleanup) approved | Evolith Product Board | ☑ |

### 11.3 Project

| ID | Criterion | Owner | Status |
| :-- | :-------- | :---- | :----- |
| CA-12 | MVP timeline with milestones and delivery date defined | Project PM | ☑ |
| CA-13 | Development resources assigned and available | Project PM | ☑ |
| CA-14 | Testing plan (unit, integration, acceptance) defined | QA Lead | ☑ |
| CA-15 | Deployment and training plan defined | Project PM | ☑ |

## 12. Glossary

| Term | Definition |
| :--- | :--------- |
| **Tenant** | Isolation unit in UMS. Each tenant has its own users, roles, and permissions, completely isolated from other tenants |
| **RBAC** | Role-Based Access Control — access control based on roles. Permissions are assigned to roles, and roles to users |
| **ABAC** | Attribute-Based Access Control — access control based on user, resource, and context attributes |
| **Immutable Log** | Audit record that cannot be modified or deleted once created, ensuring complete traceability |
| **SSO** | Single Sign-On — authentication that allows access to multiple systems with the same credentials |
| **MFA** | Multi-Factor Authentication — multi-factor authentication for enhanced security |
| **SDK** | Software Development Kit — set of tools for integrating UMS into ecosystem products |

## 13. Change History

| Version | Date | Author | Changes |
| :------ | :--- | :----- | :------ |
| 0.1.0-draft | 2026-01-10 | Evolith Product Board | Initial version |
| 1.0.0 | 2026-01-15 | Evolith Product Board | PRD approved by Architecture Board. Format updated to TMS standard (13 sections, MoSCoW, acceptance criteria, glossary) |

---

## Appendices

### A.1 Screen Prototypes (MVP)

MVP screen prototypes are available in Figma. Each screen must be reviewed and validated with the Product Owner before development begins.

| Screen | Functionality | Reference |
| :----- | :------------ | :-------- |
| Login | F-02 | Figma — UMS / Auth |
| Admin Dashboard | F-14, F-15 | Figma — UMS / Dashboard |
| User Management | F-13 | Figma — UMS / Users |
| Role Management | F-06, F-07 | Figma — UMS / Roles |
| Audit | F-10, F-11 | Figma — UMS / Audit |

> *Note: Prototypes in Figma are the source of truth for UI/UX design. This document only references screens and their associated functionalities.*

---

<p align="center">
  <strong>© Evolith</strong> · www.beyondnet.info
</p>
