# Event-Driven — CLI Flows

> **Bilingual Navigation:** [Versión en Español](./cli-flows.es.md)

**Validators declarados:** `validate-architecture`, `validate-topology`

The following CLI commands are available for the Event-Driven topology.

## Validate

```bash
evolith validate --topology event-driven
evolith validate --topology event-driven --arch-level F2
evolith validate --topology event-driven --format json
```

Validates an Event-Driven configuration against the topology's native rules (`event-driven.rules.json`) and OPA Rego policies (`event-driven.rego`), checking message ordering, idempotency, eventual consistency, and event channel governance.

## Inspect

```bash
evolith topology inspect event-driven
evolith topology inspect event-driven --include-channels
```

Returns the parsed Event-Driven topology manifest, event channel and subscription metadata, and corpus artifact references.

## Drift

```bash
evolith drift detect --topology event-driven
evolith drift detect --topology event-driven --format json
```

Detects configuration drift between the Event-Driven topology's declared ruleset and the current workspace state.

## Scaffold

```bash
evolith architecture scaffold --topology event-driven
evolith architecture scaffold --topology event-driven --dry-run
```

Scaffolds an Event-Driven topology workspace with the canonical corpus structure, manifest, config schema, and OPA policies.

## Gate Evaluation

```bash
evolith gate evaluate --topology event-driven
evolith gate evaluate --topology event-driven --phase F1
```

Evaluates Event-Driven phase gates, validating message contract conformance and channel ownership.
