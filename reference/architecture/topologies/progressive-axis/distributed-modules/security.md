# Distributed Modules — Security Guide

> **Bilingual Navigation:** [English](./security.md) | [Español](./security.es.md)

**Owner:** Architecture Board
**Topology:** Distributed Modules

## Overview

This guide defines security practices for distributed modules, covering mutual TLS, per-module authentication, contract-level access control, and secret management.

## Mutual TLS Between Modules

All inter-module communication uses mutual TLS (mTLS) to ensure transport-layer confidentiality and authentication. Each module presents a certificate issued by the internal CA.

- **Certificate lifecycle**: Automated rotation with configurable TTL; certificates provisioned via internal CA.
- **Service mesh integration**: mTLS enforced at the sidecar or proxy layer where available.
- **Certificate pinning**: Modules pin peer certificates for high-sensitivity communication paths.

## Per-Module Authentication

Each module authenticates using its own identity. No shared service account or generic credentials are permitted (DM-R03).

- **Workload identity**: Modules authenticate via workload identity federation or SPIFFE-based identity.
- **Token-based auth**: Inter-module calls carry short-lived tokens scoped to the calling module's identity.
- **Identity propagation**: Authenticated identity is propagated through the full call chain for audit purposes.

## Contract-Level Access Control

Access to module APIs and events is governed at the contract level (DM-R02). Authorization is explicit and versioned alongside the contract.

- **Scope declarations**: Contracts declare required authorization scopes; consumers must hold matching scopes.
- **Role-based access**: Module-level roles define who can invoke which contract versions.
- **Audit logging**: All access attempts are logged with caller identity, contract version, and result.

## Secret Management

Secrets are managed centrally and injected into modules at runtime. No secrets are stored in code, configuration files, or container images.

- **Centralized vault**: Secrets stored in a centralized secret management solution (e.g., Vault, Key Vault).
- **Runtime injection**: Secrets are injected as environment variables or mounted volumes at runtime.
- **Rotation policy**: Automated secret rotation with zero-downtime rolling updates.
- **Access policy**: Secrets are scoped to specific modules; cross-module secret access requires explicit policy grants.

## Data Isolation (DM-R03)

Each module owns its data store. Direct cross-module database access is prohibited; data sharing occurs only through published APIs or events.

- **Schema ownership**: Each module defines and maintains its own database schema.
- **No shared tables**: Modules must not share database tables or schemas directly.
- **Event-based data sharing**: Cross-module data needs are fulfilled via async events or query APIs.

---

[Back to Distributed Modules Profile](./README.md)
