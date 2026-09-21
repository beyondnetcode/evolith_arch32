# Políticas OPA y Schemas de Entrada

Esta carpeta contiene las políticas Open Policy Agent (OPA) `.rego` usadas para la validación de arquitectura y gobernanza en la plataforma Evolith. Cada política de enforcement publica un conjunto `violations` bajo el namespace `evolith.*`, y la mayoría está respaldada por un JSON Schema versionado de su entrada en [`schemas/`](./schemas/).

## Fuente de verdad (Markdown vs OPA vs reglas Native)

- **Los estándares humanos, ADRs y la constitución de ingeniería bajo `reference/`** son autoritativos para la *intención y la justificación* — el *porqué*.
- **Los rulesets "Native" `*.rules.json`** (en `rulesets/<categoría>/`) son la codificación canónica legible por máquina de cada regla — el *qué*.
- **Las políticas OPA `.rego`** son un **motor de paridad**: reexpresan la misma semántica para poder aplicarse dentro de un sidecar OPA/Wasm o un gate de CI. **OPA no debe divergir de la semántica Native** — donde ambos motores aplican, deben coincidir (Paridad de Doble Motor).

En resumen: Markdown explica, los `*.rules.json` Native definen, y OPA + el evaluador Native ambos aplican. Si OPA y Native discrepan, es un bug de paridad, no licencia para divergir.

## Compilación y carga

- Script: [`.harness/scripts/compile-opa-wasm.mjs`](../../../.harness/scripts/compile-opa-wasm.mjs), invocado vía `npm run build:policy`.
- Descarga OPA `v1.19.0` y luego ejecuta `opa build -t wasm` sobre `rulesets/opa/` con `--ignore=schemas`.
- **Entrypoints Wasm (4):** `evolith/main/violations`, `evolith/abac/violations`, `evolith/manifest/declared_rule_ids` y `evolith/manifest/rule_input_paths`. Los dos últimos se generan en tiempo de build desde el AST de las políticas: el script escribe un `manifest.rego` en un directorio de staging con cada rule id que las políticas alcanzables pueden decidir (GT-675 — para que el evaluador distinga "evaluado, limpio" de "nada aquí decide esto") y, por id de regla, las rutas `input.…` que lee su política (GT-716 — para que `OpaEvaluator` reporte una regla cuyo hecho la ejecución no suministró como `skipped` / `supplied-facet-absent` en vez de como veredicto; ver *Cuando falta un hecho* más abajo). No es un fichero de este directorio y no debe commitearse.
- El `policy.wasm` extraído se instala en `sdk/cli/rulesets/opa/policy.wasm` para el evaluador del Evolith CLI.
- `evolith.main` ([main.rego](./main.rego)) agrega los conjuntos `violations` de las políticas individuales. `evolith.abac` ([abac-mcp-tool-access.rego](./abac-mcp-tool-access.rego)) se **publica de forma dual**: se importa y se une en `evolith/main/violations` (`main.rego` importa `data.evolith.abac.violations` y lo une), *y además* se expone como el entrypoint dedicado `evolith/abac/violations` para decisiones de acceso a herramientas MCP en runtime.

## Cuando falta un hecho (GT-716)

Un cuerpo Rego cuyo hecho falta queda *indefinido*: `not input.adapter.schemaValidated` dispara, `input.satellite.git.branchNameInvalid` nunca coincide. Ninguno de los dos es un veredicto sobre el repositorio, así que `OpaEvaluator` no reporta uno:

- En tiempo de build el bundle registra, por id de regla, las rutas `input.…` que lee su política (`evolith/manifest/rule_input_paths`, extraídas del AST del compilador por [`.harness/scripts/lib/rego-rule-inputs.mjs`](../../../.harness/scripts/lib/rego-rule-inputs.mjs) — lecturas directas, cabeceras, reglas auxiliares seguidas transitivamente).
- En tiempo de evaluación, una regla declarada cuyo input no lleva **nada** de una faceta que lee vuelve `skipped` con evaluabilidad `supplied-facet-absent` y la faceta nombrada. La faceta es el primer segmento bajo `input`, o el segundo bajo `satellite` / `core`: `input.satellite.git` es una faceta que un llamador envía entera, `input.satellite.git.branchNameInvalid` es un campo de ella.
- Presencia es «la clave existe», no «el valor es verdadero»: una faceta que el constructor de input **observó** decide lo que sea que observó (`null`, `false`, `[]` son respuestas), y una faceta que un llamador suministró como `false` fue suministrada.
- `ABSENCE_IS_A_FACT` (en `opa-evaluator.ts`) exime las facetas cuya ausencia es en sí un hecho por diseño de las políticas que las leen — `qualityEvidence`, `evaluationDate` (ADR-0111: no presentar nada es el veredicto), `evidence`, `waiver` (compuertas de fase). Qué hechos lee una regla, y dónde vive su verdad, se declara en la propia regla (`facts`, AC2 de GT-716 — ver *Una declaración por regla* más abajo); este conjunto es el único juicio que queda en código.
- Un bundle compilado antes de que existiera este entrypoint conserva el comportamiento anterior y lo dice en `WARN`; `27-opa-parity-gate` hace fallar un bundle que deje de exponerlo.

Para que una regla se decida, suministra la faceta por el contexto de evaluación (`facts.satellite.<faceta>`, GT-694). Medido sobre un satélite recién salido de `init` el día que esto aterrizó: `--engine opa` pasó de 133 reglas «decididas» a 10, y las 123 que dejó de decidir eran todas veredictos sobre input que nadie había suministrado.

## Una declaración por regla (AC2 de GT-716)

Cada regla de `src/rulesets/**/*.rules.json` declara `facts`: las facetas que lee su comprobación, por id desde [`schema/facets.json`](../schema/facets.json), donde cada faceta lleva su **procedencia** — dónde vive su verdad:

| procedencia | significado | clase nativa cuando ningún handler decide la regla |
|---|---|---|
| `observed` | legible desde el árbol del repositorio; el Core la deriva (un handler nativo, o el constructor de input) | `unimplemented-native` |
| `supplied` | una postura que solo los dueños del satélite pueden declarar — tenencia, intención de runtime, la frontera open-core, un registro de intake; llega a OPA por `facts.satellite` | `needs-supplied-facts` |
| `external` | en manos de la forja, el tracker, un registro, una base de datos viva, infraestructura desplegada, un backend de telemetría | `needs-external-system` |
| `runtime` | observable solo desde el sistema en ejecución o una suite ejecutada | `needs-runtime` |

Ambos motores derivan de esa única declaración, y la derivación se comprueba en las dos direcciones:

- **Nativo:** `classifyRule` lee los facts de la regla y toma la clase de la procedencia más exigente (`runtime` > `external` > `supplied` > `observed`); `facts: []` significa que no hay hecho comprobable por máquina (`documentation-only` tras un juicio o un placeholder del generador, `underspecified` tras nada). La tabla de triaje que guardaba esto por id de regla ya no existe.
- **OPA:** `npm run build:policy` rechaza un bundle cuando una política lee una faceta que su regla no declaró, o cuando una entrada del vocabulario no la declara ninguna regla ni la lee ninguna política. El día que aterrizó, declarar `facts: []` para las doce reglas que la tabla llamaba no ejecutables mientras Rego las decidía (`KI-R01..07`, `INH-03..05`, `PROT-03/06`) puso el build en rojo con doce hallazgos; declarar lo que leen las políticas es lo que lo devolvió a verde — y las movió al denominador ejecutable.

Añadir una regla significa, por tanto, declarar qué lee; añadir una lectura en una política exige que los `facts` de la regla la nombren. Lo que se movió cuando la declaración sustituyó a la tabla (2026-09-20): el «backlog de handlers» (`unimplemented-native`) pasó de 52 a 21 — 25 de esas filas las decidían políticas sobre una postura declarada, el sistema de CI o una ejecución de tests, nunca un handler sobre el árbol.

Lo que un motor decide y el otro no es entonces una **diferencia registrada, no libre** (AC3 de GT-716): [`73-validate-engine-coverage-parity.mjs`](../../../.harness/scripts/ci/73-validate-engine-coverage-parity.mjs) corre ambos motores sobre este repositorio y sobre un satélite recién salido de `evolith init`, y sujeta cada regla de un solo motor a [`engine-coverage-parity.baseline.json`](../../../.harness/scripts/ci/engine-coverage-parity.baseline.json) — por regla, por escenario, por dirección, con la razón que dio el otro motor (la clase que enuncia su informe, las facetas que la política lee y una ejecución a secas no suministra). Una regla sin registrar, una entrada obsoleta o una clase cambiada hacen fallar; `--write` regenera el fichero para revisión. Nada en él es una tolerancia: es la lista de lo que cada motor aún no puede decidir, y por qué.

## Políticas de enforcement agregadas

Estas 35 políticas son importadas y unidas por [`main.rego`](./main.rego) en el entrypoint Wasm `evolith/main/violations`. Cada una tiene un `*.test.rego` co-ubicado y (salvo indicación) un schema de entrada en `schemas/`. La lista autoritativa es el bloque `import data.evolith.*` de `main.rego`; el build rechaza una política que emite rule ids sin estar importada allí.

| Política | Paquete | Schema de entrada | Aplica |
|---|---|---|---|
| [abac-mcp-tool-access.rego](./abac-mcp-tool-access.rego) | `evolith.abac` | sí | ABAC para ejecución de herramientas MCP agénticas. **También se publica como el entrypoint separado `evolith/abac/violations`** (ver abajo). |
| [version-pinning.rego](./version-pinning.rego) | `evolith.version_pinning` | sí | Pinning estricto de dependencias. |
| [taxonomy.rego](./taxonomy.rego) | `evolith.taxonomy` | sí | Taxonomía de directorios, nombres de ADR, pares bilingües. |
| [cli-readiness.rego](./cli-readiness.rego) | `evolith.cli_readiness` | sí | Preparación de compilación/doc/lock del Evolith CLI. |
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
| [phase-gates.rego](./phase-gates.rego) | `evolith.phase_gates` | sí | Evaluación de phase-gates SDLC: evidencia obligatoria, criterios bloqueantes, waivers. |
| [sdlc/coverage.rego](./sdlc/coverage.rego) | `evolith.sdlc.coverage` | _ninguno_ | Umbrales de calidad del gate F3 (QT-01..08). |
| [capability-source-interface.rego](./capability-source-interface.rego) | `evolith.capability_source_interface` | _ninguno_ | Espejo del guard `GovernancePosture.allowedSourceInterfaces` del Agent Runtime. |
| [cli-exit-code-taxonomy.rego](./cli-exit-code-taxonomy.rego) | `evolith.cli_exit_code_taxonomy` | _ninguno_ | La taxonomía de exit codes de la CLI como política (GT-580), sobre el documento de hechos de `exit-code-taxonomy-facts.mjs`. |
| [probabilistic-evidence-admissibility.rego](./probabilistic-evidence-admissibility.rego) | `evolith.probabilistic_evidence_admissibility` | _ninguno_ | La evidencia probabilística no puede alcanzar un veredicto bloqueante sin medirse (GT-584, ADR-0111). |
| [topology-composition.rego](./topology-composition.rego) | `evolith.topology_composition` | _ninguno_ | Reglas que discriminan sobre la composición de topología confirmada (GT-688). |

## Segundo entrypoint Wasm

`evolith.abac` ([abac-mcp-tool-access.rego](./abac-mcp-tool-access.rego)) se expone adicionalmente como su propio entrypoint `evolith/abac/violations` para que el gateway MCP pueda evaluar decisiones de acceso a herramientas de forma aislada en runtime. La **misma** política también se agrega en `evolith/main/violations` (aparece en la tabla anterior); no está excluida de `main`.

## Políticas standalone (no conectadas a `main.rego`)

Estas políticas están presentes en la carpeta pero **no** son importadas por `main.rego`, por lo que no contribuyen al entrypoint `evolith/main/violations`. Se evalúan directamente (p. ej. por el motor Native o un harness dedicado) y aún no están agregadas.

| Política | Paquete | Schema de entrada | Notas |
|---|---|---|---|
| [rbac/gate-role-enforcement.rego](./rbac/gate-role-enforcement.rego) | `evolith.rbac.gate` | _ninguno_ | Enforcement de rol de gate (RBAC). |
| [sdlc/pyramid-distribution.rego](./sdlc/pyramid-distribution.rego) | `evolith.sdlc.pyramid` | _ninguno_ | Distribución de pirámide de pruebas SDLC. |
| [engine-routing.rego](./engine-routing.rego) | `evolith.engine_routing` | _ninguno_ | Enrutamiento fail-closed de una petición a un motor (`stub` salvo que las señales de riesgo digan otra cosa); una decisión, no un conjunto `violations`. |
| [architecture-planning-gate.rego](./architecture-planning-gate.rego) | `evolith.governance.architecture_planning` | _ninguno_ | Deriva el modo SDLC (`minimal` … `rejected`) que debe seguir un plan de arquitectura; una decisión, no un conjunto `violations`. |

> **Inventario (2026-09-20):** 39 archivos `.rego` de política más `main.rego`, el agregador (excluyendo `*.test.rego` y `main_test.rego`): 35 agregadas arriba, 4 standalone aquí. Hay 27 schemas de entrada en `schemas/`. Re-derivar con `node .harness/scripts/pages/derive-page-metrics.mjs` (`corpus.opaPolicies`, `corpus.opaEntrypoints`). Las políticas con schema **_ninguno_** validan su entrada en línea o aún no están fijadas a schema — ver el [backlog de paridad](../../../reference/core/control-center/gaps/gap-tracking.md).

## Ejecutar pruebas de políticas

Prerrequisitos: un binario OPA local. `npm run build:policy` descarga OPA `v1.19.0` en `.harness/bin/opa`; alternativamente instala OPA tú mismo y agrégalo al `PATH`. No se requieren variables de entorno para ejecutar las pruebas.

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
| `opa: command not found` / falta `.harness/bin/opa` | Binario fijado no descargado | Ejecuta `npm run build:policy` (descarga OPA `v1.19.0`), o instala OPA y úsalo directamente. |
| El Evolith CLI no toma `policy.wasm` | Bundle obsoleto o ausente | Re-ejecuta `npm run build:policy`; el build instala `policy.wasm` en `sdk/cli/rulesets/opa/policy.wasm`. |
| Una política nueva no se aplica vía `evolith/main/violations` | No importada/unida en `main.rego` | Agrega un `import data.evolith.<pkg>.violations` y una regla de unión en [`main.rego`](./main.rego); las políticas en *Políticas standalone* no se agregan intencionalmente. |
| OPA y Native devuelven veredictos distintos | Drift de Paridad de Doble Motor | Trátalo como bug de paridad — alinea el `.rego` a la semántica del `*.rules.json` Native (ver [backlog de paridad](../../../reference/core/control-center/gaps/gap-tracking.md)). |

Los estándares de autoría y el flujo de contribución de esta capa están en el [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) raíz del repositorio.

---
[Volver al Hub de Rulesets](../README.es.md)
