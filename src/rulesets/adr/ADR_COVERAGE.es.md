# Cobertura ADR → Ruleset

Índice generado automáticamente que mapea cada ADR a su ruleset ejecutable o advisory. **No editar a mano** — regenerar con `node .harness/scripts/generate-adr-coverage.mjs`.

## Totales

| | |
|---|---|
| ADRs totales | 133 |
| Artesanales (handcrafted) | 7 |
| Generados ejecutables (executable) | 91 |
| Generados advisory | 35 |
| Cobertura | **100.0%** |

**Enforcement**: `handcrafted` = ruleset artesanal; `executable` = reglas verificables por máquina (lint/CI/análisis estático); `advisory` = decisión de diseño, requiere atestación manual.

| ADR ID | Track | Título | Status | Enforcement | Ruleset |
|---|---|---|---|---|---|
| ADR-0001 | ai-augmented | Harness Engineering for AI-Augmented Development | Accepted | executable | `rulesets/adr/generated/adr-ai-augmented-0001-harness-engineering-for-ai-augmented-development.rules.json` |
| ADR-0002 | ai-augmented | MCP Integration Protocol for Agent Tool Invocation | Accepted | executable | `rulesets/adr/generated/adr-ai-augmented-0002-mcp-integration-protocol-for-agent-tool-invocation.rules.json` |
| ADR-0003 | ai-augmented | Model Selection Governance for AI-Augmented Workflows | Accepted | executable | `rulesets/adr/generated/adr-ai-augmented-0003-model-selection-governance-for-ai-augmented-workflows.rules.json` |
| ADR-0004 | ai-augmented | AGENTS.md as Mandatory Repository Artifact | Accepted | executable | `rulesets/adr/generated/adr-ai-augmented-0004-agents-md-as-mandatory-repository-artifact.rules.json` |
| ADR-0005 | ai-augmented | Human-in-the-Loop Policy for Autonomous Agent Operations | Accepted | executable | `rulesets/adr/generated/adr-ai-augmented-0005-human-in-the-loop-policy-for-autonomous-agent-operations.rules.json` |
| ADR-0104 | ai-augmented | Interaction Adapter Port for Evolith Agent Runtime | Accepted | advisory | `rulesets/adr/generated/adr-ai-augmented-0104-interaction-adapter-port-for-evolith-agent-runtime.rules.json` |
| ADR-0042 | android | Canonical Android Native Mobile Architecture | Accepted | executable | `rulesets/adr/generated/adr-android-0042-canonical-android-native-mobile-architecture.rules.json` |
| ADR-0001 | core | Monorepo Orchestration Principle | Accepted | executable | `rulesets/adr/generated/adr-0001-monorepo-orchestration-principle.rules.json` |
| ADR-0005 | core | Automated SAST Quality Gates in CI/CD | Accepted | handcrafted | `rulesets/adr/adr-0005-cicd-quality-gates.rules.json` |
| ADR-0006 | core | Microservices Transition via Sidecar Pattern | Accepted - Backlog (Phase 3 Milestone) | executable | `rulesets/adr/generated/adr-0006-microservices-transition-via-sidecar-pattern.rules.json` |
| ADR-0009 | core | Strict Dependency Pinning and Automated Vulnerability Management | Accepted | executable | `rulesets/adr/generated/adr-0009-strict-dependency-pinning-and-automated-vulnerability-manage.rules.json` |
| ADR-0010 | core | Multi-Tenancy Architecture Strategy for SaaS Evolution | Accepted | handcrafted | `rulesets/adr/adr-0010-multi-tenancy.rules.json` |
| ADR-0011 | core | Fault Tolerance and Resiliency Patterns | Accepted | executable | `rulesets/adr/generated/adr-0011-fault-tolerance-and-resiliency-patterns.rules.json` |
| ADR-0013 | core | Cloud Infrastructure Topology and Disaster Recovery (DR) | Accepted | advisory | `rulesets/adr/generated/adr-0013-cloud-infrastructure-topology-and-disaster-recovery-dr.rules.json` |
| ADR-0014 | core | Multi-Layer Distributed Caching Strategy | Accepted | executable | `rulesets/adr/generated/adr-0014-multi-layer-distributed-caching-strategy.rules.json` |
| ADR-0015 | core | Event-Driven Architecture (EDA) for Intra-Domain Communication | Accepted | executable | `rulesets/adr/generated/adr-0015-event-driven-architecture-eda-for-intra-domain-communication.rules.json` |
| ADR-0016 | core | Immutable Business Audit Trail and Change Tracking | Accepted | executable | `rulesets/adr/generated/adr-0016-immutable-business-audit-trail-and-change-tracking.rules.json` |
| ADR-0017 | core | Feature Flagging Strategy for Progressive Delivery | Accepted | advisory | `rulesets/adr/generated/adr-0017-feature-flagging-strategy-for-progressive-delivery.rules.json` |
| ADR-0018 | core | Testing Pyramid and Automated Quality Gates | Accepted | handcrafted | `rulesets/adr/adr-0018-testing-pyramid.rules.json` |
| ADR-0019 | core | Tactical Design Patterns for Future-Proofing | Accepted | executable | `rulesets/adr/generated/adr-0019-tactical-design-patterns-for-future-proofing.rules.json` |
| ADR-0020 | core | Identity Provider Abstraction Strategy | Accepted | advisory | `rulesets/adr/generated/adr-0020-identity-provider-abstraction-strategy.rules.json` |
| ADR-0024 | core | Centralized Configuration & Feature Platform | Accepted | advisory | `rulesets/adr/generated/adr-0024-centralized-configuration-feature-platform.rules.json` |
| ADR-0025 | core | Feature Flag Provider Abstraction Strategy | Accepted | executable | `rulesets/adr/generated/adr-0025-feature-flag-provider-abstraction-strategy.rules.json` |
| ADR-0028 | core | Self-Hosted, Open-Source Hybrid Infrastructure | Accepted | executable | `rulesets/adr/generated/adr-0028-self-hosted-open-source-hybrid-infrastructure.rules.json` |
| ADR-0030 | core | Two-Tier Distributed Gateway Model | Accepted | advisory | `rulesets/adr/generated/adr-0030-two-tier-distributed-gateway-model.rules.json` |
| ADR-0031 | core | Schema-per-Bounded-Context and Domain Event Catalog | Accepted | executable | `rulesets/adr/generated/adr-0031-schema-per-bounded-context-and-domain-event-catalog.rules.json` |
| ADR-0032 | core | API Protocol Selection Matrix (REST vs gRPC vs GraphQL) | Accepted | handcrafted | `rulesets/adr/adr-0032-protocol-selection.rules.json` |
| ADR-0033 | core | Transactional Outbox Pattern for Async Messaging | Proposed (Approved via Maturity Roadmap) | advisory | `rulesets/adr/generated/adr-0033-transactional-outbox-pattern-for-async-messaging.rules.json` |
| ADR-0034 | core | CQRS Pattern Application Matrix | Accepted | executable | `rulesets/adr/generated/adr-0034-cqrs-pattern-application-matrix.rules.json` |
| ADR-0035 | core | Distributed Saga Pattern Implementation Strategy | Accepted | executable | `rulesets/adr/generated/adr-0035-distributed-saga-pattern-implementation-strategy.rules.json` |
| ADR-0036 | core | Message Bus Delivery & Flow Control Strategy | Accepted | executable | `rulesets/adr/generated/adr-0036-message-bus-delivery-flow-control-strategy.rules.json` |
| ADR-0037 | core | Enterprise Performance, Concurrency & Chaos Verification Strategy | Accepted | advisory | `rulesets/adr/generated/adr-0037-enterprise-performance-concurrency-chaos-verification-strate.rules.json` |
| ADR-0039 | core | Deployment Topology Abstraction & Environment Switcher | Accepted | executable | `rulesets/adr/generated/adr-0039-deployment-topology-abstraction-environment-switcher.rules.json` |
| ADR-0040 | core | Multi-Runtime Selection Matrix & Inter-Runtime Contracts | Accepted | handcrafted | `rulesets/adr/adr-0040-multi-runtime.rules.json` |
| ADR-0041 | core | Dual-Engine Policy Evaluation (Native + OPA) | Accepted | executable | `rulesets/adr/generated/adr-0041-dual-engine-policy-evaluation-native-opa.rules.json` |
| ADR-0044 | core | Configurable Security Persistence Strategy (Agnosticism vs. Native RLS) | Proposed | executable | `rulesets/adr/generated/adr-0044-configurable-security-persistence-strategy-agnosticism-vs-na.rules.json` |
| ADR-0045 | core | Microservice Extraction Readiness Criteria | Accepted | executable | `rulesets/adr/generated/adr-0045-microservice-extraction-readiness-criteria.rules.json` |
| ADR-0046 | core | Unified Traceability via W3C TraceContext | Accepted | executable | `rulesets/adr/generated/adr-0046-unified-traceability-via-w3c-tracecontext.rules.json` |
| ADR-0047 | core | Progressive Architecture Evolution Framework: Modular Monolith → Microservices | Accepted | executable | `rulesets/adr/generated/adr-0047-progressive-architecture-evolution-framework-modular-monolit.rules.json` |
| ADR-0048 | core | Enterprise Taxonomy Standardization and Reference Layout | Accepted | executable | `rulesets/adr/generated/adr-0048-enterprise-taxonomy-standardization-and-reference-layout.rules.json` |
| ADR-0049 | core | Naming Semantics & Clean Code Policy (E2E and Global) | Accepted | executable | `rulesets/adr/generated/adr-0049-naming-semantics-clean-code-policy-e2e-and-global.rules.json` |
| ADR-0050 | core | Gitflow Branching Strategy Standardization | Accepted | handcrafted | `rulesets/adr/adr-0050-gitflow-branching.rules.json` |
| ADR-0051 | core | Enterprise Database Engine Selection Strategy | Accepted | executable | `rulesets/adr/generated/adr-0051-enterprise-database-engine-selection-strategy.rules.json` |
| ADR-0052 | core | Unit Testing Isolation Strategy (Mocks vs Stubs) | Accepted | executable | `rulesets/adr/generated/adr-0052-unit-testing-isolation-strategy-mocks-vs-stubs.rules.json` |
| ADR-0053 | core | Integration and E2E Testing Strategy | Accepted | executable | `rulesets/adr/generated/adr-0053-integration-and-e2e-testing-strategy.rules.json` |
| ADR-0054 | core | Database Design and Normalization Standards | Accepted | executable | `rulesets/adr/generated/adr-0054-database-design-and-normalization-standards.rules.json` |
| ADR-0055 | core | Microfrontends Architecture Strategy | Proposed (Phase 3 Readiness) | executable | `rulesets/adr/generated/adr-0055-microfrontends-architecture-strategy.rules.json` |
| ADR-0056 | core | Enterprise Naming & Design Conventions - Multi-Language, Multi-Platform | Accepted — extends and expands the scope of ADR-0049 (Naming Semantics & Clean Code Policy) to all layers of the enterprise ecosystem (code, API, database, events, data warehouse, DDD tactical patterns). | executable | `rulesets/adr/generated/adr-0056-enterprise-naming-design-conventions-multi-language-multi-pl.rules.json` |
| ADR-0057 | core | Architecture Intelligence Catalog | Accepted | advisory | `rulesets/adr/generated/adr-0057-architecture-intelligence-catalog.rules.json` |
| ADR-0058 | core | AI-Consumable Architecture Knowledge | Accepted | advisory | `rulesets/adr/generated/adr-0058-ai-consumable-architecture-knowledge.rules.json` |
| ADR-0067 | core | Modular Monolith Persistence Boundaries | Accepted | executable | `rulesets/adr/generated/adr-0067-modular-monolith-persistence-boundaries.rules.json` |
| ADR-0068 | core | Documentation Release GitFlow | Proposed | executable | `rulesets/adr/generated/adr-0068-documentation-release-gitflow.rules.json` |
| ADR-0069 | core | AI Agent Context Protocol Integration | Accepted | advisory | `rulesets/adr/generated/adr-0069-ai-agent-context-protocol-integration.rules.json` |
| ADR-0070 | core | Lean Root Repository Taxonomy | Accepted | executable | `rulesets/adr/generated/adr-0070-lean-root-repository-taxonomy.rules.json` |
| ADR-0071 | core | Domain Layer Base Class and Inheritance Strategy | Accepted | executable | `rulesets/adr/generated/adr-0071-domain-layer-base-class-and-inheritance-strategy.rules.json` |
| ADR-0072 | core | UTC Date Storage, Browser Timezone Detection, and Language Resolution | Accepted | executable | `rulesets/adr/generated/adr-0072-utc-date-storage-browser-timezone-detection-and-language-res.rules.json` |
| ADR-0073 | core | Unified CLI/MCP Output Contract and Gate Evidence Schema | Accepted — Evolith Architecture Board, 2026-06-10. Closes GT-01. | executable | `rulesets/adr/generated/adr-0073-unified-cli-mcp-output-contract-and-gate-evidence-schema.rules.json` |
| ADR-0074 | core | Evolith Core API Native Exposure Layer | Accepted — Evolith Architecture Board, 2026-06-13. | executable | `rulesets/adr/generated/adr-0074-evolith-core-api-native-exposure-layer.rules.json` |
| ADR-0075 | core | Core API Authentication Strategy | Superseded by ADR-0080 | advisory | `rulesets/adr/generated/adr-0075-core-api-authentication-strategy.rules.json` |
| ADR-0076 | core | Domain-Oriented Microservice Architecture (DOMA) | Accepted — Evolith Architecture Board, 2026-06-14. | advisory | `rulesets/adr/generated/adr-0076-domain-oriented-microservice-architecture-doma.rules.json` |
| ADR-0077 | core | MassTransit v9 Commercial Pivot — Stay on v8, Monitor OpenTransit | Accepted — Evolith Architecture Board, 2026-06-15. | advisory | `rulesets/adr/generated/adr-0077-masstransit-v9-commercial-pivot-stay-on-v8-monitor-opentrans.rules.json` |
| ADR-0078 | core | Domain Financial Separation Governance | Accepted | executable | `rulesets/adr/generated/adr-0078-domain-financial-separation-governance.rules.json` |
| ADR-0079 | core | Multi-Topology Reference Corpus and Topology Manifest Contract | Accepted — Evolith Architecture Board, 2026-06-18. | executable | `rulesets/adr/generated/adr-0079-multi-topology-reference-corpus-and-topology-manifest-contra.rules.json` |
| ADR-0080 | core | Remote Repository Reference Contract | Accepted — Evolith Architecture Board, 2026-06-19. | executable | `rulesets/adr/generated/adr-0080-remote-repository-reference-contract.rules.json` |
| ADR-0081 | core | Agentic AI Sandbox Isolation Boundary | Accepted | executable | `rulesets/adr/generated/adr-0081-agentic-ai-sandbox-isolation-boundary.rules.json` |
| ADR-0082 | core | Agentic AI Prompt, Context, and Tool Trust Boundary | Accepted | advisory | `rulesets/adr/generated/adr-0082-agentic-ai-prompt-context-and-tool-trust-boundary.rules.json` |
| ADR-0083 | core | Agentic AI Action Authorization and Audit | Accepted | executable | `rulesets/adr/generated/adr-0083-agentic-ai-action-authorization-and-audit.rules.json` |
| ADR-0084 | core | Data Mesh and Data as a Product | Accepted | executable | `rulesets/adr/generated/adr-0084-data-mesh-and-data-as-a-product.rules.json` |
| ADR-0085 | core | Agnostic OPA Wasm Distribution Architecture | Accepted | executable | `rulesets/adr/generated/adr-0085-agnostic-opa-wasm-distribution-architecture.rules.json` |
| ADR-0086 | core | Agentic AI Telemetry & Cost Control Standard | Accepted | advisory | `rulesets/adr/generated/adr-0086-agentic-ai-telemetry-cost-control-standard.rules.json` |
| ADR-0087 | core | Attribute-Based Access Control (ABAC) for Agentic Tool Execution | Accepted | executable | `rulesets/adr/generated/adr-0087-attribute-based-access-control-abac-for-agentic-tool-executi.rules.json` |
| ADR-0088 | core | Sovereign Identity for Agentic AI | Accepted | executable | `rulesets/adr/generated/adr-0088-sovereign-identity-for-agentic-ai.rules.json` |
| ADR-0089 | core | Event-Driven Agentic Workflow Pattern | Accepted | advisory | `rulesets/adr/generated/adr-0089-event-driven-agentic-workflow-pattern.rules.json` |
| ADR-0090 | core | RAG Knowledge Governance Standard | Accepted | executable | `rulesets/adr/generated/adr-0090-rag-knowledge-governance-standard.rules.json` |
| ADR-0091 | core | Workload Identity Token Rotation Standard | Accepted | executable | `rulesets/adr/generated/adr-0091-workload-identity-token-rotation-standard.rules.json` |
| ADR-0092 | core | Agent Infinite Loop Prevention and Circuit Breaker Rules | Accepted | executable | `rulesets/adr/generated/adr-0092-agent-infinite-loop-prevention-and-circuit-breaker-rules.rules.json` |
| ADR-0093 | core | Concurrency Control and Resource Locking Standard for MCP Tools | Accepted | executable | `rulesets/adr/generated/adr-0093-concurrency-control-and-resource-locking-standard-for-mcp-to.rules.json` |
| ADR-0094 | core | Multi-Agent Handoff and Task Delegation Standards | Accepted | executable | `rulesets/adr/generated/adr-0094-multi-agent-handoff-and-task-delegation-standards.rules.json` |
| ADR-0095 | core | Serverless Architecture Governance | Accepted | executable | `rulesets/adr/generated/adr-0095-serverless-architecture-governance.rules.json` |
| ADR-0096 | core | Edge Computing Architecture Governance | Accepted | executable | `rulesets/adr/generated/adr-0096-edge-computing-architecture-governance.rules.json` |
| ADR-0097 | core | Knowledge Lifecycle Governance Standard | Accepted | executable | `rulesets/adr/generated/adr-0097-knowledge-lifecycle-governance-standard.rules.json` |
| ADR-0098 | core | REST URI Versioning and Deprecation Policy | Accepted | executable | `rulesets/adr/generated/adr-0098-rest-uri-versioning-and-deprecation-policy.rules.json` |
| ADR-0099 | core | OPA Bundle Distribution via S3 (MinIO) | Superseded by ADR 0085 | advisory | `rulesets/adr/generated/adr-0099-opa-bundle-distribution-via-s3-minio.rules.json` |
| ADR-0100 | core | Governance/Execution Boundary — Producto and Iniciativa as Primary Units, with Advisory Capability | Accepted (2026-06-29 — Architecture Board; diagnosis + Decisions 2–6 valid) — Decision 1 superseded by ADR-0101 (Accepted 2026-06-29). | advisory | `rulesets/adr/generated/adr-0100-governance-execution-boundary-producto-and-iniciativa-as-pri.rules.json` |
| ADR-0101 | core | Evolith Core as a Stateless Evaluation Engine | Accepted (2026-06-29 — Architecture Board) — supersedes Decision 1 of ADR-0100 | advisory | `rulesets/adr/generated/adr-0101-evolith-core-as-a-stateless-evaluation-engine.rules.json` |
| ADR-0102 | core | Evolith Agent Runtime as a Decoupled Agentic Layer | Accepted (2026-06-29 — Architecture Board) | executable | `rulesets/adr/generated/adr-0102-evolith-agent-runtime-as-a-decoupled-agentic-layer.rules.json` |
| ADR-0103 | core | Architecture Planning Gate as Pre-Discovery Intake | Accepted (2026-07-02 — Architecture Board) | executable | `rulesets/adr/generated/adr-0103-architecture-planning-gate-as-pre-discovery-intake.rules.json` |
| ADR-0104 | core | Topology-Driven Advisory Design-Phase Governance (Blueprint as Composable Development Guide) | Proposed (2026-07-04 — pending Architecture Board) — extends ADR-0079 (multi-topology corpus) and ADR-0101 (stateless evaluation engine) | executable | `rulesets/adr/generated/adr-0104-topology-driven-advisory-design-phase-governance-blueprint-a.rules.json` |
| ADR-0105 | core | OKF as the Portable Projection of the Knowledge OS | Proposed (2026-07-07) | executable | `rulesets/adr/generated/adr-0105-okf-as-the-portable-projection-of-the-knowledge-os.rules.json` |
| ADR-0106 | core | Master Tenant and Context Projections | Accepted | advisory | `rulesets/adr/generated/adr-0106-master-tenant-and-context-projections.rules.json` |
| ADR-0107 | core | Single-Cluster Kubernetes Deployment Topology for the Evolith Suite | Accepted | executable | `rulesets/adr/generated/adr-0107-single-cluster-kubernetes-deployment-topology-for-the-evolit.rules.json` |
| ADR-0108 | core | MassTransit Owns the Message Topology; Broker CRDs Are RBAC-Only | Accepted | advisory | `rulesets/adr/generated/adr-0108-masstransit-owns-the-message-topology-broker-crds-are-rbac-o.rules.json` |
| ADR-0109 | core | Multi-Project Satellite Governance (Monorepo Satellites) | Accepted | executable | `rulesets/adr/generated/adr-0109-multi-project-satellite-governance-monorepo-satellites.rules.json` |
| ADR-0110 | core | Stay on MassTransit v8 (Apache-2.0); v9 Is Commercial and Non-Sublicensable | Accepted — scheduled for re-evaluation before 2026-12-31 (see Review Trigger) | executable | `rulesets/adr/generated/adr-0110-stay-on-masstransit-v8-apache-2-0-v9-is-commercial-and-non-s.rules.json` |
| ADR-0111 | core | Quality Signal Provider Port — External Evidence via Adapters | Proposed (2026-07-13 — Architecture Board) | executable | `rulesets/adr/generated/adr-0111-quality-signal-provider-port-external-evidence-via-adapters.rules.json` |
| ADR-0112 | core | RAG Embedding & Vector-Store Platform (Qwen3-Embedding on pgvector) | Accepted | advisory | `rulesets/adr/generated/adr-0112-rag-embedding-vector-store-platform-qwen3-embedding-on-pgvec.rules.json` |
| ADR-0113 | core | Node.js Platform — Lighthouse (Apache-2.0) as the Reference Evidence Adapter | Proposed (2026-07-13 — Architecture Board) | executable | `rulesets/adr/generated/adr-0113-node-js-platform-lighthouse-apache-2-0-as-the-reference-evid.rules.json` |
| ADR-0115 | core | Emergent Knowledge Axis — Knowledge Originated by Applying the Standard | Proposed | executable | `rulesets/adr/generated/adr-0115-emergent-knowledge-axis-knowledge-originated-by-applying-the.rules.json` |
| ADR-0116 | core | Canonical Finding Contract and an Executable Advisory-Authority Boundary | Accepted (2026-07-18 — implemented in develop) | executable | `rulesets/adr/generated/adr-0116-canonical-finding-contract-and-an-executable-advisory-author.rules.json` |
| ADR-0117 | core | Bilingual Parity Applies to Authored Sources, Not Generated Projections | Accepted (2026-07-18 — implemented in develop) | executable | `rulesets/adr/generated/adr-0117-bilingual-parity-applies-to-authored-sources-not-generated-p.rules.json` |
| ADR-0041 | dotnet | Canonical .NET (C#) Backend Architecture | Accepted | executable | `rulesets/adr/generated/adr-dotnet-0041-canonical-net-c-backend-architecture.rules.json` |
| ADR-0060 | dotnet | .NET Multi-Tenancy Dual-Layer Strategy (EF Core & SQL Server) | Accepted | executable | `rulesets/adr/generated/adr-dotnet-0060-net-multi-tenancy-dual-layer-strategy-ef-core-sql-server.rules.json` |
| ADR-0061 | dotnet | Transactional Event Lifecycle in EF Core | Accepted | advisory | `rulesets/adr/generated/adr-dotnet-0061-transactional-event-lifecycle-in-ef-core.rules.json` |
| ADR-0062 | dotnet | .NET Immutable Audit Trail via DDL Triggers & Delta Capture | Accepted | executable | `rulesets/adr/generated/adr-dotnet-0062-net-immutable-audit-trail-via-ddl-triggers-delta-capture.rules.json` |
| ADR-0063 | dotnet | B2B Request Idempotency Middleware in ASP.NET Core | Accepted | advisory | `rulesets/adr/generated/adr-dotnet-0063-b2b-request-idempotency-middleware-in-asp-net-core.rules.json` |
| ADR-0064 | dotnet | .NET Request-Scope Observability Context Propagation | Accepted | executable | `rulesets/adr/generated/adr-dotnet-0064-net-request-scope-observability-context-propagation.rules.json` |
| ADR-0065 | dotnet | .NET PII-Safe Structured Logging Pipeline (Serilog) | Accepted | executable | `rulesets/adr/generated/adr-dotnet-0065-net-pii-safe-structured-logging-pipeline-serilog.rules.json` |
| ADR-0066 | dotnet | .NET Lightweight HTTP Idempotency via IMemoryCache / IDistributedCache | Accepted | advisory | `rulesets/adr/generated/adr-dotnet-0066-net-lightweight-http-idempotency-via-imemorycache-idistribut.rules.json` |
| ADR-0069 | dotnet | .NET gRPC Service Setup & Protobuf Contracts | Accepted | executable | `rulesets/adr/generated/adr-dotnet-0069-net-grpc-service-setup-protobuf-contracts.rules.json` |
| ADR-0070 | dotnet | .NET API Endpoint Strategy | Accepted | executable | `rulesets/adr/generated/adr-dotnet-0070-net-api-endpoint-strategy.rules.json` |
| ADR-0071 | dotnet | .NET Data Access Strategy — EF Core as Default ORM, Dapper for Optimized Reads | \| Field \| Value \| | advisory | `rulesets/adr/generated/adr-dotnet-0071-net-data-access-strategy-ef-core-as-default-orm-dapper-for-o.rules.json` |
| ADR-0072 | dotnet | .NET AOP Cross-Cutting Concern Strategy — DispatchProxy over Pipeline Behaviors | Accepted | executable | `rulesets/adr/generated/adr-dotnet-0072-net-aop-cross-cutting-concern-strategy-dispatchproxy-over-pi.rules.json` |
| ADR-0002 | nodejs | Clean Hexagonal Architecture with NestJS | Accepted | handcrafted | `rulesets/adr/adr-0002-hexagonal-architecture.rules.json` |
| ADR-0003 | nodejs | Strict TypeScript Standards | Accepted | executable | `rulesets/adr/generated/adr-nodejs-0003-strict-typescript-standards.rules.json` |
| ADR-0004 | nodejs | Frontend Offline Resilience | Accepted | advisory | `rulesets/adr/generated/adr-nodejs-0004-frontend-offline-resilience.rules.json` |
| ADR-0007 | nodejs | Observability with OpenTelemetry, Loki, and Jaeger | Accepted | executable | `rulesets/adr/generated/adr-nodejs-0007-observability-with-opentelemetry-loki-and-jaeger.rules.json` |
| ADR-0008 | nodejs | Progressive Multi-Module Evolution with API Gateway and BFF Patterns | Accepted | advisory | `rulesets/adr/generated/adr-nodejs-0008-progressive-multi-module-evolution-with-api-gateway-and-bff-.rules.json` |
| ADR-0012 | nodejs | Advanced Authorization (RBAC/ABAC) Strategy | Accepted | advisory | `rulesets/adr/generated/adr-nodejs-0012-advanced-authorization-rbac-abac-strategy.rules.json` |
| ADR-0021 | nodejs | High-Performance Authentication Graph Compilation | Accepted | advisory | `rulesets/adr/generated/adr-nodejs-0021-high-performance-authentication-graph-compilation.rules.json` |
| ADR-0022 | nodejs | Contextual Authentication and Pluggable Output Projections | Accepted | advisory | `rulesets/adr/generated/adr-nodejs-0022-contextual-authentication-and-pluggable-output-projections.rules.json` |
| ADR-0023 | nodejs | Centralized Authorization Core Strategy | Accepted | advisory | `rulesets/adr/generated/adr-nodejs-0023-centralized-authorization-core-strategy.rules.json` |
| ADR-0026 | nodejs | Adaptive MFA and Passwordless Platform | Accepted | advisory | `rulesets/adr/generated/adr-nodejs-0026-adaptive-mfa-and-passwordless-platform.rules.json` |
| ADR-0027 | nodejs | Dual-Protocol API Strategy (REST & gRPC) | Accepted | advisory | `rulesets/adr/generated/adr-nodejs-0027-dual-protocol-api-strategy-rest-grpc.rules.json` |
| ADR-0029 | nodejs | Adoption of Tactical DDD Primitives Library | Accepted | executable | `rulesets/adr/generated/adr-nodejs-0029-adoption-of-tactical-ddd-primitives-library.rules.json` |
| ADR-0038 | nodejs | Enterprise Error Handling & Result Pattern Strategy | Accepted | executable | `rulesets/adr/generated/adr-nodejs-0038-enterprise-error-handling-result-pattern-strategy.rules.json` |
| ADR-0043 | nodejs | Data Access and ORM Strategy for Node.js | Accepted | executable | `rulesets/adr/generated/adr-nodejs-0043-data-access-and-orm-strategy-for-node-js.rules.json` |
| ADR-0044 | nodejs | Frontend Clean Architecture Layer Boundaries (React) | Accepted | executable | `rulesets/adr/generated/adr-nodejs-0044-frontend-clean-architecture-layer-boundaries-react.rules.json` |
| ADR-0045 | nodejs | Frontend State Management — Zustand + TanStack Query Dual Strategy | Accepted | executable | `rulesets/adr/generated/adr-nodejs-0045-frontend-state-management-zustand-tanstack-query-dual-strate.rules.json` |
| ADR-0046 | nodejs | Prohibition of Raw Technical Identifiers in User Interfaces | Accepted | executable | `rulesets/adr/generated/adr-nodejs-0046-prohibition-of-raw-technical-identifiers-in-user-interfaces.rules.json` |
| ADR-0047 | nodejs | Actionable User Error Contract and Correlated Diagnostics | Accepted | executable | `rulesets/adr/generated/adr-nodejs-0047-actionable-user-error-contract-and-correlated-diagnostics.rules.json` |
| ADR-0048 | nodejs | Feature Flag System Scope and Structured Criteria Model | Accepted | executable | `rulesets/adr/generated/adr-nodejs-0048-feature-flag-system-scope-and-structured-criteria-model.rules.json` |
| ADR-0074 | nodejs | Monorepo Orchestration with Nx | Accepted | executable | `rulesets/adr/generated/adr-nodejs-0074-monorepo-orchestration-with-nx.rules.json` |
| ADR-0075 | nodejs | Application Gateway (BFF) with NestJS | Accepted | executable | `rulesets/adr/generated/adr-nodejs-0075-application-gateway-bff-with-nestjs.rules.json` |
