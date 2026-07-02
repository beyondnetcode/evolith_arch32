# Evolith Agent Runtime

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

The Evolith Agent Runtime is a decoupled **agentic layer** that operates Evolith
Core through **Puertos y Adaptadores** (`Ports & Adapters` / Hexagonal
Architecture). It orchestrates, converses, remembers, automates and **executes**
Core capabilities through ports — without becoming coupled to any specific agent
framework. Hermes Agent, Swarms (OpenAI), another framework, or an in-house engine are all just
replaceable adapters.

Implementation: [`packages/agent-runtime`](../../../packages/agent-runtime/README.md)
· Decision record: [core/ADR-0102](../adrs/core/0102-evolith-agent-runtime.md).

## What is the Evolith Agent Runtime

It is the layer that sits between a caller (Evolith Tracker, chat, CLI, an
external client) and the governed machinery of Evolith Core:

```text
Evolith Tracker / Chat / CLI / External Client
        -> Evolith Agent Runtime
        -> Ports
        -> Adapters
        -> .harness / Evolith Core / OPA / Tracker / Memory / Scheduler / Hermes
```

It does **not** replace `.harness` (the official, versioned, governed executor),
and it does **not** depend on Hermes or Swarms. It coordinates them behind ports,
even supporting multi-engine routing based on capabilities.

## Documents

| Document | Purpose |
|---|---|
| [Architecture](./architecture.md) | Layers, execution flow, diagrams, separation of duties |
| [Ports and Adapters](./ports-and-adapters.md) | The port catalog and the adapters that satisfy them |
| [.harness Integration](./harness-integration.md) | How the runtime discovers and executes `.harness` capabilities |
| [Practical Cases](./practical-cases.md) | End-to-end examples for every mandatory use case |
| [Extending](./extending.md) | How to add skills, adapters, use the CLI/chat, and plug Hermes |
| [Deploy to VPS (Coolify)](../../infrastructure/vps-coolify/agent-runtime-deploy.md) | Deploy the runtime HTTP service at `evolithruntime.beyondnet.cloud` |

## Quickstart

```ts
import { createAgentRuntime, parseAgentRuntimeRequest } from '@evolith/agent-runtime';

const { runtime } = createAgentRuntime(); // safe in-memory/stub adapters

const result = await runtime.handle(
  parseAgentRuntimeRequest({
    tenant: 'tenant_demo',
    product: 'evolith_tracker',
    initiative: 'init_001',
    phase: 'discovery',
    gate: 'prd_readiness',
    requested_by: 'tracker_chat',
    intent: 'validate_discovery_gate',
    tool: 'validate-discovery-gate',
    parameters: { requiredArtifacts: ['prd'], presentArtifacts: ['prd'] },
  }),
);
// result.status === 'passed' | 'blocked' | 'warning' | 'error'
```

A runnable script lives at
[`packages/agent-runtime/examples/validate-discovery-gate.mjs`](../../../packages/agent-runtime/examples/validate-discovery-gate.mjs).

## Client interaction pattern

Clients use a **command/event** pattern:

- `POST /v1/agent/handle` submits a command and waits for one final
  `AgentRuntimeResult`.
- `POST /v1/agent/stream` submits a command and keeps an event stream open for
  progress, tool results, policy violations, approval prompts, and final output.
- SSE is only a server-to-client event transport. It does not carry client
  commands back to the runtime; additional client actions are explicit HTTP or
  MCP requests correlated to the active task.
- Agents should call MCP tools or Agent Runtime commands directly. They should
  not connect to Tracker for governed context, tools, tenant state, or approval
  decisions.

## Key guarantees

- Every external integration goes through a **port**; concrete technology lives
  only in **adapters**.
- `.harness` is treated as an official **capability provider**, never replaced.
- Hermes is an **optional adapter** behind `IAgentEnginePort`; the domain never
  imports it.
- Agent decisions pass through contracts, validations, rulesets and OPA; the
  runtime cannot skip gates or rewrite rules.
- Tenant / product / initiative arrive as **context** per request — never
  embedded in `.harness`.

## Status: MVP vs future

The MVP ships the full pipeline with stub/in-memory adapters plus real
`.harness` (process), OPA (CLI) and HTTP Tracker adapters. Durable scheduling, a
production in-process Core adapter, and the real Hermes client are documented
extension points, not yet wired. See [Architecture](./architecture.md) for the
complete scope table.
