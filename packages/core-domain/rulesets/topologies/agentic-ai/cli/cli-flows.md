# Agentic AI — CLI Flows

> **Bilingual Navigation:** [Versión en Español](./cli-flows.es.md)

**Validators declarados:** `validate-topology`

The following CLI commands are available for the Agentic AI topology.

## Validate

```bash
evolith validate --topology agentic-ai
evolith validate --topology agentic-ai --strict
evolith validate --topology agentic-ai --format json
```

Validates an Agentic AI configuration against the topology's native rules (`agentic-ai.rules.json`) and OPA Rego policies (`agentic-ai.rego`), checking agent isolation, trust boundaries, and action authorization.

## Inspect

```bash
evolith topology inspect agentic-ai
evolith topology inspect agentic-ai --include-budgets
```

Returns the parsed Agentic AI topology manifest, operational budgets (token, credential rotation, sandbox timeout), and corpus artifact references.

## Drift

```bash
evolith drift detect --topology agentic-ai
evolith drift detect --topology agentic-ai --format json
```

Detects configuration drift between the Agentic AI topology's declared ruleset and the current workspace state.

## Scaffold

```bash
evolith architecture scaffold --topology agentic-ai
evolith architecture scaffold --topology agentic-ai --dry-run
evolith architecture scaffold --topology agentic-ai --format json
```

Scaffolds an Agentic AI topology workspace with the canonical corpus structure, manifest, config schema, and OPA policies.
