# @evolith/core-domain

> Domain and application logic for the Evolith governance framework.

[![npm version](https://img.shields.io/npm/v/@evolith/core-domain)](https://www.npmjs.com/package/@evolith/core-domain)
[![license](https://img.shields.io/npm/l/@evolith/core-domain)](./LICENSE)

## Overview

`@evolith/core-domain` is the heart of the Evolith architecture governance framework. It provides the **domain model, application use-cases, and rule evaluation engine** used by all Evolith surfaces (Core API, MCP Server, CLI).

Built on **Domain-Driven Design** principles with hexagonal architecture — all dependencies point inward; infrastructure is injected via ports.

## Installation

```bash
npm install @evolith/core-domain
```

## What's inside

| Layer | What it provides |
|-------|-----------------|
| **Domain** | Phase, Gate, Verdict, Satellite Manifest, Workflow Definition, RBAC, Audit entities |
| **Application** | `EvaluateGateUseCase`, `ValidateBlueprintUseCase`, `ValidateWorkflowUseCase`, Architecture Drift detection, Satellite evaluation pipeline |
| **Ports** | `IFileSystem`, `ILogger`, `IConfigParser`, `IRulesetRepository`, `IEventBus` — inject your own adapters |
| **Gates** | Phase-gate validator, composable validation engine, OPA/Native dual-engine parity |

## Usage

`EvaluateGateUseCase` is a NestJS-injectable use-case. It takes a validator
factory (plus optional webhook notifier and event bus), and `execute()` receives
`{ phase, projectPath, corePath? }`, returning an ADR-0073 `GateEvidence` payload.

```ts
import { EvaluateGateUseCase } from '@evolith/core-domain/application/use-cases';
import { PhaseService } from '@evolith/core-domain/domain/services';

// The default SDLC workflow is exposed as a ready-to-use service (no-arg ctor):
const phases = new PhaseService();
phases.getAllPhases();

// Evaluate a phase gate (validatorFactory builds a PhaseGateValidatorService per corePath)
const useCase = new EvaluateGateUseCase(validatorFactory);
const evidence = await useCase.execute({ phase: 'discovery', projectPath, corePath });
```

> **Runtime requirement:** set `WORKSPACE_ROOT` to the directory containing the `rulesets/` folder.
> In Docker: `ENV WORKSPACE_ROOT=/app/corpus`. Locally: the monorepo root is used automatically.

## Key exports

```ts
// Domain entities (reachable from the root barrel)
import { Phase, Project, Tool, TransitionResult } from '@evolith/core-domain';
import { Verdict } from '@evolith/core-domain';            // domain/verdict, re-exported at root

// Use cases (subpath only — the root barrel does NOT re-export the application layer)
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

> **Import-surface notes:** the root barrel re-exports only the `domain/` layer
> (entities, verdict, gate-evidence, errors, events, rbac, metrics, lifecycle,
> domain services). The `application/` layer and the `domain/ports` / `gates`
> sub-trees are reachable through explicit subpaths (see `exports` in
> `package.json`), not from the package root. `loadDefaultWorkflow` is internal
> to the default-workflow module — use `PhaseService` (no-arg) for the bundled
> SDLC workflow.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKSPACE_ROOT` | *(monorepo root)* | Base directory containing `rulesets/` |

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
