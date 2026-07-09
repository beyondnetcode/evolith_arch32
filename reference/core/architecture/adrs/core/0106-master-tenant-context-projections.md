> **Bilingual Navigation:** [Ver versión en Español](./0106-master-tenant-context-projections.es.md)

# ADR-0106: Master Tenant and Context Projections

> **Agent Signature:** Architect Agent (Winston)

## Status
Approved

## Date
2026-07-08

## Context and Problem
In the Evolith product suite, multiple SaaS offerings and systems (such as UMS and Evolith Tracker) must operate within tenant boundaries. Spreading tenant registration and creation directly across individual SaaS applications leads to a fragmented and disjointed tenant lifecycle, introducing synchronization delays, data duplication, and operational friction.

At the same time, we must maintain the core architectural boundary defined in [ADR-0101](../core/0101-core-stateless-evaluation-engine.md): **Evolith Core** must remain a stateless evaluation engine that does not own or persist tenant operational registries. 

However, for high usability and low-latency operation in the application plane, downstream services like **Evolith Tracker** need a fast, local way to validate tenant active status and map user permissions during actions (e.g., gate approvals, evidence review) without hitting remote systems in the critical path or introducing database state to the Core.

## Objective and Scope
The objective is to establish the tenant registration, projection, and authorization boundary rules specifically for the **Evolith Product Suite** (MMS, UMS, and Evolith Tracker) to optimize usability and operational latency, while preserving the statelessness of Evolith Core.

**In scope:**
- Defining **MMS** (Master Data Management) as the sole owner of the Master Tenant identity and lifecycle.
- Establishing **Tenant Projections** as domain-local boundaries in UMS and Evolith Tracker.
- Emphasizing that **Evolith Core** remains stateless (per ADR-0101) and treats the tenant ID as an opaque context string only.
- Optimizing **Evolith Tracker** usability by resolving local projections and UMS-delegated permission graphs under a <5ms latency budget.

**Out of scope:**
- The specific technical transport protocol for projection sync (e.g., event buses, webhooks), which is deferred to runtime implementation.

## Options Considered

### Option 1: Direct, decentralized Tenant registration in each SaaS
Each SaaS application (UMS, Tracker, etc.) exposes its own Tenant creation endpoints and maintains its own Tenant table.
- **Pros:** Domain autonomy.
- **Cons:** High risk of data inconsistency; complex distributed transactions; violates the single source of truth for corporate tenants.

### Option 2: Centralized Master Tenant in MMS with Domain-Specific Context Projections (Chosen)
The Tenant is registered first in MMS as the corporate Master Data. MMS publishes or synchronizes a lightweight **Tenant Projection** containing the global Tenant key to UMS and Evolith Tracker. UMS and Tracker consume these projections to build local boundaries.
- **Pros:** Absolute data consistency; clear separation of concerns (SoC); decoupled domain schemas; high usability and sub-millisecond local checks in Tracker; Core remains strictly stateless.
- **Cons:** Introduces a dependency on projection propagation latency.

## Decision and Rationale
We adopt **Option 2: Centralized Master Tenant in MMS with Domain-Specific Context Projections**.

### 1. Product Suite Tenant Lifecycle
1. **Tenant Registration:** The Tenant is registered first in **MMS** as a master entity, receiving a unique, global Tenant key and corporate metadata.
2. **UMS Projection:** MMS publishes/synchronizes a `TenantProjection` to **UMS**.
3. **Tracker Projection:** MMS publishes/synchronizes a `TenantProjection` to **Evolith Tracker**.
4. **UMS Domain Boundary:** In UMS, the projected tenant serves as the authorization boundary (users, roles, profiles, and permissions are assigned within this tenant).
5. **Tracker Domain Boundary:** In Tracker, the projected tenant serves as the local governance boundary (SDLC processes, gates, evidence, exceptions, and audit records map to this tenant).

### 2. Tracker Usability and Authorization Flow
To achieve optimal usability and sub-millisecond validation times inside **Evolith Tracker**:
1. A user logs into **Evolith Tracker**.
2. Tracker delegates authentication and authorization to **UMS**.
3. UMS authenticates the user and returns an **authorization graph** indicating user memberships, active tenant scope, and permissions over Tracker.
4. Tracker validates that the target Tenant exists as an active local `TenantProjection` and utilizes the permissions received to enable or block operational actions (e.g., approving gates, reviewing evidence) instantly.
5. This local validation ensures that Tracker does not perform external API requests during critical user actions, keeping total operational latency under **5ms**.

### 3. Core Rule of Tenant Governance
> **MMS governs the master identity of the Tenant; UMS governs user identity and authorization within the Tenant; Evolith Tracker governs the SDLC operation of the Tenant.**

Every SaaS retains its own internal data models but references the identical master tenant using the global Tenant key. **Evolith Core** remains strictly stateless, treating `tenantId` as a pure, opaque context identifier.

## Evidence and Evaluation Criteria
- **Domain Decoupling:** Decoupling has been validated; UMS and Tracker persist only local context models while keeping domain logic clean.
- **Design Alignment:** The projection model is already documented in the target design of the [Evolith Governed Composition](../../../../../product/suite/architecture/evolith-governed-composition-target-design.md) and the [SDLC Tracker Technical Interfaces](../../../../../product/products/evolith-tracker/sdlc-tracker-technical-interfaces.md).

## Consequences, Risks, and Trade-offs

### Positive
- **Usability and Speed:** Tracker performs sub-millisecond local checks, dramatically increasing usability compared to remote round-trips.
- **Single Source of Truth:** MMS is the unique authority for corporate tenant status, avoiding conflicts.
- **Autonomous Scale:** If Tracker or UMS database fails, the other can continue operating on local cached projections.

### Negative / Risks
- **Projection Latency:** A newly created tenant in MMS might experience minor delays before becoming active in downstream applications. *Mitigation:* Ensure projection sync uses reliable messaging (e.g., Transactional Outbox pattern per [ADR-0033](../core/0033-transactional-outbox-pattern.md)).

## References
- [Evolith Ecosystem Glossary (Canonical)](../../../sdlc/glossary/glossary-ecosystem.md)
- [Evolith Governed Composition Target Design](../../../../../product/suite/architecture/evolith-governed-composition-target-design.md)
- [SDLC Tracker Technical Interfaces](../../../../../product/products/evolith-tracker/sdlc-tracker-technical-interfaces.md)

## Related Decisions and Standards
- [ADR-0010: Multi-Tenancy Architecture Strategy for SaaS Evolution](../core/0010-multi-tenancy-architecture-strategy.md)
- [ADR-0022: Contextual Authentication and Pluggable Output Projections](../nodejs/0022-contextual-auth-and-pluggable-projections.md)
- [ADR-0023: Centralized Authorization Core Strategy](../nodejs/0023-centralized-ums-vs-decentralized-access.md)
- [ADR-0101: Evolith Core as a Stateless Evaluation Engine](../core/0101-core-stateless-evaluation-engine.md)

---

[Back to ADR Registry](../README.md) · [ADR Decision Matrix](../adr-matrix.md)
