# Evolith Core — Gap Reference Catalog

> **Bilingual Navigation:** [Versión en Español](./gap-reference-catalog.es.md)

**Owner:** Evolith Architecture Board
**Status Authority:** [Gap Tracking Board](./gap-tracking.md)
**Closure Authority:** [Gap Closure Evidence Standard](./gap-closure-evidence-standard.md) · [`gap-closure-evidence.json`](./gap-closure-evidence.json)

This catalog explains each gap: problem, purpose, evidence, closure criteria, and references. It is not a tracking board; priority and status are authoritative only in the [Gap Tracking Board](./gap-tracking.md).

---

## 1. Gap Details

### Phase F0 — Contract First

#### GT-01

**Title:** Unified contract ADR

- **Objective:**
  - [x] Write and approve a single ADR in Evolith Core reconciling the two divergent contract proposals — the Core-side [`GateEvidence`](./sdlc-tracker-technical-interfaces.md) structure and the Tracker-side output envelope (`{success, data, meta}`, error codes, global flags `--format/--dry-run/--phase`).
  - [x] Resolve binary naming (`smart-cli` vs `evolith` alias). Verified 2026-06-10: all 27 rulesets already have a `version` field consumable as `rulesetVersion`.
- **Done when:**
  - [x] ADR approved by the Architecture Board.
  - [x] Core gap document updated pointing to it.
  - [x] Tracker technical interface updated to reference ADR-0073 as the unified envelope authority.

### Phase F1 — GateEvidence as Domain

#### GT-02

**Title:** `GateEvidence` modeled in the domain layer

- **Objective:** Implement `GateEvidence` (`verdict`, `violations[]`, `rulesetRef`, `rulesetVersion`, `evaluatedAt`, `evaluatedBy`) and the output envelope as domain types in `sdk/cli/src/domain/`, with a JSON schema published in `rulesets/schema/`.
- **Closed by:** `sdk/cli/src/domain/gate-evidence.ts` (pure domain types + envelope constructors + `deriveVerdict`), `rulesets/schema/gate-evidence.schema.json` and `rulesets/schema/output-envelope.schema.json`, 18 unit tests validating domain-built samples against both schemas via ajv.

#### GT-03

**Title:** `EvaluateGateUseCase` + `gate evaluate` command

- **Objective:** Create an application-layer use case orchestrating `phase-gate-validator.service` and `rule-evaluation-engine` (clarifying their overlapping responsibilities), exposed as `gate evaluate --phase <p> --format json` emitting the GT-02 contract.
- **Closed by:** `EvaluateGateUseCase` (application layer; responsibility boundary documented: gates → PhaseGateValidatorService, general ruleset compliance → RuleEvaluationEngine via `validate`), new `gate` command emitting the ADR-0073 envelope with context echo and exit code 1 on failed gates; 6 unit tests + 8 E2E tests validating schema-valid `GateEvidence` for all 5 phases plus error envelopes (INVALID_PHASE, VALIDATION_FAILED). Full suite: 1 510 tests green.

#### GT-04

**Title:** Remove service locator from domain · relocate telemetry

- **Objective:** The `domain` layer currently relies on a `ServiceLocator` (e.g., in `gate-evidence.ts`) to resolve telemetry and correlation IDs. This violates the Clean Architecture principle that domain entities must be pure and free of infrastructure or DI framework concepts. Move telemetry/correlation injection to the `application` layer (use cases).
- **Done when:** `ServiceLocator` and `@nestjs/core` imports are completely removed from `sdk/cli/src/domain/`; use cases pass correlation IDs to domain factories explicitly.
- **Closed by:** Domain service locator was fully removed in previous refactors (GT-02/03). Telemetry service was relocated from `domain/services/tool-usage-telemetry.service.ts` to `core/observability/`, completing the layer purge. Correlation ID passing via explicit `meta` payload in `createSuccessEnvelope` is already in place.

### Phase F2 — MCP Exposure

#### GT-05

**Title:** Replace `MinimalHttpTransport` with MCP SDK Streamable HTTP

- **Objective:** Drop the hand-rolled `node:http` transport (~300 lines of `server.ts`) in favor of the official `@modelcontextprotocol/sdk` Streamable HTTP transport, gaining session handling and spec compliance.
- **Current evidence:** `StreamableHTTPServerTransport` and a wrapper exist in the working tree, but the CLI does not compile and three HTTP-oriented test blocks remain skipped.
- **Done when:** HTTP/SSE smoke passes against the SDK transport; `server.ts` no longer contains transport plumbing.

#### GT-06

**Title:** MCP tool `evolith-gate-evaluate` + phase context

- **Objective:**
  - [x] Expose the GT-03 use case as the MCP tool `evolith-gate-evaluate` accepting `{phase, projectPath, rulesetRef, evidenceMode}`. This is the Tracker's primary integration point.
  - [x] Resolve phase context for existing tools: gate evaluation requires it; unrelated legacy tools retain their schemas under an accepted compatibility scope.
- **Done when:** an external MCP client evaluates a gate over HTTP and receives schema-valid `GateEvidence`.
- **Closed by:** tool exposed via `sdk/cli/src/core/mcp/tools/gate.ts`, integrated in `server.ts` and verified in `mcp:smoke` (HTTP and stdio). Phase context omitted from existing SDLC tools to avoid backwards compatibility breaks in their schemas.

#### GT-07

**Title:** Extend `mcp:smoke` for gate evaluation over HTTP

- **Objective:** Add `evolith-gate-evaluate` round-trips (stdio + HTTP) to the release smoke suite so the Tracker contract is release-gated.
- **Current evidence:** the smoke script contains stdio and Streamable HTTP gate calls, but `npm run mcp:smoke` stops at the failing TypeScript build.
- **Done when:** `npm run mcp:smoke` fails if the gate-evaluate contract regresses.

### Phase F3 — Complete Gate Evidence (62% → 100%)

#### GT-08

**Title:** Phase 2 gate: real ADR registry check

- **Objective:** Deepen the current existence-only check (`adr-matrix.json` present) into content validation: design decisions must reference existing ADR registry entries, with violations emitted into `GateEvidence`.
- **Current evidence:** the working tree parses `adr-matrix.json` and rejects an empty registry, but the change is not closure evidence until build and tests pass.
- **Done when:** a satellite missing ADR backing fails the Design Baseline gate with an actionable violation.

#### GT-09

**Title:** Phase 3 gate: real coverage check

- **Objective:** Deepen the current existence-only check (`coverage/` directory present) into threshold enforcement: parse the coverage report and block below the ≥80% defined in `phase-gates.rules.json`.
- **Current evidence:** `coverage/coverage-summary.json` parsing and the 80% statement threshold exist in the working tree; release verification remains blocked by GT-28.
- **Done when:** coverage below threshold produces a blocking violation in the Successful Build gate.

#### GT-10

**Title:** Phase 4 gate: security scan evidence

- **Objective:** Deepen the current existence-only check (`security-scan.json` present) into content validation: parse the SAST report and block on High/Critical CVEs before stamping an RC.
- **Current evidence:** the validator currently checks only whether `security-scan.json` exists; it does not inspect severity counts, scanner status, or accepted exceptions.
- **Done when:** missing or failing scan evidence blocks the RC Stamped gate.

#### GT-11

**Title:** Phase 5 gate: observability + rollback evidence

- **Objective:** Deepen the current existence-only checks (`observability/` directory, Release Notes present) into content validation of observability readiness and a documented rollback procedure.
- **Current evidence:** current checks accept directory/document presence without validating health indicators, alert ownership, rollback commands, triggers, or rehearsal evidence.
- **Done when:** absent rollback/observability artifacts block the Production Live gate.

#### GT-12

**Title:** `--dry-run` on all write operations

- **Objective:** Close the remaining `--dry-run` coverage: `init`, `agents`, `upgrade`, `docs`, and `generate-domain` already support it (verified 2026-06-10); `architecture scaffold` and `adr` do not.
- **Current evidence:** both remaining commands contain dry-run code and tests in the working tree, but the complete CLI baseline is red.
- **Done when:** every write command supports `--dry-run` with verified zero filesystem mutations.

### Phase F4 — Automation & Events

#### GT-13

**Title:** `evolith-phase-advance` autonomous gate runner

- **Objective:** Compose GT-03 into an agent/tool that evaluates a proposed phase transition without a human trigger and returns consolidated evidence.
- **Authority guardrail:** this tool may recommend `pass` or `fail`, but only Evolith Tracker may mutate the canonical phase state.
- **Example:** `evolith-phase-advance --from design --to construction` evaluates every Design Baseline criterion and returns a transition proposal plus per-gate evidence.
- **Done when:** one call yields a schema-valid transition proposal with per-gate evidence and no direct canonical-state mutation.

#### GT-14

**Title:** Outbound webhook on gate completion

- **Objective:** Infrastructure adapter that POSTs `GateEvidence` to a caller-supplied webhook URL when an evaluation completes. The CLI stays stateless — the URL is always a parameter.
- **Current evidence:** `WebhookAdapter` and the notifier port exist in the working tree; integration closure depends on a green baseline and a receiving-listener test.
- **Done when:** integration test receives the evidence payload on a local listener.

#### GT-15

**Title:** Session-aware chatbox endpoint

- **Objective:** Conversational HTTP endpoint (`POST /chat`) with session awareness, per the Tracker interface design.
- **Current evidence:** Core contains an in-memory session repository and mock response endpoint, but these do not satisfy Tracker-authoritative storage, governed agent execution, or durable audit requirements.
- **Deferred because:** depends on Tracker session storage (`ChatboxSession`) and the governance kernel existing. The current Core prototype is explicitly non-closing evidence. Revisit once the Tracker MVP consumes GT-06.

### Phase F5 — Hygiene & Publication

#### GT-16

**Title:** Documentation consolidation

- **Objective:** Make this board the single tracking surface: remove the stale root `cli-core-parity-tracking.md` and `gap-analysis-core.md`, absorb their live content, and repoint all references.
- **Closed by:** consolidation of 2026-06-10 — both documents removed, G-series archived in [section 5](#5-legacy-archive-g-series-closed), all repository references repointed to this board.

#### GT-17

**Title:** DI consolidation + ESLint boundary hardening

- **Objective:** Retire the custom `DIContainer` in favor of NestJS DI, then tighten `.eslintrc.js` boundaries: remove `domain → core` and `application → infrastructure` allowances.
- **Current evidence:** lint passes and the working tree introduces shared command abstractions, but Nest module tests fail dependency resolution and production build has DI/type errors.
- **Done when:** single DI mechanism; stricter boundaries pass on a clean lint run.

#### GT-18

**Title:** Publish `@evolith/smart-cli` to npm

- **Objective:** Publish the CLI publicly per the open-core strategy (CLI + MCP free tier) with npm scope ownership, provenance, versioning, clean-install smoke, and release documentation.
- **Dependency:** GT-28, GT-05, and GT-07 must be closed first.
- **Done when:** `npm i -g @evolith/smart-cli` works from the public registry.

### Cross-cutting

#### GT-19

**Title:** Incremental hexagonal migration of `core/`

- **Objective:** Dissolve the ~17k-line `core/` god-layer incrementally: pure logic → `domain/`, orchestration → `application/`, adapters (MCP, observability, providers) → `infrastructure/`, leaving `core/` as composition root only. Advances opportunistically with every phase above — never as a big-bang rewrite.
- **Current evidence:** `domain` ports and infrastructure adapters still import `NormalizedRule` from `core/validators`, showing that ownership direction is not yet clean.
- **Done when:** `core/` contains only DI/bootstrap; ESLint boundaries enforce strict hexagonal rules (see GT-17) with zero exceptions.

#### GT-20

**Title:** ADR content backfill to authoring standard

- **Objective:** Complete the sections added as stubs by the 2026-06-10 ADR standardization (approximately 697 markers across 162 files): Objective and Scope, Options Considered, Evidence and Evaluation Criteria, Related Decisions and Standards — plus Technology Watch and Current Sources for platform ADRs — per the [ADR Authoring Standard](../../../architecture/adrs/adr-authoring-standard.md). Backfill must reconstruct honestly (cite what was actually evaluated; mark unknowns as unknown), never fabricate history.
- **Done when:** no ADR contains a `GT-20` backfill marker; spot-check confirms content quality on the 10 highest-traffic ADRs.

#### GT-21

**Title:** Placement review of tool-centric Core ADRs

- **Objective:** Apply the Core-vs-Platform litmus test from the [ADR Authoring Standard](../../../architecture/adrs/adr-authoring-standard.md) to the tool-centric Core ADRs — candidates: 0001 (Nx), 0005 (CodeQL), 0006/0046 (Dapr), 0014 (Redis), 0030 (Kong vs NestJS), 0069 (MCP). For each: keep in core rewritten as agnostic principle, relocate to a platform category, or split (agnostic Core ADR + tool-choice Platform ADR). Every relocation must fix all inbound links in the same change.
- **Done when:** every Core ADR passes the litmus test; relocated ADRs carry the relocation note; no broken links.

#### GT-22

**Title:** ADR ID uniqueness scheme

- **Objective:** Resolve the cross-category ID collisions (core/0044–0048 vs nodejs/0044–0048; core/0069–0072 vs dotnet/0069–0072): decide between global renumbering (high link blast radius) or formalized category-qualified citation (`core/ADR-0044`), and update `adr-matrix` and rulesets accordingly. The Authoring Standard provisionally mandates category-qualified citation.
- **Done when:** the decision is recorded (ADR or standard update) and `adr-matrix` reflects unambiguous identities.

#### GT-23
**Título:** Relleno de traducción al español del corpus de referencia.

- **Objetivo:** todos los documentos bajo `referencia/` y `conjuntos de reglas/` son legibles en español sin marcadores de posición esqueleto declarados.
- **Objetivo:** Traducir los 76 archivos actualmente marcados como "esqueleto inicial / pendiente de traduccion [completado]", concentrados en `governance/standards/ai-augmented/*`, `knowledge/architecture-intelligence/patterns` y organismos ADR seleccionados. El inglés sigue siendo la fuente decisiva; Estructura de cabecera de espejos españoles. Los esqueletos consumidos por herramientas bajo `.harness/` y `.bmad-core/` permanecen fuera del alcance a menos que se promocionen al corpus de referencia.
- **Hecho cuando:** `grep -rl "pendiente de traduccion [completado]" reference/rulesets/` devuelve cero archivos y `check-bilingual-parity.mjs` pasa.
- **Referencias:** [Índice bilingüe](../../../navigation/BILINGUAL_INDEX.md) · [Glosario de terminología](../../../../.harness/scripts/bilingual-terminology-glossary.md)
#### GT-24

**Title:** Execute declared documentation migrations

- **Goal:** the physical location of every document matches its declared taxonomy classification — no more "migration pending" notes.
- **Objective:** Execute the migrations the hubs already declare: (1) move suite vision/strategy/positioning documents from the legacy `governance/standards/vision/` path into their `product-suite/` areas; (2) migrate Smart CLI and MCP Services documentation into `reference/products/`; (3) promote [Provider Abstraction and Plugin Model](./evolith-provider-abstraction-plugin-model.md) to a Core architecture principle; (4) move [Tracker Technical Interfaces](./sdlc-tracker-technical-interfaces.md) to the Tracker product design. Each move leaves a compatibility stub at the old path and fixes every inbound link in the same change.
- **Done when:** no "migration pending / migración pendiente" marker remains in `reference/` or `sdk/`; `validate-docs.mjs` passes.
- **References:** [Product Suite Hub](../../../product-suite/README.md) · [Product Designs Hub](../../../products/README.md) · [Documentation Taxonomy](../../../documentation-taxonomy.md)

#### GT-25

**Title:** First provider profiles for platform categories

- **Goal:** the Platform Guidance domain stops being an empty promise — each planned category holds at least one real provider profile.
- **Objective:** Author provider profiles following the required-content checklist in the [Platforms Hub](../../../platforms/README.md) (capabilities, limitations, licensing, tenant isolation, adapter mapping, replaceability, current sources), starting with the categories the products already depend on: `scm/` (GitHub), `ci-cd/` (GitHub Actions), `observability/` (OTel stack), `security/` (CodeQL/Trivy).
- **Done when:** every category directory exists with ≥1 profile (EN+ES) linked from the platforms hub table.
- **References:** [Platforms Hub](../../../platforms/README.md) · [Validated Tool Catalog](../../../platforms/validated-tool-catalog.md)

#### GT-26

**Title:** Zero-Downtime Release Playbook

- **Goal:** SDLC Phase 5 links a real operational runbook instead of a "Coming Soon" placeholder.
- **Objective:** Write the blue-green and canary deployment playbook announced in the [SDLC Governance Center](../../sdlc/README.md) Phase 5 table (EN+ES), covering zero-downtime constraints, rollback triggers, and observability checkpoints, and link it from the Phase 5 artifact table.
- **Done when:** the Phase 5 row links the playbook and no "Coming Soon / Próximamente" marker remains in the SDLC center.
- **References:** [SDLC Governance Center](../../sdlc/README.md) · [Quality Gates](../../sdlc/quality-gates.md)

### Tracking Integrity

#### GT-27

**Title:** Canonical tracking semantic consistency

- **Gap:** The canonical board contained a duplicated GT-19, completed work in the active queue, contradictory EN/ES statuses, and totals that no longer matched the detailed records.
- **Purpose:** Make prioritization, reporting, and investment decisions depend on one trustworthy product-governance surface.
- **Closure evidence:** Commit `a6e4915` normalized unique IDs, active statuses, ordering, EN/ES metadata, and totals. Documentation validation passed for 745 Markdown files, bilingual structural parity passed, and a semantic audit confirmed 36 unique dashboard rows and 36 matching detail records in each language.
- **Closed scope:** The canonical board is internally consistent and completed items are excluded from the active queue. Recurrence prevention, generated totals, and repository inventory automation are explicitly owned by GT-35.
- **References:** [Maturity Assessment](./maturity-assessment.md) · [Documentation Taxonomy](../../../documentation-taxonomy.md)

#### GT-35

**Title:** Automated inventories and tracking validation

- **Gap:** Repository inventories and product-health totals are manually maintained and become stale. For example, the historical maturity snapshot reports 14 schemas while the current tree contains 17, and it cannot detect duplicate GT IDs or divergent bilingual states.
- **Purpose:** Generate decision evidence from the repository instead of relying on manually synchronized claims.
- **Current evidence / example:** Documentation validation checks links, anchors, encoding, and diagrams, but does not validate gap-board semantics or regenerate ruleset, ADR, translation, and implementation inventories.
- **Done when:** a validation command fails on duplicate IDs, missing detail records, mismatched EN/ES metadata, completed items in the active queue, incorrect totals, or stale inventory counts; its generated summary is referenced by maturity reporting.
- **References:** [Rulesets Hub](../../../../rulesets/README.md) · [Maturity Assessment](./maturity-assessment.md) · [Gap Tracking](./gap-tracking.md)

### Release Baseline and Policy Execution

#### GT-28

**Title:** Restore the CLI build, test, and smoke baseline

- **Gap:** The CLI refactor had broken its executable release baseline: lint passed, but compilation, unit suites, and MCP smoke did not.
- **Purpose:** Re-establish an executable release baseline before treating CLI, MCP, or policy-engine capabilities as complete product evidence.
- **Current evidence / example:** Closed on 2026-06-12. `npm run lint` and `npm run build` pass; 70 unit suites pass with 1,237 tests; 12 E2E suites pass with 110 tests; `npm run mcp:smoke` passes `initialize`, discovery, metrics, and gate evaluation over both stdio and Streamable HTTP.
- **Done when:** from a clean checkout, CLI lint, build, unit tests, and MCP stdio/HTTP smoke all pass; no release-critical path is satisfied only by skipped tests.
- **References:** [Smart CLI](../../../../sdk/cli/README.md) · [ADR-0073 Unified CLI Output Contract](../../../architecture/adrs/core/0073-unified-cli-output-contract.md) · [Quality Gates](../../sdlc/quality-gates.md)

#### GT-29

**Title:** Native and OPA policy-engine parity

- **Gap:** R-25 requires every architectural rule in both evaluators, but the OPA architecture policy still contains placeholder paths and the Native evaluator does not cover all F1 categories. Equivalent inputs therefore cannot yet be trusted to produce equivalent verdicts.
- **Purpose:** Make the rulesets a real, portable governance contract rather than two partially overlapping implementations.
- **Current evidence / example:** F1-R09 through F1-R11 have Rego implementations, while dependency-injection, static-analysis, and separation-of-concerns coverage remains incomplete across engines. F1-R10 also declares AST-based enforcement while its current Rego path uses textual matching.
- **Done when:** a generated coverage matrix maps every active architectural rule to Native and OPA implementations; equivalence tests compare findings and severity for representative compliant and non-compliant fixtures; the packaged OPA/WASM engine passes the same release gate.
- **References:** [Global Rules R-25](../../../../.harness/rules/global-rules.md) · [F1 Ruleset](../../../../rulesets/architecture/f1-modular-monolith.rules.json) · [OPA Architecture Policy](../../../../rulesets/opa/architecture.rego)

#### GT-36

**Title:** Machine-readable rules language coverage policy

- **Gap:** The repository has 27 English rulesets but only 3 Spanish JSON rulesets, without an explicit decision on whether machine-consumed rules are English-canonical artifacts or require full bilingual counterparts.
- **Purpose:** Preserve one authoritative policy meaning while making language obligations explicit and enforceable.
- **Current evidence / example:** Narrative reference documents require bilingual parity, but ruleset localization is partial and its exception boundary is not encoded in validation.
- **Done when:** governance declares either full bilingual JSON parity or an explicit English-canonical exemption with localized human-readable descriptions; validation enforces the selected model and reports uncovered artifacts.
- **References:** [Global Rules](../../../../.harness/rules/global-rules.md) · [Rulesets Hub](../../../../rulesets/README.md) · [Terminology Glossary](../../../../.harness/scripts/bilingual-terminology-glossary.md)

### Product Proof

#### GT-30

**Title:** Minimum Tracker governance kernel

- **Gap:** Tracker is still primarily a documented design. The official product boundary defines the canonical process, gate, evidence, approval, exception, and audit responsibilities, but no deployable kernel currently exercises that authority.
- **Purpose:** Establish the smallest executable Tracker capability that owns governance decisions instead of leaving product authority in the CLI, MCP tools, or documents.
- **Current evidence / example:** Tracker documentation defines interfaces and lifecycle semantics, while the product remains pre-construction and the Core repository intentionally contains no Tracker runtime implementation.
- **Done when:** one deployable service persists tenant, product, process, phase, `GateDecision`, `PhaseTransition`, approval, exception, and audit records; CLI and MCP remain technical evaluators; integration tests prove that only Tracker authorizes canonical transitions.
- **References:** [Tracker Product Boundary](../../../products/evolith-tracker/README.md) · [Tracker Technical Interfaces](../../../products/evolith-tracker/sdlc-tracker-technical-interfaces.md) · [Product Vision](../../../product-suite/vision/evolith-product-vision-master.md)

#### GT-31

**Title:** Minimum Provable Product vertical slice

- **Gap:** No tenant and product have completed the five canonical gates through one Tracker-authoritative process with a connected Evidence Graph.
- **Purpose:** Prove the end-to-end product thesis before expanding provider breadth, distributed runtime concerns, or enterprise surface area.
- **Current evidence / example:** UMS is the official executable architecture reference, but it is not yet documented as a complete five-gate Tracker run that connects work, repository, CI, agent, observability, and analytics evidence.
- **Done when:** one tenant and product traverse all five gates using one work provider, repository and CI provider, agent path, observability source, and analytics path; the run produces five canonical decisions, an audit export, and measured decision lead time.
- **References:** [Minimum Provable Product](../../../product-suite/vision/evolith-product-vision-master.md#10-minimum-provable-product) · [Governed Composition Target Design](../../../product-suite/architecture/evolith-governed-composition-target-design.md) · [UMS Applied Reference](../../../knowledge/demo/README.md)

#### GT-32

**Title:** Customer and buyer hypothesis validation

- **Gap:** The product vision identifies governance pain and target actors, but the customer, buyer, urgency, and willingness-to-pay hypotheses remain unvalidated by representative external evidence.
- **Purpose:** Prevent a technically coherent platform from advancing without proof that the selected users and economic buyers experience the problem strongly enough to adopt and fund it.
- **Current evidence / example:** The vision explicitly calls for interviews and falsifiable experiments, but the reference corpus contains no interview repository, buyer map, ranked pain evidence, procurement constraints, or pricing signal. On 2026-06-12, the owner explicitly canceled this evidence-gathering work.
- **Decision and accepted risk:** Deferred by owner decision. Evolith may continue as a technical and governance reference, but product-market, buyer, urgency, procurement, and willingness-to-pay claims must remain labeled as unvalidated and must not be presented as proven maturity.
- **Reactivate when:** external commercialization, pricing, enterprise procurement, or product-market-fit claims become a release or investment dependency.
- **Done when:** representative interviews cover user, champion, security/compliance, and economic-buyer roles; results rank pains and alternatives, record procurement and pricing signals, and produce an explicit proceed, revise, or stop decision.
- **References:** [Customer Hypothesis](../../../product-suite/vision/evolith-product-vision-master.md#13-target-problem-and-customer-hypothesis) · [Strategic Validation and Composition Framework](./evolith-strategic-validation-and-composition-framework.md) · [AI-Assisted Validation Workflow](./evolith-ai-assisted-validation-workflow.md)

#### GT-33

**Title:** Evidence-backed maturity scoring

- **Gap:** Current maturity scores can conflate a designed capability with an implemented, validated, adopted, or operationally managed capability.
- **Purpose:** Make maturity reporting useful for investment and release decisions by tying every score to observable evidence.
- **Current evidence / example:** Tracker has extensive design documentation but no executable implementation, while the historical CLI baseline reports green release gates that are currently failing under GT-28.
- **Done when:** every scored capability declares a state such as Visioned, Designed, Prototyped, Implemented, Validated, or Scaled; each non-vision state links to qualifying evidence; aggregate scores are recalculated from those states and expose uncertainty.
- **References:** [Maturity Assessment](./maturity-assessment.md) · [Metrics and Capability Maturity](../../../product-suite/vision/evolith-product-vision-master.md#11-metrics-and-capability-maturity)

#### GT-34

**Title:** Roadmap reprioritization around governance proof

- **Gap:** The roadmap advances broad platform concerns such as multi-cloud abstraction, Dapr, and zero-trust architecture before the governance kernel and Minimum Provable Product have produced customer and operational evidence.
- **Purpose:** Sequence investment around the core thesis and delay expensive optionality until evidence justifies it.
- **Current evidence / example:** The next planning horizon should prioritize release baseline, Tracker kernel, vertical slice, and pilot learning; distributed-runtime and provider breadth should have explicit evidence triggers.
- **Done when:** the roadmap orders work as baseline → governance kernel → vertical slice → controlled pilot → scale; deferred technologies name measurable adoption, load, compliance, or provider-pressure triggers; dependencies map to this gap board.
- **References:** [Evolutionary Strategy Roadmap](./evolutionary-strategy-roadmap.md) · [Minimum Provable Product](../../../product-suite/vision/evolith-product-vision-master.md#10-minimum-provable-product) · [Strategic Validation and Composition Framework](./evolith-strategic-validation-and-composition-framework.md)

#### GT-37

**Title:** Evidence-gated semantic gap closure

- **Gap:** Structural tracking validation can report every gap as complete even when closure criteria remain unchecked, evidence is stale or contradictory, or a dependency is only mocked.
- **Purpose:** Make `DONE` a defensible semantic claim backed by current, reproducible evidence rather than a table value that is internally consistent.
- **Current evidence / example:** The semantic validator, canonical closure registry, and regression tests are active. GT-01 and GT-06 criteria were resolved explicitly, while GT-15 was restored to `DEFERRED` because its in-memory mock is not Tracker-authoritative evidence.
- **Done when:** validation rejects `DONE` without completed closure criteria, dated closure evidence, dependency disposition, reproducible validation commands, and a commit or release reference; documented exceptions are explicit, owned, and time-bounded.
- **Closure evidence:** Commit `f3c8520` introduced R-26, the bilingual closure standard, 32 historical closure records, commit and artifact resolution, dependency disposition checks, unchecked-criterion rejection, and four regression tests. The same change corrected the false-positive GT-15 status.
- **References:** [Gap Closure Evidence Standard](./gap-closure-evidence-standard.md) · [Closure Registry](./gap-closure-evidence.json) · [Tracking Validator](../../../../.harness/scripts/validate-tracking.mjs) · [Gap Tracking](./gap-tracking.md)

#### GT-38

**Title:** Tenant-safe canonical Evidence Graph

- **Gap:** The canonical Evidence Graph is designed but not implemented with durable integrity, lineage, retention, authorization, and tenant isolation.
- **Purpose:** Create the defensible audit chain and decision substrate required for trustworthy automated gates and enterprise governance.
- **Current evidence / example:** Tracker interfaces describe evidence objects, but there is no persistent implementation proving hashes, source and actor lineage, retention behavior, tamper detection, or cross-tenant denial.
- **Done when:** immutable evidence storage records tenant, source, actor, policy, lineage, and integrity hashes; application-layer isolation is primary and database-native enforcement is a secondary failsafe; tests prove tamper detection and deny cross-tenant access.
- **References:** [Tracker Technical Interfaces](../../../products/evolith-tracker/sdlc-tracker-technical-interfaces.md) · [Governed Composition Target Design](../../../product-suite/architecture/evolith-governed-composition-target-design.md) · [Multi-Tenancy Architecture Strategy](../../../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.md)

#### GT-39

**Title:** Controlled satellite pilot

- **Gap:** No representative satellite team has adopted the full governance workflow under controlled conditions and produced comparable before-and-after evidence.
- **Purpose:** Validate usability, operational fit, support cost, exception handling, and adoption friction outside the reference corpus itself.
- **Current evidence / example:** UMS demonstrates applied architecture and migration lessons, but it is not yet evidence of a Tracker-authoritative governance pilot with product and team outcomes.
- **Done when:** one pilot team and product complete at least one full governed cycle; baseline and post-pilot metrics, support issues, exceptions, usability findings, and adoption decisions are captured; reusable lessons are promoted or explicitly rejected.
- **References:** [Evolutionary Strategy Roadmap](./evolutionary-strategy-roadmap.md) · [UMS Applied Reference](../../../knowledge/demo/README.md) · [Adoption Cases](../../../knowledge/adoption-cases.md)

#### GT-40

**Title:** Provider replaceability proof

- **Gap:** Provider-neutral contracts are documented, but the same governed workflow has not been demonstrated against two interchangeable providers without changing the canonical domain.
- **Purpose:** Validate provider replaceability as an actual product differentiator rather than architectural optionality maintained only on paper.
- **Current evidence / example:** Platform profiles and composition boundaries exist, but there is no conformance fixture, replacement runbook, or measured provider swap.
- **Done when:** one provider category is replaced end to end without canonical domain changes; both implementations pass the same contract tests; the migration runbook records effort, data movement, rollback, and a predeclared replacement-cost threshold.
- **References:** [Governed Composition Target Design](../../../product-suite/architecture/evolith-governed-composition-target-design.md) · [Platform Profiles](../../../platforms/README.md) · [Strategic Validation and Composition Framework](./evolith-strategic-validation-and-composition-framework.md)

#### GT-41

**Title:** Automated maturity reconciliation

- **Gap:** Maturity reports, inventories, and the live gap board can diverge because their states and totals are maintained as separate narrative claims.
- **Purpose:** Keep prioritization and investment decisions aligned with current repository, release, and product evidence.
- **Current evidence / example:** The maturity assessment still references superseded open gaps and historical counts while the board reports their completion, creating contradictory views of readiness.
- **Done when:** a generated or reconciled report consumes the canonical board, inventories, test and release evidence, and Tracker evidence; it exposes freshness timestamps, separates Core from suite maturity, and fails on stale status, counts, or evidence links.
- **References:** [Maturity Assessment](./maturity-assessment.md) · [Inventory Summary](./inventory-summary.md) · [GT-35 Automated Inventories](#gt-35)

#### GT-42

**Title:** Cross-repository contract conformance

- **Gap:** Core, CLI, and Tracker can evolve their evidence and decision contracts independently without proving producer and consumer compatibility.
- **Purpose:** Ensure technical evaluations remain consumable by the authoritative Tracker throughout independent repository releases.
- **Current evidence / example:** Contract ADRs and JSON schemas exist, but there is no cross-repository compatibility matrix or CI suite that exercises supported producer and consumer versions together.
- **Done when:** shared versioned schemas or pinned contract references define compatibility policy; producer and consumer contract tests run across Core, CLI, and Tracker; CI verifies the latest supported version matrix and blocks incompatible changes.
- **References:** [ADR-0073 Unified CLI Output Contract](../../../architecture/adrs/core/0073-unified-cli-output-contract.md) · [Gate Evidence Schema](../../../../rulesets/schema/gate-evidence.schema.json) · [Tracker Technical Interfaces](../../../products/evolith-tracker/sdlc-tracker-technical-interfaces.md)

#### GT-43

**Title:** Operational product-value metrics

- **Gap:** Technical outputs and maturity claims do not yet quantify whether Evolith reduces decision delay, audit effort, rework, adoption friction, or provider lock-in.
- **Purpose:** Measure the product outcomes that distinguish governed composition from a documentation framework or validation CLI.
- **Current evidence / example:** The product vision names capability metrics, but no operational dataset, dashboard, owner, baseline, or review cadence demonstrates realized value.
- **Done when:** instrumentation and baselines exist for Evidence Completeness, Gate Automation, Traceability Coverage, Decision Lead Time, Audit Preparation Time, Provider Replacement Cost, Rework Avoided, Governance Adoption, and Composed Value; each metric has an owner and review cadence.
- **References:** [Metrics and Capability Maturity](../../../product-suite/vision/evolith-product-vision-master.md#11-metrics-and-capability-maturity) · [Evolutionary Strategy Roadmap](./evolutionary-strategy-roadmap.md) · [Maturity Assessment](./maturity-assessment.md)

---

## 2. Historical Baseline Snapshot

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
## 3. Legacy Archive — G-Series (closed)

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
[Back to Gap Tracking Board](./gap-tracking.md) · [Back to Vision Index](./README.md)
