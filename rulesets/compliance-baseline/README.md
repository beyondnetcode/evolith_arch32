# Compliance Baseline Ruleset

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

Executable WS1 entrypoint for the Evolith compliance baseline ruleset.

## Purpose

This directory exposes `rulesets/compliance-baseline` as the canonical executable path checked by the intelligent data strength audit. The ruleset encodes the Evolith compliance baseline pillars consumed by the native ruleset validator and CI evidence flows.

## Artifacts

| Artifact | Purpose |
|---|---|
| [compliance-baseline.rules.json](./compliance-baseline.rules.json) | Native machine-readable ruleset for compliance baseline validation |
| [../opa/compliance-baseline.rego](../opa/compliance-baseline.rego) | OPA policy parity artifact for compliance baseline validation |
| [../opa/compliance-baseline.test.rego](../opa/compliance-baseline.test.rego) | OPA test coverage for the compliance baseline policy |

## Validation

Run these checks after changing the ruleset:

```bash
npx jest --config packages/core-domain/jest.config.js --rootDir packages/core-domain --testPathPatterns='ruleset-validation.mode' --no-coverage
.harness/bin/opa test rulesets/opa/compliance-baseline.rego rulesets/opa/compliance-baseline.test.rego -v
```
