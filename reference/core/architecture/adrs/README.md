# Architectural Decision Record (ADR) Navigator

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

Welcome to the system's legal repository. All decisions contained herein have been approved by the Corporate Architectural Board.

> **Goal:** preserve every accepted architectural decision, classified by scope, so any team can find the controlling record in seconds.
>
> **Objectives:** classify decisions from the most general (Universal Core) to the most specific (runtime ecosystems), keep each ADR compliant with the authoring standard, and expose a decision matrix for discovery by concern.

Start with the [ADR Decision Matrix](./adr-matrix.md) when you know the concern but not the record number.

Every ADR must comply with the [ADR Authoring Standard](./adr-authoring-standard.md) — it defines the Core vs Platform classification, the required sections, and the file/identity rules.

All accepted ADRs are normative (Mandatory: Yes); proposed ADRs are not yet binding (Mandatory: No).

---

## <a name="universal-core"></a> 1. Universal Core (Runtime Agnostic)

Decisions applicable to any product built on top of the framework, regardless of the language.

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [ADR 0001: Monorepo Orchestration (Nx)](./core/0001-monorepo-orchestration-principle.md) | Monorepo orchestration decision based on Nx | Standardize build orchestration | Core ADR | Yes |
| [ADR 0005: CI/CD Quality (CodeQL)](./core/0005-automated-sast-quality-gates.md) | CI/CD quality gates with static analysis | Enforce pipeline quality | Core ADR | Yes |
| [ADR 0006: Future Microservices (Dapr)](./core/0006-microservices-transition-sidecar-pattern.md) | Transition path toward microservices using Dapr | Prepare controlled decomposition | Core ADR | Yes |
| [ADR 0009: Strict Dependency Pinning](./core/0009-strict-dependency-pinning-vulnerability-management.md) | Dependency pinning and vulnerability management | Control the supply chain | Core ADR | Yes |
| [ADR 0010: Multi-Tenancy Dual-Layer Strategy](./core/0010-multi-tenancy-architecture-strategy.md) | Multi-tenancy architecture strategy | Isolate tenants safely | Core ADR | Yes |
| [ADR 0011: Resiliency Patterns](./core/0011-fault-tolerance-resiliency-patterns.md) | Fault-tolerance and resiliency patterns | Survive partial failures | Core ADR | Yes |
| [ADR 0013: Cloud Topology & DR](./core/0013-cloud-infrastructure-topology-dr.md) | Cloud infrastructure topology and disaster recovery | Plan resilient infrastructure | Core ADR | Yes |
| [ADR 0014: Distributed Caching (Redis)](./core/0014-multi-layer-distributed-caching-strategy.md) | Distributed caching strategy | Standardize caching decisions | Core ADR | Yes |
| [ADR 0015: Injectable Event Bus](./core/0015-event-driven-architecture-intra-domain.md) | Event-driven architecture within domains | Decouple domain communication | Core ADR | Yes |
| [ADR 0016: Immutable Audit Trail](./core/0016-immutable-business-audit-trail.md) | Immutable business audit trail | Guarantee auditability | Core ADR | Yes |
| [ADR 0017: Feature Flagging Strategy](./core/0017-feature-flagging-strategy.md) | Feature flagging strategy | Control rollout risk | Core ADR | Yes |
| [ADR 0018: Testing Pyramid Theory](./core/0018-testing-pyramid-quality-gates.md) | Testing pyramid and quality gates | Balance test investment | Core ADR | Yes |
| [ADR 0019: Tactical Functional Design](./core/0019-tactical-design-patterns-future-proofing.md) | Tactical design patterns for future-proofing | Keep designs evolvable | Core ADR | Yes |
| [ADR 0020: IdP Abstraction](./core/0020-identity-provider-abstraction-strategy.md) | Identity provider abstraction strategy | Keep identity replaceable | Core ADR | Yes |
| [ADR 0024: Config & Feature Platform](./core/0024-configuration-feature-management-platform.md) | Configuration and feature management platform | Centralize configuration | Core ADR | Yes |
| [ADR 0025: Feature Flag Provider Abstraction](./core/0025-feature-flag-provider-abstraction.md) | Feature flag provider abstraction | Keep flag vendors replaceable | Core ADR | Yes |
| [ADR 0028: Self-Hosted OSS Infrastructure](./core/0028-self-hosted-hybrid-infrastructure-on-premise.md) | Self-hosted hybrid on-premise infrastructure | Stay vendor-neutral at runtime | Core ADR | Yes |
| [ADR 0030: API Gateway (Kong vs Nest)](./core/0030-two-tier-distributed-gateway-model.md) | API gateway selection trade-off | Standardize the edge | Core ADR | Yes |
| [ADR 0031: Isolated Schema Per Context](./core/0031-schema-per-context-domain-event-catalog.md) | Schema per context and domain event catalog | Isolate context data | Core ADR | Yes |
| [ADR 0032: Protocol Selection Matrix](./core/0032-api-protocol-decision-matrix-rest-grpc-graphql.md) | REST vs gRPC vs GraphQL decision matrix | Pick protocols consistently | Core ADR | Yes |
| [ADR 0033: Transactional Outbox](./core/0033-transactional-outbox-pattern.md) | Transactional outbox pattern | Guarantee reliable messaging | Core ADR | Yes |
| [ADR 0034: CQRS Applicability](./core/0034-cqrs-pattern-applicability-matrix.md) | CQRS pattern applicability matrix | Bound CQRS adoption | Core ADR | Yes |
| [ADR 0035: Distributed Sagas](./core/0035-distributed-saga-pattern-strategy.md) | Distributed saga pattern strategy | Coordinate long transactions | Core ADR | Yes |
| [ADR 0036: Message Bus Delivery Strategy](./core/0036-message-bus-delivery-strategy-fifo-dlq.md) | Message bus delivery with FIFO and DLQ | Guarantee delivery semantics | Core ADR | Yes |
| [ADR 0037: Performance & Chaos Verification](./core/0037-performance-concurrency-chaos-strategy.md) | Performance, concurrency, and chaos strategy | Verify behavior under stress | Core ADR | Yes |
| [ADR 0039: Deployment Topology Switcher](./core/0039-deployment-topology-abstraction-switcher.md) | Deployment topology abstraction switcher | Swap topologies safely | Core ADR | Yes |
| [ADR 0040: Multi-Runtime Matrix & Contracts](./core/0040-multi-runtime-selection-contracts.md) | Multi-runtime selection and contracts (root governance) | Govern runtime selection | Core ADR | Yes |
| [ADR 0041: Dual-Engine Policy Evaluation](./core/0041-dual-engine-policy-evaluation.md) | Dual-Engine Policy Evaluation (Native + OPA) | Standardize policy evaluation | Core ADR | Yes |
| [ADR 0044: Configurable Security Persistence Strategy](./core/0044-configurable-security-persistence-strategy.md) | Configurable security persistence strategy | Adapt security storage | Core ADR | Yes |
| [ADR 0045: Microservice Extraction Readiness Criteria](./core/0045-microservice-extraction-readiness-criteria.md) | Readiness criteria before extracting microservices | Gate decomposition | Core ADR | Yes |
| [ADR 0046: Dapr Adoption & Unified Observability](./core/0046-unified-observability-tracecontext.md) | Dapr adoption with unified observability | Standardize runtime sidecars | Core ADR | Yes |
| [ADR 0047: Monolith vs SOA vs Microservices](./core/0047-architectural-patterns-monolith-soa-microservices.md) | Selection framework across architectural patterns | Choose the right pattern | Core ADR | Yes |
| [ADR 0048: Enterprise Taxonomy and Reference Layout](./core/0048-enterprise-taxonomy-reference-layout.md) | Enterprise taxonomy and reference layout | Standardize repository layout | Core ADR | Yes |
| [ADR 0049: Naming Semantics & Clean Code Policy](./core/0049-naming-semantics-clean-code-policy.md) | Naming semantics and clean code policy | Keep code readable | Core ADR | Yes |
| [ADR 0050: Gitflow Branching Strategy](./core/0050-gitflow-branching-strategy.md) | Gitflow branching standardization | Standardize branching | Core ADR | Yes |
| [ADR 0051: Enterprise Database Engine Strategy](./core/0051-enterprise-database-engine-strategy.md) | Enterprise database engine strategy | Bound engine choices | Core ADR | Yes |
| [ADR 0052: Unit Testing Isolation Strategy](./core/0052-unit-testing-isolation-strategy.md) | Unit testing isolation strategy | Keep unit tests honest | Core ADR | Yes |
| [ADR 0053: Integration & E2E Testing Strategy](./core/0053-integration-e2e-testing-strategy.md) | Integration and end-to-end testing strategy | Verify integrated behavior | Core ADR | Yes |
| [ADR 0054: Database Design & Normalization Standards](./core/0054-database-design-normalization-standards.md) | Database design and normalization standards | Standardize data design | Core ADR | Yes |
| [ADR 0055: Microfrontends Architecture Strategy](./core/0055-microfrontends-architecture-strategy.md) | Microfrontends architecture strategy | Bound frontend decomposition | Core ADR | Yes |
| [ADR 0056: Enterprise Naming & Design Conventions](./core/0056-enterprise-naming-design-conventions.md) | Multi-language, multi-platform naming and design conventions | Unify conventions everywhere | Core ADR | Yes |
| [ADR 0067: Modular Monolith Schema per Domain](./core/0067-modular-monolith-schema-per-domain.md) | Database boundary: schema per domain | Isolate domain data | Core ADR | Yes |
| [ADR 0070: Lean Root Repository Taxonomy](./core/0070-lean-root-repository-taxonomy.md) | Lean root repository taxonomy | Keep the root governed | Core ADR | Yes |
| [ADR 0071: Domain Layer Base Class Strategy](./core/0071-domain-layer-base-class-inheritance-strategy.md) | Domain layer base class and inheritance strategy | Bound inheritance use | Core ADR | Yes |
| [ADR 0072: UTC Dates, Timezone, and Language Resolution](./core/0072-utc-dates-timezone-language-resolution.md) | UTC storage, browser timezone detection, language resolution | Standardize time and locale | Core ADR | Yes |
| [ADR 0073: Unified CLI/MCP Output Contract](./core/0073-unified-cli-output-contract.md) | Unified CLI/MCP output contract and gate evidence schema | Unify tool output surfaces | Core ADR | Yes |
| [ADR 0074: Evolith Core API Native Exposure Layer](./core/0074-evolith-core-api-exposure-layer.md) | Evolith Core API Native Exposure Layer | Official scalable network exposure | Core ADR | Yes |
| [ADR 0078: Domain Financial Separation Governance](./core/0078-domain-financial-separation-governance.md) | Domain financial separation governance | Enforce DDD boundary between Core and Tracker | Core ADR | Yes |
| [ADR 0079: Multi-Topology Reference Corpus](./core/0079-multi-topology-reference-corpus.md) | Multi-topology corpus and manifest contract | Govern topology profiles and executable enforcement | Core ADR | Yes |
| [ADR 0100: Governance/Execution Boundary](./core/0100-governance-execution-boundary-product-initiative.md) | Product/Initiative as Primary Units with Advisory Capability | Establish governance boundary | Core ADR | Yes |
| [ADR 0101: Stateless Evaluation Engine](./core/0101-core-stateless-evaluation-engine.md) | Evolith Core as a Stateless Evaluation Engine | Decouple evaluation logic from state | Core ADR | Yes |
| [ADR 0102: Evolith Agent Runtime](./core/0102-evolith-agent-runtime.md) | Evolith Agent Runtime as a Decoupled Agentic Layer | Standardize agentic execution | Core ADR | Yes |
| [ADR 0103: Architecture Planning Gate](./core/0103-architecture-planning-gate-intake.md) | Architecture Planning Gate as Pre-Discovery Intake | Establish early governance intake | Core ADR | Yes |
| [ADR 0104: Advisory Design-Phase Governance](./core/0104-topology-driven-advisory-design-governance.md) | Topology-Driven Advisory Design-Phase Governance | Govern composition via blueprints | Core ADR | Yes |
| [ADR 0105: OKF Knowledge Projection](./core/0105-okf-knowledge-projection.md) | OKF as the Portable Projection of the Knowledge OS | Standardize knowledge interchange | Core ADR | Yes |
| [ADR 0106: Master Tenant and Context Projections](./core/0106-master-tenant-context-projections.md) | Master Tenant Registry in MMS and Context Projections | Isolate tenant contexts safely | Core ADR | Yes |

---

## <a name="nodejs-typescript"></a> 2. Node.js / TypeScript Ecosystem

Decisions tied to the primary runtime for APIs and BFFs.

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [ADR 0002: Clean Architecture NestJS](./nodejs/0002-clean-architecture-nestjs.md) | Clean architecture layout for NestJS | Standardize backend layering | Node.js ADR | Yes |
| [ADR 0003: Strict TS Standards](./nodejs/0003-strict-typescript-standards.md) | Strict TypeScript compiler and lint standards | Harden the type system | Node.js ADR | Yes |
| [ADR 0004: Frontend Offline Resilience](./nodejs/0004-frontend-offline-resilience.md) | Frontend offline resilience strategy | Survive connectivity loss | Node.js ADR | Yes |
| [ADR 0007: Observability Telemetry OTel](./nodejs/0007-observability-telemetry-loki-opentelemetry.md) | Telemetry with Loki and OpenTelemetry | Instrument the runtime | Node.js ADR | Yes |
| [ADR 0008: Progressive BFF Evolution](./nodejs/0008-progressive-multimodule-evolution-gateway-bff.md) | Progressive multi-module evolution with gateway/BFF | Evolve modularly | Node.js ADR | Yes |
| [ADR 0012: Auth RBAC/ABAC Guards](./nodejs/0012-advanced-authorization-rbac-abac.md) | Advanced authorization with RBAC/ABAC | Standardize authorization | Node.js ADR | Yes |
| [ADR 0021: Auth Graph Compilation](./nodejs/0021-high-performance-auth-and-graph-compilation.md) | High-performance auth and graph compilation | Keep authorization fast | Node.js ADR | Yes |
| [ADR 0022: Contextual Projections](./nodejs/0022-contextual-auth-and-pluggable-projections.md) | Contextual auth and pluggable projections | Adapt views per context | Node.js ADR | Yes |
| [ADR 0023: Centralized Kernel Boundary](./nodejs/0023-centralized-ums-vs-decentralized-access.md) | Centralized UMS vs decentralized access | Bound the kernel | Node.js ADR | Yes |
| [ADR 0026: MFA Adaptive Implementation](./nodejs/0026-mfa-passwordless-adaptive-authentication.md) | MFA, passwordless, and adaptive authentication | Strengthen authentication | Node.js ADR | Yes |
| [ADR 0027: Dual-Protocol Node Setup](./nodejs/0027-dual-protocol-rest-grpc-api-gateway.md) | Dual-protocol REST/gRPC API gateway | Serve both protocols | Node.js ADR | Yes |
| [ADR 0029: Tactical DDD Primitives](./nodejs/0029-tactical-ddd-primitives-library.md) | Tactical DDD primitives library | Share domain building blocks | Node.js ADR | Yes |
| [ADR 0038: Result Pattern TS Implementation](./nodejs/0038-error-handling-result-pattern-strategy.md) | Error handling via Result pattern | Make errors explicit | Node.js ADR | Yes |
| [ADR 0043: Data Access Strategy & ORM](./nodejs/0043-data-access-orm-strategy.md) | Data access and ORM strategy | Standardize persistence | Node.js ADR | Yes |
| [ADR 0044: Frontend Clean Architecture Layers](./nodejs/0044-frontend-clean-architecture-layer-boundaries.md) | Frontend clean architecture layer boundaries | Bound frontend layers | Node.js ADR | Yes |
| [ADR 0045: Zustand + TanStack Query State](./nodejs/0045-zustand-tanstack-query-state-management.md) | State management with Zustand and TanStack Query | Standardize frontend state | Node.js ADR | Yes |
| [ADR 0046: No Raw Identifiers in UI](./nodejs/0046-no-raw-identifiers-in-ui.md) | Prohibition of raw technical identifiers in UI | Protect UX and security | Node.js ADR | Yes |
| [ADR 0047: Actionable User Error Contract](./nodejs/0047-actionable-user-error-contract.md) | Actionable user errors with correlated diagnostics | Make errors actionable | Node.js ADR | Yes |
| [ADR 0048: Feature Flag Scope & Criteria Model](./nodejs/0048-feature-flag-system-scope-criteria-model.md) | Feature flag system scope and structured criteria | Bound flag usage | Node.js ADR | Yes |

---

## <a name="net-c"></a> 3. .NET (C#) Ecosystem

Decisions tied to high-compute runtimes.

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [ADR 0041: Canonical .NET Backend Architecture](./dotnet/0041-canonical-dotnet-backend-architecture.md) | Canonical backend architecture for .NET | Standardize .NET backends | .NET ADR | Yes |
| [ADR 0070: .NET API Endpoint Strategy](./dotnet/0070-enterprise-minimal-apis-adoption.md) | Enterprise Minimal APIs adoption | Standardize API surface | .NET ADR | Yes |
| [ADR 0071: .NET Data Access Strategy](./dotnet/0071-dotnet-data-access-orm-strategy.md) | Data access strategy (EF Core / Dapper) | Standardize persistence | .NET ADR | Yes |
| [ADR 0060: .NET Multi-Tenancy Dual-Layer](./dotnet/0060-dotnet-multi-tenancy-dual-layer-strategy.md) | Multi-tenancy with EF Core and SQL Server | Isolate tenants in .NET | .NET ADR | Yes |
| [ADR 0061: Transactional Event Lifecycle](./dotnet/0061-transactional-event-lifecycle-ef-core.md) | Transactional event lifecycle in EF Core | Guarantee event consistency | .NET ADR | Yes |
| [ADR 0062: .NET Immutable Audit Trail](./dotnet/0062-dotnet-immutable-audit-trail.md) | Audit trail via DDL triggers and delta capture | Guarantee auditability | .NET ADR | Yes |
| [ADR 0063: B2B Idempotency Middleware](./dotnet/0063-dotnet-b2b-idempotency-middleware.md) | Request idempotency middleware in ASP.NET Core | Make B2B calls idempotent | .NET ADR | Yes |
| [ADR 0064: Request-Scope Observability Context](./dotnet/0064-dotnet-request-scope-observability-context.md) | Request-scope observability context propagation | Correlate every request | .NET ADR | Yes |
| [ADR 0065: PII-Safe Serilog Pipeline](./dotnet/0065-dotnet-pii-safe-serilog-pipeline.md) | PII-safe structured logging pipeline | Log without leaking PII | .NET ADR | Yes |
| [ADR 0066: Lightweight HTTP Idempotency](./dotnet/0066-dotnet-lightweight-http-idempotency.md) | HTTP idempotency via IMemoryCache / IDistributedCache | Make retries safe | .NET ADR | Yes |
| [ADR 0069: gRPC Service Setup](./dotnet/0069-dotnet-grpc-service-setup-protobuf-contracts.md) | gRPC service setup with protobuf contracts | Standardize gRPC in .NET | .NET ADR | Yes |
| [ADR 0072: .NET AOP Cross-Cutting Strategy](./dotnet/0072-dotnet-aop-cross-cutting-concern-strategy.md) | Cross-cutting concerns via DispatchProxy | Centralize cross-cutting code | .NET ADR | Yes |

---

## <a name="canonical-patterns"></a> 4. Canonical Patterns (Runtime-Specific Reference Implementations)

Ready-to-use code blueprints that implement the ADRs above. Adopt directly in satellite repositories.

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Canonical Patterns Index](../patterns/README.md) | Index of runtime-specific reference implementations | Reuse proven implementations | Pattern index | No |

---

## <a name="android-native"></a> 5. Android Native (Kotlin) Ecosystem

Decisions tied to resilient mobile clients.

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [ADR 0042: Canonical Android Mobile Architecture](./android/0042-canonical-android-mobile-architecture.md) | Canonical architecture for Android mobile clients | Standardize mobile clients | Android ADR | Yes |

---

## 6. ADRs for AI-Augmented Architecture (Optional Section)

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
The accepted AI-augmented ADRs live in [`ai-augmented/`](./ai-augmented/) within this
ADR tree:

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [ADR 0001: Harness Engineering](./ai-augmented/0001-harness-engineering.md) | Harness Engineering for AI-augmented development | Standardize agent harnesses | AI ADR (accepted) | No |
| [ADR 0002: MCP Integration Protocol](./ai-augmented/0002-mcp-integration-protocol.md) | MCP as agent-service integration protocol | Standardize agent integration | AI ADR (accepted) | No |
| [ADR 0003: Model Selection Governance](./ai-augmented/0003-model-selection-governance.md) | Model selection and governance criteria | Govern model choices | AI ADR (accepted) | No |
| [ADR 0004: AGENTS.md Mandatory Artifact](./ai-augmented/0004-agents-md-mandatory-artifact.md) | AGENTS.md as mandatory artifact (level 1+) | Make agent rules explicit | AI ADR (accepted) | No |
| [ADR 0005: Human-in-the-Loop Policy](./ai-augmented/0005-human-in-the-loop-policy.md) | Human-in-the-Loop policy for irreversible operations | Keep humans accountable | AI ADR (accepted) | No |
| [ADR 0104: Interaction Adapter Port](./ai-augmented/ADR-0104-Interaction-Adapter-Port.md) | Interaction adapter port for agentic mediation | Bound the agentic interaction seam | AI ADR | No |

> **Two AI ADR sets exist.** The table above is the authoritative one (status
> **Accepted**, 2026-06-23). An earlier, shorter proposal set (status **Proposed**,
> 2026-05-11) lives in the AI-augmented corpus at
> [06-adrs](../../foundations/common-rules/ai-augmented/06-adrs/README.md) under
> `ADR-AI-NNN` identifiers. Reconciling the two — superseding or merging the
> proposal set — is an Architecture Board decision and has not been applied here.

---

[Back to Architecture Hub](../README.md)
