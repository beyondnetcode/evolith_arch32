# Modular Monolith — Security Guide

> **Bilingual Navigation:** [English](./security.md) | [Español](./security.es.md)

**Owner:** Architecture Board
**Topology:** Modular Monolith

---

## Module Isolation

Each module operates within an isolation boundary that restricts its access to only the resources it owns. The modular monolith enforces isolation at the application layer, not the infrastructure layer.

- **Code isolation:** Modules communicate through defined interfaces; direct database access across modules is prohibited
- **Runtime isolation:** Modules run in the same process but are separated by interface boundaries and compile-time checks
- **Data isolation:** Each module owns its database schema; cross-module queries are not permitted

## Shared Authentication

Authentication is centralized at the API gateway level. All inbound requests carry a validated token before reaching any module.

- **Token validation:** JWT or OAuth 2.0 tokens validated at the gateway; modules trust the validated identity
- **Session management:** Centralized session store shared across all modules
- **Credential rotation:** Automated rotation enforced; modules never store raw credentials
- **Multi-factor:** MFA enforcement is application-wide, not per-module

## Isolated Authorization

While authentication is shared, authorization is module-scoped. Each module enforces its own access control policies.

- **Permission model:** Each module defines its own roles and permissions
- **No cross-module role inheritance:** A role in module A does not grant access in module B
- **Policy enforcement:** Authorization checks occur at module boundaries, not at the gateway
- **Audit trail:** Each module maintains its own authorization audit log

```
Module A authorization:
  - Admin: full CRUD on module A resources
  - Viewer: read-only access to module A resources
  - Does NOT imply any access to Module B
```

## Internal API Boundaries

Modules expose internal APIs that are explicitly versioned and documented. Undocumented internal APIs are prohibited.

- **API contracts:** Each module publishes a machine-readable API contract (OpenAPI or equivalent)
- **Versioning:** Internal APIs follow semantic versioning; breaking changes require migration plans
- **Deprecation policy:** APIs deprecated for minimum 2 release cycles before removal
- **Access control:** Internal APIs are not accessible from external networks; only module-to-module communication

## No Cross-Context Data Access

Modules must not access another module's data directly. All cross-module data needs go through published APIs.

- **Direct database access:** Prohibited across module boundaries (MM-R02)
- **Shared schemas:** Not permitted; each module owns its schema exclusively
- **Data replication:** Allowed only through event-driven patterns; modules subscribe to published events
- **Temporary data sharing:** Requires explicit API contract; never through shared database tables

**Violation detection:** Automated tests scan for cross-module database queries; violations fail the build.

---

[Back to Modular Monolith Profile](./README.md)
