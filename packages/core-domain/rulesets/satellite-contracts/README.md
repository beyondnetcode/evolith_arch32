# Satellite Contracts Ruleset

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

Executable WS1 entrypoint for the Evolith Satellite Contracts ruleset.

## Purpose

This directory exposes `rulesets/satellite-contracts` as the canonical executable path checked by the intelligent data strength audit. The ruleset encodes the satellite evolith.yaml contract rules consumed by the native ruleset validator and CI evidence flows.

## Artifacts

| Artifact | Path | Purpose |
|---|---|---|
| Native ruleset | [satellite-contracts.rules.json](./satellite-contracts.rules.json) | Machine-readable satellite contract validation rules |
| OPA policy | [../opa/satellite-contracts.rego](../opa/satellite-contracts.rego) | OPA policy parity artifact for Satellite Contracts validation |
| OPA tests | [../opa/satellite-contracts.test.rego](../opa/satellite-contracts.test.rego) | OPA test coverage for the Satellite Contracts policy |
| OPA input schema | [../opa/schemas/satellite-contracts.input.schema.json](../opa/schemas/satellite-contracts.input.schema.json) | JSON Schema for OPA policy input |

## Validation

Run these checks after changing the ruleset:

```bash
npx jest --config packages/core-domain/jest.config.js --rootDir packages/core-domain --testPathPatterns='ruleset-validation.mode' --no-coverage
.harness/bin/opa test rulesets/opa/satellite-contracts.rego rulesets/opa/satellite-contracts.test.rego -v
```
