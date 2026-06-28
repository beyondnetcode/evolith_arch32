# UMS — Product Overview

> **Bilingual navigation:** [Versión en Español](./overview.es.md)
> **Parent:** [UMS Reference Hub](./README.md)

A condensed product-hub view of UMS. For the full architectural deep dive (vision diagrams, capability matrices, traceability), open the source document at [`ums-technical-overview.md`](../../knowledge/demo/ums-technical-overview.md).

> **Source note:** UMS is an external satellite repository, not a submodule of this corpus. The stack, protocol, and bounded-context facts below are sourced from the canonical [UMS Technical Overview](../../knowledge/demo/ums-technical-overview.md) and are not verified against live UMS source from inside this repo. For authoritative, current setup and run instructions, always follow the [upstream repository](https://github.com/beyondnetcode/ums).

---

## 1. What UMS Is

UMS is an enterprise-grade open-source User Management System operating as an independent Evolith satellite. It targets the hardest authorization and identity problems — multi-tenant isolation, hierarchical permission graphs, identity governance (IGA), immutable auditing, and approval workflows — in a single modular monolith.

| Dimension | Value |
|---|---|
| Type | Reference product (satellite — not produced by this corpus) |
| Topology | `modular-monolith` (maturity level F1 on the progressive axis) |
| Status | Active reference |
| Upstream | [github.com/beyondnetcode/ums](https://github.com/beyondnetcode/ums) |
| Owner | Evolith Architecture Board (reference owner) · UMS team (product owner) |

---

## 2. Bounded Contexts

UMS isolates concerns into clearly bounded contexts. Each context owns its schema, repositories, and use cases:

UMS is decomposed into exactly 8 bounded contexts (EP-01..EP-08), as defined by the canonical [UMS Technical Overview](../../knowledge/demo/ums-technical-overview.md#3-the-8-bounded-contexts). Multi-tenancy is not a separate context; it is a cross-cutting concern realised as dual-layer RLS across every context.

| Context | Responsibility |
|---|---|
| Identity (EP-01) | User and tenant lifecycle, authentication, MFA/passwordless, organization hierarchy. |
| Authorization (EP-02) | RBAC/ABAC templates, permission graph compilation, contextual projections. |
| Configuration (EP-03) | Hierarchical config (ENV > SYSTEM > TENANT), cached resolution with TTL, CQRS projection. |
| Audit (EP-04) | Immutable append-only log, 10-column standard schema, temporal tables. |
| Console / Admin (EP-05) | Administrative UI, tenant management, system topology registration. |
| Approvals (EP-06) | Adaptive MFA risk scoring, B2B external access, delegated administration sagas. |
| Compliance (EP-07) | Document expiry, access enforcement, regulatory controls and reporting hooks. |
| IGA (EP-08) | Role Maturity Model (5 levels), promotion lifecycle, Promotion Impact Analysis. |

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
| Bounded context isolation with schema-per-context | Lets the `modular-monolith` topology (F1) promote cleanly toward `microservices` (F3) when criteria are met. |
| XACML-inspired PEP/PDP/PAP/PIP authorization (ADR-0039) | Decouples policy from runtime; auditable; testable. |
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

## 6. Running UMS (Upstream)

UMS is built and operated from its own repository; this corpus does not ship its source, environment, or run scripts. Use the upstream entry points below — they are the authoritative install/prerequisites/run surface.

| Need | Upstream entry point |
|---|---|
| Prerequisites and stack (.NET 8 SDK, SQL Server 2022, Redis) | [UMS README](https://github.com/beyondnetcode/ums/blob/main/README.md) |
| Local setup and how to run the app | [UMS README](https://github.com/beyondnetcode/ums/blob/main/README.md) |
| Docker Compose stack, OTel collector, Grafana | [UMS Infrastructure Setup](https://github.com/beyondnetcode/ums/blob/main/README.md) |
| Full navigation map | [UMS Master Index](https://github.com/beyondnetcode/ums/blob/main/docs/MASTER_INDEX.md) |

For contributing patterns discovered in UMS back into this corpus, see the [Reference Model — Promotion Workflow](./reference-model.md#4-promotion-workflow). For contributing to this corpus itself, see the repo-root [CONTRIBUTING.md](../../../CONTRIBUTING.md).

---

[Back to UMS Reference Hub](./README.md)
