# Definition of Done Ruleset

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

Executable WS1 entrypoint for the Evolith Definition of Done ruleset.

## Purpose

This directory exposes `rulesets/definition-of-done` as the canonical executable path checked by the intelligent data strength audit. The ruleset encodes the mandatory story-closure checklist consumed by the native ruleset validator and CI evidence flows.

## Artifacts

| Artifact | Purpose |
|---|---|
| [definition-of-done.rules.json](./definition-of-done.rules.json) | Native machine-readable ruleset for Definition of Done validation |
| [../opa/dod.rego](../opa/dod.rego) | OPA policy parity artifact for Definition of Done validation |
| [../opa/dod.test.rego](../opa/dod.test.rego) | OPA test coverage for the Definition of Done policy |

## Validation

Run these checks after changing the ruleset:

```bash
npx jest --config packages/core-domain/jest.config.js --rootDir packages/core-domain --testPathPatterns='ruleset-validation.mode' --no-coverage
.harness/bin/opa test rulesets/opa/dod.rego rulesets/opa/dod.test.rego -v
```
