# @evolith/agent-runtime

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

Evolith Agent Runtime — a decoupled agentic layer that operates Evolith Core
through Ports & Adapters (Hexagonal Architecture). It orchestrates, remembers,
validates and executes Core capabilities through ports. It does **not** replace
`.harness` (the official governed executor) and does **not** depend on Hermes or
any LLM framework (those are optional, replaceable adapters).

Architecture docs: [`reference/core/architecture/foundations`](../../reference/core/architecture/foundations/README.md)
· Decision: [core/ADR-0102](../../reference/core/architecture/adrs/core/0102-evolith-agent-runtime.md).

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
`HttpTrackerTraceAdapter`, `InProcessCoreEvaluationAdapter` /
`HttpCoreEvaluationAdapter` (run the real stateless Core, in-process or over the
Core API), `FileSchedulerAdapter` / `FileMemoryAdapter` (durable, file-backed),
and `HermesAgentAdapter` (optional engine).

## Versioning & contract stability

This package follows **SemVer**. The public surface is the three subpath exports
declared in `package.json` — `.` (main), `./ports`, and `./adapters`. The
`public-surface.spec.ts` guard freezes the runtime value surface of `.` and
`./adapters`, so adding, removing or renaming a public export is a deliberate,
reviewed change.

- **`./ports`** is a type-only surface (port interfaces + canonical contract
  types). It is frozen at the type level — the consumer's `tsc` is the guard.
- **`schemaVersion`** on `EvaluationResult` (and any other versioned contract)
  is independent of the package version: it is bumped **only** on an
  incompatible change to that contract's shape, never for additive fields.
- **Deprecation:** a public export is marked `@deprecated` (naming its
  replacement) for at least one minor before removal; a removal or rename ships
  in a **major**, additive exports ship in a **minor**.



## Scripts

```bash
npm run build                  # tsc -> dist/
npm test                       # jest
npm run example:discovery-gate # run the end-to-end example (after build)
```
