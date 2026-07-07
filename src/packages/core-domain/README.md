# @evolith/core-domain

> Domain and application logic for the Evolith governance framework.

[![npm version](https://img.shields.io/npm/v/@evolith/core-domain)](https://www.npmjs.com/package/@evolith/core-domain)
[![license](https://img.shields.io/npm/l/@evolith/core-domain)](./LICENSE)

## Overview

`@evolith/core-domain` is the heart of the Evolith architecture governance framework. It provides the **domain model, application use-cases, and rule evaluation engine** used by all Evolith surfaces (Core API, MCP Server, CLI).

Built on **Domain-Driven Design** principles with hexagonal architecture — all dependencies point inward; infrastructure is injected via ports.

## Prerequisites

- **Node.js 20+** and npm.
- `@nestjs/common` is required as a peer for the `@Injectable` use-cases when you
  wire them through NestJS DI (the package is otherwise framework-agnostic).
- Validators that read on-disk rulesets need a `rulesets/` folder reachable via
  `WORKSPACE_ROOT` (see Usage); gate/workflow construction degrades gracefully
  without one.

## Installation

```bash
npm install @evolith/core-domain
```

### Local monorepo build and test

```bash
npm run build              # tsc -> dist/
npm test                   # jest.config.js (unit)
npm run test:e2e           # jest.e2e.config.js
npm run lint:boundaries    # eslint-plugin-boundaries hexagonal-layer enforcement
```

## What's inside

| Layer | What it provides |
|-------|-----------------|
| **Domain** | Phase, Gate, Verdict, Satellite Manifest, Workflow Definition, RBAC, Audit entities; SDLC phase-id normalizer; DORA metrics / git-log reader |
| **Application** | Use-cases (`EvaluateGateUseCase`, `ValidateBlueprintUseCase`, `ValidateWorkflowUseCase`, `ValidateSatelliteUseCase`, `PhaseTransitionUseCase`, `InitializeProjectUseCase`, `ProposePhaseAdvanceUseCase`); Architecture Drift detection; Satellite evaluation pipeline; services (`TopologyCatalogService`, `GateRegistry`, `AuditService`, `CatalogService`, `SdlcDataLoader`, `ProjectScaffolder`, `EvolithConfig`); `agents/`, `generators/`, `sync/`, `architecture/`, `upgrade/` subtrees |
| **Ports** | `IFileSystem`, `ILogger`, `IConfigParser`, `IRulesetRepository`, `IEventBus` — inject your own adapters |
| **Gates** | Phase-gate validator, composable validation engine, OPA/Native dual-engine parity, RBAC gate enforcement (`accountableRole` / `waiverAuthority`) |

## Usage

`EvaluateGateUseCase` is a NestJS-injectable use-case. It takes a validator
factory (plus optional webhook notifier and event bus), and `execute()` receives
`{ phase, projectPath, corePath? }`, returning an ADR-0073 `GateEvidence` payload.

```ts
import { EvaluateGateUseCase } from '@evolith/core-domain/application/use-cases';
import { PhaseService } from '@evolith/core-domain/domain/services';

// The bundled maturity workflow is exposed as a ready-to-use service (no-arg ctor).
// Note: this is the 6-step phase-0..phase-5 maturity workflow
// (Foundation, Structure, Governance, Architecture, Production, Observability),
// NOT the SDLC gate phases (discovery..release) consumed by EvaluateGateUseCase.
const phases = new PhaseService();
phases.getAllPhases();

// Evaluate a phase gate (validatorFactory builds a PhaseGateValidatorService per corePath).
// `phase` is an SDLC phase id: discovery | design | construction | qa | release.
const useCase = new EvaluateGateUseCase(validatorFactory);
const evidence = await useCase.execute({ phase: 'discovery', projectPath, corePath });
```

### Two phase namespaces

The package carries two distinct, intentionally separate phase vocabularies:

| Namespace | Values | Used by |
|-----------|--------|---------|
| **SDLC gate phases** | `discovery`, `design`, `construction`, `qa`, `release` (`GATE_PHASES`) | `EvaluateGateUseCase`, gate evidence, `PHASE_TO_GATE_NUMBER` (1..5) |
| **Maturity workflow** | `phase-0`..`phase-5` (Foundation..Observability) | `PhaseService` / `WorkflowEngine`, `getAllPhases()` |

The legacy `f1..f5`, `gate-f1..f5`, `phase-1..5` and bare `1..5` forms are **deprecated aliases**
of the SDLC ids, accepted only at boundaries (on-disk governance files, older configs) and
normalized by `normalizePhaseId()` (`domain/sdlc/phase-id`). New code, schemas and docs must use
the canonical SDLC ids. The `F#` namespace is **reserved for architecture topology maturity** and
must not be reused for SDLC phases.

> **Runtime requirement:** set `WORKSPACE_ROOT` to the directory containing the `rulesets/` folder.
> In Docker: `ENV WORKSPACE_ROOT=/app/corpus`. The default-workflow loader resolves in this order:
> explicit `WORKSPACE_ROOT` → the monorepo `rulesets/` relative to the package (`__dirname`) →
> an **embedded default workflow** baked into the package. Because the published npm package ships
> ruleset-free, construction never throws `ENOENT`: with no resolvable rulesets the loader falls
> back to the embedded `phase-0..phase-5` workflow. Validators that read on-disk rulesets, however,
> still require a workspace to evaluate against.

## Key exports

```ts
// Domain entities (re-exported by the root barrel)
import { Phase, Project, Tool, TransitionResult } from '@evolith/core-domain';
import { Verdict } from '@evolith/core-domain';            // domain/verdict, re-exported at root

// Use cases (also re-exported at the root barrel; the stable subpath is recommended)
import { EvaluateGateUseCase }      from '@evolith/core-domain/application/use-cases';
import { ValidateBlueprintUseCase } from '@evolith/core-domain/application/use-cases';
import { ValidateWorkflowUseCase }  from '@evolith/core-domain/application/use-cases';
import { ValidateSatelliteUseCase } from '@evolith/core-domain/application/use-cases';

// Validators (incl. composable engine + per-mode validators)
import { PhaseGateValidatorService } from '@evolith/core-domain/application/validators';
import { RulesetValidatorService }   from '@evolith/core-domain/application/validators';
import { ArchitectureDriftService }  from '@evolith/core-domain/application/validators';
import { ComposableValidationEngine } from '@evolith/core-domain/application/validators/modes';

// Application services
import { TopologyCatalogService }       from '@evolith/core-domain/application/services';
import { SatelliteEvaluationPipeline }  from '@evolith/core-domain/application/services';

// Domain services
import { WorkflowEngine, ToolSelectionService, PhaseService }
  from '@evolith/core-domain/domain/services';

// Ports (interfaces for your adapters)
import type { IFileSystem, ILogger } from '@evolith/core-domain/domain/interfaces';
import type { IRulesetRepository }   from '@evolith/core-domain/domain/ports/ruleset-repository.port';
```

> **Import-surface notes:** the authoritative contract is the `exports` map in
> `package.json`. The root specifier (`.`) resolves to the built `dist/index.js`,
> which re-exports **both** the `domain/` layer (entities, verdict, gate-evidence,
> errors, events, rbac, metrics, lifecycle, domain services) **and** the
> `application/` layer (use-cases, services, validators, ports, plus the
> `agents` / `architecture` / `generators` / `sync` / `upgrade` subtrees). The
> curated subpaths (`./application/use-cases`, `./application/services`,
> `./application/validators`, `./application/validators/modes`,
> `./domain/interfaces`, `./domain/errors`, `./domain/services`,
> `./infrastructure/adapters/*`, and the `./*` wildcard) are the **recommended,
> stable** entry points and are kept regardless of barrel reshuffles. Root imports
> depend on the shipped build, so prefer the subpaths in long-lived code.
> `loadDefaultWorkflow` is internal to the default-workflow module — use
> `PhaseService` (no-arg) for the bundled maturity workflow.

## Gate evaluation internals

`EvaluateGateUseCase.execute(input)` runs this flow:

1. **Phase → gate number.** The SDLC phase is mapped via `PHASE_TO_GATE_NUMBER`
   (`discovery`→1, `design`→2, `construction`→3, `qa`→4, `release`→5) and the
   `PhaseGateValidatorService` validates that gate against the
   `rulesets/sdlc/phase-gates.rules.json` ruleset.
2. **RBAC enforcement (GT-320).** When `actorRoles` is supplied, the gate's
   `accountableRole` / `waiverAuthority` are enforced by `gateRoleEnforcer`:
   `assertCanApprove()` for a normal evaluation, `assertCanWaive()` when
   `requestWaiver: true`. A missing required role throws `GateAuthorizationError`;
   gates with no declared role stay open.
3. **Verdict.** `deriveVerdict(violations)` returns `failed` when any violation has
   severity `error`, otherwise `passed` (warnings alone do not block).
4. **Side effects.** If an `EVENT_BUS` adapter is injected, a
   `gateApproved` / `gateRejected` domain event is published; if a
   `WEBHOOK_NOTIFIER` is injected and `webhookUrl` is provided, an HMAC-signed
   webhook is dispatched. Audit trails can be persisted through the JSONL audit
   repository (`infrastructure/audit`).

`execute()` accepts `{ phase, projectPath, corePath?, evaluatedBy?, webhookUrl?, actorRoles?, requestWaiver? }`
and returns an ADR-0073 `GateEvidence` payload.

## Output contract (ADR-0073)

The package's primary output format is the ADR-0073 envelope. `createSuccessEnvelope`
and `createErrorEnvelope` produce a flat `meta` shape; errors use the canonical
`ErrorCode` vocabulary (RFC 9457 problem-details on the REST surface):

```ts
interface OutputMeta {
  command: string;        // canonical command identity, e.g. 'evolith gate evaluate'
  executedAt: string;     // ISO 8601
  durationMs: number;
  correlationId: string;
  schemaVersion: string;  // OUTPUT_ENVELOPE_SCHEMA_VERSION === '1.0.0'
  context?: ExecutionContext;
}
type OutputEnvelope<T> =
  | { success: true;  data: T;            meta: OutputMeta }
  | { success: false; error: OutputError; meta: OutputMeta };
```

## Topology manifest contract

`TopologyCatalogService` loads `TopologyManifest` documents
(`apiVersion: 'evolith.dev/topology/v1'`, `kind: 'TopologyManifest'`) whose
`spec.compatibility.progressiveAxis.maturityLevel` places each of the 8 canonical
topologies (modular-monolith, distributed-modules, microservices, event-driven,
serverless, edge-computing, data-mesh, agentic-ai) on the progressive maturity
axis. The manifest type and `ProgressivePhase` alias are exported for consumers.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKSPACE_ROOT` | *(monorepo root, then embedded fallback)* | Base directory containing `rulesets/`. When unresolved, the embedded default workflow is used (see Usage). |

## Architecture

```
@evolith/core-domain
├── domain/            # Entities, value objects, ports (no external deps)
│   ├── entities/      # Phase, Project, Tool, TransitionResult, Blueprint...
│   ├── ports/         # IRulesetRepository, IWorkflowDefinition...
│   ├── interfaces.ts  # IFileSystem, ILogger, IConfigParser, IPhaseGates...
│   ├── rbac/          # Role, gate-role-enforcer
│   ├── metrics/       # DORA calculator, git-log-reader
│   └── services/      # WorkflowEngine, ToolSelectionService, PhaseService
├── application/       # Use cases, validators, pipelines
│   ├── use-cases/     # EvaluateGate, ValidateBlueprint/Workflow/Satellite, PhaseTransition, InitializeProject, ProposePhaseAdvance
│   ├── validators/    # PhaseGateValidator, RulesetValidator, ArchitectureDrift, modes/ComposableValidationEngine
│   ├── services/      # TopologyCatalog, SatelliteEvaluationPipeline, Audit, Catalog, GateRegistry
│   └── upgrade/       # Satellite upgrade (diff/apply/fs)
└── infrastructure/    # Reference adapters
    ├── events/        # InMemoryEventBus, outbox
    ├── audit/         # InMemory + JSONL audit repositories
    └── webhook/       # Webhook dispatcher, HMAC signer, in-memory repos
```

> Built on Ajv (JSON-Schema validation), `yaml`, and `@open-policy-agent/opa-wasm`
> for the OPA/Native dual-engine gate parity.

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| Gate/workflow construction unexpectedly uses the `phase-0..phase-5` labels | No `rulesets/sdlc/default-workflow.yaml` was resolvable, so the embedded default workflow was used. Set `WORKSPACE_ROOT` to a directory containing `rulesets/` to load your own. |
| `GateAuthorizationError` on `execute()` | `actorRoles` did not include the gate's `accountableRole` (or `waiverAuthority` when `requestWaiver: true`). Pass the required role or omit `actorRoles` for an open gate. |
| A phase string like `f3` or `gate-f3` is rejected | Normalize boundary input with `normalizePhaseId()`; new code should use the canonical SDLC ids (`discovery..release`). |
| Root import resolves stale symbols | Root imports follow the shipped `dist/`. Rebuild (`npm run build`) or use the stable subpaths from the `exports` map. |

## Development

Contributions follow the repo-root [CONTRIBUTING.md](../../../CONTRIBUTING.md)
(conventional commits, `develop` → `main`, boundary lint, tests).

## Part of the Evolith suite

| Package | Role |
|---------|------|
| **`@evolith/core-domain`** | Domain logic and rule engine ← you are here |
| [`@evolith/infra-providers`](https://www.npmjs.com/package/@evolith/infra-providers) | Concrete adapters that implement the ports (filesystem, logger, config, disk ruleset, webhook) |
| [`@evolith/core`](../core) | Thin facade barrel re-exporting a curated slice of this package from a single root specifier |
| [`@evolith/sdk`](../sdk-client) | Typed HTTP/MCP client for consumers talking to a hosted Evolith Core |

Consumed by: **`apps/core-api`** (core-domain + infra-providers), **`packages/mcp-server`** (core + core-domain + infra-providers), and **smart-cli** (via `@evolith/core`).

## License

MIT — Copyright © 2026 BeyondNet Code. See [LICENSE](./LICENSE) for details.
