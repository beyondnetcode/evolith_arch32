# @evolith/core-domain

> Lógica de dominio y de aplicación para el framework de gobernanza Evolith.

[![npm version](https://img.shields.io/npm/v/@evolith/core-domain)](https://www.npmjs.com/package/@evolith/core-domain)
[![license](https://img.shields.io/npm/l/@evolith/core-domain)](./LICENSE)

## Resumen

`@evolith/core-domain` es el corazón del framework de gobernanza de arquitectura Evolith. Provee el **modelo de dominio, los casos de uso de aplicación y el motor de evaluación de reglas** usados por todas las superficies de Evolith (Core API, MCP Server, CLI).

Construido sobre los principios de **Domain-Driven Design** con arquitectura hexagonal — todas las dependencias apuntan hacia el dominio; la infraestructura se inyecta vía ports.

## Requisitos previos

- **Node.js 20+** y npm.
- `@nestjs/common` es un peer requerido para los use-cases `@Injectable` cuando los
  cableas mediante la DI de NestJS (por lo demás el paquete es agnóstico al framework).
- Los validadores que leen rulesets en disco necesitan una carpeta `rulesets/`
  accesible vía `WORKSPACE_ROOT` (ver Uso); la construcción de gate/workflow
  degrada de forma controlada cuando no existe.

## Instalación

```bash
npm install @evolith/core-domain
```

### Build y tests en el monorepo local

```bash
npm run build              # tsc -> dist/
npm test                   # jest.config.js (unitarios)
npm run test:e2e           # jest.e2e.config.js
npm run lint:boundaries    # enforcement de capas hexagonales (eslint-plugin-boundaries)
```

## Qué contiene

| Capa | Qué provee |
|------|-----------------|
| **Domain** | Entidades Phase, Gate, Verdict, Satellite Manifest, Workflow Definition, RBAC, Audit; normalizador de phase-id SDLC; métricas DORA / lector de git-log |
| **Application** | Use-cases (`EvaluateGateUseCase`, `ValidateBlueprintUseCase`, `ValidateWorkflowUseCase`, `ValidateSatelliteUseCase`, `PhaseTransitionUseCase`, `InitializeProjectUseCase`, `ProposePhaseAdvanceUseCase`); detección de Architecture Drift; pipeline de evaluación de satélites; servicios (`TopologyCatalogService`, `GateRegistry`, `AuditService`, `CatalogService`, `SdlcDataLoader`, `ProjectScaffolder`, `EvolithConfig`); subárboles `agents/`, `generators/`, `sync/`, `architecture/`, `upgrade/` |
| **Ports** | `IFileSystem`, `ILogger`, `IConfigParser`, `IRulesetRepository`, `IEventBus` — inyecta tus propios adaptadores |
| **Gates** | Validador de phase-gates, motor de validación componible, paridad de doble motor OPA/Native, enforcement RBAC de gates (`accountableRole` / `waiverAuthority`) |

## Uso

`EvaluateGateUseCase` es un caso de uso inyectable de NestJS. Recibe una factory de
validadores (más un notificador de webhooks y un bus de eventos opcionales), y
`execute()` recibe `{ phase, projectPath, corePath? }`, devolviendo un payload
`GateEvidence` según ADR-0073.

```ts
import { EvaluateGateUseCase } from '@evolith/core-domain/application/use-cases';
import { PhaseService } from '@evolith/core-domain/domain/services';

// El workflow de madurez incorporado se expone como un servicio listo para usar (ctor sin args).
// Nota: es el workflow de madurez de 6 pasos phase-0..phase-5
// (Foundation, Structure, Governance, Architecture, Production, Observability),
// NO las phase gates SDLC (discovery..release) que consume EvaluateGateUseCase.
const phases = new PhaseService();
phases.getAllPhases();

// Evalúa un phase gate (validatorFactory construye un PhaseGateValidatorService por corePath).
// `phase` es un id de fase SDLC: discovery | design | construction | qa | release.
const useCase = new EvaluateGateUseCase(validatorFactory);
const evidence = await useCase.execute({ phase: 'discovery', projectPath, corePath });
```

### Dos espacios de nombres de fases

El paquete maneja dos vocabularios de fases distintos e intencionalmente separados:

| Espacio de nombres | Valores | Usado por |
|--------------------|---------|-----------|
| **Phase gates SDLC** | `discovery`, `design`, `construction`, `qa`, `release` (`GATE_PHASES`) | `EvaluateGateUseCase`, gate evidence, `PHASE_TO_GATE_NUMBER` (1..5) |
| **Workflow de madurez** | `phase-0`..`phase-5` (Foundation..Observability) | `PhaseService` / `WorkflowEngine`, `getAllPhases()` |

Las formas heredadas `f1..f5`, `gate-f1..f5`, `phase-1..5` y `1..5` a secas son **alias
deprecados** de los ids SDLC, aceptados solo en los límites (archivos de gobernanza en disco,
configs antiguas) y normalizados por `normalizePhaseId()` (`domain/sdlc/phase-id`). El código,
los schemas y la documentación nuevos deben usar los ids SDLC canónicos. El espacio de nombres
`F#` está **reservado para la madurez de topologías de arquitectura** y no debe reutilizarse para
fases SDLC.

> **Requisito de runtime:** define `WORKSPACE_ROOT` con el directorio que contiene la carpeta `rulesets/`.
> En Docker: `ENV WORKSPACE_ROOT=/app/corpus`. El loader del workflow por defecto resuelve en este orden:
> `WORKSPACE_ROOT` explícito → el `rulesets/` del monorepo relativo al paquete (`__dirname`) → un
> **workflow por defecto embebido** dentro del paquete. Como el paquete npm publicado se distribuye
> sin rulesets, la construcción nunca lanza `ENOENT`: sin rulesets resolubles, el loader cae al
> workflow embebido `phase-0..phase-5`. Los validadores que leen rulesets en disco, sin embargo,
> siguen requiriendo un workspace contra el cual evaluar.

## Exports clave

```ts
// Entidades de dominio (re-exportadas por el barrel raíz)
import { Phase, Project, Tool, TransitionResult } from '@evolith/core-domain';
import { Verdict } from '@evolith/core-domain';            // domain/verdict, re-exportado en la raíz

// Casos de uso (también re-exportados en el barrel raíz; se recomienda el subpath estable)
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

> **Notas sobre la superficie de imports:** el contrato autoritativo es el mapa
> `exports` de `package.json`. El especificador raíz (`.`) resuelve al `dist/index.js`
> compilado, que re-exporta **tanto** la capa `domain/` (entidades, verdict,
> gate-evidence, errors, events, rbac, metrics, lifecycle, servicios de dominio)
> **como** la capa `application/` (use-cases, services, validators, ports, más los
> subárboles `agents` / `architecture` / `generators` / `sync` / `upgrade`). Los
> subpaths curados (`./application/use-cases`, `./application/services`,
> `./application/validators`, `./application/validators/modes`,
> `./domain/interfaces`, `./domain/errors`, `./domain/services`,
> `./infrastructure/adapters/*` y el comodín `./*`) son los puntos de entrada
> **recomendados y estables**, y se mantienen independientemente de reordenamientos
> del barrel. Los imports desde la raíz dependen del build publicado, así que en
> código de larga vida prefiere los subpaths. `loadDefaultWorkflow` es interno al
> módulo del workflow por defecto — usa `PhaseService` (sin args) para el workflow
> de madurez incorporado.

## Interioridades de la evaluación de gates

`EvaluateGateUseCase.execute(input)` ejecuta este flujo:

1. **Fase → número de gate.** La fase SDLC se mapea con `PHASE_TO_GATE_NUMBER`
   (`discovery`→1, `design`→2, `construction`→3, `qa`→4, `release`→5) y el
   `PhaseGateValidatorService` valida ese gate contra el ruleset
   `rulesets/sdlc/phase-gates.rules.json`.
2. **Enforcement RBAC (GT-320).** Cuando se pasa `actorRoles`, los campos
   `accountableRole` / `waiverAuthority` del gate se hacen cumplir con
   `gateRoleEnforcer`: `assertCanApprove()` para una evaluación normal,
   `assertCanWaive()` cuando `requestWaiver: true`. Si falta el rol requerido se
   lanza `GateAuthorizationError`; los gates sin rol declarado quedan abiertos.
3. **Verdict.** `deriveVerdict(violations)` devuelve `failed` cuando alguna
   violación tiene severidad `error`, de lo contrario `passed` (los warnings por sí
   solos no bloquean).
4. **Efectos secundarios.** Si se inyecta un adaptador `EVENT_BUS`, se publica un
   evento de dominio `gateApproved` / `gateRejected`; si se inyecta un
   `WEBHOOK_NOTIFIER` y se provee `webhookUrl`, se despacha un webhook firmado con
   HMAC. Las trazas de auditoría pueden persistirse con el repositorio de auditoría
   JSONL (`infrastructure/audit`).

`execute()` recibe `{ phase, projectPath, corePath?, evaluatedBy?, webhookUrl?, actorRoles?, requestWaiver? }`
y devuelve un payload `GateEvidence` según ADR-0073.

## Contrato de salida (ADR-0073)

El formato de salida primario del paquete es el envelope ADR-0073.
`createSuccessEnvelope` y `createErrorEnvelope` producen un `meta` plano; los errores
usan el vocabulario canónico `ErrorCode` (problem-details RFC 9457 en la superficie REST):

```ts
interface OutputMeta {
  command: string;        // identidad canónica del comando, p. ej. 'evolith gate evaluate'
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

## Contrato del manifiesto de topología

`TopologyCatalogService` carga documentos `TopologyManifest`
(`apiVersion: 'evolith.dev/topology/v1'`, `kind: 'TopologyManifest'`) cuyo
`spec.compatibility.progressiveAxis.maturityLevel` ubica cada una de las 8 topologías
canónicas (modular-monolith, distributed-modules, microservices, event-driven,
serverless, edge-computing, data-mesh, agentic-ai) en el eje de madurez progresiva.
El tipo del manifiesto y el alias `ProgressivePhase` se exportan para los consumidores.

## Variables de entorno

| Variable | Por defecto | Descripción |
|----------|---------|-------------|
| `WORKSPACE_ROOT` | *(raíz del monorepo, luego fallback embebido)* | Directorio base que contiene `rulesets/`. Si no se resuelve, se usa el workflow por defecto embebido (ver Uso). |

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

## Solución de problemas

| Síntoma | Causa / solución |
|---------|------------------|
| Gate/workflow se construye inesperadamente con las etiquetas `phase-0..phase-5` | No se resolvió ningún `rulesets/sdlc/default-workflow.yaml`, así que se usó el workflow por defecto embebido. Define `WORKSPACE_ROOT` apuntando a un directorio con `rulesets/` para cargar el tuyo. |
| `GateAuthorizationError` en `execute()` | `actorRoles` no incluía el `accountableRole` del gate (o `waiverAuthority` cuando `requestWaiver: true`). Pasa el rol requerido u omite `actorRoles` para un gate abierto. |
| Una fase como `f3` o `gate-f3` es rechazada | Normaliza la entrada de borde con `normalizePhaseId()`; el código nuevo debe usar los ids SDLC canónicos (`discovery..release`). |
| Un import desde la raíz resuelve símbolos obsoletos | Los imports desde la raíz siguen el `dist/` publicado. Recompila (`npm run build`) o usa los subpaths estables del mapa `exports`. |

## Desarrollo

Las contribuciones siguen el [CONTRIBUTING.md](../../CONTRIBUTING.md) de la raíz del repo
(conventional commits, `develop` → `main`, lint de límites, tests).

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
