# [ADR 0039](0039-deployment-topology-abstraction-switcher.md): Deployment Topology Abstraction & Environment Switcher

## 1. Status
**Status**: Approved 
**Date**: 2026-05-11 
**Deciders**: Enterprise Architecture Board 
**Consulted**: DevOps Team, Security Council 

---

## 2. Context
The Corporate Reference Architecture is explicitly designed to be **Deployment Agnostic (Principle P2)**. The identical compiled binary/container must be capable of executing in two distinct operational modes without requiring re-compilation or code branching:
1. **Cloud SaaS Mode**: High-density, multi-tenant, internet-facing, integrated with edge CDN and global Identity Providers.
2. **Localized On-Premise Mode**: Deployed inside a client's isolated VPN/Intranet, using local SMTP/SMS hardware, and strict BCrypt local user tables.

Currently, explicit logic boundaries prevent code duplication, but a unified mechanism to **switch infrastructure behaviors dynamically at runtime** is missing, risking the proliferation of scattered `if` statements across modules.

---

## 3. Decision
We decree a **Strict Factory-Driven Abstraction** strategy for deployment switching:

1. **Unified Environment Selector**: Introduce a mandatory environment variable `DEPLOYMENT_TOPOLOGY` with enum values `[SAAS_CLOUD, ON_PREMISE_ISOLATED]`.
2. **Boot-Time Configuration Injection**: The system MUST NOT contain conditional logic inside Application Use Cases. All switching MUST occur at the Dependency Injection (DI) Container level during application bootstrap (Main entrance).
3. **Strategy Pattern for Adapters**: Any behavior requiring distinct external drivers (e.g., SendGrid for SaaS vs Local Haraka SMTP for On-Premise) MUST implement a standardized `Adapter` port. The DI container will conditionally bind the correct implementation based on the Topology token.
4. **Feature Flag Override**: Configuration flags derived from the Topology switch MUST be exposed to the frontend via a `SystemConfig` endpoint, instructing UI clients to dynamically disable SaaS-only features (like global SSO federation) in Local mode.

---

## 4. Alternatives Considered

### Option A: Environment specific branches / distinct binaries
* **Description**: Maintain a separate repo or branch for On-Premise.
* **Reason Rejected**: Violates Single Source of Truth. Massive maintenance burden tracking bug fixes across multiple release artifacts.

### Option B: Inline Conditional Statements (`if (mode === 'saas')`)
* **Description**: Check the deployment mode directly inside service methods.
* **Reason Rejected**: Disastrous violation of SOLID and Clean Architecture. Pollutes core logic with environmental knowledge, rendering testing highly complex.

---

## 5. Consequences

### Positive
* **Zero-Recode Deployment**: The same Docker image runs in production cloud OR inside a private corporate data center.
* **Clean Logic**: Business logic remains 100% pure and ignorant of where it resides physically.
* **Predictable Configuration**: Infrastructure configuration is centralized in Kubernetes ConfigMaps and Vault mounts.

### Negative / Technical Debt
* **Increased Configuration Surface**: DevOps teams must explicitly configure Helm Values to drive the boot-time injection logic correctly for both matrices.

---

## 6. Verification & Compliance
* **Gate**: Unit tests must instantiate both adapter variants to guarantee identical contract compliance.
* **Compliance Checklist**: A Pull Request introducing an infrastructure dependency MUST include dynamic binding logic within the central `InfraModule` factory.




## Objective and Scope

Historical backfill: Address the architectural tension where context is unavailable, establishing a standard boundary.

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

None explicitly linked.

---
[Back to Index](./README.md)
