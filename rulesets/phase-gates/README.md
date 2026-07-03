# Phase Gates Ruleset

> **Navegación bilingüe:** [Versión en Español](./README.es.md)

Canonical WS1 entrypoint for the Evolith SDLC phase-gate contract.

## Purpose

The phase-gates ruleset defines the mandatory evidence, blocking criteria, accountable roles, waiver authorities, and waiver fields required to exit each Evolith SDLC phase. This entrypoint keeps the WS1 audit path stable while preserving the SDLC category index.

## Artifacts

| Artifact | Path | Purpose |
|---|---|---|
| Native ruleset | [../sdlc/phase-gates.rules.json](../sdlc/phase-gates.rules.json) | Canonical machine-readable SDLC phase-gate contract |
| WS1 entrypoint | [README.md](./README.md) | Stable documentation entrypoint retained for the former phase-gates ruleset location |
| OPA policy | [../opa/cicd-quality-gates.rego](../opa/cicd-quality-gates.rego) | Rego enforcement for CI/CD quality-gate controls |
| OPA tests | [../opa/cicd-quality-gates.test.rego](../opa/cicd-quality-gates.test.rego) | Reproducible policy tests for quality-gate controls |

## Validation

Run the focused Native and OPA checks:

```bash
node --test .harness/scripts/run-evolith-intelligent-data-audit.test.mjs
npx jest --config packages/core-domain/jest.config.js --rootDir packages/core-domain --testPathPatterns='ruleset-validation.mode' --no-coverage
.harness/bin/opa test rulesets/opa/cicd-quality-gates.rego rulesets/opa/cicd-quality-gates.test.rego -v
```
