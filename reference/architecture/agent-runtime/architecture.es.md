# Evolith Agent Runtime — Arquitectura

> **Navegación bilingüe:** [English version](./architecture.md)

Este documento describe las capas, el flujo de ejecución, la separación de
responsabilidades y los diagramas del Evolith Agent Runtime. Consulta también
[Puertos y Adaptadores](./ports-and-adapters.es.md) e
[Integración con .harness](./harness-integration.es.md).

## 1. Qué es

El Agent Runtime es una capa de orquestación delgada y gobernada. Dado un
`AgentRuntimeRequest`, resuelve el contexto tenant/producto/iniciativa,
selecciona una capacidad gobernada, invoca los puertos adecuados, ejecuta
validaciones, devuelve un `AgentRuntimeResult` y emite trazabilidad. Está
implementada en
[`packages/agent-runtime`](../../../packages/agent-runtime/README.es.md)
siguiendo **Puertos y Adaptadores** para que ninguna tecnología de runtime/LLM
se convierta en dependencia del dominio.

> **Importante:** Las capacidades del runtime y la madurez de su implementación (como el `InteractionAdapterPort`) están estrictamente gobernadas por la [Matriz de Madurez de Capacidades de Adaptadores](../../governance/standards/vision/maturity-assessment.es.md#5-madurez-de-capacidades-de-adaptadores-agent-runtime).

## 2. Por qué una nueva capa que no reemplaza .harness

`.harness` es el mecanismo oficial, versionado y auditable que **ejecuta**
scripts, playbooks, validators, audits y skills. El Agent Runtime atiende otra
preocupación: **decide qué ejecutar, lo gobierna y lo registra**. Mantenerlos
separados implica:

- `.harness` sigue siendo el único ejecutor gobernado; el runtime lo invoca por
  un puerto (`IHarnessPort`) y nunca lo reimplementa.
- El runtime puede conversar, recordar, programar y recomendar, preocupaciones
  que no pertenecen a un ejecutor determinístico.
- Cada lado evoluciona de forma independiente: un ejecutor `.harness`
  remoto/aislado es un cambio de adaptador; un nuevo motor de razonamiento es
  otro cambio de adaptador.

## 3. Visión general de la arquitectura

```mermaid
flowchart TB
  callers["Evolith Tracker / Chat / CLI / External Client"]
  runtime["Evolith Agent Runtime (AgentRuntimeService)"]
  ports["Ports (interfaces)"]
  adapters["Adapters (concrete tech)"]
  harness[".harness executor"]
  core["Evolith Core (stateless evaluation)"]
  opa["OPA / rulesets"]
  tracker["Evolith Tracker (trazability)"]
  memory["Memory"]
  scheduler["Scheduler"]
  hermes["Hermes / other engine (optional)"]

  callers --> runtime --> ports --> adapters
  adapters --> harness
  adapters --> core
  adapters --> opa
  adapters --> tracker
  adapters --> memory
  adapters --> scheduler
  adapters --> hermes
```

El runtime depende únicamente de la fila **Puertos**. Todo lo que está por
debajo es reemplazable sin tocar el runtime.

## 4. Mapa de puertos y adaptadores

```mermaid
flowchart LR
  subgraph Domain["Domain + Application (no tech)"]
    svc["AgentRuntimeService"]
    p1["IHarnessPort"]
    p2["ICoreEvaluationPort"]
    p3["IPolicyValidationPort"]
    p4["ITrackerTracePort"]
    p5["IMemoryPort"]
    p6["ISkillRegistryPort"]
    p7["ISchedulerPort"]
    p8["ICommunicationGatewayPort"]
    p9["IApprovalPort"]
    p10["IAgentEnginePort"]
  end

  svc --> p1 & p2 & p3 & p4 & p5 & p6 & p7 & p8 & p9 & p10

  p1 --- a1["HarnessProcessAdapter / InMemoryHarnessAdapter"]
  p2 --- a2["StubCoreEvaluationAdapter / (HTTP or in-process Core)"]
  p3 --- a3["OpaCliPolicyValidationAdapter / StubPolicy"]
  p4 --- a4["HttpTrackerTraceAdapter / InMemoryTracker"]
  p5 --- a5["InMemoryMemoryAdapter"]
  p6 --- a6["LocalSkillRegistryAdapter"]
  p7 --- a7["InMemorySchedulerAdapter"]
  p8 --- a8["CliCommunicationGatewayAdapter"]
  p9 --- a9["AutoApprovalAdapter / DenyByDefault"]
  p10 --- a10["HermesAgentAdapter / StubAgentEngineAdapter"]
```

Catálogo completo: [Puertos y Adaptadores](./ports-and-adapters.es.md).

## 5. Flujo de ejecución

El flujo base combina la ejecución de `.harness` y la evaluación del Core en un
único resultado gobernado, luego valida con OPA y registra trazabilidad.

```mermaid
flowchart TD
  req["AgentRuntimeRequest"] --> ctx["Resolve tenant/product/initiative context"]
  ctx --> sel["Select capability via SkillRegistry (engine may propose)"]
  sel --> found{"Capability found?"}
  found -- no --> err["status: error (tool-not-found)"]
  found -- yes --> appr{"Requires approval?"}
  appr -- yes, denied --> blk["status: blocked"]
  appr -- no / granted --> hx["IHarnessPort.execute (if harness/composite)"]
  hx --> ev["ICoreEvaluationPort.evaluate (if evaluation/composite)"]
  ev --> pol{"Requires policy?"}
  pol -- yes --> opa["IPolicyValidationPort.validate (OPA)"]
  pol -- no --> asm["Assemble result"]
  opa --> asm
  asm --> trace["Emit TraceEvent + Memory append"]
  trace --> out["AgentRuntimeResult"]
```

El pipeline de contratos de datos, nombrado explícitamente:

```text
AgentRuntimeRequest
  -> HarnessExecutionRequest -> HarnessExecutionResult
  -> EvaluationContext (CoreEvaluationRequest) -> EvaluationResult
  -> PolicyValidationResult
  -> AgentRuntimeResult
  -> TrackerTraceEvent
```

Validación de un gate como secuencia:

```mermaid
sequenceDiagram
  participant T as Tracker/Chat/CLI
  participant R as Agent Runtime
  participant H as .harness
  participant C as Evolith Core
  participant O as OPA
  participant K as "Tracker (trace)"
  T->>R: AgentRuntimeRequest(validate_discovery_gate)
  R->>H: execute(sdlc-phase-gate-validator)
  H-->>R: HarnessExecutionResult(missing_artifacts)
  R->>C: evaluate(EvaluationContext)
  C-->>R: EvaluationResult(verdict)
  R->>O: validate(policy input)
  O-->>R: PolicyValidationResult(allowed?)
  R->>K: publish(TraceEvent)
  R-->>T: AgentRuntimeResult(status, findings, trace)
```

Ejecución con el motor opcional Hermes (solo **propone**; el runtime sigue
gobernando):

```mermaid
sequenceDiagram
  participant T as Caller
  participant R as Agent Runtime
  participant E as "IAgentEnginePort (Hermes adapter)"
  participant S as SkillRegistry
  T->>R: AgentRuntimeRequest(intent, no explicit tool)
  R->>S: resolve(intent)
  S-->>R: not found
  R->>E: plan(request, availableSkills)
  E-->>R: AgentEnginePlan(proposedTool, rationale)
  R->>S: resolve(proposedTool)
  S-->>R: SkillDescriptor
  Note over R: approval + policy + trace still enforced
  R-->>T: AgentRuntimeResult
```

## 6. Separación de responsabilidades

Cada resultado lleva un bloque `trace` que nombra **quién hizo qué**, de modo que
las auditorías nunca tienen que confiar en el resumen del propio runtime:

| Campo | Valor | Significado |
|---|---|---|
| `executedBy` | `agent_runtime` | El runtime orquestó la llamada |
| `validatedBy` | `.harness` | La capacidad que produjo los hechos |
| `governedBy` | `evolith_core` | El Core evaluó contra contratos/rulesets |
| `policyEngine` | `opa` | OPA aplicó la política sobre el resultado |

El runtime nunca afirma haber gobernado; lo hacen el Core y OPA. Este es el
mecanismo que mantiene honesta a la capa agéntica.

## 7. Tenant, producto e iniciativa como contexto

Tenant/producto/iniciativa se **reciben por petición** como identificadores
opacos en `RuntimeContext`, se reflejan en las trazas y se reenvían al Core como
contexto de evaluación temporal únicamente (según el contrato del Core sin
estado). Nunca se embeben en `.harness` ni los persiste el runtime. Evolith
Tracker sigue siendo el sistema de registro; el runtime solo enruta, gobierna y
traza sobre esos identificadores.

## 8. Alcance del MVP frente a extensiones futuras

| Capacidad | MVP | Extensión futura |
|---|---|---|
| Pipeline gobernado completo | Sí | — |
| Adaptadores stub/in-memory | Sí | — |
| Adaptador de proceso `.harness` | Sí | Ejecutor remoto/aislado |
| Adaptador de política OPA CLI | Sí | Adaptador de servidor OPA persistente |
| Adaptador Tracker por HTTP | Sí | Batching, reintentos, perfiles de auth |
| Adaptador de evaluación del Core | Stub | `EvaluationOrchestrator` en proceso / Core REST |
| Motor | Stub determinístico | Cliente Hermes real; enrutado multimotor |
| Scheduler | In-memory | Adaptador cron/cola durable |
| Aprobación | Auto / deny-by-default | Flujo HITL en chat/Tracker |
