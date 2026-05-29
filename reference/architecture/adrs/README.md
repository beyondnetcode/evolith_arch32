# Architectural Decision Record (ADR) Navigator

> **Bilingual Navigation:** [Versión en Español](../adrs/README.md)


Welcome to the system's legal repository. All decisions contained herein have been approved by the Corporate Architectural Board.

Start with the [ADR Decision Matrix](./adr-matrix.md) when you know the concern but not the record number.

---

## <a name="universal-core"></a> 1. Universal Core (Runtime Agnostic)
Decisions applicable to any product built on top of the framework, regardless of the language.

* [ADR 0001: Monorepo Orchestration (Nx)](./core/0001-monorepo-orchestration-nx.md)
* [ADR 0005: CI/CD Quality (CodeQL)](./core/0005-ci-cd-quality-codeql.md)
* [ADR 0006: Future Microservices (Dapr)](./core/0006-future-microservices-transition-dapr.md)
* [ADR 0009: Strict Dependency Pinning](./core/0009-strict-dependency-pinning-vulnerability-management.md)
* [ADR 0010: Multi-Tenancy Dual-Layer Strategy](./core/0010-multi-tenancy-architecture-strategy.md)
* [ADR 0011: Resiliency Patterns](./core/0011-fault-tolerance-resiliency-patterns.md)
* [ADR 0013: Cloud Topology & DR](./core/0013-cloud-infrastructure-topology-dr.md)
* [ADR 0014: Distributed Caching (Redis)](./core/0014-distributed-caching-strategy-redis.md)
* [ADR 0015: Injectable Event Bus](./core/0015-event-driven-architecture-intra-domain.md)
* [ADR 0016: Immutable Audit Trail](./core/0016-immutable-business-audit-trail.md)
* [ADR 0017: Feature Flagging Strategy](./core/0017-feature-flagging-strategy.md)
* [ADR 0018: Testing Pyramid Theory](./core/0018-testing-pyramid-quality-gates.md)
* [ADR 0019: Tactical Functional Design](./core/0019-tactical-design-patterns-future-proofing.md)
* [ADR 0020: IdP Abstraction](./core/0020-identity-provider-abstraction-strategy.md)
* [ADR 0024: Config & Feature Platform](./core/0024-configuration-feature-management-platform.md)
* [ADR 0025: Feature Flag Provider Abstraction](./core/0025-feature-flag-provider-abstraction.md)
* [ADR 0028: Self-Hosted OSS Infrastructure](./core/0028-self-hosted-hybrid-infrastructure-on-premise.md)
* [ADR 0030: API Gateway (Kong vs Nest)](./core/0030-api-gateway-kong-vs-nestjs.md)
* [ADR 0031: Isolated Schema Per Context](./core/0031-schema-per-context-domain-event-catalog.md)
* [ADR 0032: Protocol Selection Matrix](./core/0032-api-protocol-decision-matrix-rest-grpc-graphql.md)
* [ADR 0033: Transactional Outbox](./core/0033-transactional-outbox-pattern.md)
* [ADR 0034: CQRS Applicability](./core/0034-cqrs-pattern-applicability-matrix.md)
* [ADR 0035: Distributed Sagas](./core/0035-distributed-saga-pattern-strategy.md)
* [ADR 0036: Message Bus Delivery Strategy](./core/0036-message-bus-delivery-strategy-fifo-dlq.md)
* [ADR 0037: Performance & Chaos Verification](./core/0037-performance-concurrency-chaos-strategy.md)
* [ADR 0039: Deployment Topology Switcher](./core/0039-deployment-topology-abstraction-switcher.md)
* **[ADR 0040: Multi-Runtime Matrix & Contracts](./core/0040-multi-runtime-selection-contracts.md)** *(Root Governance)*
* [ADR 0044: Configurable Security Persistence Strategy](./core/0044-configurable-security-persistence-strategy.md)
* [ADR 0045: Microservice Extraction Readiness Criteria](./core/0045-microservice-extraction-readiness-criteria.md)
* [ADR 0046: Dapr Adoption & Unified Observability](./core/0046-dapr-unified-observability.md)
* [ADR 0047: Selection Framework: Monolith vs SOA vs Microservices](./core/0047-architectural-patterns-monolith-soa-microservices.md)
* [ADR 0048: Enterprise Taxonomy and Reference Layout](./core/0048-enterprise-taxonomy-reference-layout.md)
* [ADR 0049: Naming Semantics & Clean Code Policy](./core/0049-naming-semantics-clean-code-policy.md)
* [ADR 0050: Gitflow Branching Strategy Standardization](./core/0050-gitflow-branching-strategy.md)
* [ADR 0051: Enterprise Database Engine Strategy](./core/0051-enterprise-database-engine-strategy.md)
* [ADR 0052: Unit Testing Isolation Strategy](./core/0052-unit-testing-isolation-strategy.md)
* [ADR 0053: Integration & E2E Testing Strategy](./core/0053-integration-e2e-testing-strategy.md)
* [ADR 0054: Database Design & Normalization Standards](./core/0054-database-design-normalization-standards.md)
* [ADR 0055: Microfrontends Architecture Strategy](./core/0055-microfrontends-architecture-strategy.md)
* **[ADR 0056: Enterprise Naming & Design Conventions — Multi-Language, Multi-Platform](./core/0056-enterprise-naming-design-conventions.md)**
* [ADR 0067: Modular Monolith Database Boundary — Schema per Domain](./core/0067-modular-monolith-schema-per-domain.md)

---

## <a name="nodejs-typescript"></a> 2. Node.js / TypeScript Ecosystem
Decisions tied to the primary runtime for APIs and BFFs.

* [ADR 0002: Clean Architecture NestJS](./nodejs/0002-clean-architecture-nestjs.md)
* [ADR 0003: Strict TS Standards](./nodejs/0003-strict-typescript-standards.md)
* [ADR 0004: Frontend Offline Resilience](./nodejs/0004-frontend-offline-resilience.md)
* [ADR 0007: Observability Telemetry OTel](./nodejs/0007-observability-telemetry-loki-opentelemetry.md)
* [ADR 0008: Progressive BFF Evolution](./nodejs/0008-progressive-multimodule-evolution-gateway-bff.md)
* [ADR 0012: Auth RBAC/ABAC Guards](./nodejs/0012-advanced-authorization-rbac-abac.md)
* [ADR 0021: Auth Graph Compilation](./nodejs/0021-high-performance-auth-and-graph-compilation.md)
* [ADR 0022: Contextual Projections](./nodejs/0022-contextual-auth-and-pluggable-projections.md)
* [ADR 0023: Centralized Kernel Boundary](./nodejs/0023-centralized-ums-vs-decentralized-access.md)
* [ADR 0026: MFA Adaptive Implementation](./nodejs/0026-mfa-passwordless-adaptive-authentication.md)
* [ADR 0027: Dual-Protocol Node Setup](./nodejs/0027-dual-protocol-rest-grpc-api-gateway.md)
* [ADR 0029: Tactical DDD Primitives](./nodejs/0029-tactical-ddd-primitives-library.md)
* [ADR 0038: Result Pattern TS Implementation](./nodejs/0038-error-handling-result-pattern-strategy.md)
* [ADR 0043: Data Access Strategy & ORM](./nodejs/0043-data-access-orm-strategy.md)

---

## <a name="net-c"></a> 3. .NET (C#) Ecosystem
Decisions tied to high-compute runtimes.

* **[ADR 0041: Canonical .NET Backend Architecture](./dotnet/0041-canonical-dotnet-backend-architecture.md)**
* [ADR 0048: .NET API Endpoint Strategy](./dotnet/0070-enterprise-minimal-apis-adoption.md)
* **[ADR 0057: .NET Data Access Strategy (EF Core / Dapper)](./dotnet/0071-dotnet-data-access-orm-strategy.md)**
* [ADR 0060: .NET Multi-Tenancy Dual-Layer Strategy (EF Core & SQL Server)](./dotnet/0060-dotnet-multi-tenancy-dual-layer-strategy.md)
* [ADR 0061: Transactional Event Lifecycle in EF Core](./dotnet/0061-transactional-event-lifecycle-ef-core.md)
* [ADR 0062: .NET Immutable Audit Trail via DDL Triggers & Delta Capture](./dotnet/0062-dotnet-immutable-audit-trail.md)
* [ADR 0063: B2B Request Idempotency Middleware in ASP.NET Core](./dotnet/0063-dotnet-b2b-idempotency-middleware.md)
* **[ADR 0064: .NET Request-Scope Observability Context Propagation](./dotnet/0064-dotnet-request-scope-observability-context.md)**
* **[ADR 0065: .NET PII-Safe Structured Logging Pipeline (Serilog)](./dotnet/0065-dotnet-pii-safe-serilog-pipeline.md)**
* **[ADR 0066: .NET Lightweight HTTP Idempotency via IMemoryCache / IDistributedCache](./dotnet/0066-dotnet-lightweight-http-idempotency.md)**

---

## <a name="canonical-patterns"></a> 5. Canonical Patterns (Runtime-Specific Reference Implementations)

Ready-to-use code blueprints that implement the ADRs above. Adopt directly in satellite repositories.

* [.NET Canonical Patterns Index](../canonical-patterns/README.md)

---

## <a name="android-native"></a> 6. Android Native (Kotlin) Ecosystem
Decisions tied to resilient mobile clients.

* **[ADR 0042: Canonical Android Mobile Architecture](./android/0042-canonical-android-mobile-architecture.md)**

---

## ADRs for AI-Augmented Architecture (Optional Section)

| ID | Title | Status |
|----|--------|--------|
| ADR-AI-001 | Harness Engineering as agentic standard | Proposed |
| ADR-AI-002 | MCP as agent-service integration protocol | Proposed |
| ADR-AI-003 | Model selection and governance criteria | Proposed |
| ADR-AI-004 | AGENTS.md as mandatory artifact (level 1+) | Proposed |
| ADR-AI-005 | Human-in-the-Loop policy for irreversible operations | Proposed |

-> [View all AI ADRs](../../governance/standards/ai-augmented/06-adrs/README.md)

---
[Back to Upper Level](../../README.md)
