# Matriz ADR

> Navegación bilingüe: [English](../adrs/adr-matrix.md)

Usa esta matriz cuando necesites encontrar decisiones por preocupación y no por ID numérico. Es intencionalmente selectiva: el registro ADR sigue siendo el catálogo completo.

| Preocupación | ADRs principales | Audiencia | Aplica a |
|---|---|---|---|
| Evolución progresiva | [ADR-0006](./core/0006-future-microservices-transition-dapr.es.md), [ADR-0045](./core/0045-microservice-extraction-readiness-criteria.es.md), [ADR-0047](./core/0047-architectural-patterns-monolith-soa-microservices.es.md) | Arquitectos, Staff Engineers | Universal |
| Selección de runtime | [ADR-0040](./core/0040-multi-runtime-selection-contracts.es.md), [.NET ADR-0041](./dotnet/0041-canonical-dotnet-backend-architecture.es.md), [Android ADR-0042](./android/0042-canonical-android-mobile-architecture.es.md) | Arquitectos, Tech Leads | Específico por runtime |
| API y gateway | [ADR-0030](./core/0030-api-gateway-kong-vs-nestjs.es.md), [ADR-0032](./core/0032-api-protocol-decision-matrix-rest-grpc-graphql.es.md), [ADR-0008](./nodejs/0008-progressive-multimodule-evolution-gateway-bff.es.md), [ADR-0063](./dotnet/0063-dotnet-b2b-idempotency-middleware.es.md) | Backend, Frontend, SRE | Universal más Node.js |
| Persistencia y datos | [ADR-0010](./core/0010-multi-tenancy-architecture-strategy.es.md), [ADR-0051](./core/0051-enterprise-database-engine-strategy.es.md), [ADR-0043](./nodejs/0043-data-access-orm-strategy.es.md), [ADR-0057](./dotnet/0071-dotnet-data-access-orm-strategy.es.md), [ADR-0060](./dotnet/0060-dotnet-multi-tenancy-dual-layer-strategy.es.md), [ADR-0061](./dotnet/0061-transactional-event-lifecycle-ef-core.es.md) | Backend, Data, Arquitectos | Universal más runtime específico |
| Seguridad e identidad | [ADR-0012](./nodejs/0012-advanced-authorization-rbac-abac.es.md), [ADR-0020](./core/0020-identity-provider-abstraction-strategy.es.md), [ADR-0026](./nodejs/0026-mfa-passwordless-adaptive-authentication.es.md), [ADR-0062](./dotnet/0062-dotnet-immutable-audit-trail.es.md) | Seguridad, Backend | Universal más Node.js |
| Observabilidad y operación | [ADR-0007](./nodejs/0007-observability-telemetry-loki-opentelemetry.es.md), [ADR-0046](./core/0046-dapr-unified-observability.es.md), [ADR-0013](./core/0013-cloud-infrastructure-topology-dr.es.md), [ADR-0064 .NET](./dotnet/0064-dotnet-request-scope-observability-context.es.md), [ADR-0065 .NET](./dotnet/0065-dotnet-pii-safe-serilog-pipeline.es.md) | SRE, DevOps, Backend | Universal más runtime específico |
| Confiabilidad de API e idempotencia | [ADR-0063 .NET](./dotnet/0063-dotnet-b2b-idempotency-middleware.es.md), [ADR-0066 .NET](./dotnet/0066-dotnet-lightweight-http-idempotency.es.md) | Backend, SRE | .NET |
| Testing y calidad | [ADR-0018](./core/0018-testing-pyramid-quality-gates.es.md), [ADR-0052](./core/0052-unit-testing-isolation-strategy.es.md), [ADR-0053](./core/0053-integration-e2e-testing-strategy.es.md) | QA, Developers | Universal |
| Frontend y modularidad UI | [ADR-0004](./nodejs/0004-frontend-offline-resilience.es.md), [ADR-0055](./core/0055-microfrontends-architecture-strategy.es.md) | Frontend, Arquitectos | Universal más implementación frontend |
| Documentación y taxonomía | [ADR-0048](./core/0048-enterprise-taxonomy-reference-layout.es.md), [ADR-0049](./core/0049-naming-semantics-clean-code-policy.es.md), [ADR-0056](./core/0056-enterprise-naming-design-conventions.es.md) | Todos los contribuidores | Universal |
| Contrato de salida máquina CLI/MCP | [ADR-0073](./core/0073-unified-cli-output-contract.es.md) | Tracker, CI/CD, agentes IA | Universal |

---
[Volver al Registro ADR](./README.es.md)
