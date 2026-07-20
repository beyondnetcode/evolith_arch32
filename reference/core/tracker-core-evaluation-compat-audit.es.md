# Auditoría de compatibilidad Evolith Tracker ↔ Evolith Core (evaluación por contexto)

> **Navegación bilingüe:** *El espejo en inglés queda pendiente (fase de documentación).*

**Clasificación:** Auditoría de compatibilidad — Core Evaluation Engine
**Estado:** *Hallazgos — Pendiente de revisión del Architecture Board* (solo documentación)
**Autoridad:** ADR-0101 (Tracker stateful / Core evaluador stateless) · Diseño objetivo: [Core Evaluation Engine Design](./core-evaluation-engine-design.es.md)
**Owner:** Evolith Architecture Board
**Origen:** Auditoría multi-agente sobre código real (7 agentes; 5 lectores de subsistema + 2 de síntesis). Hallazgos de alto impacto reverificados manualmente contra el código (ver Nota de verificación).

---

## Veredicto ejecutivo

> **NO. El Core no soporta hoy la interacción por contexto (`EvaluationContext` → `EvaluationResult`).** La brecha es **bilateral y simétrica**: ni el productor (Tracker, que es *diseño sin código*) ni el consumidor (Core) tienen el contrato implementado. El Core recibe contexto de **filesystem** (paths crudos) y emite salidas legacy heterogéneas (`GateEvidence`/`ValidationResult`/`EvaluationVerdict` con `passed/failed`). El `EvaluationContext` que aparece en código es un **homónimo** de dos campos de path.

| Subsistema | ¿Soporta evaluación por contexto? | Evidencia |
|---|---|---|
| **Core API** | **NO** | `evaluation.dto.ts:8` recibe `satellitePath` crudo (viola ADR-0074); `/v1/evaluate` es evaluador de satélite por path |
| **CLI** | **PARCIAL** | aproxima con `validate`/`gate`/`phase-advance` por flags; sin `evolith evaluate --context` |
| **MCP** | **PARCIAL** | `composable-validate` se acerca; **0** ocurrencias de `core.evaluate`/`evolith-evaluate` |
| **Rulesets/OPA** | **NO** | 5 shapes de input incompatibles; **0** `input.context`; builder solo lee FS |

**Hallazgos de alto impacto (reverificados contra el código):**

1. **Colisión de nombre `EvaluationContext`** — ya existe en `src/packages/core-domain/src/application/validators/evaluators/evaluator.interface.ts:3-5` pero significa `{ satellitePath, corePath }` (contexto de *filesystem*), **no** el contexto canónico de ~20 campos. Verificado.
2. **`POST /api/v1/evaluate` viola ADR-0074** — `src/apps/core-api/src/presentation/dtos/evaluation.dto.ts:8,13` (`EvaluateSatelliteDto { satellitePath, corePath? }`) recibe paths crudos en vez de un `workspaceRef` opaco. Verificado.
3. **`phase-gates.rego` triple-desconectado** — ausente de `src/rulesets/opa/main.rego` (0 imports), **sin** `phase-gates.input.schema.json`, y sin shape en el builder. Es el único rego alineado con el modelo Tracker y no se ejecuta. Verificado.
4. **Conflación `input.story.*`** — `src/rulesets/opa/dod.rego` usa `input.story` 11 veces (entidad del Tracker como raíz de input); policy huérfana que ningún builder puebla. Verificado. (También `0` herramientas `core.evaluate` en MCP — verificado.)

**Causa raíz bilateral:** (Core) acoplamiento a filesystem (paths + escaneo de disco, 5 shapes de input sin builder único); (Tracker) su embrión `EvaluateCriterionRequest` cubre ~5 de 17 campos del contexto objetivo y traslada el resto a resolución por referencia (`rulesetRef`) y a estado interno, incompatible con un Core que debe recibir **todo el contexto temporal** en el request.

## Índice de entregables

| # | Entregable | Sección |
|---|---|---|
| 1 | Diagnóstico de compatibilidad | §1 |
| 2 | Mapa de contexto Tracker→Core (campo a campo) | §2 |
| 3 | Contratos requeridos para Core API | §3 |
| (4·análisis) | Cobertura de los 10 tipos de contexto | §(pto 4) |
| 8 | Diseño de `EvaluationContext` | §8 |
| 9 | Diseño de `EvaluationResult` | §9 |
| 4 | Capacidades requeridas CLI | §4 |
| 5 | Capacidades requeridas MCP | §5 |
| 6 | Interfaces internas en Core | §6 |
| 7 | Cambios en rulesets/OPA | §7 |
| 10 | Brechas detectadas (priorizadas) | §10 |
| 11 | Mejoras en Core | §11 |
| 12 | Mejoras en Tracker | §12 |
| 13 | Backlog (alineado a GT-376…GT-381) | §13 |
| — | Evidencia por subsistema (5 lectores) | Apéndice |

---


> **Autoridad:** ADR-0101 (Tracker stateful / Core evaluador stateless). **Diseño objetivo:** `reference/core/core-evaluation-engine-design.es.md:299-479`. **Premisa transversal confirmada por el dossier:** Tracker es *diseño objetivo sin código* (`product/products/evolith-tracker/README.md:7,11`); el `EvaluationContext` canónico **no existe implementado en el Core** — el `EvaluationContext` que aparece en código es un **homónimo** de dos campos de filesystem (`evaluator.interface.ts:3-6`, confirmado: `{ satellitePath, corePath }`). Por tanto la brecha es **bilateral y simétrica**: ni el productor (Tracker) ni el consumidor (Core) tienen hoy el contrato.

---

## 1. Diagnóstico de compatibilidad Tracker ↔ Core

**Veredicto general: NO.** El Core **no soporta hoy** la interacción por contexto canónico. Recibe contexto de *filesystem* (paths crudos) y emite salidas legacy heterogéneas (`GateEvidence`, `ValidationResult`, `EvaluationVerdict`). El único canal de contexto opaco (`meta.context` del envelope ADR-0073) está limitado a 3 strings (`initiative`/`tenant`/`phase`) y es **eco no interpretado** (`envelope.interceptor.ts:66-87`, `gate-evidence.ts:87-92`). El contrato `EvaluationContext`→`EvaluationResult` existe solo como diseño.

| Subsistema | Estado | Evidencia (ruta:linea) | Brecha principal |
|---|---|---|---|
| **Core API** | **NO** | `evaluation.controller.ts:18-30` (delega en `ValidateSatelliteUseCase` con `manifest`); `evaluation.dto.ts:4-24` (DTO confirmado: solo `satellitePath`, `corePath?`, `topology?`, `phase?`) | `POST /api/v1/evaluate` es un evaluador de satélite **por path crudo**, no el `/evaluate` genérico. No acepta `EvaluationContext` (sin `kinds[]`, identificadores opacos, artifacts/evidence/checkpoint/deployment, rulesetRef/blueprintRef). Devuelve `EvaluationVerdict` legacy, no `EvaluationResult`. Viola ADR-0074 (recibe `satellitePath`, no `workspaceRef`). |
| **CLI** | **PARCIAL** | `validate.command.ts:127-364` (pipeline GT-281 vía `--manifest/--phase/--topology`); `gate.command.ts:50-117` + `phase-advance.command.ts:49-122` (ecoan `tenant`/`initiative` opacos) | No existe `evolith evaluate --context <file.json>`. El contexto se arma de flags sueltos por comando; no consume ni emite el contrato canónico. `validate` y `sdlc gate-status` rompen paridad de envelope ADR-0073. Pasa paths reales, no `workspaceRef`. |
| **MCP** | **PARCIAL** | `composable-validate.tool.ts:17-57` (input más rico, aún plano); `gate.tools.ts:26-84` + `phase-advance.tools.ts:26-82` (aceptan `tenant`/`initiative`/`evaluatedBy`); `mcp-tool-dispatch.ts:62-72` (propaga contexto opaco a telemetría) | No existe `core.evaluate`/`evolith-evaluate` que reciba el `EvaluationContext` completo (0 ocurrencias en `src/packages/mcp-server/src`). Outputs legacy. HITL implícito (solo tools mutativas); sin `executionMode` declarativo; ningún tool emite `requiere-revisión-manual`. |
| **Rulesets / OPA** | **NO** | `opa-input-builder.ts:8-61` (builder escanea disco); `evaluator.interface.ts:3-6` (`EvaluationContext` homónimo FS); `phase-gates.rego:8-77` (único shape alineado, desconectado) | `input.context` canónico no existe en ninguna policy (0 resultados). 5 shapes de input incompatibles; un solo builder cubre 1 (`satellite`/`core`). `phase-gates.rego` (el único alineado con Tracker) sin wiring en `main.rego`, sin schema, sin builder. Paridad native+OPA sin builder compartido → drift estructural. |

**Síntesis:** 0 subsistemas SOPORTAN; 2 PARCIAL (CLI, MCP — aproximan con operaciones fragmentadas + ecos opacos); 2 NO (Core API, Rulesets/OPA — acoplados a filesystem). La paridad BR-008 entre superficies es **uniforme en la carencia**: ninguna expone el contrato canónico.

---

## 2. Mapa de contexto que Tracker debe enviar al Core

Cruce campo a campo del `EvaluationContext` objetivo contra (a) lo que Tracker tendría para producir (su embrión `EvaluateCriterionRequest`, `sdlc-tracker-technical-interfaces.md:340-351`) y (b) lo que el Core consume hoy.

| Campo (EvaluationContext objetivo) | ¿Tracker lo tiene? (ruta Tracker) | ¿Core lo consume hoy? (ruta Core) | Estado |
|---|---|---|---|
| `tenant_id` | SÍ — `processContext.tenantId` (`...interfaces.md:342`) | Solo eco opaco en `meta.context` (`envelope.interceptor.ts:66-87`); no entra a evaluación | **parcial** (solo trazabilidad) |
| `product_id` | SÍ — `processContext.productId` (`...interfaces.md:343`) | NO — `meta.context` solo lleva `initiative/tenant/phase` (`gate-evidence.ts:87-92`) | **falta** |
| `initiative_id` | NO (modelo solo llega a PRODUCT→SDLC_PROCESS; lo más cercano `processId`, `...interfaces.md:344`) | Eco opaco `meta.context.initiative` (no interpretado) | **falta** (sin origen en ER de Tracker + sin consumo Core) |
| `initiative_group_id` | NO — no hay agrupador en el ER (`...interfaces.md:415-440`) | NO | **falta** (brecha de modelado upstream) |
| tipo de validación solicitada (`kinds[]`) | parcial — implícito por endpoint (`criterion evaluate` vs `gate assess`, `:354-357`) | parcial — implícito por presencia de campo en `composable-validate` (`composable-validate.controller.ts:8-43`); `/evaluate` no lo expone | **parcial** |
| fase actual (`phaseId`) | SÍ — `processContext.phase` (`:345`, string) | parcial — `phase?` string suelto (`evaluation.dto.ts:20-23`); alias f1–f5, no `PhaseId` tipado (`phase-id.ts`) | **parcial** |
| gate a evaluar (`gateId`) | SÍ — `processContext.gateId` (`:346`) | parcial — `gateId` por path en `gates.controller.ts:15-30`; fase inferida por regex | **parcial** |
| artefactos requeridos + presentados | parcial — solo `evidenceIds[]` (`:349`), sin requerido-vs-presentado | NO — ningún DTO acepta `artifactIds[]`; el engine los descubre leyendo el workspace | **falta** |
| evidencias disponibles (`evidence[]`) | SÍ por referencia — `evidenceIds: string[]` (`:349`); `EvidenceItem` rico (`:100-149`) | NO — ningún DTO acepta `EvidenceContext[]` (Evidence Engine sin endpoint que reciba evidencia declarada) | **falta** (en Core; Tracker tiene el embrión) |
| checkpoints externos (`checkpoint`) | parcial — viven como `EvidenceItem.references` pipeline/deployment (`:128-132`), no se pasan al evaluador salvo vía `evidenceIds` | NO — sin `CheckpointContext`; `propose-advance` no recibe métricas/checkpointId (`projects.controller.ts:39-57`) | **falta** |
| config SDLC activa del tenant | NO se envía — se resuelve por `rulesetRef` (`:348`) + Policy Resolution Service interno (`...target-design.md:155`) | NO — sin campo; el builder OPA lee del disco (`opa-input-builder.ts:8-61`) | **falta** |
| restricciones personalizadas del tenant | NO — absorbido en el policy snapshot interno de Tracker | NO | **falta** |
| rulesets/policies habilitadas | parcial — `rulesetRef` único (`:348`), no lista, no expone policies OPA | parcial — `ruleset?` suelto en `composable-validate`; no expone policies OPA aplicadas | **parcial** |
| modo de ejecución (manual/híbrido/agéntico) | NO — sin campo de modo | NO (lo más cercano `evaluatedBy` human/agent/ci en gate/phase, no es selector de modo) | **falta** |
| contexto arquitectónico (`architecture`) | NO — sin campo | NO — `validate-satellite`/`detect-drift` evalúan el código del workspace, no facts declarados (`architecture.controller.ts:46-69`) | **falta** |
| blueprint/topología aplicable (`blueprintRef`/`topologyRef`) | NO — sin campo | parcial — `topology?` string en `/evaluate` y `composable`; `ValidateBlueprintUseCase` existe **sin controller** | **parcial/falta** |
| historial relevante de decisiones | NO se inyecta — Tracker lo guarda (`GateDecision`, `:186-204`) pero no lo pasa al evaluador | NO | **falta** |
| resultado esperado (`expectedResult`) | NO — sin campo | NO | **falta** |

**Lectura:** de 17 campos, **2 cubiertos** (tenant_id y fase, ambos solo parcialmente y vía eco/string suelto), **6 parciales**, **9-10 faltan**. La causa raíz del lado Tracker es que su diseño traslada la mayor parte del contexto a **resolución por referencia** (`rulesetRef`) y a estado interno (Policy Resolution Service), incompatible con un Core que debe recibir **todo el contexto temporal** en el request. La causa raíz del lado Core es el **acoplamiento a filesystem** (paths + escaneo de disco).

---

## 3. Contratos requeridos para Core API

**Endpoint canónico:** `POST /api/v1/evaluate` con cuerpo `EvaluationContext` → `SuccessEnvelope<EvaluationResult>` (envelope ADR-0073, ya universalizado vía `EnvelopeInterceptor` + `ApiEnvelopeResponse`).

**Reconciliación con lo existente:**

| Pieza actual | Acción de reconciliación |
|---|---|
| `evaluation.controller.ts:18-30` (firma `evaluate(@Body() EvaluateSatelliteDto)`) | **Sustituir el body** por `EvaluationContext`. El handler ya devuelve `evaluationVerdict.outputEnvelope` (envelope ADR-0073 OK); cambia el *payload* `data` a `EvaluationResult`. |
| `evaluation.dto.ts:4-24` (`EvaluateSatelliteDto`: `satellitePath`, `corePath?`, `topology?`, `phase?`) | **Reemplazar** por `EvaluationContextDto`. Eliminar `satellitePath`/`corePath` crudos (violan ADR-0074) → introducir `workspaceRef` opaco resuelto por `WorkspaceReferenceResolverService`. Migrar `topology`→`topologyRef`, `phase`→`phaseId` tipado. Añadir `kinds[]`, identificadores opacos (`tenantId`/`productId`/`initiativeId`/`initiativeGroupId`), `artifactIds[]`, `evidence[]`, `checkpoint`, `deployment`, `architecture`, `rulesetRef`/`blueprintRef`/`schemaRef`, `executionMode`, `expectedResult`, `correlationId`/`passthrough`. |
| Salida `EvaluationVerdict` legacy (`satellite-manifest.ts:110-114`, verdict `passed/failed`) | **Normalizar** a `EvaluationResult` con `Verdict` enum (`PASS\|FAIL\|WAIVE\|SKIP`, `verdict.ts:14-23`; helpers de migración `verdict.ts:63-100` ya existen, hoy no aplicados en presentación). |
| `composable-validate.controller.ts:50-85` (kinds implícitos por presencia de campo) | **Candidato natural** del engine multi-kind: refactorizar su DTO/salida al contrato canónico y consolidar `/evaluate` sobre él (es el más cercano arquitectónicamente). |
| `ValidateBlueprintUseCase` (dominio, sin controller) | Exponer como `kind=blueprint` dentro de `/evaluate` (o `POST /api/v1/blueprints/validate`); hoy Engine #5 no tiene superficie REST. |
| `meta.context` (3 strings, eco) | Mantener como **trazabilidad** (correlación), **no** como vehículo de contexto evaluable. El contexto evaluable viaja en el **body** (`EvaluationContext`), no en `meta`. |

**Envelope ADR-0073:** respuesta = `SuccessEnvelope<EvaluationResult>` (éxito) / `ErrorEnvelope` (error de validación de contrato), ambos ya soportados. El `meta.context` sigue ecoando `tenant`/`initiative`/`phase` para correlación.

**Deuda a reconciliar:** `POST /api/v1/phases/transition` (`phases.controller.ts:15-27`) **muta estado de fase** y precede a este diseño — viola el invariante "Core no muta estado de fase canónico". Debe degradarse a evaluación/propuesta (o eliminarse) cuando Tracker asuma la mutación.

---

## (Análisis pto 4) Cobertura de los 10 tipos de contexto por Core API

| # | Tipo de contexto | Endpoint actual (ruta:linea) | EXISTE/PARCIAL/FALTA | Brecha exacta |
|---|---|---|---|---|
| 1 | **Fase** | `POST /validate/composable` (`composable-validate.controller.ts:24-27`); `POST /evaluate` (`evaluation.dto.ts:20-23`) | **PARCIAL** | `phase` string suelto (alias f1–f5), no `EvaluationContext.phaseId` tipado (`phase-id.ts`). |
| 2 | **Gate** | `POST /gates/:gateId/evaluate` (`gates.controller.ts:15-30`) | **PARCIAL** | `gateId` por path + fase por regex; salida `GateEvidence` legacy, no `GateEvaluationResult` canónico. |
| 3 | **Artefacto** | — (implícito en gate/satellite) | **FALTA** | Ningún DTO acepta `artifactIds[]` ni requerido-vs-presentado; el engine los descubre leyendo el workspace. |
| 4 | **Evidencia** | — | **FALTA** | Ningún DTO acepta `EvidenceContext[]` (`evidenceId`, `evidenceType`, `producer`, `references`, `integrity`). Evidence Engine sin endpoint de entrada declarada. |
| 5 | **Checkpoint externo** | `POST /projects/propose-advance` (parcialmente relacionado, `projects.controller.ts:39-57`) | **FALTA** | Sin `CheckpointContext` (`checkpointId`, `metrics`); `propose-advance` no recibe métricas ni checkpointId. |
| 6 | **Arquitectura** | `POST /architecture/validate-satellite` (`:46-56`); `POST /architecture/detect-drift` (`:58-69`) | **PARCIAL** | Evalúa el código del workspace, no un `ArchitectureContext` declarado (`style`, `components`, `decisionRefs`). Salida `ValidationResult`, no `ArchitectureEvaluationResult`. |
| 7 | **Blueprint** | — (`ValidateBlueprintUseCase` en dominio, sin controller) | **FALTA** | Engine #5 completo en dominio pero ningún controller lo expone; sin `blueprintRef` en DTOs. |
| 8 | **Topología** | `GET /architecture/topologies(/:id)` (`:24-44`); `topology?` en composable/evaluate | **PARCIAL** (solo lectura) | Solo lista/lee topologías. No hay endpoint que **evalúe conformidad** a una topología contra facts. |
| 9 | **Despliegue** | — (`triggerDeploy` en propose-advance es acción) | **FALTA** | Sin `DeploymentContext` (`environment`, `releaseRef`, `status`); no hay deployment engine ni endpoint. |
| 10 | **Cumplimiento (compliance)** | — (lo más cercano `summary` de `EvaluationVerdict`, `satellite-manifest.ts:93-100`) | **FALTA** | Sin endpoint que devuelva `ComplianceResult` (`verdict`, `score`, `totalChecks`…) ponderado. |

**Resumen:** de 10 tipos — **0 EXISTE pleno**, **4 PARCIAL** (fase, gate, arquitectura, topología-lectura), **6 FALTAN** (artefacto-como-contexto, evidencia, checkpoint, blueprint-en-API, despliegue, compliance-como-salida).

---

## 8. Diseño recomendado de Evaluation Context

Reutiliza el contrato canónico de `reference/core/core-evaluation-engine-design.es.md:299-334`, consolidando los embriones de Tracker (`EvaluateCriterionRequest`/`EvidenceItem`, `sdlc-tracker-technical-interfaces.md:100-149,340-351`). Principio rector: **todo el contexto temporal viaja en el body**; el Core no resuelve estado ni ve paths (solo `workspaceRef` opaco).

```typescript
/** Lo que el Tracker (stateful) envía al Core (stateless) en POST /api/v1/evaluate */
export interface EvaluationContext {
  // --- Identificadores opacos (NO entidades del Core; trazabilidad/correlación) ---
  tenantId?: string;
  productId?: string;
  initiativeId?: string;        // BRECHA upstream: sin origen en ER de Tracker hoy
  initiativeGroupId?: string;   // BRECHA upstream: sin agrupador en ER de Tracker hoy

  // --- Qué evaluar ---
  kinds: EvaluationKind[];      // ['gate','artifact','evidence','checkpoint',
                                //  'architecture','blueprint','topology','deployment',
                                //  'rule','compliance']  (reemplaza "tipo implícito por campo")
  phaseId?: PhaseId;            // tipado (phase-id.ts), NO string suelto f1-f5
  gateId?: string;

  // --- Referencia opaca de workspace (ADR-0074; el Core NUNCA recibe paths) ---
  workspaceRef: string;         // resuelto por WorkspaceReferenceResolverService

  // --- Artefactos: requeridos vs presentados (hoy ausente en todo DTO) ---
  artifacts?: {
    required: string[];         // artifactIds esperados por la config SDLC
    presented: ArtifactRef[];   // { artifactId, type, ref }
  };

  // --- Evidencias declaradas (mapea EvidenceItem de Tracker, :100-149) ---
  evidence?: EvidenceContext[]; // { evidenceId, evidenceType, producer{model,prompt,skill},
                                //   references[], integrity }

  // --- Facts externos declarados (no escaneados del disco) ---
  checkpoint?: { checkpointId: string; metrics: Record<string, number | string> };
  deployment?: { environment: string; releaseRef: string; status: string };
  architecture?: { style: string; components: string[]; decisionRefs: string[] };

  // --- Configuración y restricciones del tenant (hoy resueltas internas en Tracker) ---
  sdlcConfig?: Record<string, unknown>;   // config SDLC activa, enviada explícita
  customConstraints?: Record<string, unknown>;

  // --- Punteros versionados a definiciones (read-only en el Core) ---
  rulesetRef?: string;  rulesetVersion?: string;
  policyRefs?: string[];                   // policies OPA habilitadas (lista, no 1)
  blueprintRef?: string;                   // Engine #5
  topologyRef?: string;                    // conformidad, no solo lectura
  schemaRef?: string;

  // --- Modo y expectativa ---
  executionMode?: 'manual' | 'hybrid' | 'agentic';  // hoy inexistente; habilita HITL
  decisionHistory?: GateDecisionRef[];     // historial relevante (Tracker lo guarda)
  expectedResult?: Verdict;                // resultado esperado para conciliación

  // --- Correlación (eco; nunca interpretado) ---
  correlationId?: string;
  passthrough?: Record<string, unknown>;
}
```

> Nota de modelado: `initiativeId`/`initiativeGroupId` se incluyen por contrato objetivo pero **no tienen origen en el ER actual de Tracker** (que llega a PRODUCT→SDLC_PROCESS, `sdlc-tracker-technical-interfaces.md:415-440`). Es brecha de modelado upstream a resolver antes de implementar.

---

## 9. Diseño recomendado de Evaluation Result

Reutiliza el contrato de `reference/core/core-evaluation-engine-design.es.md:441-479`, normalizando los outputs legacy (`GateEvidence`, `ValidationResult`, `EvaluationVerdict`) al `Verdict` enum (`verdict.ts:14-23`). El Core **evalúa**; **no decide** la `GateDecision` canónica (eso es de Tracker, `sdlc-tracker-technical-interfaces.md:186-204`).

```typescript
/** Lo que el Core devuelve, envuelto en SuccessEnvelope<EvaluationResult> (ADR-0073) */
export interface EvaluationResult {
  // --- Veredicto agregado (Verdict enum, no 'passed/failed' legacy) ---
  overallVerdict: Verdict;      // PASS | FAIL | WAIVE | SKIP
  outcome:                      // resultado de gobernanza enriquecido
    | 'approved' | 'rejected' | 'conditional'
    | 'pending'  | 'requires_manual_review';   // dispara HITL en modo hybrid/agentic

  // --- Sub-resultados por engine (kinds evaluados) ---
  results: {
    gate?: GateEvaluationResult;            // artifactResults[], risks[], gaps[], requiredActions[]
    architecture?: ArchitectureEvaluationResult;
    blueprint?: BlueprintEvaluationResult;
    topology?: TopologyEvaluationResult;
    checkpoint?: CheckpointEvaluationResult;
    deployment?: DeploymentEvaluationResult;
    compliance?: ComplianceResult;          // verdict, score, totalChecks (ponderado)
  };

  // --- Trazabilidad de ejecución (hoy ausente) ---
  rulesExecuted: RuleExecutionRef[];        // lista global de reglas corridas
  policiesApplied: PolicyExecutionRef[];    // policies OPA aplicadas (dual-engine ADR-0041 visible)

  // --- Diagnóstico ---
  gaps: Gap[];
  risks: Risk[];                            // hoy inexistente en TechnicalEvaluationResult
  missingEvidence: string[];                // existe a nivel transición, no en result técnico
  incompleteArtifacts: string[];
  recommendations: Recommendation[];
  requiredActions: Action[];
  decisionRecommendation?: DecisionSuggestion;  // sugerencia (NO la GateDecision canónica)

  // --- Confianza y justificación ---
  confidence: number;                       // 0..1; hoy inexistente
  rationale: string;                        // justificación técnica agregada

  // --- Versionado de lo que se usó (auditoría/reproducibilidad) ---
  versions: {
    core: string;
    ruleset?: string; rulesetVersion?: string;
    policy?: string;                        // versión policy OPA (hoy ausente)
    blueprint?: string;                     // versión blueprint (hoy ausente)
  };

  evaluatedAt: string;
  correlationId?: string;
}
```

**Conciliación de outputs legacy → `EvaluationResult`:** `GateEvidence.verdict` (`passed/failed/skipped`, `gate-evidence.ts:67-77`) → `overallVerdict: Verdict` vía helpers `verdict.ts:63-100`; `ValidationResult.status/issues[]` (`validate-satellite.use-case.ts:23-28`) → `results.architecture` + `gaps[]`; `TransitionResponse.missingEvidence/requiredActions` (`...interfaces.md:312-313`) → `missingEvidence[]`/`requiredActions[]`. Campos sin contraparte hoy (a crear): `policiesApplied`, `risks`, `confidence`, `decisionRecommendation`, `versions.policy/blueprint`, y los outcomes `conditional`/`pending`/`requires_manual_review`.

---

## Conclusión accionable (orden de implementación sugerido)

1. **Definir el contrato canónico en `@beyondnet/evolith-core-domain`** (`EvaluationContext`/`EvaluationResult` §8/§9) y **renombrar el homónimo** FS (`evaluator.interface.ts:3-6` → `RuleEvaluationFsContext`) para eliminar la colisión. Resolver también el choque de nombres `GateDecision` (target Tracker vs `src/packages/core-domain/src/gates/decision/gate-decision.ts`, GT-316).
2. **Crear la capa de mapeo única** `EvaluationContext → input` que alimente *a la vez* al `OpaInputBuilder` y a los 12 handlers nativos (hoy dos rutas FS paralelas → drift estructural, B5). Wirear `phase-gates.rego` en `main.rego`, crear su `input.schema.json` y su shape en el builder (B3).
3. **Refactorizar `POST /api/v1/evaluate`** sobre `composable-validate` (multi-kind), reemplazando `EvaluateSatelliteDto` por `EvaluationContextDto` con `workspaceRef` (mata la violación ADR-0074) y normalizando la salida a `EvaluationResult` con `Verdict` enum.
4. **Exponer engines faltantes** (blueprint, deployment, checkpoint, evidence declarada, compliance ponderada) como `kinds` del `/evaluate`.
5. **Paridad de superficies (BR-008):** añadir `evolith evaluate --context <file.json>` (CLI) y `evolith-evaluate` / `core.evaluate` (MCP); envolver salidas que aún rompen ADR-0073 (`validate`, `sdlc gate-status`).
6. **Modelar upstream en Tracker** las entidades ausentes (oportunidad, intake, iniciativa, agrupación) que originan `initiativeId`/`initiativeGroupId`; y reconciliar la deuda de `POST /phases/transition` (muta estado canónico).

**Archivos ancla verificados en esta síntesis:** `src/apps/core-api/src/presentation/dtos/evaluation.dto.ts:4-24`, `src/apps/core-api/src/presentation/controllers/evaluation.controller.ts:18-30`, `src/packages/core-domain/src/application/validators/evaluators/evaluator.interface.ts:3-6` (homónimo FS confirmado). Resto de anclajes provienen del dossier de los 5 lectores (rutas citadas inline).


---

## 4. Comandos / capacidades requeridas para CLI (incluye `evolith evaluate`; paridad con API)

> Estado base: la CLI **no** tiene `evolith evaluate` ni `--context file.json`; arma el contexto desde flags sueltos y `validate`/`gate-status` ni siquiera emiten envelope ADR-0073. Anclaje en `src/sdk/cli/src/commands/`.

| # | Capacidad requerida | Qué debe hacer | Anclaje (existe hoy) / Brecha | GT |
|---|---|---|---|---|
| C1 | **Comando nuevo `evolith evaluate --context <file.json> [--format json]`** | Deserializar un `EvaluationContext` canónico (`core-evaluation-engine-design.es.md:299-334`), invocar el pipeline agregado y devolver `EvaluationResult` en `SuccessEnvelope` ADR-0073 | **BRECHA total**: no existe `evaluate.command.ts` ni `EvaluationContext`/`EvaluationResult` en todo `src/sdk/cli/src/` | GT-378/GT-381 |
| C2 | **Aceptar `EvaluationContext` por contrato, no por flags** | Soportar `kinds[]`, `tenant/product/initiative/initiativeGroup`, `phaseId`, `gateId`, `artifactIds[]`, `rulesetRef/Version`, `blueprintRef`, `topologyRef`, `schemaRef`, `evidence[]`, `deployment`, `checkpoint`, `externalReferences[]`, `correlationId`, `passthrough` | **BRECHA**: hoy el "contexto" es un literal local (`validate.command.ts:143-152`, `:181-188`) con `satellitePath/corePath/topology/phase/rulesetId/adrId/filePath` | GT-377/GT-378 |
| C3 | **`workspaceRef` opaco en lugar de paths reales** | Reemplazar `--satellite/-s`, `--core/-c`, `--project`, `--path` por una referencia opaca resuelta server-side | **BRECHA compartida**: la CLI pasa paths crudos (`validate.command.ts` `--satellite`; `gate.command.ts` `--project`; `drift.command.ts` `--path`), violando "el Core nunca ve paths" (`design.es.md:321-322`) | GT-378 |
| C4 | **Envelope ADR-0073 universal en `validate`** | Envolver el verdict del pipeline en `createSuccessEnvelope`/`createErrorEnvelope` igual que `gate`/`phase`/`drift` | **BRECHA de paridad**: `validate` serializa un `ValidationResult` plano y solo imprime el verdict como texto (`validate.command.ts:265-289`, `:331-353`) | GT-378 |
| C5 | **Envelope + `--format json` en `sdlc gate-status`** | Emitir salida estructurada con envelope; separar DORA (operativo, marcar `skipped`) de la evaluación de gates | **BRECHA**: solo imprime humano, sin JSON ni envelope, cwd fijo (`gate-status.command.ts:29-69`, `:80-184`) | GT-378/GT-381 |
| C6 | **Identificadores opacos en todos los comandos de evaluación** | Propagar `--tenant`/`--initiative` (y product/initiativeGroup) hacia `meta.context` de forma uniforme | **PARCIAL**: solo `gate evaluate` (`gate.command.ts:54-55`) y `phase advance` (`phase-advance.command.ts:53-54`) los ecoan; `validate`, `drift`, `gate-status`, `standards` no los aceptan. `ProfileConfig` ya define `tenant`/`initiative` (`config.service.ts:9-13`) | GT-377/GT-381 |
| C7 | **`EvaluationResult` como salida normalizada** | Devolver `overallVerdict` (Verdict enum) + sub-resultados + `risks`/`gaps`/`recommendations`/`requiredActions`/`decisionRecommendation`/`compliance` | **BRECHA**: la salida actual es `ValidationResult`/`GateEvidence`/`DriftReport`, vocabulario legacy `passed/failed` | GT-378/GT-379 |
| C8 | **Paridad 1:1 con `POST /v1/evaluate` (BR-008)** | El comando CLI debe espejar exactamente el endpoint agregado del Core | **BRECHA**: el Core ya tiene `POST /v1/evaluate` (`evaluation.controller.ts:7-31`) pero la CLI lo aproxima vía `validate --manifest` fragmentado entre `gate`/`phase`/`drift` | GT-381 |

Comandos que **se conservan** como sub-evaluaciones (mapeables a `kinds`): `gate evaluate` (`kind=gate`), `phase advance` (`kind=checkpoint/transition`), `drift detect` (`kind=architecture`), `validate --manifest` (gate+artifact+rule+architecture). `architecture scaffold` y `standards init/list` quedan **fuera del eje** (generación/CRUD, no evaluación).

---

## 5. Capacidades requeridas para MCP (`core.evaluate`; paridad; modo agéntico/HITL)

> Estado base: cero ocurrencias de `EvaluationContext`/`EvaluationResult`/`core.evaluate` en `src/packages/mcp-server/src/` y `packages/mcp-tools/src/`. El dispatcher ya tiene cimientos reutilizables (envelope, contexto opaco, ABAC dual-engine, mutative gate).

| # | Capacidad requerida | Qué debe hacer | Anclaje (existe hoy) / Brecha | GT |
|---|---|---|---|---|
| M1 | **Tool nueva `evolith-evaluate` (`core.evaluate`)** | Recibir el `EvaluationContext` completo y devolver `EvaluationResult` estructurado, envuelto por el dispatcher en envelope ADR-0073 | **BRECHA estructural (GAP-MCP-1)**: no existe; lo más cercano es `evolith-composable-validate` con context plano `{satellitePath,corePath,engine,topology,phase,rulesetId,adrId,filePath}` (`composable-validate.tool.ts:87-96`) | GT-378/GT-381 |
| M2 | **Input schema = `EvaluationContext` canónico** | Schema de tool con `kinds[]`, identificadores opacos, `gateId`, `artifactIds[]`, `evidence[]`, `checkpoint`, `deployment`, `architecture`, `rulesetRef/Version`, `blueprintRef`, `topologyRef`, `executionMode`, `expectedResult`/`passthrough` | **BRECHA (GAP-MCP-2)**: inputs hoy son flags planos (`path`, `phase`, `topology`, `ruleset`) | GT-377/GT-378 |
| M3 | **Output = `EvaluationResult` canónico** | Emitir `overallVerdict`, riesgos, decisiones sugeridas, nivel de confianza, justificación, versiones de core/ruleset/policy/blueprint, veredicto `condicionado`/`requiere-revisión-manual` | **BRECHA (GAP-MCP-3)**: outputs hoy son `GateEvidence`/`ValidationResult`/`{passed,gates[]}` | GT-378/GT-379 |
| M4 | **`executionMode` declarativo (manual/híbrido/agéntico)** | Selector de modo en el contexto que module la ruta HITL | **BRECHA (GAP-MCP-4)**: solo existe `evaluatedBy` (human/agent/ci) como procedencia, no como selector de modo (`gate.tools.ts:36`, `phase-advance.tools.ts:35`) | GT-379/GT-381 |
| M5 | **HITL disparado por veredicto `requiere-revisión-manual`** | Cuando el `EvaluationResult` sea `condicionado`/`requiere-revisión-manual`, abrir ruta HITL; hoy el HITL es binario y solo para tools mutativas | **PARCIAL reusable**: mutative gate exige `{apply:true, approvalToken}` con fingerprint y args redactados (`mcp-tool-dispatch.ts:137-159`), pero solo aplica a `evolith-sdlc-handoff` (`sdlc.tools.ts:84`); las evaluaciones no tienen ruta HITL | GT-379 |
| M6 | **Reusar ABAC dual-engine como guardia del modo agéntico** | La tool `core.evaluate` debe pasar por el ABAC nativo+OPA existente (rol/entorno) | **EXISTE reusable**: `abac-evaluator.ts:55-188` invocado en `mcp-tool-dispatch.ts:109-135`, fail-closed en producción (GT-349) | — |
| M7 | **Propagar el contexto opaco del dispatcher al `EvaluationContext`** | Hoy el dispatcher extrae `args.context` y propaga `initiative/tenant/phase` solo a telemetría/correlación (`runWithContext`) | **PARCIAL reusable**: `mcp-tool-dispatch.ts:62-72,186-187` — ese contexto opaco existe pero no llega a las tools como contrato evaluable | GT-377 |
| M8 | **Unificar eje de fases** | `evolith-sdlc-status` usa `phase-0..5` (obsoleto) vs eje canónico `discovery\|design\|construction\|qa\|release` de `gate-evaluate`/`phase-advance` | **BRECHA menor (GAP-MCP-5)**: `sdlc.tools.ts:13-52` | GT-381 |

Paridad BR-008: la brecha de `core.evaluate(EvaluationContext)` es **uniforme en las 3 superficies** (API/CLI/MCP); el MCP no está por debajo, comparte exactamente la misma carencia.

---

## 6. Interfaces internas necesarias en Core (puertos/servicios)

> Principio rector: **reusar** `satellite-evaluation-pipeline.service.ts` (ya compone TopologyCatalog + SdlcDataLoader + OpaEvaluator + RulesetValidator, líneas 23-37) en lugar de reescribir engines. La capa nueva es de **adaptación de contrato**, no de lógica.

| # | Interfaz/servicio interno | Responsabilidad | Reusa / Choca con (ruta:linea) | Estado |
|---|---|---|---|---|
| I1 | **`EvaluationOrchestrator` (servicio de aplicación)** | Recibir `EvaluationContext`, despachar por `kinds[]` a los engines, agregar sub-resultados en `EvaluationResult` con `overallVerdict` derivado | Orquesta sobre `SatelliteEvaluationPipeline.evaluate()` (`:39-98`) que ya devuelve `EvaluationVerdict{passed,gates[],summary,outputEnvelope}` | BRECHA (a crear) |
| I2 | **`EvaluationContextBuilder` (puerto + impl)** | Mapear `EvaluationContext` canónico → `SatelliteManifest` (input del pipeline) resolviendo `workspaceRef` a paths server-side | Adapta a `SatelliteManifest` (`satellite-manifest.ts`) consumido por `pipeline.evaluate(manifest)` (`:39`). Resuelve `workspaceRef` vía `WorkspaceReferenceResolverService` (`src/apps/core-api/.../workspace-reference-resolver.service.ts:9-11`) | BRECHA (a crear) |
| I3 | **`IWorkspaceReferenceResolver` (puerto en core-domain)** | Abstraer la resolución `workspaceRef → {satellitePath, corePath}` para que el dominio nunca vea paths | Hoy el resolver vive en `src/apps/core-api` (capa de presentación); el dominio recibe paths directos (`evaluator.interface.ts:3-6`). Debe **promoverse a puerto de dominio** | BRECHA (a crear) |
| I4 | **`ICanonicalResultMapper`** | Normalizar salidas legacy (`GateEvidence`, `ValidationResult`, `EvaluationVerdict` con `passed/failed`) → sub-resultados canónicos (`GateEvaluationResult` con `Verdict` enum, `ArtifactEvaluationResult`, etc.) | Reusa helpers de migración `verdict.ts:63-100` (hoy **no aplicados** en presentación). Mapea `satellite-manifest.ts` `GateEvaluationResult` legacy → `design.es.md:401-409` canónico | BRECHA (a crear) |
| I5 | **Catálogo de 13 engines tras una interfaz común** | Gate(1), Artifact(2), Evidence(3), Architecture(4), Blueprint(5), Ruleset/OPA(6), Topology(7), Checkpoint(9), Compliance(10), Recommendation, Deployment, Drift, Decision-Recommendation | Reusa use-cases existentes: `evaluate-gate.use-case.ts`, `validate-satellite.use-case.ts`, `validate-blueprint.use-case.ts` (sin controller hoy), `propose-phase-advance.use-case.ts`. **Faltan**: Deployment engine, Compliance agregada, Decision-Recommendation, Topology-conformance (solo hay lectura) | PARCIAL |
| I6 | **`IEvaluationContextPort` (entrada única)** | Único punto de entrada que API/CLI/MCP invocan con `EvaluationContext` → `EvaluationResult` | Reemplaza los DTOs por entidad de cada controller; alinea con ADR-0074 (REST-only) | BRECHA (a crear) |
| I7 | **`OpaInputBuilder` extendido a `input.context`** | Poblar el input OPA desde `EvaluationContext` (no desde FS) | Reusa `OpaInputBuilder.build(ctx)` (`opa-input-builder.ts:8-61`) que hoy **solo lee FS** y solo emite `satellite/core`; debe añadir proyección `input.context` | PARCIAL (ver §7) |

Nota de homónimo a resolver antes de I1-I3: el `EvaluationContext` del código (`evaluator.interface.ts:3-6`, 2 campos de path) es **distinto** del canónico (`design.es.md:299-334`, ~20 campos). Renombrar el del código a p.ej. `WorkspaceEvaluationContext` o `FsEvaluationContext` para evitar colisión.

---

## 7. Cambios requeridos en rulesets y OPA

> Objetivo: un **único builder** que proyecte `EvaluationContext` → `input.context` canónico y alimente **ambos** motores (native + OPA), re-anclando las 5 conflaciones de shape hoy existentes.

| # | Cambio requerido | Detalle | Anclaje (estado hoy) | GT |
|---|---|---|---|---|
| R-1 | **Introducir `input.context` canónico** | Raíz de input con identificadores opacos + facts declarados (gate, evidence[], artifacts, architecture, checkpoint, deployment) | `grep input.context` → **0 resultados** en `src/rulesets/opa/*.rego` (B1) | GT-380 |
| R-2 | **Builder único native+OPA** | Una sola capa de mapeo que alimente el JSON de OPA (`opa-evaluator.ts:70`) **y** los 12 handlers nativos, eliminando la doble lectura del FS | **BRECHA estructural (B5)**: OPA usa `OpaInputBuilder`, los handlers re-escanean FS por su cuenta (`evidence-rule.handler.ts:15-20`, `sdlc-rule.handler.ts:33-37`) → drift garantizado | GT-378/GT-380 |
| R-3 | **Re-anclar `dod.rego` fuera de `input.story.*`** | "story" es entidad del Tracker; debe entrar como `EvidenceContext`/facts bajo `input.context`, no como raíz `story` | **Conflación (B4)**: `dod.rego:3-42` + `dod.input.schema.json` exigen `story` que ningún builder puebla → policy inalcanzable | GT-380 |
| R-4 | **Re-anclar `compliance-baseline.rego` fuera de `input.spec`** | Tercer shape huérfano; mapear a `input.context` | **Conflación (B4)**: `compliance-baseline.rego:21-96` espera `input.spec`, no producido por el builder | GT-380 |
| R-5 | **Wirear `phase-gates.rego` (el único alineado con Tracker)** | (a) añadir `import data.evolith.phase_gates` a `main.rego`; (b) crear `phase-gates.input.schema.json`; (c) hacer que el builder produzca `input.gate`/`input.evidence`/`input.waiver` | **Triple-desconexión (B3)**: ausente de `main.rego` (verificado: 31 imports, ninguno `phase_gates`), schema **no existe** (no figura en `schemas/`), builder no produce su shape (`phase-gates.rego:8-77`) | GT-380 |
| R-6 | **Mapear `multi-tenancy.rego` y `tenantId` opaco** | El builder debe emitir `satellite.multiTenancy.*` (MTN-09..11) y pasar `tenantId` como identificador opaco | **BRECHA (B7)**: `multi-tenancy.rego:3-33` lee `satellite.multiTenancy` que el builder no emite (`opa-input-builder.ts:21-42` produce serverless/eventDriven/dataMesh/agenticAi, no `multiTenancy`); `tenantId` ignorado | GT-380 |
| R-7 | **Sustituir decisión por paths físicos en `governance.rego`** | Reemplazar `input.satellitePath != input.corePath` por discriminación basada en `workspaceRef` opaco | **Choque con stateless (B6)**: `governance.rego:6,11,16` decide identidad comparando rutas de disco, contradice `workspaceRef` (`design.es.md:88,322`) | GT-380 |
| R-8 | **Conectar gate real a OPA `phase-gates`** | `EvaluateGateUseCase` valida hoy por FS sin invocar OPA `phase-gates` | **BRECHA (B8)**: `evaluate-gate.use-case.ts:45-68` delega en `PhaseGateValidatorService.validateGate` (FS-based); el pipeline sí llama OPA pero con shape `satellite/core`, no `input.gate` | GT-378/GT-380 |
| R-9 | **Unificar ABAC bajo el mismo builder** | `abac-mcp-tool-access.rego` es un quinto shape (`input.user/tool_name`); mantenerlo separado por dominio pero documentar la frontera | `abac-mcp-tool-access.rego:13-122` — shape correcto para runtime MCP, no comparte builder | GT-380 |

Paridad native+OPA (ADR-0041): introducir `input.context` **rompería ambos motores a la vez** salvo que R-2 cree la capa de mapeo única primero. Las suites `native-opa-parity.spec.ts` y `aggregator-parity.spec.ts` son la red de contención obligatoria (criterio "0 drift" de GT-378/GT-380).

---

## 10. Brechas detectadas (tabla priorizada)

| Brecha | Severidad | Subsistema | Evidencia (ruta:linea) |
|---|---|---|---|
| No existe entrada única `EvaluationContext → EvaluationResult` (ni controller, ni tool, ni comando) | **Crítica** | Cross (API/CLI/MCP/Domain) | `evaluation.controller.ts:13-31` (solo satélite por path); 0 hits de `EvaluationContext` canónico en código |
| OPA/native no consumen `EvaluationContext`; builder solo lee FS y emite 1 de 5 shapes | **Crítica** | OPA/Rulesets | `opa-input-builder.ts:8-61`; `grep input.context`→0 |
| 5 shapes de input OPA incompatibles; sin builder único | **Crítica** | OPA/Rulesets | `dod.rego`/`compliance-baseline.rego`/`phase-gates.rego`/`abac` vs `opa-input-builder.ts:18-59` |
| `/v1/evaluate` recibe `satellitePath` crudo (viola ADR-0074/resolver) | **Crítica** | Core API | `evaluation.dto.ts:8`; resolver en `workspace-reference-resolver.service.ts:17-28` |
| Sin tool `core.evaluate`/`evolith-evaluate` en MCP | **Crítica** | MCP | 0 hits en `src/packages/mcp-server/src/`; cercano `composable-validate.tool.ts:87-96` |
| Sin comando `evolith evaluate --context` en CLI | **Alta** | CLI | sin `evaluate.command.ts` en `commands/` |
| `phase-gates.rego` triple-desconectado (no en `main.rego`, sin schema, sin builder) | **Alta** | OPA/Rulesets | `main.rego:1-31` (31 imports, sin `phase_gates`); `phase-gates.input.schema.json` no existe |
| `dod.rego` (`input.story`) y `compliance-baseline.rego` (`input.spec`) huérfanas | **Alta** | OPA/Rulesets | `dod.rego:3`; `compliance-baseline.rego:21` |
| Paridad native+OPA sin builder compartido → drift estructural | **Alta** | OPA/Rulesets | `native-evaluator.ts` handlers vs `opa-evaluator.ts:70` |
| `EvidenceContext[]`/`CheckpointContext`/`DeploymentContext`/`ArchitectureContext` declarados no se pueden enviar a ningún endpoint | **Alta** | Core API | sin DTOs; `design.es.md:271-297` |
| `ValidateBlueprintUseCase` completo pero sin controller (engine #5 sin superficie REST) | **Alta** | Core API | `validate-blueprint.use-case.ts` existe; sin `POST /blueprints/validate` |
| Vocabulario verdict legacy (`passed/failed/skipped`) en presentación vs `Verdict` enum | **Alta** | Cross | `gate-evidence.ts:67-77`; helpers no aplicados `verdict.ts:63-100` |
| `validate` y `sdlc gate-status` no emiten envelope ADR-0073 | **Media** | CLI | `validate.command.ts:265-289`; `gate-status.command.ts:29-69` |
| `EvaluationResult` no expone riesgos, confianza, decisiones sugeridas, policies OPA, versiones policy/blueprint | **Media** | Cross | `satellite-manifest.ts:90-114` (summary); MCP GAP-MCP-3 |
| Sin `executionMode`; HITL binario solo en tool mutativa; ningún tool emite `requiere-revisión-manual` | **Media** | MCP | `mcp-tool-dispatch.ts:137-159`; `sdlc.tools.ts:84` |
| `governance.rego` decide identidad por paths físicos | **Media** | OPA | `governance.rego:6,11,16` |
| `multi-tenancy.rego` lee `satellite.multiTenancy` no emitido; `tenantId` ignorado | **Media** | OPA | `multi-tenancy.rego:3`; `opa-input-builder.ts:21-42` |
| Gate real (`EvaluateGateUseCase`) valida por FS sin ejecutar OPA `phase-gates` | **Media** | Domain/OPA | `evaluate-gate.use-case.ts:65-68` |
| `meta.context` opaco limitado a 3 strings (`initiative/tenant/phase`) sin `product`/`initiativeGroup` | **Media** | Core API | `envelope.interceptor.ts:66-87`; `gate-evidence.ts:87-92` |
| ER de Tracker no modela oportunidades/intakes/iniciativas/agrupaciones; `initiative_id`/`initiative_group_id` sin origen | **Media** | Tracker (diseño) | `sdlc-tracker-technical-interfaces.md:415-428` (ER llega solo a PRODUCT→SDLC_PROCESS) |
| `EvaluateCriterionRequest` (Tracker) cubre ~5 de 17 campos del contexto objetivo | **Media** | Tracker (diseño) | `sdlc-tracker-technical-interfaces.md:340-351` |
| Choque de nombres `GateDecision` (Tracker target vs `core-domain/.../gate-decision.ts`) y homónimo `EvaluationContext` | **Media** | Cross | `sdlc-tracker-technical-interfaces.md:183`; `evaluator.interface.ts:3-6` |
| `POST /api/v1/phases/transition` muta estado de fase (viola invariante stateless) | **Media** | Core API | `phases.controller.ts:15-27`; `sdlc-tracker-technical-interfaces.md:381` |
| `evolith-sdlc-status` usa eje `phase-0..5` obsoleto | **Baja** | MCP | `sdlc.tools.ts:13-52` |

---

## 11. Mejoras necesarias en Core

| # | Mejora | Justificación / Anclaje | GT |
|---|---|---|---|
| MC1 | **Formalizar contratos `EvaluationContext`/`EvaluationResult`** reusando `Verdict` (`verdict.ts:14`) y `PhaseId` (`phase-id.ts:14`) | Tipos canónicos del `design.es.md:299-479`; cero implementados hoy | GT-377 |
| MC2 | **Contract Schema Registry versionado** con schemas + `schemaVersion` en cada result | `EvaluationResult.schemaVersion` (`design.es.md:478`) | GT-377 |
| MC3 | **Adaptador sobre `satellite-evaluation-pipeline`** que envuelva engines existentes detrás del contrato (no reescribir) | El pipeline ya compone los engines (`satellite-evaluation-pipeline.service.ts:23-37`) | GT-378 |
| MC4 | **Aplicar helpers de migración `Verdict` en presentación** (`passed/failed`→`PASS/FAIL/WAIVE/SKIP`) | `verdict.ts:63-100` existen pero no se usan en controllers | GT-378 |
| MC5 | **Exponer engine Blueprint por REST** (`POST /blueprints/validate`) | `validate-blueprint.use-case.ts` completo, sin controller | GT-379 |
| MC6 | **Añadir engines faltantes**: Deployment, Topology-conformance, Compliance agregada, Decision-Recommendation (`binding:false`) | `DeploymentContext`/`ComplianceResult`/`DecisionRecommendation` definidos (`design.es.md:271-275,441-448,380-387`); sin contraparte de evaluación | GT-379 |
| MC7 | **Promover `WorkspaceReferenceResolver` a puerto de dominio** y eliminar paths crudos del DTO `/evaluate` | Hoy en presentación (`workspace-reference-resolver.service.ts:9-11`); `/evaluate` recibe `satellitePath` (`evaluation.dto.ts:8`) | GT-378 |
| MC8 | **Degradación "evaluation-only" sin Tracker** | El Core debe evaluar y emitir `Recommendation`/`DecisionRecommendation` sin depender del Tracker (precedente `executive-scorecard-rule.handler.ts:55` devuelve `skipped` si faltan datos runtime) | GT-381 |
| MC9 | **Guardia ESLint anti-`*Repository` para entidades de negocio** | Hacer cumplir ADR-0101 (Core stateless) en el código | GT-377 |
| MC10 | **Renombrar homónimo `EvaluationContext`** del código (`evaluator.interface.ts:3-6`) a `WorkspaceEvaluationContext` | Evitar colisión con el canónico | GT-377 |
| MC11 | **Reconciliar `POST /phases/transition`** para que no mute estado canónico de fase | Viola el invariante stateless (`phases.controller.ts:15-27`) | GT-381 |

---

## 12. Mejoras necesarias en Tracker (qué debe construir/enviar)

> Tracker es **diseño objetivo sin código** (`product/products/evolith-tracker/README.md:7,11`). Lo que sigue es lo que Tracker debe construir/enviar para alimentar el Core stateless. Mapeo a R0-R5 (GT-376..GT-381).

| # | Mejora en Tracker | Qué debe construir/enviar | Anclaje / Brecha | GT |
|---|---|---|---|---|
| MT1 | **Ampliar `EvaluateCriterionRequest` al `EvaluationContext` canónico** | Hoy envía solo `{processContext:{tenantId,productId,processId,phase,gateId}, rulesetRef, evidenceIds[]}` (~5 de 17 campos). Debe enviar `kinds[]`, `executionMode`, `architecture`, `blueprintRef`/`topologyRef`, `evidence[]` completos (no solo IDs), `checkpoint`, `deployment`, restricciones del tenant, `expectedResult`, `correlationId` | `sdlc-tracker-technical-interfaces.md:340-351` | GT-377/GT-381 |
| MT2 | **Modelar oportunidades, intakes, iniciativas y agrupaciones** | El ER llega solo a PRODUCT→SDLC_PROCESS; `initiative_id`/`initiative_group_id` del contexto objetivo no tienen origen | `sdlc-tracker-technical-interfaces.md:415-428` | GT-381 |
| MT3 | **Enviar `executionMode` (manual/híbrido/agéntico)** | Para que el Core/MCP module la ruta HITL | `executionMode` no existe en el request actual | GT-379/GT-381 |
| MT4 | **Inyectar historial de decisiones y config SDLC del tenant en el contexto** | Hoy se resuelven por `rulesetRef` + Policy Resolution Service interno (`evolith-governed-composition-target-design.md:155`), incompatible con Core stateless que debe recibir todo el contexto temporal | `sdlc-tracker-technical-interfaces.md:348` | GT-381 |
| MT5 | **Consumir `EvaluationResult` y construir el `GateDecision` canónico** | El Core devuelve evaluación + `DecisionRecommendation` (`binding:false`); Tracker decide, persiste y audita | `sdlc-tracker-technical-interfaces.md:186-204`; `design.es.md:380-387` | GT-381 |
| MT6 | **Resolver choque de nombres `GateDecision`** | Tracker `GateDecision` (canónico) vs Core `gate-decision.ts`; renombrar Core a `CoreGateVerdict` | `sdlc-tracker-technical-interfaces.md:183`; nota `design.es.md:1522` (R0) | GT-376 |
| MT7 | **Pasar `workspaceRef` opaco, nunca paths** | Coherente con Core que nunca ve paths | `design.es.md:321-322` | GT-378/GT-381 |
| MT8 | **Reconciliar `POST /phases/transition` cuando Tracker exista** | Endpoint precede al diseño y muta estado canónico de fase | `sdlc-tracker-technical-interfaces.md:381` | GT-381 |

---

## 13. Backlog sugerido de implementación (alineado con GT-376..GT-381 ya creados)

> El roadmap R0-R5 ya está descompuesto en el board: GT-375 (umbrella P0/XL) → **GT-376 (R0)…GT-381 (R5)** (`gap-tracking.md:16-22`). El backlog siguiente **reutiliza esos GT** y los ancla a los hallazgos del dossier.

### Épica GT-376 — R0: Decisión + reconciliación documental (P0/M)
| Historia | Tareas | Criterios de aceptación |
|---|---|---|
| H-376.1 Finalizar ADR-0101 (Core stateless) | Corregir ADR-0100 decisión 1; corregir UP-002 d2 y **eliminar** d7 (repos+use-cases Register/Open/Record); marcar obsoletas `product-initiative-governance-redesign.md:1225-1521` | ADR-0101 `ACCEPTED`; cero referencias vivas a `IProductRepository`/`POST /products` en gobierno |
| H-376.2 Renombrados | `GateDecision`→`CoreGateVerdict`; `'WAIVED'`→`Verdict.WAIVE`; homónimo `EvaluationContext`→`WorkspaceEvaluationContext` | Compila; sin colisión de nombres; `verdict.ts` único enum |

### Épica GT-377 — R1: Contratos + Schema Registry (P0/L)
| Historia | Tareas | Criterios de aceptación |
|---|---|---|
| H-377.1 Tipos canónicos | Implementar `EvaluationContext`/`EvaluationResult` reusando `Verdict`/`PhaseId` (`design.es.md:299-479`) | Tipos exportados desde core-domain; tests de tipo |
| H-377.2 Schema Registry versionado | Schemas + `schemaVersion`; envelope ADR-0073 | `SuccessEnvelope<EvaluationResult>` válido contra schema |
| H-377.3 Guardia de frontera | ESLint que prohíbe `*Repository` para entidades de negocio | Lint falla ante repo de entidad; pasa para `BlueprintRepository` (definición) |

### Épica GT-378 — R2: Envolver engines existentes (P0/L)
| Historia | Tareas | Criterios de aceptación |
|---|---|---|
| H-378.1 `EvaluationOrchestrator` + adaptador sobre pipeline | Reusar `satellite-evaluation-pipeline.service.ts:39-98`; despacho por `kinds[]` | `core.evaluate(context)` agrega Gate/Artifact/Evidence/Ruleset/OPA+Compliance |
| H-378.2 `EvaluationContextBuilder` + `workspaceRef` | Mapear contexto→`SatelliteManifest`; resolver `workspaceRef` server-side; quitar `satellitePath` de `evaluation.dto.ts:8` | `/v1/evaluate` no recibe paths; ADR-0074 cumplido |
| H-378.3 Mapper canónico + verdict | Aplicar `verdict.ts:63-100` en presentación; sub-resultados canónicos | Salida con `Verdict` enum; sin `passed/failed` legacy |
| H-378.4 Builder OPA único + paridad | Capa de mapeo única native+OPA; conectar gate real a `phase-gates` | `native-opa-parity.spec.ts` 0 drift; `EvaluateGateUseCase` ejecuta OPA |

### Épica GT-379 — R3: Engines arquitectónicos (P1/L)
| Historia | Tareas | Criterios de aceptación |
|---|---|---|
| H-379.1 Architecture/Blueprint/Topology/Checkpoint | Exponer `validate-blueprint.use-case.ts` por REST; engine de conformidad de topología; checkpoint sin mutar estado | `POST /blueprints/validate` activo; topology-conformance evalúa contra `topologyRef` |
| H-379.2 `DecisionRecommendation` (`binding:false`) + Recommendation engine | Emitir recomendación no vinculante | `binding:false` siempre; `recommendedBy:'evolith-core'` |
| H-379.3 `executionMode` + HITL por veredicto | Ruta HITL ante `requiere-revisión-manual`; reusar mutative gate (`mcp-tool-dispatch.ts:137-159`) | Veredicto condicionado dispara HITL en MCP |

### Épica GT-380 — R4: OPA `input.context` alineado (P1/M)
| Historia | Tareas | Criterios de aceptación |
|---|---|---|
| H-380.1 `input.context` canónico | Builder proyecta `EvaluationContext`→`input.context` | `grep input.context` > 0; policies leen contexto enviado |
| H-380.2 Re-anclar conflaciones | `dod.rego` fuera de `input.story`; `compliance-baseline` fuera de `input.spec`; quitar artefactos "story" de `phase-gates` mandatoryEvidence | dod/compliance no huérfanas; alcanzables desde el flujo real |
| H-380.3 Wirear `phase-gates` | Import en `main.rego`; crear `phase-gates.input.schema.json`; builder emite `input.gate/evidence/waiver` | `phase-gates.rego` ejecutable end-to-end |
| H-380.4 Multi-tenancy + ABAC + governance | Emitir `satellite.multiTenancy` (MTN-09..11); `tenantId` opaco; reemplazar paths físicos en `governance.rego` por `workspaceRef` | MTN policies alcanzables; `governance.rego` sin comparación de paths |

### Épica GT-381 — R5: Docs/taxonomía + paridad superficies + integración Tracker (P2/M)
| Historia | Tareas | Criterios de aceptación |
|---|---|---|
| H-381.1 CLI `evolith evaluate` + paridad | Comando `--context <file.json>`; envelope en `validate`/`sdlc gate-status`; espejo de `POST /v1/evaluate` | Paridad BR-008 CLI↔API verificada |
| H-381.2 MCP `evolith-evaluate` (`core.evaluate`) | Tool con `EvaluationContext`→`EvaluationResult`; unificar eje de fases (quitar `phase-0..5` de `sdlc.tools.ts`) | Tool registrada; paridad MCP↔API↔CLI |
| H-381.3 Reclasificar artefactos ágiles + doc canónico | Artefactos ágiles → `ExternalReferenceContext` opcional; publicar doc Core Evaluation Engine | GT-375 cerrable; satélites grandfathered `warn`→`fail` |
| H-381.4 Integración Tracker | Tracker envía `EvaluationContext`, consume `EvaluationResult`, emite `GateDecision`; Core degrada a evaluation-only | Core opera sin Tracker (degrada, no bloquea) |

---

**Archivos ancla nuevos verificados en esta síntesis (rutas absolutas):**
- `/Users/beyondnet/Source/evolith/src/packages/core-domain/src/application/services/satellite-evaluation-pipeline.service.ts` (pipeline reusable, `:23-98`)
- `/Users/beyondnet/Source/evolith/src/packages/core-domain/src/application/validators/evaluators/evaluator.interface.ts` (homónimo `EvaluationContext`, `:3-6`)
- `/Users/beyondnet/Source/evolith/src/packages/core-domain/src/application/validators/evaluators/opa-input-builder.ts` (builder FS-only, `:8-61`)
- `/Users/beyondnet/Source/evolith/reference/core/core-evaluation-engine-design.es.md` (contrato canónico `:299-479`; roadmap R0-R5 `:1522-1552`)
- `/Users/beyondnet/Source/evolith/rulesets/opa/main.rego` (31 imports; sin `phase_gates`, `:1-31`)
- `/Users/beyondnet/Source/evolith/reference/core/control-center/gaps/gap-tracking.md` (GT-375 umbrella + GT-376..GT-381, `:16-22`)
- `/Users/beyondnet/Source/evolith/reference/core/control-center/gaps/gap-reference-catalog.md` (catálogo GT-375..GT-381)

---

## Nota de verificación

El agente crítico del workflow no se ejecutó (presupuesto de sesión); la verificación se realizó manualmente reverificando los hallazgos de mayor impacto contra el código real. **Todos confirmados:**

| Afirmación | Estado | Evidencia verificada |
|---|---|---|
| `EvaluationContext` homónimo = `{ satellitePath, corePath }` | ✅ CONFIRMADO | `evaluator.interface.ts:3-5` |
| `/v1/evaluate` recibe `satellitePath` crudo (viola ADR-0074) | ✅ CONFIRMADO | `evaluation.dto.ts:8,13` |
| `phase-gates.rego` ausente de `main.rego` y sin schema | ✅ CONFIRMADO | `main.rego` (0 `phase_gates`); no existe `schemas/phase-gates.input.schema.json` |
| `dod.rego` usa `input.story.*` | ✅ CONFIRMADO | `dod.rego` (11 ocurrencias) |
| Sin `core.evaluate`/`evolith-evaluate` en MCP | ✅ CONFIRMADO | `src/packages/mcp-server/src` (0 ocurrencias) |

El backlog (§13) reutiliza los GT ya creados (**GT-376…GT-381**, R0–R5) y los ancla a los hallazgos de esta auditoría, por lo que no introduce GTs nuevos.

Generated with [Claude Code](https://claude.com/claude-code)


---

## Apéndice — Evidencia por subsistema (lectores)

Reportes de los 5 lectores de subsistema que sustentan los entregables anteriores. Anclados en código real.

### A.1 — Evolith Tracker (qué contexto envía/debería enviar)

## Hallazgos Tracker

> **Premisa de estado.** Tracker es **diseño objetivo sin código**. `product/products/evolith-tracker/README.md:7` y `:11` lo declaran explícitamente: *"No Evolith Tracker source code or `evolith_tracker` repository exists in this corpus today; this folder holds the target design only."* Por tanto, todo lo que sigue es **contrato de papel** (TypeScript de diseño en los `.md`), no entidades persistidas en una base. Lo que "EXISTE HOY" en código son únicamente las **costuras Core-side** que Tracker consumirá (`README.md:62-71`).

### 1. Modelo de entidades que Tracker persistirá

El modelo canónico está en el ER del documento de interfaces y replicado/ampliado en el target design. Tracker es el dueño *stateful*; el Core no conoce ninguna de estas entidades como propias.

| Entidad / Agregado | Fuente (ruta:linea) | Responsabilidad (dueño del estado) |
|---|---|---|
| TENANT | `sdlc-tracker-technical-interfaces.md:415` (ER) | Raíz de aislamiento multi-tenant; posee productos |
| PRODUCT | `sdlc-tracker-technical-interfaces.md:416`; `RegisterProductRequest` :274-279 | Producto gobernado (name, repositoryRef, governanceProfileRef) |
| SDLC_PROCESS | `sdlc-tracker-technical-interfaces.md:417`; agregado :434; `StartProcessRequest` :281-285 | Fase actual y ciclo de vida; corre sobre un product |
| PHASE_EXECUTION | `sdlc-tracker-technical-interfaces.md:418`; agregado :435 | Entrada, actividad, terminación e historial de transición |
| PHASE_TRANSITION | `sdlc-tracker-technical-interfaces.md:209-220` (interfaz), :418 (ER) | Cambio de estado `from→to` ejecutado solo tras GateDecision autorizada |
| GATE_DECISION (canónica) | `sdlc-tracker-technical-interfaces.md:186-204`, :419, :437 | **Decisión de gobernanza canónica** (la produce SOLO Tracker) |
| TECHNICAL_EVALUATION | `sdlc-tracker-technical-interfaces.md:157-176`, :420, :423 | Resultado técnico recibido del evaluador (no canónico) |
| EVIDENCE_ITEM | `sdlc-tracker-technical-interfaces.md:100-149`, :423-424 | Identidad, linaje, integridad y relaciones de evidencia |
| APPROVAL | `sdlc-tracker-technical-interfaces.md:421`, :438; endpoint :326 | Rendición de cuentas humana |
| EXCEPTION | `sdlc-tracker-technical-interfaces.md:422`, :438; endpoint :327 | Riesgo residual aceptado |
| PROVIDER_CONNECTION | `sdlc-tracker-technical-interfaces.md:424-425`, :439 | Configuración y salud de proveedor, por tenant |
| AGENT_RUN | `sdlc-tracker-technical-interfaces.md:426-427`, :440 | Ejecución acotada de agente y evidencia generada |
| CHAT_SESSION | `sdlc-tracker-technical-interfaces.md:449-455` | Sesión de chatbox gobernada (tenant/product/process/phaseExecution) |
| EVIDENCE_SOURCE / ARTIFACT_REFERENCE / EXECUTION_REFERENCE / INTEGRITY_ASSERTION / ACTOR_REFERENCE | `evolith-governed-composition-target-design.md:240-247` (ER ampliado del Evidence Graph) | Sub-nodos del grafo de evidencias (linaje granular) |

**Lectura clave:** el modelo de Tracker cubre casi todas las entidades que el CRITERIO/ADR-0101 atribuye al "Tracker que conoce y persiste" (tenants, productos, fases configuradas, gates, artefactos, evidencias, decisiones, despliegues, trazabilidad). **Vacíos del modelo documentado** frente al CRITERIO: no aparecen como entidades explícitas las **oportunidades**, **intakes**, **iniciativas** ni **agrupaciones/initiative_group** — el ER llega solo hasta PRODUCT→SDLC_PROCESS. Esos identificadores (`initiative_id`, `initiative_group_id`) que el EvaluationContext objetivo espera **no tienen contraparte en el modelo de entidades de Tracker documentado hoy** (BRECHA de modelado upstream de Tracker, no solo de contrato).

---

### 2. Contexto que Tracker envía HOY (de diseño) vs. lo que DEBERÍA enviar

El único contrato de salida hacia el evaluador es `EvaluateCriterionRequest` (`sdlc-tracker-technical-interfaces.md:340-351`). Su payload completo es deliberadamente **mínimo**:

```
processContext: { tenantId, productId, processId, phase, gateId }
rulesetRef: string
evidenceIds: string[]
```

Comparado campo a campo con el **EvaluationContext objetivo** (el que el Tracker *debería* poder enviar para alimentar los 13 engines):

| Campo del EvaluationContext objetivo | ¿En `EvaluateCriterionRequest` hoy? | Anclaje / Brecha |
|---|---|---|
| tenant_id | EXISTE | `processContext.tenantId` :342 |
| product_id | EXISTE | `processContext.productId` :343 |
| initiative_id | **BRECHA** | No existe; lo más cercano es `processId` :344 (proceso, no iniciativa) |
| initiative_group_id | **BRECHA** | No existe ningún agrupador |
| tipo de validación solicitada | **BRECHA parcial** | Implícito por el endpoint (`criterion evaluate` vs `gate assess` :354-357), no es un campo del payload |
| fase actual | EXISTE | `processContext.phase` :345 (string) |
| gate a evaluar | EXISTE | `processContext.gateId` :346 |
| artefactos requeridos + presentados | **BRECHA parcial** | Solo `evidenceIds[]` :349 (referencias opacas); no distingue requerido vs presentado ni tipo artefacto |
| evidencias disponibles | EXISTE (por referencia) | `evidenceIds: string[]` :349 — IDs, no el contenido; el evaluador debe resolverlos |
| checkpoints externos | **BRECHA** | No hay campo; viven como EvidenceItem.references type `pipeline`/`deployment` :128-132, pero no se pasan al evaluador salvo vía evidenceIds |
| configuración SDLC activa del tenant | **BRECHA** | No se envía; se resuelve por `rulesetRef` :348 (un puntero versionado) + Policy Resolution Service en Tracker, no en el request |
| restricciones personalizadas del tenant | **BRECHA** | No hay campo; absorbido en la resolución de policy snapshot de Tracker |
| rulesets/policies habilitadas | EXISTE parcial | `rulesetRef` :348 (un único ref, no lista; no expone policies OPA) |
| modo de ejecución (manual/híbrido/agéntico) | **BRECHA** | No hay campo de modo |
| contexto arquitectónico | **BRECHA** | No hay campo |
| blueprint/topología aplicable | **BRECHA** | No hay campo |
| historial relevante de decisiones | **BRECHA** | No hay campo; Tracker lo guarda (GateDecision) pero no lo inyecta al evaluador |
| resultado esperado | **BRECHA** | No hay campo |

**Síntesis del gap:** `EvaluateCriterionRequest` es un **subconjunto deliberadamente delgado** del EvaluationContext objetivo (cubre ~5 de 17 campos de forma directa). El diseño de Tracker traslada la mayor parte del contexto (config SDLC, restricciones del tenant, policies) a la **resolución por referencia** (`rulesetRef`) y al **Policy Resolution Service** interno de Tracker (`evolith-governed-composition-target-design.md:155`), no al cuerpo del request. Esto choca con el CRITERIO/diseño objetivo del Core como **evaluador stateless que recibe TODO el contexto temporal en el EvaluationContext**: si el Core no debe conocer entidades ni resolver estado, los campos hoy ausentes (modo de ejecución, contexto arquitectónico, blueprint/topología, restricciones del tenant, historial de decisiones, artefactos requeridos vs presentados, checkpoints) **tendrían que viajar dentro del request**, y hoy el contrato embrionario no los lleva.

Nota de costura viva: el único punto de mutación de fase real hoy es `POST /api/v1/phases/transition` en Core-API (`sdlc-tracker-technical-interfaces.md:381`), que **precede** a este diseño y viola el invariante "no mutar estado de fase canónico" — es deuda a reconciliar cuando Tracker exista.

---

### 3. Embriones de contrato existentes y su mapeo al EvaluationContext / EvaluationResult objetivo

| Embrión (diseño Tracker) | Ruta:linea | Mapea a (objetivo) | Calidad del mapeo |
|---|---|---|---|
| `EvaluateCriterionRequest` | :340-351 | **EvaluationContext** (entrada) | Embrión parcial: cubre identificadores + fase + gate + ruleset + evidencias-por-ref. Faltan ~12 campos (ver §2) |
| `EvidenceItem` | :100-149 | Sub-estructura de **EvaluationContext** (evidencias/artefactos/checkpoints) y entrada del EvaluationResult (evidencias faltantes) | Embrión rico: `references[]` :128-132 cubre artifact/commit/PR/pipeline/test/deployment/trace/document → mapea a "artefactos presentados" + "checkpoints externos". `producer` :120-126 (model/prompt/skill) → soporta "modo agéntico". `integrity` :134-138 → soporta "justificación/versión". Pero el evaluador hoy solo recibe `evidenceIds`, no el `EvidenceItem` completo |
| `TechnicalEvaluationResult` | :157-176 | **EvaluationResult** (salida) | Embrión parcial del Result. Mapeo de campos abajo |
| `GateDecision` (canónica Tracker) | :186-204 | NO es EvaluationResult — es la decisión canónica que Tracker construye **a partir de** el EvaluationResult | Distinto plano: el Core devuelve evaluación; Tracker decide. Choque de nombres con la `GateDecision` ya existente en Core (`src/packages/core-domain/src/gates/decision/gate-decision.ts`, nota :183) |

**Mapeo `TechnicalEvaluationResult` → `EvaluationResult` objetivo:**

| Campo EvaluationResult objetivo | En `TechnicalEvaluationResult` | Anclaje / Brecha |
|---|---|---|
| estado de validación | `status` (compliant/non_compliant/indeterminate/error) :161 | EXISTE — pero vocabulario distinto al objetivo (aprobado/rechazado/condicionado/pendiente/requiere-revisión-manual) |
| resultado (aprobado/rechazado/condicionado/...) | parcialmente `status` :161 | **BRECHA**: el Result objetivo es más rico (condicionado, pendiente, requiere-revisión-manual). El "approved/rejected" canónico vive en `GateDecision.status` :191, no aquí — coherente con "evaluador no decide" |
| reglas ejecutadas | `findings[].ruleId` :165-170 | EXISTE parcial (por finding, no lista global de reglas corridas) |
| policies OPA aplicadas | — | **BRECHA**: solo `rulesetRef`/`rulesetVersion` :162-163, no expone qué policies OPA se aplicaron (dual-engine ADR-0041 invisible en el contrato) |
| brechas | `findings[]` :165 | EXISTE parcial (vía severity error/warning) |
| riesgos | — | **BRECHA**: no hay campo de riesgo |
| evidencias faltantes | — en este tipo; sí en `TransitionResponse.missingEvidence` :312 | **BRECHA** en el resultado técnico; existe a nivel de transición |
| artefactos incompletos | — | **BRECHA**: `requiredActions` :313 lo cubre a nivel transición, no aquí |
| recomendaciones / acciones requeridas / decisiones sugeridas | `TransitionResponse.requiredActions` :313 | **BRECHA parcial**: solo "requiredActions" a nivel transición; no "recomendaciones" ni "decisiones sugeridas" |
| nivel de confianza | — | **BRECHA**: no hay campo de confianza |
| justificación técnica | `findings[].message` :169 | EXISTE parcial (por finding); la justificación canónica está en `GateDecision.rationale` :202 |
| versión de Core/ruleset/policy/blueprint | `rulesetRef`+`rulesetVersion` :162-163, `evaluator.version` :174 | EXISTE parcial: ruleset y versión del evaluador SÍ; **BRECHA** en versión de policy OPA y de blueprint/topología |

---

### Conclusión accionable

1. **El contrato embrión existe pero es delgado.** `EvaluateCriterionRequest`/`EvidenceItem`/`TechnicalEvaluationResult` son los tres embriones reales del par EvaluationContext/EvaluationResult, todos en `sdlc-tracker-technical-interfaces.md` (`:340`, `:100`, `:157`) y como diseño puro (sin código).
2. **Brecha de contenido del contexto:** ~12 de 17 campos del EvaluationContext objetivo no viajan en el request (modo de ejecución, contexto arquitectónico, blueprint/topología, restricciones del tenant, historial de decisiones, config SDLC explícita, artefactos requeridos-vs-presentados, checkpoints, resultado esperado, initiative_id/group). El diseño actual los **resuelve por referencia/estado interno de Tracker**, lo que es incompatible con un Core estrictamente stateless que debe recibir todo el contexto temporal.
3. **Brecha de modelado upstream:** el ER de Tracker no modela oportunidades, intakes, iniciativas ni agrupaciones — los `initiative_id`/`initiative_group_id` del EvaluationContext objetivo no tienen origen en el modelo de entidades documentado.
4. **Brecha de resultado:** el `TechnicalEvaluationResult` no expone policies OPA aplicadas, riesgos, nivel de confianza, recomendaciones/decisiones-sugeridas, ni versión de policy/blueprint — todos campos del EvaluationResult objetivo.
5. **Choque de nombres `GateDecision`** (target Tracker vs `src/packages/core-domain/src/gates/decision/gate-decision.ts`) a resolver antes de implementar (nota en `:183` y `README.md:68`, GT-316).

Archivos fuente leídos: `/Users/beyondnet/Source/evolith/product/products/evolith-tracker/sdlc-tracker-technical-interfaces.md`, `/Users/beyondnet/Source/evolith/product/products/evolith-tracker/README.md`, `/Users/beyondnet/Source/evolith/product/products/evolith-tracker/architecture/README.md`, `/Users/beyondnet/Source/evolith/product/suite/architecture/evolith-governed-composition-target-design.md`.


### A.2 — Core API

## Hallazgos Core API

> Veredicto global: el Core API **NO** puede recibir el `EvaluationContext` canónico ni devolver el `EvaluationResult` canónico definidos en `reference/core/core-evaluation-engine-design.es.md:299-479`. Lo que existe hoy es un conjunto de endpoints especializados acoplados a `workspaceRef` (path-based), cada uno con su propio DTO mínimo y su propia salida (`GateEvidence`, `ValidationResult`, `EvaluationVerdict`, `SatelliteRecord`). El único vehículo de contexto opaco que existe es el `meta.context` del envelope ADR-0073, limitado a 3 strings (`initiative`/`tenant`/`phase`) y meramente un **eco** que no entra a la evaluación (`envelope.interceptor.ts:66-87`, `gate-evidence.ts:87-92`).

### Tabla maestra de endpoints

| Endpoint (método + ruta, ruta:linea) | Qué acepta hoy (DTO) | Qué devuelve | ¿Cubre EvaluationContext? | ¿Cubre EvaluationResult? | Brecha |
|---|---|---|---|---|---|
| `POST /api/v1/evaluate` — `evaluation.controller.ts:13-31` | `EvaluateSatelliteDto`: `satellitePath` (path crudo, no workspaceRef!), `corePath?`, `topology?`, `phase?` (`evaluation.dto.ts:4-24`) | `evaluationVerdict.outputEnvelope` = `SuccessEnvelope<{topology, gates[], summary}>` (`satellite-manifest.ts:110-114`) | **PARCIAL/NO.** Acepta solo `topology`+`phase`+path. No `kinds[]`, ni tenant/product/initiative, ni artifacts/evidence/deployment/checkpoint, ni rulesetRef/blueprintRef. | **PARCIAL.** Devuelve gates+summary, no `overallVerdict`/`risks`/`gaps`/`recommendations`/`requiredActions`/`decisionRecommendation`/`compliance`. Verdict legacy `passed/failed`, no `Verdict` enum. | Es un evaluador de satélite por path, no el `/evaluate` genérico del diseño. **Incumple ADR-0074 + resolver-pattern**: recibe `satellitePath` crudo en vez de `workspaceRef`. |
| `POST /api/v1/gates/:gateId/evaluate` — `gates.controller.ts:15-30` | `EvaluateGateDto`: solo `workspaceRef` (`gates.dto.ts:4-10`). `gateId` por path | `GateEvidence` (`gate-evidence.ts:67-77`): `gateId, phase, verdict('passed'|'failed'|'skipped'), rulesetRef, rulesetVersion, violations[], evaluatedAt, evaluatedBy` | **NO.** No recibe `artifacts[]`/`evidence[]` (los lee del workspace); no recibe tenant/initiative ni configuración SDLC del tenant. `phase` se infiere por regex del gateId (`mapGateIdToPhase:32-42`). | **PARCIAL.** `GateEvidence` ≠ `GateEvaluationResult` canónico: no tiene `artifactResults[]`, `risks[]`, `gaps[]`, `requiredActions[]`; verdict legacy. | El gate evaluation engine #1 existe pero su I/O no es el contrato canónico. |
| `POST /api/v1/phases/transition` — `phases.controller.ts:15-27` | `TransitionPhaseDto`: `from`, `to`, `tools[]`, `workspaceRef` (`phases.dto.ts:4-24`) | Resultado de `PhaseTransitionUseCase.execute` | **NO.** Es una acción imperativa (ejecuta tools), no una evaluación de contexto. | **NO.** No es `EvaluationResult`. | Endpoint operativo de ejecución; fuera del modelo evaluador stateless. |
| `POST /api/v1/projects/propose-advance` — `projects.controller.ts:39-57` | `ProposeAdvanceDto`: `workspaceRef`, `currentPhase?`, `targetPhase`, `triggerDeploy?` (`projects.dto.ts:24-43`) | Resultado de `ProposePhaseAdvanceUseCase` (propuesta de avance) | **PARCIAL.** Es lo más cercano al checkpoint engine #9, pero no recibe `CheckpointContext` (`checkpointId`, `metrics`), ni `kinds`. | **NO.** No devuelve `CheckpointEvaluationResult` ni `decisionRecommendation` canónicos. | `casts as any` (línea 51-56) por desalineación de vocabulario de fases (`phase-N` vs union de dominio). |
| `POST /api/v1/projects/initialize` — `projects.controller.ts:19-37` | `InitProjectDto`: `workspaceRef`, `name`, `type`, `options?` (`projects.dto.ts:4-22`) | Proyecto inicializado (scaffolding) | **NO.** Mutación/scaffolding, no evaluación. | **NO.** | Endpoint de generación; fuera del evaluador stateless. |
| `POST /api/v1/architecture/validate-satellite` — `architecture.controller.ts:46-56` | `ValidateSatelliteDto`: solo `workspaceRef` (`architecture.dto.ts:4-10`) | `ValidateSatelliteOutput.result` = `ValidationResult` (`validate-satellite.use-case.ts:23-28`): `status, rulesChecked, issues[], coreRef, timestamp` | **NO.** No recibe `ArchitectureContext` declarado (`style`, `components`, `decisionRefs`); evalúa el código del workspace, no facts declarados. | **PARCIAL.** `ValidationResult` ≠ `ArchitectureEvaluationResult`: no `verdict(Verdict)`, ni `risks[]`/`recommendations[]` separados. | Architecture engine #4 existe pero por path, no por contexto declarado. |
| `POST /api/v1/architecture/detect-drift` — `architecture.controller.ts:58-69` | `DetectDriftDto`: `workspaceRef`, `declaredLevel?` (`architecture.dto.ts:12-22`) | Resultado de `driftService.detectDrift` (violaciones de drift) | **NO.** Solo `declaredLevel`; no `ArchitectureContext`. | **NO.** No es `EvaluationResult` canónico. | Drift es un sub-caso de arquitectura; salida propia. |
| `GET /api/v1/architecture/topologies` — `architecture.controller.ts:24-31` | — (sin body) | Lista de manifiestos de topología | N/A (lectura de definiciones). | N/A | Read-only de catálogo; no evalúa contexto. **No hay POST de evaluación de topología.** |
| `GET /api/v1/architecture/topologies/:id` — `architecture.controller.ts:33-44` | — | Manifiesto de topología | N/A | N/A | Solo lectura; no evalúa conformidad. |
| `POST /api/v1/architecture/cache/invalidate` — `architecture.controller.ts:71-78` | — | `{invalidated, keys}` | N/A | N/A | Operativo. |
| `POST /api/v1/validate/composable` — `composable-validate.controller.ts:50-85` | `ComposableValidateDto`: `workspaceRef`, `engine?`, `topology?`, `phase?`, `ruleset?`, `adr?`, `file?` (líneas 8-43) | Resultado de `ComposableValidationEngine.execute` (combina modos SDLC/Arch/Ruleset/ADR/Adhoc) | **PARCIAL — el más cercano a multi-kind.** Combina varios modos en una llamada (análogo a `kinds[]`), pero los "kinds" son **implícitos por presencia de campo**, no un array. No recibe artifacts/evidence/deployment/checkpoint/blueprint, ni tenant/product/initiative. | **PARCIAL.** Salida agregada propia del engine, no `EvaluationResult` con `overallVerdict`/`risks`/`gaps`/`recommendations`/`requiredActions`/`compliance` normalizados. | Es el candidato natural para convertirse en el `/evaluate` genérico, pero su contrato de entrada/salida no es el canónico. |
| `POST /api/v1/satellites` — `satellites.controller.ts:31-38` | `CreateSatelliteDto`: `id`, `name`, `parentCorePath?` (`satellite.dto.ts:5-20`) | `SatelliteRecord` (CRUD de registro) | **NO.** CRUD de entidad registrada (persiste estado!). | **NO.** | El registry de satélites **persiste** (`SatelliteRegistryService`), lo que roza el límite stateless; no es evaluación. |
| `GET /api/v1/satellites` / `GET :id` / `PATCH :id` / `POST :id/link` — `satellites.controller.ts:40-88` | `UpdateSatelliteDto`, `LinkSatelliteDto` (`satellite.dto.ts:24-64`) | `SatelliteRecord(s)` | **NO.** | **NO.** | CRUD/linking; fuera del evaluador. |
| `GET /api/v1/rulesets` · `/rulesets/:id` · `/gates/:gateId` · `/phases/:phase/requirements` — `reference.controller.ts:15-50` | — (params por path) | Definiciones read-only (`RulesetSummary`, ruleset JSON, `PhaseGate`) | N/A — exposición de DEFINICIONES versionadas (correcto para un evaluador). | N/A | Bien posicionado como "definiciones read-only"; no evalúa contexto. |

### Cobertura por tipo de contexto (EXISTE / PARCIAL / FALTA)

| # | Tipo de contexto | Estado | Endpoint(s) actuales (ruta:linea) | Justificación / brecha exacta |
|---|---|---|---|---|
| 1 | **Fase** | PARCIAL | `POST /validate/composable` (`composable-validate.controller.ts:24-27,80`); `POST /evaluate` (`evaluation.dto.ts:20-23`) | Acepta `phase` string suelto (canónico + alias f1–f5), no como parte de un `EvaluationContext.phaseId` tipado (`PhaseId` de `phase-id.ts`). |
| 2 | **Gate** | PARCIAL | `POST /gates/:gateId/evaluate` (`gates.controller.ts:15-30`) | Engine #1 funciona, pero `gateId` por path + `phase` por regex; salida `GateEvidence` legacy, no `GateEvaluationResult` canónico. |
| 3 | **Artefacto** | FALTA (como contexto) | (implícito dentro de gate/satellite) | No hay forma de enviar `artifactIds[]` ni `artifacts requeridos+presentados` en ningún DTO. El engine los descubre leyendo el workspace; el contrato canónico (`EvaluationContext.artifactIds`, línea 312) no existe en presentación. |
| 4 | **Evidencia** | FALTA | — | Ningún DTO acepta `EvidenceContext[]` (`evidenceId`, `evidenceType`, `producer`, `references`, `integrity` — design `:283-290`). Evidence Engine #3 no tiene endpoint que reciba evidencia declarada. |
| 5 | **Checkpoint externo** | FALTA | `POST /projects/propose-advance` (parcialmente relacionado) | No existe `CheckpointContext` (`checkpointId`, `metrics` — `:292-297`) en ningún DTO. `propose-advance` no recibe métricas ni checkpointId. |
| 6 | **Arquitectura** | PARCIAL | `POST /architecture/validate-satellite` (`:46-56`); `POST /architecture/detect-drift` (`:58-69`) | Evalúa el **código del workspace**, no un `ArchitectureContext` declarado (`style`, `components`, `decisionRefs` — `:277-281`). Salida `ValidationResult`, no `ArchitectureEvaluationResult`. |
| 7 | **Blueprint** | FALTA (en API) | — (existe `ValidateBlueprintUseCase` en dominio, sin controller) | `validate-blueprint.use-case.ts` existe y está completo, pero **ningún controller lo expone**. No hay `POST /blueprints/validate` ni campo `blueprintRef` en DTOs. Engine #5 sin superficie REST. |
| 8 | **Topología** | PARCIAL (solo lectura) | `GET /architecture/topologies(/:id)` (`:24-44`); `topology?` en composable/evaluate | Solo se **listan/leen** topologías. No hay endpoint que **evalúe conformidad** a una topología contra un contexto (`topologyRef` + facts). |
| 9 | **Despliegue** | FALTA | — | Ningún DTO acepta `DeploymentContext` (`environment`, `releaseRef`, `status` — `:271-275`). No hay deployment engine ni endpoint. (`triggerDeploy` en propose-advance es una **acción**, no evaluación de facts de despliegue.) |
| 10 | **Cumplimiento (compliance)** | FALTA (como salida agregada) | — | No hay endpoint que devuelva `ComplianceResult` (`verdict`, `score`, `totalChecks`… — `:441-448`). Lo más cercano es el `summary` de `EvaluationVerdict` (`satellite-manifest.ts:93-100`), que no es un `ComplianceResult` canónico ponderado. |

Resumen: de los 10 tipos, **0 EXISTE plenamente**, **5 PARCIAL** (fase, gate, arquitectura, topología-lectura, y vía composable), **5 FALTAN** (artefacto-como-contexto, evidencia, checkpoint, blueprint-en-API, despliegue) más compliance como salida.

### ¿Hay un endpoint genérico `/evaluate`?

**Sí existe `POST /api/v1/evaluate`** (`evaluation.controller.ts:7,13`), pero **NO es el evaluador genérico del diseño**; es un evaluador de satélite especializado:

- **Shape que acepta hoy** (`evaluation.dto.ts:4-24`):
  ```
  EvaluateSatelliteDto { satellitePath: string (requerido); corePath?: string; topology?: string; phase?: string }
  ```
- **Construye un `SatelliteManifest`** (`evaluation.controller.ts:22-27`) y delega en `ValidateSatelliteUseCase` → pipeline de satélite. Devuelve `evaluationVerdict.outputEnvelope` (`:30`).
- **Diferencias con `EvaluationContext` canónico** (`design :299-334`): no acepta `kinds[]`, ni los identificadores opacos (`tenant`/`product`/`initiative`/`initiativeGroup`), ni `artifactIds`, `evidence[]`, `deployment`, `checkpoint`, `externalReferences`, `rulesetRef`/`rulesetVersion`/`blueprintRef`/`topologyRef`/`schemaRef`, `correlationId`/`passthrough`. Solo conoce `topology`+`phase`+path.

**¿Lleva tenant/product/initiative como contexto opaco?**

**NO en el DTO.** Ningún DTO de los controllers auditados (`evaluation`, `gates`, `phases`, `projects`, `architecture`, `composable-validate`, `satellite`) tiene campos `tenant_id`/`product_id`/`initiative_id`. El único canal de contexto opaco hoy es:

- `meta.context` del envelope ADR-0073, poblado por `envelope.interceptor.ts:66-87` desde headers `x-evolith-{initiative,tenant,phase}`, query o body — **limitado a 3 strings planos** (`initiative`, `tenant`, `phase`).
- Es un **eco de salida** (`gate-evidence.ts:87-92`, `ExecutionContext`: "Verbatim echo of caller-supplied context. Never persisted or interpreted") y el api-reference lo confirma (`api-reference.md:13`: "The `context` object only carries the request scope").
- **No** existe `product_id`, ni `initiative_group_id`, ni el contexto entra a la lógica de evaluación: es trazabilidad pura.

**Inconsistencia adicional con ADR-0074 / patrón resolver:** todos los demás endpoints usan `workspaceRef` opaco resuelto por `WorkspaceReferenceResolverService` (`:17-28`), pero **`/evaluate` recibe `satellitePath` crudo** (`evaluation.dto.ts:8`) — viola el contrato "Core nunca recibe paths" que el resto de la API sí respeta. Esto hace que el `/evaluate` actual sea inservible como base del `/evaluate` genérico sin rediseño del DTO.

### Notas de cierre para ensamblar

- **Vocabulario de verdict desalineado**: presentación devuelve verdict legacy (`'passed'|'failed'|'skipped'` en `GateEvidence`; `status` en `ValidationResult`; `passed:boolean` en `EvaluationVerdict`). El contrato canónico exige `Verdict` enum (`PASS|FAIL|WAIVE|SKIP`, `verdict.ts:14-23`). Helpers de migración existen (`verdict.ts:63-100`) pero **no se aplican en la capa de presentación**.
- **Envelope ADR-0073 sí está universalizado** (`ApiEnvelopeResponse` en todos los controllers + `EnvelopeInterceptor`), por lo que el "envoltorio" para `SuccessEnvelope<EvaluationResult>` (design `:483`) ya existe; lo que falta es el **payload `data`** con la forma `EvaluationResult`.
- **Brecha estructural principal**: no existe un controller que reciba `EvaluationContext` (un único body multi-kind) ni devuelva `EvaluationResult` (sub-resultados por engine + risks/gaps/recommendations/requiredActions/decisionRecommendation/compliance). El más cercano arquitectónicamente es `composable-validate.controller.ts`, pero su DTO usa kinds implícitos por presencia de campo y su salida no está normalizada al contrato canónico.

Archivos ancla leídos: `src/apps/core-api/src/presentation/controllers/{evaluation,gates,phases,architecture,composable-validate,projects,satellites,reference}.controller.ts`; `src/apps/core-api/src/presentation/dtos/{evaluation,gates,phases,architecture,projects,satellite}.dto.ts`; `src/apps/core-api/src/presentation/decorators/swagger-envelope.decorator.ts`; `src/apps/core-api/src/infrastructure/interceptors/envelope.interceptor.ts`; `src/apps/core-api/src/application/services/workspace-reference-resolver.service.ts`; `src/packages/core-domain/src/domain/{gate-evidence.ts,satellite-manifest.ts,verdict/verdict.ts}`; `src/packages/core-domain/src/application/use-cases/{evaluate-gate,validate-satellite,validate-blueprint}.use-case.ts`; `product/products/core-api/api-reference.md`; `reference/core/core-evaluation-engine-design.es.md`.


### A.3 — CLI

## Hallazgos CLI

### Tabla de comandos

| Comando | Qué evalúa | Input (flags/manifest) | Output | ¿Equivale a evaluación por `EvaluationContext`? | Brecha |
|---|---|---|---|---|---|
| `validate` (`validate.command.ts:127-364`) | Rulesets nativos/OPA, topología, fase SDLC, ADR específico, archivo ad-hoc, motor composable GT-312 | `--satellite/-s` (path), `--core/-c` (path), `--ruleset`, `--topology` (repetible), `--engine native\|opa`, `--manifest` (path JSON), `--phase`, `--adr`, `--file`, `--composable`, `--arch`, `--arch-level` (deprecado) | `--format json\|table\|yaml\|markdown`; `ValidationResult` plano (`status/rulesChecked/issues[]/coreRef/timestamp`, `:265-289`). **No** emite envelope ADR-0073; el `evaluationVerdict` del pipeline solo se imprime como texto (`:331-353`) | **Parcial.** Es lo más cercano a `evaluate`: con `--manifest`/`--phase`/`--topology` dispara el pipeline GT-281 (`:176-190`) → equivale a `kinds: [gate, artifact, rule]` + `architecture` + `topologyRef`. Pero recibe **paths reales** (`satellitePath`/`corePath`), no `workspaceRef` opaco | No acepta `--context file.json`; input por flags sueltos, no por un contrato. No expone `tenant/product/initiative/gateId/blueprintRef/evidence[]/deployment/checkpoint`. La salida no es `EvaluationResult` ni va en envelope (rompe ADR-0073 en `validate`) |
| `gate evaluate` (`gate.command.ts:50-117`) | Un gate de fase SDLC: presencia de artefactos + criterios bloqueantes → verdict | `--phase` (discovery..release), `--project` (path), `--core`, `--evaluated-by human\|agent\|ci`, `--initiative`, `--tenant`, `--webhook-url`, `--format json` | `GateEvidence` envuelto en `createSuccessEnvelope`/`createErrorEnvelope` ADR-0073 (`:108-109`); humano por defecto; `exit 1` si `failed` | **Parcial-alto** para el sub-resultado `GateEvaluationResult`. Acepta `tenant`/`initiative` como **contexto opaco** y los ecoa en `meta.context` (`:54-55`) — alineado con la tesis stateless | Cubre solo `kind=gate` (un gate por invocación). No recibe `artifactIds`, `evidence[]`, `blueprintRef`, `rulesetRef/version` explícitos, ni `workspaceRef`. Usa `--project` como path real |
| `phase advance` (`phase-advance.command.ts:49-122`) | Si una transición de fase es recomendable (no muta estado canónico) | `--from`, `--to`, `--project`, `--core`, `--evaluated-by`, `--initiative`, `--tenant`, `--webhook-url`, `--format json` | `PhaseTransitionProposal` en envelope ADR-0073 (`:113-114`); `exit 1` si no recomendada | **Parcial.** Equivale al Checkpoint/transition engine. Ecoa `tenant`/`initiative` opacos (`:53-54`) | Solo `kind=checkpoint/transition`. No consume `EvaluationContext` agregado |
| `sdlc gate-status` (`gate-status.command.ts:29-69`) | Estado de gates de fase (`getGateStatus`) + métricas DORA del git log | Sin flags de contexto; solo `--since <days>` para DORA; opera sobre `process.cwd()` | **Solo humano** (`printGateStatus`/`printDora`, `:80-184`). **No** tiene `--format json` ni envelope | **No.** Es lectura/reporte, no evaluación por contexto. Mezcla evaluación de gates con DORA operativo (dato que el Core debería marcar `skipped`) | Sin envelope, sin JSON, sin `tenant/initiative`, cwd fijo. Rompe paridad de salida ADR-0073 |
| `architecture scaffold` (`scaffold.command.ts:22-234`) | No evalúa: **genera** andamiaje Nx (API + MFE + libs) por fase del eje progresivo | `--frontend`, `--orm`, `--phase 1\|2\|3`, `--api-name`, `--remotes`, `--domains`, `--dry-run`, `--format json` | Envelope ADR-0073 en modo json (`:95-105`) | **No aplica** (es generación, no evaluación) | Fuera del eje `EvaluationContext` |
| `drift detect` (`drift.command.ts:28-124`) | Drift arquitectónico vs nivel declarado (eje progresivo), con history/trend | `--path`, `--level` (modular-monolith…/F1-F3), `--json`/`--format json`, `--history`, `--trend` | `DriftReport` en envelope ADR-0073 (`:110`) | **Parcial.** Sub-caso de `ArchitectureEvaluationResult`. Recibe `path` real, no `workspaceRef` | No acepta `tenant/initiative`, ni se integra en un `EvaluationContext` agregado |
| `standards` (`standards.command.ts:28-208`) | Gestiona standards (init/list/get/export) y `validate` de un snippet de código contra reglas | `--init`, `--list`, `--get`, `--validate <code>`, `--export`, `--format markdown\|json`, `--category` | Mayormente `console.table`/texto humano; export json/markdown. **No** usa envelope ADR-0073 | **No.** CRUD/lectura de definiciones + validación de string suelto | Sin envelope, sin `tenant/initiative`, no consume contexto. El `--validate` valida un string, no un workspace/contexto |

### ¿Puede la CLI consumir un `EvaluationContext` hoy? ¿Falta `evolith evaluate`?

**No existe `--context file.json` en ningún comando** y **no existe comando `evolith evaluate`** (`grep -L` sobre `commands/` no devuelve ningún `evaluate.command.ts`; los comandos registrados son los listados en `commands/`, sin `evaluate`; tampoco aparece `EvaluationContext`/`EvaluationResult` en todo `src/sdk/cli/src/`).

- La CLI **arma el contexto internamente a partir de flags sueltos**, no lo recibe como un contrato único. En `validate` el "contexto" es un objeto literal local (`validate.command.ts:143-152` y `:181-188`) con `satellitePath/corePath/topology/phase/rulesetId/adrId/filePath` — no es el `EvaluationContext` canónico (`core-evaluation-engine-design.es.md:299-334`).
- Los identificadores opacos solo existen, y parcialmente, en `gate` y `phase`: `--tenant`/`--initiative` se ecoan en `meta.context` (`gate.command.ts:54-55`, `phase-advance.command.ts:53-54`) y pueden venir del `ProfileConfig` (`config.service.ts:9-13` define `tenant`/`initiative`). Pero **`validate`, `drift`, `sdlc gate-status` y `standards` no aceptan tenant/initiative**.
- **Faltan por completo en la superficie CLI** estos campos del `EvaluationContext` objetivo: `kinds[]`, `product/initiativeGroup`, `gateId`, `artifactIds[]`, `rulesetRef`+`rulesetVersion`, `blueprintRef`, `schemaRef`, **`workspaceRef` opaco** (la CLI pasa paths reales `--satellite`/`--project`/`--path`, contrario al principio de que el Core nunca ve paths — `core-evaluation-engine-design.es.md:321-322`), `evidence[]`, `deployment`, `checkpoint`, `externalReferences[]`, `correlationId`/`passthrough`.
- **Conclusión:** sí falta un comando `evolith evaluate --context <file.json> [--format json]` que (a) deserialice un `EvaluationContext` canónico, (b) invoque el pipeline agregado y (c) devuelva un `EvaluationResult` en envelope ADR-0073. Hoy lo más parecido está fragmentado entre `validate --manifest --phase` (pipeline GT-281), `gate evaluate` y `phase advance`, cada uno con su propio mini-contrato y, en el caso de `validate`, **sin** envelope para el verdict.

### Paridad CLI vs Core API (BR-008)

El Core API ya tiene el endpoint agregado **`POST /v1/evaluate`** (`evaluation.controller.ts:7-31`) que invoca `ValidateSatelliteUseCase` con un `manifest` y devuelve `evaluationVerdict.outputEnvelope` (envelope ADR-0073). Su DTO `EvaluateSatelliteDto` (`evaluation.dto.ts`) hoy solo expone `satellitePath`, `corePath`, `topology`, `phase`.

Brechas para paridad CLI↔Core API:

1. **Falta el espejo CLI del endpoint `/v1/evaluate`.** El Core API expone un único `evaluate` agregado; la CLI no tiene `evolith evaluate` equivalente — debe inferirse vía `validate --manifest`. Hay que crear el comando 1:1.
2. **Inconsistencia de envelope en la CLI.** `gate`, `phase`, `drift`, `scaffold` emiten envelope ADR-0073, pero **`validate` y `sdlc gate-status` no**: `validate` serializa un `ValidationResult` plano (`validate.command.ts:265-266`) y `gate-status` solo imprime humano. El Core `/v1/evaluate` siempre devuelve envelope. Para paridad, `validate`/`gate-status` deben envolver su salida.
3. **Contrato de entrada divergente.** Ambos lados arman el contexto desde campos sueltos (`satellitePath/topology/phase`) en vez del `EvaluationContext` canónico; **ni la CLI ni el DTO del Core soportan** `kinds[]`, `gateId`, `artifactIds[]`, `rulesetRef/Version`, `blueprintRef`, `evidence[]`, `deployment`, `checkpoint`, `workspaceRef`, `tenant/product/initiative/initiativeGroup` completos. La paridad real exige alinear `EvaluateSatelliteDto` y la CLI al mismo contrato `EvaluationContext` → `EvaluationResult`.
4. **`workspaceRef` opaco vs paths reales.** Ambas superficies (CLI con `--satellite/--project/--path`; DTO con `satellitePath/corePath`) violan la tesis stateless de pasar solo una referencia opaca de workspace (`core-evaluation-engine-design.es.md:321-322`). Brecha compartida, pero relevante para que la CLI no "sepa" más que el Core.
5. **Cobertura de `kinds`.** El Core agrega gate+artifact+rule+architecture en un solo `evaluate`; en la CLI esa agregación está repartida (`validate` ≈ rule/arch/gate vía pipeline, `gate evaluate` ≈ gate, `phase advance` ≈ checkpoint, `drift` ≈ architecture). Falta un punto de entrada CLI que cubra todos los `kinds` solicitados en un único `EvaluationContext`.

**Resumen ejecutable:** la CLI hoy NO consume un `EvaluationContext` ni emite un `EvaluationResult`; lo aproxima con `validate --manifest --phase --topology` (pipeline GT-281) más `gate`/`phase`/`drift` por separado. Para paridad BR-008 con `POST /v1/evaluate` faltan: (1) comando `evolith evaluate --context <file.json>`, (2) envelope ADR-0073 en `validate` y `sdlc gate-status`, (3) ampliación del contrato de entrada (CLI flags y `EvaluateSatelliteDto`) al `EvaluationContext` canónico con identificadores opacos y `workspaceRef`.

Archivos relevantes (rutas absolutas):
- `/Users/beyondnet/Source/evolith/src/sdk/cli/src/commands/validate/validate.command.ts`
- `/Users/beyondnet/Source/evolith/src/sdk/cli/src/commands/gate/gate.command.ts`
- `/Users/beyondnet/Source/evolith/src/sdk/cli/src/commands/phase/phase-advance.command.ts`
- `/Users/beyondnet/Source/evolith/src/sdk/cli/src/commands/sdlc/gate-status.command.ts`
- `/Users/beyondnet/Source/evolith/src/sdk/cli/src/commands/drift/drift.command.ts`
- `/Users/beyondnet/Source/evolith/src/sdk/cli/src/commands/architecture/scaffold.command.ts`
- `/Users/beyondnet/Source/evolith/src/sdk/cli/src/commands/standards/standards.command.ts`
- `/Users/beyondnet/Source/evolith/src/sdk/cli/src/infrastructure/cli/base-command.ts` (`profile`)
- `/Users/beyondnet/Source/evolith/src/sdk/cli/src/infrastructure/config/config.service.ts:9-13` (`ProfileConfig`: tenant/initiative)
- `/Users/beyondnet/Source/evolith/src/apps/core-api/src/presentation/controllers/evaluation.controller.ts` (`POST /v1/evaluate`)
- `/Users/beyondnet/Source/evolith/src/apps/core-api/src/presentation/dtos/evaluation.dto.ts` (`EvaluateSatelliteDto`)
- `/Users/beyondnet/Source/evolith/reference/core/core-evaluation-engine-design.es.md:299-334` (`EvaluationContext` objetivo)


### A.4 — MCP

## Hallazgos MCP

### Catálogo de herramientas y qué evalúan

Anclado en `src/packages/mcp-server/src/tools/tools.module.ts:59-76` (registro real). Cada herramienta es un adaptador delgado que delega en `@beyondnet/evolith-core` y devuelve un payload crudo que el dispatcher envuelve en el envelope ADR-0073 (`mcp-tool-dispatch.ts:194-195`).

| Herramienta MCP | Qué evalúa | Input schema (campos clave) | Output | ¿Acepta EvaluationContext? | Brecha |
|---|---|---|---|---|---|
| `evolith-validate` (`validate.tool.ts:15-38`) | Reglas nativas contra un satélite; modo pipeline e2e por manifest (`runPipeline`, `validate.tool.ts:96-131`) | `path` (req), `format`, `ruleset`, `corePath`, `topology`, `phase`, `manifest` | JSON nativo o `{type:'pipeline', passed, gates[], outputEnvelope}` | NO. Recibe `path`+`SatelliteManifest`, no un EvaluationContext. Sin `tenant_id`, `gate`, `evidences`, `checkpoints`, `expectedResult` | Falta: identificadores de contexto, gate puntual, evidencias presentadas, modo de ejecución, restricciones del tenant |
| `evolith-composable-validate` (`composable-validate.tool.ts:17-57`) | Motor componible GT-312: combina modos SDLC/Architecture/Ruleset/ADR/Ad-hoc (`execute`, líneas 59-106) | `path` (req), `corePath`, `engine` (native/opa), `topology`, `phase`, `ruleset`, `adr`, `file` | `{type:'composable', ...result}` | NO. Es el input MÁS rico del MCP, pero sigue siendo plano (flags), no el contrato `EvaluationContext`. Sin `tenant_id`/`initiative_id`, `gate`, `requiredArtifacts`+`presentedArtifacts`, `availableEvidences`, `externalCheckpoints`, `tenantSdlcConfig`, `customConstraints`, `executionMode`, `architecturalContext`, `decisionHistory`, `expectedResult` | La mayor parte del EvaluationContext objetivo |
| `evolith-gate-evaluate` (`gate.tools.ts:26-84`) | Un gate de fase SDLC vía `EvaluateGateUseCase` | `phase` (req), `projectPath` (req), `rulesetRef`, `evidenceMode`, `evaluatedBy` (human/agent/ci), `initiative`, `tenant` | `GateEvidence` crudo (envuelto en envelope ADR-0073 por el server) | PARCIAL. Acepta `phase`, `evaluatedBy`, `initiative`, `tenant` (más cercano al contexto), pero NO `gate` específico, ni evidencias/artefactos presentados, ni checkpoints externos, ni ruleset/policy habilitados explícitos | Falta evidencias presentadas, artefactos requeridos vs presentados, gate puntual, blueprint/topología, historial de decisiones |
| `evolith-phase-advance` (`phase-advance.tools.ts:26-82`) | Criterios de salida de fase para proponer transición (`ProposePhaseAdvanceUseCase`) | `fromPhase` (req), `toPhase` (req), `projectPath` (req), `evaluatedBy`, `initiative`, `tenant` | Proposal crudo (envuelto en envelope) | PARCIAL. Igual que gate: contexto mínimo (fase, initiative, tenant, evaluatedBy) | Falta evidencias/artefactos/checkpoints/decisiones/expectedResult |
| `evolith-architecture-validate` (`architecture.tools.ts:44-113`) | Eje progresivo F1/F2/F3 (independencia modular, contratos, extracción) + paridad OPA best-effort | `path` (req), `level` (topología progresiva), `deep` | `{level, status, issues[], blockingIssues}` | NO. Solo `path`+`level`+`deep` | Sin tenant, evidencias, gate, expectedResult |
| `evolith-drift-detect` (`architecture.tools.ts:115-143`) | Drift de arquitectura vs core (`ArchitectureDriftService`) | `path` (req), `corePath` | `{result}` de drift | NO | n/a (lectura de drift) |
| `evolith-topology-list` / `evolith-topology-get` (`topology.tools.ts:14-83`) | Cataloga/consulta topologías (`TopologyCatalogService`) | `corePath`; `id` (req en `get`) | `{topologies[]}` / `{topology}` | NO. Consulta de catálogo, no evaluación | n/a (consulta) |
| `evolith-sdlc-status` (`sdlc.tools.ts:57-68`) | Estado de fase leyendo `evolith.yaml` + presencia de artefactos (`PHASE_REQUIREMENTS`/`ARTIFACT_PATHS`, líneas 13-52) | `path` (req) | `{currentPhase, phaseStatus[], nextPhase}` | NO. Lectura de estado local, no recibe contexto del Tracker | Usa `phase-0..5` (eje obsoleto per memoria del proyecto) y rutas hardcodeadas; no recibe `tenantSdlcConfig` |
| `evolith-sdlc-handoff` (`sdlc.tools.ts:69-90`, `mutative:true`) | Handoff de fase (escribe `handoff-manifest.json`) | `path`, `fromPhase`, `toPhase`, `confirm` | `{handoff, artifacts, validation}` | NO | Mutativo: solo verifica presencia de artefactos, no evalúa evidencias del contexto |
| `evolith-dora-metrics` (`sdlc.tools.ts:91-130`) | DORA aproximado desde git log | `path` (req), `days` | `{metrics}` | NO | n/a (métricas) |

Herramientas adicionales registradas pero fuera del set auditado (todas con el mismo patrón de input plano, sin EvaluationContext): `evolith-agent-*`, `evolith-moscow-*`, `evolith-auto-fix-*`, `evolith-config-*`, `evolith-metrics-*`, `satellite-{create,adopt,list,status}` (`tools.module.ts:66-75`). En `packages/mcp-tools/src/tools/`: `echo`, `ping`, `read-gap-tracking` (utilitarios).

### ¿Falta una herramienta `core.evaluate` que reciba el EvaluationContext completo?

**SÍ — es la brecha estructural principal.** Búsqueda exhaustiva en `src/packages/mcp-server/src/` y `packages/mcp-tools/src/`: **cero** ocurrencias de `EvaluationContext`, `EvaluationResult`, `core.evaluate`, `evolith-evaluate`, ni de los campos del contrato objetivo (`customConstraints`, `checkpoints`, `expectedResult`, `availableEvidences`). El término "blueprint" solo aparece como ruta de artefacto en `sdlc.tools.ts:31-32`.

- No existe un tool MCP único que reciba el `EvaluationContext` completo (identificadores, validación solicitada, fase, gate, artefactos requeridos+presentados, evidencias, checkpoints, config SDLC del tenant, restricciones, rulesets/policies, modo de ejecución, contexto arquitectónico, blueprint/topología, historial de decisiones, resultado esperado) y devuelva el `EvaluationResult` estructurado (estado, resultado aprobado/condicionado/pendiente/requiere-revisión-manual, reglas, policies OPA, brechas, riesgos, evidencias faltantes, recomendaciones, acciones, decisiones sugeridas, confianza, justificación, versiones).
- Lo más cercano es `evolith-composable-validate`, pero su `context` interno (`composable-validate.tool.ts:87-96`) es plano: `{satellitePath, corePath, engine, topology, phase, rulesetId, adrId, filePath}`. No transporta tenant/initiative/gate/evidencias/checkpoints/modo/expectedResult.
- El dispatcher SÍ tiene un primer cimiento de "contexto temporal opaco": `handleCallTool` extrae `args.context` y propaga `initiative`/`tenant`/`phase` como identificadores opacos vía `runWithContext` (`mcp-tool-dispatch.ts:62-72,186-187`) — coherente con ADR-0101 (Core stateless, IDs opacos). Pero ese contexto es de telemetría/correlación, no llega a las herramientas como `EvaluationContext` evaluable.

### Paridad MCP vs CLI vs API (BR-008)

No hay referencia explícita a BR-008 ni a "parity" en el código MCP (la única "parity" es OPA best-effort en `architecture.tools.ts:84,98`). Evaluación de paridad por superficie:

| Capacidad | API (controllers) | CLI (commands) | MCP (tools) | Paridad |
|---|---|---|---|---|
| Validación de satélite/reglas | `evaluation`/`composable-validate` controllers | `validate`, `composable-validate` | `evolith-validate`, `evolith-composable-validate` | OK |
| Gate puntual | `gates` controller | `gate`, `sdlc/gate-status` | `evolith-gate-evaluate` | OK funcional, pero MCP no expone un `gate` específico distinto de `phase` |
| Phase advance | `phases` controller | `phase/phase-advance`, `sdlc/handoff` | `evolith-phase-advance`, `evolith-sdlc-handoff` | OK |
| Arquitectura/drift | `architecture` controller | `architecture/scaffold`, `drift` | `evolith-architecture-validate`, `evolith-drift-detect` | OK |
| Topologías | `satellites`/`architecture` | `satellite/*` | `evolith-topology-*` | OK |
| `core.evaluate(EvaluationContext)` | NO (controllers actuales son por entidad) | NO | NO | **Brecha en las 3 superficies** |

Conclusión BR-008: existe paridad razonable a nivel de **operaciones individuales** (validate, gate, phase-advance, architecture). La **brecha de paridad es uniforme**: ninguna de las tres superficies expone aún el contrato `EvaluationContext`→`EvaluationResult` del diseño objetivo (`reference/core/core-evaluation-engine-design.es.md`). El MCP no está por debajo del CLI/API en este punto — las tres comparten la misma brecha. Diferencias menores del MCP: `evolith-sdlc-status` usa el eje `phase-0..5` (obsoleto per memoria del proyecto) en vez del eje canónico `discovery|design|construction|qa|release` que sí usan `gate-evaluate`/`phase-advance`.

### Modo de ejecución (manual / híbrido / agéntico) y HITL

El campo `executionMode` (manual/híbrido/agéntico) del `EvaluationContext` objetivo **no existe** como input en ninguna herramienta. Lo que SÍ existe son tres mecanismos relacionados:

1. **`evaluatedBy` (human / agent / ci)** en `evolith-gate-evaluate` (`gate.tools.ts:36`) y `evolith-phase-advance` (`phase-advance.tools.ts:35`), default `agent`. Es un atributo de procedencia, no un selector de modo de ejecución manual/híbrido/agéntico.

2. **ABAC dual-engine** (`abac-evaluator.ts:55-188`, invocado en `mcp-tool-dispatch.ts:109-135`): cada llamada se evalúa con motor nativo Y OPA-wasm; ambos deben permitir (`if (!nativeDecision.allowed || !opaDecision.allowed)`). Clasifica tools en read/write/deploy por rol (`developer`, `qa`, `operator`, `sre`, `architect`, `admin`) y entorno; deploy en producción solo para architect; fail-closed si falta la policy en producción (GT-349, `abac-evaluator.ts:144-157`). Esto soporta el **modo agéntico con control de autorización por rol/entorno**.

3. **Mutative gate (HITL real)** (`mcp-tool-dispatch.ts:137-159`): toda herramienta `mutative:true` (hoy solo `evolith-sdlc-handoff`, `sdlc.tools.ts:84`) exige confirmación humana explícita: `{ apply: true, approvalToken: "..." }`. Sin token válido devuelve `FORBIDDEN`. La ejecución mutativa se audita con fingerprint del token (`fingerprintToken`, líneas 17-21) y args redactados (`redactArgs`, líneas 23-30). **Esto es el human-in-the-loop del MCP**: gate de aprobación por token para operaciones que escriben.

**Brechas de modo/HITL:**
- No hay un `executionMode` declarativo en el `EvaluationContext`; el HITL es implícito (binario mutative-sí/mutative-no) y no modela "híbrido" ni un veredicto `requiere-revisión-manual` que devuelva el evaluador y dispare HITL. El `EvaluationResult` objetivo contempla `requiere-revisión-manual` pero ninguna herramienta lo emite.
- El HITL solo aplica a la única tool mutativa (`evolith-sdlc-handoff`); las evaluaciones (gate/phase-advance) son no-mutativas y no tienen ruta HITL aunque su `verdict` sea condicionado/pendiente.
- ABAC es por **rol/entorno/tool**, no ABAC sobre atributos del `EvaluationContext` (tenant/fase/initiative no influyen en la decisión de acceso; `tenant` solo se propaga a telemetría, `mcp-tool-dispatch.ts:110`).

### Resumen de brechas MCP

- **GAP-MCP-1 (estructural):** no existe `core.evaluate` / `evolith-evaluate` que reciba el `EvaluationContext` completo y devuelva `EvaluationResult` estructurado. Diseño objetivo en `reference/core/core-evaluation-engine-design.es.md` no tiene contraparte en `src/packages/mcp-server/src/tools/`.
- **GAP-MCP-2:** los inputs actuales son flags planos (`path`, `phase`, `topology`, `ruleset`); faltan artefactos requeridos+presentados, evidencias disponibles, checkpoints externos, restricciones del tenant, config SDLC del tenant, contexto arquitectónico, historial de decisiones y `expectedResult`.
- **GAP-MCP-3:** los outputs (`GateEvidence`, `ValidationResult`, `{passed, gates[]}`) no se ajustan al `EvaluationResult` objetivo (faltan: riesgos, decisiones sugeridas, nivel de confianza, justificación técnica, versiones de core/ruleset/policy/blueprint, veredicto `condicionado`/`requiere-revisión-manual`).
- **GAP-MCP-4:** sin `executionMode` (manual/híbrido/agéntico) declarativo; HITL implícito y limitado a tools mutativas; ningún tool emite veredicto `requiere-revisión-manual`.
- **GAP-MCP-5 (menor):** `evolith-sdlc-status` usa eje `phase-0..5` obsoleto, divergente del eje canónico de las demás tools.

### Archivos relevantes (rutas absolutas)
- `/Users/beyondnet/Source/evolith/src/packages/mcp-server/src/tools/validate.tool.ts`
- `/Users/beyondnet/Source/evolith/src/packages/mcp-server/src/tools/composable-validate.tool.ts`
- `/Users/beyondnet/Source/evolith/src/packages/mcp-server/src/tools/gate.tools.ts`
- `/Users/beyondnet/Source/evolith/src/packages/mcp-server/src/tools/phase-advance.tools.ts`
- `/Users/beyondnet/Source/evolith/src/packages/mcp-server/src/tools/architecture.tools.ts`
- `/Users/beyondnet/Source/evolith/src/packages/mcp-server/src/tools/topology.tools.ts`
- `/Users/beyondnet/Source/evolith/src/packages/mcp-server/src/tools/sdlc.tools.ts`
- `/Users/beyondnet/Source/evolith/src/packages/mcp-server/src/tools/tools.module.ts`
- `/Users/beyondnet/Source/evolith/src/packages/mcp-server/src/mcp/tool.interface.ts`
- `/Users/beyondnet/Source/evolith/src/packages/mcp-server/src/mcp/tool-registry.service.ts`
- `/Users/beyondnet/Source/evolith/src/packages/mcp-server/src/mcp/mcp-tool-dispatch.ts` (envelope ADR-0073, mutative gate/HITL, propagación de contexto opaco)
- `/Users/beyondnet/Source/evolith/src/packages/mcp-server/src/mcp/abac-evaluator.ts` (ABAC dual-engine, modo agéntico)


### A.5 — Rulesets / OPA

## Hallazgos Rulesets/OPA

> **Veredicto de una línea:** Hoy las policies OPA y el evaluador nativo **NO consumen un `EvaluationContext` enviado por el Tracker**. Ambos motores reciben un contexto de **filesystem** (`{ satellitePath, corePath }`, `evaluator.interface.ts:3-6`) y el `OpaInputBuilder` (`opa-input-builder.ts:8-61`) **escanea el disco** para fabricar el input. Adicionalmente, las policies hablan **cinco shapes de input incompatibles** (`input.satellite`/`input.core`, `input.story`, `input.spec`, `input.gate`/`input.evidence`/`input.waiver`, `input.user`/`input.tool_name`), de los cuales **el builder solo produce uno** (`input.satellite`/`input.core`).

### 1. Shape de input que consumen HOY las policies

`input.context` canónico **no existe en ninguna policy** (verificado: `grep "input.context"` → 0 resultados en `src/rulesets/opa/*.rego`). El builder real (`opa-input-builder.ts:18-59`) emite exclusivamente `{ satellitePath, corePath, satellite:{...}, core:{...} }`.

| Policy (.rego) | Raíz de input que lee HOY | ¿Acepta contexto Tracker (tenant/product/initiative/phase/gate/artifacts/evidence)? | Brecha |
|---|---|---|---|
| `evidence.rego:4-64` | `input.core.evidence[file]` (manifiestos leídos de `.harness/evidence/` por el builder, `opa-input-builder.ts:205-217`) | **NO.** Recibe evidencia escaneada del disco del Core, no `EvidenceContext[]` enviado. Ignora `tenant/product/initiative/gate`. | Falta poblar `core.evidence` desde `EvaluationContext.evidence[]` (`design.md:283-290`). Hoy es FS-only. |
| `dod.rego:3-42` | `input.story.{reviewCount,coveragePercent,...}` | **NO.** Espera un objeto `story` plano de 11 campos. El builder **no produce `input.story`** (confirmado: builder solo emite `satellite`/`core`). | **Conflación + huérfano.** `dod.input.schema.json` exige `story` pero ningún builder lo arma → la policy es **inalcanzable** desde el flujo real. Además confla "story" (concepto del Tracker) dentro del Core. |
| `compliance-baseline.rego:21-96` | `input.spec.compliance.{agnosticBaseline,...}` | **NO.** Espera `input.spec`, tercer shape distinto. El builder no produce `spec`. | Huérfano: `compliance-baseline.input.schema.json` exige `spec`, no poblado por `OpaInputBuilder`. |
| `multi-tenancy.rego:3-33` | `input.satellite.multiTenancy.{applicationFiltering,...}` | **Parcial/NO.** Lee flags booleanos de `satellite.multiTenancy`, pero **el builder no produce `satellite.multiTenancy`** (revisar `opa-input-builder.ts:21-42`: produce serverless/eventDriven/dataMesh/agenticAi, NO `multiTenancy`). El `tenantId` es ignorado por completo. | El campo que la policy lee no lo emite el builder → inalcanzable. No hay mapeo de `TenantContext.tenantId` (`design.md:239-241`). |
| `governance.rego:3-39` | `input.satellitePath`, `input.corePath`, `input.satellite.{directories,files,contracts}` | **NO.** Compara rutas de disco (`input.satellitePath != input.corePath`) y escanea directorios. Lógica 100% acoplada al filesystem. | Imposible evaluar sin checkout físico. No mapea `productId/initiativeId`. |
| `phase-gates.rego:8-77` | `input.gate.{phase,mandatoryEvidence,blockingCriteria}`, `input.evidence[]`, `input.waiver[]`, `input.tenantId`, `input.evaluationDate` | **SÍ (el único alineado!).** Es el **único** shape que se parece al `EvaluationContext` objetivo: acepta gate + evidencias declaradas + tenantId. | **Pero NO está wired:** ausente de `main.rego` (verificado: no hay `import data.evolith.phase_gates` en `main.rego:1-31`) y **sin input schema** (`phase-gates.input.schema.json` NO EXISTE). El builder no produce `input.gate`/`input.evidence`/`input.waiver`. Policy correcta pero desconectada. |
| `abac-mcp-tool-access.rego:13-122` | `input.user.{id,roles,tenant}`, `input.tool_name`, `input.resource_domain`, `input.environment` | **Parcial.** Acepta `user.tenant` (eco opaco) — el único que reconoce tenant. Pero su input es runtime de MCP, no de evaluación de gate. | Shape correcto para su dominio, pero **quinto shape distinto**; no comparte builder con los demás. No cubre product/initiative/phase/artifacts. |

### 2. ¿El input OPA se puede poblar desde un `EvaluationContext` sin cambios estructurales?

**No.** Requiere el `input.context` canónico que hoy no existe. Evidencia:

- **El builder solo conoce el disco.** `OpaInputBuilder.build(ctx)` recibe `EvaluationContext = { satellitePath, corePath }` (`evaluator.interface.ts:3-6`) y resuelve TODO leyendo el filesystem: `safeReadJson(package.json)`, `readEvidence(.harness/evidence)`, `getTopLevelDirs`, `analyzeSourceFiles(src/)` (`opa-input-builder.ts:9-59`). **No hay un solo campo poblado desde identificadores/facts enviados** — no existen `tenant`, `product`, `initiative`, `gate`, `artifacts`, `evidence[]` declarados, `architecture`, `checkpoint`, `deployment` (todos definidos en el contrato objetivo `design.md:299-334`).

- **Conflación de nombre `EvaluationContext`.** El `EvaluationContext` del código (`evaluator.interface.ts:3-6`, dos campos de path) **es un homónimo distinto** del `EvaluationContext` canónico del diseño (`design.md:299-334`, ~20 campos de contexto opaco). Cualquier integración con el Tracker debe distinguirlos: el Core actual no tiene el contrato canónico implementado, solo el FS-context.

- **Conflaciones de identidad-de-Tracker dentro del input OPA:**
  - `dod.rego` → `input.story.*`: introduce el concepto **"story"** (entidad del Tracker, `design.md:16` la lista entre lo que el Core NO administra) directamente como raíz de input del Core. Debería entrar como `EvidenceContext`/facts bajo `input.context`, no como `story`.
  - `governance.rego:6,11,16` → `input.satellitePath != input.corePath`: la decisión de "es satélite vs core" se toma comparando **rutas físicas**, contradiciendo el principio de `workspaceRef` opaco (`design.md:88,322`). El Core "nunca ve paths" según el diseño, pero la policy depende de ellos.
  - `phase-gates.rego:60` → `input.tenantId` "default": trata el tenant como string opaco (correcto), pero el resto de policies lo ignora por completo.

- **Cinco shapes ⇒ no hay un input.context único.** Para poblar desde un `EvaluationContext` haría falta un **mapper** que proyecte el contexto canónico a `core.evidence` (evidence.rego), `story` (dod.rego), `spec.compliance` (compliance-baseline.rego), `satellite.multiTenancy` (multi-tenancy.rego), `gate`/`evidence`/`waiver` (phase-gates.rego) y `user`/`tool_name` (abac). Ese mapper **no existe**; el único builder (`OpaInputBuilder`) solo cubre `satellite`/`core` desde FS.

### 3. Paridad native+OPA (ADR-0041): ¿builder de input único para ambos motores?

| Aspecto | Estado | Anclaje |
|---|---|---|
| Interfaz común | **SÍ.** Ambos implementan `IRuleEvaluatorStrategy.evaluateAll(rules, ctx)` con el mismo `EvaluationContext = {satellitePath, corePath}`. | `evaluator.interface.ts:15-21`; `opa-evaluator.ts:10`; `native-evaluator.ts:18` |
| ¿Builder de input único? | **NO.** OPA usa `OpaInputBuilder.build(ctx)` que produce **un objeto JSON estructurado** (`opa-evaluator.ts:70`). El Native **no usa builder**: cada handler re-escanea el FS por su cuenta (p.ej. `EvidenceRuleHandler` abre `.harness/evidence/` directamente, `evidence-rule.handler.ts:15-20`; `SdlcRuleHandler` hace `fs.exists(path.join(ctx.satellitePath,...))`, `sdlc-rule.handler.ts:33-37`). | Hay **dos rutas de lectura del disco paralelas** (builder vs. 12 handlers). |
| Riesgo de drift | **ALTO y estructural.** La paridad depende de que el builder JSON y los 12 handlers FS interpreten el disco idénticamente. P.ej. `evidence.rego` exige `evaluatedRules||relatedRuleIds||relatedGateId` (`evidence.rego:33-37`) y `EvidenceRuleHandler` replica la misma lógica a mano (`evidence-rule.handler.ts:43-45`): **misma regla codificada dos veces en dos lenguajes sobre dos lecturas de FS distintas**. Es exactamente el "parity bug" que el README advierte (`opa/README.md:99`). | `native-opa-parity.spec.ts`, `aggregator-parity.spec.ts` existen como red de contención. |
| Implicación para Tracker | Introducir un `EvaluationContext` canónico **rompería ambos motores a la vez** salvo que se cree una capa de mapeo única que alimente tanto al builder OPA como a los handlers nativos. Hoy esa capa única no existe. | — |

### 4. Hallazgo transversal: el flujo de gate real NO ejecuta `phase-gates.rego`

El único punto donde el Tracker enviaría gate+artefactos+evidencias es el gate evaluation, y ahí la policy canónica queda fuera:

- `EvaluateGateUseCase.execute(input)` recibe `{ phase, projectPath, corePath }` (`evaluate-gate.use-case.ts:45-55`) y delega en `PhaseGateValidatorService.validateGate(gateNumber, projectPath)` (`:68`) — que valida **leyendo evidencias del filesystem del proyecto** (`phase-gate-validator.service.ts`, vía `EvidenceValidator`/`BlockingCriteriaValidator`), **sin invocar OPA ni `phase-gates.rego`**.
- La pipeline `SatelliteEvaluationPipeline.evaluateGate` (`satellite-evaluation-pipeline.service.ts:126-200`) sí llama `OpaEvaluator.evaluateAll([...], { satellitePath, corePath })` (`:178-185`), pero con el shape `satellite/core` — **no** con `input.gate`/`input.evidence`. Por tanto `phase-gates.rego` (que espera `input.gate`) nunca recibiría su input aunque estuviera wired.
- Resultado: la policy mejor diseñada para el contrato Tracker (`phase-gates.rego`) está **triple-desconectada**: (a) no está en `main.rego`, (b) no tiene input schema, (c) ningún builder produce su shape.

### Resumen de brechas priorizadas

| # | Brecha | Severidad | Evidencia |
|---|---|---|---|
| B1 | No existe `input.context` canónico ni mapper `EvaluationContext → input OPA`; el builder solo lee FS | **Crítica** | `opa-input-builder.ts:8-61`; `design.md:299-334` |
| B2 | 5 shapes de input incompatibles entre policies; un solo builder cubre 1 (`satellite`/`core`) | **Crítica** | `dod.rego`/`compliance-baseline.rego`/`phase-gates.rego`/`abac` vs `opa-input-builder.ts:18-59` |
| B3 | `phase-gates.rego` (el único alineado con Tracker) sin wiring en `main.rego`, sin schema, sin builder | **Alta** | `main.rego:1-31`; `phase-gates.input.schema.json` no existe |
| B4 | `dod.rego` (`input.story`) y `compliance-baseline.rego` (`input.spec`) son policies huérfanas (schema exige raíz que ningún builder puebla) | **Alta** | `dod.rego:3`; `compliance-baseline.rego:21`; builder no emite `story`/`spec` |
| B5 | Paridad native+OPA sin builder de input compartido → drift estructural; cada motor relee el FS | **Alta** | `native-evaluator.ts` handlers vs `opa-evaluator.ts:70` |
| B6 | `governance.rego` decide identidad por comparación de paths físicos, contradice `workspaceRef` opaco | **Media** | `governance.rego:6,11,16`; `design.md:88,322` |
| B7 | `multi-tenancy.rego` lee `satellite.multiTenancy` que el builder no produce; `tenantId` opaco ignorado | **Media** | `multi-tenancy.rego:3`; `opa-input-builder.ts:21-42` |
| B8 | Gate evaluation real (`EvaluateGateUseCase`) valida por FS y no ejecuta OPA `phase-gates` | **Media** | `evaluate-gate.use-case.ts:65-68`; `phase-gate-validator.service.ts` |

**Archivos clave (rutas absolutas):**
- `/Users/beyondnet/Source/evolith/src/packages/core-domain/src/application/validators/evaluators/opa-input-builder.ts` (builder FS-only)
- `/Users/beyondnet/Source/evolith/src/packages/core-domain/src/application/validators/evaluators/evaluator.interface.ts` (homónimo `EvaluationContext = {satellitePath, corePath}`)
- `/Users/beyondnet/Source/evolith/src/packages/core-domain/src/application/validators/evaluators/opa-evaluator.ts` y `native-evaluator.ts` (paridad sin builder compartido)
- `/Users/beyondnet/Source/evolith/rulesets/opa/{phase-gates,dod,compliance-baseline,evidence,multi-tenancy,governance,abac-mcp-tool-access}.rego`
- `/Users/beyondnet/Source/evolith/rulesets/opa/main.rego` (no agrega phase-gates)
- `/Users/beyondnet/Source/evolith/rulesets/opa/schemas/*.input.schema.json` (26 schemas, sin `phase-gates`)
- `/Users/beyondnet/Source/evolith/src/packages/core-domain/src/application/use-cases/evaluate-gate.use-case.ts` (gate real, FS-based, sin OPA)
- `/Users/beyondnet/Source/evolith/reference/core/core-evaluation-engine-design.md:299-334` (contrato canónico objetivo `EvaluationContext`)
