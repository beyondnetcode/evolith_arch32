# SDLC Rules Index

Rules defining phase gates, quality thresholds, dependency hygiene, and evidence requirements along the **SDLC axis** (idea → product, five phases). This axis is independent of the topology axis.

| Rule Set | File | Description |
|---|---|---|
| **Phase Gates** | [phase-gates.rules.json](./phase-gates.rules.json) | Mandatory exit criteria per SDLC phase |
| **Quality Thresholds** | [quality-thresholds.rules.json](./quality-thresholds.rules.json) | Canonical metric baselines: coverage >= 80%, complexity <= 15, etc. |
| **Dependency Pinning** | [dependency-pinning.rules.json](./dependency-pinning.rules.json) | Strict dependency-version pinning requirements (parity with `opa/version-pinning.rego`) |

> The canonical WS1 entrypoints for phase gates and quality thresholds are the sibling [`phase-gates/`](../phase-gates/README.md) and [`quality-thresholds/`](../quality-thresholds/README.md) directories; the files here are the SDLC-category sources retained for backward compatibility.

## SDLC phases

The five canonical SDLC phases (the *idea → product* axis) are, in order:

| # | Phase id | Phase name | Gate |
|---|---|---|---|
| 1 | `discovery` | Conception and Discovery | `gate-f1` |
| 2 | `design` | Design and Architecture | `gate-f2` |
| 3 | `construction` | Construction | `gate-f3` |
| 4 | `qa` | Validation and QA | `gate-f4` |
| 5 | `release` | Delivery and Operations | `gate-f5` |

`phase-gates.rules.json` keys these by the numeric `phase` (1–5). The legacy `f1..f5` identifiers are accepted aliases of the same phase ids (normalized by Core); do **not** confuse them with the topology progressive axis, which reuses `F1/F2/F3` for an unrelated meaning (see the [Rulesets Hub](../README.md) axis note).

## Enforcement status

| Native `*.rules.json` | OPA counterpart | Wired into `evolith/main/violations`? |
|---|---|---|
| `dependency-pinning.rules.json` | [`opa/version-pinning.rego`](../opa/README.md) | Yes (aggregated) |
| `phase-gates.rules.json` | [`opa/phase-gates.rego`](../opa/README.md) | No — standalone, not yet aggregated |
| `quality-thresholds.rules.json` (via `opa/sdlc/coverage.rego`, `opa/sdlc/pyramid-distribution.rego`) | `opa/sdlc/*.rego` | No — standalone, evaluated directly |

The `phase-gates`, `sdlc/coverage`, and `sdlc/pyramid` Rego policies exist but are intentionally **not** imported by `main.rego`; they are evaluated by the Native engine or a dedicated harness rather than through the aggregated Wasm entrypoint. See the [OPA README](../opa/README.md) for the full aggregation map.

## Validating these rulesets

These files are validated against [`rulesets/schema/rule-definition.schema.json`](../schema/README.md) when Core loads them. To check a hand-edited entry ad hoc, see the [schema validation guide](../schema/README.md#validating-an-artifact-against-a-schema). Authoring and contribution standards live in the repo-root [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

---

Back to [Rulesets Hub](../README.md)