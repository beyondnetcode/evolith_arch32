# Evolith Core — Gap Tracking Board

> **Bilingual Navigation:** [Versión en Español](./gap-tracking.es.md)

**Status:** Active Tracking
**Owner:** Evolith Architecture Board
**Created:** 2026-06-10
**Last Updated:** 2026-06-12
**References:** [Product Vision Master](./evolith-product-vision-master.md) · [SDLC Tracker Technical Interfaces](./sdlc-tracker-technical-interfaces.md) · [Maturity Assessment](./maturity-assessment.md) · [ADR Authoring Standard](../../../architecture/adrs/adr-authoring-standard.md)

---

## 1. Purpose & Usage

This board is the **single source of truth for gap tracking** in Evolith Core. It tracks every open gap between the product vision and the current implementation, so progress can be monitored and items closed one by one.

It supersedes and absorbs (2026-06-10): `gap-analysis-core.md` (narrative gap analysis — its closed G-01…G-27 series is archived in [section 5](#5-legacy-archive-g-series-closed)) and the root scratchpad `cli-core-parity-tracking.md`. **No other gap or tracking document may be created**; new gaps get a `GT-xx` ID here.

**How to update:** every gap must declare a clear problem, product purpose, current evidence or example, closure criteria, and references. When a gap changes state, update its row in the dashboard, its `Status` field in the detail section, the progress totals, and the `Last Updated` date. A gap is `DONE` only when its closure evidence is committed and the applicable build, test, smoke, documentation, or product-validation gates pass.

### Legend

| Field | Values |
|---|---|
| **Criticality** | `P0` blocks the governance kernel, release baseline, or product proof · `P1` materially limits adoption or integrity · `P2` deferred / opportunistic |
| **Complexity** | `S` ≤ 1 session · `M` 1–3 sessions · `L` multi-session / incremental |
| **Status** | `PENDING` · `IN-PROGRESS` · `DONE` · `DEFERRED` |

**Ordering rule:** criticality (`P0` → `P1` → `P2`), active status (`IN-PROGRESS` → `PENDING` → `DEFERRED`), then complexity (`S` → `M` → `L`). Completed gaps are listed after active work for traceability.

---

## 2. Dashboard

### 2.1 Recommended Execution Order (pending work queue)

The queue contains only active or deferred work. It is ordered by the rule in section 1 and may be further constrained by dependencies, especially GT-28 before release-oriented work, GT-30 before GT-31, and GT-22 before GT-21.

| # | ID | Gap and product purpose | Current evidence / example | Crit. | Compl. | Status | Refs |
|:-:|----|-------------------------|----------------------------|:---:|:---:|:---:|------|
| 1 | [GT-28](#gt-28) | Restore a release-capable CLI baseline | `npm run build`, `npm test`, and `npm run mcp:smoke` currently fail | P0 | M | IN-PROGRESS | [Smart CLI](../../../../sdk/cli/README.md) |
| 2 | [GT-29](#gt-29) | Guarantee Native/OPA rule parity required by R-25 | OPA contains placeholders; new F1 rules lack equivalent proven Native behavior | P0 | L | IN-PROGRESS | [Global Rules](../../../../.harness/rules/global-rules.md) |
| 3 | [GT-32](#gt-32) | Validate the customer and buying hypothesis before scaling construction | Vision explicitly says interviews and controlled experiments are still required | P0 | M | PENDING | [Product Vision](./evolith-product-vision-master.md) |
| 4 | [GT-30](#gt-30) | Implement the minimum Tracker governance kernel | Tracker has extensive specifications but no executable source implementation | P0 | L | PENDING | [Tracker Product Design](../../../products/evolith-tracker/README.md) |
| 5 | [GT-31](#gt-31) | Prove one product through all five governed gates | No operational tenant-to-production Evidence Graph demonstration exists | P0 | L | PENDING | [Minimum Provable Product](./evolith-product-vision-master.md#10-minimum-provable-product) |
| 6 | [GT-07](#gt-07) | Release-gate gate evaluation over stdio and HTTP | Smoke code includes both paths but cannot pass while GT-28 remains open | P1 | S | IN-PROGRESS | [MCP rules](../../../../rulesets/mcp/README.md) |
| 7 | [GT-08](#gt-08) | Reject Design Baselines without real ADR backing | Content check exists in the working tree but lacks a green release baseline | P1 | S | IN-PROGRESS | [Quality Gates](../../sdlc/quality-gates.md) |
| 8 | [GT-09](#gt-09) | Block Successful Build below the coverage threshold | `coverage-summary.json` parsing exists but is not release-verified | P1 | S | IN-PROGRESS | [Quality Gates](../../sdlc/quality-gates.md) |
| 9 | [GT-12](#gt-12) | Make every write command safely previewable | `adr` and `architecture scaffold` include dry-run changes in the broken refactor | P1 | S | IN-PROGRESS | [ADR 0073](../../../architecture/adrs/core/0073-unified-cli-output-contract.md) |
| 10 | [GT-14](#gt-14) | Push GateEvidence to Tracker or another authorized consumer | Webhook adapter exists in the working tree; full tests are not green | P1 | S | IN-PROGRESS | [Tracker Interfaces](./sdlc-tracker-technical-interfaces.md) |
| 11 | [GT-05](#gt-05) | Adopt MCP SDK Streamable HTTP with supported sessions | SDK wrapper exists; HTTP tests are skipped and the build fails | P1 | M | IN-PROGRESS | [MCP rules](../../../../rulesets/mcp/README.md) |
| 12 | [GT-10](#gt-10) | Block RC on missing or failing High/Critical security evidence | Current logic checks file presence, not vulnerability content | P1 | M | IN-PROGRESS | [Quality Gates](../../sdlc/quality-gates.md) |
| 13 | [GT-11](#gt-11) | Block Production Live without verified observability and rollback | Current logic checks artifact presence, not operational readiness content | P1 | M | IN-PROGRESS | [Traceability Model](../../sdlc/traceability-model.md) |
| 14 | [GT-17](#gt-17) | Consolidate DI and enforce strict architecture boundaries | Refactor introduces BaseCommand/DI changes but currently breaks Nest resolution | P1 | M | IN-PROGRESS | [Modular Evolution Playbook](../../../../.harness/playbooks/modular-monolith-evolution-playbook.md) |
| 15 | [GT-19](#gt-19) | Reduce the `core/` god-layer to composition only | `core/` is about 17k TypeScript lines and domain ports still import core types | P1 | L | IN-PROGRESS | [ADR Authoring Standard](../../../architecture/adrs/adr-authoring-standard.md) |
| 16 | [GT-18](#gt-18) | Make the open-core CLI installable from npm | Public installation is not yet verified from a clean environment | P1 | S | PENDING | [Smart CLI](../../../../sdk/cli/README.md) |
| 17 | [GT-34](#gt-34) | Reprioritize the roadmap around governance proof | Multi-cloud/Dapr ambitions currently outrun product validation | P1 | S | PENDING | [Evolutionary Roadmap](./evolutionary-strategy-roadmap.md) |
| 18 | [GT-13](#gt-13) | Evaluate a complete phase-transition proposal in one call | No `evolith-phase-advance` implementation exists | P1 | M | PENDING | [Tracker Interfaces](./sdlc-tracker-technical-interfaces.md) |
| 19 | [GT-33](#gt-33) | Score maturity from operational evidence, not documentation volume | Assessment reports Managed/Adopted while current build and tests fail | P1 | M | PENDING | [Maturity Assessment](./maturity-assessment.md) |
| 20 | [GT-35](#gt-35) | Generate repository inventories and dashboard totals automatically | Published counts lag the current 47 JSON, 17 schemas, and 9 Rego files | P1 | M | PENDING | [Rulesets Hub](../../../../rulesets/README.md) |
| 21 | [GT-20](#gt-20) | Complete ADR decision evidence without fabricating history | 162 ADR files contain approximately 697 GT-20 markers | P1 | L | PENDING | [ADR Authoring Standard](../../../architecture/adrs/adr-authoring-standard.md) |
| 22 | [GT-22](#gt-22) | Make ADR identities unambiguous across runtime categories | Core, Node.js, and .NET reuse several numeric IDs | P2 | S | PENDING | [ADR Matrix](../../../architecture/adrs/adr-matrix.md) |
| 23 | [GT-26](#gt-26) | Replace the Phase 5 placeholder with an operational release playbook | SDLC navigation still announces a future runbook | P2 | S | PENDING | [SDLC Center](../../sdlc/README.md) |
| 24 | [GT-21](#gt-21) | Separate universal principles from tool-specific ADR choices | Nx, Dapr, Redis, Kong, CodeQL, and MCP decisions need classification review | P2 | M | PENDING | [ADR Authoring Standard](../../../architecture/adrs/adr-authoring-standard.md) |
| 25 | [GT-24](#gt-24) | Align physical documentation locations with the declared taxonomy | Six migration markers remain across product and SDK documentation | P2 | M | PENDING | [Documentation Taxonomy](../../../documentation-taxonomy.md) |
| 26 | [GT-23](#gt-23) | Replace Spanish skeletons with usable translations | 76 skeleton markers remain under `reference/` and `rulesets/` | P2 | L | PENDING | [Bilingual Index](../../../navigation/BILINGUAL_INDEX.md) |
| 27 | [GT-25](#gt-25) | Populate provider guidance with real profiles | Platform categories currently contain hubs/catalogs but no provider profiles | P2 | L | PENDING | [Platforms Hub](../../../platforms/README.md) |
| 28 | [GT-36](#gt-36) | Define language authority and coverage for machine-readable rules | 27 EN rulesets exist while only 3 ES JSON counterparts are present | P2 | L | PENDING | [Bilingual Governance](../../../../.harness/rules/global-rules.md) |
| 29 | [GT-15](#gt-15) | Add governed conversational sessions after Tracker state exists | Chat storage and authority depend on the Tracker kernel | P2 | L | DEFERRED | [Tracker Product Design](../../../products/evolith-tracker/README.md) |

### 2.2 Full Dashboard

| ID | Gap | Phase | Criticality | Complexity | Status |
|----|-----|:---:|:---:|:---:|:---:|
| [GT-28](#gt-28) | Restore CLI build, test, and smoke baseline | F0 | P0 | M | IN-PROGRESS |
| [GT-29](#gt-29) | Native/OPA rule execution parity | F1 | P0 | L | IN-PROGRESS |
| [GT-32](#gt-32) | Customer and buyer hypothesis validation | Product | P0 | M | PENDING |
| [GT-30](#gt-30) | Minimum Tracker governance kernel | Product | P0 | L | PENDING |
| [GT-31](#gt-31) | Minimum Provable Product vertical slice | Product | P0 | L | PENDING |
| [GT-07](#gt-07) | MCP gate-evaluation release smoke | F2 | P1 | S | IN-PROGRESS |
| [GT-08](#gt-08) | Phase 2 real ADR registry validation | F3 | P1 | S | IN-PROGRESS |
| [GT-09](#gt-09) | Phase 3 real coverage enforcement | F3 | P1 | S | IN-PROGRESS |
| [GT-12](#gt-12) | `--dry-run` on all write operations | F3 | P1 | S | IN-PROGRESS |
| [GT-14](#gt-14) | Outbound webhook on gate completion | F4 | P1 | S | IN-PROGRESS |
| [GT-05](#gt-05) | MCP SDK Streamable HTTP transport | F2 | P1 | M | IN-PROGRESS |
| [GT-10](#gt-10) | Phase 4 security scan content validation | F3 | P1 | M | IN-PROGRESS |
| [GT-11](#gt-11) | Phase 5 observability and rollback validation | F3 | P1 | M | IN-PROGRESS |
| [GT-17](#gt-17) | DI consolidation and strict boundaries | F5 | P1 | M | IN-PROGRESS |
| [GT-19](#gt-19) | Incremental hexagonal migration of `core/` | Cross | P1 | L | IN-PROGRESS |
| [GT-18](#gt-18) | Publish `@evolith/smart-cli` to npm | F5 | P1 | S | PENDING |
| [GT-34](#gt-34) | Roadmap reprioritization around governance proof | Product | P1 | S | PENDING |
| [GT-13](#gt-13) | `evolith-phase-advance` proposal runner | F4 | P1 | M | PENDING |
| [GT-33](#gt-33) | Evidence-backed maturity scoring | Product | P1 | M | PENDING |
| [GT-35](#gt-35) | Automated inventories and tracking validation | Cross | P1 | M | PENDING |
| [GT-20](#gt-20) | ADR content backfill to authoring standard | Cross | P1 | L | PENDING |
| [GT-22](#gt-22) | ADR ID uniqueness scheme | Cross | P2 | S | PENDING |
| [GT-26](#gt-26) | Zero-Downtime Release Playbook | Cross | P2 | S | PENDING |
| [GT-21](#gt-21) | Placement review of tool-centric Core ADRs | Cross | P2 | M | PENDING |
| [GT-24](#gt-24) | Execute declared documentation migrations | Cross | P2 | M | PENDING |
| [GT-23](#gt-23) | Spanish translation backfill | Cross | P2 | L | PENDING |
| [GT-25](#gt-25) | First provider profiles | Cross | P2 | L | PENDING |
| [GT-36](#gt-36) | Machine-readable rules language coverage | Cross | P2 | L | PENDING |
| [GT-15](#gt-15) | Session-aware chatbox endpoint | F4 | P2 | L | DEFERRED |
| [GT-01](#gt-01) | Unified contract ADR (output envelope + GateEvidence + global flags) | F0 | P0 | S | DONE |
| [GT-02](#gt-02) | `GateEvidence` modeled in the domain layer | F1 | P0 | M | DONE |
| [GT-03](#gt-03) | `EvaluateGateUseCase` + `gate evaluate` command | F1 | P0 | M | DONE |
| [GT-06](#gt-06) | MCP tool `evolith-gate-evaluate` + phase context on existing tools | F2 | P0 | M | DONE |
| [GT-04](#gt-04) | Remove service locator from domain · relocate telemetry | F1 | P1 | S | DONE |
| [GT-16](#gt-16) | Documentation consolidation (single source of truth) | F5 | P2 | S | DONE |
| [GT-27](#gt-27) | Canonical tracking semantic consistency | Cross | P0 | S | DONE |

**Progress:** 7 / 36 done · 12 in progress · 16 pending · 1 deferred

---

## 3. Gap Details

### Phase F0 — Contract First

<a name="gt-01"></a>
#### GT-01 · Unified contract ADR

- **Criticality:** P0 · **Complexity:** S · **Status:** DONE (2026-06-10) — ratified as [ADR 0073](../../../architecture/adrs/core/0073-unified-cli-output-contract.md), approved by the Board, including the command-as-a-service execution model; both interface documents (Core and Tracker repos) point to the ADR
- **Objective:** 
  - [x] Write and approve a single ADR in Evolith Core reconciling the two divergent contract proposals — the Core-side [`GateEvidence`](./sdlc-tracker-technical-interfaces.md) structure and the Tracker-side output envelope (`{success, data, meta}`, error codes, global flags `--format/--dry-run/--phase`).
  - [x] Resolve binary naming (`smart-cli` vs `evolith` alias). Verified 2026-06-10: all 27 rulesets already have a `version` field consumable as `rulesetVersion`.
- **Done when:** 
  - [x] ADR approved by the Architecture Board.
  - [x] Core gap document updated pointing to it.
  - [ ] Tracker gap document updated pointing to it.

### Phase F1 — GateEvidence as Domain

<a name="gt-02"></a>
#### GT-02 · `GateEvidence` modeled in the domain layer

- **Criticality:** P0 · **Complexity:** M · **Status:** DONE (2026-06-10)
- **Objective:** Implement `GateEvidence` (`verdict`, `violations[]`, `rulesetRef`, `rulesetVersion`, `evaluatedAt`, `evaluatedBy`) and the output envelope as domain types in `sdk/cli/src/domain/`, with a JSON schema published in `rulesets/schema/`.
- **Closed by:** `sdk/cli/src/domain/gate-evidence.ts` (pure domain types + envelope constructors + `deriveVerdict`), `rulesets/schema/gate-evidence.schema.json` and `rulesets/schema/output-envelope.schema.json`, 18 unit tests validating domain-built samples against both schemas via ajv.

<a name="gt-03"></a>
#### GT-03 · `EvaluateGateUseCase` + `gate evaluate` command

- **Criticality:** P0 · **Complexity:** M · **Status:** DONE (2026-06-10)
- **Objective:** Create an application-layer use case orchestrating `phase-gate-validator.service` and `rule-evaluation-engine` (clarifying their overlapping responsibilities), exposed as `gate evaluate --phase <p> --format json` emitting the GT-02 contract.
- **Closed by:** `EvaluateGateUseCase` (application layer; responsibility boundary documented: gates → PhaseGateValidatorService, general ruleset compliance → RuleEvaluationEngine via `validate`), new `gate` command emitting the ADR-0073 envelope with context echo and exit code 1 on failed gates; 6 unit tests + 8 E2E tests validating schema-valid `GateEvidence` for all 5 phases plus error envelopes (INVALID_PHASE, VALIDATION_FAILED). Full suite: 1 510 tests green.

<a name="gt-04"></a>
#### GT-04 · Remove service locator from domain · relocate telemetry

- **Criticality:** P1 · **Complexity:** S · **Status:** DONE (2026-06-10)
- **Objective:** The `domain` layer currently relies on a `ServiceLocator` (e.g., in `gate-evidence.ts`) to resolve telemetry and correlation IDs. This violates the Clean Architecture principle that domain entities must be pure and free of infrastructure or DI framework concepts. Move telemetry/correlation injection to the `application` layer (use cases).
- **Done when:** `ServiceLocator` and `@nestjs/core` imports are completely removed from `sdk/cli/src/domain/`; use cases pass correlation IDs to domain factories explicitly.
- **Closed by:** Domain service locator was fully removed in previous refactors (GT-02/03). Telemetry service was relocated from `domain/services/tool-usage-telemetry.service.ts` to `core/observability/`, completing the layer purge. Correlation ID passing via explicit `meta` payload in `createSuccessEnvelope` is already in place.

### Phase F2 — MCP Exposure

<a name="gt-05"></a>
#### GT-05 · Replace `MinimalHttpTransport` with MCP SDK Streamable HTTP

- **Criticality:** P1 · **Complexity:** M · **Status:** IN-PROGRESS
- **Objective:** Drop the hand-rolled `node:http` transport (~300 lines of `server.ts`) in favor of the official `@modelcontextprotocol/sdk` Streamable HTTP transport, gaining session handling and spec compliance.
- **Current evidence:** `StreamableHTTPServerTransport` and a wrapper exist in the working tree, but the CLI does not compile and three HTTP-oriented test blocks remain skipped.
- **Done when:** HTTP/SSE smoke passes against the SDK transport; `server.ts` no longer contains transport plumbing.

<a name="gt-06"></a>
#### GT-06 · MCP tool `evolith-gate-evaluate` + phase context

- **Criticality:** P0 · **Complexity:** M · **Status:** DONE (2026-06-10)
- **Objective:** 
  - [x] Expose the GT-03 use case as the MCP tool `evolith-gate-evaluate` accepting `{phase, projectPath, rulesetRef, evidenceMode}`. This is the Tracker's primary integration point.
  - [ ] Extend existing tools to accept the phase context.
- **Done when:** an external MCP client evaluates a gate over HTTP and receives schema-valid `GateEvidence`.
- **Closed by:** tool exposed via `sdk/cli/src/core/mcp/tools/gate.ts`, integrated in `server.ts` and verified in `mcp:smoke` (HTTP and stdio). Phase context omitted from existing SDLC tools to avoid backwards compatibility breaks in their schemas.

<a name="gt-07"></a>
#### GT-07 · Extend `mcp:smoke` for gate evaluation over HTTP

- **Criticality:** P1 · **Complexity:** S · **Status:** IN-PROGRESS
- **Objective:** Add `evolith-gate-evaluate` round-trips (stdio + HTTP) to the release smoke suite so the Tracker contract is release-gated.
- **Current evidence:** the smoke script contains stdio and Streamable HTTP gate calls, but `npm run mcp:smoke` stops at the failing TypeScript build.
- **Done when:** `npm run mcp:smoke` fails if the gate-evaluate contract regresses.

### Phase F3 — Complete Gate Evidence (62% → 100%)

<a name="gt-08"></a>
#### GT-08 · Phase 2 gate: real ADR registry check

- **Criticality:** P1 · **Complexity:** S · **Status:** IN-PROGRESS
- **Objective:** Deepen the current existence-only check (`adr-matrix.json` present) into content validation: design decisions must reference existing ADR registry entries, with violations emitted into `GateEvidence`.
- **Current evidence:** the working tree parses `adr-matrix.json` and rejects an empty registry, but the change is not closure evidence until build and tests pass.
- **Done when:** a satellite missing ADR backing fails the Design Baseline gate with an actionable violation.

<a name="gt-09"></a>
#### GT-09 · Phase 3 gate: real coverage check

- **Criticality:** P1 · **Complexity:** S · **Status:** IN-PROGRESS
- **Objective:** Deepen the current existence-only check (`coverage/` directory present) into threshold enforcement: parse the coverage report and block below the ≥80% defined in `phase-gates.rules.json`.
- **Current evidence:** `coverage/coverage-summary.json` parsing and the 80% statement threshold exist in the working tree; release verification remains blocked by GT-28.
- **Done when:** coverage below threshold produces a blocking violation in the Successful Build gate.

<a name="gt-10"></a>
#### GT-10 · Phase 4 gate: security scan evidence

- **Criticality:** P1 · **Complexity:** M · **Status:** IN-PROGRESS
- **Objective:** Deepen the current existence-only check (`security-scan.json` present) into content validation: parse the SAST report and block on High/Critical CVEs before stamping an RC.
- **Current evidence:** the validator currently checks only whether `security-scan.json` exists; it does not inspect severity counts, scanner status, or accepted exceptions.
- **Done when:** missing or failing scan evidence blocks the RC Stamped gate.

<a name="gt-11"></a>
#### GT-11 · Phase 5 gate: observability + rollback evidence

- **Criticality:** P1 · **Complexity:** M · **Status:** IN-PROGRESS
- **Objective:** Deepen the current existence-only checks (`observability/` directory, Release Notes present) into content validation of observability readiness and a documented rollback procedure.
- **Current evidence:** current checks accept directory/document presence without validating health indicators, alert ownership, rollback commands, triggers, or rehearsal evidence.
- **Done when:** absent rollback/observability artifacts block the Production Live gate.

<a name="gt-12"></a>
#### GT-12 · `--dry-run` on all write operations

- **Criticality:** P1 · **Complexity:** S · **Status:** IN-PROGRESS
- **Objective:** Close the remaining `--dry-run` coverage: `init`, `agents`, `upgrade`, `docs`, and `generate-domain` already support it (verified 2026-06-10); `architecture scaffold` and `adr` do not.
- **Current evidence:** both remaining commands contain dry-run code and tests in the working tree, but the complete CLI baseline is red.
- **Done when:** every write command supports `--dry-run` with verified zero filesystem mutations.

### Phase F4 — Automation & Events

<a name="gt-13"></a>
#### GT-13 · `evolith-phase-advance` autonomous gate runner

- **Criticality:** P1 · **Complexity:** M · **Status:** PENDING
- **Objective:** Compose GT-03 into an agent/tool that evaluates a proposed phase transition without a human trigger and returns consolidated evidence.
- **Authority guardrail:** this tool may recommend `pass` or `fail`, but only Evolith Tracker may mutate the canonical phase state.
- **Example:** `evolith-phase-advance --from design --to construction` evaluates every Design Baseline criterion and returns a transition proposal plus per-gate evidence.
- **Done when:** one call yields a schema-valid transition proposal with per-gate evidence and no direct canonical-state mutation.

<a name="gt-14"></a>
#### GT-14 · Outbound webhook on gate completion

- **Criticality:** P1 · **Complexity:** S · **Status:** IN-PROGRESS
- **Objective:** Infrastructure adapter that POSTs `GateEvidence` to a caller-supplied webhook URL when an evaluation completes. The CLI stays stateless — the URL is always a parameter.
- **Current evidence:** `WebhookAdapter` and the notifier port exist in the working tree; integration closure depends on a green baseline and a receiving-listener test.
- **Done when:** integration test receives the evidence payload on a local listener.

<a name="gt-15"></a>
#### GT-15 · Session-aware chatbox endpoint

- **Criticality:** P2 · **Complexity:** L · **Status:** DEFERRED
- **Objective:** Conversational HTTP endpoint (`POST /chat`) with session awareness, per the Tracker interface design.
- **Deferred because:** depends on Tracker session storage (`ChatboxSession`) existing; building it first would be speculative. Revisit once the Tracker MVP consumes GT-06.

### Phase F5 — Hygiene & Publication

<a name="gt-16"></a>
#### GT-16 · Documentation consolidation

- **Criticality:** P2 · **Complexity:** S · **Status:** DONE (2026-06-10)
- **Objective:** Make this board the single tracking surface: remove the stale root `cli-core-parity-tracking.md` and `gap-analysis-core.md`, absorb their live content, and repoint all references.
- **Closed by:** consolidation of 2026-06-10 — both documents removed, G-series archived in [section 5](#5-legacy-archive-g-series-closed), all repository references repointed to this board.

<a name="gt-17"></a>
#### GT-17 · DI consolidation + ESLint boundary hardening

- **Criticality:** P1 · **Complexity:** M · **Status:** IN-PROGRESS
- **Objective:** Retire the custom `DIContainer` in favor of NestJS DI, then tighten `.eslintrc.js` boundaries: remove `domain → core` and `application → infrastructure` allowances.
- **Current evidence:** lint passes and the working tree introduces shared command abstractions, but Nest module tests fail dependency resolution and production build has DI/type errors.
- **Done when:** single DI mechanism; stricter boundaries pass on a clean lint run.

<a name="gt-18"></a>
#### GT-18 · Publish `@evolith/smart-cli` to npm

- **Criticality:** P1 · **Complexity:** S · **Status:** PENDING
- **Objective:** Publish the CLI publicly per the open-core strategy (CLI + MCP free tier) with npm scope ownership, provenance, versioning, clean-install smoke, and release documentation.
- **Dependency:** GT-28, GT-05, and GT-07 must be closed first.
- **Done when:** `npm i -g @evolith/smart-cli` works from the public registry.

### Cross-cutting

<a name="gt-19"></a>
#### GT-19 · Incremental hexagonal migration of `core/`

- **Criticality:** P1 · **Complexity:** L · **Status:** IN-PROGRESS
- **Objective:** Dissolve the ~17k-line `core/` god-layer incrementally: pure logic → `domain/`, orchestration → `application/`, adapters (MCP, observability, providers) → `infrastructure/`, leaving `core/` as composition root only. Advances opportunistically with every phase above — never as a big-bang rewrite.
- **Current evidence:** `domain` ports and infrastructure adapters still import `NormalizedRule` from `core/validators`, showing that ownership direction is not yet clean.
- **Done when:** `core/` contains only DI/bootstrap; ESLint boundaries enforce strict hexagonal rules (see GT-17) with zero exceptions.

<a name="gt-20"></a>
#### GT-20 · ADR content backfill to authoring standard

- **Criticality:** P1 · **Complexity:** L · **Status:** PENDING
- **Objective:** Complete the sections added as stubs by the 2026-06-10 ADR standardization (approximately 697 markers across 162 files): Objective and Scope, Options Considered, Evidence and Evaluation Criteria, Related Decisions and Standards — plus Technology Watch and Current Sources for platform ADRs — per the [ADR Authoring Standard](../../../architecture/adrs/adr-authoring-standard.md). Backfill must reconstruct honestly (cite what was actually evaluated; mark unknowns as unknown), never fabricate history.
- **Done when:** no ADR contains a `GT-20` backfill marker; spot-check confirms content quality on the 10 highest-traffic ADRs.

<a name="gt-21"></a>
#### GT-21 · Placement review of tool-centric Core ADRs

- **Criticality:** P2 · **Complexity:** M · **Status:** PENDING
- **Objective:** Apply the Core-vs-Platform litmus test from the [ADR Authoring Standard](../../../architecture/adrs/adr-authoring-standard.md) to the tool-centric Core ADRs — candidates: 0001 (Nx), 0005 (CodeQL), 0006/0046 (Dapr), 0014 (Redis), 0030 (Kong vs NestJS), 0069 (MCP). For each: keep in core rewritten as agnostic principle, relocate to a platform category, or split (agnostic Core ADR + tool-choice Platform ADR). Every relocation must fix all inbound links in the same change.
- **Done when:** every Core ADR passes the litmus test; relocated ADRs carry the relocation note; no broken links.

<a name="gt-22"></a>
#### GT-22 · ADR ID uniqueness scheme

- **Criticality:** P2 · **Complexity:** S · **Status:** PENDING
- **Objective:** Resolve the cross-category ID collisions (core/0044–0048 vs nodejs/0044–0048; core/0069–0072 vs dotnet/0069–0072): decide between global renumbering (high link blast radius) or formalized category-qualified citation (`core/ADR-0044`), and update `adr-matrix` and rulesets accordingly. The Authoring Standard provisionally mandates category-qualified citation.
- **Done when:** the decision is recorded (ADR or standard update) and `adr-matrix` reflects unambiguous identities.

<a name="gt-23"></a>
#### GT-23 · Spanish translation backfill of the reference corpus

- **Criticality:** P2 · **Complexity:** L · **Status:** PENDING
- **Goal:** every document under `reference/` and `rulesets/` is readable in Spanish with no declared skeleton placeholders.
- **Objective:** Translate the 76 files currently marked "esqueleto inicial / pendiente de traducción", concentrated in `governance/standards/ai-augmented/*`, `knowledge/architecture-intelligence/patterns`, and selected ADR bodies. English remains the deciding source; Spanish mirrors header structure. Tool-consumed skeletons under `.harness/` and `.bmad-core/` remain out of scope unless promoted into the reference corpus.
- **Done when:** `grep -rl "pendiente de traducción" reference/ rulesets/` returns zero files and `check-bilingual-parity.mjs` passes.
- **References:** [Bilingual Index](../../../navigation/BILINGUAL_INDEX.md) · [Terminology Glossary](../../../../.harness/scripts/bilingual-terminology-glossary.md)

<a name="gt-24"></a>
#### GT-24 · Execute declared documentation migrations

- **Criticality:** P2 · **Complexity:** M · **Status:** PENDING
- **Goal:** the physical location of every document matches its declared taxonomy classification — no more "migration pending" notes.
- **Objective:** Execute the migrations the hubs already declare: (1) move suite vision/strategy/positioning documents from the legacy `governance/standards/vision/` path into their `product-suite/` areas; (2) migrate Smart CLI and MCP Services documentation into `reference/products/`; (3) promote [Provider Abstraction and Plugin Model](./evolith-provider-abstraction-plugin-model.md) to a Core architecture principle; (4) move [Tracker Technical Interfaces](./sdlc-tracker-technical-interfaces.md) to the Tracker product design. Each move leaves a compatibility stub at the old path and fixes every inbound link in the same change.
- **Done when:** no "migration pending / migración pendiente" marker remains in `reference/` or `sdk/`; `validate-docs.mjs` passes.
- **References:** [Product Suite Hub](../../../product-suite/README.md) · [Product Designs Hub](../../../products/README.md) · [Documentation Taxonomy](../../../documentation-taxonomy.md)

<a name="gt-25"></a>
#### GT-25 · First provider profiles for platform categories

- **Criticality:** P2 · **Complexity:** L · **Status:** PENDING
- **Goal:** the Platform Guidance domain stops being an empty promise — each planned category holds at least one real provider profile.
- **Objective:** Author provider profiles following the required-content checklist in the [Platforms Hub](../../../platforms/README.md) (capabilities, limitations, licensing, tenant isolation, adapter mapping, replaceability, current sources), starting with the categories the products already depend on: `scm/` (GitHub), `ci-cd/` (GitHub Actions), `observability/` (OTel stack), `security/` (CodeQL/Trivy).
- **Done when:** every category directory exists with ≥1 profile (EN+ES) linked from the platforms hub table.
- **References:** [Platforms Hub](../../../platforms/README.md) · [Validated Tool Catalog](../../../platforms/validated-tool-catalog.md)

<a name="gt-26"></a>
#### GT-26 · Zero-Downtime Release Playbook

- **Criticality:** P2 · **Complexity:** S · **Status:** PENDING
- **Goal:** SDLC Phase 5 links a real operational runbook instead of a "Coming Soon" placeholder.
- **Objective:** Write the blue-green and canary deployment playbook announced in the [SDLC Governance Center](../../sdlc/README.md) Phase 5 table (EN+ES), covering zero-downtime constraints, rollback triggers, and observability checkpoints, and link it from the Phase 5 artifact table.
- **Done when:** the Phase 5 row links the playbook and no "Coming Soon / Próximamente" marker remains in the SDLC center.
- **References:** [SDLC Governance Center](../../sdlc/README.md) · [Quality Gates](../../sdlc/quality-gates.md)

### Tracking Integrity

<a name="gt-27"></a>
#### GT-27 · Canonical tracking semantic consistency

- **Criticality:** P0 · **Complexity:** S · **Status:** DONE (2026-06-12)
- **Gap:** The canonical board contained a duplicated GT-19, completed work in the active queue, contradictory EN/ES statuses, and totals that no longer matched the detailed records.
- **Purpose:** Make prioritization, reporting, and investment decisions depend on one trustworthy product-governance surface.
- **Closure evidence:** Commit `a6e4915` normalized unique IDs, active statuses, ordering, EN/ES metadata, and totals. Documentation validation passed for 745 Markdown files, bilingual structural parity passed, and a semantic audit confirmed 36 unique dashboard rows and 36 matching detail records in each language.
- **Closed scope:** The canonical board is internally consistent and completed items are excluded from the active queue. Recurrence prevention, generated totals, and repository inventory automation are explicitly owned by GT-35.
- **References:** [Maturity Assessment](./maturity-assessment.md) · [Documentation Taxonomy](../../../documentation-taxonomy.md)

<a name="gt-35"></a>
#### GT-35 · Automated inventories and tracking validation

- **Criticality:** P1 · **Complexity:** M · **Status:** PENDING
- **Gap:** Repository inventories and product-health totals are manually maintained and become stale. For example, the historical maturity snapshot reports 14 schemas while the current tree contains 17, and it cannot detect duplicate GT IDs or divergent bilingual states.
- **Purpose:** Generate decision evidence from the repository instead of relying on manually synchronized claims.
- **Current evidence / example:** Documentation validation checks links, anchors, encoding, and diagrams, but does not validate gap-board semantics or regenerate ruleset, ADR, translation, and implementation inventories.
- **Done when:** a validation command fails on duplicate IDs, missing detail records, mismatched EN/ES metadata, completed items in the active queue, incorrect totals, or stale inventory counts; its generated summary is referenced by maturity reporting.
- **References:** [Rulesets Hub](../../../../rulesets/README.md) · [Maturity Assessment](./maturity-assessment.md) · [Gap Tracking](./gap-tracking.md)

### Release Baseline and Policy Execution

<a name="gt-28"></a>
#### GT-28 · Restore the CLI build, test, and smoke baseline

- **Criticality:** P0 · **Complexity:** M · **Status:** IN-PROGRESS
- **Gap:** The current CLI refactor passes lint but does not compile, which also prevents the MCP smoke suite from running and leaves unit suites red.
- **Purpose:** Re-establish an executable release baseline before treating CLI, MCP, or policy-engine capabilities as complete product evidence.
- **Current evidence / example:** `npm run build` reports TypeScript contract errors across catalog loading, history, MCP tools, prompts, and command infrastructure. `npm test` currently reports 10 failing suites and 58 failing tests; `npm run mcp:smoke` stops at the failed build.
- **Done when:** from a clean checkout, CLI lint, build, unit tests, and MCP stdio/HTTP smoke all pass; no release-critical path is satisfied only by skipped tests.
- **References:** [Smart CLI](../../../../sdk/cli/README.md) · [ADR-0073 Unified CLI Output Contract](../../../architecture/adrs/core/0073-unified-cli-output-contract.md) · [Quality Gates](../../sdlc/quality-gates.md)

<a name="gt-29"></a>
#### GT-29 · Native and OPA policy-engine parity

- **Criticality:** P0 · **Complexity:** L · **Status:** IN-PROGRESS
- **Gap:** R-25 requires every architectural rule in both evaluators, but the OPA architecture policy still contains placeholder paths and the Native evaluator does not cover all F1 categories. Equivalent inputs therefore cannot yet be trusted to produce equivalent verdicts.
- **Purpose:** Make the rulesets a real, portable governance contract rather than two partially overlapping implementations.
- **Current evidence / example:** F1-R09 through F1-R11 have Rego implementations, while dependency-injection, static-analysis, and separation-of-concerns coverage remains incomplete across engines. F1-R10 also declares AST-based enforcement while its current Rego path uses textual matching.
- **Done when:** a generated coverage matrix maps every active architectural rule to Native and OPA implementations; equivalence tests compare findings and severity for representative compliant and non-compliant fixtures; the packaged OPA/WASM engine passes the same release gate.
- **References:** [Global Rules R-25](../../../../.harness/rules/global-rules.md) · [F1 Ruleset](../../../../rulesets/architecture/f1-modular-monolith.rules.json) · [OPA Architecture Policy](../../../../rulesets/opa/architecture.rego)

<a name="gt-36"></a>
#### GT-36 · Machine-readable rules language coverage policy

- **Criticality:** P2 · **Complexity:** L · **Status:** PENDING
- **Gap:** The repository has 27 English rulesets but only 3 Spanish JSON rulesets, without an explicit decision on whether machine-consumed rules are English-canonical artifacts or require full bilingual counterparts.
- **Purpose:** Preserve one authoritative policy meaning while making language obligations explicit and enforceable.
- **Current evidence / example:** Narrative reference documents require bilingual parity, but ruleset localization is partial and its exception boundary is not encoded in validation.
- **Done when:** governance declares either full bilingual JSON parity or an explicit English-canonical exemption with localized human-readable descriptions; validation enforces the selected model and reports uncovered artifacts.
- **References:** [Global Rules](../../../../.harness/rules/global-rules.md) · [Rulesets Hub](../../../../rulesets/README.md) · [Terminology Glossary](../../../../.harness/scripts/bilingual-terminology-glossary.md)

### Product Proof

<a name="gt-30"></a>
#### GT-30 · Minimum Tracker governance kernel

- **Criticality:** P0 · **Complexity:** L · **Status:** PENDING
- **Gap:** Tracker is a detailed target design but not an executable product; the audited public repository currently contains documentation and no source implementation.
- **Purpose:** Implement the smallest authoritative runtime that can own process, evidence, gate decisions, approvals, exceptions, and audit state.
- **Current evidence / example:** The technical interfaces define tenant-aware contracts and aggregate ownership, but there is no service that persists a process, accepts normalized evidence, or records an immutable `GateDecision`.
- **Done when:** an executable Tracker service authenticates a tenant, persists one product process, evaluates and stores evidence lineage, records an immutable gate decision, and exposes its audit trail through an approved interface.
- **References:** [Tracker Technical Interfaces](./sdlc-tracker-technical-interfaces.md) · [Governed Composition Target Design](./evolith-governed-composition-target-design.md)

<a name="gt-31"></a>
#### GT-31 · Minimum Provable Product vertical slice

- **Criticality:** P0 · **Complexity:** L · **Status:** PENDING
- **Gap:** No end-to-end implementation currently demonstrates the Evolith thesis from tenant and product context through five governed gates to production evidence and learning.
- **Purpose:** Prove or falsify that Evolith can compose replaceable providers while preserving canonical governance, evidence lineage, and measurable delivery value.
- **Current evidence / example:** A representative slice should connect one tenant, one product, one work provider, repository and CI, an agent, observability, analytics, and the five gates, with Tracker remaining the only authority for canonical decisions.
- **Done when:** the slice completes a real governed delivery flow; every decision links to source evidence and policy version; at least one provider can be replaced through its port; elapsed time, intervention count, and decision quality are measured.
- **References:** [Minimum Provable Product](./evolith-product-vision-master.md#10-minimum-provable-product) · [Strategic Validation and Composition Framework](./evolith-strategic-validation-and-composition-framework.md)

<a name="gt-32"></a>
#### GT-32 · Customer and buyer hypothesis validation

- **Criticality:** P0 · **Complexity:** M · **Status:** PENDING
- **Gap:** The target customer, operational pain, buyer, and willingness-to-adopt remain narrative hypotheses without recorded interviews, controlled pilots, or purchasing evidence.
- **Purpose:** Avoid building an internally coherent platform whose governance model, integration cost, or buying motion does not solve a sufficiently valuable customer problem.
- **Current evidence / example:** The vision names product and engineering leaders as likely users and buyers, but the repository contains no evidence pack linking assumptions to observed problem frequency, current cost, adoption blockers, and buying authority.
- **Done when:** at least eight structured interviews span three relevant roles; one controlled pilot exercises the governed workflow; an assumption register records evidence and confidence; the Architecture Board makes an explicit continue, revise, or stop decision.
- **References:** [Customer Hypothesis](./evolith-product-vision-master.md#13-target-problem-and-customer-hypothesis) · [AI-Driven Strategic Validation Workflow](./evolith-strategic-validation-and-composition-framework.md)

<a name="gt-33"></a>
#### GT-33 · Evidence-backed maturity scoring

- **Criticality:** P1 · **Complexity:** M · **Status:** PENDING
- **Gap:** Current maturity scores can conflate a designed capability with an implemented, validated, adopted, or operationally managed capability.
- **Purpose:** Make maturity reporting useful for investment and release decisions by tying every score to observable evidence.
- **Current evidence / example:** Tracker has extensive design documentation but no executable implementation, while the historical CLI baseline reports green release gates that are currently failing under GT-28.
- **Done when:** every scored capability declares a state such as Visioned, Designed, Prototyped, Implemented, Validated, or Scaled; each non-vision state links to qualifying evidence; aggregate scores are recalculated from those states and expose uncertainty.
- **References:** [Maturity Assessment](./maturity-assessment.md) · [Metrics and Capability Maturity](./evolith-product-vision-master.md#11-metrics-and-capability-maturity)

<a name="gt-34"></a>
#### GT-34 · Roadmap reprioritization around governance proof

- **Criticality:** P1 · **Complexity:** S · **Status:** PENDING
- **Gap:** The roadmap advances broad platform concerns such as multi-cloud abstraction, Dapr, and zero-trust architecture before the governance kernel and Minimum Provable Product have produced customer and operational evidence.
- **Purpose:** Sequence investment around the core thesis and delay expensive optionality until evidence justifies it.
- **Current evidence / example:** The next planning horizon should prioritize release baseline, Tracker kernel, vertical slice, and pilot learning; distributed-runtime and provider breadth should have explicit evidence triggers.
- **Done when:** the roadmap orders work as baseline → governance kernel → vertical slice → controlled pilot → scale; deferred technologies name measurable adoption, load, compliance, or provider-pressure triggers; dependencies map to this gap board.
- **References:** [Evolutionary Strategy Roadmap](./evolutionary-strategy-roadmap.md) · [Minimum Provable Product](./evolith-product-vision-master.md#10-minimum-provable-product) · [Strategic Validation and Composition Framework](./evolith-strategic-validation-and-composition-framework.md)

---

## 4. Baseline Snapshot (absorbed from gap-analysis-core, 2026-06-09)

Reference maturity state at the time this board became the single tracking source:

> This snapshot is historical evidence, not current health. The current executable release state is tracked by [GT-28](#gt-28), and inventory drift is tracked by [GT-35](#gt-35).

| Component | Score | Assessment |
|---|:---:|---|
| Evolith Core (Reference Corpus) | 90% | Mature — ACL integration rules deferred |
| Evolith Tracker (SaaS) | 0% | Not started — separate repository, future enterprise component |
| CLI (Technological Exposure) | 90% | Functional beta — build, coverage, and MCP smoke gates pass |
| MCP Server | 85% | stdio + minimal HTTP; smoke verifies initialize, discovery, tool calls |
| Rulesets (Machine-Readable) | 86% | 27 rule files (EN) across 13 categories + 14 schemas |
| SDLC Phase Gates | 62% | Gate validation exists; evidence checks incomplete (GT-08…GT-11) |
| Test Coverage | ≥80% | 88.70% stmts · 89.80% lines · 76.93% branches · ~1 369 tests |

---

<a name="5-legacy-archive-g-series-closed"></a>
## 5. Legacy Archive — G-Series (closed)

Historical gap series tracked in the former `gap-analysis-core.md`, preserved for traceability. All IDs below are **closed**; the three deferred items were re-scoped into this board or assigned to the Tracker.

| ID | Description | Outcome |
|----|-------------|---------|
| G-01 | F1/F2/F3 architecture validation in CLI | DONE |
| G-02 | ACL integrations Jira/Trello/Linear | DEFERRED — Tracker scope (enterprise) |
| G-03 | Execute Phase Gate transitions | DONE |
| G-04 | Architecture Drift detection | DONE |
| G-05 | DORA+SPACE metrics dashboard | DEFERRED — Tracker scope (CLI-side DORA shipped in `gate-status`) |
| G-06 | Real-time executive scorecards | DEFERRED — Tracker scope |
| G-07 | `smart-cli agents install` command | DONE |
| G-08 | Safe satellite upgrade path | DONE |
| G-09 | Architecture rules validation in CLI | DONE |
| G-10 | Phase transitions and artifact generation | DONE |
| G-11 | Documentation scaffolding | DONE |
| G-12 | MCP server protocol (JSON-RPC stdio) | DONE |
| G-13 | 10+ MCP tools | DONE |
| G-14 | MCP Resources | DONE |
| G-15 | Reusable MCP prompts | DONE |
| G-16 | 100% EN/ES bilingual parity | DONE |
| G-17 | Unit test coverage ≥75% branches / ≥80% stmts | DONE — 88.70% stmts · 76.93% branches |
| G-18 | Real E2E tests with assertions | DONE — stdio + HTTP/SSE smoke |
| G-19 | Legacy MCP service cleanup | DONE |
| G-20 | MCP HTTP transport implementation | DONE — minimal transport (SDK upgrade tracked as GT-05) |
| G-21 | Architecture validation depth | DONE |
| G-22 | MoSCoW naming consistency | DONE |
| G-23 | Empty validators directory cleanup | DONE |
| G-24 | Stale tracking table numbers | DONE |
| G-25 | Maturity matrix CLI/MCP coverage | DONE — combined score 3.72/5.0 |
| G-26 | Branch coverage target vs. actual | ACCEPTED — target revised to ≥75% |
| G-27 | Federated governance enforcement advisory-only | DONE — composite action `evolith-validate` |

---

*Tracking board maintained by the Architecture Board — single tracking surface for Evolith Core gaps. Contract details live in [sdlc-tracker-technical-interfaces.md](./sdlc-tracker-technical-interfaces.md).*

---
[Back to Vision Index](./README.md)
