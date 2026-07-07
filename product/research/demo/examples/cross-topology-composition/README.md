# Example — Cross-Topology Composition: Modular Monolith + Event-Driven

> **Bilingual navigation:** [Versión en Español](./README.es.md)
> **Composition:** `modular-monolith + event-driven`
> **Schema:** [`topology-composition.schema.json`](../../../../../src/rulesets/schema/topology-composition.schema.json)
> **Validator:** `.harness/scripts/ci/22-validate-topology-composition.mjs`

This directory ships the first executable reference for the cross-topology composition rule (`topology-dimensions.md §3`). It demonstrates how an F1 modular monolith exposes async boundaries through an event-driven integration topology — the second row of the composition examples table — and runs end-to-end through the composition validator on every commit.

---

## 1. Files in This Example

| File | Purpose |
|---|---|
| [`topology.composition.json`](./topology.composition.json) | Declarative composition manifest. Lists each profile and points to its per-topology configuration. |
| [`modular-monolith.config.json`](./modular-monolith.config.json) | Configuration fixture for the modular monolith profile. Validated against the topology's `configurationContract`. |
| [`event-driven.config.json`](./event-driven.config.json) | Configuration fixture for the event-driven profile. Same validation contract. |

The composition manifest is intentionally minimal: it does not embed runtime code, only the declarative inputs the topology validators consume. A satellite project can copy the directory into its own repository, edit the per-topology configs, and pass the same composition test the corpus runs in CI.

---

## 2. Why This Composition Is Valid

The composition rule (`topology-dimensions.md §3`) accepts a set of profiles only if:

1. Each profile is governed by an accepted manifest.
2. The profiles belong to **different dimensions** (`progressive-axis`, `integration`, `execution`, `data`, `ai`).
3. Each profile lists the others in its `spec.compatibility.composableWith` field.

For this example:

| Check | Result |
|---|---|
| `modular-monolith` is accepted | Yes — manifest at `reference/core/architecture/topologies/progressive-axis/modular-monolith/topology.manifest.json` |
| `event-driven` is accepted | Yes — manifest at `reference/core/architecture/topologies/integration/event-driven/topology.manifest.json` |
| Dimensions differ | Yes — `progressive-axis` vs `integration` |
| `modular-monolith.composableWith` includes `event-driven` | Yes |
| `event-driven.composableWith` includes `modular-monolith` | Yes |

---

## 3. Running the Validator Locally

```bash
node .harness/scripts/ci/22-validate-topology-composition.mjs
```

The script scans every `topology.composition.json` under `examples/`, validates each against the composition JSON Schema, asserts pairwise composability via `composableWith`, and validates each per-topology fixture against its `configurationContract`. A failure on any check exits non-zero.

The same script runs on every commit through the pre-commit pipeline (`.husky/pre-commit`), so the example acts as a live conformance fixture rather than documentation that can rot.

---

## 4. Adapting to a New Composition

1. Pick the profiles you want to compose (e.g., `microservices + edge-computing + event-driven`).
2. Copy this directory to a new folder under `examples/`.
3. Edit `topology.composition.json` — list each profile and point to its config.
4. Author or copy a configuration fixture for each profile from its manifest's `corpus.fixtures.valid`.
5. Run the validator. Failures will identify which `composableWith` declaration is missing.

If two profiles cannot compose, the validator must reject the example. Add a deliberately invalid example beside the valid one only when you also document why the corpus expects the rejection.

---

## 5. Related References

| Document | Purpose |
|---|---|
| [Topology Dimensions §3 — Composition Rule](../../../../../reference/core/architecture/topologies/topology-dimensions.md#3-composition-rule) | Authoritative composition rule. |
| [Topology Manifest Schema](../../../../../src/rulesets/schema/topology-manifest.schema.json) | Defines `spec.compatibility.composableWith`. |
| [Topology Composition Schema](../../../../../src/rulesets/schema/topology-composition.schema.json) | Defines the manifest shape used by this example. |
