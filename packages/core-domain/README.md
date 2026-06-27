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

```ts
import { EvaluateGateUseCase } from '@evolith/core-domain/application/use-cases';
import { loadDefaultWorkflow } from '@evolith/core-domain/domain/services';

// Load the default SDLC workflow
const workflow = loadDefaultWorkflow();

// Evaluate a phase gate
const useCase = new EvaluateGateUseCase(rulesetRepo, fileSystem, logger);
const result = await useCase.execute({ projectId, phase, artifacts });
```

> **Runtime requirement:** set `WORKSPACE_ROOT` to the directory containing the `rulesets/` folder.
> In Docker: `ENV WORKSPACE_ROOT=/app/corpus`. Locally: the monorepo root is used automatically.

## Key exports

```ts
// Domain entities
import { Phase, Verdict, GateDecision } from '@evolith/core-domain';

// Use cases
import { EvaluateGateUseCase }      from '@evolith/core-domain/application/use-cases';
import { ValidateBlueprintUseCase } from '@evolith/core-domain/application/use-cases';
import { ValidateWorkflowUseCase }  from '@evolith/core-domain/application/use-cases';

// Validators
import { PhaseGateValidatorService }      from '@evolith/core-domain/application/validators';
import { ComposableValidationEngine }     from '@evolith/core-domain/application/validators/modes';

// Services
import { loadDefaultWorkflow }            from '@evolith/core-domain/domain/services';
import { SatelliteEvaluationPipeline }    from '@evolith/core-domain/application/services';

// Ports (interfaces for your adapters)
import type { IFileSystem, ILogger }      from '@evolith/core-domain/domain/interfaces';
import type { IRulesetRepository }        from '@evolith/core-domain';
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKSPACE_ROOT` | *(monorepo root)* | Base directory containing `rulesets/` |

## Architecture

```
@evolith/core-domain
├── domain/          # Entities, value objects, ports (no external deps)
│   ├── entities/    # Phase, Gate, Verdict, Satellite...
│   ├── ports/       # IFileSystem, ILogger, IRulesetRepository...
│   └── services/    # Workflow loading, domain services
├── application/     # Use cases, validators, pipelines
│   ├── use-cases/   # EvaluateGate, ValidateBlueprint, ValidateWorkflow
│   ├── validators/  # PhaseGateValidator, ComposableValidationEngine
│   └── services/    # SatelliteEvaluationPipeline, AuditService
└── infrastructure/  # In-memory adapters (for testing)
    ├── events/      # InMemoryEventBus
    └── audit/       # InMemoryAuditRepository
```

## Part of the Evolith suite

| Package | Role |
|---------|------|
| **`@evolith/core-domain`** | Domain logic and rule engine ← you are here |
| [`@evolith/infra-providers`](https://www.npmjs.com/package/@evolith/infra-providers) | Infrastructure adapters (filesystem, logger, config) |

## License

UNLICENSED — proprietary. Copyright © Beyondnet.
