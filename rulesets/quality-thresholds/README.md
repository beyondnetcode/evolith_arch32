# Quality Thresholds Ruleset

> **Navegación bilingüe:** [Versión en Español](./README.es.md)

Canonical WS1 entrypoint for the Evolith release-blocking quality thresholds.

## Purpose

The quality-thresholds ruleset defines the minimum testing, code-quality, security, documentation, operations, and contract thresholds that can block merge, RC stamp, or Production Live gates. This entrypoint keeps the WS1 audit path stable while preserving the SDLC category index.

## Artifacts

| Artifact | Path | Purpose |
|---|---|---|
| Native ruleset | [quality-thresholds.rules.json](./quality-thresholds.rules.json) | Machine-readable release-blocking threshold contract |
| SDLC category source | [../sdlc/quality-thresholds.rules.json](../sdlc/quality-thresholds.rules.json) | Existing SDLC category contract retained for backward compatibility |
| OPA policy | [../opa/testing-pyramid.rego](../opa/testing-pyramid.rego) | Rego enforcement for coverage and testing-pyramid thresholds |
| OPA tests | [../opa/testing-pyramid.test.rego](../opa/testing-pyramid.test.rego) | Reproducible policy tests for testing and coverage controls |

## Validation

Run the focused Native and OPA checks:

```bash
node --test .harness/scripts/run-evolith-intelligent-data-audit.test.mjs
npx jest --config packages/core-domain/jest.config.js --rootDir packages/core-domain --testPathPatterns='ruleset-validation.mode' --no-coverage
.harness/bin/opa test rulesets/opa/testing-pyramid.rego rulesets/opa/testing-pyramid.test.rego -v
```
