# Índice de Reglas SDLC

Reglas que definen los gates de fase, los umbrales de calidad, la higiene de dependencias y los requisitos de evidencia a lo largo del **eje SDLC** (idea → producto, cinco fases). Este eje es independiente del eje de topología.

| Conjunto de Reglas | Archivo | Descripción |
|---|---|---|
| **Gates de Fase** | [phase-gates.rules.json](./phase-gates.rules.json) | Criterios de salida obligatorios por fase SDLC |
| **Umbrales de Calidad** | [quality-thresholds.rules.json](./quality-thresholds.rules.json) | Líneas base canónicas de métricas: cobertura >= 80%, complejidad <= 15, etc. |
| **Pinning de Dependencias** | [dependency-pinning.rules.json](./dependency-pinning.rules.json) | Requisitos estrictos de pinning de versiones (paridad con `opa/version-pinning.rego`) |

> Los entrypoints WS1 canónicos para gates de fase y umbrales de calidad son las carpetas hermanas [`phase-gates/`](../phase-gates/README.es.md) y [`quality-thresholds/`](quality-thresholds.rules.json); los archivos aquí son las fuentes de categoría SDLC retenidas por compatibilidad.

## Fases SDLC

Las cinco fases SDLC canónicas (el eje *idea → producto*) son, en orden:

| # | Id de fase | Nombre de fase | Gate |
|---|---|---|---|
| 1 | `discovery` | Conception and Discovery | `gate-f1` |
| 2 | `design` | Design and Architecture | `gate-f2` |
| 3 | `construction` | Construction | `gate-f3` |
| 4 | `qa` | Validation and QA | `gate-f4` |
| 5 | `release` | Delivery and Operations | `gate-f5` |

`phase-gates.rules.json` las indexa por el `phase` numérico (1–5). Los identificadores legacy `f1..f5` son aliases aceptados de los mismos ids de fase (normalizados por Core); **no** los confundas con el eje progresivo de topología, que reutiliza `F1/F2/F3` con un significado distinto (ver la nota de ejes en el [Hub de Rulesets](../README.es.md)).

## Estado de enforcement

| Native `*.rules.json` | Contraparte OPA | ¿Conectada a `evolith/main/violations`? |
|---|---|---|
| `dependency-pinning.rules.json` | [`opa/version-pinning.rego`](../opa/README.es.md) | Sí (agregada) |
| `phase-gates.rules.json` | [`opa/phase-gates.rego`](../opa/README.es.md) | No — standalone, aún no agregada |
| `quality-thresholds.rules.json` (vía `opa/sdlc/coverage.rego`, `opa/sdlc/pyramid-distribution.rego`) | `opa/sdlc/*.rego` | No — standalone, evaluada directamente |

Las políticas Rego `phase-gates`, `sdlc/coverage` y `sdlc/pyramid` existen pero intencionalmente **no** son importadas por `main.rego`; se evalúan con el motor Native o un harness dedicado en lugar de pasar por el entrypoint Wasm agregado. Ver el [OPA README](../opa/README.es.md) para el mapa completo de agregación.

## Validar estos rulesets

Estos archivos se validan contra [`rulesets/schema/rule-definition.schema.json`](../schema/README.es.md) cuando Core los carga. Para chequear ad hoc una entrada editada a mano, ver la [guía de validación de schemas](../schema/README.es.md#validar-un-artefacto-contra-un-schema). Los estándares de autoría y contribución están en el [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) raíz del repositorio.

---

Volver al [Rulesets Hub](../README.es.md)
