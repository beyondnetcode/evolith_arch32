# Ruleset de Definition of Done

> **Navegación Bilingüe:** [English Version](./README.md)

Punto de entrada ejecutable WS1 para el ruleset Definition of Done de Evolith.

## Propósito

Este directorio expone `rulesets/definition-of-done` como la ruta ejecutable canónica que verifica la auditoría de fortaleza como data inteligente. El ruleset codifica el checklist obligatorio para cierre de historias consumido por el validador nativo de rulesets y los flujos de evidencia CI.

## Artefactos

| Artefacto | Propósito |
|---|---|
| [definition-of-done.rules.json](./definition-of-done.rules.json) | Ruleset nativo machine-readable para validación de Definition of Done |
| [../opa/dod.rego](../opa/dod.rego) | Artefacto de paridad OPA para validación de Definition of Done |
| [../opa/dod.test.rego](../opa/dod.test.rego) | Cobertura de pruebas OPA para la política Definition of Done |

## Validación

Ejecuta estos checks después de cambiar el ruleset:

```bash
npx jest --config packages/core-domain/jest.config.js --rootDir packages/core-domain --testPathPatterns='ruleset-validation.mode' --no-coverage
.harness/bin/opa test rulesets/opa/dod.rego rulesets/opa/dod.test.rego -v
```
