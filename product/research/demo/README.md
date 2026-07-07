# UMS as the Official Enterprise Reference Model

> Bilingual navigation: [Versión en Español](./README.es.md)
> Product hub: [UMS Reference Hub](../../products/ums-reference/README.md) — the first-class product surface for UMS in `product/products/`.

This portal establishes the corporate architectural relationship between the progressive architecture baseline and its official, executable product reference: the open-source **User Management System (UMS)**.

---

## 1. Why the Legacy TO-DO Sandbox Was Retired

The To-Do application was a useful starting point for basic pattern testing, but it introduced several critical limitations that hindered its usefulness as a corporate reference:
- **Over-Simplification:** It could not credibly demonstrate the architectural challenges of real-world enterprise systems, such as fine-grained authorization, identity lifecycles, and multi-tenant RLS auditing.
- **Narrative Clash:** Storing a local, technology-specific NestJS/React application within a technology-neutral corporate decision upstream blurred the boundary between canonical corporate policy and product-level evidence.

---

## 2. Why UMS Is the New Demo Baseline

The open-source [User Management System (UMS)](https://github.com/beyondnetcode/ums) provides an enterprise-grade applied model. It operates as an independent satellite repository that consumes, extends, and specializes the core rules defined in this upstream:
- **Executable Realism:** UMS is a fully functional product featuring real bounded contexts (Identity, Access, IGA, Auditing, Compliance) built on a modular monolith topology.
- **Modern Technology Stack:** It showcases a production-ready C#/.NET 8 backend, a rich React frontend, and integrated CQRS separated at the protocol level (GraphQL queries vs REST commands), backed by SQL Server, Redis, and a complete OpenTelemetry stack.
- **Clear Separation of Authority:** Upstream rules remain here; product evidence, deployment setups, and code live in UMS.

---

## 3. Architectural Knowledge & Concepts Inherited from UMS

Product teams should use UMS to study and inherit the following structural patterns:

| Architectural Concern | Concrete UMS Implementation Evidence |
| :--- | :--- |
| **Bounded Contexts Map** | Isolation of concerns into dedicated contexts: Identity, Access, Audit, Approvals, Configuration. |
| **Clean/Hexagonal Architecture** | Explicit decoupling of Domain entities, Application use cases, and Infrastructure adapters. |
| **API Protocol Separation** | Direct REST commands for mutating operations and high-performance GraphQL for queries. |
| **Observability Envelope** | Core propagation of request-scope context (`TraceParent` + correlation logging) across the pipeline. |
| **Auditing & RLS** | Temporal tables in SQL Server combined with application-level and database-native RLS layers. |
| **Lightweight Idempotency** | Request deduplication middleware utilizing memory or distributed caches (IMemoryCache/Redis). |

---

## 4. Documentation Navigation Matrix

Explore the complete migration record and boundary definitions directly within this reference:

| Resource | Scope & Purpose |
| :--- | :--- |
| **[UMS Technical Overview](./ums-technical-overview.md)** | **What UMS is, its 8 bounded contexts, tech stack, key patterns, and deep links by role.** |
| [UMS Reference Model](./ums-reference-model.md) | In-depth analysis of UMS inheritance, specialization, and core concepts. |
| [Reference vs Applied Model](./demo-vs-reference.md) | Understanding the critical boundary between universal policy and product specialization. |
| [Migration Ledger](./migration-from-todo-to-ums.md) | Full historical log of retired TO-DO files and migration steps executed. |
| [Adoption Cases](../adoption-cases.md) | Real cases where product lessons were promoted into Evolith standards. |
| [UMS Repository](https://github.com/beyondnetcode/ums) | View the open-source executable application codebase and current setup instructions. |
| [UMS Architecture Portal](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) | Official documentation of UMS's modular boundaries and architectural decisions. |

---
[Back to Reference Hub](../../../README.md)