# ADR Matrix

> Bilingual navigation: [Español](../adrs/adr-matrix.es.md)

Use this matrix when you need to find decisions by concern instead of by numeric ID. It is intentionally selective: the ADR registry remains the complete catalog.

| Concern | Primary ADRs | Audience | Applies to |
|---|---|---|---|
| Progressive evolution | [core/ADR-0006](./core/0006-microservices-transition-sidecar-pattern.md), [core/ADR-0045](./core/0045-microservice-extraction-readiness-criteria.md), [core/ADR-0047](./core/0047-architectural-patterns-monolith-soa-microservices.md), [core/ADR-0076](./core/0076-domain-oriented-microservice-architecture.md) | Architects, Staff Engineers | Universal |
| Runtime selection | [core/ADR-0040](./core/0040-multi-runtime-selection-contracts.md), [dotnet/ADR-0041](./dotnet/0041-canonical-dotnet-backend-architecture.md), [android/ADR-0042](./android/0042-canonical-android-mobile-architecture.md) | Architects, Tech Leads | Runtime-specific |
| API and gateway | [core/ADR-0030](./core/0030-two-tier-distributed-gateway-model.md), [core/ADR-0032](./core/0032-api-protocol-decision-matrix-rest-grpc-graphql.md), [nodejs/ADR-0008](./nodejs/0008-progressive-multimodule-evolution-gateway-bff.md), [dotnet/ADR-0063](./dotnet/0063-dotnet-b2b-idempotency-middleware.md) | Backend, Frontend, SRE | Universal plus Node.js |
| Persistence and data | [core/ADR-0010](./core/0010-multi-tenancy-architecture-strategy.md), [core/ADR-0051](./core/0051-enterprise-database-engine-strategy.md), [nodejs/ADR-0043](./nodejs/0043-data-access-orm-strategy.md), [dotnet/ADR-0057](./dotnet/0071-dotnet-data-access-orm-strategy.md), [dotnet/ADR-0060](./dotnet/0060-dotnet-multi-tenancy-dual-layer-strategy.md), [dotnet/ADR-0061](./dotnet/0061-transactional-event-lifecycle-ef-core.md) | Backend, Data, Architects | Universal plus runtime-specific |
| Security and identity | [nodejs/ADR-0012](./nodejs/0012-advanced-authorization-rbac-abac.md), [core/ADR-0020](./core/0020-identity-provider-abstraction-strategy.md), [nodejs/ADR-0026](./nodejs/0026-mfa-passwordless-adaptive-authentication.md), [dotnet/ADR-0062](./dotnet/0062-dotnet-immutable-audit-trail.md) | Security, Backend | Universal plus Node.js |
| Observability and operations | [nodejs/ADR-0007](./nodejs/0007-observability-telemetry-loki-opentelemetry.md), [core/ADR-0046](./core/0046-unified-observability-tracecontext.md), [core/ADR-0013](./core/0013-cloud-infrastructure-topology-dr.md), [dotnet/ADR-0064](./dotnet/0064-dotnet-request-scope-observability-context.md), [dotnet/ADR-0065](./dotnet/0065-dotnet-pii-safe-serilog-pipeline.md) | SRE, DevOps, Backend | Universal plus runtime-specific |
| API reliability and idempotency | [dotnet/ADR-0063](./dotnet/0063-dotnet-b2b-idempotency-middleware.md), [dotnet/ADR-0066](./dotnet/0066-dotnet-lightweight-http-idempotency.md) | Backend, SRE | .NET |
| Testing and quality | [core/ADR-0018](./core/0018-testing-pyramid-quality-gates.md), [core/ADR-0052](./core/0052-unit-testing-isolation-strategy.md), [core/ADR-0053](./core/0053-integration-e2e-testing-strategy.md) | QA, Developers | Universal |
| Frontend and UI modularity | [nodejs/ADR-0004](./nodejs/0004-frontend-offline-resilience.md), [core/ADR-0055](./core/0055-microfrontends-architecture-strategy.md), [nodejs/ADR-0044](./nodejs/0044-frontend-clean-architecture-layer-boundaries.md), [nodejs/ADR-0045](./nodejs/0045-zustand-tanstack-query-state-management.md) | Frontend, Architects | Universal plus frontend implementation |
| Frontend UX standards | [nodejs/ADR-0046](./nodejs/0046-no-raw-identifiers-in-ui.md), [nodejs/ADR-0047](./nodejs/0047-actionable-user-error-contract.md), [core/ADR-0072](./core/0072-utc-dates-timezone-language-resolution.md) | Frontend, UX, Backend | Universal |
| Feature flag internals | [core/ADR-0017](./core/0017-feature-flagging-strategy.md), [core/ADR-0025](./core/0025-feature-flag-provider-abstraction.md), [nodejs/ADR-0048](./nodejs/0048-feature-flag-system-scope-criteria-model.md) | Backend, Architects | Universal |
| Documentation and taxonomy | [core/ADR-0048](./core/0048-enterprise-taxonomy-reference-layout.md), [core/ADR-0049](./core/0049-naming-semantics-clean-code-policy.md), [core/ADR-0056](./core/0056-enterprise-naming-design-conventions.md), [core/ADR-0070](./core/0070-lean-root-repository-taxonomy.md) | All contributors | Universal |
| .NET AOP and cross-cutting | [dotnet/ADR-0072](./dotnet/0072-dotnet-aop-cross-cutting-concern-strategy.md), [dotnet/ADR-0064](./dotnet/0064-dotnet-request-scope-observability-context.md), [dotnet/ADR-0065](./dotnet/0065-dotnet-pii-safe-serilog-pipeline.md) | .NET Backend | .NET |
| CLI, Governance & MCP | [core/ADR-0041](./core/0041-dual-engine-policy-evaluation.md), [core/ADR-0073](./core/0073-unified-cli-output-contract.md), [core/ADR-0069](./core/0069-ai-agent-context-protocol-integration.md) | Architects, CI/CD, AI agents | Universal |
| Domain model governance | [core/ADR-0071](./core/0071-domain-layer-base-class-inheritance-strategy.md), [core/ADR-0019](./core/0019-tactical-design-patterns-future-proofing.md) | Architects, .NET Backend | Universal |

---
[Back to ADR Registry](./README.md)
