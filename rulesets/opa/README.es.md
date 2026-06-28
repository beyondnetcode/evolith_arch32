# Políticas OPA y Schemas de Entrada

Esta carpeta contiene las políticas Open Policy Agent (OPA) `.rego` usadas para la validación de arquitectura y gobernanza en la plataforma Evolith. Cada política de enforcement publica un conjunto `violations` bajo el namespace `evolith.*`, y la mayoría está respaldada por un JSON Schema versionado de su entrada en [`schemas/`](./schemas/).

## Fuente de verdad (Markdown vs OPA vs reglas Native)

- **Los estándares humanos, ADRs y la constitución de ingeniería bajo `reference/`** son autoritativos para la *intención y la justificación* — el *porqué*.
- **Los rulesets "Native" `*.rules.json`** (en `rulesets/<categoría>/`) son la codificación canónica legible por máquina de cada regla — el *qué*.
- **Las políticas OPA `.rego`** son un **motor de paridad**: reexpresan la misma semántica para poder aplicarse dentro de un sidecar OPA/Wasm o un gate de CI. **OPA no debe divergir de la semántica Native** — donde ambos motores aplican, deben coincidir (Paridad de Doble Motor).

En resumen: Markdown explica, los `*.rules.json` Native definen, y OPA + el evaluador Native ambos aplican. Si OPA y Native discrepan, es un bug de paridad, no licencia para divergir.

## Compilación y carga

- Script: [`.harness/scripts/compile-opa-wasm.mjs`](../../.harness/scripts/compile-opa-wasm.mjs), invocado vía `npm run build:policy`.
- Descarga OPA `v0.65.0` y luego ejecuta `opa build -t wasm` sobre `rulesets/opa/` con `--ignore=schemas`.
- **Entrypoints Wasm:** `evolith/main/violations` y `evolith/abac/violations`.
- El `policy.wasm` extraído se instala en `sdk/cli/rulesets/opa/policy.wasm` para el evaluador del Smart CLI.
- `evolith.main` ([main.rego](./main.rego)) agrega los conjuntos `violations` de las políticas individuales; `evolith.abac` ([abac-mcp-tool-access.rego](./abac-mcp-tool-access.rego)) se compila como entrypoint separado para decisiones de acceso a herramientas MCP en runtime.

## Políticas de enforcement agregadas

Estas políticas son importadas y unidas por [`main.rego`](./main.rego) en el entrypoint Wasm `evolith/main/violations`. Cada una tiene un `*.test.rego` co-ubicado y (salvo indicación) un schema de entrada en `schemas/`.

| Política | Paquete | Schema de entrada | Aplica |
|---|---|---|---|
| [version-pinning.rego](./version-pinning.rego) | `evolith.version_pinning` | sí | Pinning estricto de dependencias. |
| [taxonomy.rego](./taxonomy.rego) | `evolith.taxonomy` | sí | Taxonomía de directorios, nombres de ADR, pares bilingües. |
| [cli-readiness.rego](./cli-readiness.rego) | `evolith.cli_readiness` | sí | Preparación de compilación/doc/lock del Smart CLI. |
| [evidence.rego](./evidence.rego) | `evolith.evidence` | sí | Schema, retención y propiedad de la evidencia de gates. |
| [mcp.rego](./mcp.rego) | `evolith.mcp` | sí | Cumplimiento del protocolo MCP y evidencia de smoke. |
| [ci-cd.rego](./ci-cd.rego) | `evolith.ci_cd` | sí | Escaneo de dependencias, scripts de workflow, actualizaciones. |
| [governance.rego](./governance.rego) | `evolith.governance` | sí | Límites de herencia de satélites y decisiones obligatorias. |
| [anti-corruption-layer.rego](./anti-corruption-layer.rego) | `evolith.acl` | sí | Capa Anticorrupción / protección de límites de dominio. |
| [cicd-quality-gates.rego](./cicd-quality-gates.rego) | `evolith.cicd_quality_gates` | sí | Controles de quality-gate de CI/CD. |
| [cli-core-parity.rego](./cli-core-parity.rego) | `evolith.cli_core_parity` | sí | Cada regla de Core trazada a CLI/MCP/tests/evidencia. |
| [cli-release-readiness.rego](./cli-release-readiness.rego) | `evolith.cli_release_readiness` | sí | Evidencia build/test/package/MCP-smoke de release del CLI. |
| [compliance-baseline.rego](./compliance-baseline.rego) | `evolith.compliance_baseline` | sí | Controles de baseline de cumplimiento ejecutable. |
| [dod.rego](./dod.rego) | `evolith.dod` | sí | Checklist de cierre de historia (Definition of Done). |
| [engineering-manifesto.rego](./engineering-manifesto.rego) | `evolith.engineering_manifesto` | sí | Restricciones SOLID/DRY/KISS/YAGNI y antipatrones. |
| [executive-scorecards.rego](./executive-scorecards.rego) | `evolith.executive_scorecards` | sí | Evidencia de scorecards DORA + SPACE. |
| [gitflow-branching.rego](./gitflow-branching.rego) | `evolith.gitflow_branching` | sí | Política de ramificación GitFlow. |
| [hexagonal-architecture.rego](./hexagonal-architecture.rego) | `evolith.hexagonal_architecture` | sí | Límites hexagonales puertos/adaptadores (ADR-0002). |
| [knowledge-intake.rego](./knowledge-intake.rego) | `evolith.knowledge_intake` | sí | Ciclo de ingesta de conocimiento, estado de revisión, match de topología. |
| [multi-runtime.rego](./multi-runtime.rego) | `evolith.multi_runtime` | sí | Soporte multi-runtime (ADR-0040). |
| [multi-tenancy.rego](./multi-tenancy.rego) | `evolith.multi_tenancy` | sí | Aislamiento multi-tenant (ADR-0010). |
| [open-core-boundary.rego](./open-core-boundary.rego) | `evolith.open_core_boundary` | sí | Separación Core vs Enterprise. |
| [protocol-selection.rego](./protocol-selection.rego) | `evolith.protocol_selection` | sí | Reglas de selección de protocolo (ADR-0032). |
| [repository-taxonomy.rego](./repository-taxonomy.rego) | `evolith.repository_taxonomy` | sí | Enforcement de taxonomía de repositorio. |
| [satellite-contracts.rego](./satellite-contracts.rego) | `evolith.satellite_contracts` | sí | Requisitos de contrato de satélite. |
| [testing-pyramid.rego](./testing-pyramid.rego) | `evolith.testing_pyramid` | sí | Distribución de pirámide de pruebas (ADR-0018). |
| [telemetry-evidence.rego](./telemetry-evidence.rego) | `evolith.telemetry_evidence` | _ninguno_ | Presencia de evidencia de observabilidad/telemetría. |
| [infrastructure/helm-enforcement.rego](./infrastructure/helm-enforcement.rego) | `evolith.infrastructure.helm` | _ninguno_ | Enforcement de chart Helm. |
| [infrastructure/opa-sidecar-bundle.rego](./infrastructure/opa-sidecar-bundle.rego) | `evolith.infrastructure.opa_sidecar` | _ninguno_ | Requisitos de bundle de sidecar OPA. |

## Políticas standalone / compiladas por separado

| Política | Paquete | Schema de entrada | Notas |
|---|---|---|---|
| [abac-mcp-tool-access.rego](./abac-mcp-tool-access.rego) | `evolith.abac` | sí | ABAC para ejecución de herramientas MCP agénticas; segundo entrypoint Wasm (`evolith/abac/violations`). |
| [phase-gates.rego](./phase-gates.rego) | `evolith.phase_gates` | _ninguno_ | Evaluación de phase-gates SDLC; aún no conectada a `main.rego`. |
| [rbac/gate-role-enforcement.rego](./rbac/gate-role-enforcement.rego) | `evolith.rbac.gate` | _ninguno_ | Enforcement de rol de gate (RBAC). |
| [sdlc/coverage.rego](./sdlc/coverage.rego) | `evolith.sdlc.coverage` | _ninguno_ | Chequeos de cobertura SDLC. |
| [sdlc/pyramid-distribution.rego](./sdlc/pyramid-distribution.rego) | `evolith.sdlc.pyramid` | _ninguno_ | Distribución de pirámide de pruebas SDLC. |

> **Inventario:** 34 archivos `.rego` (excluyendo `*.test.rego` y `main_test.rego`); `main.rego` es el agregador. Hay 26 schemas de entrada en `schemas/`. Las políticas con schema **_ninguno_** validan su entrada en línea o aún no están fijadas a schema — ver el [backlog de paridad](../../reference/governance/standards/vision/gap-tracking.md).

## Ejecutar pruebas de políticas

```bash
.harness/bin/opa test rulesets/opa/ -v
```

---
[Volver al Hub de Rulesets](../README.es.md)
