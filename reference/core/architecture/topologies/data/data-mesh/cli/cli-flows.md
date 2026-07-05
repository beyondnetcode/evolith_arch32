# Data Mesh — CLI Flows

> **Bilingual Navigation:** [Versión en Español](./cli-flows.es.md)

**Validators declarados:** `validate-architecture`, `validate-topology`

The following CLI commands are available for the Data Mesh topology.

## Validate

```bash
evolith validate --topology data-mesh
evolith validate --topology data-mesh --arch-level F2
evolith validate --topology data-mesh --format json
```

Validates a Data Mesh configuration against the topology's native rules (`data-mesh.rules.json`) and OPA Rego policies (`data-mesh.rego`), checking data domain isolation, federated governance, and contract boundaries.

## Inspect

```bash
evolith topology inspect data-mesh
evolith topology inspect data-mesh --include-domains
```

Returns the parsed Data Mesh topology manifest, data domain references, ownership metadata, and corpus artifact links.

## Drift

```bash
evolith drift detect --topology data-mesh
evolith drift detect --topology data-mesh --format json
```

Detects configuration drift between the Data Mesh topology's declared ruleset and the current workspace state.

## Scaffold

```bash
evolith architecture scaffold --topology data-mesh
evolith architecture scaffold --topology data-mesh --dry-run
```

Scaffolds a Data Mesh topology workspace with the canonical corpus structure, manifest, config schema, and OPA policies.

## Gate Evaluation

```bash
evolith gate evaluate --topology data-mesh
evolith gate evaluate --topology data-mesh --phase F1
```

Evaluates Data Mesh phase gates for the given architecture level, checking contract conformance and domain ownership.
