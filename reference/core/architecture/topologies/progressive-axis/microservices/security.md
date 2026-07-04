# Microservices — Security Guide

> **Bilingual Navigation:** [English](./security.md) | [Español](./security.es.md)

**Owner:** Architecture Board
**Topology:** Microservices

## Zero-Trust Architecture

Assume no network boundary is safe. Every service-to-service call must authenticate and authorize. Zero-trust is not optional in a distributed topology — it is a baseline requirement.

## Service Mesh mTLS

Enforce **MS-R02** (Service Mesh/mTLS) at the mesh layer. All inter-service traffic must be encrypted with mutual TLS. Certificates are auto-rotated by the mesh (Istio Citadel, Linkerd identity). No service should accept plaintext internal traffic.

## API Gateway Authentication

All external traffic enters through an API gateway. The gateway handles OAuth 2.0 / OIDC token validation, rate limiting, and request transformation. Services trust only tokens validated by the gateway — never parse raw authorization headers directly.

## Per-Service IAM

Each service owns its own authorization logic. Use scoped service accounts with least-privilege IAM roles. Services must not share credentials or impersonate each other. Policy enforcement happens at both the gateway and service level.

## Secret Rotation

- Store secrets in a dedicated vault (Azure Key Vault, HashiCorp Vault).
- Automate rotation schedules — no manual secret updates.
- Applications must handle rotation gracefully (refresh without restart).
- Audit all secret access with immutable logs.

## Network Policies

Define Kubernetes NetworkPolicies to restrict pod-to-pod traffic. Only explicitly allowed service pairs may communicate. Combine with mesh-level authorization policies for defense in depth.

## Compliance and Audit

Log all authentication and authorization decisions. Export audit logs to a tamper-proof store. Periodically validate that no service bypasses the mesh or gateway for external communication.

## References

| Rule | Description |
|------|-------------|
| **MS-R02** | Service Mesh / mTLS |
| **ADR-0045** | Service mesh adoption (zero-trust baseline) |

---
[Back to Microservices Profile](./README.md)
