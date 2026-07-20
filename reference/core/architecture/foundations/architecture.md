# Evolith Agent Runtime — Architecture

> **Bilingual Navigation:** [Versión en Español](./architecture.es.md)

This document describes the layers, the execution flow, the separation of duties,
and the diagrams for the Evolith Agent Runtime. See also
[Ports and Adapters](./ports-and-adapters.md) and
[.harness Integration](./harness-integration.md).

## 1. What it is

The Agent Runtime is a thin, governed orchestration layer. Given an
`AgentRuntimeRequest` it resolves the tenant/product/initiative context, selects
a governed capability, invokes the right ports, runs validations, returns an
`AgentRuntimeResult`, and emits trazability. It is implemented in
[`src/packages/agent-runtime`](../../../../src/packages/agent-runtime/README.md) following
**Puertos y Adaptadores** so no runtime/LLM technology becomes a domain
dependency. 

> **Important:** The runtime capabilities and their implementation maturity (like the `InteractionAdapterPort`) are strictly governed by the [Adapter Capability Maturity Matrix](../../control-center/maturity-reports/maturity-assessment.md#5-adapter-capability-maturity-agent-runtime).

## 2. Why a new layer that does not replace .harness

`.harness` is the official, versioned, auditable mechanism that **runs** scripts,
playbooks, validators, audits and skills. The Agent Runtime is a different
concern: it **decides what to run, governs it, and records it**. Keeping them
separate means:

- `.harness` stays the single governed executor; the runtime calls it through a
  port (`IHarnessPort`) and never reimplements it.
- The runtime can converse, remember, schedule and recommend — concerns that do
  not belong inside a deterministic executor.
- Either side evolves independently: a sandboxed/remote `.harness` runner is an
  adapter swap; a new reasoning engine is another adapter swap.

## 3. Architecture overview

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

The runtime depends only on the **Ports** row. Everything below the dashed line
is replaceable without touching the runtime.

## 4. Ports and Adapters map

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

Full catalog: [Ports and Adapters](./ports-and-adapters.md).

## 5. Execution flow

The base flow folds `.harness` execution and Core evaluation into one governed
result, then validates with OPA and records trazability.

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

The data contract pipeline, named explicitly:

```text
AgentRuntimeRequest
  -> HarnessExecutionRequest -> HarnessExecutionResult
  -> EvaluationContext (CoreEvaluationRequest) -> EvaluationResult
  -> PolicyValidationResult
  -> AgentRuntimeResult
  -> TrackerTraceEvent
```

Gate validation as a sequence:

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

Execution via the optional Hermes engine (it only **proposes**; the runtime
still governs):

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

## 6. Separation of duties

Every result carries a `trace` block that names **who did what**, so audits never
have to trust the runtime's own summary:

| Field | Value | Meaning |
|---|---|---|
| `executedBy` | `agent_runtime` | The runtime orchestrated the call |
| `validatedBy` | `.harness` | The capability that produced the facts |
| `governedBy` | `evolith_core` | The Core evaluated against contracts/rulesets |
| `policyEngine` | `opa` | OPA enforced policy on the result |

The runtime never claims to have governed; the Core and OPA do. This is the
mechanism that keeps the agentic layer honest.

## 7. Tenant, product and initiative as context

Tenant/product/initiative are **received per request** as opaque identifiers in
`RuntimeContext`, echoed into traces, and forwarded to the Core as temporary
evaluation context only (per the stateless Core contract). They are never
embedded in `.harness` and never persisted by the runtime. Evolith Tracker
remains the system of record; the runtime only routes, governs and traces on
those ids.

## 8. MVP scope vs future extensions

| Capability | MVP | Future extension |
|---|---|---|
| Full governed pipeline | Yes | — |
| Stub/in-memory adapters | Yes | — |
| `.harness` process adapter | Yes | Sandboxed/remote runner |
| OPA CLI policy adapter | Yes | Long-lived OPA server adapter |
| HTTP Tracker adapter | Yes | Batching, retries, auth profiles |
| Core evaluation adapter | Stub | In-process `EvaluationOrchestrator` / Core REST |
| Engine | Deterministic stub | Real Hermes client; multi-engine routing |
| Scheduler | In-memory | Durable cron/queue adapter |
| Approval | Auto / deny-by-default | Chat/Tracker HITL workflow |
