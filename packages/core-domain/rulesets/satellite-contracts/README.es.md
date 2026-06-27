# Ruleset de Contratos Satélite

> **Navegación Bilingüe:** [English Version](./README.md)

Punto de entrada ejecutable WS1 para el ruleset Satellite Contracts de Evolith.

## Propósito

Este directorio expone `rulesets/satellite-contracts` como la ruta ejecutable canónica que verifica la auditoría de fortaleza como data inteligente. El ruleset codifica las reglas de contrato evolith.yaml del satélite consumido por el validador nativo de rulesets y los flujos de evidencia CI.

## Artefactos

| Artefacto | Ruta | Propósito |
|---|---|---|
| Ruleset nativo | [satellite-contracts.rules.json](./satellite-contracts.rules.json) | Reglas machine-readable de validación de contratos satélite |
| Política OPA | [../opa/satellite-contracts.rego](../opa/satellite-contracts.rego) | Artefacto de paridad OPA para validación de Satellite Contracts |
| Pruebas OPA | [../opa/satellite-contracts.test.rego](../opa/satellite-contracts.test.rego) | Cobertura de pruebas OPA para la política Satellite Contracts |
| Esquema de entrada OPA | [../opa/schemas/satellite-contracts.input.schema.json](../opa/schemas/satellite-contracts.input.schema.json) | JSON Schema para la entrada de la política OPA |

## Validación

Ejecuta estos checks después de cambiar el ruleset:

```bash
npx jest --config packages/core-domain/jest.config.js --rootDir packages/core-domain --testPathPatterns='ruleset-validation.mode' --no-coverage
.harness/bin/opa test rulesets/opa/satellite-contracts.rego rulesets/opa/satellite-contracts.test.rego -v
```
