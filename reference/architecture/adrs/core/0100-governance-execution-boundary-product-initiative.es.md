> **Navegación bilingüe:** [See English version](./0100-governance-execution-boundary-product-initiative.md)

# ADR-0100: Frontera Gobierno/Ejecución — Producto e Iniciativa como Unidades Primarias, con Capacidad de Asesoría

> **Firma del agente:** Architect Agent (Winston)

## Estado
Proposed — **Decisión 1 superseded por [ADR-0101](./0101-core-stateless-evaluation-engine.es.md)** (2026-06-28).

> **Corrección:** la Decisión 1 de abajo planteaba `Producto`/`Iniciativa` como unidades de gobierno del Core con persistencia/anclaje. [ADR-0101](./0101-core-stateless-evaluation-engine.es.md) corrige la *altitud*: el Core es un **evaluador stateless**; producto/tenant/iniciativa son **solo identificadores de contexto opacos**, propiedad del Tracker que los persiste. El diagnóstico y las Decisiones 2–6 de este ADR siguen siendo válidos.

## Fecha
2026-06-28

## Contexto y problema

Evolith Core declara que **no** es "a task-management platform" (`reference/core/README.md:47`, encabezado de sección `:41`), pero sus superficies de gobierno **contradicen** esa declaración al exigir artefactos ágiles de ejecución como **evidencia bloqueante de gate**: *Evolith User Story* y *Agile Backlog* son **Required** en Fase 2, *Technical Stories* **Required** en Fase 3 (`reference/governance/sdlc/sdlc-evolith-artifact-mapping.md:130,132,133,223`), y el gate de Fase 2 depende de "story readiness" (`:209`). Schemas operativos viven dentro del Core como contratos canónicos (`rulesets/schema/evolith-user-story.schema.json`, `agile-backlog.schema.json` con `sprint`/`velocity`/`totalPoints`, `functional-story.schema.json`, `ballpark-estimation.schema.json`).

A la vez, **no existe entidad `Producto` ni `Iniciativa`** en el dominio del Core (`packages/core-domain/src/domain/entities/` solo tiene `blueprint.ts`); la iniciativa es un string opaco nunca persistido (`gate-evidence.ts:87-89`). Evolith Tracker ya modela `PRODUCT`/`SDLC_PROCESS` como agregados de primera clase (`reference/products/evolith-tracker/sdlc-tracker-technical-interfaces.md:415-428`): el Core va por detrás de su propio Tracker.

Esta es la **conflación gobierno ↔ ejecución operativa**: el Core mezcla el plano de gobierno duradero (arquitectura, SDLC, reglas, decisiones, trazabilidad) con el plano de ejecución volátil (épicas, historias, tareas, sprints, estimaciones, velocity, tableros) que pertenece a herramientas externas (Jira, Azure DevOps, GitHub Projects, Trello, Asana).

Ya existe un precedente correcto: `executive-scorecard-rule.handler.ts:55` devuelve `skipped` para sprint throughput ("requires tracker data") — la frontera está aplicada, pero solo parcialmente.

## Decisión

Adoptar una **frontera gobierno/ejecución** estricta para Evolith Core, con `Producto` e `Iniciativa` como unidades primarias de gobierno.

### 1. Producto e Iniciativa son las unidades primarias de gobierno
- `Producto` es la unidad principal de evolución, arquitectura, gobierno y trazabilidad (alineada con `PRODUCT` del Tracker).
- `Iniciativa` es la unidad principal de cambio/mejora/requerimiento/transformación/delivery gobernado. **Un Producto tiene una o muchas Iniciativas (1:N), posiblemente concurrentes, y cada Iniciativa gobierna su propio flujo SDLC** (fases, gates, artefactos, evidencias).
- Toda evidencia, validación, decisión y asesoría se ancla a `(tenantId → productId → initiativeId → phaseId → gateId)`. Multi-tenant por construcción.

### 2. Épicas/historias/issues/tareas solo como referencias externas
- Épicas, historias, issues, tareas, sprints, story points, backlog y estimaciones **nunca son entidades del Core**. Solo pueden existir como `ExternalReference` **opcional** colgando de una `Iniciativa` (o de una `Evidencia`), como `system + externalId + url + hash/snapshot` — **jamás copiando** el dato canónico externo. El Core es agnóstico del sistema externo del tenant.
- Ningún gate del Core puede tratar un `ExternalReference` como `mandatoryEvidence` ni bloqueante. Los gates evalúan `Artefacto` de gobierno + `Ruleset`, nunca historias.

### 3. Evaluación ≠ Decisión ≠ Asesoría (tres tipos de salida)
- `ValidationResult` — **evaluación** de conformidad producida por Core/CLI/MCP (stateless); no muta estado de fase.
- `DecisionRecord` — decisión de gobierno **vinculante** (veredicto de gate vía el vocabulario canónico `Verdict`); el veredicto canónico de gate lo **emite Tracker en runtime**, el Core define la forma.
- `AdvisoryRecord` — **consultoría / asistencia arquitectónica NO vinculante** (recomendaciones, opciones de diseño, guía de riesgo/coste) producida por motores advisory del Core o por agentes IA (Winston, Principal Architect). Orienta pero nunca bloquea un gate.

### 4. Evolith es autoridad de gobierno y asesor arquitectónico
Además de gobernar (validar + decidir), el Core presta **consultoría y asistencia arquitectónica** como artefacto de primera clase, trazable y versionado (`AdvisoryRecord`), solicitable en cualquier fase — incluso fuera de un gate.

### 5. El Core no posee estado de proceso en runtime
El Core **define y evalúa**; Evolith Tracker **posee el estado canónico de fase, el grafo de evidencia y las decisiones de gate** en runtime ("Core defines. Providers execute. CLI and MCP evaluate. Tracker decides and audits.").

### 6. Desambiguación de `GateDecision`
El value object del Core `GateDecision` (`packages/core-domain/src/gates/decision/gate-decision.ts:19`, `phase: number`, `violations: string[]`) se renombra a `CoreGateVerdict` y alimenta `DecisionRecord`. El literal legacy `'WAIVED'` migra al canónico `Verdict.WAIVE` (`verdict.ts:20`) vía `fromLegacyGateDecision`. El `GateDecision` rico es del Tracker.

El diseño completo (schemas, contratos, cambios OPA, flujos, roadmap R0–R5 y backlog) está en [Rediseño de Gobierno Producto/Iniciativa](../../../core/product-initiative-governance-redesign.es.md) y se propone para adopción del ecosistema en [UP-002](../../../governance/upstream-proposals/UP-002-product-initiative-governance-model.es.md).

## Consecuencias

### Positivas
- Elimina la conflación Scrum↔gobierno; respeta `README.md:47` y alinea el dominio del Core con su propio Tracker.
- Habilita trazabilidad real e iniciativas concurrentes por producto, con aislamiento multi-tenant cerrado a nivel de evidencia.
- Separa "lo que recomiendo" (`AdvisoryRecord`) de "lo que exijo" (`DecisionRecord`), convirtiendo la asistencia arquitectónica en capacidad de primera clase.
- Mantiene el Core provider-neutral; los sistemas de trabajo externos siguen siendo autoritativos de sus hechos operativos.

### Negativas / riesgos
- Introduce nueve entidades de gobierno — riesgo de sobre-modelado. Mitigado por adopción incremental (R0–R5) y la regla de que cada entidad debe anclarse a un agregado real del Tracker.
- Migración de schemas versionados y satélites existentes — mitigada por deprecación con grandfathering (contratos arrancan en `warn`).
- Depende de un Tracker aún no implementado para la emisión runtime de `DecisionRecord` — mitigado desacoplando definición de emisión (el Core degrada a evaluación-only, como el precedente `skipped`).

## Alternativas consideradas
- **Mantener historias como evidencia de gate (status quo):** rechazada — perpetúa la conflación y duplica Jira/ADO/GitHub Projects dentro del Core.
- **Que el Core posea el estado de proceso en runtime:** rechazada — viola el modelo de responsabilidad documentado y acopla la constitución provider-neutral a la ejecución runtime.
- **Modelar épicas/historias como entidades de primera clase del Core (más ligero que gestión de tareas completa):** rechazada — cualquier entidad operativa de primera clase reintroduce la violación de frontera; `ExternalReference` es la única costura operativa sancionada.

---

[Volver al Registro de ADRs](../README.es.md) · [Matriz de Decisión de ADRs](../adr-matrix.es.md)
