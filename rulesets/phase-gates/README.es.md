# Ruleset de Gates de Fase

> **Bilingual navigation:** [English version](./README.md)

Punto de entrada WS1 canonico para el contrato de phase gates del SDLC Evolith.

## Proposito

El ruleset de gates de fase define la evidencia obligatoria, criterios bloqueantes, roles responsables, autoridades de waiver y campos de waiver requeridos para salir de cada fase SDLC de Evolith. Este punto de entrada mantiene estable la ruta de auditoria WS1 mientras conserva el indice de la categoria SDLC.

## Artefactos

| Artefacto | Ruta | Proposito |
|---|---|---|
| Ruleset nativo | [../sdlc/phase-gates.rules.json](../sdlc/phase-gates.rules.json) | Contrato canonico machine-readable de gates de fase SDLC |
| Punto de entrada WS1 | [README.es.md](./README.es.md) | Punto de entrada documental estable conservado para la ubicacion anterior del ruleset de phase gates |
| Politica OPA | [../opa/cicd-quality-gates.rego](../opa/cicd-quality-gates.rego) | Enforcement Rego para controles de quality gates CI/CD |
| Pruebas OPA | [../opa/cicd-quality-gates.test.rego](../opa/cicd-quality-gates.test.rego) | Pruebas reproducibles de politica para controles de quality gates |

## Validacion

Ejecuta los checks focalizados Native y OPA:

```bash
node --test .harness/scripts/run-evolith-intelligent-data-audit.test.mjs
npx jest --config packages/core-domain/jest.config.js --rootDir packages/core-domain --testPathPatterns='ruleset-validation.mode' --no-coverage
.harness/bin/opa test rulesets/opa/cicd-quality-gates.rego rulesets/opa/cicd-quality-gates.test.rego -v
```
