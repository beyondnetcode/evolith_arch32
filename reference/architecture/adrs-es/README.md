# Navegador de Registros de Decisión Arquitectónica (ADR)

> **Navegación Bilingüe:** [English Version](../../architecture/adrs/README.md)

Bienvenido al repositorio legal del sistema. Todas las decisiones contenidas aquí han sido aprobadas por la Junta Arquitectónica Corporativa.

Comienza con la [Matriz de Decisiones ADR](./adr-matrix.es.md) cuando conoces la necesidad, pero no el numero del registro.

---

## <a name="universal-core"></a> 1. Núcleo Universal (Agnóstico al Runtime)
Decisiones aplicables a cualquier producto construido sobre el framework, independientemente del lenguaje.

* [ADR 0001: Orquestación de Monorepo (Nx)](./core/0001-monorepo-orchestration-nx.md)
* [ADR 0005: Calidad CI/CD (CodeQL)](./core/0005-ci-cd-quality-codeql.md)
* [ADR 0006: Futuros Microservicios (Dapr)](./core/0006-future-microservices-transition-dapr.md)
* [ADR 0009: Fijación Estricta de Dependencias](./core/0009-strict-dependency-pinning-vulnerability-management.md)
* [ADR 0010: Estrategia Multi-Tenancy de Doble Capa](./core/0010-multi-tenancy-architecture-strategy.md)
* [ADR 0011: Patrones de Resiliencia](./core/0011-fault-tolerance-resiliency-patterns.md)
* [ADR 0013: Topología Cloud & DR](./core/0013-cloud-infrastructure-topology-dr.md)
* [ADR 0014: Caché Distribuido (Redis)](./core/0014-distributed-caching-strategy-redis.md)
* [ADR 0015: Bus de Eventos Inyectable](./core/0015-event-driven-architecture-intra-domain.md)
* [ADR 0016: Pista de Auditoría Inmutable](./core/0016-immutable-business-audit-trail.md)
* [ADR 0017: Estrategia de Feature Flagging](./core/0017-feature-flagging-strategy.md)
* [ADR 0018: Teoría de la Pirámide de Pruebas](./core/0018-testing-pyramid-quality-gates.md)
* [ADR 0019: Diseño Funcional Táctico](./core/0019-tactical-design-patterns-future-proofing.md)
* [ADR 0020: Abstracción de IdP](./core/0020-identity-provider-abstraction-strategy.md)
* [ADR 0024: Plataforma de Configuración y Características](./core/0024-configuration-feature-management-platform.md)
* [ADR 0025: Abstracción de Proveedor de Feature Flags](./core/0025-feature-flag-provider-abstraction.md)
* [ADR 0028: Infraestructura OSS Autohospedada](./core/0028-self-hosted-hybrid-infrastructure-on-premise.md)
* [ADR 0030: API Gateway (Kong vs Nest)](./core/0030-api-gateway-kong-vs-nestjs.md)
* [ADR 0031: Esquema Aislado Por Contexto](./core/0031-schema-per-context-domain-event-catalog.md)
* [ADR 0032: Matriz de Selección de Protocolo](./core/0032-api-protocol-decision-matrix-rest-grpc-graphql.md)
* [ADR 0033: Outbox Transaccional](./core/0033-transactional-outbox-pattern.md)
* [ADR 0034: Aplicabilidad de CQRS](./core/0034-cqrs-pattern-applicability-matrix.md)
* [ADR 0035: Sagas Distribuidas](./core/0035-distributed-saga-pattern-strategy.md)
* [ADR 0036: Estrategia de Entrega del Bus de Mensajes](./core/0036-message-bus-delivery-strategy-fifo-dlq.md)
* [ADR 0037: Rendimiento & Verificación del Caos](./core/0037-performance-concurrency-chaos-strategy.md)
* [ADR 0039: Conmutador de Topología de Despliegue](./core/0039-deployment-topology-abstraction-switcher.md)
* **[ADR 0040: Matriz Multi-Runtime & Contratos](./core/0040-multi-runtime-selection-contracts.md)** *(Gobernanza Raíz)*
* [ADR 0044: Estrategia de Persistencia de Seguridad Configurable](./core/0044-configurable-security-persistence-strategy.md)
* [ADR 0045: Criterios de Aceptación para Extracción de Microservicios](./core/0045-microservice-extraction-readiness-criteria.md)
* [ADR 0046: Adopción de Dapr y Observabilidad Unificada](./core/0046-dapr-observabilidad-unificada.md)
* [ADR 0047: Marco de Selección: Monolito vs SOA vs Microservicios](./core/0047-architectural-patterns-monolith-soa-microservices.md)
* [ADR 0048: Taxonomía Empresarial y Layout de Referencia](./core/0048-enterprise-taxonomy-reference-layout.md)
* [ADR 0049: Estándares de Semántica y Nomenclatura Clean Code](./core/0049-naming-semantics-clean-code-policy.md)
* [ADR 0050: Estandarización de la Estrategia de Ramas Gitflow](./core/0050-estrategia-ramas-gitflow.md)
* [ADR 0051: Estrategia Empresarial de Motor de Base de Datos](./core/0051-estrategia-motor-base-datos-empresarial.md)
* [ADR 0052: Estrategia de Aislamiento en Pruebas Unitarias](./core/0052-estrategia-aislamiento-pruebas-unitarias.md)
* [ADR 0053: Estrategia de Pruebas de Integración y E2E](./core/0053-estrategia-pruebas-integracion-e2e.md)
* [ADR 0054: Estándares de Diseño y Normalización de Base de Datos](./core/0054-estandares-diseño-normalizacion-base-datos.md)
* [ADR 0055: Estrategia de Arquitectura de Microfrontends](./core/0055-estrategia-arquitectura-microfrontends.md)
* **[ADR 0056: Convenciones Empresariales de Nomenclatura y Diseño — Multi-Lenguaje, Multi-Plataforma](./core/0056-convenciones-nomenclatura-diseno-empresarial.md)**

---

## <a name="nodejs-typescript"></a> 2. Ecosistema Node.js / TypeScript
Decisiones vinculadas al runtime primario para APIs y BFFs.

* [ADR 0002: Arquitectura Limpia NestJS](./nodejs/0002-clean-architecture-nestjs.md)
* [ADR 0003: Estándares TS Estrictos](./nodejs/0003-strict-typescript-standards.md)
* [ADR 0004: Resiliencia Offline del Frontend](./nodejs/0004-frontend-offline-resilience.md)
* [ADR 0007: Observabilidad Telemetría OTel](./nodejs/0007-observability-telemetry-loki-opentelemetry.md)
* [ADR 0008: Evolución Progresiva del BFF](./nodejs/0008-progressive-multimodule-evolution-gateway-bff.md)
* [ADR 0012: Guardias Auth RBAC/ABAC](./nodejs/0012-advanced-authorization-rbac-abac.md)
* [ADR 0021: Compilación de Grafo Auth](./nodejs/0021-high-performance-auth-and-graph-compilation.md)
* [ADR 0022: Proyecciones Contextuales](./nodejs/0022-contextual-auth-and-pluggable-projections.md)
* [ADR 0023: Límite de Kernel Centralizado](./nodejs/0023-centralized-ums-vs-decentralized-access.md)
* [ADR 0026: Implementación Adaptativa de MFA](./nodejs/0026-mfa-passwordless-adaptive-authentication.md)
* [ADR 0027: Configuración Node de Protocolo Dual](./nodejs/0027-dual-protocol-rest-grpc-api-gateway.md)
* [ADR 0029: Primitivas DDD Tácticas](./nodejs/0029-tactical-ddd-primitives-library.md)
* [ADR 0038: Implementación TS del Patrón Result](./nodejs/0038-error-handling-result-pattern-strategy.md)
* [ADR 0043: Estrategia de Acceso a Datos y ORM](./nodejs/0043-data-access-orm-strategy.md)

---

## <a name="net-c"></a> 3. Ecosistema .NET (C#)
Decisiones vinculadas a runtimes de alto cómputo.

* **[ADR 0041: Arquitectura de Backend Canónica .NET](./dotnet/0041-canonical-dotnet-backend-architecture.md)**
* [ADR 0048: Estrategia de Endpoints en APIs .NET](./dotnet/0070-enterprise-minimal-apis-adoption.md)
* **[ADR 0057: Estrategia de Acceso a Datos .NET (EF Core / Dapper)](./dotnet/0071-estrategia-acceso-datos-orm-dotnet.md)**
* [ADR 0060: Estrategia de Multi-Tenancy de Doble Capa en .NET (EF Core y SQL Server)](./dotnet/0060-dotnet-multi-tenancy-dual-layer-strategy.md)
* [ADR 0061: Ciclo de Vida Transaccional de Eventos en EF Core](./dotnet/0061-transactional-event-lifecycle-ef-core.md)
* [ADR 0062: Pista de Auditoría Inmutable en .NET vía Triggers DDL y Captura de Deltas](./dotnet/0062-dotnet-immutable-audit-trail.md)
* [ADR 0063: Middleware de Idempotencia para Peticiones B2B en ASP.NET Core](./dotnet/0063-dotnet-b2b-idempotency-middleware.md)

---

## <a name="android-native"></a> 4. Ecosistema Nativo Android (Kotlin)
Decisiones vinculadas a clientes móviles resilientes.

* **[ADR 0042: Arquitectura Canónica Móvil Android](./android/0042-canonical-android-mobile-architecture.md)**

---

## ADRs para Arquitectura Aumentada por IA (Sección Opcional)

| ID | Título | Estado |
|----|--------|--------|
| ADR-AI-001 | Harness Engineering como estándar agéntico | Propuesto |
| ADR-AI-002 | MCP como protocolo de integración agente-servicio | Propuesto |
| ADR-AI-003 | Criterios de selección y gobernanza de modelos | Propuesto |
| ADR-AI-004 | AGENTS.md como artefacto obligatorio (nivel 1+) | Propuesto |
| ADR-AI-005 | Política de Human-in-the-Loop para operaciones irreversibles | Propuesto |

-> [Ver todos los ADRs de IA](../../governance/standards-es/ai-augmented/06-adrs/README.md)

---
[Volver al Nivel Superior](../../README.es.md)
