# Distributed Modules — CLI Flows

> **Bilingual Navigation:** [Versión en Español](./cli-flows.es.md)

**Validators declarados:** `validate-architecture`, `validate-topology`

The following CLI commands are available for the Distributed Modules topology.

## Validate

```bash
evolith validate --topology distributed-modules
evolith validate --topology distributed-modules --arch-level F2
evolith validate --topology distributed-modules --format json
```

Validates a Distributed Modules configuration against the topology's native rules (`distributed-modules.rules.json`) and OPA Rego policies (`distributed-modules.rego`), checking network boundaries, inter-service contracts, and service autonomy.

## Inspect

```bash
evolith topology inspect distributed-modules
evolith topology inspect distributed-modules --include-services
```

Returns the parsed Distributed Modules topology manifest, service boundary metadata, and corpus artifact references.

## Drift

```bash
evolith drift detect --topology distributed-modules
evolith drift detect --topology distributed-modules --format json
```

Detects configuration drift between the Distributed Modules topology's declared ruleset and the current workspace state.

## Scaffold

```bash
evolith architecture scaffold --topology distributed-modules
evolith architecture scaffold --topology distributed-modules --dry-run
```

Scaffolds a Distributed Modules topology workspace with the canonical corpus structure, manifest, config schema, and OPA policies.

## Gate Evaluation

```bash
evolith gate evaluate --topology distributed-modules
evolith gate evaluate --topology distributed-modules --phase F2
```

Evaluates Distributed Modules phase gates, validating service extraction readiness and contract conformance.
