> **Bilingual Navigation:** [Ver versión en Español](./0102-evolith-agent-runtime.es.md)

# ADR-0102: Evolith Agent Runtime as a Decoupled Agentic Layer

> **Agent Signature:** Architect Agent (Winston)

## Status
Accepted (2026-06-29 — Architecture Board)

## Date
2026-06-29

## Context and Problem

Evolith Core is a stateless, deterministic Evaluation Engine governed by
contracts, rulesets, OPA and `.harness` ([ADR-0101](./0101-core-stateless-evaluation-engine.md)).
There is growing demand to *operate* the Core agentically — to converse, plan,
remember, schedule and execute governed capabilities on behalf of a caller
(typically Evolith Tracker). The risk is that an agentic layer, especially one
built directly on a specific agent framework (e.g. Hermes Agent), would couple
the deterministic Core to a volatile runtime technology, or would grow into a
parallel executor that bypasses `.harness` and its governance.

The problem: how do we add an agentic operating layer that can use Hermes today,
a different framework tomorrow, or an in-house engine later — **without** making
any of them a dependency of the Core, and **without** displacing `.harness` as
the official governed executor.

## Objective and Scope

Define and implement a first version of the **Evolith Agent Runtime**: a
decoupled agentic layer that operates the Core through ports, integrating with
`.harness`, the Core evaluation contract, OPA/rulesets and (optionally) Tracker.
In scope: the runtime contract, the port catalog, default and real adapters, the
`.harness` capability manifest, and trazability. Out of scope: persisting
tenant/product/initiative state (Tracker owns that), and shipping a production
Hermes client (it remains an optional adapter).

## Options Considered

### Option A: Embed agent logic into .harness

Extend `.harness` itself with conversation/memory/planning. Rejected: it
overloads a deterministic executor with stateful agentic concerns, couples
governance to agent behaviour, and makes `.harness` harder to audit.

### Option B: Depend on Hermes directly in the runtime

Build the runtime on the Hermes SDK. Rejected: it makes a specific framework a
hard dependency, contaminates the dependency graph, and blocks swapping engines
or running with no engine installed.

### Option C: Ports & Adapters agentic layer (chosen)

A new hexagonal package (`@evolith/agent-runtime`) that depends only on ports.
`.harness`, the Core, OPA, Tracker and any engine are adapters. Chosen because it
satisfies every design rule and keeps the Core and `.harness` untouched.

## Decision and Rationale

### 1. The runtime is a ports-only orchestrator

`AgentRuntimeService` depends exclusively on interfaces (`IHarnessPort`,
`ICoreEvaluationPort`, `IPolicyValidationPort`, `ITrackerTracePort`,
`IMemoryPort`, `ISkillRegistryPort`, `ISchedulerPort`,
`ICommunicationGatewayPort`, `IApprovalPort`, `IAgentEnginePort`). All concrete
technology lives in adapters.

### 2. .harness is a capability provider, not replaced

`.harness` remains the official, versioned, governed executor. The runtime
discovers its capabilities from `.harness/manifest.yaml` and executes them via
`IHarnessPort`. It never reimplements `.harness`.

### 3. Hermes is an optional engine adapter

Hermes (or any LLM/framework) sits behind `IAgentEnginePort` in
`HermesAgentAdapter`, imported lazily so the package builds and runs with Hermes
not installed. The Core and the runtime domain never import Hermes.

### 4. Governance is uniform and unskippable

Every capability declares its posture (permissions, approval, trace, policy). The
runtime enforces approval (HITL), OPA policy and trazability uniformly. The
runtime may propose, execute authorized tools and recommend, but it cannot skip
gates or rewrite rules.

### 5. Event-Driven Execution (SSE)

The runtime supports Event-Driven Streaming via Server-Sent Events (SSE). Instead of blocking on a synchronous execution, the runtime orchestrator returns an `AsyncGenerator` yielding real-time intermediate events (e.g., tool selection, human-in-the-loop approvals, harness execution chunks). The API (`agent-runtime-api`) adapts this generator into an RxJS Observable to push real-time states to callers.

## Evidence and Evaluation Criteria

The implementation ([`packages/agent-runtime`](../../../../packages/agent-runtime/README.md))
satisfies the acceptance criteria, verified by build + tests:

- The Core is not coupled to Hermes (grep-confirmed: no Hermes import outside the
  adapter; domain/application use only type imports of the canonical contract).
- Ports back every external integration; `.harness` is the capability provider.
- The runtime runs end-to-end with stub adapters (16 passing tests + a runnable
  example), and swaps to real `.harness`/OPA/HTTP adapters without code changes.
- Trazability is emitted on every governed run with explicit provenance
  (`executedBy`/`validatedBy`/`governedBy`/`policyEngine`).

## Consequences, Risks, and Trade-offs

Positive: technology independence, testability, and a clean separation between
deciding (runtime), executing (`.harness`), governing (Core) and policy (OPA).
Negative/trade-offs: an extra indirection layer; the default Core adapter is a
stub (production in-process/REST adapter is a documented next step); durable
scheduling and a real Hermes client are future extensions. Risk: skill/manifest
drift — mitigated by keeping the manifest versioned and the skill catalog
explicit.

## References

- [Agent Runtime architecture docs](../../agent-runtime/README.md)
- [`.harness/manifest.yaml`](../../../../.harness/manifest.yaml)
- [`packages/agent-runtime`](../../../../packages/agent-runtime/README.md)

## Related Decisions and Standards

- [ADR-0101](./0101-core-stateless-evaluation-engine.md) — stateless Core
  Evaluation Engine (the contract the runtime consumes).
- [ADR-0100](./0100-governance-execution-boundary-product-initiative.md) —
  governance vs execution boundary.
- Design rules 1–8 of the Agent Runtime brief (technology independence, no Hermes
  in the Core, adapters for all integrations, `.harness` as capability provider).
