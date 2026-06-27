# Serverless — CLI Flows

> **Bilingual Navigation:** [Versión en Español](./cli-flows.es.md)

**Validators declarados:** `validate-architecture`, `validate-topology`

The following CLI commands are available for the Serverless topology.

## Validate

```bash
evolith validate --topology serverless
evolith validate --topology serverless --arch-level F2
evolith validate --topology serverless --format json
```

Validates a Serverless configuration against the topology's native rules (`serverless.rules.json`) and OPA Rego policies (`serverless.rego`), checking cold-start tolerance, statelessness, timeout limits, and cost profile.

## Inspect

```bash
evolith topology inspect serverless
evolith topology inspect serverless --include-functions
```

Returns the parsed Serverless topology manifest, function definitions, trigger metadata, and corpus artifact references.

## Drift

```bash
evolith drift detect --topology serverless
evolith drift detect --topology serverless --format json
```

Detects configuration drift between the Serverless topology's declared ruleset and the current workspace state.

## Scaffold

```bash
evolith architecture scaffold --topology serverless
evolith architecture scaffold --topology serverless --dry-run
```

Scaffolds a Serverless topology workspace with the canonical corpus structure, manifest, config schema, and OPA policies.

## Gate Evaluation

```bash
evolith gate evaluate --topology serverless
evolith gate evaluate --topology serverless --phase F1
```

Evaluates Serverless phase gates, validating event-driven function isolation and stateless deployment readiness.
