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
- `evolith.main` ([main.rego](./main.rego)) agrega los conjuntos `violations` de las políticas individuales. `evolith.abac` ([abac-mcp-tool-access.rego](./abac-mcp-tool-access.rego)) se **publica de forma dual**: se importa y se une en `evolith/main/violations` (`main.rego` línea 10 importa `data.evolith.abac.violations` y la línea 62 lo une), *y además* se expone como el entrypoint dedicado `evolith/abac/violations` para decisiones de acceso a herramientas MCP en runtime.

## Políticas de enforcement agregadas

Estas políticas son importadas y unidas por [`main.rego`](./main.rego) en el entrypoint Wasm `evolith/main/violations`. Cada una tiene un `*.test.rego` co-ubicado y (salvo indicación) un schema de entrada en `schemas/`.

| Política | Paquete | Schema de entrada | Aplica |
|---|---|---|---|
| [abac-mcp-tool-access.rego](./abac-mcp-tool-access.rego) | `evolith.abac` | sí | ABAC para ejecución de herramientas MCP agénticas. **También se publica como el entrypoint separado `evolith/abac/violations`** (ver abajo). |
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

## Segundo entrypoint Wasm

`evolith.abac` ([abac-mcp-tool-access.rego](./abac-mcp-tool-access.rego)) se expone adicionalmente como su propio entrypoint `evolith/abac/violations` para que el gateway MCP pueda evaluar decisiones de acceso a herramientas de forma aislada en runtime. La **misma** política también se agrega en `evolith/main/violations` (aparece en la tabla anterior); no está excluida de `main`.

## Políticas standalone (no conectadas a `main.rego`)

Estas políticas están presentes en la carpeta pero **no** son importadas por `main.rego`, por lo que no contribuyen al entrypoint `evolith/main/violations`. Se evalúan directamente (p. ej. por el motor Native o un harness dedicado) y aún no están agregadas.

| Política | Paquete | Schema de entrada | Notas |
|---|---|---|---|
| [phase-gates.rego](./phase-gates.rego) | `evolith.phase_gates` | _ninguno_ | Evaluación de phase-gates SDLC; aún no conectada a `main.rego`. |
| [rbac/gate-role-enforcement.rego](./rbac/gate-role-enforcement.rego) | `evolith.rbac.gate` | _ninguno_ | Enforcement de rol de gate (RBAC). |
| [sdlc/coverage.rego](./sdlc/coverage.rego) | `evolith.sdlc.coverage` | _ninguno_ | Chequeos de cobertura SDLC. |
| [sdlc/pyramid-distribution.rego](./sdlc/pyramid-distribution.rego) | `evolith.sdlc.pyramid` | _ninguno_ | Distribución de pirámide de pruebas SDLC. |

> **Inventario:** 34 archivos `.rego` (excluyendo `*.test.rego` y `main_test.rego`); `main.rego` es el agregador. Hay 26 schemas de entrada en `schemas/`. Las políticas con schema **_ninguno_** validan su entrada en línea o aún no están fijadas a schema — ver el [backlog de paridad](../../reference/governance/standards/vision/gap-tracking.md).

## Ejecutar pruebas de políticas

Prerrequisitos: un binario OPA local. `npm run build:policy` descarga OPA `v0.65.0` en `.harness/bin/opa`; alternativamente instala OPA tú mismo y agrégalo al `PATH`. No se requieren variables de entorno para ejecutar las pruebas.

```bash
# 1. (Una vez) obtener el binario OPA fijado y construir el bundle Wasm
npm run build:policy

# 2. Ejecutar todas las suites *.test.rego co-ubicadas
.harness/bin/opa test rulesets/opa/ -v

# 3. Evaluar el entrypoint agregado contra una entrada de ejemplo
.harness/bin/opa eval -b rulesets/opa --input input.json 'data.evolith.main.violations'

# 4. Evaluar solo el entrypoint de acceso a herramientas ABAC
.harness/bin/opa eval -b rulesets/opa --input input.json 'data.evolith.abac.violations'
```

## Resolución de problemas

| Síntoma | Causa probable | Resolución |
|---|---|---|
| `opa: command not found` / falta `.harness/bin/opa` | Binario fijado no descargado | Ejecuta `npm run build:policy` (descarga OPA `v0.65.0`), o instala OPA y úsalo directamente. |
| El Smart CLI no toma `policy.wasm` | Bundle obsoleto o ausente | Re-ejecuta `npm run build:policy`; el build instala `policy.wasm` en `sdk/cli/rulesets/opa/policy.wasm`. |
| Una política nueva no se aplica vía `evolith/main/violations` | No importada/unida en `main.rego` | Agrega un `import data.evolith.<pkg>.violations` y una regla de unión en [`main.rego`](./main.rego); las políticas en *Políticas standalone* no se agregan intencionalmente. |
| OPA y Native devuelven veredictos distintos | Drift de Paridad de Doble Motor | Trátalo como bug de paridad — alinea el `.rego` a la semántica del `*.rules.json` Native (ver [backlog de paridad](../../reference/governance/standards/vision/gap-tracking.md)). |

Los estándares de autoría y el flujo de contribución de esta capa están en el [`CONTRIBUTING.md`](../../CONTRIBUTING.md) raíz del repositorio.

---
[Volver al Hub de Rulesets](../README.es.md)
