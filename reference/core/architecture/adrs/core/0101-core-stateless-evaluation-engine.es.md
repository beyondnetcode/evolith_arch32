> **Navegación bilingüe:** [See English version](./0101-core-stateless-evaluation-engine.md)

# ADR-0101: Evolith Core como Stateless Evaluation Engine

> **Agent Signature:** Architect Agent (Winston)

> **Firma del agente:** Architect Agent (Winston)

## Estado
Accepted (2026-06-29 — Architecture Board) — **supersede la Decisión 1 de [ADR-0100](./0100-governance-execution-boundary-product-initiative.es.md)**

## Fecha
2026-06-28

## Contexto y problema

[ADR-0100](./0100-governance-execution-boundary-product-initiative.es.md) diagnosticó correctamente la conflación gobierno↔ejecución (historias/backlog como evidencia bloqueante de gate; schemas ágiles como contratos canónicos del Core) y acertó al exigir externalizarlos a `ExternalReference`. Pero su **Decisión 1** cometió un **error de altitud**: elevó `Producto` e `Iniciativa` a **entidades de dominio del Core**, y el diseño acompañante (`reference/core/product-initiative-governance-redesign.md`, commit `4a156f3b`) dio al Core **repositorios, casos de uso mutadores y endpoints de escritura** para ellos (`IProductRepository`, `IInitiativeRepository`, `IEvidenceRepository`, `IDecisionRecordRepository`, `RegisterProduct`, `OpenInitiative`, `RecordEvidence`, `RecordDecision`, `POST /api/v1/products`, `/initiatives`, `/evidence`, `/decisions`).

Eso contradice el criterio corregido (el Core no debe poseer/persistir producto/tenant/iniciativa/evidencia/decisión) **y el código real**, que ya es un evaluador stateless:

- `src/packages/core-domain/src/application/services/satellite-evaluation-pipeline.service.ts` — pipeline puro `manifest → topología → gate → reglas Rego → verdict`, sin persistencia.
- `packages/core-domain/src/domain/gate-evidence.ts:87-89` — `ExecutionContext { initiative?; tenant?; phase? }` explícitamente *"Never persisted or interpreted"*.
- `packages/core-domain/src/application/validators/evaluators/handlers/executive-scorecard-rule.handler.ts:55` — devuelve `skipped` ("Sprint throughput requires tracker data"): el Core declina datos operativos.
- `apps/core-api/src/application/services/workspace-reference-resolver.service.ts:9-11` — el Core "never receives a user path, UMS token, repository credential, or tenant identifier"; el consumidor pasa una referencia opaca.
- **No existe repositorio de producto/tenant/iniciativa/evidencia/decisión** (grep confirmado). El único repositorio de gobierno es `IBlueprintRepository` — una **definición**, no operación.

El diseño previo proponía *construir* una persistencia que el criterio prohíbe y que el código nunca tuvo.

## Decisión

**Evolith Core es un Core Evaluation Engine stateless.** Es el núcleo normativo, arquitectónico y evaluador de la suite; nunca posee ni persiste estado de negocio/operativo.

### 1. Contrato de evaluación stateless (supersede la Decisión 1 de ADR-0100)
- El Core **recibe un `EvaluationContext`**, lo evalúa contra **definiciones/estándares** versionados (fases, gates, artefactos, formas de evidencia, blueprints, topologías, rulesets, policies OPA), y **devuelve un `EvaluationResult`**. Nunca llama de vuelta para mutar.
- `tenantId`, `productId`, `initiativeId`, `initiativeGroupId`, `phaseId`, `gateId`, `artifactId` son **identificadores de contexto opacos**, nunca entidades del Core. El Core no posee, persiste ni interpreta producto/tenant/iniciativa/evidencia/decisión.
- La única persistencia del Core son **definiciones/estándares versionados** (`rulesets/`, `reference/core/architecture/blueprints/`, `reference/core/sdlc/`, `IBlueprintRepository`).

### 2. El Tracker (o cualquier consumidor) posee el estado operativo
Evolith Tracker registra, persiste y audita productos, tenants, ideas, iniciativas, agrupaciones, fases/gates ejecutados, artefactos, evidencias, decisiones, despliegues, estados, auditoría e integraciones externas. **Envía** el `EvaluationContext` y **consume** el `EvaluationResult`. Las herramientas externas (Jira/Azure DevOps/GitHub Projects) siguen siendo la fuente de verdad del detalle de ejecución del delivery.

### 3. Tres salidas, ninguna vinculante por parte del Core
El Core emite, dentro del `EvaluationResult`: resultados por engine (`GateEvaluationResult`, `ArtifactEvaluationResult`, `EvidenceEvaluationResult`, `ArchitectureEvaluationResult`, `BlueprintEvaluationResult`, `CheckpointEvaluationResult`, `ComplianceResult`), `RiskFinding[]`/`GapFinding[]`/`RequiredAction[]`, `Recommendation[]`, y un `DecisionRecommendation` **no vinculante**. El `GateDecision` canónico vinculante lo decide y persiste el Tracker, no el Core.

### 4. Arquitectura interna
El Core se compone de 13 sub-engines/registries: Gate · Artifact · Evidence · Architecture · Blueprint · Topology Recommendation · Ruleset Execution · OPA Policy · Checkpoint · Compliance · Recommendation + Contract Schema Registry + Standard Catalog Registry.

### 5. Qué mantiene ADR-0100
El diagnóstico de ADR-0100 y sus Decisiones 2–6 (externalizar épicas/historias/tareas a `ExternalReference`; evaluación ≠ decisión; `GateDecision`→`CoreGateVerdict`; `'WAIVED'`→`Verdict.WAIVE`; el Core no posee estado de proceso en runtime) **siguen siendo válidos**. Aquí solo se corrige la *altitud de propiedad/persistencia* de la Decisión 1: producto/tenant/iniciativa son **contexto**, no entidades del Core.

El diseño corregido completo (contratos EvaluationContext/Result, engines, flujos, cambios en rulesets/OPA/blueprints, roadmap, backlog) está en [Core Evaluation Engine Design](../../../core-evaluation-engine-design.es.md). Supersede los Entregables 2, 4, 10, 11, 12 y los flujos de escritura del 13 de `product-initiative-governance-redesign`.

## Consecuencias

### Positivas
- El Core queda desacoplado, modular, auditable, extensible y reutilizable por múltiples consumidores.
- No se construye persistencia nueva; el diseño coincide con lo que el código ya hace (evaluación stateless), reduciendo coste y riesgo de implementación.
- Fuente única de verdad preservada: estándares en Core, estado operativo en Tracker, detalle de delivery en herramientas externas.

### Negativas / riesgos
- Requiere corregir artefactos ya commiteados (el doc de diseño previo, ADR-0100, UP-002, GT-375). Mitigado con notas de corrección quirúrgicas en lugar de reescrituras destructivas, preservando el rastro auditable del error de altitud.
- El contrato `EvaluationContext`/`EvaluationResult` debe ser suficientemente completo para todos los engines sin filtrar propiedad operativa. Mitigado con un Contract Schema Registry versionado.

## Alternativas consideradas
- **Editar la Decisión 1 de ADR-0100 in situ:** rechazada — borra el error de altitud de la historia decisional; la corrección en sí tiene valor de gobernanza.
- **Mantener Producto/Iniciativa propiedad del Core con repositorios (diseño previo):** rechazada — viola el criterio corregido, acopla el Core al estado operativo y construye persistencia que el código nunca tuvo.

---

[Volver al Registro de ADRs](../README.es.md) · [Matriz de Decisión de ADRs](../adr-matrix.es.md) · [ADR-0100](./0100-governance-execution-boundary-product-initiative.es.md)
