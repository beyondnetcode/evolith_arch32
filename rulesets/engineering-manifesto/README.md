# Engineering Manifesto Ruleset

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

Executable WS1 entrypoint for the Evolith Engineering Manifesto ruleset.

## Purpose

This directory exposes `rulesets/engineering-manifesto` as the canonical executable path checked by the intelligent data strength audit. The ruleset encodes SOLID, DRY, KISS, YAGNI, and anti-pattern constraints consumed by the native ruleset validator and CI evidence flows.

## Artifacts

| Artifact | Purpose |
|---|---|
| [engineering-manifesto.rules.json](./engineering-manifesto.rules.json) | Native machine-readable ruleset for Engineering Manifesto validation |
| [../opa/engineering-manifesto.rego](../opa/engineering-manifesto.rego) | OPA policy parity artifact for Engineering Manifesto validation |
| [../opa/engineering-manifesto.test.rego](../opa/engineering-manifesto.test.rego) | OPA test coverage for the Engineering Manifesto policy |

## Validation

Run these checks after changing the ruleset:

```bash
npx jest --config packages/core-domain/jest.config.js --rootDir packages/core-domain --testPathPatterns='ruleset-validation.mode' --no-coverage
.harness/bin/opa test rulesets/opa/engineering-manifesto.rego rulesets/opa/engineering-manifesto.test.rego -v
```
