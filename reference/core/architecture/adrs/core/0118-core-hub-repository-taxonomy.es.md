> **Navegación Bilingüe:** [English Version](./0118-core-hub-repository-taxonomy.md)

# ADR-0118: El Hub Core tiene su propia taxonomía de raíz, distinta de la de los satélites

> **Firma del Agente:** Agente Arquitecto (Winston)

## Estado

Aceptado (2026-07-20 — implementado en `develop`)

Este ADR registra una decisión **ya implementada**, no una propuesta:

| Decisión | Commit | Artefacto |
|---|---|---|
| TAX-05 espera el layout real del hub | `b728117e` | `src/rulesets/opa/taxonomy.rego` |
| El allowlist de raíz descarta artefactos accidentales | `b728117e` | `.harness/scripts/ci/03-validate-root-cleanliness.mjs` |

## Fecha

2026-07-20

## Contexto y Problema

El repositorio hub Core **no tenía ningún ADR que gobernara su propia raíz**.
Existían dos, y ninguno la describía:

- **[ADR-0070](./0070-lean-root-repository-taxonomy.es.md)** manda `src/` +
  `docs/`, y su línea de alcance dice *"Universal — All Evolith satellite
  repositories"*. Es la regla de **satélite**. En el hub no existe `docs/`, y el
  propio spec de taxonomía prohíbe crearlo.
- **[ADR-0048](./0048-enterprise-taxonomy-reference-layout.es.md)** manda `src/`
  + `reference/` + `product/`. Eso sí es el hub, pero 0048 trata del layout de
  referencia, no de qué puede estar en la raíz.

ADR-0070 se le aplicaba al hub por inercia, y no encaja: su whitelist textual
omite `CONTRIBUTING.md`, `SECURITY.md`, `AGENTS.es.md`, `package.json`,
`tsconfig.json`, `product/` y `reference/` — todos presentes y todos legítimos.

La consecuencia práctica es que **la autoridad real sobre la raíz del hub pasó a
ser un script**, `.harness/scripts/ci/03-validate-root-cleanliness.mjs`,
mientras el ADR quedaba decorativo. Un corpus de gobernanza cuya propia raíz la
gobierna un script sin referenciar, y no un registro de decisión, no puede
pedirles más a sus satélites.

Dos síntomas concretaron el hueco:

1. `TAX-05` de `taxonomy.rego` exigía que la raíz contuviera
   `{reference, rulesets, sdk, .harness}` — el layout **anterior** al cutover de
   `apps/`+`packages/`+`sdk/` → `src/`. Sus propios tests pasaban porque los
   fixtures codificaban ese mismo layout obsoleto: regla y test de acuerdo entre
   sí, ambos equivocados sobre el repositorio.
2. Esa regla stale era lo único que mantenía vivo un `rulesets/` accidental en la
   raíz. Contenía un registro de agentes vacío que dejó una ejecución del CLI
   desde la raíz del repo, y borrarlo rompía TAX-05: un artefacto que nadie
   quería estaba protegido estructuralmente por una regla que nadie había
   revisado.

## Objetivo y Alcance

**Objetivo:** dar al hub Core una taxonomía de raíz explícita y aplicada, y
convertir el script que la impone en la implementación declarada del ADR en vez
de en su sustituto.

**En alcance:** la raíz del repositorio hub Core (`evolith_arch32`).

**Fuera de alcance:** las raíces de repositorios satélite, que siguen gobernadas
por [ADR-0070](./0070-lean-root-repository-taxonomy.es.md); y el layout interno
de `reference/`, `product/` y `src/`, gobernado por
[ADR-0048](./0048-enterprise-taxonomy-reference-layout.es.md).

## Opciones Consideradas

**A. Ampliar ADR-0070 para cubrir hub y satélites.** Descartada. Las dos raíces
son legítimamente distintas — el hub lleva un corpus de gobernanza
(`reference/`, `product/`) que ningún satélite tiene, y los satélites llevan
formas de aplicación que el hub no. Una sola regla para ambos tendría que ser
tan permisiva que dejaría de rechazar nada.

**B. Dejar el script como autoridad de facto.** Descartada. Es lo que el repo ya
hacía, y el resultado es el Contexto de este ADR: el script se separó de los
ADRs, los ADRs del repo, y nadie respondía por ninguno de los dos.

**C. Un ADR de taxonomía específico del hub cuya implementación sea el script
existente.** Elegida. Nombra el script como punto de imposición, de modo que
ambos no puedan discrepar en silencio: cambiar el allowlist sin enmendar este
ADR pasa a ser una omisión de gobernanza visible, no mantenimiento rutinario.

## Decisión y Fundamento

La raíz del hub Core contiene exactamente cuatro dominios de primer nivel:

| Directorio | Contiene |
|---|---|
| `reference/` | La constitución Core neutral respecto de proveedores — arquitectura, SDLC, ADRs, centro de control |
| `product/` | El corpus de la Product Suite — suite, productos, operaciones, infra, investigación |
| `src/` | Todos los workspaces: `apps/`, `packages/`, `sdk/`, `rulesets/`, `tests/` |
| `.harness/` | La automatización que gobierna el propio repositorio |

Más los dotfolders propiedad de herramientas (`.github/`, `.husky/`, `.vscode/`,
`.obsidian/`, `.bmad-core/`, `.mimocode/`) y los ficheros de raíz que el
ecosistema exige (`README`, `AGENTS`, `CONTRIBUTING`, `SECURITY`, `LICENSE`,
`CHANGELOG`, `package.json`, `tsconfig*.json`, `evolith.yaml`, ficheros de
configuración ocultos) — cada uno en sus dos variantes de idioma donde aplique
la política bilingüe.

**`evolith.yaml` es una entrada de raíz obligatoria, no un accidente.** El Core
es satélite de sí mismo y lleva su propio contrato de gobernanza, y
`.harness/scripts/lib/paths.mjs` lo usa como `ROOT_MARKER`. Quitarlo rompe toda
la resolución de rutas del harness.

**Lo que el CLI genera al ejecutarse desde la raíz del repo no es taxonomía.**
`test-project/` y `rulesets/` llegaron a la raíz así, se commitearon una vez y
después se leyeron como estructura. Están en `.gitignore` para que el error no se
repita, y sus contrapartes reales viven bajo `src/sdk/cli/`.

**El punto de imposición es
[`03-validate-root-cleanliness.mjs`](../../../../../.harness/scripts/ci/03-validate-root-cleanliness.mjs)**,
que corre en la suite de gobernanza en cada push y pull request. `TAX-05` en
`src/rulesets/opa/taxonomy.rego` lleva la misma expectativa en forma legible por
máquina.

## Evidencia y Criterios de Evaluación

- [x] `03-validate-root-cleanliness.mjs` pasa contra la raíz actual y rechaza un
      directorio no listado (verificado: detectó un `test-project/` vacío que
      `git rm` dejó atrás).
- [x] `opa test src/rulesets/opa/taxonomy.rego` — 5/5, y
      `repository-taxonomy.rego` — 8/8, con fixtures que describen el layout real.
- [x] `rulesets/` y `test-project/` eliminados de la raíz y añadidos a
      `.gitignore`.
- [x] `evolith.yaml` identifica el repositorio como `evolith` en vez del default
      de plantilla `my-satellite`.

## Consecuencias, Riesgos y Trade-offs

**Positivo.** La raíz del hub tiene registro de decisión por primera vez. El
allowlist y la regla OPA describen ahora el mismo repositorio, y ambos se
imponen en cada push en vez de solo en un hook al que nadie llega.

**Negativo.** Dos reglas de taxonomía que mantener en vez de una. Aceptado:
gobiernan formas de repositorio genuinamente distintas, y unificarlas produciría
una regla demasiado débil para rechazar nada.

**Riesgo — que este ADR derive como derivó ADR-0070.** Mitigado nombrando aquí
el script que lo impone y manteniendo la expectativa legible por máquina en
`taxonomy.rego`, pero no eliminado: todavía no falla nada cuando el allowlist
cambia y este documento no. Esa comprobación es el follow-up de abajo.

**Limitación conocida.** `TAX-05` y `TAX-11` están duplicados en dos paquetes
rego, `evolith.taxonomy` y `evolith.repository_taxonomy`, ambos actualizados
aquí. Dos fuentes de verdad para una sola política sigue siendo un riesgo latente
de deriva.

## Follow-up Conocido

- Consolidar las reglas TAX-\* duplicadas en un único paquete rego.
- Añadir un guard que verifique que el allowlist de raíz y este ADR coinciden,
  para que el modo de fallo descrito arriba sea visible.
- El `adrRegistry` de `evolith.yaml` está vacío, así que ningún ADR — este
  incluido — se valida contra registro.

## Referencias

- [ADR-0048: Taxonomía Empresarial y Layout de Referencia](./0048-enterprise-taxonomy-reference-layout.es.md)
- [ADR-0070: Taxonomía Lean de Raíz](./0070-lean-root-repository-taxonomy.es.md) — satélites
- [`03-validate-root-cleanliness.mjs`](../../../../../.harness/scripts/ci/03-validate-root-cleanliness.mjs)
- [`taxonomy.rego`](../../../../../src/rulesets/opa/taxonomy.rego)

## Decisiones y Estándares Relacionados

| Decisión | Relación |
|---|---|
| ADR-0070 | Gobierna las raíces de satélite. Este ADR gobierna la raíz del hub. No se solapan. |
| ADR-0048 | Gobierna qué vive dentro de `reference/` y `product/`. Este ADR gobierna qué puede estar en la raíz. |
