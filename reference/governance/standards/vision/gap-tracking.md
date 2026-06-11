# Evolith Core — Gap Tracking Board

> **Bilingual Navigation:** [Versión en Español](./gap-tracking.es.md)

**Status:** Active Tracking
**Owner:** Evolith Architecture Board
**Created:** 2026-06-10
**Last Updated:** 2026-06-11
**References:** [Product Vision Master](./evolith-product-vision-master.md) · [SDLC Tracker Technical Interfaces](./sdlc-tracker-technical-interfaces.md) · [Maturity Assessment](./maturity-assessment.md) · [ADR Authoring Standard](../../../architecture/adrs/adr-authoring-standard.md)

---

## 1. Purpose & Usage

This board is the **single source of truth for gap tracking** in Evolith Core. It tracks every open gap between the product vision and the current implementation, so progress can be monitored and items closed one by one.

It supersedes and absorbs (2026-06-10): `gap-analysis-core.md` (narrative gap analysis — its closed G-01…G-27 series is archived in [section 5](#5-legacy-archive-g-series-closed)) and the root scratchpad `cli-core-parity-tracking.md`. **No other gap or tracking document may be created**; new gaps get a `GT-xx` ID here.

**How to update:** when a gap changes state, update its row in the dashboard, its `Status` field in the detail section, and the `Last Updated` date above. Reference the closing commit/PR in the detail section.

### Legend

| Field | Values |
|---|---|
| **Criticality** | `P0` blocks the Tracker / vision-critical · `P1` important, next in line · `P2` deferred / opportunistic |
| **Complexity** | `S` ≤ 1 session · `M` 1–3 sessions · `L` multi-session / incremental |
| **Status** | `PENDING` · `IN-PROGRESS` · `DONE` · `DEFERRED` |

---

## 2. Dashboard

### 2.1 Recommended Execution Order (pending work queue)

Ordering criteria: criticality first (`P1` before `P2`), then quick wins (`S` before `M` before `L`) within the active phase plan (F2 → F3 → F4 → F5 → Cross), respecting dependencies (GT-22 decides ADR identity before GT-21 relocates files; GT-19 and GT-20 advance incrementally alongside everything else).

| # | ID | Activity | Goal (what success looks like) | Crit. | Compl. | Refs |
|:-:|----|----------|--------------------------------|:---:|:---:|------|
| 1 | [GT-05](#gt-05) | Replace hand-rolled HTTP transport with MCP SDK Streamable HTTP | Spec-compliant MCP server with session handling | P1 | M | [MCP rules](../../../../rulesets/mcp/README.md) |
| 2 | [GT-08](#gt-08) | Phase 2 gate: real ADR registry check | Design without ADR backing fails the gate | P1 | S | [Quality Gates](../../sdlc/quality-gates.md) |
| 3 | [GT-09](#gt-09) | Phase 3 gate: real coverage check | Coverage <80% blocks Successful Build | P1 | S | [Quality Gates](../../sdlc/quality-gates.md) |
| 4 | [GT-12](#gt-12) | `--dry-run` on `architecture scaffold` and `adr` | Every write command previews safely | P1 | S | [ADR 0073](../../../architecture/adrs/core/0073-unified-cli-output-contract.md) |
| 5 | [GT-10](#gt-10) | Phase 4 gate: security scan evidence | High/Critical CVEs block the RC | P1 | M | [Quality Gates](../../sdlc/quality-gates.md) |
| 6 | [GT-11](#gt-11) | Phase 5 gate: observability + rollback evidence | No rollback plan, no Production Live | P1 | M | [Traceability Model](../../sdlc/traceability-model.md) |
| 7 | [GT-14](#gt-14) | Outbound webhook on gate completion | Tracker receives `GateEvidence` push | P1 | S | [Tracker Interfaces](./sdlc-tracker-technical-interfaces.md) |
| 8 | [GT-13](#gt-13) | `evolith-phase-advance` autonomous gate runner | One call evaluates a full phase transition | P1 | M | [Tracker Interfaces](./sdlc-tracker-technical-interfaces.md) |
| 9 | [GT-18](#gt-18) | Publish `@evolith/smart-cli` to npm | `npm i -g` works from the public registry | P1 | S | [Smart CLI Hub](../../../../sdk/cli/README.md) |
| 10 | [GT-20](#gt-20) | ADR content backfill (164 files with stub sections) | No ADR carries a GT-20 marker | P1 | L | [Authoring Standard](../../../architecture/adrs/adr-authoring-standard.md) |
| 11 | [GT-19](#gt-19) | Hexagonal migration of `core/` god-layer (opportunistic) | `core/` = composition root only | P1 | L | [ADR Registry](../../../architecture/adrs/README.md) |
| 12 | [GT-07](#gt-07) | `mcp:smoke` covers gate evaluation over HTTP | Contract regressions fail the release smoke | P2 | S | [MCP rules](../../../../rulesets/mcp/README.md) |
| 13 | [GT-22](#gt-22) | ADR ID uniqueness scheme | Unambiguous citation for colliding IDs | P2 | S | [ADR Matrix](../../../architecture/adrs/adr-matrix.md) |
| 14 | [GT-26](#gt-26) | Zero-Downtime Release Playbook | Phase 5 "Coming Soon" replaced by a real runbook | P2 | S | [SDLC Center](../../sdlc/README.md) |
| 15 | [GT-17](#gt-17) | DI consolidation + ESLint boundary hardening | One DI mechanism, strict layer boundaries | P2 | M | [Smart CLI Hub](../../../../sdk/cli/README.md) |
| 16 | [GT-21](#gt-21) | Relocate tool-centric Core ADRs (after GT-22) | Every Core ADR passes the litmus test | P2 | M | [Authoring Standard](../../../architecture/adrs/adr-authoring-standard.md) |
| 17 | [GT-24](#gt-24) | Execute declared documentation migrations | Zero "migration pending" markers | P2 | M | [Product Suite Hub](../../../product-suite/README.md) |
| 18 | [GT-23](#gt-23) | Spanish translation backfill (73 skeleton files) | No skeleton markers under `reference/` | P2 | L | [Bilingual Index](../../../navigation/BILINGUAL_INDEX.md) |
| 19 | [GT-25](#gt-25) | First provider profiles for platform categories | Each category holds ≥1 real profile | P2 | L | [Platforms Hub](../../../platforms/README.md) |

### 2.2 Full Dashboard (status → criticality → complexity)

| ID | Gap | Phase | Criticality | Complexity | Status |
|----|-----|:---:|:---:|:---:|:---:|
| [GT-05](#gt-05) | Replace `MinimalHttpTransport` with MCP SDK Streamable HTTP | F2 | P1 | M | PENDING |
| [GT-08](#gt-08) | Phase 2 gate: real ADR registry check | F3 | P1 | S | PENDING |
| [GT-09](#gt-09) | Phase 3 gate: real coverage check from CI report | F3 | P1 | S | PENDING |
| [GT-12](#gt-12) | `--dry-run` on all write operations | F3 | P1 | S | PENDING |
| [GT-14](#gt-14) | Outbound webhook on gate completion | F4 | P1 | S | PENDING |
| [GT-18](#gt-18) | Publish `@evolith/smart-cli` to npm | F5 | P1 | S | PENDING |
| [GT-10](#gt-10) | Phase 4 gate: security scan evidence | F3 | P1 | M | PENDING |
| [GT-11](#gt-11) | Phase 5 gate: observability + rollback evidence | F3 | P1 | M | PENDING |
| [GT-13](#gt-13) | `evolith-phase-advance` autonomous gate runner | F4 | P1 | M | PENDING |
| [GT-19](#gt-19) | Incremental hexagonal migration of `core/` god-layer | Cross | P1 | L | PENDING |
| [GT-20](#gt-20) | ADR content backfill to authoring standard | Cross | P1 | L | PENDING |
| [GT-07](#gt-07) | Extend `mcp:smoke` to cover gate evaluation over HTTP | F2 | P2 | S | PENDING |
| [GT-22](#gt-22) | ADR ID uniqueness scheme (cross-category collisions) | Cross | P2 | S | PENDING |
| [GT-26](#gt-26) | Zero-Downtime Release Playbook for SDLC Phase 5 | Cross | P2 | S | PENDING |
| [GT-17](#gt-17) | DI consolidation + ESLint boundary hardening | F5 | P2 | M | PENDING |
| [GT-21](#gt-21) | Placement review of tool-centric Core ADRs | Cross | P2 | M | PENDING |
| [GT-24](#gt-24) | Execute declared documentation migrations | Cross | P2 | M | PENDING |
| [GT-23](#gt-23) | Spanish translation backfill of the reference corpus | Cross | P2 | L | PENDING |
| [GT-25](#gt-25) | First provider profiles for platform categories | Cross | P2 | L | PENDING |
| [GT-15](#gt-15) | Session-aware chatbox endpoint | F4 | P2 | L | DEFERRED |
| [GT-01](#gt-01) | Unified contract ADR (output envelope + GateEvidence + global flags) | F0 | P0 | S | DONE |
| [GT-02](#gt-02) | `GateEvidence` modeled in the domain layer | F1 | P0 | M | DONE |
| [GT-03](#gt-03) | `EvaluateGateUseCase` + `gate evaluate` command | F1 | P0 | M | DONE |
| [GT-06](#gt-06) | MCP tool `evolith-gate-evaluate` + phase context on existing tools | F2 | P0 | M | DONE |
| [GT-04](#gt-04) | Remove service locator from domain · relocate telemetry | F1 | P1 | S | DONE |
| [GT-16](#gt-16) | Documentation consolidation (single source of truth) | F5 | P2 | S | DONE |

**Progress:** 6 / 26 done · 1 deferred · 19 pending

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

- **Criticality:** P1 · **Complexity:** M · **Status:** PENDING
- **Objective:** Drop the hand-rolled `node:http` transport (~300 lines of `server.ts`) in favor of the official `@modelcontextprotocol/sdk` Streamable HTTP transport, gaining session handling and spec compliance.
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

- **Criticality:** P2 · **Complexity:** S · **Status:** PENDING
- **Objective:** Add `evolith-gate-evaluate` round-trips (stdio + HTTP) to the release smoke suite so the Tracker contract is release-gated.
- **Done when:** `npm run mcp:smoke` fails if the gate-evaluate contract regresses.

### Phase F3 — Complete Gate Evidence (62% → 100%)

<a name="gt-08"></a>
#### GT-08 · Phase 2 gate: real ADR registry check

- **Criticality:** P1 · **Complexity:** S · **Status:** PENDING
- **Objective:** Deepen the current existence-only check (`adr-matrix.json` present) into content validation: design decisions must reference existing ADR registry entries, with violations emitted into `GateEvidence`.
- **Done when:** a satellite missing ADR backing fails the Design Baseline gate with an actionable violation.

<a name="gt-09"></a>
#### GT-09 · Phase 3 gate: real coverage check

- **Criticality:** P1 · **Complexity:** S · **Status:** PENDING
- **Objective:** Deepen the current existence-only check (`coverage/` directory present) into threshold enforcement: parse the coverage report and block below the ≥80% defined in `phase-gates.rules.json`.
- **Done when:** coverage below threshold produces a blocking violation in the Successful Build gate.

<a name="gt-10"></a>
#### GT-10 · Phase 4 gate: security scan evidence

- **Criticality:** P1 · **Complexity:** M · **Status:** PENDING
- **Objective:** Deepen the current existence-only check (`security-scan.json` present) into content validation: parse the SAST report and block on High/Critical CVEs before stamping an RC.
- **Done when:** missing or failing scan evidence blocks the RC Stamped gate.

<a name="gt-11"></a>
#### GT-11 · Phase 5 gate: observability + rollback evidence

- **Criticality:** P1 · **Complexity:** M · **Status:** PENDING
- **Objective:** Deepen the current existence-only checks (`observability/` directory, Release Notes present) into content validation of observability readiness and a documented rollback procedure.
- **Done when:** absent rollback/observability artifacts block the Production Live gate.

<a name="gt-12"></a>
#### GT-12 · `--dry-run` on all write operations

- **Criticality:** P1 · **Complexity:** S · **Status:** PENDING
- **Objective:** Close the remaining `--dry-run` coverage: `init`, `agents`, `upgrade`, `docs`, and `generate-domain` already support it (verified 2026-06-10); `architecture scaffold` and `adr` do not.
- **Done when:** every write command supports `--dry-run` with verified zero filesystem mutations.

### Phase F4 — Automation & Events

<a name="gt-13"></a>
#### GT-13 · `evolith-phase-advance` autonomous gate runner

- **Criticality:** P1 · **Complexity:** M · **Status:** PENDING
- **Objective:** Compose GT-03 into an agent/tool that evaluates all gates for a phase transition without a human trigger, returning consolidated evidence.
- **Done when:** one call yields pass/fail for a full phase transition with per-gate evidence.

<a name="gt-14"></a>
#### GT-14 · Outbound webhook on gate completion

- **Criticality:** P1 · **Complexity:** S · **Status:** PENDING
- **Objective:** Infrastructure adapter that POSTs `GateEvidence` to a caller-supplied webhook URL when an evaluation completes. The CLI stays stateless — the URL is always a parameter.
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

- **Criticality:** P2 · **Complexity:** M · **Status:** PENDING
- **Objective:** Retire the custom `DIContainer` in favor of NestJS DI, then tighten `.eslintrc.js` boundaries: remove `domain → core` and `application → infrastructure` allowances.
- **Done when:** single DI mechanism; stricter boundaries pass on a clean lint run.

<a name="gt-18"></a>
#### GT-18 · Publish `@evolith/smart-cli` to npm

- **Criticality:** P1 · **Complexity:** S · **Status:** PENDING
- **Objective:** Publish the CLI publicly per the open-core strategy (CLI + MCP free tier). Release pipeline is already hardened; requires npm scope, provenance, and README polish.
- **Done when:** `npm i -g @evolith/smart-cli` works from the public registry.

### Cross-cutting

<a name="gt-19"></a>
#### GT-19 · Incremental hexagonal migration of `core/`

- **Criticality:** P1 · **Complexity:** L · **Status:** PENDING
- **Objective:** Dissolve the ~13.6k-line `core/` god-layer incrementally: pure logic → `domain/`, orchestration → `application/`, adapters (MCP, observability, providers) → `infrastructure/`, leaving `core/` as composition root only. Advances opportunistically with every phase above — never as a big-bang rewrite.
- **Done when:** `core/` contains only DI/bootstrap; ESLint boundaries enforce strict hexagonal rules (see GT-17) with zero exceptions.

<a name="gt-20"></a>
#### GT-20 · ADR content backfill to authoring standard

- **Criticality:** P1 · **Complexity:** L · **Status:** PENDING
- **Objective:** Complete the sections added as stubs by the 2026-06-10 ADR standardization (700 sections across 160 files): Objective and Scope, Options Considered, Evidence and Evaluation Criteria, Related Decisions and Standards — plus Technology Watch and Current Sources for platform ADRs — per the [ADR Authoring Standard](../../../architecture/adrs/adr-authoring-standard.md). Backfill must reconstruct honestly (cite what was actually evaluated; mark unknowns as unknown), never fabricate history.
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
- **Objective:** Translate the 73 files marked "esqueleto inicial / pendiente de traducción" (inventory 2026-06-11), concentrated in `governance/standards/ai-augmented/*` (~33 files) and `knowledge/architecture-intelligence/patterns` (~10), plus 4 core ADR bodies (including `core/0056`, intentionally skeletal until its EN stabilizes). English remains the deciding source; Spanish mirrors header structure (bilingual parity). The 17 additional skeletons under `.harness/` and `.bmad-core/` are tool-consumed and out of scope.
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

---

## 4. Baseline Snapshot (absorbed from gap-analysis-core, 2026-06-09)

Reference maturity state at the time this board became the single tracking source:

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
