# Repository Taxonomy Ruleset

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

Executable WS1 entrypoint for the Evolith Repository Taxonomy ruleset.

## Purpose

This directory exposes `rulesets/repository-taxonomy` as the canonical executable path checked by the intelligent data strength audit. The ruleset encodes naming, directory structure, ADR naming, bilingual pairing, and artifact classification constraints consumed by the native ruleset validator and CI evidence flows.

## Artifacts

| Artifact | Purpose |
|---|---|
| [repository-taxonomy.rules.json](./repository-taxonomy.rules.json) | Native machine-readable ruleset for Repository Taxonomy validation |
| [../opa/repository-taxonomy.rego](../opa/repository-taxonomy.rego) | OPA policy parity artifact for Repository Taxonomy validation |
| [../opa/repository-taxonomy.test.rego](../opa/repository-taxonomy.test.rego) | OPA test coverage for the Repository Taxonomy policy |

## Validation

Run these checks after changing the ruleset:

```bash
npx jest --config packages/core-domain/jest.config.js --rootDir packages/core-domain --testPathPatterns='ruleset-validation.mode' --no-coverage
.harness/bin/opa test rulesets/opa/repository-taxonomy.rego rulesets/opa/repository-taxonomy.test.rego -v
```
