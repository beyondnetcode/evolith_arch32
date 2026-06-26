# Ruleset del Manifiesto de Ingeniería

> **Navegación Bilingüe:** [English Version](./README.md)

Punto de entrada ejecutable WS1 para el ruleset del Manifiesto de Ingeniería de Evolith.

## Propósito

Este directorio expone `rulesets/engineering-manifesto` como la ruta ejecutable canónica que verifica la auditoría de fortaleza como data inteligente. El ruleset codifica restricciones SOLID, DRY, KISS, YAGNI y anti-patrones consumidas por el validador nativo de rulesets y los flujos de evidencia CI.

## Artefactos

| Artefacto | Propósito |
|---|---|
| [engineering-manifesto.rules.json](./engineering-manifesto.rules.json) | Ruleset nativo machine-readable para validación del Manifiesto de Ingeniería |
| [../opa/engineering-manifesto.rego](../opa/engineering-manifesto.rego) | Artefacto de paridad OPA para validación del Manifiesto de Ingeniería |
| [../opa/engineering-manifesto.test.rego](../opa/engineering-manifesto.test.rego) | Cobertura de pruebas OPA para la política del Manifiesto de Ingeniería |

## Validación

Ejecuta estos checks después de cambiar el ruleset:

```bash
npx jest --config packages/core-domain/jest.config.js --rootDir packages/core-domain --testPathPatterns='ruleset-validation.mode' --no-coverage
.harness/bin/opa test rulesets/opa/engineering-manifesto.rego rulesets/opa/engineering-manifesto.test.rego -v
```
