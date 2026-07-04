# Microservices — CLI Flows

> **Bilingual Navigation:** [Versión en Español](./cli-flows.es.md)

**Validators declarados:** `validate-architecture`, `validate-topology`

The following CLI commands are available for the Microservices topology.

## Validate

```bash
evolith validate --topology microservices
evolith validate --topology microservices --arch-level F3
evolith validate --topology microservices --format json
```

Validates a Microservices configuration against the topology's native rules (`microservices.rules.json`) and OPA Rego policies (`microservices.rego`), checking service autonomy, API contract governance, and infrastructure boundaries.

## Inspect

```bash
evolith topology inspect microservices
evolith topology inspect microservices --include-services
```

Returns the parsed Microservices topology manifest, service boundary and communication metadata, and corpus artifact references.

## Drift

```bash
evolith drift detect --topology microservices
evolith drift detect --topology microservices --format json
```

Detects configuration drift between the Microservices topology's declared ruleset and the current workspace state.

## Scaffold

```bash
evolith architecture scaffold --topology microservices
evolith architecture scaffold --topology microservices --dry-run
```

Scaffolds a Microservices topology workspace with the canonical corpus structure, manifest, config schema, and OPA policies.

## Gate Evaluation

```bash
evolith gate evaluate --topology microservices
evolith gate evaluate --topology microservices --phase F3
```

Evaluates Microservices phase gates, validating service contract conformance and deployment independence.

## SDLC Handoff

```bash
evolith sdlc handoff --topology microservices
evolith sdlc handoff --topology microservices --phase F3
```

Generates SDLC handoff documentation for a Microservices phase, including evidence summary and service acceptance criteria.
