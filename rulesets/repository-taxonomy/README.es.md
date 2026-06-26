# Ruleset de Taxonomía del Repositorio

> **Navegación Bilingüe:** [English Version](./README.md)

Punto de entrada ejecutable WS1 para el ruleset de Taxonomía del Repositorio de Evolith.

## Propósito

Este directorio expone `rulesets/repository-taxonomy` como la ruta ejecutable canónica que verifica la auditoría de fortaleza como data inteligente. El ruleset codifica restricciones de nomenclatura, estructura de directorios, nombres ADR, pares bilingües y clasificación de artefactos consumidas por el validador nativo de rulesets y los flujos de evidencia CI.

## Artefactos

| Artefacto | Propósito |
|---|---|
| [repository-taxonomy.rules.json](./repository-taxonomy.rules.json) | Ruleset nativo machine-readable para validación de Taxonomía del Repositorio |
| [../opa/repository-taxonomy.rego](../opa/repository-taxonomy.rego) | Artefacto de paridad OPA para validación de Taxonomía del Repositorio |
| [../opa/repository-taxonomy.test.rego](../opa/repository-taxonomy.test.rego) | Cobertura de pruebas OPA para la política de Taxonomía del Repositorio |

## Validación

Ejecuta estos checks después de cambiar el ruleset:

```bash
npx jest --config packages/core-domain/jest.config.js --rootDir packages/core-domain --testPathPatterns='ruleset-validation.mode' --no-coverage
.harness/bin/opa test rulesets/opa/repository-taxonomy.rego rulesets/opa/repository-taxonomy.test.rego -v
```
