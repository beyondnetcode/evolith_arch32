# @evolith/core

**Fachada** de lógica de negocio compartida para la plataforma Evolith. Es un barrel
fino de re-exportación sobre [`@evolith/core-domain`](../core-domain), que da al Smart
CLI, al MCP Server y al Core API una única superficie de imports estable.

## Instalación

```bash
npm install @evolith/core
```

Requiere **Node.js 20+**. La única dependencia de runtime es `@evolith/core-domain`,
que es la fuente autoritativa de cada símbolo re-exportado.

## Superficie de imports soportada

Importa todo desde el **especificador raíz únicamente** — no hay subpath exports:

```ts
import {
  EvaluateGateUseCase,
  ProposePhaseAdvanceUseCase,
  RulesetValidatorService,
  TopologyCatalogService,
  readGitLog,
} from '@evolith/core';
```

> Los deep imports como `@evolith/core/domain/interfaces` **no** están soportados.
> El paquete compila a un único `dist/index.js`; usa el barrel raíz e importa el
> símbolo nombrado que necesites.

## Qué re-exporta

| Categoría | Símbolos (selección) |
| --- | --- |
| Ports de dominio (tipos) | `IFileSystem`, `IConfigParser`, `ILogger`, `ICommandExecutor`, … |
| Errores de dominio | `EvolithError`, `PhaseTransitionError`, `ValidationError`, `isEvolithError`, … |
| Gate evidence | `createSuccessEnvelope`, `deriveVerdict`, `GATE_PHASES`, `GatePhase`, `GateEvidence`, … |
| Servicios de dominio | `WorkflowEngine`, `ToolSelectionService`, `PhaseService` |
| Casos de uso | `EvaluateGateUseCase`, `ValidateSatelliteUseCase`, `ProposePhaseAdvanceUseCase`, `PhaseTransitionUseCase`, `InitializeProjectUseCase` |
| Validadores | `RulesetValidatorService`, `PhaseGateValidatorService`, `ArchitectureDriftService`, `DeepArchitectureAnalyzer` |
| Arquitectura | `TopologyCatalogService`, `TopologyManifest` |
| Métricas | `readGitLog`, `isGitRepo` |

La fuente autoritativa de cada símbolo vive en `@evolith/core-domain`; este paquete
solo ajusta la ergonomía de imports y la superficie de versión.

## Notas de runtime

- La única dependencia de runtime es `@evolith/core-domain`.
- Algunos servicios re-exportados (p. ej. `TopologyCatalogService`, los validadores
  de ruleset) leen activos de gobernanza desde una raíz de workspace; consulta el
  README de `@evolith/core-domain` para el requisito de `WORKSPACE_ROOT`.

## Desarrollo

Compila y prueba en local con `npm run build` / `npm test`. Las contribuciones siguen
el [CONTRIBUTING.md](../../CONTRIBUTING.md) de la raíz del repo.

## Licencia

MIT
