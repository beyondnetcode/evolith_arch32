# Modular Monolith — CLI Flows

> **Bilingual Navigation:** [Versión en Español](./cli-flows.es.md)

**Validators declarados:** `validate-architecture`, `validate-topology`

The following CLI commands are available for the Modular Monolith topology.

## Validate

```bash
evolith validate --topology modular-monolith
evolith validate --topology modular-monolith --arch-level F1
evolith validate --topology modular-monolith --format json
```

Validates a Modular Monolith configuration against the topology's native rules (`modular-monolith.rules.json`) and OPA Rego policies (`modular-monolith.rego`), checking bounded context isolation, shared kernel rules, and module boundary integrity.

## Inspect

```bash
evolith topology inspect modular-monolith
evolith topology inspect modular-monolith --include-modules
```

Returns the parsed Modular Monolith topology manifest, module boundary metadata, and corpus artifact references.

## Drift

```bash
evolith drift detect --topology modular-monolith
evolith drift detect --topology modular-monolith --format json
```

Detects configuration drift between the Modular Monolith topology's declared ruleset and the current workspace state.

## Scaffold

```bash
evolith architecture scaffold --topology modular-monolith
evolith architecture scaffold --topology modular-monolith --dry-run
evolith architecture scaffold --topology modular-monolith --format json
```

Scaffolds a Modular Monolith topology workspace with the canonical corpus structure, manifest, config schema, and OPA policies.

## Gate Evaluation

```bash
evolith gate evaluate --topology modular-monolith
evolith gate evaluate --topology modular-monolith --phase F1
```

Evaluates Modular Monolith phase gates, validating module extraction readiness and context mapping.

## SDLC Handoff

```bash
evolith sdlc handoff --topology modular-monolith
evolith sdlc handoff --topology modular-monolith --phase F1
```

Generates SDLC handoff documentation for a Modular Monolith phase, including evidence summary and acceptance criteria.
