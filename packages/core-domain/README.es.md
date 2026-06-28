# @evolith/core-domain

> Lógica de dominio y de aplicación para el framework de gobernanza Evolith.

[![npm version](https://img.shields.io/npm/v/@evolith/core-domain)](https://www.npmjs.com/package/@evolith/core-domain)
[![license](https://img.shields.io/npm/l/@evolith/core-domain)](./LICENSE)

## Resumen

`@evolith/core-domain` es el corazón del framework de gobernanza de arquitectura Evolith. Provee el **modelo de dominio, los casos de uso de aplicación y el motor de evaluación de reglas** usados por todas las superficies de Evolith (Core API, MCP Server, CLI).

Construido sobre los principios de **Domain-Driven Design** con arquitectura hexagonal — todas las dependencias apuntan hacia el dominio; la infraestructura se inyecta vía ports.

## Instalación

```bash
npm install @evolith/core-domain
```

## Qué contiene

| Capa | Qué provee |
|------|-----------------|
| **Domain** | Entidades Phase, Gate, Verdict, Satellite Manifest, Workflow Definition, RBAC, Audit |
| **Application** | `EvaluateGateUseCase`, `ValidateBlueprintUseCase`, `ValidateWorkflowUseCase`, detección de Architecture Drift, pipeline de evaluación de satélites |
| **Ports** | `IFileSystem`, `ILogger`, `IConfigParser`, `IRulesetRepository`, `IEventBus` — inyecta tus propios adaptadores |
| **Gates** | Validador de phase-gates, motor de validación componible, paridad de doble motor OPA/Native |

## Uso

`EvaluateGateUseCase` es un caso de uso inyectable de NestJS. Recibe una factory de
validadores (más un notificador de webhooks y un bus de eventos opcionales), y
`execute()` recibe `{ phase, projectPath, corePath? }`, devolviendo un payload
`GateEvidence` según ADR-0073.

```ts
import { EvaluateGateUseCase } from '@evolith/core-domain/application/use-cases';
import { PhaseService } from '@evolith/core-domain/domain/services';

// El workflow SDLC por defecto se expone como un servicio listo para usar (ctor sin args):
const phases = new PhaseService();
phases.getAllPhases();

// Evalúa un phase gate (validatorFactory construye un PhaseGateValidatorService por corePath)
const useCase = new EvaluateGateUseCase(validatorFactory);
const evidence = await useCase.execute({ phase: 'discovery', projectPath, corePath });
```

> **Requisito de runtime:** define `WORKSPACE_ROOT` con el directorio que contiene la carpeta `rulesets/`.
> En Docker: `ENV WORKSPACE_ROOT=/app/corpus`. En local: se usa la raíz del monorepo automáticamente.

## Exports clave

```ts
// Entidades de dominio (accesibles desde el barrel raíz)
import { Phase, Project, Tool, TransitionResult } from '@evolith/core-domain';
import { Verdict } from '@evolith/core-domain';            // domain/verdict, re-exportado en la raíz

// Casos de uso (solo por subpath — el barrel raíz NO re-exporta la capa de aplicación)
import { EvaluateGateUseCase }      from '@evolith/core-domain/application/use-cases';
import { ValidateBlueprintUseCase } from '@evolith/core-domain/application/use-cases';
import { ValidateWorkflowUseCase }  from '@evolith/core-domain/application/use-cases';
import { ValidateSatelliteUseCase } from '@evolith/core-domain/application/use-cases';

// Validadores (incl. motor componible + validadores por modo)
import { PhaseGateValidatorService } from '@evolith/core-domain/application/validators';
import { RulesetValidatorService }   from '@evolith/core-domain/application/validators';
import { ArchitectureDriftService }  from '@evolith/core-domain/application/validators';
import { ComposableValidationEngine } from '@evolith/core-domain/application/validators/modes';

// Servicios de aplicación
import { TopologyCatalogService }       from '@evolith/core-domain/application/services';
import { SatelliteEvaluationPipeline }  from '@evolith/core-domain/application/services';

// Servicios de dominio
import { WorkflowEngine, ToolSelectionService, PhaseService }
  from '@evolith/core-domain/domain/services';

// Ports (interfaces para tus adaptadores)
import type { IFileSystem, ILogger } from '@evolith/core-domain/domain/interfaces';
import type { IRulesetRepository }   from '@evolith/core-domain/domain/ports/ruleset-repository.port';
```

> **Notas sobre la superficie de imports:** el barrel raíz re-exporta únicamente la
> capa `domain/` (entidades, verdict, gate-evidence, errors, events, rbac, metrics,
> lifecycle, servicios de dominio). La capa `application/` y los subárboles
> `domain/ports` / `gates` se acceden mediante subpaths explícitos (ver `exports`
> en `package.json`), no desde la raíz del paquete. `loadDefaultWorkflow` es
> interno al módulo del workflow por defecto — usa `PhaseService` (sin args) para
> el workflow SDLC incorporado.

## Variables de entorno

| Variable | Por defecto | Descripción |
|----------|---------|-------------|
| `WORKSPACE_ROOT` | *(raíz del monorepo)* | Directorio base que contiene `rulesets/` |

## Arquitectura

```
@evolith/core-domain
├── domain/            # Entidades, value objects, ports (sin deps externas)
│   ├── entities/      # Phase, Project, Tool, TransitionResult, Blueprint...
│   ├── ports/         # IRulesetRepository, IWorkflowDefinition...
│   ├── interfaces.ts  # IFileSystem, ILogger, IConfigParser, IPhaseGates...
│   ├── rbac/          # Role, gate-role-enforcer
│   ├── metrics/       # Calculadora DORA, git-log-reader
│   └── services/      # WorkflowEngine, ToolSelectionService, PhaseService
├── application/       # Casos de uso, validadores, pipelines
│   ├── use-cases/     # EvaluateGate, ValidateBlueprint/Workflow/Satellite, PhaseTransition, InitializeProject, ProposePhaseAdvance
│   ├── validators/    # PhaseGateValidator, RulesetValidator, ArchitectureDrift, modes/ComposableValidationEngine
│   ├── services/      # TopologyCatalog, SatelliteEvaluationPipeline, Audit, Catalog, GateRegistry
│   └── upgrade/       # Upgrade de satélites (diff/apply/fs)
└── infrastructure/    # Adaptadores de referencia
    ├── events/        # InMemoryEventBus, outbox
    ├── audit/         # Repositorios de auditoría InMemory + JSONL
    └── webhook/       # Dispatcher de webhooks, firmante HMAC, repos in-memory
```

> Construido sobre Ajv (validación JSON-Schema), `yaml` y `@open-policy-agent/opa-wasm`
> para la paridad de doble motor OPA/Native de los gates.

## Parte de la suite Evolith

| Package | Rol |
|---------|------|
| **`@evolith/core-domain`** | Lógica de dominio y motor de reglas ← estás aquí |
| [`@evolith/infra-providers`](https://www.npmjs.com/package/@evolith/infra-providers) | Adaptadores concretos que implementan los ports (filesystem, logger, config, disk ruleset, webhook) |
| [`@evolith/core`](../core) | Barrel fachada fino que re-exporta una porción curada de este paquete desde un único especificador raíz |
| [`@evolith/sdk`](../sdk-client) | Cliente tipado HTTP/MCP para consumidores que hablan con un Evolith Core alojado |

Consumido por: **`apps/core-api`** (core-domain + infra-providers), **`packages/mcp-server`** (core + core-domain + infra-providers) y **smart-cli** (vía `@evolith/core`).

## Licencia

MIT — Copyright © 2026 BeyondNet Code. Ver [LICENSE](./LICENSE) para más detalles.
