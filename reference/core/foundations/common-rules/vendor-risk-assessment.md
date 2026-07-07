# Vendor Lock-In & Financial Risk Assessment

## Status
Approved

## Date
2026-05-10

## Context
As the Reference System adopts various frameworks, databases, and third-party tools, we must continuously evaluate the **"Build vs. Buy"** decisions to prevent unexpected financial burdens, licensing conflicts, or vendor lock-in.

This document serves as the architectural baseline for evaluating the current technology stack against cost scalability, open-source compliance, and operational maintenance.

---

## 1. Core Frameworks & Languages
**Status:** Zero Risk

The application core is completely insulated from vendor lock-in thanks to strict adherence to Hexagonal Architecture ([ADR-0002](../../architecture/adrs/nodejs/0002-clean-architecture-nestjs.md)).
* **TypeScript & Node.js**: Open Source (Apache 2.0 / MIT).
* **NestJS**: Open Source (MIT), highly adopted enterprise framework.
* **Nx Monorepo**: Open Source (MIT). *Note: Nx Cloud offers SaaS caching, but local caching is 100% free.*

---

## 2. Identified Infrastructure Risks & Mitigations

### High Financial Risk: Identity Provider (IdP)
* **Context**: [ADR-0020](../../architecture/adrs/core/0020-identity-provider-abstraction-strategy.md) abstracts the Identity Provider, allowing integrations with SaaS solutions like Auth0 or Azure Entra ID.
* **The Risk**: Commercial SaaS Identity platforms bill by Monthly Active Users (MAU) or M2M tokens. At a high B2C or B2B scale, operational costs can skyrocket exponentially.
* **Mitigation Strategy**: If licensing costs become prohibitive, the infrastructure adapter must be swapped to **Keycloak** (100% Open Source and free). However, this shifts the financial cost from licensing to DevOps maintenance (Kubernetes scaling, database management).

### Medium Licensing Risk: Redis Distributed Caching
* **Context**: [ADR-0014](../../architecture/adrs/core/0014-multi-layer-distributed-caching-strategy.md) mandates Redis for caching.
* **The Risk**: Redis Inc. recently changed its licensing from BSD to RSALv2 (Source Available, not strictly OSI Open Source). While free for internal usage, it poses legal concerns for managed service hosting.
* **Mitigation Strategy**: In case of strict open-source compliance requirements or self-hosted deployment ([ADR-0028](../../architecture/adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.md)), the operations team is authorized to use **Valkey** (the Linux Foundation Open Source fork of Redis) as a drop-in replacement.

### Medium Maintenance Risk: Feature Flag Engine
* **Context**: [ADR-0017](../../architecture/adrs/core/0017-feature-flagging-strategy.md) utilizes Infrastructure adapters for Feature Flags (e.g., Unleash, ConfigCat).
* **The Risk**: Commercial platforms like LaunchDarkly or Unleash Enterprise have high subscription fees. The free, open-source version of Unleash requires self-hosting.
* **Mitigation Strategy**: The product team must determine if the DevOps bandwidth exists to host and maintain the open-source Unleash Server. If not, budget must be allocated for a cost-effective SaaS alternative like ConfigCat. The core codebase will remain unaffected due to the `IFeatureTogglePort`.

### Low Risk: Observability Stack
* **Context**: [ADR-0007](../../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.md) uses the LGTM stack (Loki, Grafana, Tempo) and OpenTelemetry.
* **The Risk**: Grafana uses an AGPLv3 license.
* **Mitigation Strategy**: As long as the Reference Skeleton team only consumes Grafana internally for monitoring and does not distribute a modified version of the Grafana source code as a commercial product, there is zero legal or financial risk.

---

## Conclusion
The current Reference Skeleton architecture has been deliberately designed to minimize lock-in. Any commercial tool (IdP, Feature Flags, Database) is kept entirely outside the domain boundaries using ports and adapters, ensuring that the business can instantly pivot to open-source alternatives if vendor pricing models change.

---
[Back to Index](./README.md)
