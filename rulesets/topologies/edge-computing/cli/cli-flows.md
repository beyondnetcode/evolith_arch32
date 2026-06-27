# Edge Computing — CLI Flows

> **Bilingual Navigation:** [Versión en Español](./cli-flows.es.md)

**Validators declarados:** `validate-architecture`, `validate-topology`

The following CLI commands are available for the Edge Computing topology.

## Validate

```bash
evolith validate --topology edge-computing
evolith validate --topology edge-computing --arch-level F2
evolith validate --topology edge-computing --format json
```

Validates an Edge Computing configuration against the topology's native rules (`edge-computing.rules.json`) and OPA Rego policies (`edge-computing.rego`), checking offline resilience, resource limits, and deployment constraints.

## Inspect

```bash
evolith topology inspect edge-computing
evolith topology inspect edge-computing --include-targets
```

Returns the parsed Edge Computing topology manifest, deployment target metadata, and corpus artifact references.

## Drift

```bash
evolith drift detect --topology edge-computing
evolith drift detect --topology edge-computing --format json
```

Detects configuration drift between the Edge Computing topology's declared ruleset and the current workspace state.

## Scaffold

```bash
evolith architecture scaffold --topology edge-computing
evolith architecture scaffold --topology edge-computing --dry-run
```

Scaffolds an Edge Computing topology workspace with the canonical corpus structure, manifest, config schema, and OPA policies.

## Gate Evaluation

```bash
evolith gate evaluate --topology edge-computing
evolith gate evaluate --topology edge-computing --phase F1
```

Evaluates Edge Computing phase gates, validating extraction readiness and deployment boundary integrity.
