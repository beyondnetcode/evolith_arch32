# Análisis: Interacción Formal del SDLC de Evolith Core con sus Interfaces

> Pregunta central: ¿Todas las fases, gates y artefactos del SDLC de Evolith tienen
> interacción formal, completa y gobernable con las interfaces del Core, de modo que
> Tracker, humanos, agentes de IA, pipelines y sistemas externos puedan operar cada
> fase mediante interfaces claras, en un modelo multi-tenant, configurable, extensible
> y gobernado?

Fecha: 26 de junio de 2026 · Analista: Winston · Basado en evidencia del código (rutas citadas), no en documentación aspiracional.

---

## Resumen de una línea

Evolith Core tiene un **núcleo de evaluación de gates fuerte y ejecutable** (CLI + MCP + REST con paridad gobernada), pero **tres carencias estructurales** impiden hoy un modelo "completo, gobernable y componible": (1) **no hay sistema de eventos de dominio** (solo un webhook puntual), (2) **no hay máquina de estados de artefactos** ni verdict unificado (tres modelos divergentes, dos huérfanos), y (3) **falta el seam de composición** para que un orquestador externo suministre y valide flujos.

> **Premisa arquitectónica (por diseño).** Evolith Core es **agnóstico a tenants**: NO debe almacenar la configuración específica de cada tenant (qué fases/gates usa, qué decide ejecutar o no). Esa composición de flujo por tenant es responsabilidad de **Evolith Tracker**. Por tanto, "configurable por tenant" en este análisis **no** significa que el Core guarde config de tenant —eso sería incorrecto—, sino que el Core debe ser **parametrizable/componible**: exponer catálogos y aceptar un `WorkflowDefinition` externo que valida contra sus invariantes. El gap (3) es justamente que ese seam existe a medias (`getWorkflow(tenant?)` está, pero no hay operación para **validar** un flujo suministrado por Tracker), no que "al Core le falte multi-tenancy".

---

## Hallazgos base (evidencia)

**Fases y gates.** 5 fases `f1..f5` (`reference/governance/sdlc/phases/phase-f*.json`, schema `sdlc-phase.schema.json`) mapeadas 1:1 a 5 gates (`reference/governance/sdlc/gates/gate-f*.json`). Conviven **tres nomenclaturas** (`f1..f5`, `discovery/design/construction/qa/release`, `phase-0..`) y **dos fuentes de gates divergentes**: la declarativa `gates/gate-f*.json` (cita `.rego`) y la que el motor realmente consume, `rulesets/sdlc/phase-gates.rules.json` (usa `mandatoryEvidence`, **no** ejecuta esos `.rego`).

**Artefactos.** 27 plantillas (`reference/governance/sdlc/04-artifact-templates/`) y 13 schemas (`rulesets/schema/`). La validación es **mayoritariamente por existencia**: `evidence-validator.ts` resuelve cada artefacto a la RUTA DE LA PLANTILLA en el Core, no al artefacto producido por el satélite (admitido como deuda técnica en el propio código), por lo que **AJV es efectivamente inerte** para PRD/historias/feasibility. Hay checks semánticos reales pero frágiles (cobertura<80%, CVEs, tech-debt) en `blocking-criteria-validator.ts`, enrutados por substring de texto.

**Estados.** **No existe máquina de estados de artefactos** (created/in-progress/pending-validation/approved/rejected/observed/versioned/archived NO está implementado). Hay **tres modelos de verdict desconectados**: canónico `passed|failed|skipped` (`gate-evidence.ts`, ADR-0073), huérfano `PASS|FAIL|WAIVED` (`gate-decision.ts`), y transición `approved` (`phase-transition.model.ts`). Los dos últimos son **código muerto** (solo referenciados por sus specs).

**Interfaces.** REST 13 endpoints versionados v1 con OpenAPI/Swagger en `/api/docs` (`apps/core-api`), CLI ~24 comandos (`@evolith/smart-cli`), MCP 27 tools (`@evolith/mcp-server`). Gobernadas por `surface-parity-matrix.json` (49 ops) + gate de CI `24-check-surface-parity`.

**Eventos.** **NO hay event bus ni eventos de dominio** (`phase.started`, `gate.approved`, etc. no existen). Solo un **webhook de un disparo** (`IWebhookNotifier.notify(url, evidence)` → `webhook.adapter.ts`) que hace un POST de `GateEvidence`, opt-in vía `--webhook-url`. Sin suscripción, reintentos, persistencia ni catálogo.

**Multi-tenancy.** Modelo de tenant mínimo (`tenancy/tenant-authority.ts`: `tier`, `allowedTopologies`, `maxSatellites`). ADR-0010 + `multi-tenancy.rego` cubren **aislamiento de datos**, no personalización de flujo. **El tenant no puede definir su SDLC.**

**Autorización.** **ABAC real** solo para acceso a tools MCP (`abac-evaluator.ts` + `abac-mcp-tool-access.rego`, paridad TS/OPA). En gates, `accountableRole`/`waiverAuthority` son **declarativos** (nadie verifica que el aprobador tenga el rol). No hay modelo de roles formal.

**Blueprints.** **Concepto, no código**: "blueprint" es un archivo-evidencia que se valida por existencia; no hay entidad ni validación contra OPA/topologías.

**Auditoría.** Implementada (`AuditLogger`, `CommandHistoryService` JSONL append-only, `GateDecision` inmutable) pero en memoria/JSONL, no ledger persistente.

---

## TABLA 1 — Análisis por fase del SDLC

Valores comunes a las 5 fases (para no repetir en cada celda):
**Interfaces requeridas** = REST (`GET gates/:id`, `POST gates/:id/evaluate`, `GET phases/:phase/requirements`, `POST phases/transition`) + MCP (`evolith-gate-evaluate`, `evolith-phase-advance`, `evolith-sdlc-status`) + CLI (`gate`, `phase advance`, `sdlc`). ·
**Configurable por tenant** = **N/A en Core (por diseño)**: el Core es agnóstico a tenants; la composición de fases/gates por tenant la realiza **Tracker** consumiendo catálogos del Core y suministrando un `WorkflowDefinition` que el Core valida contra sus invariantes. ·
**Estados requeridos (objetivo)** = created → in-progress → pending-validation → approved/rejected/observed → versioned → archived. **Actual** = solo verdict de gate `passed|failed|skipped`; sin estado de artefacto. ·
**Eventos requeridos (objetivo)** = `phase.started/completed`, `artifact.created/updated/validated`, `gate.approved/rejected`. **Actual** = ninguno (solo webhook puntual de GateEvidence). ·
**Políticas aplicables** = OPA rulesets + `accountableRole`/`waiverAuthority` (declarativos) + ABAC (solo tools MCP). ·
**Nivel de gobernanza requerido** = Alto (gate bloqueante).

| Fase | Gate (accountable) | Artefactos | Operaciones esperadas | Actor consumidor | Estado actual observado | Gaps detectados | Riesgo si no existe | Recomendación |
|---|---|---|---|---|---|---|---|---|
| **f1 Conception & Discovery** | gate-f1 (PO / Executive Sponsor) | PRD, Discovery Canvas, Technical Feasibility, Ballpark Estimation, MoSCoW, Build-vs-Compose | consultar requisitos, crear/validar artefactos, evaluar gate, avanzar | Humano (CLI), Agente (MCP MoSCoW), Tracker (REST) | Gate evalúa por **existencia de plantilla**; MoSCoW sí tiene CRUD real (MCP). PRD/Canvas/Ballpark **sin schema** → solo presencia | Artefactos sin schema; AJV inerte; sin estado de artefacto; sin eventos; no por-tenant | Gate "verde" sin contenido real (falsos positivos de discovery) | Schemas para PRD/Canvas; validación semántica de completitud; estados de artefacto |
| **f2 Design & Architecture** | gate-f2 (Architect) | ADR Registry, Functional Stories, Reference Blueprint Alignment, Simplicity Checklist, Bounded Context Map | listar/seleccionar topología, construir+validar blueprint, registrar ADRs, evaluar gate | Humano (CLI), Agente (MCP topology/adr), Tracker (REST architecture) | Topologías consultables (8) vía MCP/REST; ADRs reales (115). **Blueprint = solo existencia de archivo**; Bounded Context Map sin schema | Blueprint no es entidad ni se valida contra OPA/topologías/políticas; sin estado | Arquitectura "aprobada" sin validar coherencia real con el Core | Entidad Blueprint + validación contra rulesets/topologías permitidas/OPA |
| **f3 Construction** | gate-f3 (Tech Lead; bloquea CI/cobertura<80%/CVEs) | Technical Stories, CI Pipeline, DoD Checklist, Documentation Delta, Coverage Report | evaluar gate (coverage, CVE, tech-debt), validar DoD, avanzar | Pipeline CI/CD (CLI `gate evaluate`), Humano, Agente | **Validación semántica real** (parsea `coverage-summary.json`, `security-scan.json`) — la fase más madura | Enrutado por substring frágil; verdict sin WAIVED en el motor real; sin eventos para Tracker/pipeline | Bloqueo incoherente o evadible; pipeline sin feedback asíncrono | Unificar verdict (incl. WAIVED); reemplazar routing por substring por IDs; emitir `gate.*` |
| **f4 Validation & QA** | gate-f4 (QA Lead) | Test Summary Report, Acceptance Validation, Security Scan Report, Integration Evidence, Pyramid Distribution | evaluar gate, validar reportes, avanzar | Pipeline CI/CD, Agente QA (MCP), Humano | Security/coverage parseados; Acceptance/Integration **por existencia** | Validación semántica parcial; sin estados ni eventos; no por-tenant | QA "aprobado" sin verificar calidad real de la evidencia | Schemas + validación estructural de reportes; eventos `artifact.validated` |
| **f5 Delivery & Operations** | gate-f5 (DevOps Lead / Technology Director) | Release Notes, Observability Validation, Rollback Procedure, On-Call Handoff, Deployment Evidence | evaluar gate, validar rollback/observabilidad, avanzar a producción | Pipeline CD, Governance Owner (aprobación), Tracker | Rollback validado por **keyword-matching** en Release Notes; resto por existencia | `accountableRole`/`waiverAuthority` no se aplican (sin enforcement de rol); sin eventos de release | Release a prod sin aprobación gobernada real ni trazabilidad de quién aprobó | Enforcement de rol del aprobador (OPA por actor); evento `gate.approved` con identidad firmada |

---

## TABLA 2 — Análisis por tipo de interfaz

| Tipo de interfaz | Propósito | Consumidor principal | Operaciones soportadas | Eventos generados | Políticas aplicables | Nivel de gobernanza | Riesgos si no existe / falta | Recomendación |
|---|---|---|---|---|---|---|---|---|
| **REST API (core-api)** | Lectura/consulta gobernada del SDLC y arquitectura | Tracker, sistemas externos, pipelines | 13 endpoints v1: evaluate gate, transition phase, init/propose, topologies, validate-satellite, drift, rulesets, gate-definition, phase-requirements, health, metrics. OpenAPI en `/api/docs` | Ninguno (webhook puntual aparte) | helmet, ValidationPipe, throttler, `SecurityAuditInterceptor`; **sin ABAC por recurso** | Medio-Alto | Sin REST, Tracker/externos no integran; sin eventos, Tracker hace polling | Añadir ABAC/OPA por endpoint y por tenant; cabeceras de tenant; paginación de catálogos |
| **CLI (`@evolith/smart-cli`)** | Ergonomía humana + uso en pipelines | Humano, pipeline CI/CD | ~24 comandos: gate, phase, sdlc, validate, drift, scaffold, adr, standards, docs, agents, init/wizard, mcp serve, api | Webhook opt-in (`--webhook-url`) de GateEvidence | Prompts `confirm` (HITL), perfiles | Medio | Sin CLI no hay HITL humano ni uso simple en CI | Salida `--json` estable como contrato; exit codes por verdict; firmar acciones del aprobador |
| **MCP (`@evolith/mcp-server`)** | Superficie para agentes de IA | Agente de IA | 27 tools `evolith-*`; **6 mutativas** exigen `apply:true`+`approvalToken` | Webhook opt-in en gate/phase tools | **ABAC real (TS+OPA)**, scopes read/write, auth por defecto, audit log | Alto | Sin MCP los agentes no operan con control; es el punto fuerte actual | Extender ABAC con dimensión **tenant** efectiva; límites de autonomía por rol de agente |
| **Eventos / Event bus** | Notificación asíncrona de cambios de dominio | Tracker, pipelines, auditoría, externos | **NO EXISTE** (solo `IWebhookNotifier.notify` de un disparo) | `phase.*`, `artifact.*`, `gate.*`, `blueprint.*`, `tenant.flow.*` → **ausentes** | — | **Ausente** | **Crítico**: Tracker depende de polling; sin trazabilidad asíncrona; integración frágil | Implementar event bus de dominio + outbox + catálogo de eventos versionado |
| **Webhooks** | Push a sistemas externos | Sistema externo, Tracker | Un POST de GateEvidence opt-in | — | Cabeceras correlation/tenant/phase | Bajo | Sin reintentos/suscripción/persistencia → entregas perdidas | Webhooks por suscripción (tópicos), reintentos, firma HMAC, registro |
| **SDK de agentes** | Cliente tipado para agentes/integradores | Agente IA, integradores | **NO EXISTE** (la superficie de agentes es MCP; REST se consume directo) | — | — | **Ausente** | Integradores reimplementan clientes; contratos no tipados | Publicar `@evolith/sdk` (cliente REST+MCP tipado desde OpenAPI/schemas) |
| **Contracts / Schema** | Contrato formal de datos | Todos | 13 schemas de artefacto + `ruleset-standard` + `sdlc-gate`/`phase` + `surface-parity-matrix` + OpenAPI | — | Validación AJV (parcial, inerte para varios artefactos) | Medio | Sin contratos completos, validación es por existencia | Schema por CADA artefacto; validar artefacto real (no plantilla) |
| **Integración Tracker** | Interfaz visual/operativa sobre el Core | Evolith Tracker | Hoy: REST (lectura) + webhook puntual | — | ACL/Funnel-0 (conceptual, fuera de Core) | Medio | Sin eventos ni write-back gobernado, Tracker queda como visor pasivo | Definir contrato Core↔Tracker: REST write gobernado + eventos + estados |
| **Pipelines CI/CD** | Enforcement automático en el pipeline | Pipeline | CLI `validate`/`gate evaluate` (+webhook), REST POST | Webhook puntual | Exit codes, gates bloqueantes | Alto | Sin esto, governance no bloquea de verdad | Estandarizar action/step reusable + reporte de evidencia firmado |

---

## Conclusión

### 1. ¿Puede Evolith Core operar HOY como fuente de verdad del SDLC?
**Parcialmente.** Es fuente de verdad **de las reglas y la evaluación de gates** (rulesets, OPA, validadores, paridad de superficies) y lo expone por CLI/MCP/REST con auditoría. **No** es aún fuente de verdad del **estado vivo del SDLC**: no hay máquina de estados de fase/artefacto, el verdict está fragmentado en tres modelos (dos muertos), la validación de artefactos es por existencia de plantilla, y no emite eventos. Hoy responde "¿esto cumple la regla?", no "¿en qué estado está esta iniciativa y quién la movió?".

### 2. ¿Puede Evolith Tracker funcionar como interfaz operativa sobre el Core?
**Sí como visor de lectura; no aún como capa operativa completa.** Tracker puede consumir REST (topologías, rulesets, gate-definition, requirements) y disparar evaluaciones. Le faltan tres cosas del Core: **eventos** (hoy tendría que hacer polling), **write-back gobernado de estados** (crear/avanzar/aprobar con persistencia y verdict unificado) y un **contrato Core↔Tracker** explícito. Con esas piezas, Tracker sería la UI operativa; sin ellas, queda como dashboard pasivo.

### 3. ¿Pueden los tenants configurar flujos propios sin romper la gobernanza?
**Aclaración de diseño:** la configuración por tenant **no es responsabilidad del Core** — el Core es **agnóstico a tenants** y esa composición vive en **Evolith Tracker**. La pregunta correcta es: *¿puede el Core ser parametrizado por Tracker sin romper la gobernanza?* **Hoy, solo parcialmente.** El Core ya expone catálogos (topologías, agentes) y un seam `IWorkflowDefinitionProvider.getWorkflow(tenant?)`, y propaga contexto de tenant para auditoría/ABAC — eso es correcto y suficiente como base. Lo que **falta** es: (a) catálogos componibles de **fases/gates/artefactos** (no solo topologías), y (b) una operación **`validateWorkflow(definition)`** que verifique el flujo suministrado por Tracker contra los **invariantes del Core** (gates mínimos obligatorios, OPA, artefactos no omitibles). Con eso, Tracker compone libremente y el Core garantiza que ninguna composición rompa la gobernanza.

### 4. ¿Pueden los agentes de IA interactuar con seguridad y trazabilidad?
**Sí, es el punto más maduro.** MCP aplica ABAC (TS+OPA), scopes read/write, auth por defecto, y exige `apply:true`+`approvalToken` con audit log en tools mutativas. Límite actual: la **dimensión tenant del ABAC no se aplica por reglas por-tenant**, y los "límites de autonomía" del agente dependen de rol como string, sin modelo formal. Recomendación: roles enumerados + políticas ABAC por tenant + lista explícita de operaciones que **siempre** requieren aprobación humana (delivery a prod, waiver de gate, cambios de flujo).

### 5. Qué responsabilidades deben PERMANECER en el Core
Definición y versionado de **fases/gates/artefactos/topologías/rulesets**; **evaluación** de gates y validación (técnica y semántica); **contratos/schemas** y la **matriz de paridad**; **modelo de estados y verdict canónico**; **catálogo de eventos**; **políticas de gobernanza** (OPA/ABAC, gates mínimos obligatorios, invariantes de flujo); **auditoría inmutable**. El Core es el árbitro del "qué" y el "cómo se valida".

### 6. Qué debería DELEGARSE a Tracker / agentes / pipelines / externos
**Tracker**: UI/UX, orquestación visual, composición del flujo por tenant (dentro de los límites del Core), priorización, ownership/ROI/funding (ya fuera de Core por diseño). **Agentes**: ejecución asistida, generación de artefactos, auto-fix (con HITL). **Pipelines**: ejecución del enforcement y publicación de evidencia. **Sistemas externos**: consumo de eventos/webhooks y reporting. El "cuándo/quién/por qué" de negocio queda fuera; el "qué cumple y en qué estado está" queda en el Core.

### 7. Mejoras concretas para un modelo completo, gobernable, extensible y multi-tenant
Priorizadas:

1. **Unificar el modelo de verdict y estados** en `gate-evidence.ts` (canónico) e integrar/retirar `gate-decision.ts` y `phase-transition.model.ts` (hoy muertos). Añadir **máquina de estados de artefacto** (created→…→archived).
2. **Sistema de eventos de dominio** + outbox + catálogo versionado (`phase.*`, `artifact.*`, `gate.*`, `blueprint.*`, `tenant.flow.*`), consumible por Tracker/pipelines/auditoría. Evolucionar el webhook puntual a suscripción con reintentos y firma.
3. **Seam de composición para Tracker** (el Core sigue agnóstico a tenants): catálogos componibles de fases/gates/artefactos + operación `validateWorkflow(definition)` que valida el flujo suministrado por Tracker contra los invariantes del Core. El Core **no** almacena config por tenant; solo valida lo que Tracker compone.
4. **Validar el artefacto real, no la plantilla**: corregir `evidence-validator.ts` para resolver el artefacto del satélite y correr AJV/validación semántica; añadir schema a los artefactos que no lo tienen.
5. **Unificar las dos fuentes de gates** (`gates/*.json` vs `phase-gates.rules.json`) y asegurar que los `.rego` citados se ejecuten; reemplazar el routing por substring por IDs estables.
6. **Enforcement de roles en gates**: modelo de roles formal + OPA que verifique que el aprobador/waiver posee `accountableRole`/`waiverAuthority`; ABAC por tenant.
7. **Entidad Blueprint** real: construcción + validación contra rulesets, topologías permitidas, políticas del tenant, OPA y SDLC definido.
8. **Publicar `@evolith/sdk`** (cliente tipado REST+MCP) y formalizar el **contrato Core↔Tracker**.
9. **Persistir auditoría** en un ledger append-only real (hoy in-memory/JSONL).
10. **Operación `artifact-*` en la matriz de paridad** y exposición coherente CRUD+validación+versionado de artefactos en las tres interfaces.

---

*Análisis emitido por Winston · basado en inspección del código de Evolith Core (rutas citadas) · no sustituye una revisión arquitectónica formal del equipo.*
