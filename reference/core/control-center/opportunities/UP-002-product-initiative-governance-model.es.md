# UP-002 — Modelo de Gobierno Producto/Iniciativa: Separar el Gobierno SDLC de la Ejecución Operativa

> Navegación bilingüe: [English](./UP-002-product-initiative-governance-model.md)

| Campo | Valor |
|---|---|
| **ID** | UP-002 |
| **Estado** | PROPOSED |
| **Fecha** | 2026-06-28 |
| **Iniciado por** | Evolith Architecture Board (rediseño del Core) |
| **Dirigido a** | Evolith Core Architecture Board |
| **Prioridad** | P0 |
| **Complejidad estimada** | XL |
| **ADR relacionado** | ADR-0100 (Frontera Gobierno/Ejecución) · **ADR-0101 (Core como Stateless Evaluation Engine — corrección)** |
| **GTs relacionados** | GT-375 |
| **Documento de diseño** | [Core Evaluation Engine Design](../../core/core-evaluation-engine-design.es.md) (corregido) · [Rediseño de Gobierno Producto/Iniciativa](../../core/product-initiative-governance-redesign.es.md) (superseded en parte) |

> **⚠ Corrección (2026-06-28).** Los Entregables 2 y 7 de abajo proponían originalmente **entidades** `Producto`/`Iniciativa` propiedad del Core **con repositorios y endpoints de escritura**. Según [ADR-0101](../../architecture/adrs/core/0101-core-stateless-evaluation-engine.es.md), eso queda **corregido**: el Core es un **evaluador stateless** que define los contratos `EvaluationContext` (entrada) / `EvaluationResult` (salida). Producto/tenant/iniciativa son **solo contexto** (`ProductContext`/`InitiativeContext`/`EvidenceContext`); el Core **no tiene puertos/casos de uso/endpoints de escritura** de entidades de negocio (solo `IBlueprintRepository`, una definición). Su única superficie es `POST /api/v1/evaluate` (`EvaluationContext` → `EvaluationResult`, envelope ADR-0073). El Core emite un `DecisionRecommendation` **no vinculante**; el Tracker decide, persiste y audita.

## Contexto

Evolith Core declara que **no** es "a task-management platform" (`reference/core/README.md:47`), pero sus superficies de gobierno exigen artefactos ágiles de ejecución como **evidencia bloqueante de gate** — *Evolith User Story* / *Agile Backlog* **Required** en Fase 2, *Technical Stories* **Required** en Fase 3 (`reference/core/sdlc/sdlc-evolith-artifact-mapping.md:130,132,133,223`); "story readiness" cierra el gate F2 (`:209`). Schemas operativos (`evolith-user-story.schema.json`, `agile-backlog.schema.json`, `functional-story.schema.json`, `ballpark-estimation.schema.json`) viven como contratos canónicos del Core.

Mientras tanto **no existe entidad `Producto` ni `Iniciativa`** en el dominio del Core; la iniciativa es un string opaco nunca persistido (`gate-evidence.ts:87-89`). Evolith Tracker ya modela `PRODUCT`/`SDLC_PROCESS` (`product/products/evolith-tracker/sdlc-tracker-technical-interfaces.md:415-428`) — el Core va por detrás de su propio Tracker. Esta es la **conflación gobierno ↔ ejecución operativa**.

## Principio rector (no negociable)

> *Evolith Core es la fuente de verdad del gobierno técnico (arquitectura, SDLC, reglas, políticas, blueprints, trazabilidad, validaciones, decisiones) y un asesor arquitectónico. NO es la fuente de verdad de la ejecución operativa del delivery (épicas, historias, tareas, sprints, estimaciones, velocity, tableros). Un Producto tiene una o muchas Iniciativas; cada Iniciativa gobierna su propio flujo SDLC. Épicas/historias/tareas existen solo como `ExternalReference` opcional.*

## Objetivo

Promover el **modelo de gobierno Producto/Iniciativa** a estándar canónico del ecosistema: formalizar `Producto` e `Iniciativa` como unidades primarias de gobierno, externalizar los artefactos ágiles a `ExternalReference` opcional, separar **evaluación** (`ValidationResult`) de **decisión** (`DecisionRecord`) y **asesoría** (`AdvisoryRecord`), y mantener el Core provider-neutral y multi-tenant — sin romper los satélites existentes.

---

## Alcance — Entregables

### 1. Decisión y frontera (ADR)
- Redactar **ADR-0100 — Frontera Gobierno/Ejecución: Producto e Iniciativa como Unidades Primarias, con Capacidad de Asesoría** (R0 de esta propuesta). Desambiguar el `GateDecision` del Core → `CoreGateVerdict`; migrar el legacy `'WAIVED'` → `Verdict.WAIVE`.

### 2. Entidades de dominio (core-domain)
- Introducir las entidades `Producto` e `Iniciativa`; anclar `Evidencia` (evolución de `GateEvidence`) a `(tenantId → productId → initiativeId → phaseId)`.
- Formalizar los tres tipos de salida: `ValidationResult` (evaluación), `DecisionRecord` (decisión vinculante, emitida por Tracker), `AdvisoryRecord` (asistencia arquitectónica no vinculante, producida por motores advisory + agentes IA como Winston).

### 3. Schemas y rulesets
- Nuevos schemas en `rulesets/schema/`: `product`, `initiative`, `external-reference`, `artifact`, `evidence`, `validation-result`, `decision-record`, `advisory-record`.
- Deprecar (con grandfathering) `evolith-user-story`, `agile-backlog`, `functional-story`, `ballpark-estimation`, `technical-story` → perfiles de `external-reference`.
- Quitar artefactos de historia de `mandatoryEvidence` en `rulesets/sdlc/phase-gates.rules.json`; reescribir `DOD-03` fuera de "story tracker". Añadir un contrato `product-initiative` a `satellite-contracts.rules.json` (modo `warn` → `fail`).

### 4. Políticas OPA
- Introducir el `input.context` canónico (tenant, product, initiative, phase, gate, artifacts, evidence, externalReferences, rulesetSnapshot). Re-anclar `dod.rego` (hoy 100% `input.story.*`) a Iniciativa + Evidencia; añadir `multi-tenancy` MTN-09..11 y scoping ABAC tenant/product/initiative. Paridad Native+OPA (ADR-0041).

### 5. Blueprints
- Tres niveles: `ProductBlueprint`, `InitiativeBlueprint` (columna de trazabilidad) y el actual `TopologyBlueprint`. Las historias nunca aparecen; solo `externalReferences[]`.

### 6. Documentación
- Reclasificar los artefactos ágiles en `sdlc-evolith-artifact-mapping.md` de Required a `ExternalReference` opcional; reemplazar "story readiness" por criterios de artefacto+ruleset. Publicar el documento canónico "Modelo de Gobierno Producto-Iniciativa".

### 7. Interfaces / API
- Nuevos puertos (`IProductRepository`, `IInitiativeRepository`, `IExternalReferenceResolver`, `IDecisionRecordRepository`, `IEvidenceRepository`, `IAdvisoryRepository`), casos de uso (`RegisterProduct`, `OpenInitiative`, `AttachExternalReference`, `RecordEvidence`, `EvaluateInitiativeGate`, `RecordDecision`, `RequestAdvisory`), y las superficies REST/CLI/MCP correspondientes — con el envelope ADR-0073 y el `POST /api/v1/phases/transition` existente reconciliado como evaluación stateless.

### 8. Integración con Tracker
- Insertar `INITIATIVE` entre `PRODUCT` y `SDLC_PROCESS` en el modelo del Tracker; `StartProcessRequest` gana `initiativeId`. Ampliar `EvidenceItem.references[].type` con `epic|story|issue|task`. El Tracker emite el `DecisionRecord` canónico; el Core degrada a evaluación-only cuando el Tracker no está presente.

---

## Criterios de aceptación

- [ ] ADR-0100 aprobado: frontera gobierno/ejecución canónica para el Core y todos los satélites.
- [ ] Entidades `Producto`/`Iniciativa` + los ocho schemas nuevos en `rulesets/schema/`; contrato `product-initiative` en `satellite-contracts` + `input.context` OPA conectado a `/evaluate`.
- [ ] Ningún gate del Core depende de historias/backlog; `ExternalReference` es la única costura operativa (reglas `EXT-01..05`).
- [ ] `ValidationResult` / `DecisionRecord` / `AdvisoryRecord` separados; `Verdict` reutilizado (sin nuevo vocabulario); `GateDecision` → `CoreGateVerdict`; `'WAIVED'` → `Verdict.WAIVE`.
- [ ] `EVOLITH_PARITY_FULL=true` con 0 drift (Native + OPA).
- [ ] Un satélite no conforme **falla** la evaluación del Core solo tras el flip `warn → fail` (grandfathering aplicado).
- [ ] Docs bilingües; inglés para artefactos máquina-consumibles (ADR-0090).
- [ ] El Tracker consume `Producto/Iniciativa/Evidencia/ValidationResult` y emite `DecisionRecord`; el Core no se bloquea sin Tracker.

---

## Anclajes reales en Core

| Artefacto | Ruta |
|---|---|
| Documento de diseño | `reference/core/product-initiative-governance-redesign.es.md` |
| ADR | `reference/core/architecture/adrs/core/0100-governance-execution-boundary-product-initiative.md` |
| Evidencia de conflación | `reference/core/sdlc/sdlc-evolith-artifact-mapping.md:130,132,133,209,223` |
| Entidades ausentes | `packages/core-domain/src/domain/entities/`, `gate-evidence.ts:87-89` |
| Precedente de frontera | `packages/core-domain/src/application/validators/evaluators/handlers/executive-scorecard-rule.handler.ts:55` |
| Modelo del Tracker | `product/products/evolith-tracker/sdlc-tracker-technical-interfaces.md:415-428` |
| Ruleset / Rego de phase-gates | `rulesets/sdlc/phase-gates.rules.json`, `rulesets/opa/phase-gates.rego`, `rulesets/opa/dod.rego` |
| Contratos de satélite | `rulesets/satellite-contracts/satellite-contracts.rules.json` |

---

## Notas de implementación

- **Solo REST** — sin GraphQL/SSE (ADR-0074). Envelope ADR-0073 en todas las respuestas.
- **Fuente única de verdad** preservada: gobierno en Core, hechos de ejecución en sistemas externos, estado runtime en Tracker.
- **Roadmap incremental R0–R5** con compatibilidad hacia atrás: deprecación con grandfathering; contratos nuevos arrancan en `warn`; seguimiento solo en `gap-tracking.md` + `maturity-assessment.md`.
- Registrar esta iniciativa como `GT-375` (y descomponer en GTs por fase a medida que el trabajo se apruebe).

---

[Volver al Índice de Upstream Proposals](../../sdlc/governance/DECISIONS.es.md) · [Hub de Gobernanza](../../sdlc/governance/README.es.md)
