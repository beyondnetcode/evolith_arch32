# Gap Closure Campaign Plan — Parallel Waves

> **Bilingual:** [Versión en Español](./gap-campaign-plan.es.md)
> **Owner:** Winston (Principal Architect) · **Source of truth** for how the open-gap backlog is driven to closure.
> Companion to [`gaps/gap-tracking.md`](./gaps/gap-tracking.md) (status) and [`opportunities/`](./opportunities). This file is the **flow**; the gap board is the **state**.

This plan is dependency-ordered and verifiability-gated. It exists so any session or agent can resume the campaign without re-deriving it.

## Operating protocol (the contract every wave obeys)

1. **Verifiability lane first.** Only what is verifiable *in this checkout* counts as `DONE` (core-domain / CLI / MCP / core-api `jest` + `tsc` + guard 08). Everything needing real infra (Docker/K8s/VPS/CI/sandbox/GitHub App/npm publish) is the **blocked track** — recorded `IN-PROGRESS` with the gated part named explicitly. **Never tick an unmet acceptance criterion.**
2. **Parallelism by disjoint files.** Within a wave, each lane touches separate code → worktree-isolated agents. The gap board (`gap-tracking`, catalog, `gap-closure-evidence.json`) is **single-driver** (the orchestrator), reconciled sequentially after collecting agent SHAs.
3. **Worktree protocol.** Each agent: `git merge --ff-only develop` (worktrees spawn from an OLD base) → symlink `node_modules` from the main checkout → **reproduce the bug on develop first** (many gaps are already-resolved drift) → fix only if needed → verify → commit code only. Orchestrator: cherry-pick SHAs → **re-verify combined on develop** (catches base-drift) → reconcile board → guard 08 → push → clean worktrees.
4. **Gate between waves.** No wave advances without a combined-green gate.

## The waves

### Wave 1 · Verifiable quick wins — 3 parallel lanes *(in progress)*
- **Lane A** — `GT-475` MCP HITL: `mutative:true` on write-class tools + parity guard.
- **Lane B** — `GT-481` (dead `mcp` e2e) · `GT-453` (invalid `evolith.yaml.example`) · `GT-454` (`docs` root manifest).
- **Lane C** — `GT-457` (validate-table detail) · `GT-458` (agents flag routing) · `GT-459` (upgrade DI crash).
- **Gate:** CLI jest + MCP jest + guard 08.

### Wave 2 · Governance-guard cluster — the highest-leverage enabler
This cluster gates a large tail of "small" gaps. Sequence: `GT-479` (make the false-green cross-surface test real) → promote the 22 envelope bindings to `verified` → re-run `test:exploration`; greens close **~22 envelope gaps** (`GT-485…509`), reds file as real parity findings. In parallel: `GT-476` (re-point `.harness` guard paths + CI wiring) → `GT-477` (live progress-counter enforcement). Completing this cluster also unblocks `GT-480` (criterion 2) and `GT-510` (criterion 3 = guard 09 / maturity re-observation).
- **Gate:** `test:exploration` + guard 08 + guard 09 green.

### Wave 3 · EAG completion — 3 lanes + chained gate (respects the dep DAG)
- `GT-516` PolicyCompiler + `enforce compile` (CLI · dep `GT-514` ✓) → `GT-518` PR/CI gate (dep `GT-516`; local = comment+exit-code fallback, not the GitHub App).
- `GT-519` parity + observability (Core · dep `GT-514` ✓).
- `GT-520` hardened MCP OAuth/ABAC (MCP · dep `GT-513`).
- **Gate:** CLI/MCP jest + guard 08.

### Wave 4 · Finish in-progress CLI *(opportunistic, parallel)*
`GT-455` · `GT-456` · `GT-460` · `GT-461` — verify against develop, complete, close.

## Blocked track — separate infra campaign (NOT this environment)
Requires Docker/K8s/VPS/Coolify/secrets/CI or user action; keep `IN-PROGRESS` with the gated part named.
- **Production epic:** `GT-435` · `GT-437`–`GT-448` · `GT-324` · `GT-446` · milestones `GT-447`/`GT-448`.
- **Real EAG execution:** `GT-512` sandbox/restore exec · `GT-515` AC3 (real `depcruise` corpus run) · `GT-513` live endpoint + npm package · `GT-518` GitHub-App gate.
- **User action:** `GT-451` — publish the CLI to npm (code prepped here).

## Projected impact
From 51 open → ~11 (the blocked track). Wave 1 ≈ 8, Wave 2 ≈ 24 (envelope + guard cluster), Wave 3 ≈ 4 EAG, Wave 4 ≈ 4.

## Status log
- 2026-07-12 — Plan authored. Wave 1 launched (3 lanes). Discovered `GT-480`/`GT-510` are gated on the Wave-2 guard cluster, not free closures — moved accordingly.
- 2026-07-12 — **Wave 1 complete.** DONE: `GT-475` (MCP HITL parity + phase-advance→read), `GT-453`/`GT-454` (v1 manifest + docs root), `GT-457`/`GT-458`/`GT-459` (validate-table/agents-flags/upgrade-DI). Also `GT-510` closed (a concurrent driver's maturity `asOf` sync `0d45a08e` turned guard 09 green). `GT-481` → IN-PROGRESS (dead mcp refs removed; e2e-suite-green blocked by unrelated legacy-fixture debt, spawned as a task). `GT-480` deferred (criterion 2 → `GT-476`). Board 464/523 · 13 IP · 43 pending. **Note:** a concurrent driver is working the Wave-2 governance-guard cluster (maturity/guard-09) — that driver should own the cluster; this driver takes the code lanes. Key pattern this wave: several gaps were already-fixed-on-develop drift — the "reproduce-first" protocol caught it and agents added the missing regression tests.
