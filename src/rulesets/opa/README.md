# OPA Policies and Input Schemas

This directory contains the Open Policy Agent (OPA) `.rego` policies used for architecture and governance validation in the Evolith platform. Each enforcement policy publishes a `violations` set under the `evolith.*` package namespace, and most are backed by a versioned JSON Schema describing their input under [`schemas/`](./schemas/).

## Source of truth (Markdown vs OPA vs Native rules)

- **Human-authored standards, ADRs, and the engineering constitution under `reference/`** are authoritative for *intent and rationale* — the *why*.
- **`*.rules.json` "Native" rulesets** (under `rulesets/<category>/`) are the canonical machine-readable encoding of each rule — the *what*.
- **OPA `.rego` policies** are a **parity engine**: they re-express the same rule semantics so they can be enforced inside an OPA/Wasm sidecar or CI gate. **OPA must not drift from Native rule semantics** — where both engines apply, they must agree (Dual-Engine Parity).

In short: Markdown explains, Native `*.rules.json` defines, and OPA + the Native evaluator both enforce. When OPA and Native disagree, that is a parity bug, not a license to diverge.

## Compilation and loading

- Script: [`.harness/scripts/compile-opa-wasm.mjs`](../../../.harness/scripts/compile-opa-wasm.mjs), invoked via `npm run build:policy`.
- It downloads OPA `v1.19.0`, then runs `opa build -t wasm` over `rulesets/opa/` with `--ignore=schemas`.
- **Wasm entrypoints (4):** `evolith/main/violations`, `evolith/abac/violations`, `evolith/manifest/declared_rule_ids` and `evolith/manifest/rule_input_paths`. The last two are generated at build time from the policies' AST: the script writes a `manifest.rego` into a staging directory listing every rule id the reachable policies can decide (GT-675 — so the evaluator can tell "evaluated, clean" from "nothing here decides this") and, per rule id, the `input.…` paths its policy reads (GT-716 — so `OpaEvaluator` reports a rule whose fact the run did not supply as `skipped` / `supplied-facet-absent` instead of as a verdict; see *When a fact is absent* below). It is not a file in this directory and must not be committed.
- The extracted `policy.wasm` is installed to `sdk/cli/rulesets/opa/policy.wasm` for the Evolith CLI evaluator.
- `evolith.main` ([main.rego](./main.rego)) aggregates the `violations` sets of the individual policies. `evolith.abac` ([abac-mcp-tool-access.rego](./abac-mcp-tool-access.rego)) is **dual-published**: it is imported and unioned into `evolith/main/violations` (`main.rego` imports `data.evolith.abac.violations` and unions it), *and* it is also exposed as the dedicated `evolith/abac/violations` entrypoint for runtime MCP tool-access decisions.

## When a fact is absent (GT-716)

A Rego body whose fact is missing is *undefined*: `not input.adapter.schemaValidated` fires, `input.satellite.git.branchNameInvalid` never matches. Neither is a verdict about the repository, so `OpaEvaluator` does not report one:

- At build time the bundle records, per rule id, the `input.…` paths its policy reads (`evolith/manifest/rule_input_paths`, extracted from the compiler's AST by [`.harness/scripts/lib/rego-rule-inputs.mjs`](../../../.harness/scripts/lib/rego-rule-inputs.mjs) — direct reads, heads, helper rules followed transitively).
- At evaluation time a declared rule whose input carries **none** of a facet it reads comes back `skipped` with evaluability `supplied-facet-absent` and the facet named. The facet is the first segment under `input`, or the second under `satellite` / `core`: `input.satellite.git` is a facet a caller sends whole, `input.satellite.git.branchNameInvalid` is a field of it.
- Presence is "the key exists", not "the value is truthy": a facet the input builder **observed** decides whatever it observed (`null`, `false`, `[]` are answers), and a facet a caller supplied as `false` was supplied.
- `ABSENCE_IS_A_FACT` (in `opa-evaluator.ts`) exempts the facets whose absence is itself a fact by the design of the policies reading them — `qualityEvidence`, `evaluationDate` (ADR-0111: nothing presented is the verdict), `evidence`, `waiver` (phase gates). Which facts a rule reads, and where their truth lives, is declared in the rule itself (`facts`, GT-716 AC2 — see *One declaration per rule* below); this set is the one judgement left in code.
- A bundle compiled before this entrypoint existed keeps the previous behaviour and says so at `WARN`; `27-opa-parity-gate` fails a bundle that stops exposing it.

To have a rule decided, supply the facet through the evaluation context (`facts.satellite.<facet>`, GT-694). Measured on a satellite fresh from `init` the day this landed: `--engine opa` went from 133 rules "decided" to 10, and the 123 it stopped deciding were all verdicts on input nobody had supplied.

## One declaration per rule (GT-716 AC2)

Every rule in `src/rulesets/**/*.rules.json` declares `facts`: the facets its check reads, by id from [`schema/facets.json`](../schema/facets.json), where each facet carries its **provenance** — where the truth of it lives:

| provenance | meaning | native class when no handler decides the rule |
|---|---|---|
| `observed` | readable from the repository tree; the Core derives it (a native handler, or the input builder) | `unimplemented-native` |
| `supplied` | a posture only the satellite's owners can declare — tenancy, runtime intent, the open-core boundary, an intake record; reaches OPA through `facts.satellite` | `needs-supplied-facts` |
| `external` | held by the forge, the tracker, a registry, a live database, deployed infrastructure, a telemetry backend | `needs-external-system` |
| `runtime` | observable only from the running system or an executed suite | `needs-runtime` |

Both engines derive from that one declaration, and the derivation is checked in both directions:

- **Native:** `classifyRule` reads the rule's facts and takes the class of the most demanding provenance (`runtime` > `external` > `supplied` > `observed`); `facts: []` means no machine-checkable fact (`documentation-only` behind a judgement or a generator placeholder, `underspecified` behind nothing). The triage table that used to hold this per rule id is gone.
- **OPA:** `npm run build:policy` refuses a bundle when a policy reads a facet its rule did not declare, or when a vocabulary entry is declared by no rule and read by no policy. The day it landed, declaring `facts: []` for the twelve rules the table called non-executable while Rego decided them (`KI-R01..07`, `INH-03..05`, `PROT-03/06`) turned the build red with twelve findings; declaring what the policies read is what turned it green — and moved them into the executable denominator.

Adding a rule therefore means declaring what it reads; adding a policy read means the rule's `facts` must name it. What moved when the declaration replaced the table (2026-09-20): the "handler backlog" (`unimplemented-native`) went from 52 to 21 — 25 of those rows were decided by policies over a declared posture, the CI system or a test run, never by a handler over the tree.

What one engine decides and the other does not is then a **registered difference, not a free one** (GT-716 AC3): [`73-validate-engine-coverage-parity.mjs`](../../../.harness/scripts/ci/73-validate-engine-coverage-parity.mjs) runs both engines on this repository and on a satellite fresh from `evolith init`, and holds every coverage-only rule to [`engine-coverage-parity.baseline.json`](../../../.harness/scripts/ci/engine-coverage-parity.baseline.json) — per rule, per scenario, per direction, with the reason the other engine gave (the class its report states, the facets the policy reads that a bare run does not supply). An unregistered rule, a stale entry or a changed class fails; `--write` regenerates the file for review. Nothing in it is a tolerance: it is the list of what each engine cannot yet decide, and why.

## Aggregated enforcement policies

These 35 policies are imported and unioned by [`main.rego`](./main.rego) into the `evolith/main/violations` Wasm entrypoint. Each has a co-located `*.test.rego` and (unless noted) an input schema under `schemas/`. The authoritative list is the `import data.evolith.*` block of `main.rego`; the build refuses a policy that emits rule ids without being imported there.

| Policy | Package | Input schema | Enforces |
|---|---|---|---|
| [abac-mcp-tool-access.rego](./abac-mcp-tool-access.rego) | `evolith.abac` | yes | ABAC for agentic MCP tool execution. **Also published as the separate `evolith/abac/violations` entrypoint** (see below). |
| [version-pinning.rego](./version-pinning.rego) | `evolith.version_pinning` | yes | Strict dependency pinning. |
| [taxonomy.rego](./taxonomy.rego) | `evolith.taxonomy` | yes | Directory taxonomy, ADR file naming, bilingual pairs. |
| [cli-readiness.rego](./cli-readiness.rego) | `evolith.cli_readiness` | yes | Evolith CLI compile/doc/lock-file readiness. |
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
| [phase-gates.rego](./phase-gates.rego) | `evolith.phase_gates` | yes | SDLC phase-gate evaluation: mandatory evidence, blocking criteria, waivers. |
| [sdlc/coverage.rego](./sdlc/coverage.rego) | `evolith.sdlc.coverage` | _none_ | Gate F3 quality thresholds (QT-01..08). |
| [capability-source-interface.rego](./capability-source-interface.rego) | `evolith.capability_source_interface` | _none_ | Mirrors the Agent Runtime `GovernancePosture.allowedSourceInterfaces` guard. |
| [cli-exit-code-taxonomy.rego](./cli-exit-code-taxonomy.rego) | `evolith.cli_exit_code_taxonomy` | _none_ | The CLI exit-code taxonomy as policy (GT-580), over the facts document of `exit-code-taxonomy-facts.mjs`. |
| [probabilistic-evidence-admissibility.rego](./probabilistic-evidence-admissibility.rego) | `evolith.probabilistic_evidence_admissibility` | _none_ | Probabilistic evidence may not reach a blocking verdict unmeasured (GT-584, ADR-0111). |
| [topology-composition.rego](./topology-composition.rego) | `evolith.topology_composition` | _none_ | Rules that discriminate on the confirmed topology composition (GT-688). |

## Second Wasm entrypoint

`evolith.abac` ([abac-mcp-tool-access.rego](./abac-mcp-tool-access.rego)) is additionally exposed as its own `evolith/abac/violations` entrypoint so the MCP gateway can evaluate tool-access decisions in isolation at runtime. The **same** policy is also aggregated into `evolith/main/violations` (it appears in the table above); it is not excluded from `main`.

## Standalone policies (not wired into `main.rego`)

These policies are present in the directory but are **not** imported by `main.rego`, so they do not contribute to the `evolith/main/violations` entrypoint. They are evaluated directly (e.g. by the Native engine or a dedicated harness) and are not yet aggregated.

| Policy | Package | Input schema | Notes |
|---|---|---|---|
| [rbac/gate-role-enforcement.rego](./rbac/gate-role-enforcement.rego) | `evolith.rbac.gate` | _none_ | Gate role enforcement (RBAC). |
| [sdlc/pyramid-distribution.rego](./sdlc/pyramid-distribution.rego) | `evolith.sdlc.pyramid` | _none_ | SDLC testing-pyramid distribution. |
| [engine-routing.rego](./engine-routing.rego) | `evolith.engine_routing` | _none_ | Fail-closed routing of a request to an engine (`stub` unless risk signals say otherwise); a decision, not a `violations` set. |
| [architecture-planning-gate.rego](./architecture-planning-gate.rego) | `evolith.governance.architecture_planning` | _none_ | Derives the SDLC mode (`minimal` … `rejected`) an architecture plan must follow; a decision, not a `violations` set. |

> **Inventory (2026-09-20):** 39 policy `.rego` files plus `main.rego`, the aggregator (excluding `*.test.rego` and `main_test.rego`): 35 aggregated above, 4 standalone here. There are 27 input schemas under `schemas/`. Re-derive with `node .harness/scripts/pages/derive-page-metrics.mjs` (`corpus.opaPolicies`, `corpus.opaEntrypoints`). Policies listed with input schema **_none_** validate their input inline or are not yet schema-pinned — see [Brechas / parity backlog](../../../reference/core/control-center/gaps/gap-tracking.md).

## Running policy tests

Prerequisites: a local OPA binary. `npm run build:policy` downloads OPA `v1.19.0` into `.harness/bin/opa`; alternatively install OPA yourself and put it on `PATH`. No environment variables are required to run the tests.

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
| `opa: command not found` / `.harness/bin/opa` missing | Pinned binary not fetched | Run `npm run build:policy` (downloads OPA `v1.19.0`), or install OPA and use it directly. |
| `policy.wasm` not picked up by the Evolith CLI | Stale or missing bundle | Re-run `npm run build:policy`; the build installs `policy.wasm` to `sdk/cli/rulesets/opa/policy.wasm`. |
| A new policy is not enforced through `evolith/main/violations` | Not imported/unioned in `main.rego` | Add an `import data.evolith.<pkg>.violations` and a union rule to [`main.rego`](./main.rego); policies in *Standalone policies* are intentionally not aggregated. |
| OPA and Native engines return different verdicts | Dual-Engine Parity drift | Treat as a parity bug — align the `.rego` to the Native `*.rules.json` semantics (see [parity backlog](../../../reference/core/control-center/gaps/gap-tracking.md)). |

Authoring standards and the contribution workflow for this layer live in the repo-root [`CONTRIBUTING.md`](../../../CONTRIBUTING.md).

---
[Back to Rulesets Hub](../README.md)
