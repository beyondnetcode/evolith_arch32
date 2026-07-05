# evolith-validate — Composite Action de GitHub Actions

> **Bilingual Navigation:** [English Version](./README.md)

Composite action reutilizable que ejecuta `smart-cli validate` como gate de PR en cualquier repositorio satélite que herede de Evolith Core.

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
| `cli-version` | Version de `@evolith/smart-cli` a instalar | No | `latest` |
| `fail-on-violation` | Fallar el job cuando se encuentran violaciones | No | `true` |

## Outputs

| Output | Descripcion |
|--------|-------------|
| `compliance-status` | `compliant` o `non-compliant` |
| `violations-count` | Numero de violaciones encontradas |
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

---

## Requisitos

- El repositorio satélite debe tener un `evolith.yaml` en su raiz (o en `satellite-path`).
- El comando `smart-cli validate` resuelve las reglas del Core via el campo `coreRef` en `evolith.yaml`.

---

[Volver a Evolith Core](../../../reference/core/control-center/README.es.md)
