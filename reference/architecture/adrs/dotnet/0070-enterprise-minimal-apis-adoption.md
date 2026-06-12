# [ADR-0070](0070-enterprise-minimal-apis-adoption.md): .NET API Endpoint Strategy

## 1. Status
**Status**: Proposed 
**Date**: 2026-05-13 
**Scope**: Technology Stack - .NET APIs 

---

## 2. Context
In .NET 8/9/10, **Minimal APIs** are fully production-ready and Microsoft positions them as the future of ASP.NET Core. To guarantee efficiency, performance, and technical governance at scale, we need to define exactly when to adopt each model within the organization.

---

## 3. Decision
We adopt a **hybrid strategy** with the following specific selection criteria:

### A. Selection Criteria

* **Minimal APIs**:
 * New high-performance microservices.
 * Serverless and event-driven services.
 * Backend-for-Frontend (BFFs).
 * Modules built under Vertical Slice Architecture.
* **Traditional Controllers**:
 * Enterprise APIs with complex MVC filter logic.
 * Legacy modules under active maintenance.
 * Services requiring advanced model binding logic not natively supported by Minimal APIs.

### B. Standards for Minimal APIs
To mitigate code disorder, the following non-negotiable rules are enforced:
* **Handlers**: Must be defined as dedicated class methods (inline lambdas are strictly prohibited).
* **Organization**: Mandatory use of *Extension Methods* for each functional Feature Module.
* **Structure**: Use of `MapGroup` per resource with shared security and CORS policies.
* **Corporate SDK**: Leverage the corporate base SDK to abstract helpers for registration, versioning, and observability of endpoints.

---

## 4. Consequences

### Positive
* **Performance**: Immediate throughput gains and full Native AOT compatibility for new services.
* **Evolution**: Controlled, incremental adoption without forcing massive legacy rewrites.

### Negative
* **Learning Curve**: Development teams must master both operational patterns simultaneously.
* **Onboarding Friction**: As two distinct models coexist, robust documentation is required to prevent confusion.

---

## 5. Review
Evaluate in **Q2 of next year** whether the ecosystem's maturity allows us to formally deprecate Controllers for all new software projects.




## Objective and Scope

Historical backfill: Address the architectural tension where context is unavailable, establishing a standard boundary.

## Related Decisions and Standards

None explicitly linked.

## Current Sources

Unknown (historical record).

---
[Back to Index](./README.md)
