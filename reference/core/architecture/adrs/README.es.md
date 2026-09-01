# Navegador de Registros de Decisión Arquitectónica (ADR)

> **Navegación bilingüe:** [English version](./README.md)

Bienvenido al repositorio legal del sistema. Todas las decisiones aquí contenidas han sido aprobadas por el Consejo de Arquitectura Corporativa.

> **Meta:** preservar cada decisión arquitectónica aceptada, clasificada por alcance, para que cualquier equipo encuentre el registro controlador en segundos.
>
> **Objetivos:** clasificar las decisiones de lo más general (Universal Core) a lo más específico (ecosistemas de runtime), mantener cada ADR conforme al estándar de autoría y exponer una matriz de decisiones para el descubrimiento por preocupación.

Empieza por la [Matriz de Decisiones ADR](./adr-matrix.es.md) cuando conozcas la preocupación pero no el número de registro.

Todo ADR debe cumplir el [Estándar de Autoría de ADRs](./adr-authoring-standard.es.md) — define la clasificación Core vs Plataforma, las secciones requeridas y las reglas de archivo e identidad.

Todos los ADRs aceptados son normativos (Obligatorio: Sí); los propuestos aún no son vinculantes (Obligatorio: No).

---

## <a name="universal-core"></a> 1. Universal Core (Agnóstico al Runtime)

Decisiones aplicables a cualquier producto construido sobre el framework, sin importar el lenguaje.

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [ADR 0001: Orquestación de Monorepo (Nx)](./core/0001-monorepo-orchestration-principle.es.md) | Decisión de orquestación del monorepo basada en Nx | Estandarizar la orquestación de builds | ADR Core | Sí |
| [ADR 0005: Calidad CI/CD (CodeQL)](./core/0005-automated-sast-quality-gates.es.md) | Quality gates de CI/CD con análisis estático | Hacer cumplir la calidad del pipeline | ADR Core | Sí |
| [ADR 0006: Microservicios Futuros (Dapr)](./core/0006-microservices-transition-sidecar-pattern.es.md) | Ruta de transición hacia microservicios usando Dapr | Preparar una descomposición controlada | ADR Core | Sí |
| [ADR 0009: Pinning Estricto de Dependencias](./core/0009-strict-dependency-pinning-vulnerability-management.es.md) | Pinning de dependencias y gestión de vulnerabilidades | Controlar la cadena de suministro | ADR Core | Sí |
| [ADR 0010: Estrategia Multi-Tenancy de Doble Capa](./core/0010-multi-tenancy-architecture-strategy.es.md) | Estrategia de arquitectura multi-tenant | Aislar tenants con seguridad | ADR Core | Sí |
| [ADR 0011: Patrones de Resiliencia](./core/0011-fault-tolerance-resiliency-patterns.es.md) | Patrones de tolerancia a fallos y resiliencia | Sobrevivir a fallos parciales | ADR Core | Sí |
| [ADR 0013: Topología Cloud y DR](./core/0013-cloud-infrastructure-topology-dr.es.md) | Topología de infraestructura cloud y recuperación ante desastres | Planificar infraestructura resiliente | ADR Core | Sí |
| [ADR 0014: Caché Distribuida (Redis)](./core/0014-multi-layer-distributed-caching-strategy.es.md) | Estrategia de caché distribuida | Estandarizar las decisiones de caché | ADR Core | Sí |
| [ADR 0015: Bus de Eventos Inyectable](./core/0015-event-driven-architecture-intra-domain.es.md) | Arquitectura orientada a eventos dentro de dominios | Desacoplar la comunicación de dominio | ADR Core | Sí |
| [ADR 0016: Auditoría Inmutable](./core/0016-immutable-business-audit-trail.es.md) | Pista de auditoría de negocio inmutable | Garantizar la auditabilidad | ADR Core | Sí |
| [ADR 0017: Estrategia de Feature Flags](./core/0017-feature-flagging-strategy.es.md) | Estrategia de feature flagging | Controlar el riesgo de rollout | ADR Core | Sí |
| [ADR 0018: Teoría de la Pirámide de Testing](./core/0018-testing-pyramid-quality-gates.es.md) | Pirámide de testing y quality gates | Equilibrar la inversión en pruebas | ADR Core | Sí |
| [ADR 0019: Diseño Funcional Táctico](./core/0019-tactical-design-patterns-future-proofing.es.md) | Patrones de diseño tácticos para durabilidad futura | Mantener los diseños evolutivos | ADR Core | Sí |
| [ADR 0020: Abstracción de IdP](./core/0020-identity-provider-abstraction-strategy.es.md) | Estrategia de abstracción del proveedor de identidad | Mantener la identidad reemplazable | ADR Core | Sí |
| [ADR 0024: Plataforma de Configuración y Features](./core/0024-configuration-feature-management-platform.es.md) | Plataforma de gestión de configuración y features | Centralizar la configuración | ADR Core | Sí |
| [ADR 0025: Abstracción del Proveedor de Feature Flags](./core/0025-feature-flag-provider-abstraction.es.md) | Abstracción del proveedor de feature flags | Mantener los vendors de flags reemplazables | ADR Core | Sí |
| [ADR 0028: Infraestructura OSS Auto-Hospedada](./core/0028-self-hosted-hybrid-infrastructure-on-premise.es.md) | Infraestructura híbrida on-premise auto-hospedada | Mantener neutralidad de proveedores en runtime | ADR Core | Sí |
| [ADR 0030: API Gateway (Kong vs Nest)](./core/0030-two-tier-distributed-gateway-model.es.md) | Trade-off de selección del API gateway | Estandarizar el perímetro | ADR Core | Sí |
| [ADR 0031: Schema Aislado por Contexto](./core/0031-schema-per-context-domain-event-catalog.es.md) | Schema por contexto y catálogo de eventos de dominio | Aislar los datos por contexto | ADR Core | Sí |
| [ADR 0032: Matriz de Selección de Protocolos](./core/0032-api-protocol-decision-matrix-rest-grpc-graphql.es.md) | Matriz de decisión REST vs gRPC vs GraphQL | Elegir protocolos consistentemente | ADR Core | Sí |
| [ADR 0033: Transactional Outbox](./core/0033-transactional-outbox-pattern.es.md) | Patrón transactional outbox | Garantizar mensajería confiable | ADR Core | Sí |
| [ADR 0034: Aplicabilidad de CQRS](./core/0034-cqrs-pattern-applicability-matrix.es.md) | Matriz de aplicabilidad del patrón CQRS | Acotar la adopción de CQRS | ADR Core | Sí |
| [ADR 0035: Sagas Distribuidas](./core/0035-distributed-saga-pattern-strategy.es.md) | Estrategia del patrón saga distribuida | Coordinar transacciones largas | ADR Core | Sí |
| [ADR 0036: Estrategia de Entrega del Message Bus](./core/0036-message-bus-delivery-strategy-fifo-dlq.es.md) | Entrega del bus de mensajes con FIFO y DLQ | Garantizar la semántica de entrega | ADR Core | Sí |
| [ADR 0037: Verificación de Performance y Caos](./core/0037-performance-concurrency-chaos-strategy.es.md) | Estrategia de performance, concurrencia y caos | Verificar el comportamiento bajo estrés | ADR Core | Sí |
| [ADR 0039: Conmutador de Topología de Despliegue](./core/0039-deployment-topology-abstraction-switcher.es.md) | Abstracción y conmutación de topologías de despliegue | Cambiar de topología con seguridad | ADR Core | Sí |
| [ADR 0040: Matriz Multi-Runtime y Contratos](./core/0040-multi-runtime-selection-contracts.es.md) | Selección multi-runtime y contratos (gobernanza raíz) | Gobernar la selección de runtimes | ADR Core | Sí |
| [ADR 0041: Evaluación de Políticas Dual-Engine](./core/0041-dual-engine-policy-evaluation.es.md) | Evaluación de Políticas Dual-Engine (Nativo + OPA) | Estandarizar la evaluación de políticas | ADR Core | Sí |
| [ADR 0044: Estrategia de Persistencia de Seguridad Configurable](./core/0044-configurable-security-persistence-strategy.es.md) | Estrategia configurable de persistencia de seguridad | Adaptar el almacenamiento de seguridad | ADR Core | Sí |
| [ADR 0045: Criterios de Preparación para Extracción de Microservicios](./core/0045-microservice-extraction-readiness-criteria.es.md) | Criterios de preparación antes de extraer microservicios | Custodiar la descomposición | ADR Core | Sí |
| [ADR 0046: Adopción de Dapr y Observabilidad Unificada](./core/0046-unified-observability-tracecontext.es.md) | Adopción de Dapr con observabilidad unificada | Estandarizar los sidecars de runtime | ADR Core | Sí |
| [ADR 0047: Monolito vs SOA vs Microservicios](./core/0047-architectural-patterns-monolith-soa-microservices.es.md) | Framework de selección entre patrones arquitectónicos | Elegir el patrón correcto | ADR Core | Sí |
| [ADR 0048: Taxonomía Empresarial y Layout de Referencia](./core/0048-enterprise-taxonomy-reference-layout.es.md) | Taxonomía empresarial y layout de referencia | Estandarizar el layout del repositorio | ADR Core | Sí |
| [ADR 0049: Semántica de Nombres y Política de Clean Code](./core/0049-naming-semantics-clean-code-policy.es.md) | Semántica de nombres y política de código limpio | Mantener el código legible | ADR Core | Sí |
| [ADR 0050: Estrategia de Branching Gitflow](./core/0050-gitflow-branching-strategy.es.md) | Estandarización del branching Gitflow | Estandarizar el branching | ADR Core | Sí |
| [ADR 0051: Estrategia de Motores de Base de Datos](./core/0051-enterprise-database-engine-strategy.es.md) | Estrategia empresarial de motores de base de datos | Acotar las elecciones de motor | ADR Core | Sí |
| [ADR 0052: Estrategia de Aislamiento en Pruebas Unitarias](./core/0052-unit-testing-isolation-strategy.es.md) | Estrategia de aislamiento en pruebas unitarias | Mantener honestas las pruebas unitarias | ADR Core | Sí |
| [ADR 0053: Estrategia de Pruebas de Integración y E2E](./core/0053-integration-e2e-testing-strategy.es.md) | Estrategia de pruebas de integración y de extremo a extremo | Verificar el comportamiento integrado | ADR Core | Sí |
| [ADR 0054: Estándares de Diseño y Normalización de Bases de Datos](./core/0054-database-design-normalization-standards.es.md) | Estándares de diseño y normalización de bases de datos | Estandarizar el diseño de datos | ADR Core | Sí |
| [ADR 0055: Estrategia de Arquitectura de Microfrontends](./core/0055-microfrontends-architecture-strategy.es.md) | Estrategia de arquitectura de microfrontends | Acotar la descomposición del frontend | ADR Core | Sí |
| [ADR 0056: Convenciones de Nombres y Diseño Empresariales](./core/0056-enterprise-naming-design-conventions.es.md) | Convenciones de nombres y diseño multi-lenguaje y multi-plataforma | Unificar las convenciones en todas partes | ADR Core | Sí |
| [ADR 0067: Monolito Modular con Schema por Dominio](./core/0067-modular-monolith-schema-per-domain.es.md) | Frontera de base de datos: schema por dominio | Aislar los datos por dominio | ADR Core | Sí |
| [ADR 0070: Taxonomía de Raíz Lean del Repositorio](./core/0070-lean-root-repository-taxonomy.es.md) | Taxonomía lean de la raíz del repositorio | Mantener la raíz gobernada | ADR Core | Sí |
| [ADR 0071: Estrategia de Clases Base en la Capa de Dominio](./core/0071-domain-layer-base-class-inheritance-strategy.es.md) | Estrategia de clases base y herencia en la capa de dominio | Acotar el uso de herencia | ADR Core | Sí |
| [ADR 0072: Fechas UTC, Zona Horaria y Resolución de Idioma](./core/0072-utc-dates-timezone-language-resolution.es.md) | Almacenamiento UTC, detección de zona horaria del navegador y resolución de idioma | Estandarizar tiempo y locale | ADR Core | Sí |
| [ADR 0073: Contrato Unificado de Salida CLI/MCP](./core/0073-unified-cli-output-contract.es.md) | Contrato unificado de salida CLI/MCP y schema de evidencia de gates | Unificar las superficies de salida de herramientas | ADR Core | Sí |
| [ADR 0074: Capa de Exposición Nativa del Evolith Core API](./core/0074-evolith-core-api-exposure-layer.es.md) | Capa de Exposición Nativa del Evolith Core API | Exposición oficial de red scalables | ADR Core | Sí |
| [ADR 0078: Gobernanza de Separación Financiera de Dominios](./core/0078-domain-financial-separation-governance.es.md) | Gobernanza de separación financiera de dominios | Hacer cumplir la frontera DDD entre Core y Tracker | ADR Core | Sí |
| [ADR 0079: Corpus de Referencia Multi-Topología](./core/0079-multi-topology-reference-corpus.es.md) | Corpus multi-topología y contrato de manifiesto | Gobernar perfiles topológicos y enforcement ejecutable | ADR Core | Sí |
| [ADR 0100: Frontera Gobierno/Ejecución](./core/0100-governance-execution-boundary-product-initiative.es.md) | Producto e Iniciativa como unidades primarias con capacidad de asesoría | Establecer frontera de gobernanza | ADR Core | Sí |
| [ADR 0101: Motor de Evaluación Stateless](./core/0101-core-stateless-evaluation-engine.es.md) | Evolith Core como un motor de evaluación stateless | Desacoplar lógica de evaluación del estado | ADR Core | Sí |
| [ADR 0102: Evolith Agent Runtime](./core/0102-evolith-agent-runtime.es.md) | Evolith Agent Runtime como capa agéntica desacoplada | Estandarizar ejecución agéntica | ADR Core | Sí |
| [ADR 0103: Architecture Planning Gate](./core/0103-architecture-planning-gate-intake.es.md) | Architecture Planning Gate como intake de pre-discovery | Establecer la etapa de admisión temprana | ADR Core | Sí |
| [ADR 0104: Gobernanza Advisory en Fase de Diseño](./core/0104-topology-driven-advisory-design-governance.es.md) | Gobernanza en diseño por topologías y blueprints | Gobernar composición mediante blueprints | ADR Core | Sí |
| [ADR 0105: Proyección de Conocimiento OKF](./core/0105-okf-knowledge-projection.es.md) | OKF como proyección portable del Knowledge OS | Estandarizar intercambio de conocimiento | ADR Core | Sí |
| [ADR 0106: Tenant Maestro y Proyecciones por Contexto](./core/0106-master-tenant-context-projections.es.md) | Registro de Tenant maestro en MMS y proyecciones de contexto — **superseded por ADR-0129**; MMS nunca se construyó | Aislar contextos de inquilino de forma segura | ADR Core | No |
| [ADR 0129: El maestro de Tenant es UMS](./core/0129-ums-is-the-tenant-master.es.md) | UMS posee el tenant y publica un retrato versionado que la suite proyecta | Poner la frontera del tenant donde está el código | ADR Core | Sí |

---

## <a name="nodejs-typescript"></a> 2. Ecosistema Node.js / TypeScript

Decisiones ligadas al runtime primario para APIs y BFFs.

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [ADR 0002: Clean Architecture NestJS](./nodejs/0002-clean-architecture-nestjs.es.md) | Layout de clean architecture para NestJS | Estandarizar las capas del backend | ADR Node.js | Sí |
| [ADR 0003: Estándares TS Estrictos](./nodejs/0003-strict-typescript-standards.es.md) | Estándares estrictos de compilador y lint para TypeScript | Endurecer el sistema de tipos | ADR Node.js | Sí |
| [ADR 0004: Resiliencia Offline del Frontend](./nodejs/0004-frontend-offline-resilience.es.md) | Estrategia de resiliencia offline del frontend | Sobrevivir a pérdidas de conectividad | ADR Node.js | Sí |
| [ADR 0007: Telemetría de Observabilidad OTel](./nodejs/0007-observability-telemetry-loki-opentelemetry.es.md) | Telemetría con Loki y OpenTelemetry | Instrumentar el runtime | ADR Node.js | Sí |
| [ADR 0008: Evolución Progresiva del BFF](./nodejs/0008-progressive-multimodule-evolution-gateway-bff.es.md) | Evolución progresiva multi-módulo con gateway/BFF | Evolucionar modularmente | ADR Node.js | Sí |
| [ADR 0012: Guards de Autorización RBAC/ABAC](./nodejs/0012-advanced-authorization-rbac-abac.es.md) | Autorización avanzada con RBAC/ABAC | Estandarizar la autorización | ADR Node.js | Sí |
| [ADR 0021: Compilación de Grafos de Auth](./nodejs/0021-high-performance-auth-and-graph-compilation.es.md) | Auth de alto rendimiento y compilación de grafos | Mantener la autorización rápida | ADR Node.js | Sí |
| [ADR 0022: Proyecciones Contextuales](./nodejs/0022-contextual-auth-and-pluggable-projections.es.md) | Auth contextual y proyecciones conectables | Adaptar las vistas por contexto | ADR Node.js | Sí |
| [ADR 0023: Frontera del Kernel Centralizado](./nodejs/0023-centralized-ums-vs-decentralized-access.es.md) | UMS centralizado vs acceso descentralizado | Acotar el kernel | ADR Node.js | Sí |
| [ADR 0026: Implementación Adaptativa de MFA](./nodejs/0026-mfa-passwordless-adaptive-authentication.es.md) | Autenticación MFA, passwordless y adaptativa | Fortalecer la autenticación | ADR Node.js | Sí |
| [ADR 0027: Setup Node de Doble Protocolo](./nodejs/0027-dual-protocol-rest-grpc-api-gateway.es.md) | API gateway de doble protocolo REST/gRPC | Servir ambos protocolos | ADR Node.js | Sí |
| [ADR 0029: Primitivas Tácticas DDD](./nodejs/0029-tactical-ddd-primitives-library.es.md) | Librería de primitivas tácticas DDD | Compartir bloques de construcción de dominio | ADR Node.js | Sí |
| [ADR 0038: Implementación TS del Patrón Result](./nodejs/0038-error-handling-result-pattern-strategy.es.md) | Manejo de errores mediante el patrón Result | Hacer los errores explícitos | ADR Node.js | Sí |
| [ADR 0043: Estrategia de Acceso a Datos y ORM](./nodejs/0043-data-access-orm-strategy.es.md) | Estrategia de acceso a datos y ORM | Estandarizar la persistencia | ADR Node.js | Sí |
| [ADR 0044: Capas de Clean Architecture en el Frontend](./nodejs/0044-frontend-clean-architecture-layer-boundaries.es.md) | Fronteras de capas de clean architecture en el frontend | Acotar las capas del frontend | ADR Node.js | Sí |
| [ADR 0045: Estado con Zustand + TanStack Query](./nodejs/0045-zustand-tanstack-query-state-management.es.md) | Gestión de estado con Zustand y TanStack Query | Estandarizar el estado del frontend | ADR Node.js | Sí |
| [ADR 0046: Sin Identificadores Crudos en la UI](./nodejs/0046-no-raw-identifiers-in-ui.es.md) | Prohibición de identificadores técnicos crudos en la UI | Proteger la UX y la seguridad | ADR Node.js | Sí |
| [ADR 0047: Contrato de Errores Accionables](./nodejs/0047-actionable-user-error-contract.es.md) | Errores de usuario accionables con diagnósticos correlacionados | Hacer los errores accionables | ADR Node.js | Sí |
| [ADR 0048: Alcance y Modelo de Criterios de Feature Flags](./nodejs/0048-feature-flag-system-scope-criteria-model.es.md) | Alcance del sistema de feature flags y criterios estructurados | Acotar el uso de flags | ADR Node.js | Sí |

---

## <a name="net-c"></a> 3. Ecosistema .NET (C#)

Decisiones ligadas a runtimes de alto cómputo.

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [ADR 0041: Arquitectura Backend .NET Canónica](./dotnet/0041-canonical-dotnet-backend-architecture.es.md) | Arquitectura backend canónica para .NET | Estandarizar los backends .NET | ADR .NET | Sí |
| [ADR 0070: Estrategia de Endpoints de API .NET](./dotnet/0070-enterprise-minimal-apis-adoption.es.md) | Adopción empresarial de Minimal APIs | Estandarizar la superficie de API | ADR .NET | Sí |
| [ADR 0071: Estrategia de Acceso a Datos .NET](./dotnet/0071-dotnet-data-access-orm-strategy.es.md) | Estrategia de acceso a datos (EF Core / Dapper) | Estandarizar la persistencia | ADR .NET | Sí |
| [ADR 0060: Multi-Tenancy .NET de Doble Capa](./dotnet/0060-dotnet-multi-tenancy-dual-layer-strategy.es.md) | Multi-tenancy con EF Core y SQL Server | Aislar tenants en .NET | ADR .NET | Sí |
| [ADR 0061: Ciclo de Vida Transaccional de Eventos](./dotnet/0061-transactional-event-lifecycle-ef-core.es.md) | Ciclo de vida transaccional de eventos en EF Core | Garantizar la consistencia de eventos | ADR .NET | Sí |
| [ADR 0062: Auditoría Inmutable .NET](./dotnet/0062-dotnet-immutable-audit-trail.es.md) | Auditoría mediante triggers DDL y captura de deltas | Garantizar la auditabilidad | ADR .NET | Sí |
| [ADR 0063: Middleware de Idempotencia B2B](./dotnet/0063-dotnet-b2b-idempotency-middleware.es.md) | Middleware de idempotencia de peticiones en ASP.NET Core | Hacer idempotentes las llamadas B2B | ADR .NET | Sí |
| [ADR 0064: Contexto de Observabilidad por Request](./dotnet/0064-dotnet-request-scope-observability-context.es.md) | Propagación del contexto de observabilidad por request | Correlacionar cada petición | ADR .NET | Sí |
| [ADR 0065: Pipeline Serilog Seguro para PII](./dotnet/0065-dotnet-pii-safe-serilog-pipeline.es.md) | Pipeline de logging estructurado seguro para PII | Loguear sin filtrar PII | ADR .NET | Sí |
| [ADR 0066: Idempotencia HTTP Ligera](./dotnet/0066-dotnet-lightweight-http-idempotency.es.md) | Idempotencia HTTP vía IMemoryCache / IDistributedCache | Hacer seguros los reintentos | ADR .NET | Sí |
| [ADR 0069: Setup de Servicios gRPC](./dotnet/0069-dotnet-grpc-service-setup-protobuf-contracts.es.md) | Setup de servicios gRPC con contratos protobuf | Estandarizar gRPC en .NET | ADR .NET | Sí |
| [ADR 0072: Estrategia AOP de Concerns Transversales .NET](./dotnet/0072-dotnet-aop-cross-cutting-concern-strategy.es.md) | Concerns transversales vía DispatchProxy | Centralizar el código transversal | ADR .NET | Sí |

---

## <a name="canonical-patterns"></a> 4. Patrones Canónicos (Implementaciones de Referencia por Runtime)

Blueprints de código listos para usar que implementan los ADRs anteriores. Adóptalos directamente en repositorios satélite.

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Índice de Patrones Canónicos](../patterns/README.es.md) | Índice de implementaciones de referencia específicas por runtime | Reutilizar implementaciones probadas | Índice de patrones | No |

---

## <a name="android-native"></a> 5. Ecosistema Android Nativo (Kotlin)

Decisiones ligadas a clientes móviles resilientes.

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [ADR 0042: Arquitectura Móvil Android Canónica](./android/0042-canonical-android-mobile-architecture.es.md) | Arquitectura canónica para clientes móviles Android | Estandarizar los clientes móviles | ADR Android | Sí |

---

## 6. ADRs para Arquitectura AI-Augmented (Sección Opcional)

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
Los ADRs de IA aceptados viven en [`ai-augmented/`](./ai-augmented/), dentro de este
árbol de ADRs:

| Documento | Descripción | Meta / Objetivo | Tipo | Obligatorio |
|---|---|---|---|---|
| [ADR 0001: Harness Engineering](./ai-augmented/0001-harness-engineering.es.md) | Harness Engineering para desarrollo aumentado por IA | Estandarizar los harnesses de agentes | ADR de IA (aceptado) | No |
| [ADR 0002: Protocolo de Integración MCP](./ai-augmented/0002-mcp-integration-protocol.es.md) | MCP como protocolo de integración agente-servicio | Estandarizar la integración de agentes | ADR de IA (aceptado) | No |
| [ADR 0003: Gobernanza de Selección de Modelos](./ai-augmented/0003-model-selection-governance.es.md) | Criterios de selección y gobernanza de modelos | Gobernar las elecciones de modelos | ADR de IA (aceptado) | No |
| [ADR 0004: AGENTS.md Artefacto Obligatorio](./ai-augmented/0004-agents-md-mandatory-artifact.es.md) | AGENTS.md como artefacto obligatorio (nivel 1+) | Hacer explícitas las reglas de agentes | ADR de IA (aceptado) | No |
| [ADR 0005: Política Human-in-the-Loop](./ai-augmented/0005-human-in-the-loop-policy.es.md) | Política Human-in-the-Loop para operaciones irreversibles | Mantener a los humanos accountable | ADR de IA (aceptado) | No |
| [ADR 0104: Interaction Adapter Port](./ai-augmented/ADR-0104-Interaction-Adapter-Port.es.md) | Puerto de adaptador de interacción para mediación agéntica | Acotar la costura de interacción agéntica | ADR de IA | No |

> **Existen dos conjuntos de ADRs de IA.** La tabla de arriba es la autoritativa
> (estado **Accepted**, 2026-06-23). Un conjunto anterior y más corto de propuestas
> (estado **Proposed**, 2026-05-11) vive en el corpus de IA en
> [06-adrs](../../foundations/common-rules/ai-augmented/06-adrs/README.es.md) bajo
> identificadores `ADR-AI-NNN`. Reconciliar ambos — superseder o fusionar el conjunto
> de propuestas — es decisión del Architecture Board y no se ha aplicado aquí.


---

[Volver al Hub de Arquitectura](../README.es.md)
