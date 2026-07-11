# Exploratory Cross-Surface Test Agent (F1)

An automated tester that exercises Evolith Core's three interfaces — **CLI**
(`evolith-cli`), **MCP** (`evolith-mcp`), and **Core API** (`core-api`) — and
detects behavioural divergences, contract violations, and coverage gaps between
them. It is the industrialisation of the one-operation cross-surface roundtrip in
`src/tests/contract/`, generalised to the whole operation catalog.

## Run

```bash
npm run test:exploration
```

Requires the workspace packages to be built (`dist/` present) — same prerequisite
as `test:contract`. Artifacts are written to `src/tests/exploration/.out/`
(gitignored): `findings.jsonl`, `coverage.json`, `proposed-gaps.md`.

## Architecture

| Module | Role |
|---|---|
| `catalog.ts` | **Discovery** — loads the CI-validated `surface-parity-matrix.json` (49 ops, `id → cli/mcp/rest`) instead of hardcoding operations. |
| `executors.ts` | **Execution** — `CliExecutor` (nest-commander in-process), `McpExecutor` (StreamableHTTP handshake), `RestExecutor` (supertest). Reuses the mechanics proven by the contract suite. |
| `bindings.ts` | Per-operation invocation builders for the cross-surface **triangle**. `verified: true` = argument equivalence proven (only `gate-evaluate` today). |
| `oracles.ts` | **Assertion** — ADR-0073 envelope shape, canonical-verdict normalisation, and the star oracle: cross-surface **consistency**. |
| `findings.ts` | **Reporter** — `findings.jsonl` + `coverage.json`; and a **gap-emitter** that renders confirmed findings as board-conformant `GT-NNN` entries (DRY-RUN — it never edits the board). |
| `runner.ts` | Orchestrator: catalog → bindings → executors → oracles → report. |
| `exploration.spec.ts` | jest entry: bootstraps the three surfaces in-process and drives the runner. |

## Confidence model

- **`verified` bindings** → a cross-surface divergence is a **confirmed** finding.
- **unverified bindings** → divergences are **hypotheses** (the argument
  equivalence is not yet proven; a divergence may be a binding gap, not a product
  bug). Promote a binding to `verified` once its equivalence is validated.

## Safety

- Read-only by default: **no mutative operations are bound** (satellite-create /
  adopt, moscow-*, config-set, auto-fix are excluded).
- The gap-emitter is **DRY-RUN**: it computes the next `GT` id and renders the
  exact EN/ES table rows + catalog sections into `proposed-gaps.md`, but does not
  modify `gap-tracking.md` / `gap-reference-catalog.md`. Registering into the
  single-source-of-truth board stays a human-reviewed step (and must respect the
  "single gap driver" rule).

## Roadmap (next increments)

- **F2** — negative + human-simulation scenarios (enum typos, missing flags,
  order permutations) with a seed; regression golden files.
- **F3** — pairwise flag combinatorics per command; SDLC state-transition
  sequences; auth/ABAC matrix.
- **F4** — controlled fuzzing; rate-limit/retry; risk-directed probabilistic
  coverage.
- Wire `test:exploration` into CI (closes the same gap class as GT-479 / the
  un-gated `test:contract`).
