# UMS — Product Overview

> **Bilingual navigation:** [Versión en Español](./overview.es.md)
> **Parent:** [UMS Reference Hub](./README.md)

A condensed product-hub view of UMS. For the full architectural deep dive (vision diagrams, capability matrices, traceability), open the source document at [`ums-technical-overview.md`](../../knowledge/demo/ums-technical-overview.md).

---

## 1. What UMS Is

UMS is an enterprise-grade open-source User Management System operating as an independent Evolith satellite. It targets the hardest authorization and identity problems — multi-tenant isolation, hierarchical permission graphs, identity governance (IGA), immutable auditing, and approval workflows — in a single modular monolith.

| Dimension | Value |
|---|---|
| Type | Reference product (satellite — not produced by this corpus) |
| Phase | Modular Monolith (Evolith Phase 1) |
| Status | Active reference |
| Upstream | [github.com/beyondnetcode/ums](https://github.com/beyondnetcode/ums) |
| Owner | Evolith Architecture Board (reference owner) · UMS team (product owner) |

---

## 2. Bounded Contexts

UMS isolates concerns into clearly bounded contexts. Each context owns its schema, repositories, and use cases:

| Context | Responsibility |
|---|---|
| Identity (EP-01) | User and tenant lifecycle, organization hierarchy. |
| Access (EP-02) | Authorization graph, XACML PEP/PDP/PAP/PIP, contextual templates. |
| Audit (EP-04) | Immutable append-only log, 10-column standard schema, temporal tables. |
| Multi-tenancy (EP-03) | Dual-layer RLS — `(id, root_tenant_id)` on every table. |
| Approvals (EP-05) | Saga-based access approval flows and ticket lifecycle. |
| Compliance (EP-06) | Regulatory controls and reporting hooks. |
| Configuration (EP-07) | Tenant configuration and feature flags. |
| IGA (EP-08) | Role Maturity Model (5 levels), promotion lifecycle. |

---

## 3. Technical Stack

- **Backend:** .NET 8 (C#), modular monolith, Hexagonal Architecture.
- **API protocols:** REST commands + GraphQL queries (CQRS split at the protocol level).
- **Frontend:** React (TypeScript).
- **Persistence:** EF Core + SQL Server (temporal tables for audit; RLS for tenancy).
- **Caching / idempotency:** Redis + IMemoryCache.
- **Observability:** OpenTelemetry context propagation (W3C `TraceParent` + correlation IDs).

---

## 4. Patterns to Inherit

| Pattern | Why it matters |
|---|---|
| Bounded context isolation with schema-per-context | Lets Phase 1 modular monolith promote cleanly to Phase 2 microservices. |
| XACML PEP/PDP/PAP/PIP authorization | Decouples policy from runtime; auditable; testable. |
| Permission graph compiled at resolution time (TE-02) | High-performance evaluation without scattering logic. |
| Dual-layer RLS (app + DB) | Tenant isolation provable under load. |
| Append-only audit log with 10-column standard | Regulatory-grade traceability. |
| Idempotency middleware (memory or distributed) | Safe REST commands under network retries. |
| OpenTelemetry envelope through every adapter | Production-grade observability with minimal noise. |

---

## 5. Deep Links by Role

| If you are a… | Start with |
|---|---|
| Architect onboarding to Evolith | [`ums-reference-model.md`](../../knowledge/demo/ums-reference-model.md) → this overview → upstream [Architecture Portal](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |
| Engineer adopting an Evolith pattern | This overview → [`ums-technical-overview.md`](../../knowledge/demo/ums-technical-overview.md) bounded-context section → upstream source |
| Product owner comparing capabilities | This overview → [`reference-model.md`](./reference-model.md) for the inheritance map |
| Auditor verifying boundaries | [`demo-vs-reference.md`](../../knowledge/demo/demo-vs-reference.md) → upstream Architecture Portal |

---

[Back to UMS Reference Hub](./README.md)
