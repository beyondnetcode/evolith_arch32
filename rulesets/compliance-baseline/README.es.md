# Ruleset de Baseline de Cumplimiento

> **Navegación Bilingüe:** [English Version](./README.md)

Punto de entrada ejecutable WS1 para el ruleset de baseline de cumplimiento de Evolith.

## Propósito

Este directorio expone `rulesets/compliance-baseline` como la ruta ejecutable canónica que verifica la auditoría de fortaleza como data inteligente. El ruleset codifica los pilares de baseline de cumplimiento de Evolith consumidos por el validador nativo de rulesets y los flujos de evidencia CI.

## Artefactos

| Artefacto | Propósito |
|---|---|
| [compliance-baseline.rules.json](./compliance-baseline.rules.json) | Ruleset nativo machine-readable para validación de baseline de cumplimiento |
| [../opa/compliance-baseline.rego](../opa/compliance-baseline.rego) | Artefacto de paridad OPA para validación de baseline de cumplimiento |
| [../opa/compliance-baseline.test.rego](../opa/compliance-baseline.test.rego) | Cobertura de pruebas OPA para la política de baseline de cumplimiento |

## Validación

Ejecuta estos checks después de cambiar el ruleset:

```bash
npx jest --config packages/core-domain/jest.config.js --rootDir packages/core-domain --testPathPatterns='ruleset-validation.mode' --no-coverage
.harness/bin/opa test rulesets/opa/compliance-baseline.rego rulesets/opa/compliance-baseline.test.rego -v
```
