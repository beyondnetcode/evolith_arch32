# @evolith/core

Shared business-logic **facade** for the Evolith platform. It is a thin
re-export barrel over [`@evolith/core-domain`](../core-domain), giving the Smart
CLI, MCP Server and Core API a single, stable import surface.

## Installation

```bash
npm install @evolith/core
```

Requires **Node.js 20+**. The only runtime dependency is `@evolith/core-domain`,
which is the authoritative source for every re-exported symbol.

## Supported import surface

Import everything from the **root specifier only** — there are no subpath
exports:

```ts
import {
  EvaluateGateUseCase,
  ProposePhaseAdvanceUseCase,
  RulesetValidatorService,
  TopologyCatalogService,
  readGitLog,
} from '@evolith/core';
```

> Deep imports such as `@evolith/core/domain/interfaces` are **not** supported.
> The package builds to a single `dist/index.js`; use the root barrel and import
> the named symbol you need.

## What it re-exports

| Category | Symbols (selection) |
| --- | --- |
| Domain ports (types) | `IFileSystem`, `IConfigParser`, `ILogger`, `ICommandExecutor`, … |
| Domain errors | `EvolithError`, `PhaseTransitionError`, `ValidationError`, `isEvolithError`, … |
| Gate evidence | `createSuccessEnvelope`, `deriveVerdict`, `GATE_PHASES`, `GatePhase`, `GateEvidence`, … |
| Domain services | `WorkflowEngine`, `ToolSelectionService`, `PhaseService` |
| Use-cases | `EvaluateGateUseCase`, `ValidateSatelliteUseCase`, `ProposePhaseAdvanceUseCase`, `PhaseTransitionUseCase`, `InitializeProjectUseCase` |
| Validators | `RulesetValidatorService`, `PhaseGateValidatorService`, `ArchitectureDriftService`, `DeepArchitectureAnalyzer` |
| Architecture | `TopologyCatalogService`, `TopologyManifest` |
| Metrics | `readGitLog`, `isGitRepo` |

The authoritative source for each symbol lives in `@evolith/core-domain`; this
package only adjusts the import ergonomics and version surface.

## Runtime notes

- The single runtime dependency is `@evolith/core-domain`.
- Some re-exported services (e.g. `TopologyCatalogService`, the ruleset
  validators) read governance assets from a workspace root; consult the
  `@evolith/core-domain` README for the `WORKSPACE_ROOT` requirement.

## Development

Build and test locally with `npm run build` / `npm test`. Contributions follow the
repo-root [CONTRIBUTING.md](../../../CONTRIBUTING.md).

## License

MIT
