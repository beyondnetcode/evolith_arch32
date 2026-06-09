# Modelo de Madurez de Arquitectura del Esqueleto de Referencia (AMM)

## Referencia del Framework: TOGAF ACMM & Well-Architected Framework

## Estado
Aprobado

## Fecha
2026-06-09

## Contexto y Propósito
Como Director Técnico y Arquitecto Empresarial, es crítico medir la calidad objetiva y la evolución del Sistema de Referencia utilizando estándares internacionalmente reconocidos.

Este documento de evaluación aprovecha un marco híbrido combinando el **TOGAF Architecture Capability Maturity Model (ACMM)** (para la madurez de procesos empresariales y gobernanza) y el **Cloud Well-Architected Framework (WAF)** (para la madurez técnica y nativa de la nube en pilares como Seguridad, Fiabilidad y Excelencia Operativa).

---

## 1. Definición de Niveles de Madurez (Basado en TOGAF ACMM)

Evaluamos el Esqueleto de Referencia a través de 5 niveles estándar de madurez:

* **Nivel 1: Inicial (Ad-Hoc)** - Sin arquitectura formal. Los procesos de TI son caóticos, no documentados y reactivos.
* **Nivel 2: Bajo Desarrollo** - El proceso de arquitectura básico está en marcha. Existen algunos estándares pero no se aplican de manera consistente.
* **Nivel 3: Definido** - La arquitectura está bien definida, documentada (C4 Model, ADRs) e integrada en el SDLC.
* **Nivel 4: Gestionado** - La arquitectura se mide cuantitativamente (CodeQL, Sonar, Cobertura) y se gobierna automáticamente.
* **Nivel 5: Optimizado** - Mejora continua de la arquitectura (evolución de Dapr, desacoplamiento progresivo, auto-escalado).

---

## 2. Evaluación de Madurez Actual del Esqueleto de Referencia (Pilares Well-Architected)

Evaluamos la arquitectura del Esqueleto de Referencia frente a los 5 pilares críticos del Well-Architected Framework.

### Pilar 1: Seguridad y Cumplimiento
**Nivel de Madurez Actual: 4 (Gestionado)**
* **Evidencia**: 
 * Pipeline de Seguridad Cero-Costo implementado vía CodeQL ([ADR-0005](../../../architecture/adrs/core/0005-ci-cd-quality-codeql.md)).
 * Fijación Estricta de Dependencias previene ataques a la Cadena de Suministro ([ADR-0009](../../../architecture/adrs/core/0009-strict-dependency-pinning-vulnerability-management.md)).
 * Aislamiento de Datos impuesto a nivel de BD usando Row-Level Security (RLS) para multi-tenancy ([ADR-0010](../../../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.md)).
 * Pistas de Auditoría Inmutables vía CDC ([ADR-0016](../../../architecture/adrs/core/0016-immutable-business-audit-trail.md)).
* **Camino al Nivel 5**: Implementar pruebas de penetración automatizadas en CI y rotación dinámica de secretos a través de HashiCorp Vault.

### Jump to: Pilar 2: Eficiencia de Rendimiento
**Nivel de Madurez Actual: 4 (Gestionado)**
* **Evidencia**: 
 * Compilación de Gráficos de Autorización de Alto Rendimiento bajo <5ms usando Redis ([ADR-0021](../../../architecture/adrs/nodejs/0021-high-performance-auth-and-graph-compilation.md)).
 * Estrategia de Protocolo Dual (REST para público, gRPC para velocidad interna) ([ADR-0027](../../../architecture/adrs/nodejs/0027-dual-protocol-rest-grpc-api-gateway.md)).
 * Cargas optimizadas para Frontend a través del Gateway BFF ([ADR-0008](../../../architecture/adrs/nodejs/0008-progressive-multimodule-evolution-gateway-bff.md)).
* **Camino al Nivel 5**: Implementar auto-escalado serverless y algoritmos de caché predictiva.

### Pilar 3: Fiabilidad y Resiliencia
**Nivel de Madurez Actual: 3 (Definido) -> Avanzando al 4**
* **Evidencia**: 
 * Resiliencia Offline en Frontend vía React Query ([ADR-0004](../../../architecture/adrs/nodejs/0004-frontend-offline-resilience.md)).
 * Tolerancia a Fallos vía Circuit Breakers (`opossum`) y Reintentos ([ADR-0011](../../../architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.md)).
 * Límites de DR Multi-Región para Infraestructura Cloud propuestos ([ADR-0013](../../../architecture/adrs/core/0013-cloud-infrastructure-topology-dr.md)).
* **Camino al Nivel 5**: Ejecutar simulacros regulares de Ingeniería del Caos (Chaos Monkey) y despliegue multi-región completamente activo-activo.

### Pilar 4: Excelencia Operativa
**Nivel de Madurez Actual: 4 (Gestionado)**
* **Evidencia**: 
 * Orquestación de Monorepo vía Nx asegura builds deterministas ([ADR-0001](../../../architecture/adrs/core/0001-monorepo-orchestration-nx.md)).
 * Telemetría Completa usando LGTM y OpenTelemetry ([ADR-0007](../../../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.md)).
 * Uso de Feature Flags permite desacoplar el despliegue de la liberación ([ADR-0017](../../../architecture/adrs/core/0017-feature-flagging-strategy.md)).
 * Puertas de Calidad imponen >70% de cobertura de pruebas estrictamente vía CI ([ADR-0018](../../../architecture/adrs/core/0018-testing-pyramid-quality-gates.md)).
* **Camino al Nivel 5**: Lograr despliegues automatizados Blue/Green totalmente autónomos y sin tiempo de inactividad, con detección de anomalías impulsada por IA en los logs.

### Pilar 5: Mantenibilidad y Extensibilidad (Arquitectura Limpia)
**Nivel de Madurez Actual: 4 (Gestionado)**
* **Evidencia**: 
 * Límites Hexagonales estrictos desacoplando el núcleo de la infraestructura ([ADR-0002](../../../architecture/adrs/nodejs/0002-clean-architecture-nestjs.md)).
 * Patrones de Diseño Táctico (Mónada Result) blindando el futuro del core ([ADR-0019](../../../architecture/adrs/core/0019-tactical-design-patterns-future-proofing.md)).
 * Arquitectura Dirigida por Eventos desacoplando módulos de dominio ([ADR-0015](../../../architecture/adrs/core/0015-event-driven-architecture-intra-domain.md)).
 * Estrategias de mitigación de Vendor Lock-In claramente definidas (Feature Flags, IdPs).
* **Camino al Nivel 5**: Transición fluida de Monolito Modular a Microservicios Dapr con cero cambios en el código de dominio ([ADR-0006](../../../architecture/adrs/core/0006-future-microservices-transition-dapr.md)).

---

---

## 3. Capa de Exposición Tecnológica — Evaluación de Madurez CLI + MCP

Esta sección extiende la evaluación TOGAF ACMM para cubrir la **capa de Exposición Tecnológica** (CLI de Evolith + Servidor MCP), requerida por [G-25](./gap-analysis-core.es.md#g-25-maturity-matrix-cobertura-climcp-resuelta-100).

### Dimensión 1: Conformidad de Protocolo MCP y Transporte
**Nivel de Madurez Actual: 4 (Gestionado)**
* **Evidencia:**
  * `MinimalStdioTransport` — JSON-RPC 2.0 con buffer de líneas sobre stdin/stdout; `onmessage`, `onerror`, `onclose` todos conectados.
  * `MinimalHttpTransport` — servidor HTTP/SSE con `/health`, `/message` (POST), `/sse` (GET), fallback 404; autenticación Bearer-token y X-API-Key validada por solicitud.
  * Outer-catch endurecido: `transport.send()` en recuperación de error envuelto en try/catch anidado — sin rechazos no manejados.
  * Limpieza de clientes SSE muertos en escritura fallida.
  * Script `mcp:smoke` verifica `initialize`, `tools/list`, `resources/list`, `prompts/list` y `tools/call` en cada ejecución contra el binario compilado.
* **Camino al Nivel 5:** Evidencia smoke de integración IDE externa (Cursor / Claude Desktop) formalizada en CI (G-18). Tests de conformidad de protocolo automatizados contra el changelog de versiones de la especificación MCP.

### Dimensión 2: Cobertura de Tests y Puertas de Calidad
**Nivel de Madurez Actual: 4 (Gestionado)**
* **Evidencia:**
  * 1 369 tests en 63 suites unitarias + 11 suites E2E — todos verdes.
  * Cobertura statements: **88.70%** · Lines: **89.80%** · Branches: **76.93%** (target ≥75%) · Functions: **83.58%**.
  * `--forceExit` eliminado; teardown limpio; sin warnings de open-handles.
  * Artefacto de resumen JSON generado via reporter `json-summary`.
  * `server.ts` (núcleo MCP): 85.8% statements · 96% functions.
* **Camino al Nivel 5:** Enforcement de puertas de cobertura en CI como check bloqueante (actualmente advisory). Elevar branch coverage a ≥80% con el tiempo.

### Dimensión 3: Completitud de Exposición de Gobernanza
**Nivel de Madurez Actual: 4 (Gestionado)**
* **Evidencia:**
  * **17 herramientas MCP** cubriendo validate, ciclo de vida de agentes (5), arquitectura F1/F2/F3, handoff/estado SDLC, config get/set, métricas y priorización MoSCoW (7).
  * **8 recursos MCP** exponiendo rulesets, phase-gates, agentes, versiones, config, moscow y acl en tiempo real.
  * **7 prompts MCP** para flujos de validate, onboarding, arquitectura, phase-gate, handoff, ruleset y moscow.
  * Todas las herramientas, recursos y prompts registrados y cubiertos por la suite de tests de enrutamiento HTTP.
* **Camino al Nivel 5:** Actualización dinámica de recursos (hot-reload de rulesets sin reiniciar el servidor). Versionado de recursos alineado a actualizaciones del corpus Core.

### Dimensión 4: Experiencia del Desarrollador CLI
**Nivel de Madurez Actual: 3 (Definido)**
* **Evidencia:**
  * 13 comandos cubriendo todas las operaciones requeridas por la visión.
  * Completado de shell para bash, zsh y fish.
  * Documentación bilingüe (paridad EN/ES 100%, validada por script automatizado).
  * Ejemplos de configuración para Cursor AI y Claude Desktop en README.
  * `mcp:smoke` ejecutable en menos de 5 segundos.
* **Camino al Nivel 4:** Evidencia smoke de integración IDE end-to-end (G-18). Composite action CI para satélites para que `smart-cli validate` se ejecute automáticamente en PRs de satélites (G-27).

### Dimensión 5: Enforcement de Gobernanza Federada en Runtime
**Nivel de Madurez Actual: 3 (Definido)**
* **Evidencia:**
  * Modelo de herencia, contratos de satélites y reglas de Open-Core boundary completamente definidos.
  * `smart-cli validate --ruleset inheritance` ejecutable por cualquier satélite.
  * Archivos de reglas ACL presentes en `rulesets/acl/`.
* **Camino al Nivel 4:** Composite action de GitHub Actions (G-27) que los repositorios satélite incluyen para ejecutar `smart-cli validate` como gate bloqueante de PR. Adaptadores ACL en runtime para Jira/Trello/Linear (G-02, alcance Tracker SaaS).

### Score Resumen CLI + MCP

| Dimensión | Nivel | Score |
|-----------|-------|-------|
| Conformidad de Protocolo y Transporte | 4 — Gestionado | 4.0 |
| Cobertura de Tests y Puertas de Calidad | 4 — Gestionado | 4.0 |
| Completitud de Exposición de Gobernanza | 4 — Gestionado | 4.0 |
| Experiencia del Desarrollador CLI | 3 — Definido | 3.0 |
| Enforcement de Gobernanza Federada | 3 — Definido | 3.0 |

**Score Capa CLI + MCP: 3.6 / 5.0 (De Definido a Gestionado)**

---

## 4. Resumen Ejecutivo y Calificación

Basado en los criterios TOGAF ACMM aplicados a nuestra arquitectura actual evaluada con apoyo del método spec-driven AI-DD:

### Esqueleto de Referencia (Arquitectura de Runtime)

**Puntuación: 3.8 / 5.0 (De Definido a Gestionado)**

La arquitectura del Esqueleto de Referencia está actualmente en transición de un sistema perfectamente documentado (Nivel 3) a un sistema totalmente automatizado y gobernado (Nivel 4). La aplicación estricta de ADRs, límites estáticos (`eslint-plugin-boundaries`), y puertas de calidad CI/CD asegura que el sistema no se degrade en deuda técnica.

Para alcanzar el **Nivel 5 (Optimizado)**, la organización de ingeniería debe centrarse en la Ingeniería del Caos, despliegues Multi-Región Activo-Activo, y la eventual división en microservicios Dapr a medida que la carga operativa lo demande.

### Capa de Exposición Tecnológica (CLI + MCP)

**Puntuación: 3.6 / 5.0 (De Definido a Gestionado)**

La CLI y el servidor MCP han alcanzado un estado beta funcional con sólida cobertura de tests y evidencia smoke verificada. La implementación del protocolo está endurecida (outer-catch, lifecycle handlers, auth). El delta restante hacia el Nivel 4 es el enforcement de CI en satélites (G-27) y la evidencia smoke formal de IDE externo (G-18).

### Score Combinado Evolith Core

| Capa | Peso | Score |
|------|------|-------|
| Esqueleto de Referencia (Arquitectura de Runtime) | 60% | 3.8 |
| Exposición Tecnológica (CLI + MCP) | 40% | 3.6 |

**Madurez Global Evolith Core: 3.72 / 5.0 (De Definido a Gestionado)**

---

## Dimensión AI-Augmented (Opcional)

Para productos que adoptan la sección AI-Augmented, existe una matriz de madurez
complementaria con 3 niveles: AI-Assisted, AI-Integrated, AI-Orchestrated.

-> [Ver matriz de madurez AI](../ai-augmented/07-maturity-model/ai-maturity-matrix.md)

---
[Volver al Índice](./README.es.md)
