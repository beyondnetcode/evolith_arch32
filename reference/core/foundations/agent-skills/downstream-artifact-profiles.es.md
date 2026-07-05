# Perfiles de Artefactos de Fases Downstream — Spec Conceptual (Construcción · Calidad · Despliegue)

> **Navegación Bilingüe:** [English Version](./downstream-artifact-profiles.md)

**Estado:** Realizado (GT-434 COMPLETADO) · **Dueños:** `@winston` · `@po`
**Base:** [Flujo Downstream del Tracker](./tracker-downstream-flow.es.md) DN-06 · espeja el `spec.designProfile` de Design (GT-427) · evidencia de gate de la Visión §5.2.
**Autoridad:** Registro de aprendizaje/conocimiento. Implementado como `spec.phaseProfiles { construction, quality, deployment }` en los topology manifests (junto a `designProfile`), evaluado por el evaluador advisory y no vinculante `phase-artifacts` (ADR-0101/0104).

---

## Modelo

Cada fase downstream tiene, como Design: un set de artefactos **universal** (cualquier topología, siempre) + artefactos **derivados por topología** (condicionales, unidos sobre la composición confirmada). Los artefactos son **en parte derivados del blueprint** (F7 `downstreamCriteria`) y en parte propios de la fase. Todo es **configurable por tenant** sobre un piso fijado por Core (L-006), y **advisory / no vinculante** — el gate del tenant decide.

Los artifactKinds son blockKinds `kebab-case`, extensibles bajo Convention over Configuration (se añaden al registry, no al motor).

---

## 1. Construcción (Fase 3) — Gate: Build Pass

**Universal (required):**
| artifactKind | criterio |
|---|---|
| `source-change-set` | Cambios de código ligados al work item y al spec. |
| `ci-pipeline-result` | CI corre y pasa. |
| `definition-of-done-checklist` | DoD satisfecho. |
| `architecture-drift-result` | Drift evaluado; violaciones resueltas o waived. |
| `spec-traceability-map` | Cada cambio traza a un spec funcional/técnico. |

**Derivados por topología (conditional):**
| topología | artifactKind | criterio |
|---|---|---|
| distributed-modules / microservices | `per-unit-ci-evidence` | CI independiente por módulo/servicio. |
| microservices | `doma-implementation-check` | Un servicio ↔ un bounded context, implementado. |
| event-driven | `event-contract-implementation` | Productores/consumidores implementan los contratos de evento declarados. |
| agentic-ai | `agent-capability-implementation` | Capacidades de agente gobernadas implementadas tras puertos. |

## 2. Calidad (Fase 4) — Gate: Quality Gate (CFR < 2% · cero defectos críticos)

**Universal (required):**
| artifactKind | criterio |
|---|---|
| `test-summary-report` | Todos los tests Must-Have pasan. |
| `coverage-report` | Cobertura cumple el target de la pirámide de testing. |
| `security-scan-result` | Sin hallazgos high/critical (o waived). |
| `contract-test-result` | Los contract tests pasan. |
| `cfr-metric` | Change-failure-rate < 2%. |
| `defect-log` | Cero defectos críticos abiertos. |
| `exception-status` | Excepciones aceptadas registradas. |

**Derivados por topología (conditional):**
| topología | artifactKind | criterio |
|---|---|---|
| serverless / edge-computing | `performance-validation` | Cold-start/latencia/costo dentro de los operational budgets. |
| event-driven | `async-consumer-test` | Tests de consumidor/idempotencia por cada evento. |
| data-mesh | `data-product-slo-validation` | Contratos/SLOs de data product verificados. |
| agentic-ai | `agent-safety-validation` | Token-budget, aislamiento de sandbox, conformidad MCP verificados. |
| microservices | `cross-service-integration-test` | Integración/e2e entre servicios en verde. |

## 3. Despliegue / Release (Fase 5) — Gate: Human Sign-Off (Production Live)

**Universal (required):**
| artifactKind | criterio |
|---|---|
| `release-plan` | Plan de rollout aprobado. |
| `observability-readiness` | Traces/logs/metrics cableados para el release. |
| `rollback-plan` | Rollback ensayado y listo. |
| `operational-sign-off` | Operaciones acepta la readiness. |
| `deployment-evidence` | Despliegue ejecutado y verificado. |
| `release-notes` | Notas producidas (dual-mode). |

**Derivados por topología (conditional):**
| topología | artifactKind | criterio |
|---|---|---|
| serverless / edge-computing | `runtime-budget-validation` | Cold-start/costo/latencia validados en el entorno objetivo. |
| microservices | `progressive-rollout-plan` | Canary/blue-green por servicio. |
| agentic-ai | `agent-operational-guardrails` | Rotación de credenciales activa, límites de sandbox aplicados, aprobación HITL cableada. |
| data-mesh | `data-product-publication` | Data products publicados con handoff de ownership. |

---

## 4. Participación de Core (advisory)

- Core evalúa **completitud de artefactos + criterios de gate** por fase (como el evaluador `design`), derivando el set requerido como universal ∪ derivado de la composición de topologías, y mezclando los `downstreamCriteria` del blueprint (F7).
- Señales advisory continuas (DN-05): drift (Construcción), cobertura/CFR/calidad (Calidad), readiness (Despliegue) — expuestas por el KindEvaluator dedicado `phase-artifacts` (junto a los kinds `architecture` / `checkpoint` / `deployment` existentes).
- **No vinculante, stateless:** el Tracker persiste la evidencia, el checkpoint y la decisión; los sistemas externos notifican el estado de criterios/artefactos vía la API interface.

## 5. Nota de implementación (GT-434 — COMPLETADO)

Entregado (espeja GT-425): `spec.phaseProfiles { construction, quality, deployment }` en los topology manifests + el KindEvaluator dedicado `phase-artifacts` + `PhaseArtifactProfileService` + entradas de `phase-artifact-registry` + endpoint de Core API + E2E. **Follow-on:** paridad `phase-artifacts` en CLI/MCP (trackeado como tarea).

---

_Ver [Flujo Downstream del Tracker](./tracker-downstream-flow.es.md) · [Gobernanza de la Fase Design](../../architecture/design-phase-governance.es.md) · [ADR-0104](../../architecture/adrs/core/0104-topology-driven-advisory-design-governance.es.md)._
