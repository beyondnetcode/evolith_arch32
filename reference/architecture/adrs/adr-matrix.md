# ADR Matrix

> Bilingual navigation: [Español](../adrs/adr-matrix.es.md)

Use this matrix when you need to find decisions by concern instead of by numeric ID. It is intentionally selective: the ADR registry remains the complete catalog.

| Concern | Primary ADRs | Audience | Applies to |
|---|---|---|---|
| Progressive evolution | [ADR-0006](./core/0006-future-microservices-transition-dapr.md), [ADR-0045](./core/0045-microservice-extraction-readiness-criteria.md), [ADR-0047](./core/0047-architectural-patterns-monolith-soa-microservices.md) | Architects, Staff Engineers | Universal |
| Runtime selection | [ADR-0040](./core/0040-multi-runtime-selection-contracts.md), [.NET ADR-0041](./dotnet/0041-canonical-dotnet-backend-architecture.md), [Android ADR-0042](./android/0042-canonical-android-mobile-architecture.md) | Architects, Tech Leads | Runtime-specific |
| API and gateway | [ADR-0030](./core/0030-api-gateway-kong-vs-nestjs.md), [ADR-0032](./core/0032-api-protocol-decision-matrix-rest-grpc-graphql.md), [ADR-0008](./nodejs/0008-progressive-multimodule-evolution-gateway-bff.md), [ADR-0063](./dotnet/0063-dotnet-b2b-idempotency-middleware.md) | Backend, Frontend, SRE | Universal plus Node.js |
| Persistence and data | [ADR-0010](./core/0010-multi-tenancy-architecture-strategy.md), [ADR-0051](./core/0051-enterprise-database-engine-strategy.md), [ADR-0043](./nodejs/0043-data-access-orm-strategy.md), [ADR-0057](./dotnet/0071-dotnet-data-access-orm-strategy.md), [ADR-0060](./dotnet/0060-dotnet-multi-tenancy-dual-layer-strategy.md), [ADR-0061](./dotnet/0061-transactional-event-lifecycle-ef-core.md) | Backend, Data, Architects | Universal plus runtime-specific |
| Security and identity | [ADR-0012](./nodejs/0012-advanced-authorization-rbac-abac.md), [ADR-0020](./core/0020-identity-provider-abstraction-strategy.md), [ADR-0026](./nodejs/0026-mfa-passwordless-adaptive-authentication.md), [ADR-0062](./dotnet/0062-dotnet-immutable-audit-trail.md) | Security, Backend | Universal plus Node.js |
| Observability and operations | [ADR-0007](./nodejs/0007-observability-telemetry-loki-opentelemetry.md), [ADR-0046](./core/0046-dapr-unified-observability.md), [ADR-0013](./core/0013-cloud-infrastructure-topology-dr.md), [ADR-0064 .NET](./dotnet/0064-dotnet-request-scope-observability-context.md), [ADR-0065 .NET](./dotnet/0065-dotnet-pii-safe-serilog-pipeline.md) | SRE, DevOps, Backend | Universal plus runtime-specific |
| API reliability and idempotency | [ADR-0063 .NET](./dotnet/0063-dotnet-b2b-idempotency-middleware.md), [ADR-0066 .NET](./dotnet/0066-dotnet-lightweight-http-idempotency.md) | Backend, SRE | .NET |
| Testing and quality | [ADR-0018](./core/0018-testing-pyramid-quality-gates.md), [ADR-0052](./core/0052-unit-testing-isolation-strategy.md), [ADR-0053](./core/0053-integration-e2e-testing-strategy.md) | QA, Developers | Universal |
| Frontend and UI modularity | [ADR-0004](./nodejs/0004-frontend-offline-resilience.md), [ADR-0055](./core/0055-microfrontends-architecture-strategy.md) | Frontend, Architects | Universal plus frontend implementation |
| Documentation and taxonomy | [ADR-0048](./core/0048-enterprise-taxonomy-reference-layout.md), [ADR-0049](./core/0049-naming-semantics-clean-code-policy.md), [ADR-0056](./core/0056-enterprise-naming-design-conventions.md) | All contributors | Universal |

---
[Back to ADR Registry](./README.md)
