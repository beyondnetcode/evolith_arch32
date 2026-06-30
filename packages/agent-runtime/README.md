# @evolith/agent-runtime

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

Evolith Agent Runtime — a decoupled agentic layer that operates Evolith Core
through Ports & Adapters (Hexagonal Architecture). It orchestrates, remembers,
validates and executes Core capabilities through ports. It does **not** replace
`.harness` (the official governed executor) and does **not** depend on Hermes or
any LLM framework (those are optional, replaceable adapters).

Architecture docs: [`reference/architecture/agent-runtime`](../../reference/architecture/agent-runtime/README.md)
· Decision: [core/ADR-0102](../../reference/architecture/adrs/core/0102-evolith-agent-runtime.md).

## Install

This package is part of the Evolith monorepo workspaces. Build it with the rest
of the graph (`npm run build` at the root) or standalone:

```bash
npm --workspace @evolith/agent-runtime run build
npm --workspace @evolith/agent-runtime test
```

## Quickstart

```ts
import { createAgentRuntime, parseAgentRuntimeRequest } from '@evolith/agent-runtime';

const { runtime, deps } = createAgentRuntime(); // safe stub/in-memory adapters
const result = await runtime.handle(parseAgentRuntimeRequest({
  intent: 'validate_discovery_gate', tool: 'validate-discovery-gate',
  tenant: 'acme', initiative: 'init_001', phase: 'discovery', gate: 'prd_readiness',
  parameters: { requiredArtifacts: ['prd'], presentArtifacts: ['prd'] },
}));
```

A runnable example: `examples/validate-discovery-gate.mjs`.

## Architecture

The package is hexagonal: `domain` (contracts, ports, tokens), `application`
(the orchestration service + pure mappers), `adapters` (concrete tech), and a
`bootstrap` factory. No framework or LLM is a domain dependency.

## Ports

`IAgentRuntime`, `IHarnessPort`, `ICoreEvaluationPort`, `IPolicyValidationPort`,
`ITrackerTracePort`, `IMemoryPort`, `ISkillRegistryPort`, `ISchedulerPort`,
`ICommunicationGatewayPort`, `IApprovalPort`, `IAgentEnginePort`.

## Adapters

Defaults are in-memory/stub. Real adapters: `HarnessProcessAdapter` (reads
`.harness/manifest.yaml`), `OpaCliPolicyValidationAdapter`,
`HttpTrackerTraceAdapter`, and `HermesAgentAdapter` (optional engine).

## Scripts

```bash
npm run build                  # tsc -> dist/
npm test                       # jest
npm run example:discovery-gate # run the end-to-end example (after build)
```
