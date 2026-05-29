# Template: Product Requirements Document (PRD)

> **Bilingual navigation:** [Versión en Español](./prd-template.es.md)
> **Phase:** 1 — Conception and Discovery
> **Exit gate:** Business Sign-Off (Scope Frozen)
> **Parent:** [Artifact Templates](./README.md)

---

## About This Template

A PRD defines what the product must accomplish and for whom, before any design or architecture work begins. It is the business contract that anchors all downstream artifacts. The Architecture Board must sign off on this document before Phase 2 begins.

---

## Section 1 — Blank Template

Copy the structure below into your new PRD file. Replace every `[PLACEHOLDER]`.

### Source — Copy and paste

```markdown
# PRD: [Product or Feature Name]

> Status: [Draft | In Review | Approved | Superseded]
> Version: [e.g. 1.0.0]
> Owner: [Product Owner name and role]
> Approved by: [Architecture Board / Sponsor name — leave blank until signed]
> Date: [YYYY-MM-DD]

---

## 1. Problem Statement

[Describe the business problem this product solves. 3–5 sentences maximum.
Do not mention technology. Focus on the pain, the audience, and the cost of not solving it.]

---

## 2. Business Objectives

| Objective | Key Result | Measurement Method |
|---|---|---|
| [Objective 1] | [Measurable outcome] | [How it will be measured] |
| [Objective 2] | [Measurable outcome] | [How it will be measured] |

---

## 3. User Personas

| Persona | Role Description | Primary Goal | Pain Point |
|---|---|---|---|
| [Persona name] | [Role in the business] | [What they want to achieve] | [What currently prevents it] |

---

## 4. Scope

### In Scope (MVP)

- [Feature or capability 1]
- [Feature or capability 2]

### In Scope (Post-MVP)

- [Feature or capability 3]
- [Feature or capability 4]

### Out of Scope

- [Explicitly excluded capability 1]
- [Explicitly excluded capability 2]

---

## 5. Success Metrics

| Metric | Baseline | Target | Measurement Window |
|---|---|---|---|
| [Metric name] | [Current state or N/A] | [Target value] | [e.g. 90 days post-launch] |

---

## 6. Constraints and Dependencies

| Type | Description |
|---|---|
| **Regulatory** | [Any compliance constraints: GDPR, ISO 27001, sector-specific] |
| **Technical** | [Platform constraints, approved tech stack boundaries] |
| **Timeline** | [Hard deadlines or market windows] |
| **Team** | [Team size, hiring gaps, external dependencies] |

---

## 7. Functional Story Index

List the Functional Stories that will be written to implement this PRD.
Stories are written separately using the [Functional Story Template](./functional-story-template.md).

| ID | Title | Phase | Priority |
|---|---|---|---|
| FS-01 | [Story title] | MVP | High |
| FS-02 | [Story title] | MVP | High |

---

## 8. Architecture Constraints

[Reference the Evolith artifacts that bound this product's architecture.
Do not design the architecture here — that belongs in Phase 2.]

- Topology: [Modular Monolith per ADR-0047]
- Stack: [Compliant with Authoritative Tech Stack]
- Multi-tenancy: [Yes/No — if yes, ADR-0010 applies]
- Extraction readiness: [Target phase for potential microservice extraction]

---

## 9. Open Questions

| Question | Owner | Target Resolution Date |
|---|---|---|
| [Question 1] | [Name] | [YYYY-MM-DD] |

---

## 10. Sign-Off

| Role | Name | Date | Status |
|---|---|---|---|
| Product Owner | | | Pending |
| Architecture Board | | | Pending |
| Engineering Lead | | | Pending |
| Sponsor | | | Pending |
```

---

### Preview

# PRD: [Product or Feature Name]

> Status: [Draft | In Review | Approved | Superseded]
> Version: [e.g. 1.0.0]
> Owner: [Product Owner name and role]
> Approved by: [Architecture Board / Sponsor name — leave blank until signed]
> Date: [YYYY-MM-DD]

---

## 1. Problem Statement

[Describe the business problem this product solves. 3–5 sentences maximum.
Do not mention technology. Focus on the pain, the audience, and the cost of not solving it.]

---

## 2. Business Objectives

| Objective | Key Result | Measurement Method |
|---|---|---|
| [Objective 1] | [Measurable outcome] | [How it will be measured] |
| [Objective 2] | [Measurable outcome] | [How it will be measured] |

---

## 3. User Personas

| Persona | Role Description | Primary Goal | Pain Point |
|---|---|---|---|
| [Persona name] | [Role in the business] | [What they want to achieve] | [What currently prevents it] |

---

## 4. Scope

### In Scope (MVP)

- [Feature or capability 1]
- [Feature or capability 2]

### In Scope (Post-MVP)

- [Feature or capability 3]
- [Feature or capability 4]

### Out of Scope

- [Explicitly excluded capability 1]
- [Explicitly excluded capability 2]

---

## 5. Success Metrics

| Metric | Baseline | Target | Measurement Window |
|---|---|---|---|
| [Metric name] | [Current state or N/A] | [Target value] | [e.g. 90 days post-launch] |

---

## 6. Constraints and Dependencies

| Type | Description |
|---|---|
| **Regulatory** | [Any compliance constraints: GDPR, ISO 27001, sector-specific] |
| **Technical** | [Platform constraints, approved tech stack boundaries] |
| **Timeline** | [Hard deadlines or market windows] |
| **Team** | [Team size, hiring gaps, external dependencies] |

---

## 7. Functional Story Index

List the Functional Stories that will be written to implement this PRD.
Stories are written separately using the [Functional Story Template](./functional-story-template.md).

| ID | Title | Phase | Priority |
|---|---|---|---|
| FS-01 | [Story title] | MVP | High |
| FS-02 | [Story title] | MVP | High |

---

## 8. Architecture Constraints

[Reference the Evolith artifacts that bound this product's architecture.
Do not design the architecture here — that belongs in Phase 2.]

- Topology: [Modular Monolith per ADR-0047]
- Stack: [Compliant with Authoritative Tech Stack]
- Multi-tenancy: [Yes/No — if yes, ADR-0010 applies]
- Extraction readiness: [Target phase for potential microservice extraction]

---

## 9. Open Questions

| Question | Owner | Target Resolution Date |
|---|---|---|
| [Question 1] | [Name] | [YYYY-MM-DD] |

---

## 10. Sign-Off

| Role | Name | Date | Status |
|---|---|---|---|
| Product Owner | | | Pending |
| Architecture Board | | | Pending |
| Engineering Lead | | | Pending |
| Sponsor | | | Pending |

---

## Section 2 — Worked Example

The following is a complete PRD example using the UMS reference product.

### Source — Copy and paste

```markdown
# PRD: User Management System (UMS) — MVP

> Status: Approved
> Version: 1.0.0
> Owner: Evolith Product Board
> Approved by: Evolith Architecture Board — 2026-01-15
> Date: 2026-01-15

---

## 1. Problem Statement

Enterprise software consistently fails to provide a governed, auditable, and
multi-tenant-safe approach to user identity, authorization, and access management.
Permissions are scattered across individual applications, audit trails are
incomplete, and role management is manual — creating compounding security debt
at scale. UMS exists to solve all five of these failure modes in a single,
progressively architected product.

---

## 2. Business Objectives

| Objective | Key Result | Measurement Method |
|---|---|---|
| Centralize identity governance | 100% of user authentication routed through a single IdP abstraction layer | System login event audit log |
| Eliminate permission duplication | Zero applications maintaining their own permission tables after migration | Architecture review |
| Achieve audit completeness | Every state mutation recorded in the immutable audit log | Audit log coverage report |
| Prove Evolith Phase 1 patterns | All 57+ Evolith ADRs exercised in running code by end of Post-MVP | ADR traceability matrix |

---

## 3. User Personas

| Persona | Role Description | Primary Goal | Pain Point |
|---|---|---|---|
| System Administrator | Manages the UMS installation, tenant configuration, and system topology | Configure tenants and manage system health | No centralized control plane — every setting is in a different system |
| Tenant Administrator | Manages users, roles, and permissions within their organization | Assign roles and manage user access for their org | Role management is manual and lacks approval workflows |
| End User | Subject of identity and access management | Access the systems they are authorized to use | Cannot see why they were denied or appeal a decision |
| Compliance Officer | Audits access patterns and enforces regulatory requirements | Generate access reports and verify role assignments | Audit data is fragmented across multiple systems |
| Security Engineer | Reviews authorization policies and monitors anomalous access | Validate that no user has excessive permissions | No visibility into effective permissions across all contexts |

---

## 4. Scope

### In Scope (MVP — EP-01 to EP-05)

- User lifecycle management (creation, activation, suspension, deletion)
- RBAC/ABAC authorization with permission graph compilation
- Hierarchical multi-tenant configuration (ENV > SYSTEM > TENANT)
- Immutable audit log with 10-column standard schema
- Administrative console for tenant and user management

### In Scope (Post-MVP — EP-06 to EP-08)

- Adaptive MFA risk scoring and approval workflows (EP-06)
- Compliance document management and expiration enforcement (EP-07)
- IGA role promotion lifecycle with Role Maturity Model (EP-08)

### Out of Scope

- Payment processing or billing management
- Content management or document storage unrelated to compliance
- Mobile native client applications
- Single-tenant deployments without multi-tenancy infrastructure

---

## 5. Success Metrics

| Metric | Baseline | Target | Measurement Window |
|---|---|---|---|
| Authentication centralization | 0% | 100% of logins through IdP abstraction | 30 days post-MVP |
| Audit log coverage | 0 events | 100% of state mutations logged | Continuous |
| Code coverage | N/A | >= 70% (Engineering Manifesto gate) | Each sprint |
| Agnosticism Index (PI) | N/A | >= 5.0 at MVP completion | MVP release |

---

## 6. Constraints and Dependencies

| Type | Description |
|---|---|
| **Regulatory** | GDPR data sovereignty requirements apply to all user PII. ISO/IEC 27001:2022 controls must be mapped by Phase 3. |
| **Technical** | .NET 8, SQL Server 2022, EF Core 8. All technology must comply with the Authoritative Tech Stack. |
| **Timeline** | MVP target: 6–7 weeks from Sprint 0. Full product: 14–17 weeks. Production target: Q3 2026. |
| **Team** | 6.25 FTE MVP team. 2 hiring gaps identified: Senior Security Engineer, Senior QA/SDET. |

---

## 7. Functional Story Index

| ID | Title | Phase | Priority |
|---|---|---|---|
| FS-01 | User Registration and Identity Lifecycle | MVP | High |
| FS-02 | Role Assignment and RBAC Template Management | MVP | High |
| FS-03 | Multi-Tenant Organization Provisioning | MVP | High |
| FS-04 | Configuration Hierarchy and Tenant Resolution | MVP | High |
| FS-05 | Permission Graph Compilation and Visual Resolver | MVP | High |
| FS-06 | Immutable Audit Trail and Event Logging | MVP | High |
| FS-07 | Administrative Console and Tenant Dashboard | MVP | Medium |
| FS-08 | OIDC Login Flow and IdP Abstraction | MVP | High |
| FS-09 | Adaptive MFA and Risk-Based Authentication | Post-MVP | High |
| FS-10 | B2B External Access and Guest Provisioning | Post-MVP | Medium |
| FS-11 | Compliance Document Upload and Expiry Tracking | Post-MVP | Medium |
| FS-12 | IGA Role Promotion Lifecycle | Post-MVP | High |
| FS-13 | CQRS Read Projections and Permission Query API | MVP | Medium |
| FS-14 | Delegated Administration with Scoped Permissions | Post-MVP | High |
| FS-15 | Compliance Expiration Notifications | Post-MVP | Medium |
| FS-16 | Access Enforcement Based on Compliance Status | Post-MVP | High |

---

## 8. Architecture Constraints

- Topology: Modular Monolith per ADR-0047. No microservice extraction until ADR-0045 criteria are met.
- Stack: .NET 8, C# 12, EF Core 8, SQL Server 2022. Compliant with Authoritative Tech Stack.
- Multi-tenancy: Yes — dual-layer RLS required (ADR-0010). Composite PK (id, root_tenant_id) on every table.
- Extraction readiness: Phase 1 only. EP-02 (Authorization) is the first extraction candidate at Phase 2.

---

## 9. Open Questions

| Question | Owner | Target Resolution Date |
|---|---|---|
| IdP provider selection: Keycloak or Azure AD as default? | Architecture Board | 2026-02-01 |
| Dapr activation target: Phase 2 or defer to Phase 3? | Tech Lead | 2026-02-15 |

---

## 10. Sign-Off

| Role | Name | Date | Status |
|---|---|---|---|
| Product Owner | Evolith Product Board | 2026-01-15 | Approved |
| Architecture Board | Evolith Architecture Board | 2026-01-15 | Approved |
| Engineering Lead | UMS Tech Lead | 2026-01-20 | Approved |
| Sponsor | Evolith Executive Sponsor | 2026-01-15 | Approved |
```

---

### Preview

# PRD: User Management System (UMS) — MVP

> Status: Approved
> Version: 1.0.0
> Owner: Evolith Product Board
> Approved by: Evolith Architecture Board — 2026-01-15
> Date: 2026-01-15

---

## 1. Problem Statement

Enterprise software consistently fails to provide a governed, auditable, and
multi-tenant-safe approach to user identity, authorization, and access management.
Permissions are scattered across individual applications, audit trails are
incomplete, and role management is manual — creating compounding security debt
at scale. UMS exists to solve all five of these failure modes in a single,
progressively architected product.

---

## 2. Business Objectives

| Objective | Key Result | Measurement Method |
|---|---|---|
| Centralize identity governance | 100% of user authentication routed through a single IdP abstraction layer | System login event audit log |
| Eliminate permission duplication | Zero applications maintaining their own permission tables after migration | Architecture review |
| Achieve audit completeness | Every state mutation recorded in the immutable audit log | Audit log coverage report |
| Prove Evolith Phase 1 patterns | All 57+ Evolith ADRs exercised in running code by end of Post-MVP | ADR traceability matrix |

---

## 3. User Personas

| Persona | Role Description | Primary Goal | Pain Point |
|---|---|---|---|
| System Administrator | Manages the UMS installation, tenant configuration, and system topology | Configure tenants and manage system health | No centralized control plane — every setting is in a different system |
| Tenant Administrator | Manages users, roles, and permissions within their organization | Assign roles and manage user access for their org | Role management is manual and lacks approval workflows |
| End User | Subject of identity and access management | Access the systems they are authorized to use | Cannot see why they were denied or appeal a decision |
| Compliance Officer | Audits access patterns and enforces regulatory requirements | Generate access reports and verify role assignments | Audit data is fragmented across multiple systems |
| Security Engineer | Reviews authorization policies and monitors anomalous access | Validate that no user has excessive permissions | No visibility into effective permissions across all contexts |

---

## 4. Scope

### In Scope (MVP — EP-01 to EP-05)

- User lifecycle management (creation, activation, suspension, deletion)
- RBAC/ABAC authorization with permission graph compilation
- Hierarchical multi-tenant configuration (ENV > SYSTEM > TENANT)
- Immutable audit log with 10-column standard schema
- Administrative console for tenant and user management

### In Scope (Post-MVP — EP-06 to EP-08)

- Adaptive MFA risk scoring and approval workflows (EP-06)
- Compliance document management and expiration enforcement (EP-07)
- IGA role promotion lifecycle with Role Maturity Model (EP-08)

### Out of Scope

- Payment processing or billing management
- Content management or document storage unrelated to compliance
- Mobile native client applications
- Single-tenant deployments without multi-tenancy infrastructure

---

## 5. Success Metrics

| Metric | Baseline | Target | Measurement Window |
|---|---|---|---|
| Authentication centralization | 0% | 100% of logins through IdP abstraction | 30 days post-MVP |
| Audit log coverage | 0 events | 100% of state mutations logged | Continuous |
| Code coverage | N/A | >= 70% (Engineering Manifesto gate) | Each sprint |
| Agnosticism Index (PI) | N/A | >= 5.0 at MVP completion | MVP release |

---

## 6. Constraints and Dependencies

| Type | Description |
|---|---|
| **Regulatory** | GDPR data sovereignty requirements apply to all user PII. ISO/IEC 27001:2022 controls must be mapped by Phase 3. |
| **Technical** | .NET 8, SQL Server 2022, EF Core 8. All technology must comply with the Authoritative Tech Stack. |
| **Timeline** | MVP target: 6–7 weeks from Sprint 0. Full product: 14–17 weeks. Production target: Q3 2026. |
| **Team** | 6.25 FTE MVP team. 2 hiring gaps identified: Senior Security Engineer, Senior QA/SDET. |

---

## 7. Functional Story Index

| ID | Title | Phase | Priority |
|---|---|---|---|
| FS-01 | User Registration and Identity Lifecycle | MVP | High |
| FS-02 | Role Assignment and RBAC Template Management | MVP | High |
| FS-03 | Multi-Tenant Organization Provisioning | MVP | High |
| FS-04 | Configuration Hierarchy and Tenant Resolution | MVP | High |
| FS-05 | Permission Graph Compilation and Visual Resolver | MVP | High |
| FS-06 | Immutable Audit Trail and Event Logging | MVP | High |
| FS-07 | Administrative Console and Tenant Dashboard | MVP | Medium |
| FS-08 | OIDC Login Flow and IdP Abstraction | MVP | High |
| FS-09 | Adaptive MFA and Risk-Based Authentication | Post-MVP | High |
| FS-10 | B2B External Access and Guest Provisioning | Post-MVP | Medium |
| FS-11 | Compliance Document Upload and Expiry Tracking | Post-MVP | Medium |
| FS-12 | IGA Role Promotion Lifecycle | Post-MVP | High |
| FS-13 | CQRS Read Projections and Permission Query API | MVP | Medium |
| FS-14 | Delegated Administration with Scoped Permissions | Post-MVP | High |
| FS-15 | Compliance Expiration Notifications | Post-MVP | Medium |
| FS-16 | Access Enforcement Based on Compliance Status | Post-MVP | High |

---

## 8. Architecture Constraints

- Topology: Modular Monolith per ADR-0047. No microservice extraction until ADR-0045 criteria are met.
- Stack: .NET 8, C# 12, EF Core 8, SQL Server 2022. Compliant with Authoritative Tech Stack.
- Multi-tenancy: Yes — dual-layer RLS required (ADR-0010). Composite PK (id, root_tenant_id) on every table.
- Extraction readiness: Phase 1 only. EP-02 (Authorization) is the first extraction candidate at Phase 2.

---

## 9. Open Questions

| Question | Owner | Target Resolution Date |
|---|---|---|
| IdP provider selection: Keycloak or Azure AD as default? | Architecture Board | 2026-02-01 |
| Dapr activation target: Phase 2 or defer to Phase 3? | Tech Lead | 2026-02-15 |

---

## 10. Sign-Off

| Role | Name | Date | Status |
|---|---|---|---|
| Product Owner | Evolith Product Board | 2026-01-15 | Approved |
| Architecture Board | Evolith Architecture Board | 2026-01-15 | Approved |
| Engineering Lead | UMS Tech Lead | 2026-01-20 | Approved |
| Sponsor | Evolith Executive Sponsor | 2026-01-15 | Approved |

---

[Back to Artifact Templates](./README.md)
