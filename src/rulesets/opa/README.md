# OPA Policies and Input Schemas

This directory contains the Open Policy Agent (OPA) `.rego` policies used for architecture and governance validation in the Evolith platform. Each enforcement policy publishes a `violations` set under the `evolith.*` package namespace, and most are backed by a versioned JSON Schema describing their input under [`schemas/`](./schemas/).

## Source of truth (Markdown vs OPA vs Native rules)

- **Human-authored standards, ADRs, and the engineering constitution under `reference/`** are authoritative for *intent and rationale* — the *why*.
- **`*.rules.json` "Native" rulesets** (under `rulesets/<category>/`) are the canonical machine-readable encoding of each rule — the *what*.
- **OPA `.rego` policies** are a **parity engine**: they re-express the same rule semantics so they can be enforced inside an OPA/Wasm sidecar or CI gate. **OPA must not drift from Native rule semantics** — where both engines apply, they must agree (Dual-Engine Parity).

In short: Markdown explains, Native `*.rules.json` defines, and OPA + the Native evaluator both enforce. When OPA and Native disagree, that is a parity bug, not a license to diverge.

## Compilation and loading

- Script: [`.harness/scripts/compile-opa-wasm.mjs`](../../.harness/scripts/compile-opa-wasm.mjs), invoked via `npm run build:policy`.
- It downloads OPA `v0.65.0`, then runs `opa build -t wasm` over `rulesets/opa/` with `--ignore=schemas`.
- **Wasm entrypoints:** `evolith/main/violations` and `evolith/abac/violations`.
- The extracted `policy.wasm` is installed to `sdk/cli/rulesets/opa/policy.wasm` for the Smart CLI evaluator.
- `evolith.main` ([main.rego](./main.rego)) aggregates the `violations` sets of the individual policies. `evolith.abac` ([abac-mcp-tool-access.rego](./abac-mcp-tool-access.rego)) is **dual-published**: it is imported and unioned into `evolith/main/violations` (`main.rego` line 10 imports `data.evolith.abac.violations` and line 62 unions it), *and* it is also exposed as the dedicated `evolith/abac/violations` entrypoint for runtime MCP tool-access decisions.

## Aggregated enforcement policies

These policies are imported and unioned by [`main.rego`](./main.rego) into the `evolith/main/violations` Wasm entrypoint. Each has a co-located `*.test.rego` and (unless noted) an input schema under `schemas/`.

| Policy | Package | Input schema | Enforces |
|---|---|---|---|
| [abac-mcp-tool-access.rego](./abac-mcp-tool-access.rego) | `evolith.abac` | yes | ABAC for agentic MCP tool execution. **Also published as the separate `evolith/abac/violations` entrypoint** (see below). |
| [version-pinning.rego](./version-pinning.rego) | `evolith.version_pinning` | yes | Strict dependency pinning. |
| [taxonomy.rego](./taxonomy.rego) | `evolith.taxonomy` | yes | Directory taxonomy, ADR file naming, bilingual pairs. |
| [cli-readiness.rego](./cli-readiness.rego) | `evolith.cli_readiness` | yes | Smart CLI compile/doc/lock-file readiness. |
| [evidence.rego](./evidence.rego) | `evolith.evidence` | yes | Schema, retention and ownership of gate evidence. |
| [mcp.rego](./mcp.rego) | `evolith.mcp` | yes | MCP protocol compliance and smoke evidence. |
| [ci-cd.rego](./ci-cd.rego) | `evolith.ci_cd` | yes | Dependency scanning, workflow scripts, dependency updates. |
| [governance.rego](./governance.rego) | `evolith.governance` | yes | Satellite inheritance boundaries and mandatory decisions. |
| [anti-corruption-layer.rego](./anti-corruption-layer.rego) | `evolith.acl` | yes | Anti-Corruption Layer / domain-boundary protection. |
| [cicd-quality-gates.rego](./cicd-quality-gates.rego) | `evolith.cicd_quality_gates` | yes | CI/CD quality-gate controls. |
| [cli-core-parity.rego](./cli-core-parity.rego) | `evolith.cli_core_parity` | yes | Every Core rule traced to CLI/MCP/tests/evidence. |
| [cli-release-readiness.rego](./cli-release-readiness.rego) | `evolith.cli_release_readiness` | yes | CLI build/test/package/MCP-smoke release evidence. |
| [compliance-baseline.rego](./compliance-baseline.rego) | `evolith.compliance_baseline` | yes | Executable compliance baseline controls. |
| [dod.rego](./dod.rego) | `evolith.dod` | yes | Definition of Done story-closure checklist. |
| [engineering-manifesto.rego](./engineering-manifesto.rego) | `evolith.engineering_manifesto` | yes | SOLID/DRY/KISS/YAGNI and anti-pattern constraints. |
| [executive-scorecards.rego](./executive-scorecards.rego) | `evolith.executive_scorecards` | yes | DORA + SPACE scorecard evidence. |
| [gitflow-branching.rego](./gitflow-branching.rego) | `evolith.gitflow_branching` | yes | GitFlow branching policy. |
| [hexagonal-architecture.rego](./hexagonal-architecture.rego) | `evolith.hexagonal_architecture` | yes | Ports/adapters hexagonal boundaries (ADR-0002). |
| [knowledge-intake.rego](./knowledge-intake.rego) | `evolith.knowledge_intake` | yes | Knowledge intake lifecycle, review status, topology match. |
| [multi-runtime.rego](./multi-runtime.rego) | `evolith.multi_runtime` | yes | Multi-runtime support (ADR-0040). |
| [multi-tenancy.rego](./multi-tenancy.rego) | `evolith.multi_tenancy` | yes | Multi-tenancy isolation (ADR-0010). |
| [open-core-boundary.rego](./open-core-boundary.rego) | `evolith.open_core_boundary` | yes | Core vs Enterprise separation. |
| [protocol-selection.rego](./protocol-selection.rego) | `evolith.protocol_selection` | yes | Protocol selection rules (ADR-0032). |
| [repository-taxonomy.rego](./repository-taxonomy.rego) | `evolith.repository_taxonomy` | yes | Repository taxonomy enforcement. |
| [satellite-contracts.rego](./satellite-contracts.rego) | `evolith.satellite_contracts` | yes | Satellite contract requirements. |
| [testing-pyramid.rego](./testing-pyramid.rego) | `evolith.testing_pyramid` | yes | Testing pyramid distribution (ADR-0018). |
| [telemetry-evidence.rego](./telemetry-evidence.rego) | `evolith.telemetry_evidence` | _none_ | Observability/telemetry evidence presence. |
| [infrastructure/helm-enforcement.rego](./infrastructure/helm-enforcement.rego) | `evolith.infrastructure.helm` | _none_ | Helm chart enforcement. |
| [infrastructure/opa-sidecar-bundle.rego](./infrastructure/opa-sidecar-bundle.rego) | `evolith.infrastructure.opa_sidecar` | _none_ | OPA sidecar bundle requirements. |

## Second Wasm entrypoint

`evolith.abac` ([abac-mcp-tool-access.rego](./abac-mcp-tool-access.rego)) is additionally exposed as its own `evolith/abac/violations` entrypoint so the MCP gateway can evaluate tool-access decisions in isolation at runtime. The **same** policy is also aggregated into `evolith/main/violations` (it appears in the table above); it is not excluded from `main`.

## Standalone policies (not wired into `main.rego`)

These policies are present in the directory but are **not** imported by `main.rego`, so they do not contribute to the `evolith/main/violations` entrypoint. They are evaluated directly (e.g. by the Native engine or a dedicated harness) and are not yet aggregated.

| Policy | Package | Input schema | Notes |
|---|---|---|---|
| [phase-gates.rego](./phase-gates.rego) | `evolith.phase_gates` | _none_ | SDLC phase-gate evaluation; not yet wired into `main.rego`. |
| [rbac/gate-role-enforcement.rego](./rbac/gate-role-enforcement.rego) | `evolith.rbac.gate` | _none_ | Gate role enforcement (RBAC). |
| [sdlc/coverage.rego](./sdlc/coverage.rego) | `evolith.sdlc.coverage` | _none_ | SDLC coverage checks. |
| [sdlc/pyramid-distribution.rego](./sdlc/pyramid-distribution.rego) | `evolith.sdlc.pyramid` | _none_ | SDLC testing-pyramid distribution. |

> **Inventory:** 34 `.rego` files (excluding `*.test.rego` and `main_test.rego`); `main.rego` is the aggregator. There are 26 input schemas under `schemas/`. Policies listed with input schema **_none_** validate their input inline or are not yet schema-pinned — see [Brechas / parity backlog](../../reference/core/control-center/gaps/gap-tracking.md).

## Running policy tests

Prerequisites: a local OPA binary. `npm run build:policy` downloads OPA `v0.65.0` into `.harness/bin/opa`; alternatively install OPA yourself and put it on `PATH`. No environment variables are required to run the tests.

```bash
# 1. (Once) fetch the pinned OPA binary and build the Wasm bundle
npm run build:policy

# 2. Run all co-located *.test.rego suites
.harness/bin/opa test rulesets/opa/ -v

# 3. Evaluate the aggregated entrypoint against a sample input
.harness/bin/opa eval -b rulesets/opa --input input.json 'data.evolith.main.violations'

# 4. Evaluate only the ABAC tool-access entrypoint
.harness/bin/opa eval -b rulesets/opa --input input.json 'data.evolith.abac.violations'
```

## Troubleshooting

| Symptom | Likely cause | Resolution |
|---|---|---|
| `opa: command not found` / `.harness/bin/opa` missing | Pinned binary not fetched | Run `npm run build:policy` (downloads OPA `v0.65.0`), or install OPA and use it directly. |
| `policy.wasm` not picked up by the Smart CLI | Stale or missing bundle | Re-run `npm run build:policy`; the build installs `policy.wasm` to `sdk/cli/rulesets/opa/policy.wasm`. |
| A new policy is not enforced through `evolith/main/violations` | Not imported/unioned in `main.rego` | Add an `import data.evolith.<pkg>.violations` and a union rule to [`main.rego`](./main.rego); policies in *Standalone policies* are intentionally not aggregated. |
| OPA and Native engines return different verdicts | Dual-Engine Parity drift | Treat as a parity bug — align the `.rego` to the Native `*.rules.json` semantics (see [parity backlog](../../reference/core/control-center/gaps/gap-tracking.md)). |

Authoring standards and the contribution workflow for this layer live in the repo-root [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

---
[Back to Rulesets Hub](../README.md)
