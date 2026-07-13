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

## Wave 5 · Infra campaign — handoff (separate environment, NOT this checkout)
The verifiable-here surface is **exhausted**: every remaining Core gap has its verifiable slice DONE on `develop` and is `IN-PROGRESS` with only its infra/deploy tail open. This is the ordered handoff — each entry names the exact substrate needed. Runs where a real deploy/runtime exists (K8s/VPS/Coolify/CI/secrets/sandbox/IdP).

### 5a · Sandbox/provisioning runtime — the keystone
- **`GT-512`** (P0) — restore (`npm ci` / `dotnet restore+build` / `pip install`+grimp / `composer install`) + per-project Nx scoping + SHA cache + **shell-out sandbox** (no egress, no secrets, ulimits/cgroups, binary allowlist). Contracts/policy/cache DONE; needs a sandboxed `IProcessRunner` impl (cgroups/namespaces or a container). **Unblocks →** `GT-515` (real `depcruise -T json` on the Core corpus, 0-FP gate) + `GT-516` (`enforce run` + round-trip-0-FP).

### 5b · CD pipeline + registry + deploy
- **`GT-324`** (P1) — GHCR build+push of core-api & mcp-server + guarded Coolify deploy. Code complete; needs `GITHUB_TOKEN`/registry secrets + one CD run.
- **`GT-437`** (P1) — same CD for `agent-runtime-api` (GHCR + Coolify).
- **`GT-442`** (P1) — production secrets + DB connectivity (Coolify vault / K8s secrets) — prerequisite for every deploy.

### 5c · Production wiring (needs the deployed services + external systems)
- **`GT-438`** (P1) — bootstrap wires the REAL adapters: Core-eval (HTTP to a running Core), engine (Hermes/routing), durable memory+scheduler. Adapters exist; needs live Core + Hermes endpoints via env.
- **`GT-439`** (P1) — live JWKS/asymmetric JWT issuer + real multi-tenant deploy (HS256 slice + `TenantCorpusGuard` DONE).
- **`GT-441`** (P1) — real Tracker/Slack HITL transport behind `IApprovalTransport` (pending/approve/expire gate DONE).
- **`GT-520`** (P1) — OAuth 2.1 bearer via external IdP + Streamable HTTP (per-identity ABAC + audit + resources DONE).

### 5d · External-facing surfaces
- **`GT-513`** (P1) — deploy live `GET /api/v1/capabilities` + publish the `@beyondnet/evolith-contracts` npm package (manifest builder + drift guard DONE).
- **`GT-518`** (P1) — PR/CI drift gate on the GitHub Checks API: a GitHub App with `checks:write` + GHAS (SARIF exporter + evidence manifest DONE).

### 5e · Validation & observability
- **`GT-443`** (P2) — reliability: circuit-breaker (opossum) integration tests against a running system before any HA claim.
- **`GT-444`** (P2) — external penetration-test engagement (SAST/SCA already automated).
- **`GT-519`** (P2) — per-runtime composable CI images (vuln-scanned + Renovate) + OTel wiring to a real collector (enforcer OTel metrics layer DONE).

### 5f · Milestones & user action
- **`GT-435`** (P0, umbrella) / **`GT-447`** (P0) — Objective 1: full stack functional locally (Docker/K8s), UI on local URLs. Closes when 5a–5e land.
- **`GT-451`** (P0) — **user action:** `npm publish` the CLI (`@beyondnet/evolith-cli`, bumped code ready).

**Cross-repo (excluded — Tracker board):** `GT-446` (Tracker prod pilot) · `GT-448` (Objective 2 production).

## Concurrent-session lane (not this driver)
`GT-460` (api-catalog regen task), `GT-476`/`GT-477`/`GT-480`/`GT-523`/`GT-445` (governance-guard/maturity/doc-count) are owned by the concurrent sessions the user launched — single-driver rule, this driver does not touch them.

## Projected impact
From 51 open → ~11 (the blocked track). Wave 1 ≈ 8, Wave 2 ≈ 24 (envelope + guard cluster), Wave 3 ≈ 4 EAG, Wave 4 ≈ 4.

## Status log
- 2026-07-12 — Plan authored. Wave 1 launched (3 lanes). Discovered `GT-480`/`GT-510` are gated on the Wave-2 guard cluster, not free closures — moved accordingly.
- 2026-07-12 — **Wave 1 complete.** DONE: `GT-475` (MCP HITL parity + phase-advance→read), `GT-453`/`GT-454` (v1 manifest + docs root), `GT-457`/`GT-458`/`GT-459` (validate-table/agents-flags/upgrade-DI). Also `GT-510` closed (a concurrent driver's maturity `asOf` sync `0d45a08e` turned guard 09 green). `GT-481` → IN-PROGRESS (dead mcp refs removed; e2e-suite-green blocked by unrelated legacy-fixture debt, spawned as a task). `GT-480` deferred (criterion 2 → `GT-476`). Board 464/523 · 13 IP · 43 pending. **Note:** a concurrent driver is working the Wave-2 governance-guard cluster (maturity/guard-09) — that driver should own the cluster; this driver takes the code lanes. Key pattern this wave: several gaps were already-fixed-on-develop drift — the "reproduce-first" protocol caught it and agents added the missing regression tests.
- 2026-07-12 — **`GT-481` → DONE** (`83545d36`). Correction to the entry above: the residual e2e reds were NOT legacy-fixture debt (v1 fixtures greened 0 tests). Real causes were the `98a20dca` taxonomy split (`reference/`@root vs `rulesets/`@src → `gate.e2e` REPO_ROOT + `gate-status` reference resolution) and 5 `validate`/arch tests asserting an unattainable `passed|warning` against a bare fixture. Resolved test-only (v1 fixtures + REPO_ROOT fix + real ADR-0073 contract + gate-status mock Core); CLI e2e suite green (18 suites / 132 tests). Underlying standalone-CLI reference-path defect stays with `GT-451` (F-007). Board 465/523 · 12 IP · 43 pending.
- 2026-07-12 — **Waves 2–5 executed by this driver via parallel fleets.** Closed **29 Core gaps** in one isolated-worktree reconciliation — the envelope batch `GT-485…509` (unlocked by the `GT-479` cross-surface enabler: all 24 CLI envelope-op bindings promoted to `verified`, `test:exploration` findings=0), plus `GT-455`/`GT-456`/`GT-461` and (earlier) `GT-478`/`GT-482`/`GT-483`. Advanced **8 EAG + security slices to IN-PROGRESS** with only their infra tails open: `GT-512`/`GT-513`/`GT-515`/`GT-516`/`GT-518`/`GT-519`/`GT-520`/`GT-439`/`GT-441` — see **Wave 5** for the per-gap handoff. Board **494/523 · 14 IP · 12 pending · 3 deferred**. **The verifiable-here Core surface is EXHAUSTED** — remaining work is Wave-5 infra, concurrent-session-owned, or the `GT-451` npm publish. Survived multiple concurrent drivers resetting the shared working tree (no work lost) via: isolated worktrees for all board reconciliation, explicit-file staging (never `git add -A`), ground-truth counter recompute, and excluding concurrent-owned gaps.
