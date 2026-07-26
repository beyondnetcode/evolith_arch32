# Evolith Core — Evaluación de Madurez

> **Navegación Bilingüe:** [English Version](./maturity-assessment.md)

**Estado:** Evaluación Activa
**Responsable:** Evolith Architecture Board
**Creado:** 2026-06-10 (consolida los antiguos `maturity-matrix.es.md` y `maturity-evaluation.es.md`)
**Última Actualización:** 2026-07-26
**Documento compañero:** [Tablero de Seguimiento de Gaps](../gaps/gap-tracking.es.md) — la única superficie de tracking para todo gap referenciado aquí.

---

## 1. Propósito y Frameworks

Esta es la **única evaluación de madurez** de Evolith Core. Es una **evaluación bidimensional** que mide dos aspectos ortogonales de la plataforma:

**Dimensión A — Madurez de Calidad Interna:** Qué tan bien está construido Evolith Core. Medido contra TOGAF ACMM, Cloud WAF, catálogos internacionales de patrones y niveles de madurez de adaptadores (secciones 3–7).

**Dimensión B — Madurez de Alcance de Gobernanza:** Qué tan amplio es el alcance de gobernanza arquitectónica de Evolith Core. Medido contra su propio modelo dimensional multi-topológico en 5 dimensiones y 8 topologías componibles, más madurez AI-Augmented (secciones 8–10).

Esta visión dual previene un fallo de evaluación común: una plataforma con alta calidad interna pero alcance de gobernanza estrecho es fundamentalmente diferente de una con la misma calidad y cobertura topológica de espectro completo. Evolith Core es esta última.

Específicamente, la evaluación mide:

1. **Compatibilidad con estándares internacionales** — TOGAF ACMM para madurez de gobernanza de procesos enterprise, pilares Cloud WAF para madurez técnica (sección 3), catálogo enterprise de patrones/anti-patrones (secciones 6–7) y madurez de capacidades de adaptadores (sección 5).
2. **Alcance de gobernanza multi-topología** — cobertura a través de las 5 dimensiones topológicas (progressive-axis, execution, integration, data, ai) con 8 topologías componibles. La paridad dual-engine se reporta por artefacto en la sección 8 (corpus del repositorio, paquete publicado, gate bloqueante) en vez de afirmarse como una única cifra global.
3. **Madurez AI-Augmented** — posición contra la matriz de madurez AI de 3 niveles × 5 dimensiones (sección 10).
4. **Match con la visión del producto** — alineación pilar por pilar contra la [Visión Maestra del Producto](../../../../product/suite/vision/evolith-product-vision-master.es.md) (sección 9).
5. **Gaps abiertos** — toda desviación encontrada aquí se registra exclusivamente como ítem `GT-xx` en el [Tablero de Seguimiento de Gaps](../gaps/gap-tracking.es.md) (sección 12). Ningún gap se trackea en este documento.

**Cómo actualizar:** re-puntúa una sección cuando cambie su evidencia subyacente (ADR mergeado, gate cerrado, ítem GT completado), actualiza `Última Actualización`, y mantén el registro de gaps en el tablero — nunca aquí.

---

## 2. Definición de Niveles de Madurez y Estados con Evidencia

La evaluación usa los 5 niveles estándar del ACMM (1: Inicial a 5: Optimizante). Sin embargo, para evitar mezclar capacidades diseñadas con las validadas, cada capacidad debe declarar su **Estado basado en Evidencia**:

* **Visionado** (Peso 0.0) — Concepto o estrategia únicamente. Sin diseño formal.
* **Diseñado** (Peso 0.2) — Architecture Decision Record (ADR) aprobado, sin implementación de código.
* **Prototipado** (Peso 0.5) — Prueba de concepto o PR en borrador. No apto para producción.
* **Implementado** (Peso 0.8) — Mergeado en `main` y ejecutable, pero sin métricas operacionales completas o tests automáticos.
* **Validado** (Peso 1.0) — Pasa todos los quality gates, tests y está activo en CI/CD.
* **Escalado** (Peso 1.2+) — Multi-región, auto-escalado dinámicamente, o endurecido por chaos engineering.

*Sólo los estados "Validado" o "Escalado" otorgan el puntaje total del Nivel ACMM. Los estados "Diseñado" o "Implementado" imponen una penalización de incertidumbre en el puntaje agregado.*

---

## 3. Evaluación de la Arquitectura Runtime (Pilares Well-Architected)

### Pilar 1: Seguridad y Compliance — **Nivel 4 (Gestionado)**
* **Estado:** `Diseñado` — degradado desde `Validado` por [GT-576](../gaps/gap-reference-catalog.es.md#gt-576). Los dos controles sobre los que se puntuaba este pilar (aislamiento de tenant, auditoría inmutable) tienen ADR aprobado y cero código.
* **Evidencia — ejecutable (corre en CI):**
  * Pipeline de seguridad zero-cost vía CodeQL ([ADR-0005](../../architecture/adrs/core/0005-automated-sast-quality-gates.es.md)) — job `codeql-analysis` en `.github/workflows/sdk-cli-ci.yml:362`, junto a Trivy (`sdk-cli-ci.yml:389`) y detección de secretos con gitleaks (`sdk-cli-ci.yml:418`).
  * Gestión automatizada de vulnerabilidades ([ADR-0009](../../architecture/adrs/core/0009-strict-dependency-pinning-vulnerability-management.es.md)) — `npm audit --audit-level=high` en el job `security-audit` en `.github/workflows/sdk-cli-ci.yml:83`. La fijación exacta de versiones es la convención en cada manifiesto de workspace, pero ningún gate rechaza todavía un especificador de rango: el pinning se observa, no se impone.
* **Intención — ADR aprobado, sin implementación (no debe leerse como evidencia):**
  * Aislamiento de datos multi-tenant vía Row-Level Security ([ADR-0010](../../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.es.md)) — **no implementado.** `grep -rniE 'row.level.security|current_setting\('` sobre `src/` solo matchea prosa de patrones de topología (`src/rulesets/topologies/event-driven/patterns.md`), y ningún workspace bajo `src/` declara driver de PostgreSQL ni ORM.
  * Audit trails inmutables vía CDC ([ADR-0016](../../architecture/adrs/core/0016-immutable-business-audit-trail.es.md)) — **no implementado.** No existe componente CDC, ni dependencia `debezium`, ni capa de persistencia desde la cual capturar cambios.
* **Camino a `Implementado`:** una capa de persistencia con la política RLS realmente aplicada y un almacén de auditoría append-only, cada uno cubierto por un test que falle cuando se retire el aislamiento.
* **Camino al Nivel 5:** penetration testing automatizado en CI; rotación dinámica de secretos.

### Pilar 2: Eficiencia de Rendimiento — **Nivel 4 (Gestionado)**
* **Estado:** `Implementado` (Requiere validación por load testing)
* **Evidencia:**
  * Compilación del grafo de auth bajo 5 ms usando Redis ([ADR-0021](../../architecture/adrs/nodejs/0021-high-performance-auth-and-graph-compilation.es.md)).
  * Estrategia dual-protocolo: REST público, gRPC interno ([ADR-0027](../../architecture/adrs/nodejs/0027-dual-protocol-rest-grpc-api-gateway.es.md)).
  * Payloads frontend optimizados vía BFF Gateway ([ADR-0008](../../architecture/adrs/nodejs/0008-progressive-multimodule-evolution-gateway-bff.es.md)).
* **Camino al Nivel 5:** auto-escalado serverless; caching predictivo.

### Pilar 3: Confiabilidad y Resiliencia — **Nivel 3 (Definido)**
* **Estado:** `Diseñado` (ADRs aprobados, faltan pruebas de circuit breaker)
* **Evidencia:**
  * Resiliencia offline de frontend vía React Query ([ADR-0004](../../architecture/adrs/nodejs/0004-frontend-offline-resilience.es.md)).
  * Circuit breakers (`opossum`) y retries ([ADR-0011](../../architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.es.md)).
  * Topología DR multi-región propuesta ([ADR-0013](../../architecture/adrs/core/0013-cloud-infrastructure-topology-dr.es.md)).
* **Camino al Nivel 5:** drills regulares de chaos engineering; multi-región activo-activo.

### Pilar 4: Excelencia Operacional — **Nivel 4 (Gestionado)**
* **Estado:** `Implementado` — degradado desde `Validado` por [GT-576](../gaps/gap-reference-catalog.es.md#gt-576). La cita de orquestación de builds nombraba una herramienta que nunca se adoptó, y una capacidad de la lista no tiene código.
* **Evidencia — ejecutable (corre en CI):**
  * Quality gates aplican umbrales de coverage en CI ([ADR-0018](../../architecture/adrs/core/0018-testing-pyramid-quality-gates.es.md)) — el step `Check Coverage Threshold` en `.github/workflows/sdk-cli-ci.yml:195` hace fallar el job `unit-tests` por debajo del umbral.
  * Builds deterministas de monorepo ([ADR-0001](../../architecture/adrs/core/0001-monorepo-orchestration-principle.es.md)) — npm workspaces más project references de TypeScript (`npm run build` es `tsc -b tsconfig.json`) sobre un `package-lock.json` exacto. **La orquestación con Nx citada en revisiones anteriores de este documento no está adoptada:** no existe `nx.json` ni dependencia `nx` en todo el árbol.
  * Telemetría vía OpenTelemetry ([ADR-0007](../../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.es.md)) — `NodeSDK` inicializado en `src/apps/core-api/src/tracing.ts:7`. El lado colector LGTM es un asunto de despliegue y no se evidencia aquí.
* **Intención — ADR aprobado, sin implementación (no debe leerse como evidencia):**
  * Feature flagging desacopla deployment de release ([ADR-0017](../../architecture/adrs/core/0017-feature-flagging-strategy.es.md)) — **no implementado.** No existe proveedor de flags, ni código de evaluación de flags, ni almacén de flags bajo `src/`.
* **Camino al Nivel 5:** deployments blue/green autónomos; detección de anomalías en logs con IA.

### Pilar 5: Mantenibilidad y Extensibilidad — **Nivel 4 (Gestionado)**
* **Estado:** `Validado`
* **Evidencia — ejecutable (corre en CI):**
  * Boundaries hexagonales desacoplando core de infraestructura ([ADR-0002](../../architecture/adrs/nodejs/0002-clean-architecture-nestjs.es.md)) — impuestos por `eslint-plugin-boundaries` y por el boundary guard del repositorio `.harness/scripts/ci/34-boundary-guard-repository.mjs`, ejecutado en el job `Validate documentation` en `.github/workflows/docs.yml:113`.
  * Patrones de diseño táctico ([ADR-0019](../../architecture/adrs/core/0019-tactical-design-patterns-future-proofing.es.md)) — los resultados viajan como value types explícitos que transportan el desenlace, `GateEvaluationResult` en `src/packages/core-domain/src/evaluation/contracts/evaluation-result.ts:108`, en lugar de como excepciones. Revisiones anteriores hablaban de una "monada Result": no existe tipo `Result<T, E>` ni dependencia `neverthrow`/`fp-ts` en el árbol, así que ese patrón concreto **no** está adoptado.
  * Desacoplamiento event-driven de módulos de dominio ([ADR-0015](../../architecture/adrs/core/0015-event-driven-architecture-intra-domain.es.md)) — puerto en `src/packages/core-domain/src/application/ports/event-bus.port.ts:10`, adapter en `src/packages/core-domain/src/infrastructure/events/in-memory-event-bus.ts:13`.
* **Camino al Nivel 5:** transición monolito-a-Dapr con cero cambios de dominio ([ADR-0006](../../architecture/adrs/core/0006-microservices-transition-sidecar-pattern.es.md)). Nota: el enforcement hexagonal estricto en el propio CLI sigue abierto — ver [GT-19](../gaps/gap-reference-catalog.es.md#gt-19).

---

## 4. Evaluación de la Exposición Tecnológica (CLI + MCP)

### Dimensión 1: Conformidad de Protocolo MCP y Transporte — **Nivel 4 (Gestionado)**
* **Estado:** `Validado`
* **Evidencia:** JSON-RPC 2.0 por stdio y Streamable HTTP oficial del SDK MCP; autenticación por API key; 29 casos E2E MCP; el smoke verifica initialize, discovery, métricas y evaluación de gates en ambos transportes. Ejecutado en CI por el job `e2e-tests` (`.github/workflows/sdk-cli-ci.yml:323`), cuyo step `npm run mcp:smoke` está en `.github/workflows/sdk-cli-ci.yml:357`. Ver la [reconciliación de madurez](./maturity-reconciliation.json) generada.
* **Camino al Nivel 5:** conformidad de protocolo automatizada contra las versiones soportadas de la especificación MCP.

### Dimensión 2: Cobertura de Tests y Quality Gates — **Nivel 4 (Gestionado)**
* **Estado:** `Validado`
* **Evidencia:** 1,206 tests unitarios y 121 E2E pasan desde un checkout limpio, y la cobertura de statements es 80,65% (4.979/6.173) frente al umbral normativo de 80%, restaurada bajo [GT-48](../gaps/gap-reference-catalog.es.md#gt-48) testeando los native rule handlers, validators y filesystem providers. El umbral se impone, no solo se reporta: el step `Check Coverage Threshold` en `.github/workflows/sdk-cli-ci.yml:195` hace fallar el build por debajo de él. La [reconciliación de madurez](./maturity-reconciliation.json) generada registra el resultado ejecutable y su origen.
* **Camino al Nivel 5:** umbrales de cobertura durables por-run en la configuración de Jest ([GT-50](../gaps/gap-reference-catalog.es.md#gt-50)) y mutation testing.

### Dimensión 3: Completitud de Exposición de Gobernanza — **Nivel 4 (Gestionado)**
* **Estado:** `Validado`
* **Evidencia:** los tools, resources y prompts MCP cubren validación, agentes, arquitectura, SDLC, priorización, métricas y evaluación de gates con checks de conformidad de schemas runtime. El inventario se mantiene honesto mediante el guard bidireccional de paridad de superficie `.harness/scripts/ci/24-check-surface-parity.mjs`, ejecutado en `.github/workflows/docs.yml:92`: toda operación del árbol de fuentes debe aparecer en la matriz, y toda referencia de la matriz debe resolver a código real. Las cifras absolutas no se repiten aquí de forma deliberada — revisiones anteriores citaban 47 en esta sección y 50 en la sección 10.1, y ningún gate reconciliaba ambas.
* **Camino al Nivel 5:** hot-reload de rulesets y adopción medida en repositorios satélite.

### Dimensión 4: Experiencia de Desarrollador CLI — **Nivel 4 (Gestionado)**
* **Estado:** `Validado`
* **Evidencia:** el paquete `@beyondnet/evolith-cli@1.1.0` se instala desde el lockfile canónico del workspace, verificado por el job `package-integrity` en `.github/workflows/sdk-cli-ci.yml:257`; lint, build, E2E y smoke MCP pasan desde un checkout limpio; shell completion y documentación bilingüe están disponibles. La documentación pública de producto y los hechos de release se sincronizan desde un [Inventario de Superficie del Producto](../../../../product/products/smart-cli/product-inventory.es.md) generado, con CI que rechaza drift y páginas placeholder ([GT-47](../gaps/gap-reference-catalog.es.md#gt-47)).
* **Camino al Nivel 5:** publicar el inventario como un manifiesto de capacidades descubrible consumido por repositorios satélite.

### Dimensión 5: Enforcement Runtime de Gobernanza Federada — **Nivel 3 (Definido)**
* **Estado:** `Diseñado` (Existen reglas, falta validación de contenido)
* **Evidencia:** modelo de herencia, contratos de satélites y reglas de boundary Open-Core definidos; `evolith-cli validate` ejecutable por cualquier satélite; composite action de CI `evolith-validate` disponible para gates de PR en satélites.
* **Camino al Nivel 4:** evidencia de phase gates profundizada de chequeos de solo-existencia a validación de contenido/umbral ([GT-08](../gaps/gap-reference-catalog.es.md#gt-08)–[GT-11](../gaps/gap-reference-catalog.es.md#gt-11)); adapters ACL runtime (alcance Tracker).

---

## 5. Madurez de Capacidades de Adaptadores (Agent Runtime)

Esta dimensión mide la madurez de las superficies de interacción y los puertos de orquestación internos contra las reglas de límites stateless del Evolith Core.

**Niveles de Madurez:**
* **M0 — No identificado:** Capacidad conceptualizada pero no se ha definido puerto/interfaz.
* **M1 — Documentado:** Requisito o diseño documentado, sin código.
* **M2 — Puerto definido:** Existe interfaz de TypeScript (`IPort`).
* **M3 — Adaptador Stub/InMemory implementado:** La implementación existe pero simula el comportamiento (no listo para producción).
* **M4 — Adaptador de Producción implementado:** Integración real implementada (ej. HTTP, Redis).
* **M5 — Gobernado, observable y testeado:** Completamente cubierto por OPA, tracing, flujos de aprobación y gates de CI.

### 5.1 Adaptadores de Interacción (Evaluación M-Level)

Los 6 adaptadores de interacción han sido implementados como adaptadores de producción (M4). Ninguno ha alcanzado M5.

| Adaptador | Nivel-M | Tests | Prioridad | Gaps a M5 |
|---|:---:|:---|:---|:---|
| `McpInteractionAdapter` | **M4** | 11 tests unitarios | Alta | OPA guard, tracing, registro en manifest |
| `SmartCliCommandInteractionAdapter` | **M4** | Ninguno | Crítica | Tests unitarios, edge cases, registro en manifest |
| `SmartCliChatInteractionAdapter` | **M4** | Ninguno | Crítica | Tests unitarios, edge cases, registro en manifest |
| `HermesChatBoxInteractionAdapter` | **M4** | Ninguno | Alta | Tests unitarios, registro en manifest, docs standalone |
| `OpenCodeInteractionAdapter` | **M4** | Ninguno | Media | SourceInterface propio, tests, manifest |
| `ExternalTriggerInteractionAdapter` | **M4** | Ninguno | Alta | Validación de input, tests, registro en manifest |

**Distribución:** 0 M0-M3 · **6 M4** · 0 M5

**Gaps transversales a M5:** Solo `McpInteractionAdapter` tiene cobertura de tests. Los 5 adaptadores restantes comparten: tests unitarios faltantes, sin registro en manifest, sin referencias en definiciones de agentes, sin integración OPA/trace/HITL a nivel de adaptador (manejado downstream en el pipeline runtime pero no a nivel de adaptador).

### 5.2 Adaptadores de Puertos (Inventario de Capacidades)

| Capacidad / Puerto | Objetivo | Implementado Actualmente | Estado | Pendiente / Recomendado | Prioridad |
|---|---|---|---|---|---|
| **Agent Engine** | Razonamiento agentic reemplazable. | `StubAgentEngineAdapter`, `HermesAgentAdapter`, `SwarmsAgentAdapter`, `RoutingAgentAdapter` | `Implementado` | `OpenCodeAgentAdapter`, `OllamaLocalAgentAdapter`, `OpenAIAdapter`, `ClaudeAdapter`, `GeminiAdapter` | Media |
| **Engine Routing** | Elegir motor por contexto o intención. | `RoutingAgentAdapter` | `Parcial` | `PolicyBasedEngineRouter`, `RiskAwareEngineRouter`, `CostAwareEngineRouter`, `PrivacyAwareEngineRouter` | Alta |
| **Harness Execution** | Ejecutar capacidades `.harness` (simuladas o reales). | `InMemoryHarnessAdapter`, `HarnessProcessAdapter` | `Implementado` | `DockerHarnessAdapter`, `KubernetesJobHarnessAdapter`, `RemoteHarnessAdapter`, `GitHubActionsHarnessAdapter` | Media |
| **Core Evaluation** | Evaluar reglas, gaps y gobernanza. | `StubCoreEvaluationAdapter`, `InProcessCoreEvaluationAdapter`, `HttpCoreEvaluationAdapter` | `Implementado` | `GrpcCoreEvaluationAdapter`, `BatchCoreEvaluationAdapter`, `CachedCoreEvaluationAdapter` | Media |
| **Policy / OPA** | Validar políticas y bloquear acciones. | `StubPolicyValidationAdapter`, `OpaCliPolicyValidationAdapter` | `Implementado` | `OpaHttpAdapter`, `ConftestAdapter`, `KyvernoAdapter`, `PolicyBundleRegistryAdapter` | Alta |
| **Tracker Trace** | Publicar trazabilidad al Tracker o memoria. | `InMemoryTrackerTraceAdapter`, `HttpTrackerTraceAdapter` | `Implementado` | `EventBusTraceAdapter`, `KafkaTraceAdapter`, `OpenTelemetryTraceAdapter`, `AuditLogTraceAdapter` | Media |
| **Memory** | Memoria temporal o persistida. | `InMemoryMemoryAdapter`, `FileMemoryAdapter` | `Implementado` | `RedisMemoryAdapter`, `PostgresMemoryAdapter`, `VectorMemoryAdapter`, `ObsidianVaultMemoryAdapter` | Media |
| **Skill Registry** | Resolver intents a capacidades gobernadas. | `LocalSkillRegistryAdapter`, `DEFAULT_SKILLS` | `Implementado` | `RemoteSkillRegistryAdapter`, `GitSkillRegistryAdapter`, `MarketplaceSkillRegistryAdapter`, `TenantSkillBundleAdapter` | Alta |
| **Communication Gateway** | Adaptar superficies de comunicación. | `CliCommunicationGatewayAdapter` + 6 adaptadores de interacción (ver 5.1) | `Implementado` | `WebhookInteractionAdapter` | Crítica |
| **Scheduler** | Programar o diferir ejecuciones. | `InMemorySchedulerAdapter`, `FileSchedulerAdapter` | `Implementado` | `CronSchedulerAdapter`, `TemporalAdapter`, `BullMQSchedulerAdapter`, `KubernetesCronJobAdapter` | Baja |
| **Approval / HITL** | Flujo de aprobación humana en el loop. | `AutoApprovalAdapter`, `DenyByDefaultApprovalAdapter` | `Parcial` | `TrackerApprovalAdapter`, `GitHubApprovalAdapter`, `SlackApprovalAdapter`, `TeamsApprovalAdapter`, `EmailApprovalAdapter` | Alta |
| **Knowledge / RAG** | Consultar ADRs, reglas, manuales antes de actuar. | `PgVectorKnowledgeAdapter` (deploy-gated), `InMemoryMemoryAdapter` (default) | `Implementado (deploy-gated)` | Ejecución live pgvector + sidecar | Alta |
| **Observability** | Observar runtime, motores y latencias. | Parcial vía Tracker Trace. | `Parcial` | `OpenTelemetryAdapter`, `PrometheusMetricsAdapter`, `StructuredAuditAdapter` | Media |
| **GitHub Automation** | Crear repos, PRs y CI desde flujos gobernados. | No implementado como adaptador directo. | `No implementado` | `GitHubRepositoryAdapter`, `GitHubIssueAdapter`, `GitHubPullRequestAdapter`, `GitHubActionsAdapter` | Media |
| **Notifications / Collaboration** | Notificar puertas bloqueadas, aprobaciones, etc. | No implementado como adaptador directo. | `No implementado` | `SlackAdapter`, `TeamsAdapter`, `EmailNotificationAdapter`, `DiscordAdapter` | Media |
| **Secrets / Config** | Gestión de credenciales, selección de engine, config. | Parcial vía bootstrap/overrides. | `Parcial` | `VaultSecretAdapter`, `EnvConfigAdapter`, `RemoteConfigAdapter`, `PolicyBundleConfigAdapter` | Alta |

---

## 6. Matriz de Madurez de Patrones (Catálogo Internacional de Patrones)

| Cluster de Patrón | Patrón Específico | Aplicabilidad | Estado Basado en Evidencia | Justificación |
| :--- | :--- | :--- | :--- | :--- |
| **Integración** | **Strangler Fig** | Core Crítico | `Validado` | Estrategia fundacional: módulos lógicamente aislados para extracción incremental sin downtime. |
| **Composición** | **BFF (Backend for Frontend)** | Core Obligatorio | `Implementado` | Capas NestJS especializadas por dispositivo ([ADR-0008](../../architecture/adrs/nodejs/0008-progressive-multimodule-evolution-gateway-bff.es.md)). |
| **Confiabilidad** | **Circuit Breaker** | Operacional | `Diseñado` | Breakers distribuidos compartiendo estado vía Redis ([ADR-0011](../../architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.es.md)) + healthchecks de edge. |
| **Base de Datos** | **Schema Per Context** | Core Obligatorio | `Diseñado` | Pensado para prevenir la contaminación de joins cross-dominio ([ADR-0031](../../architecture/adrs/core/0031-schema-per-context-domain-event-catalog.es.md)). Degradado desde `Validado` por [GT-576](../gaps/gap-reference-catalog.es.md#gt-576): ningún workspace bajo `src/` declara driver de base de datos ni ORM, así que no existe frontera de schema que validar. |
| **Escalabilidad** | **CQRS (Básico)** | Opcional | `Visionado` | Read-models solo cuando la contención de escritura lo exija. |
| **Consistencia** | **Patrón Saga** | Futuro Distribuido | `Visionado` | Reservado para transacciones distribuidas de Fase 3+. |
| **Mensajería** | **Transactional Outbox** | Fase 2+ | `Visionado` | Consistencia atómica estado-DB/eventos a escala asíncrona. |

**Leyenda:** *Adoptado* — completamente diseñado y verificado en specs. *Roadmap* — infraestructura lista, implementación diferida a demanda. *Incompatible* — ninguno identificado actualmente.

---

## 7. Inmunización contra Anti-Patrones

La arquitectura despliega "anticuerpos" explícitos contra los seis anti-patrones de mayor riesgo. Resumen (criticidad · defensa):

| Anti-Patrón | Criticidad | Defensa de Inmunización |
| :--- | :--- | :--- |
| **Monolito Distribuido** | EXTREMA | Bus de eventos asíncrono ([ADR-0015](../../architecture/adrs/core/0015-event-driven-architecture-intra-domain.es.md)) + aislamiento hexagonal ([ADR-0002](../../architecture/adrs/nodejs/0002-clean-architecture-nestjs.es.md)): mensajería fire-and-forget, sin cadenas síncronas cross-módulo. |
| **Entrelazamiento de BD Compartida** | MUY ALTA | *Defensa diseñada, aún no desplegada.* Schema PostgreSQL aislado por contexto ([ADR-0031](../../architecture/adrs/core/0031-schema-per-context-domain-event-catalog.es.md)) con joins cross-schema físicamente bloqueados — todavía no existe capa de persistencia, así que el anti-patrón está ausente, no inmunizado. |
| **Fat Controller / Smart Pipe** | ALTA | Dumb Pipes / Smart Endpoints: el gateway ejecuta solo políticas agnósticas (JWT, SSL, rate limit); toda decisión de negocio vive en el hexágono de aplicación testeado. |
| **Log Shards (Ceguera)** | ALTA | Tracing distribuido OTel ([ADR-0007](../../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.es.md)): un TraceParent ID desde el inicio del request hasta la respuesta de BD. |
| **God Module** | ALTA | Auditorías regulares de boundaries contra el [Modelo de Referencia Aplicado UMS](../../../../product/research/demo/README.es.md); el playbook de extracción divide antes de que un módulo crezca demasiado. |
| **Leaky Shared Library** | ALTA | Libs compartidas restringidas a primitivas genéricas y utilidades DDD; objetos de dominio prohibidos, enforced vía `eslint-plugin-boundaries`. |

**Fortaleza de resiliencia: DISEÑADA** — circuit breakers + contract testing están especificados para blindar el backend contra fallas en cascada. El aislamiento de tenant de doble capa es solo intención de diseño: sin capa de persistencia en el árbol no hay nada que contener, y la contención que aquí se afirmaba antes no era demostrable (ver Pilar 1).
**Overhead de performance: BAJO** — caching de 4 niveles (Cliente → CDN → BFF → Core) y backbones internos gRPC.
**Controles de riesgo residual:** snapshots semanales de performance con K6 y verificación de contratos Pact JS en CI ([ADR-0037](../../architecture/adrs/core/0037-performance-concurrency-chaos-strategy.es.md)).

---

## 8. Alcance de Gobernanza Topológica (Cobertura Multi-Dimensional)

> *Esta es la dimensión que distingue a Evolith de los frameworks arquitectónicos convencionales: no solo calidad interna, sino amplitud de alcance de gobernanza.*

### 8.1 Modelo Dimensional

Evolith Core no trata las topologías arquitectónicas como etiquetas de madurez mutuamente excluyentes. El [Modelo de Dimensiones Topológicas](../../architecture/topologies/topology-dimensions.es.md) (gobernado por [ADR-0079](../../architecture/adrs/core/0079-multi-topology-reference-corpus.es.md)) define 5 dimensiones con 8 topologías componibles.

| Dimensión | Pregunta que Responde | Topologías |
|---|---|---|
| `progressive-axis` | ¿Cómo se decompone y evoluciona el sistema? | `modular-monolith`, `distributed-modules`, `microservices` |
| `execution` | ¿Dónde y cómo ejecuta código? | `serverless`, `edge-computing` |
| `integration` | ¿Cómo se coordinan los componentes? | `event-driven` |
| `data` | ¿Cómo se distribuye la propiedad de datos? | `data-mesh` |
| `ai` | ¿Cómo se gobiernan los agentes AI? | `agentic-ai` |

**Cobertura: 5/5 dimensiones (100%), 8/8 topologías (100%)**

### 8.2 Estado de Madurez por Topología

| Topología | Dimensión | Estado | Native Rules | OPA Policy | OPA Tests | WASM | Config Schema | Fixtures | Bilingüe | Budgets | ADRs |
|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Modular Monolith** | progressive-axis | Accepted v1.0.0 | SI | SI | SI | SI | SI | SI | SI | — | 4 |
| **Distributed Modules** | progressive-axis | Accepted v1.0.0 | SI | SI | SI | SI | SI | SI | SI | — | 3 |
| **Microservices** | progressive-axis | Accepted v1.0.0 | SI | SI | SI | SI | SI | SI | SI | — | 4 |
| **Serverless** | execution | Accepted v1.0.0 | SI | SI | SI | SI | SI | SI | SI | SI | 2 |
| **Edge Computing** | execution | Accepted v1.0.0 | SI | SI | SI | SI | SI | SI | SI | SI | 2 |
| **Event-Driven** | integration | Accepted v1.0.0 | SI | SI | SI | SI | SI | SI | SI | — | 2 |
| **Data Mesh** | data | Accepted v1.0.0 | SI | SI | SI | SI | SI | SI | SI | — | 2 |
| **Agentic AI** | ai | Accepted v0.1.0 | SI | SI | SI | SI | SI | SI | SI | SI | 5 |

**La tabla anterior describe el corpus del repositorio, no el artefacto publicado.** Las 8 topologías sí tienen en el árbol Native `.rules.json` + OPA `.rego` + `.test.rego` + `.wasm`, repartidos en dos raíces: las 3 de progressive-axis bajo `reference/core/architecture/topologies/progressive-axis/`, las otras 5 bajo `src/rulesets/topologies/`. La paridad tal como se *publica* y tal como se *bloquea* es materialmente más estrecha — ver 8.6.

### 8.3 Matriz de Composición

Las topologías de diferentes dimensiones se componen vía `spec.compatibility.composableWith`. Dos topologías hub proporcionan máxima componibilidad:

| Topología Hub | Se Compone Con |
|---|---|
| **Event-Driven** | TODAS las 7 demás |
| **Agentic AI** | TODAS las 7 demás |

**Composición de referencia:** `modular-monolith + event-driven` (validado en CI vía `22-validate-topology-composition.mjs`).

### 8.4 Presupuestos Operacionales

Las topologías de ejecución y AI imponen contratos de presupuesto operacional:

| Topología | Campos de Budget |
|---|---|
| Serverless | `latencyBudgetMs=1500`, `coldStartCeilingMs=1000`, `costCeilingPerExecutionCents=1` |
| Edge Computing | `latencyBudgetMs=200`, `coldStartCeilingMs=300`, `costCeilingPerExecutionCents=1` |
| Agentic AI | `tokenBudgetPerExecution=100000`, `credentialRotationIntervalHours=24`, `sandboxTimeoutMs=30000` |

### 8.5 Infraestructura de Validación CI

| Script | Propósito |
|---|---|
| `validate-topology-manifests.mjs` | Valida todos los manifests contra schema, budgets, completitud R-27 |
| `22-validate-topology-composition.mjs` | Validación cross-topology, composability pairwise |
| `26-validate-topology-rule-coverage.mjs` | Cobertura Native/OPA por ID de regla según manifest |
| `28-test-topology-opa.mjs` | Suites de tests OPA — escanea solo `reference/core/architecture/topologies` (`28-test-topology-opa.mjs:15`), por lo que alcanza 3 de 8 topologías, y ningún workflow lo invoca |
| `30-validate-phase-topology-disjoint.mjs` | Anti-colisión de namespace (fases SDLC vs IDs de topología) |

Solo `22-validate-topology-composition.mjs` y `26-validate-topology-rule-coverage.mjs` corren por commit (despachados por la rama de topologías de `.harness/scripts/ci-runner.mjs`). El barrido completo de paridad semántica Native/OPA `27-opa-parity-gate.mjs` corre exclusivamente en el schedule diario de `.github/workflows/opa-parity.yml:36`; no es un check requerido en `main`.

### 8.6 Score de Alcance de Gobernanza

| Indicador | Valor |
|---|---|
| Dimensiones gobernadas | **5/5 (100%)** |
| Topologías gobernadas | **8/8 (100%)** |
| Paridad dual-engine — corpus del repositorio | **8/8 (100%)** (`.rules.json` + `.rego` + `.test.rego` + `.wasm` presentes en el árbol) |
| Paridad dual-engine — artefacto publicado `@beyondnet/evolith-cli@1.1.0` | **5/8 (63%)** — `rulesets/topologies/` publica política OPA + test + WASM para `agentic-ai`, `data-mesh`, `edge-computing`, `event-driven`, `serverless`. Las 3 topologías de progressive-axis publican solo `.rules.json` Native; el paquete no lleva `.rego` ni `.wasm` para ellas. |
| Paridad dual-engine — cubierta por un gate bloqueante | **0/8** — `28-test-topology-opa.mjs` (3 topologías en alcance) no lo invoca ningún workflow, y el barrido completo `27-opa-parity-gate.mjs` es solo por schedule. |
| Presupuestos operacionales ejecutados | **3/3 requeridos** |
| Composiciones validadas en CI | Infraestructura completa |
| ADRs específicos de topologías | 13 en 8 topologías |

**Alcance de Gobernanza: corpus COMPLETO, distribución y enforcement INCOMPLETOS.** Evolith Core redacta reglas para el espectro total de topologías de su modelo dimensional; todavía no publica, ni bloquea sobre, la mitad OPA de ese corpus para todas las topologías.

---

## 9. Alineación con la Visión del Producto

Match pilar por pilar contra la [Visión Maestra del Producto](../../../../product/suite/vision/evolith-product-vision-master.es.md). Los scores detallados por componente viven en el [Snapshot de Línea Base](../gaps/gap-reference-catalog.es.md#2-snapshot-histórico-de-línea-base) del Catálogo de Referencia de Gaps.

| Pilar de Visión | Requisito de Visión | Estado Basado en Evidencia | Notas |
|---|---|:---:|---|
| **Evolith Core** | Reference Corpus (Constitución): directivas, ADRs, estándares, rulesets, schemas | `Implementado` | Ver [Inventario del Corpus de Referencia](./inventory-summary.es.md) en vivo. Reglas de integración ACL definidas pero no ejecutadas (alcance Tracker). |
| **Evolith Tracker** | Orquestador SaaS del SDLC | `Visionado` | Repositorio aparte; la obligación del Core es el contrato API/MCP que consumirá. |
| **Exposición Tecnológica** | CLI + Core API + MCP sirviendo gobernanza como contexto en tiempo real | `Implementado` | Core API (NestJS) expone REST/GraphQL/MCP para orquestadores externos. |
| **5 Phase Gates** | Gates auditables con evidencia bloqueante | `Implementado` | Los 5 gates evalúan; los criterios bloqueantes son chequeos de solo-existencia. |
| **Gobernanza Federada** | Herencia hub-and-spoke, validación de satélites | `Diseñado` | Reglas de herencia + composite action de CI para satélites entregadas; ACLs runtime diferidas. |
| **Estrategia Open-Core** | Tier gratuito CLI+MCP públicamente disponible | `Prototipado` | Publicación bloqueada solo por logística de release ([GT-18](../gaps/gap-reference-catalog.es.md#gt-18)). |

---

## 10. Dimensión AI-Augmented

Evolith Core adopta la sección de ingeniería AI-Augmented. La [Matriz de Madurez de IA](../../foundations/common-rules/ai-augmented/07-maturity-model/ai-maturity-matrix.es.md) complementaria define 3 niveles en 5 dimensiones.

### 10.1 Evaluación por Dimensión

| Dimensión | Nivel | Evidencia Clave | Brecha a Nivel 3 |
|---|:---:|---|---|
| **Documentación** | **2 (AI-Integrated)** | AGENTS.md (132 líneas, actualizado regularmente), Catálogo de Tools MCP (50 tools), Catálogo de Modelos, Router Agent + 10 Discovery Agents con scope/inputs/outputs/handoff declarados | ADRs específicos de agentes, diagramas C4 de topología de orquestación |
| **Herramientas** | **3 (AI-Orchestrated)** | 50 MCP tools registrados, ciclo agentic recursive con propagación de budget (ADR-0002 §4), memoria semántica RAG vía pgvector + Qwen3 embedder, observabilidad OTel/Langfuse, `LangfuseEvidenceAdapter` mapeando traces/cost/latency | — (ya en Nivel 3) |
| **Verificación** | **2 (AI-Integrated)** | `.husky/pre-commit` (5 modos CI), 12 GitHub Actions workflows, validación OPA diaria, boundary guards de arquitectura, validación documentación, gates de coverage (80.65%) | Agentes de verificación autónomos patrullando continuamente (Winston audit existe pero requiere invocación manual) |
| **Modelos** | **2 (AI-Integrated)** | ADR-AI-003 governance formal, catálogo de modelos por tier (Large/Flash/Local), optimización cost-per-token objetivo 30-40%, infraestructura de tracking de costos Langfuse | Dashboard live de token cost por agent/feature, routing automático multi-model por rol |
| **Seguridad** | **2 (AI-Integrated)** | Autenticación OAuth/API key/JWT con comparación constant-time, ABAC dual-engine (OPA + TypeScript), filtrado de tools por rol, `AuditLogger` con redacción, política HITL para herramientas destructivas | Almacenamiento de audit inmutable, sandboxing de ejecución, rate limiting adaptativo basado en costo |

### 10.2 Resumen de Madurez AI

| Nivel | Dimensiones en este nivel |
|---|---|
| Nivel 1 (AI-Assisted) | 0 |
| Nivel 2 (AI-Integrated) | 4 (Documentación, Verificación, Modelos, Seguridad) |
| Nivel 3 (AI-Orchestrated) | 1 (Herramientas) |

**Madurez AI General: Nivel 2.2 (AI-Integrated → AI-Orchestrated)**

### 10.3 Evidencia de Certificación

| Nivel | Criterio | Estado |
|---|---|---|
| **Nivel 1** | Existe `.husky/pre-commit` | PASS |
| **Nivel 1** | `AGENTS.md` actualizado en últimos 30 días | PASS |
| **Nivel 2** | Catálogo de tools JSON Schema publicado | PASS (Catálogo MCP Tools) |
| **Nivel 2** | Logs de CI con model mocks | PASS (OPA parity + boundary guards) |
| **Nivel 2** | Backend no expone PII sin tokenizar al LLM | PASS (redacción SENSITIVE_ARG_KEYS) |
| **Nivel 3** | Dashboard de token cost por agent/feature | NO CUMPLIDO (infraestructura existe, dashboard live falta) |
| **Nivel 3** | Switch HITL bloqueando transacción simulada | PARCIAL (política definida, demo completa no evidenciada) |
| **Nivel 3** | Diagrama de arquitectura multi-agent aprobado | PARCIAL (agentes documentados, sin diagrama C4)

---

## 11. Actualización de Inteligencia BMAD (BMAD Intelligence Update)

Esta evaluación de madurez alimenta explícitamente el **Bucle de Retroalimentación de Inteligencia BMAD**. Los insights generados aquí instruyen las capacidades de los agentes internos, sus reglas de evaluación y listas de verificación estándar:

* **Agentes Actualizados:** `winston` (Auditoría), `architect` (Arquitectura) ahora evalúan el cumplimiento de puertos/adaptadores.
* **Nuevas Skills:** `adapter-maturity-analysis`, `interaction-adapter-gap-analysis`.
* **Nuevas Reglas:** `core-must-remain-stateless`, `external-tech-must-use-adapter`, `chat-interfaces-cannot-execute-critical-actions`.
* **Nuevos Checklists:** `Adapter Maturity Checklist`, `Interaction Adapter Readiness Checklist`.

Estos recursos de inteligencia se versionan dentro de `.bmad-core/agents/` y aplican continuamente a futuros PRs y auditorías de gobernanza.

---

## 12. Scoring Ejecutivo y Gaps Abiertos

### Dimensión A: Score de Calidad Interna (TOGAF ACMM)

| Capa | Peso | Score (Con Evidencia) |
|------|------|-----------------------|
| Arquitectura Runtime (pilares Well-Architected) | 60% | 3.4 ± 0.4 |
| Exposición Tecnológica (CLI + MCP) | 40% | 3.2 ± 0.4 |

**Calidad Interna: 3.32 ± 0.4 / 5.0 (Definido → Gestionado)**

### Dimensión B: Score de Alcance de Gobernanza

| Indicador | Valor |
|---|---|
| Dimensiones topológicas gobernadas | 5/5 (100%) |
| Topologías con paridad dual-engine (corpus del repositorio) | 8/8 (100%) |
| Topologías con paridad dual-engine (publicado `@beyondnet/evolith-cli@1.1.0`) | 5/8 (63%) |
| Adaptadores de interacción en M4 | 6/6 (100%) |
| Anti-patrones inmunizados | 5/6 (83%) — Entrelazamiento de BD Compartida tiene solo defensa diseñada (sección 7) |
| Madurez AI (promedio en 5 dimensiones) | 2.2/3 (AI-Integrated) |

**Alcance de Gobernanza: COMPLETO en las 5 dimensiones topológicas**

### Veredicto Bidimensional Combinado

> **Evolith Core es una plataforma de gobernanza arquitectónica multi-dimensional con calidad interna nivel 3.32/5 (Definido → Gestionado).** Su alcance de gobernanza cubre el 100% de las topologías definidas (5 dimensiones × 8 topologías componibles) con paridad dual-engine en el corpus del repositorio, aunque solo 5 de esas 8 publican su mitad OPA en el paquete `@beyondnet/evolith-cli@1.1.0` y ninguna está cubierta por un gate OPA bloqueante en `main` (sección 8.6). Los 6 adaptadores de interacción están listos para producción (M4), 5 de los 6 anti-patrones críticos están inmunizados en código (el sexto tiene una defensa diseñada a la espera de una capa de persistencia), y la dimensión AI-Augmented tiene una capacidad (Tools) en Nivel 3 (AI-Orchestrated). Brechas principales: pilar de seguridad reducido a `Diseñado` por falta de capa de persistencia, pilar de confiabilidad (Nivel 3→4), progresión de adaptadores M4→M5 (tests, OPA guard, tracing), y AI Verification/Models/Security (Nivel 2→3).

### Reconciliación Actual

Los totales vigentes no se mantienen como texto narrativo. La [Reconciliación de Madurez](./maturity-reconciliation.json), legible por máquina, se genera desde el tablero canónico de Core, el registro de cierres, los inventarios y la metadata de release del CLI. `node .harness/scripts/ci/09-reconcile-maturity.mjs --check` falla cuando ese snapshot presenta drift.

La madurez de Tracker y Product Suite se excluye explícitamente del score de Core porque tienen ownership y ciclos de evidencia independientes. Su estado de producto no puede inflar esta evaluación.

---

*Esta es la única evaluación de madurez del Evolith Core. El seguimiento de gaps vive exclusivamente en el [Tablero de Seguimiento de Gaps](../gaps/gap-tracking.es.md).*

---
[Volver al Índice de Visión](../../README.es.md)
