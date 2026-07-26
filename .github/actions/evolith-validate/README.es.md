# evolith-validate — Composite Action de GitHub Actions

> **Bilingual Navigation:** [English Version](./README.md)

Composite action reutilizable que ejecuta `evolith-cli validate` como gate de PR en cualquier repositorio satélite que herede de Evolith Core.

---

## Uso

### Minimal (todos los rulesets)

```yaml
# .github/workflows/governance.yml  (en tu repositorio satélite)
name: Gate de Gobernanza Evolith

on:
  pull_request:
    branches: [main, develop]

jobs:
  governance:
    name: Cumplimiento de Gobernanza
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validar gobernanza Evolith
        uses: beyondnetcode/evolith_arch32/.github/actions/evolith-validate@main
```

### Solo ruleset de herencia

```yaml
      - name: Validar herencia Evolith
        uses: beyondnetcode/evolith_arch32/.github/actions/evolith-validate@main
        with:
          ruleset: inheritance
```

### Configuracion completa

```yaml
      - name: Validar gobernanza Evolith
        uses: beyondnetcode/evolith_arch32/.github/actions/evolith-validate@main
        with:
          satellite-path: '.'
          ruleset: 'inheritance'
          node-version: '20'
          cli-version: '0.0.3-beta'
          fail-on-violation: 'true'

      - name: Subir reporte de cumplimiento
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: evolith-compliance-report
          path: ${{ steps.validate.outputs.report-path }}
```

---

## Inputs

| Input | Descripcion | Requerido | Default |
|-------|-------------|-----------|---------|
| `satellite-path` | Ruta a la raiz del repo satélite | No | `.` |
| `core-path` | Ruta a Evolith Core (uso en monorepo) | No | `''` |
| `ruleset` | Ruleset a validar: `acl`, `open-core`, `inheritance`, o vacío para todos | No | `''` |
| `node-version` | Version de Node.js | No | `20` |
| `cli-version` | Version de `@beyondnet/evolith-cli` a instalar | No | `latest` |
| `cli-command` | Comando con el que se invoca el CLI. Vacio instala el CLI publicado; si se define (p. ej. `node ./src/sdk/cli/dist/main.js`) se usa un build local y se omiten tanto el npm install como el setup de Node.js | No | `''` |
| `fail-on-violation` | Fallar el job cuando se encuentran violaciones | No | `true` |

## Outputs

| Output | Descripcion |
|--------|-------------|
| `compliance-status` | `compliant` o `non-compliant` |
| `violations-count` | Numero de issues **bloqueantes** encontrados (`data.issues[].blocking == true`) |
| `issues-count` | Total de issues encontrados, bloqueantes y advisory |
| `report-path` | Ruta absoluta al reporte JSON generado |

---

## Rulesets

| Ruleset | Que valida |
|---------|-----------|
| `inheritance` | El satélite hereda version del Core, ADRs requeridos, contratos de phase gates |
| `acl` | Limites de capa anti-corrupcion (integraciones externas) |
| `open-core` | Reglas de frontera Open-Core (que pertenece al Core vs. Tracker SaaS) |
| *(vacio)* | Todos los rulesets combinados |

---

## Resumen del Job

La accion escribe un resumen de cumplimiento en el job summary de GitHub Actions en cada ejecucion (incluyendo fallos), mostrando estado de cumplimiento, conteo de violaciones y configuracion utilizada.

El conteo se lee del envelope ADR-0073 del CLI — `{ success, data: { status, rulesChecked, issues[], coreRef, timestamp }, meta }` — con `[.data.issues[]? | select(.blocking == true)] | length`. No depende de ninguna otra clave, asi que agregar claves al envelope no puede alterarlo.

---

## Dogfooding y pruebas de regresion

Esta accion se ejercita desde [`evolith-validate-dogfood.yml`](../../workflows/evolith-validate-dogfood.yml) en Evolith Core:

- `test/action-step.test.mjs` ejecuta los propios scripts `run:` de la accion contra envelopes grabados del CLI (`node --test .github/actions/evolith-validate/test/action-step.test.mjs`).
- El job `dogfood` compila el CLI de este commit y corre la accion contra `test/fixtures/noncompliant-satellite/`, verificando un conteo de violaciones distinto de cero y un job bloqueado.

---

## Requisitos

- El repositorio satélite debe tener un `evolith.yaml` en su raiz (o en `satellite-path`).
- El comando `evolith-cli validate` resuelve las reglas del Core via el campo `coreRef` en `evolith.yaml`.

---

[Volver a Evolith Core](../../../reference/core/control-center/README.md)
