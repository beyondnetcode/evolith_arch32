# Architecture View: Multi-Tenancy & Authorization

> **Bilingual Navigation:** [Versión en Español](./view-by-tenant.es.md)

**Status:** Approved  
**Parent:** [C4 Master Architecture](../C4-MASTER-ARCHITECTURE.md)

## 1. Multi-Tenancy Strategy

Evolith follows a strict separation of concerns regarding multi-tenancy. As decreed by **ADR-0101**, the Evolith Core engine is entirely **stateless and tenant-agnostic**.

The responsibility of tenant isolation, user authorization, and ownership records falls entirely on **Evolith Tracker**.

## 2. Authorization Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UMS as User Management System
    participant Tracker as Tracker BFF
    participant Core as Core API

    User->>Tracker: Login (Credentials)
    Tracker->>UMS: Validate & Issue Token
    UMS-->>Tracker: JWT (includes Tenant ID, Roles)
    
    User->>Tracker: Request Action (e.g. Evaluate Gate)
    Tracker->>Tracker: Validate Tenant Authorization & Roles
    
    alt Authorized
        Tracker->>Core: POST /v1/gates/evaluate { workspaceRef }
        Note over Tracker, Core: Tracker maps the Tenant to an opaque workspaceRef. Core NEVER sees the Tenant ID.
        Core-->>Tracker: Evaluation Result
        Tracker-->>User: Success
    else Unauthorized
        Tracker-->>User: 403 Forbidden
    end
```

## 3. Boundary Rules
1. **Core API** and **Agent Runtime API** use API Keys (e.g., `x-api-key`) for machine-to-machine authentication with Tracker.
2. **Core API** never interprets a `tenantId`.
3. **Tracker** handles the JWT validation, Role-Based Access Control (RBAC), and mapping the tenant to the correct rule subsets.

---
[Back to Master Architecture](../C4-MASTER-ARCHITECTURE.md)
