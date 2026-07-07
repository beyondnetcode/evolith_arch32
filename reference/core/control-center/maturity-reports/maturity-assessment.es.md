# Evolith Core — Evaluación de Madurez

> **Navegación Bilingüe:** [English Version](./maturity-assessment.md)

**Estado:** Evaluación Activa
**Responsable:** Evolith Architecture Board
**Creado:** 2026-06-10 (consolida los antiguos `maturity-matrix.es.md` y `maturity-evaluation.es.md`)
**Última Actualización:** 2026-06-22
**Documento compañero:** [Tablero de Seguimiento de Gaps](../gaps/gap-tracking.es.md) — la única superficie de tracking para todo gap referenciado aquí.

---

## 1. Propósito y Frameworks

Esta es la **única evaluación de madurez** de Evolith Core. Mide tres cosas:

1. **Compatibilidad con estándares internacionales** — TOGAF Architecture Capability Maturity Model (ACMM) para madurez de proceso y gobernanza enterprise, más los pilares del Cloud Well-Architected Framework (WAF) para madurez técnica (sección 3) y el catálogo enterprise de patrones/anti-patrones de microservicios (secciones 5–6).
2. **Match con la visión del producto** — alineación pilar por pilar contra la [Visión Maestra del Producto](../../../../product/suite/vision/evolith-product-vision-master.es.md) (sección 7).
3. **Gaps abiertos** — toda desviación encontrada aquí se registra exclusivamente como ítem `GT-xx` en el [Tablero de Seguimiento de Gaps](../gaps/gap-tracking.es.md) (sección 8). Ningún gap se trackea en este documento.

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
* **Estado:** `Validado`
* **Evidencia:**
  * Pipeline de seguridad zero-cost vía CodeQL ([ADR-0005](../../architecture/adrs/core/0005-automated-sast-quality-gates.es.md)).
  * Fijación estricta de versiones de dependencias (lockfiles exactos, sin rangos) con gestión automatizada de vulnerabilidades ([ADR-0009](../../architecture/adrs/core/0009-strict-dependency-pinning-vulnerability-management.es.md)).
  * Aislamiento de datos multi-tenant vía Row-Level Security ([ADR-0010](../../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.es.md)).
  * Audit trails inmutables vía CDC ([ADR-0016](../../architecture/adrs/core/0016-immutable-business-audit-trail.es.md)).
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
* **Estado:** `Validado`
* **Evidencia:**
  * Builds deterministas de monorepo vía Nx ([ADR-0001](../../architecture/adrs/core/0001-monorepo-orchestration-principle.es.md)).
  * Telemetría vía stack LGTM y OpenTelemetry ([ADR-0007](../../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.es.md)).
  * Feature flagging desacopla deployment de release ([ADR-0017](../../architecture/adrs/core/0017-feature-flagging-strategy.es.md)).
  * Quality gates aplican umbrales de coverage en CI ([ADR-0018](../../architecture/adrs/core/0018-testing-pyramid-quality-gates.es.md)).
* **Camino al Nivel 5:** deployments blue/green autónomos; detección de anomalías en logs con IA.

### Pilar 5: Mantenibilidad y Extensibilidad — **Nivel 4 (Gestionado)**
* **Estado:** `Validado`
* **Evidencia:**
  * Boundaries hexagonales desacoplando core de infraestructura ([ADR-0002](../../architecture/adrs/nodejs/0002-clean-architecture-nestjs.es.md)).
  * Patrones de diseño táctico (monada Result) ([ADR-0019](../../architecture/adrs/core/0019-tactical-design-patterns-future-proofing.es.md)).
  * Desacoplamiento event-driven de módulos de dominio ([ADR-0015](../../architecture/adrs/core/0015-event-driven-architecture-intra-domain.es.md)).
* **Camino al Nivel 5:** transición monolito-a-Dapr con cero cambios de dominio ([ADR-0006](../../architecture/adrs/core/0006-microservices-transition-sidecar-pattern.es.md)). Nota: el enforcement hexagonal estricto en el propio CLI sigue abierto — ver [GT-19](../gaps/gap-reference-catalog.es.md#gt-19).

---

## 4. Evaluación de la Exposición Tecnológica (CLI + MCP)

### Dimensión 1: Conformidad de Protocolo MCP y Transporte — **Nivel 4 (Gestionado)**
* **Estado:** `Validado`
* **Evidencia:** JSON-RPC 2.0 por stdio y Streamable HTTP oficial del SDK MCP; autenticación por API key; 29 casos E2E MCP; el smoke verifica initialize, discovery, métricas y evaluación de gates en ambos transportes. Ver la [reconciliación de madurez](./maturity-reconciliation.json) generada.
* **Camino al Nivel 5:** conformidad de protocolo automatizada contra las versiones soportadas de la especificación MCP.

### Dimensión 2: Cobertura de Tests y Quality Gates — **Nivel 4 (Gestionado)**
* **Estado:** `Validado`
* **Evidencia:** 1,206 tests unitarios y 121 E2E pasan desde un checkout limpio, y la cobertura de statements es 80,65% (4.979/6.173) frente al umbral normativo de 80%, restaurada bajo [GT-48](../gaps/gap-reference-catalog.es.md#gt-48) testeando los native rule handlers, validators y filesystem providers. La [reconciliación de madurez](./maturity-reconciliation.json) generada registra el resultado ejecutable y su origen.
* **Camino al Nivel 5:** umbrales de cobertura durables por-run en la configuración de Jest ([GT-50](../gaps/gap-reference-catalog.es.md#gt-50)) y mutation testing.

### Dimensión 3: Completitud de Exposición de Gobernanza — **Nivel 4 (Gestionado)**
* **Estado:** `Validado`
* **Evidencia:** 32 tools MCP, 9 resources y 8 prompts cubren validación, agentes, arquitectura, SDLC, priorización, métricas y evaluación de gates con checks de conformidad de schemas runtime.
* **Camino al Nivel 5:** hot-reload de rulesets y adopción medida en repositorios satélite.

### Dimensión 4: Experiencia de Desarrollador CLI — **Nivel 4 (Gestionado)**
* **Estado:** `Validado`
* **Evidencia:** el paquete `@evolith/smart-cli@1.1.0` se instala desde el lockfile canónico del workspace; lint, build, E2E y smoke MCP pasan desde un checkout limpio; shell completion y documentación bilingüe están disponibles. La documentación pública de producto y los hechos de release se sincronizan desde un [Inventario de Superficie del Producto](../../../../product/products/smart-cli/product-inventory.es.md) generado, con CI que rechaza drift y páginas placeholder ([GT-47](../gaps/gap-reference-catalog.es.md#gt-47)).
* **Camino al Nivel 5:** publicar el inventario como un manifiesto de capacidades descubrible consumido por repositorios satélite.

### Dimensión 5: Enforcement Runtime de Gobernanza Federada — **Nivel 3 (Definido)**
* **Estado:** `Diseñado` (Existen reglas, falta validación de contenido)
* **Evidencia:** modelo de herencia, contratos de satélites y reglas de boundary Open-Core definidos; `smart-cli validate` ejecutable por cualquier satélite; composite action de CI `evolith-validate` disponible para gates de PR en satélites.
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

| Capacidad / Puerto | Objetivo | Implementado Actualmente en Core/Runtime | Estado | Pendiente / Recomendado | Beneficio de Cerrar | Prioridad |
|---|---|---|---|---|---|---|
| **Agent Engine** | Razonamiento agentic reemplazable. | `StubAgentEngineAdapter`, `HermesAgentAdapter`, `SwarmsAgentAdapter`, `RoutingAgentAdapter` | `Implementado` | `OpenCodeAgentAdapter`, `OllamaLocalAgentAdapter`, `OpenAIAdapter`, `ClaudeAdapter`, `GeminiAdapter` | Permite usar distintos motores sin acoplar Evolith a Hermes. Favorece privacidad, costo. | Media |
| **Engine Routing** | Elegir motor según contexto o intención. | `RoutingAgentAdapter` | `Parcial` | `PolicyBasedEngineRouter`, `RiskAwareEngineRouter`, `CostAwareEngineRouter`, `PrivacyAwareEngineRouter` | Seleccionar motor por riesgo, costo, fase SDLC o política. | Alta |
| **Harness Execution** | Ejecutar capacidades `.harness` (simuladas o reales). | `InMemoryHarnessAdapter`, `HarnessProcessAdapter` | `Implementado` | `DockerHarnessAdapter`, `KubernetesJobHarnessAdapter`, `RemoteHarnessAdapter`, `GitHubActionsHarnessAdapter` | Aísla validaciones, permite ejecución remota, CI/CD y K8s. | Media |
| **Core Evaluation** | Evaluar reglas, gaps y gobernanza. | `StubCoreEvaluationAdapter`, `InProcessCoreEvaluationAdapter`, `HttpCoreEvaluationAdapter` | `Implementado` | `GrpcCoreEvaluationAdapter`, `BatchCoreEvaluationAdapter`, `CachedCoreEvaluationAdapter` | Mejora performance, escalabilidad y evaluación masiva. | Media |
| **Policy / OPA** | Validar políticas y bloquear acciones. | `StubPolicyValidationAdapter`, `OpaCliPolicyValidationAdapter` | `Implementado` | `OpaHttpAdapter`, `ConftestAdapter`, `KyvernoAdapter`, `PolicyBundleRegistryAdapter` | Permite policy-as-code remota, validación K8s y bundles. | Alta |
| **Tracker Trace** | Publicar trazabilidad al Tracker o memoria. | `InMemoryTrackerTraceAdapter`, `HttpTrackerTraceAdapter` | `Implementado` | `EventBusTraceAdapter`, `KafkaTraceAdapter`, `OpenTelemetryTraceAdapter`, `AuditLogTraceAdapter` | Mejora trazabilidad empresarial, auditoría y observabilidad. | Media |
| **Memory** | Memoria temporal o persistida. | `InMemoryMemoryAdapter`, `FileMemoryAdapter` | `Implementado` | `RedisMemoryAdapter`, `PostgresMemoryAdapter`, `VectorMemoryAdapter`, `ObsidianVaultMemoryAdapter` | Memoria semántica compartida y persistente para agentes. | Media |
| **Skill Registry** | Resolver intents a capacidades gobernadas. | `LocalSkillRegistryAdapter`, `DEFAULT_SKILLS` | `Implementado` | `RemoteSkillRegistryAdapter`, `GitSkillRegistryAdapter`, `MarketplaceSkillRegistryAdapter`, `TenantSkillBundleAdapter` | Capacidades versionables, heredables y extensibles. | Alta |
| **Communication Gateway** | Adaptar superficies de comunicación. | `CliCommunicationGatewayAdapter` | `Parcial` | `InteractionAdapterPort`, `SmartCliCommandInteractionAdapter`, `SmartCliChatInteractionAdapter`, `HermesChatBoxInteractionAdapter`, `OpenCodeInteractionAdapter`, `McpInteractionAdapter`, `WebhookInteractionAdapter` | **Pieza crítica** para permitir múltiples interfaces sin duplicar comandos ni saltar governance. | Crítica |
| **Scheduler** | Programar o diferir ejecuciones. | `InMemorySchedulerAdapter`, `FileSchedulerAdapter` | `Implementado` | `CronSchedulerAdapter`, `TemporalAdapter`, `BullMQSchedulerAdapter`, `KubernetesCronJobAdapter` | Auditorías recurrentes, jobs durables y re-validaciones. | Baja |
| **Approval / HITL** | Flujo de aprobación humana en el loop. | `AutoApprovalAdapter`, `DenyByDefaultApprovalAdapter` | `Parcial` | `TrackerApprovalAdapter`, `GitHubApprovalAdapter`, `SlackApprovalAdapter`, `TeamsApprovalAdapter`, `EmailApprovalAdapter` | Aprobación humana real para acciones de alto impacto. | Alta |
| **MCP Interaction** | Exponer a agentes externos vía MCP. | MCP existe, falta adaptador formal runtime. | `Parcial` | `McpInteractionAdapter`, `McpToolRegistryAdapter`, `McpPolicyGuardAdapter` | Agentes externos consumen capacidades bajo gobernanza. | Alta |
| **Smart CLI Interaction** | Mantener Smart CLI como entrada gobernada. | Smart CLI existe, falta formalizar adaptador común. | `Parcial` | `SmartCliCommandInteractionAdapter`, `SmartCliChatInteractionAdapter`, `CommandCapabilityAdapter` | CLI en modo chat y comando usan la misma capa runtime. | Crítica |
| **Hermes Chat Box Interaction** | Interfaz conversacional (UI) opcional de Hermes. | `HermesAgentAdapter` existe (engine), falta adaptador source/interface. | `Parcial` | `HermesChatBoxInteractionAdapter` | Exponer Hermes Chat Box sin ejecución directa de shell. | Alta |
| **OpenCode Interaction** | UI de chat/agente externa de OpenCode. | No implementado. | `No implementado` | `OpenCodeInteractionAdapter`, `OpenCodeMcpAdapter`, `OpenCodeCliBridgeAdapter` | Uso de OpenCode como caja de chat sin permisos libres. | Media |
| **GitHub Automation** | Crear repos, PRs y CI desde flujos gobernados. | No implementado como adaptador directo. | `No implementado` | `GitHubRepositoryAdapter`, `GitHubIssueAdapter`, `GitHubPullRequestAdapter`, `GitHubActionsAdapter` | Automatización de SDLC gobernada en GitHub. | Media |
| **Notifications / Collaboration** | Notificar puertas bloqueadas, aprobaciones, etc. | No implementado como adaptador directo. | `No implementado` | `SlackAdapter`, `TeamsAdapter`, `EmailNotificationAdapter`, `DiscordAdapter` | Mejora de alertas, colaboración y flujos de aprobación. | Media |
| **Observability** | Observar runtime, motores y latencias. | Parcial vía Tracker Trace. | `Parcial` | `OpenTelemetryAdapter`, `PrometheusMetricsAdapter`, `StructuredAuditAdapter` | Monitoreo enterprise y auditoría técnica detallada. | Media |
| **Knowledge / RAG** | Consultar ADRs, reglas, manuales antes de actuar. | No implementado como adaptador consolidado. | `No implementado` | `RagKnowledgeAdapter`, `DocsSearchAdapter`, `VectorStoreAdapter`, `GitDocsAdapter`, `ObsidianAdapter` | Evidencia interna para mejorar recomendaciones agentic. | Alta |
| **Secrets / Config** | Gestión de credenciales, selección de engine, config. | Parcial vía bootstrap/overrides. | `Parcial` | `VaultSecretAdapter`, `EnvConfigAdapter`, `RemoteConfigAdapter`, `PolicyBundleConfigAdapter` | Evita hardcoding y asegura la configuración por entorno. | Alta |

---

## 6. Matriz de Madurez de Patrones (Catálogo Internacional de Patrones)

| Cluster de Patrón | Patrón Específico | Aplicabilidad | Estado Basado en Evidencia | Justificación |
| :--- | :--- | :--- | :--- | :--- |
| **Integración** | **Strangler Fig** | Core Crítico | `Validado` | Estrategia fundacional: módulos lógicamente aislados para extracción incremental sin downtime. |
| **Composición** | **BFF (Backend for Frontend)** | Core Obligatorio | `Implementado` | Capas NestJS especializadas por dispositivo ([ADR-0008](../../architecture/adrs/nodejs/0008-progressive-multimodule-evolution-gateway-bff.es.md)). |
| **Confiabilidad** | **Circuit Breaker** | Operacional | `Diseñado` | Breakers distribuidos compartiendo estado vía Redis ([ADR-0011](../../architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.es.md)) + healthchecks de edge. |
| **Base de Datos** | **Schema Per Context** | Core Obligatorio | `Validado` | Previene contaminación de joins cross-dominio ([ADR-0031](../../architecture/adrs/core/0031-schema-per-context-domain-event-catalog.es.md)). |
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
| **Entrelazamiento de BD Compartida** | MUY ALTA | Schema PostgreSQL aislado por contexto ([ADR-0031](../../architecture/adrs/core/0031-schema-per-context-domain-event-catalog.es.md)); joins cross-schema físicamente bloqueados. |
| **Fat Controller / Smart Pipe** | ALTA | Dumb Pipes / Smart Endpoints: el gateway ejecuta solo políticas agnósticas (JWT, SSL, rate limit); toda decisión de negocio vive en el hexágono de aplicación testeado. |
| **Log Shards (Ceguera)** | ALTA | Tracing distribuido OTel ([ADR-0007](../../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.es.md)): un TraceParent ID desde el inicio del request hasta la respuesta de BD. |
| **God Module** | ALTA | Auditorías regulares de boundaries contra el [Modelo de Referencia Aplicado UMS](../../../../product/research/demo/README.es.md); el playbook de extracción divide antes de que un módulo crezca demasiado. |
| **Leaky Shared Library** | ALTA | Libs compartidas restringidas a primitivas genéricas y utilidades DDD; objetos de dominio prohibidos, enforced vía `eslint-plugin-boundaries`. |

**Fortaleza de resiliencia: ALTA** — circuit breakers + contract testing blindan el backend contra fallas en cascada; aislamiento de tenant de doble capa da contención demostrable.
**Overhead de performance: BAJO** — caching de 4 niveles (Cliente → CDN → BFF → Core) y backbones internos gRPC.
**Controles de riesgo residual:** snapshots semanales de performance con K6 y verificación de contratos Pact JS en CI ([ADR-0037](../../architecture/adrs/core/0037-performance-concurrency-chaos-strategy.es.md)).

---

## 8. Alineación con la Visión del Producto

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

## 9. Scoring Ejecutivo y Gaps Abiertos

### Score Combinado (TOGAF ACMM)

| Capa | Peso | Score (Con Evidencia) |
|------|------|-----------------------|
| Arquitectura Runtime (pilares Well-Architected) | 60% | 3.4 ± 0.4 |
| Exposición Tecnológica (CLI + MCP) | 40% | 3.2 ± 0.4 |

**Madurez Global de Evolith Core: 3.32 ± 0.4 / 5.0 (Definido → Gestionado)**

El sistema está en transición de completamente documentado (Nivel 3) a gobernado automáticamente (Nivel 4). Al forzar el respaldo por evidencia estricta, el puntaje incorpora formalmente una **penalidad de incertidumbre** para los elementos que están `Diseñados` o `Implementados` pero carecen de validación automatizada completa.

### Reconciliación Actual

Los totales vigentes no se mantienen como texto narrativo. La [Reconciliación de Madurez](./maturity-reconciliation.json), legible por máquina, se genera desde el tablero canónico de Core, el registro de cierres, los inventarios y la metadata de release del CLI. `node .harness/scripts/ci/09-reconcile-maturity.mjs --check` falla cuando ese snapshot presenta drift.

La madurez de Tracker y Product Suite se excluye explícitamente del score de Core porque tienen ownership y ciclos de evidencia independientes. Su estado de producto no puede inflar esta evaluación.

---

## 10. Dimensión AI-Augmented (Opcional)

Para productos que adoptan la sección de ingeniería AI-Augmented, existe una matriz de madurez complementaria con 3 niveles: AI-Assisted, AI-Integrated y AI-Orchestrated.

-> [Ver Matriz de Madurez de IA](../../foundations/common-rules/ai-augmented/07-maturity-model/ai-maturity-matrix.es.md)

---

## 11. Actualización de Inteligencia BMAD (BMAD Intelligence Update)

Esta evaluación de madurez alimenta explícitamente el **Bucle de Retroalimentación de Inteligencia BMAD**. Los insights generados aquí instruyen las capacidades de los agentes internos, sus reglas de evaluación y listas de verificación estándar:

* **Agentes Actualizados:** `winston` (Auditoría), `architect` (Arquitectura) ahora evalúan el cumplimiento de puertos/adaptadores.
* **Nuevas Skills:** `adapter-maturity-analysis`, `interaction-adapter-gap-analysis`.
* **Nuevas Reglas:** `core-must-remain-stateless`, `external-tech-must-use-adapter`, `chat-interfaces-cannot-execute-critical-actions`.
* **Nuevos Checklists:** `Adapter Maturity Checklist`, `Interaction Adapter Readiness Checklist`.

Estos recursos de inteligencia se versionan dentro de `.bmad-core/agents/` y aplican continuamente a futuros PRs y auditorías de gobernanza.

---

*Esta es la única evaluación de madurez del Evolith Core. El seguimiento de gaps vive exclusivamente en el [Tablero de Seguimiento de Gaps](../gaps/gap-tracking.es.md).*

---
[Volver al Índice de Visión](../../README.es.md)
