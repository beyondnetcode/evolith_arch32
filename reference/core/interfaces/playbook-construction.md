# Playbook — Construction phase

The journey through construction: turn an approved design into a running,
governed satellite, then prove it passes the construction gate. Every step works
identically on **CLI**, **MCP** (for an agent), and **REST** (for the Tracker) —
the exact request/response for each operation is in the
[construction catalog](how-to-construction.md).

> **Model.** The Core is a stateless evaluation engine: you send context, it
> returns an ADR-0073 verdict. The CLI is your local reference tool; an agent
> uses the MCP tools; the Tracker orchestrates over REST. Mutative MCP tools
> (`scaffold`, `generate`, filesystem writes) require `{ apply, approvalToken }`.

## 1 — Scaffold the workspace

Materialise the Nx workspace for your maturity phase (1 modular-monolith → 2
distributed-modules → 3 microservices).

- CLI: `evolith scaffold --frontend react --orm prisma --phase 1`
- MCP: `evolith-scaffold` (mutative — pass `apply` + `approvalToken`; `dryRun:true` to preview)

Start with `--dry-run` / `dryRun:true` to see the exact `nx`/`npm` commands before
writing anything. See [`scaffold-architecture`](how-to-construction.md#scaffold-architecture).

## 2 — Generate domain code from the design

If your design carries a DDD Mermaid `classDiagram`, generate the hexagonal
scaffold instead of hand-writing boilerplate.

- CLI: `evolith sdlc generate domain --from ddd-model.md`
- MCP: `evolith-sdlc-generate`

See [`sdlc-generate`](how-to-construction.md#generate-code-from-ddd-models).

## 3 — Validate what you built

Two complementary checks — run both:

| Check | Use it for | Operation |
| --- | --- | --- |
| **Satellite validation** | Governance rulesets, topology, phase gates | [`validate-satellite`](how-to-construction.md#validate-satellite-compliance) |
| **Composable validation** | Intelligent multi-mode resolution (SDLC + architecture + ADR + ad-hoc) | [`composable-validate`](how-to-construction.md#composable-validation) |
| **Architecture drift** | Declared vs detected maturity level | [`detect-drift`](how-to-construction.md#detect-architecture-drift) |

- CLI: `evolith validate --satellite . --core <core>` · `evolith validate --composable` · `evolith drift --path .`
- A failing verdict exits **non-zero** — CI can gate on it directly.
- If the Core rulesets can't be resolved you get `RULESET_NOT_FOUND` (the same
  code on all three surfaces) — point `--core` / `corePath` at your Core checkout.

## 4 — Evaluate the construction context

Run the full stateless evaluation (gates + compliance + architecture) over your
context.

- CLI: `evolith evaluate --workspace . --core <core> --phase construction`
- MCP: `evolith-evaluate` · REST: `POST /api/v1/evaluate`

The envelope's `success` means *the evaluation ran*; the **verdict lives in
`data`** and the **exit code reflects it**. See [`evaluate`](how-to-construction.md#evaluate-an-evaluationcontext).

## 5 — Confirm the construction gate

The decision point: evaluate the construction phase gate and read its evidence.

- CLI: `evolith gate evaluate --phase construction --satellite . --core <core>`
- MCP: `evolith-gate-evaluate` · REST: `POST /api/v1/gates/:gateId/evaluate`

A `verdict: "failed"` with per-artifact `violations` tells you exactly which
evidence is missing (see the real response in the catalog). Fix the gaps and
re-run. Optionally measure downstream-phase artifact completeness with
[`phase-artifacts-evaluate`](how-to-construction.md#downstream-phase-artifact-completeness).

## Typical loop

```
scaffold → generate → (edit code) → validate + drift → evaluate → gate
                              ↑___________________________________|
                                 iterate until the gate passes
```

When `gate evaluate --phase construction` returns a passing verdict (exit 0),
hand off to **QA** — see the [QA playbook](playbook-qa.md).
