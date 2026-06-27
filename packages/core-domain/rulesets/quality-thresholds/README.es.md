# Ruleset de Umbrales de Calidad

> **Bilingual navigation:** [English version](./README.md)

Punto de entrada WS1 canonico para los umbrales de calidad bloqueantes de release de Evolith.

## Proposito

El ruleset de umbrales de calidad define los minimos de testing, calidad de codigo, seguridad, documentacion, operaciones y contratos que pueden bloquear merge, RC stamp o Production Live. Este punto de entrada mantiene estable la ruta de auditoria WS1 mientras conserva el indice de la categoria SDLC.

## Artefactos

| Artefacto | Ruta | Proposito |
|---|---|---|
| Ruleset nativo | [quality-thresholds.rules.json](./quality-thresholds.rules.json) | Contrato machine-readable de umbrales bloqueantes de release |
| Fuente de categoria SDLC | [../sdlc/quality-thresholds.rules.json](../sdlc/quality-thresholds.rules.json) | Contrato existente de la categoria SDLC conservado por compatibilidad |
| Politica OPA | [../opa/testing-pyramid.rego](../opa/testing-pyramid.rego) | Enforcement Rego para umbrales de cobertura y testing pyramid |
| Pruebas OPA | [../opa/testing-pyramid.test.rego](../opa/testing-pyramid.test.rego) | Pruebas reproducibles de politica para controles de testing y cobertura |

## Validacion

Ejecuta los checks focalizados Native y OPA:

```bash
node --test .harness/scripts/run-evolith-intelligent-data-audit.test.mjs
npx jest --config packages/core-domain/jest.config.js --rootDir packages/core-domain --testPathPatterns='ruleset-validation.mode' --no-coverage
.harness/bin/opa test rulesets/opa/testing-pyramid.rego rulesets/opa/testing-pyramid.test.rego -v
```
