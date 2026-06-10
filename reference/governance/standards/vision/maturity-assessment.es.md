# Evolith Core — Evaluación de Madurez

> **Navegación Bilingüe:** [English Version](./maturity-assessment.md)

**Estado:** Evaluación Activa
**Responsable:** Evolith Architecture Board
**Creado:** 2026-06-10 (consolida los antiguos `maturity-matrix.es.md` y `maturity-evaluation.es.md`)
**Última Actualización:** 2026-06-10
**Documento compañero:** [Tablero de Seguimiento de Gaps](./gap-tracking.es.md) — la única superficie de tracking para todo gap referenciado aquí.

---

## 1. Propósito y Frameworks

Esta es la **única evaluación de madurez** de Evolith Core. Mide tres cosas:

1. **Compatibilidad con estándares internacionales** — TOGAF Architecture Capability Maturity Model (ACMM) para madurez de proceso y gobernanza enterprise, más los pilares del Cloud Well-Architected Framework (WAF) para madurez técnica (sección 3) y el catálogo enterprise de patrones/anti-patrones de microservicios (secciones 5–6).
2. **Match con la visión del producto** — alineación pilar por pilar contra la [Visión Maestra del Producto](./evolith-product-vision-master.es.md) (sección 7).
3. **Gaps abiertos** — toda desviación encontrada aquí se registra exclusivamente como ítem `GT-xx` en el [Tablero de Seguimiento de Gaps](./gap-tracking.es.md) (sección 8). Ningún gap se trackea en este documento.

**Cómo actualizar:** re-puntúa una sección cuando cambie su evidencia subyacente (ADR mergeado, gate cerrado, ítem GT completado), actualiza `Última Actualización`, y mantén el registro de gaps en el tablero — nunca aquí.

---

## 2. Definición de Niveles de Madurez (TOGAF ACMM)

La evaluación usa los 5 niveles estándar del ACMM:

* **Nivel 1: Inicial (Ad-Hoc)** — Sin arquitectura formal. Procesos caóticos, indocumentados y reactivos.
* **Nivel 2: En Desarrollo** — Proceso básico de arquitectura. Algunos estándares existen pero sin enforcement consistente.
* **Nivel 3: Definido** — Arquitectura bien definida, documentada (Modelo C4, ADRs) e integrada al SDLC.
* **Nivel 4: Gestionado** — Arquitectura medida cuantitativamente (CodeQL, coverage, drift) y gobernada automáticamente.
* **Nivel 5: Optimizante** — Mejora arquitectónica continua (desacoplamiento progresivo, auto-escalado, drills de caos).

---

## 3. Evaluación de la Arquitectura Runtime (Pilares Well-Architected)

### Pilar 1: Seguridad y Compliance — **Nivel 4 (Gestionado)**
* **Evidencia:**
  * Pipeline de seguridad zero-cost vía CodeQL ([ADR-0005](../../../architecture/adrs/core/0005-ci-cd-quality-codeql.es.md)).
  * Fijación estricta de versiones de dependencias (lockfiles exactos, sin rangos) con gestión automatizada de vulnerabilidades ([ADR-0009](../../../architecture/adrs/core/0009-strict-dependency-pinning-vulnerability-management.es.md)).
  * Aislamiento de datos multi-tenant vía Row-Level Security ([ADR-0010](../../../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.es.md)).
  * Audit trails inmutables vía CDC ([ADR-0016](../../../architecture/adrs/core/0016-immutable-business-audit-trail.es.md)).
* **Camino al Nivel 5:** penetration testing automatizado en CI; rotación dinámica de secretos.

### Pilar 2: Eficiencia de Performance — **Nivel 4 (Gestionado)**
* **Evidencia:**
  * Compilación del grafo de auth bajo 5 ms usando Redis ([ADR-0021](../../../architecture/adrs/nodejs/0021-high-performance-auth-and-graph-compilation.es.md)).
  * Estrategia dual-protocolo: REST público, gRPC interno ([ADR-0027](../../../architecture/adrs/nodejs/0027-dual-protocol-rest-grpc-api-gateway.es.md)).
  * Payloads frontend optimizados vía BFF Gateway ([ADR-0008](../../../architecture/adrs/nodejs/0008-progressive-multimodule-evolution-gateway-bff.es.md)).
* **Camino al Nivel 5:** auto-escalado serverless; caching predictivo.

### Pilar 3: Confiabilidad y Resiliencia — **Nivel 3 (Definido) → avanzando a 4**
* **Evidencia:**
  * Resiliencia offline de frontend vía React Query ([ADR-0004](../../../architecture/adrs/nodejs/0004-frontend-offline-resilience.es.md)).
  * Circuit breakers (`opossum`) y retries ([ADR-0011](../../../architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.es.md)).
  * Topología DR multi-región propuesta ([ADR-0013](../../../architecture/adrs/core/0013-cloud-infrastructure-topology-dr.es.md)).
* **Camino al Nivel 5:** drills regulares de chaos engineering; multi-región activo-activo.

### Pilar 4: Excelencia Operacional — **Nivel 4 (Gestionado)**
* **Evidencia:**
  * Builds deterministas de monorepo vía Nx ([ADR-0001](../../../architecture/adrs/core/0001-monorepo-orchestration-nx.es.md)).
  * Telemetría vía stack LGTM y OpenTelemetry ([ADR-0007](../../../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.es.md)).
  * Feature flagging desacopla deployment de release ([ADR-0017](../../../architecture/adrs/core/0017-feature-flagging-strategy.es.md)).
  * Quality gates aplican umbrales de coverage en CI ([ADR-0018](../../../architecture/adrs/core/0018-testing-pyramid-quality-gates.es.md)).
* **Camino al Nivel 5:** deployments blue/green autónomos; detección de anomalías en logs con IA.

### Pilar 5: Mantenibilidad y Extensibilidad — **Nivel 4 (Gestionado)**
* **Evidencia:**
  * Boundaries hexagonales desacoplando core de infraestructura ([ADR-0002](../../../architecture/adrs/nodejs/0002-clean-architecture-nestjs.es.md)).
  * Patrones de diseño táctico (monada Result) ([ADR-0019](../../../architecture/adrs/core/0019-tactical-design-patterns-future-proofing.es.md)).
  * Desacoplamiento event-driven de módulos de dominio ([ADR-0015](../../../architecture/adrs/core/0015-event-driven-architecture-intra-domain.es.md)).
* **Camino al Nivel 5:** transición monolito-a-Dapr con cero cambios de dominio ([ADR-0006](../../../architecture/adrs/core/0006-future-microservices-transition-dapr.es.md)). Nota: el enforcement hexagonal estricto en el propio CLI sigue abierto — ver [GT-19](./gap-tracking.es.md#gt-19).

---

## 4. Evaluación de la Exposición Tecnológica (CLI + MCP)

### Dimensión 1: Conformidad de Protocolo MCP y Transporte — **Nivel 4 (Gestionado)**
* **Evidencia:** transporte stdio JSON-RPC 2.0; transporte HTTP/SSE mínimo con `/health`, `/message`, `/sse` y auth Bearer/X-API-Key; recuperación de errores endurecida; `mcp:smoke` verifica initialize, discovery y tool calls en cada release.
* **Camino al Nivel 5:** adoptar el transporte Streamable HTTP oficial del SDK MCP ([GT-05](./gap-tracking.es.md#gt-05)); conformidad de protocolo automatizada contra el changelog de la spec MCP.

### Dimensión 2: Cobertura de Tests y Quality Gates — **Nivel 4 (Gestionado)**
* **Evidencia:** ~1 369 tests (unit + E2E) verdes; 88.70% statements · 89.80% lines · 76.93% branches (meta ≥75%) · 83.58% functions; teardown limpio sin `--forceExit`.
* **Camino al Nivel 5:** gates de coverage bloqueantes en CI; coverage de branches ≥80%.

### Dimensión 3: Completitud de Exposición de Gobernanza — **Nivel 4 (Gestionado)**
* **Evidencia:** 17+ tools MCP, 8 resources, 7 prompts cubriendo validación, agentes, arquitectura, SDLC y priorización; todo cubierto por tests de routing.
* **Camino al Nivel 5:** evaluación de gates expuesta como tool de evidencia estructurada ([GT-06](./gap-tracking.es.md#gt-06)); hot-reload de rulesets.

### Dimensión 4: Experiencia de Desarrollador CLI — **Nivel 3 (Definido)**
* **Evidencia:** 13 comandos; shell completion (bash/zsh/fish); paridad documental EN/ES 100%; `mcp:smoke` bajo 5 segundos; métricas DORA calculadas desde historia git real en `gate-status`.
* **Camino al Nivel 4:** envelope de salida unificado y flags globales ([GT-01](./gap-tracking.es.md#gt-01)); cobertura completa de `--dry-run` ([GT-12](./gap-tracking.es.md#gt-12)); publicación en npm ([GT-18](./gap-tracking.es.md#gt-18)).

### Dimensión 5: Enforcement Runtime de Gobernanza Federada — **Nivel 3 (Definido)**
* **Evidencia:** modelo de herencia, contratos de satélites y reglas de boundary Open-Core definidos; `smart-cli validate` ejecutable por cualquier satélite; composite action de CI `evolith-validate` disponible para gates de PR en satélites.
* **Camino al Nivel 4:** evidencia de phase gates profundizada de chequeos de solo-existencia a validación de contenido/umbral ([GT-08](./gap-tracking.es.md#gt-08)–[GT-11](./gap-tracking.es.md#gt-11)); adapters ACL runtime (alcance Tracker).

---

## 5. Matriz de Madurez de Patrones (Catálogo Internacional de Patrones)

| Cluster de Patrón | Patrón Específico | Aplicabilidad | Madurez / Riesgo | Justificación |
| :--- | :--- | :--- | :--- | :--- |
| **Integración** | **Strangler Fig** | Core Crítico | 100% Listo | Estrategia fundacional: módulos lógicamente aislados para extracción incremental sin downtime. |
| **Composición** | **BFF (Backend for Frontend)** | Core Obligatorio | 100% Adoptado | Capas NestJS especializadas por dispositivo ([ADR-0008](../../../architecture/adrs/nodejs/0008-progressive-multimodule-evolution-gateway-bff.es.md)). |
| **Confiabilidad** | **Circuit Breaker** | Operacional | 100% Adoptado | Breakers distribuidos compartiendo estado vía Redis ([ADR-0011](../../../architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.es.md)) + healthchecks de edge. |
| **Base de Datos** | **Schema Per Context** | Core Obligatorio | 100% Adoptado | Previene contaminación de joins cross-dominio ([ADR-0031](../../../architecture/adrs/core/0031-schema-per-context-domain-event-catalog.es.md)). |
| **Escalabilidad** | **CQRS (Básico)** | Opcional | Roadmap | Read-models solo cuando la contención de escritura lo exija. |
| **Consistencia** | **Patrón Saga** | Futuro Distribuido | Roadmap | Reservado para transacciones distribuidas de Fase 3+. |
| **Mensajería** | **Transactional Outbox** | Fase 2+ | Roadmap | Consistencia atómica estado-DB/eventos a escala asíncrona. |

**Leyenda:** *Adoptado* — completamente diseñado y verificado en specs. *Roadmap* — infraestructura lista, implementación diferida a demanda. *Incompatible* — ninguno identificado actualmente.

---

## 6. Inmunización contra Anti-Patrones

La arquitectura despliega "anticuerpos" explícitos contra los seis anti-patrones de mayor riesgo. Resumen (criticidad · defensa):

| Anti-Patrón | Criticidad | Defensa de Inmunización |
| :--- | :--- | :--- |
| **Monolito Distribuido** | EXTREMA | Bus de eventos asíncrono ([ADR-0015](../../../architecture/adrs/core/0015-event-driven-architecture-intra-domain.es.md)) + aislamiento hexagonal ([ADR-0002](../../../architecture/adrs/nodejs/0002-clean-architecture-nestjs.es.md)): mensajería fire-and-forget, sin cadenas síncronas cross-módulo. |
| **Entrelazamiento de BD Compartida** | MUY ALTA | Schema PostgreSQL aislado por contexto ([ADR-0031](../../../architecture/adrs/core/0031-schema-per-context-domain-event-catalog.es.md)); joins cross-schema físicamente bloqueados. |
| **Fat Controller / Smart Pipe** | ALTA | Dumb Pipes / Smart Endpoints: el gateway ejecuta solo políticas agnósticas (JWT, SSL, rate limit); toda decisión de negocio vive en el hexágono de aplicación testeado. |
| **Log Shards (Ceguera)** | ALTA | Tracing distribuido OTel ([ADR-0007](../../../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.es.md)): un TraceParent ID desde el inicio del request hasta la respuesta de BD. |
| **God Module** | ALTA | Auditorías regulares de boundaries contra el [Modelo de Referencia Aplicado UMS](../../../knowledge/demo/README.es.md); el playbook de extracción divide antes de que un módulo crezca demasiado. |
| **Leaky Shared Library** | ALTA | Libs compartidas restringidas a primitivas genéricas y utilidades DDD; objetos de dominio prohibidos, enforced vía `eslint-plugin-boundaries`. |

**Fortaleza de resiliencia: ALTA** — circuit breakers + contract testing blindan el backend contra fallas en cascada; aislamiento de tenant de doble capa da contención demostrable.
**Overhead de performance: BAJO** — caching de 4 niveles (Cliente → CDN → BFF → Core) y backbones internos gRPC.
**Controles de riesgo residual:** snapshots semanales de performance con K6 y verificación de contratos Pact JS en CI ([ADR-0037](../../../architecture/adrs/core/0037-performance-concurrency-chaos-strategy.es.md)).

---

## 7. Alineación con la Visión del Producto

Match pilar por pilar contra la [Visión Maestra del Producto](./evolith-product-vision-master.es.md). Los scores detallados por componente viven en el [Snapshot de Línea Base](./gap-tracking.es.md#4-snapshot-de-línea-base-absorbido-de-gap-analysis-core-2026-06-09) del Tablero de Gaps.

| Pilar de Visión | Requisito de Visión | Alineación | Notas |
|---|---|:---:|---|
| **Evolith Core** | Reference Corpus (Constitución): directivas, ADRs, estándares, rulesets, schemas | ~90% | 70+ ADRs, 27 rulesets versionados en 13 categorías, 14 schemas de phase gates. Reglas de integración ACL definidas pero no ejecutadas (alcance Tracker). |
| **Evolith Tracker** | Orquestador SaaS del SDLC | 0% (por diseño) | Repositorio aparte; la obligación del Core es el contrato CLI/MCP que consumirá — ítems abiertos [GT-01](./gap-tracking.es.md#gt-01)…[GT-06](./gap-tracking.es.md#gt-06), [GT-13](./gap-tracking.es.md#gt-13), [GT-14](./gap-tracking.es.md#gt-14). |
| **Exposición Tecnológica** | CLI + MCP sirviendo gobernanza como contexto en tiempo real | ~85–90% | Beta funcional: 13 comandos, MCP stdio + HTTP, DORA real, detección de drift, scaffolding hexagonal. Restante: contrato Tracker, upgrade de transporte, publicación npm. |
| **5 Phase Gates** | Gates auditables con evidencia bloqueante | ~62% | Los 5 gates evalúan; los criterios bloqueantes son chequeos de solo-existencia — validación de contenido/umbral pendiente ([GT-08](./gap-tracking.es.md#gt-08)–[GT-11](./gap-tracking.es.md#gt-11)). |
| **Gobernanza Federada** | Herencia hub-and-spoke, validación de satélites | ~80% | Reglas de herencia + composite action de CI para satélites entregadas; ACLs runtime diferidas al Tracker. |
| **Estrategia Open-Core** | Tier gratuito CLI+MCP públicamente disponible | Pendiente | Publicación bloqueada solo por logística de release ([GT-18](./gap-tracking.es.md#gt-18)). |

---

## 8. Scoring Ejecutivo y Gaps Abiertos

### Score Combinado (TOGAF ACMM)

| Capa | Peso | Score |
|------|------|-------|
| Arquitectura Runtime (pilares Well-Architected) | 60% | 3.8 |
| Exposición Tecnológica (CLI + MCP) | 40% | 3.6 |

**Madurez Global de Evolith Core: 3.72 / 5.0 (Definido → Gestionado)**

El sistema está en transición de completamente documentado (Nivel 3) a gobernado automáticamente (Nivel 4). Los deltas al Nivel 4 en todas las dimensiones se trackean como ítems de gap; los deltas al Nivel 5 son roadmap (chaos engineering, activo-activo, split a Dapr).

### Gaps Abiertos

Todos los gaps abiertos viven exclusivamente en el **[Tablero de Seguimiento de Gaps](./gap-tracking.es.md)** — estado actual: 16 pendientes, 1 diferido, 5 completados de 22 ítems `GT`, más el archivo legado cerrado `G-01…G-27`. El subconjunto relevante para madurez:

* **Profundidad de evidencia de gates (P1):** [GT-08](./gap-tracking.es.md#gt-08), [GT-09](./gap-tracking.es.md#gt-09), [GT-10](./gap-tracking.es.md#gt-10), [GT-11](./gap-tracking.es.md#gt-11)
* **Integridad de arquitectura (P1):** [GT-04](./gap-tracking.es.md#gt-04), [GT-17](./gap-tracking.es.md#gt-17), [GT-19](./gap-tracking.es.md#gt-19)
* **Exposición y distribución (P1):** [GT-05](./gap-tracking.es.md#gt-05), [GT-12](./gap-tracking.es.md#gt-12), [GT-13](./gap-tracking.es.md#gt-13), [GT-14](./gap-tracking.es.md#gt-14), [GT-18](./gap-tracking.es.md#gt-18)

---

## 9. Dimensión AI-Augmented (Opcional)

Para productos que adoptan la sección de ingeniería AI-Augmented, existe una matriz de madurez complementaria con 3 niveles: AI-Assisted, AI-Integrated y AI-Orchestrated.

-> [Ver Matriz de Madurez de IA](../ai-augmented/07-maturity-model/ai-maturity-matrix.es.md)

---

*Esta es la única evaluación de madurez de Evolith Core. El tracking de gaps vive exclusivamente en el [Tablero de Seguimiento de Gaps](./gap-tracking.es.md).*

---
[Volver al Índice de Visión](./README.es.md)
