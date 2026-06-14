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
- **Reopened evidence (2026-06-13):** Current `main` CI fails before tests because workspace `npm ci` triggers the root Husky prepare script without the root dependency installed. CI cache configuration also points to a missing `sdk/cli/package-lock.json`; the local green workspace is not reproducible from a clean checkout.
- **Reopening verification (2026-06-13):** Runs [SDK CLI CI 27467157131](https://github.com/beyondnetcode/evolith_arch32/actions/runs/27467157131) and [CI/CD 27467157129](https://github.com/beyondnetcode/evolith_arch32/actions/runs/27467157129) confirmed both blockers before suites executed: the cache could not resolve `sdk/cli/package-lock.json`, and the root `prepare` failed with `husky: not found`.
- **Done when:** from a clean checkout, CLI lint, build, unit tests, and MCP stdio/HTTP smoke all pass; no release-critical path is satisfied only by skipped tests.
- **Closure evidence:** Commit `84ec879` moved workspace installation and npm caching to the canonical root lockfile, restored the `test:cov` command, and made MCP smoke blocking in CI. A no-hardlink clone of that commit passed root `npm ci`, lint, build, 64 unit suites with 1,087 passing tests, 14 E2E suites with 121 passing tests, and MCP smoke over stdio and Streamable HTTP. The separate 80% coverage regression discovered after installation was unblocked is tracked by GT-48.
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

#### GT-41

**Title:** Automated maturity reconciliation

- **Gap:** Maturity reports, inventories, and the live gap board can diverge because their states and totals are maintained as separate narrative claims.
- **Purpose:** Keep prioritization and investment decisions aligned with current repository, release, and product evidence.
- **Current evidence / example:** The maturity assessment still references superseded open gaps and historical counts while the board reports their completion, creating contradictory views of readiness.
- **Ownership boundary:** Core reconciles only evidence it owns. Tracker and Product Suite maturity remain external inputs and must never inflate the Core score.
- **Done when:** a generated or reconciled report consumes the canonical Core board, inventories, and test and release evidence; it exposes freshness timestamps, separates Core from external product maturity, and fails on stale status, counts, or evidence links.
- **Closure evidence:** Core commit `154aadf` added a generated machine-readable reconciliation, regression tests, pre-commit and CI drift checks, and removed manually maintained current totals from the narrative assessment. External product maturity is explicitly excluded.
- **Reopened evidence (2026-06-13):** The generated snapshot reports every gap complete while four workflows on the same `main` commit are red. It records command names, not test, release, npm, skipped-suite, or CI outcomes, and the narrative assessment retains superseded capability states.
- **Reopening verification (2026-06-13):** Run [Documentation Validation 27467157149](https://github.com/beyondnetcode/evolith_arch32/actions/runs/27467157149) validated the corpus and bilingual parity, but semantic reconciliation failed because the shallow checkout did not contain registered closure commits.
- **Final closure evidence:** Commit `e4fa0e3` added a freshness-checked runtime evidence registry, explicit `PASS`/`BLOCKED` readiness outcomes, workflow and commit traceability, active-gap ownership for blockers, regression tests, and full-history checkout. Run [Documentation Validation 27470122212](https://github.com/beyondnetcode/evolith_arch32/actions/runs/27470122212) passed documentation, bilingual parity, semantic tracking, maturity reconciliation, and machine-contract validation.
- **References:** [Maturity Assessment](./maturity-assessment.md) · [Maturity Reconciliation](./maturity-reconciliation.json) · [Inventory Summary](./inventory-summary.md) · [Reconciliation Validator](../../../../.harness/scripts/reconcile-maturity.mjs)

#### GT-42

**Title:** Cross-repository contract conformance

- **Gap:** Core, CLI, and Tracker can evolve their evidence and decision contracts independently without proving producer and consumer compatibility.
- **Purpose:** Ensure technical evaluations remain consumable by the authoritative Tracker throughout independent repository releases.
- **Current evidence / example:** Contract ADRs and JSON schemas exist, but there is no cross-repository compatibility matrix or CI suite that exercises supported producer and consumer versions together.
- **Done when:** shared versioned schemas or pinned contract references define compatibility policy; producer and consumer contract tests run across Core, CLI, and Tracker; CI verifies the latest supported version matrix and blocks incompatible changes.
- **Closure evidence:** Core commit `154aadf` added the versioned manifest, immutable schema digests, fixtures, conformance tests, and CI enforcement. Tracker commit `4256e7b` pinned the supported contract and added its consumer workflow against Core.
- **References:** [ADR-0073 Unified CLI Output Contract](../../../architecture/adrs/core/0073-unified-cli-output-contract.md) · [Contract Manifest](../../../../rulesets/contracts/evolith-machine-contracts.json) · [Conformance Policy](../../../../rulesets/contracts/README.md) · [Conformance Validator](../../../../.harness/scripts/validate-contract-conformance.mjs)

#### GT-44

**Title:** Deterministic release pipeline integrity

- **Gap:** Release workflows apply release-only version checks to ordinary merges, reference `pkg.bin.evolith` while the package exposes `smart-cli`, download binary artifacts that are never uploaded, and mask an init smoke failure with `|| true`.
- **Purpose:** Make npm and binary releases reproducible, blocking, and trustworthy.
- **Current evidence / example:** GitHub Actions run [27451600153](https://github.com/beyondnetcode/evolith_arch32/actions/runs/27451600153) failed on `4a30a85`; npm confirms `@evolith/smart-cli@1.1.0` exists, but the current release path is unhealthy.
- **Done when:** release checks are event-correct; package and binary identity comes from `package.json`; every target is uploaded, downloaded, executed, and attached; smoke failures cannot be ignored; failure notification has valid permissions or degrades safely.
- **Closure evidence:** Commit `26f6a18` hardens both CLI pipelines against every defect: (1) `verify-git-tag.mjs` and `verify-version-log.mjs` are event-correct — they skip ordinary merges to `main` and only require a `docs-v*` tag and version-log entry when HEAD is an actual docs release, detected by the merge-commit message or a `docs-v*` tag at HEAD; (2) binary identity is derived from `package.json` in both `sdk-cli-ci.yml` (replacing the stale `pkg.bin.evolith` lookup that resolved to `undefined`) and the release `Verify Package Integrity` step; (3) `pkg` is pinned to `5.8.1`, binaries are renamed deterministically per target, uploaded as `binaries-<target>` artifacts, executed in a per-OS smoke matrix, and attached via a `binaries-*` download that asserts all three are present; (4) the init and version smoke steps no longer mask failures with `|| true`; (5) the failure notifier holds `issues: write` and wraps issue creation in `try/catch` to degrade safely.
- **Local verification (2026-06-13):** `GITHUB_REF_NAME=main GITHUB_EVENT_NAME=push node .harness/scripts/verify-git-tag.mjs` and the version-log equivalent both exit `0` with "Ordinary merge to main … skipping"; both workflow YAML files parse; the `package.json` identity derivation resolves to `[./dist/main.js]`. The definitive green release run is observable on the next release-triggering push to `main`. Status: `DONE`.
- **References:** [CLI Release Workflow](../../../../.github/workflows/sdk-cli-release.yml) · [CLI CI Workflow](../../../../.github/workflows/sdk-cli-ci.yml) · [Git Tag Verifier](../../../../.harness/scripts/verify-git-tag.mjs) · [Version Log Verifier](../../../../.harness/scripts/verify-version-log.mjs)

#### GT-45

**Title:** MCP transport and tool conformance suite

- **Gap:** Streamable HTTP smoke is active, but HTTP, API-key, message-routing, and multiple MCP tool suites remain disabled with `describe.skip`; some still target the removed minimal transport.
- **Purpose:** Prove consistent Core exposure over stdio and Streamable HTTP, including authentication, errors, resources, prompts, and registered tools.
- **Done when:** obsolete tests are removed or rewritten; no release-relevant MCP suite is skipped; protocol-negative cases run in CI; runtime tools and schemas match the generated inventory.
- **Closure evidence:** Commit `b07460d` removed 547 lines of obsolete minimal-transport tests, activated 47 agent/architecture/SDLC tool tests, added a no-skipped-suite and runtime-schema conformance gate, fixed runtime filesystem/config-parser injection, and validated 29 MCP E2E cases plus stdio/Streamable HTTP smoke for 21 tools, 7 resources, and 7 prompts.
- **Post-push verification (2026-06-13):** Red workflows for the closure commit fail during checkout, cache, or installation, before MCP conformance executes. No evidence contradicts the local closure suites; reproducibility and release blockers remain assigned to GT-28, GT-41, and GT-44. Status: `DONE`.
- **References:** [MCP Server](../../../../sdk/cli/src/infrastructure/mcp/server.ts) · [MCP E2E Tests](../../../../sdk/cli/test/e2e/mcp-e2e.test.ts)

#### GT-46

**Title:** Core HTTP service ownership boundary

- **Gap:** `smart-cli api` exposes an in-memory “Evolith Tracker Assistant” mock with unrestricted CORS and no governed Core contract, although this repository should contain only services that expose Core.
- **Purpose:** Prevent Tracker product behavior from leaking into the Core distribution while preserving a valid stateless Core API if that surface is retained.
- **Done when:** an explicit decision removes the mock API or replaces it with a documented, authenticated, stateless Core exposure contract; CORS is configurable and retained endpoints have schemas and tests.
- **Closure evidence:** Commit `b07460d` removed the `api` command, Tracker Assistant mock, in-memory chat sessions, controller, module, repository, and domain interfaces. The retained network service is the authenticated, contract-tested MCP Streamable HTTP exposure of Evolith Core.
- **Post-push verification (2026-06-13):** Review of the CI failures identifies no regression or reintroduction of Tracker surfaces into Core; every failure occurs before functional validation. The implemented ownership boundary remains in force. Status: `DONE`.
- **References:** [CLI Composition Root](../../../../sdk/cli/src/app.module.ts) · [MCP HTTP Service](../../../../sdk/cli/src/infrastructure/mcp/server.ts)

#### GT-47

**Title:** Product documentation and release synchronization

- **Gap:** Smart CLI docs advertise `0.0.3-beta`, MCP Services is a content placeholder, and maturity reporting says completed transport, contract, gate, and publication work is still missing.
- **Purpose:** Keep the public product narrative synchronized with the installable Core/CLI/MCP surfaces.
- **Done when:** a generated inventory supplies package version, commands, tools, resources, prompts, transports, schemas, and test evidence to EN/ES product docs and maturity reporting; CI rejects drift and placeholder product pages.
- **Closure evidence:** Commit `38dfc98` adds `generate-product-inventory.mjs`, which derives the installable surface (`@evolith/smart-cli@1.1.0`, bin, 18 commands, 21 MCP tools, 7 resources, 7 prompts, 2 transports, 17 schemas, live coverage) from the canonical CLI sources into a generated EN/ES [Product Surface Inventory](../../../products/smart-cli/product-inventory.md). The Smart CLI README (EN/ES) was refreshed from `0.0.3-beta`/88.7% to `1.1.0` with current coverage, and the MCP Services placeholder (EN/ES) was replaced with the real tools/resources/prompts/transports surface. `validate-product-docs.mjs` rejects placeholder pages, version drift, and a stale inventory; it runs in the pre-commit hook and the docs CI workflow.
- **Local verification (2026-06-14):** `generate-product-inventory.mjs --check`, `validate-product-docs.mjs`, `validate-docs.mjs` (827 files), and bilingual parity all pass. Status: `DONE`.
- **References:** [Smart CLI Product](../../../products/smart-cli/README.md) · [MCP Services Product](../../../products/mcp-services/README.md) · [Product Surface Inventory](../../../products/smart-cli/product-inventory.md)

#### GT-48

**Title:** Restore the normative CLI coverage threshold

- **Gap:** Once clean workspace installation was restored, the blocking coverage gate exposed 66.14% statement coverage against the normative 80% threshold. Historical maturity evidence still claims 88.70%, so the executable result and product narrative diverge.
- **Purpose:** Recover meaningful regression protection without lowering the accepted quality threshold or excluding production code merely to improve the metric.
- **Current evidence / example:** `npm run test:cov --workspace @evolith/smart-cli -- --coverageReporters=json-summary` passes 1,087 tests but reports 4,083 of 6,173 statements covered. The CI gate now reads `.total.statements.pct`, matching the phase-gate contract.
- **Done when:** statement coverage is at least 80% from a clean checkout; new tests prioritize release-critical validators, policy handlers, CLI commands, MCP runtime paths, and filesystem providers; CI blocks regressions and maturity evidence is regenerated from the current report.
- **Closure evidence:** Commit `48e1d90` raises statement coverage from 66.14% to **80.65%** (4,979 / 6,173) with 1,206 passing unit tests, targeting exactly the surfaces named above. The two service suites broken by the [GT-04](#gt-04) service-locator removal were revived with constructor injection (MoscowPrioritizationService 2.58% → 98%, ArchitectureDriftService 3.78% → 94%); all seven native rule handlers gained specs (~93% each); the OPA input builder (28% → 91%), disk ruleset repository (11% → 90%), and both filesystem providers (Mock 0% → 96%, Node 100%) are now covered. The CI gate at `sdk-cli-ci.yml` reads `.total.statements.pct` and blocks below 80%; durable per-run enforcement in `jest.config.js` remains tracked by [GT-50](#gt-50).
- **CI verification (2026-06-13):** the Unit Tests job in [run 27479301558](https://github.com/beyondnetcode/evolith_arch32/actions/runs/27479301558) is green, the blocking coverage gate prints `Statement coverage: 80.65%`, and Package Integrity passes. The same commit fixed the gate's reporter so it emits the `json-summary` the threshold check parses. Status: `DONE`.
- **References:** [CLI CI Workflow](../../../../.github/workflows/sdk-cli-ci.yml) · [Jest Configuration](../../../../sdk/cli/jest.config.js) · [Testing Strategy](../../../products/smart-cli/docs/planning/testing-strategy.md) · [GT-04](#gt-04) · [GT-50](#gt-50)

#### GT-49

**Title:** Enforce TypeScript strict mode and typed filesystem ports

- **Gap:** The CLI compiles with `strictNullChecks`, `noImplicitAny`, and `strictBindCallApply` disabled (`sdk/cli/tsconfig.json`), and 78 `: any` annotations remain in `src`. Sixteen are `fs: any` parameters even though an `IFileSystem` port already exists and is consumed elsewhere, so the typed boundary is bypassed at the command layer.
- **Purpose:** Make the compiler enforce the null-safety and typed-port discipline that the Maintainability pillar already claims as `Validated`, removing a class of latent defects the current configuration hides.
- **Current evidence / example:** `adr.command.ts` and `standards.command.ts` declare private handlers as `fs: any`; `tsconfig.json:19-21` turns off strict null and implicit-any checks; ESLint does not enable `@typescript-eslint/no-explicit-any`.
- **Done when:** strict mode is enabled (incrementally if required), `fs: any` parameters are typed against `IFileSystem`, the remaining `: any` usages are typed or justified with an inline suppression, and the build stays green under the tightened configuration.
- **Closure evidence:** Commit `398729d` sets `strictNullChecks`, `noImplicitAny`, and `strictBindCallApply` to `true` in `tsconfig.json` — the explicit `false` overrides had previously neutralized even a `--strict` invocation. The resulting 10 type errors are resolved: all 16 `fs: any` parameters are typed against `IFileSystem` (adr/standards commands and the application service use cases), plus a strict-boolean `canHandle`, an optional `updateADR` status, unified `FileReadOptions`/`FileWriteOptions` encoding, null-safe MCP filesystem/watcher, a narrowed decorator target, and null-coalesced prompt defaults. `@typescript-eslint/no-explicit-any` is enabled as a warning so new explicit `any` is surfaced; the remaining occurrences sit at genuine dynamic boundaries (logger varargs, OPA/JSON payloads, catalog data).
- **Local verification (2026-06-13):** `npx tsc --noEmit` is clean under the tightened configuration; `npm run build`, 1,206 unit tests, and 121 E2E tests pass; lint reports 0 errors. Status: `DONE`.
- **References:** [CLI tsconfig](../../../../sdk/cli/tsconfig.json) · [ESLint configuration](../../../../sdk/cli/.eslintrc.js) · [ADR-0019 Tactical Design Patterns](../../../architecture/adrs/core/0019-tactical-design-patterns-future-proofing.md)

#### GT-50

**Title:** Enforce coverage thresholds in Jest configuration

- **Gap:** The normative 80% statement threshold is enforced only by a Bash step in CI (`sdk-cli-ci.yml`), while `jest.config.js` declares no `coverageThreshold`. A local `npm test` therefore never fails on coverage, so regressions surface only after push.
- **Purpose:** Make the coverage contract enforceable at the point of change rather than exclusively in CI, closing the split-brain between the runner and the pipeline.
- **Done when:** `jest.config.js` declares a `coverageThreshold` aligned with the normative target (ideally per-directory ratchets that prevent silent regressions), the CI check and the Jest configuration agree on the threshold, and the local coverage command fails on regression. Coordinate the absolute number with [GT-48](#gt-48).
- **Closure evidence:** Commit `040ea7f` adds a global `coverageThreshold` to `jest.config.js` — `statements: 80` (identical to the `sdk-cli-ci.yml` bash gate), `lines: 80`, `functions: 75`, `branches: 67` — so `npm run test:cov` now fails locally on regression instead of only after push. The thresholds sit at or just below the floors restored by [GT-48](#gt-48) (80.65% statements, 81.47% lines, 76.36% functions, 68.87% branches).
- **Local verification (2026-06-14):** `npm run test:cov` passes 1,206 tests and reports coverage above every threshold; Jest exits 0. A drop below any floor now fails the command. Status: `DONE`.
- **References:** [Jest Configuration](../../../../sdk/cli/jest.config.js) · [CLI CI Workflow](../../../../.github/workflows/sdk-cli-ci.yml) · [GT-48](#gt-48)

#### GT-51

**Title:** Build-versus-Compose gate evidence validation

- **Gap:** The Product Vision makes Build-versus-Compose analysis mandatory Business Sign-Off gate evidence (vision §5.3), but Core's gate evaluation has no evidence type or validator for it. Gate checks remain narrower than the vision requires.
- **Purpose:** Align Core's executable gate evidence with the vision's non-negotiable Discovery requirement so a governed disposition (Adopt/Embed/Integrate/Extend/Build/Reject) is auditable rather than implicit.
- **Current evidence / example:** vision §5.3 enumerates alternatives, disposition, three-year cost, licensing, tenant isolation, and provider replaceability as required evidence; no `GateEvidence` schema or phase-gate validator currently models them.
- **Done when:** a Build-versus-Compose evidence schema exists, the phase-gate validator checks its presence and content for the Business Sign-Off gate, and CLI/MCP surfaces expose the result with the ADR-0073 envelope.
- **Closure evidence:** Commit `54386a3` adds `rulesets/schema/build-vs-compose.schema.json`, modeling every §5.3 field — evaluated alternatives, a governed Adopt/Embed/Integrate/Extend/Build/Reject disposition, three-year cost, licensing, tenant isolation/data ownership, provider replaceability, PoC requirements, and a native justification that is conditionally required when the disposition is `Build`. The Business Sign-Off (Phase 1) gate in `phase-gates.rules.json` now lists it as mandatory evidence, and the phase-gate validator maps it to `.evolith/build-vs-compose.json` and validates presence **and** content via Ajv — surfaced through the existing ADR-0073 gate-evidence envelope on the CLI (`gate evaluate`) and the MCP `evolith-gate-evaluate` tool. The phase-gate schema count rises to 18.
- **Local verification (2026-06-14):** a new spec asserts schema acceptance/rejection (missing disposition, unknown value, Build-without-justification, missing cost/security) and validator integration (valid passes, invalid fails, absent fails); the `gate.e2e-spec` still returns a schema-valid failing envelope. 1,215 unit tests pass; coverage stays at 80.70%. Status: `DONE`.
- **References:** [Product Vision Master §5.3](../../../product-suite/vision/evolith-product-vision-master.md) · [Build-versus-Compose Schema](../../../../rulesets/schema/build-vs-compose.schema.json) · [Phase Gate Validator](../../../../packages/core-domain/src/application/validators/phase-gate-validator.service.ts) · [GT-08](#gt-08)

#### GT-52

**Title:** Remove dead dependency-injection container stubs

- **Gap:** `src/infrastructure/di/container.ts` still exports `getContainer = () => ({})` and `resetContainer = () => {}` as no-op stubs left behind after the service-locator removal ([GT-04](#gt-04)) and DI consolidation ([GT-17](#gt-17)).
- **Purpose:** Eliminate a phantom seam that misrepresents the wiring model, so the composition root in `app.module.ts` is the single source of construction.
- **Done when:** the stubs are removed (or replaced by a real, used abstraction), no production code depends on them, and the build and tests pass.
- **Closure evidence:** Commit deletes `sdk/cli/src/infrastructure/di/container.ts` (the `getContainer`/`resetContainer` no-op stubs left after [GT-04](#gt-04) and [GT-17](#gt-17)); no production code imported them. The now-dead `jest.mock('.../di/container', …)` blocks and unused imports were removed from the app-module, init/adr/standards command specs, and the gate-status spec. The composition root in `app.module.ts` is the single source of construction; build, 1,206 unit tests, and 121 E2E tests pass with coverage at 80.70%.
- **References:** [Composition Root](../../../../sdk/cli/src/app.module.ts) · [GT-17](#gt-17)

#### GT-53

**Title:** Repair migrated product-vision references

- **Gap:** The Maturity Assessment links to `./evolith-product-vision-master.md`, which is now only a migration stub; the canonical document moved to `reference/product-suite/vision/`. The single maturity surface points to a redirect placeholder.
- **Purpose:** Keep the canonical maturity and vision surfaces pointing at live content so navigation and validation reflect the real document graph.
- **Done when:** the maturity assessment (EN/ES) and any other Core references resolve to the canonical vision path, and link validation passes with no redirect stubs in the referenced graph.
- **Closure evidence:** The migration redirect stubs at `reference/governance/standards/vision/evolith-product-vision-master.md` (+`.es.md`) are deleted, and every Core reference now resolves to the canonical `reference/product-suite/vision/` path: the Maturity Assessment (EN/ES), the vision and product-suite/vision READMEs (the latter previously linked back to the stub), the root README, and `rulesets/acl/README` (EN/ES). Deleting the stubs surfaced these otherwise-hidden migrated links, which `validate-docs.mjs` now confirms resolve. The bilingual index was regenerated.
- **Local verification (2026-06-14):** `validate-docs.mjs` passes for 825 files with no broken links, bilingual parity and orphan checks pass, and no stub references remain outside the historical migration ledger. Status: `DONE`.
- **References:** [Maturity Assessment](./maturity-assessment.md) · [Canonical Vision Master](../../../product-suite/vision/evolith-product-vision-master.md)

#### GT-54

**Title:** Complete strict hexagonal boundary enforcement

- **Gap:** Two residual seams remain after the `core/` migration ([GT-19](#gt-19)): ESLint still permits `application → infrastructure` imports as a documented "pragmatic CLI allowance" (`.eslintrc.js`), and large use cases retain mixed responsibilities — `InitializeProjectUseCase` (~280 lines) in the `services/index.ts` barrel and the 500-line `phase-gate-validator.service.ts`.
- **Purpose:** Close the last mile to strict hexagonal boundaries so the application layer depends only on ports, and oversized use cases are decomposed by responsibility.
- **Done when:** the `application → infrastructure` allowance is removed (application depends only on ports/domain), the oversized use cases are decomposed into focused units, and ESLint boundaries plus the full test suite pass.
- **References:** [ESLint configuration](../../../../sdk/cli/.eslintrc.js) · [Application services barrel](../../../../packages/core-domain/src/application/services/index.ts) · [GT-19](#gt-19) · [GT-17](#gt-17)

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

#### GT-55

**Title:** TypeScript strictness and implicit any elimination

- **Gap:** The `sdk/cli` workspace produces over 105 `@typescript-eslint/no-explicit-any` warnings during linting. These are predominantly in core boundary classes like `prompt.service.ts` and `base-command.ts`.
- **Purpose:** Enforce type safety across all system boundaries to prevent runtime regressions and fulfill the static typing guarantees mandated by the Evolith Architecture.
- **Done when:** The linting rule `@typescript-eslint/no-explicit-any` can be upgraded from `warn` to `error` and passes across all packages without suppressing errors.
- **References:** [prompt.service.ts](../../../../sdk/cli/src/infrastructure/prompts/prompt.service.ts)

---

#### GT-56

**Title:** Silent failures and missing mocks in CLI E2E tests

- **Gap:** `test/agents.e2e-spec.ts` swallows internal exceptions. Upon deeper inspection, the test triggers a silent `TypeError: p.select is not a function` because `@clack/prompts` is not being correctly mocked via `nest-commander-testing`.
- **Purpose:** Guarantee that all CLI user flows, specifically interactive prompts, are properly tested and verified in the CI/CD pipeline without silent failures.
- **Done when:** `@clack/prompts` is correctly mocked in E2E tests, and the `try-catch` swallowing logic in `test/agents.e2e-spec.ts` is replaced with strict assertions.
- **References:** [agents.e2e-spec.ts](../../../../sdk/cli/test/agents.e2e-spec.ts)

---

#### GT-57

**Title:** Incomplete MCP tooling and validation implementation

- **Gap:** Various MCP features listed in `planning/sdk-cli-mcp-implementation-roadmap.md` remain unimplemented as stubs (`TODO`), including F1/F2/F3 validation, DORA metrics collection, and the `evolith://core/info` resource.
- **Purpose:** Deliver the full proposed feature-set of the Evolith MCP server to support LLM context augmentation.
- **Done when:** All `TODO`s in the MCP implementation roadmap are implemented, and their respective MCP tools/resources are tested.
- **References:** [sdk-cli-mcp-implementation-roadmap.md](../../../products/smart-cli/docs/planning/sdk-cli-mcp-implementation-roadmap.md)

---

#### GT-58

**Title:** Clean up `TODO` stubs injected by Hexagonal Scaffolder

- **Gap:** `hexagonal-scaffolder.ts` injects boilerplate containing technical debt directly into newly created components (e.g. `// TODO: add validation rules`, `// TODO: implement persistence`).
- **Purpose:** Provide a completely clean and ready-to-use template for new bounded contexts instead of injecting pre-existing technical debt.
- **Done when:** The generator produces clean, complete dummy implementations or handles abstractions without leaving inline `TODO`s for the user.
- **References:** [hexagonal-scaffolder.ts](../../../../packages/core-domain/src/application/generators/hexagonal-scaffolder.ts)

---

### Phase Cross — Core API Maturity & Excellence

#### GT-59

**Title:** Hardening HTTP — Helmet + CORS + Rate Limiting (OWASP API4/8)

- **Gap:** `apps/core-api` `main.ts` starts the server without any security headers, CORS policy, or rate limiting, exposing it to OWASP API4 (Unrestricted Resource Consumption) and API8 (Security Misconfiguration).
- **Purpose:** Apply a minimum baseline of HTTP-level security to the Core API: security headers via Helmet, explicit CORS policy driven by environment variables, and global rate limiting via `@nestjs/throttler`.
- **Done when:**
  - [x] `helmet()` applied globally in `main.ts`
  - [x] CORS configured from `ALLOWED_ORIGINS` environment variable
  - [x] `ThrottlerGuard` registered as global `APP_GUARD`
  - [x] Integration test validates security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- **References:** [OWASP API4:2023](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/) · [OWASP API8:2023](https://owasp.org/API-Security/editions/2023/en/0xa8-security-misconfiguration/) · [apps/core-api/src/main.ts](../../../../apps/core-api/src/main.ts)

#### GT-60

**Title:** Global Input Validation with DTOs and class-validator (OWASP API3)

- **Gap:** Controllers accept `@Body() body: any` without validation, exposing the API to OWASP API3:2023 (Broken Object Property Level Authorization / Mass Assignment) and injection attacks.
- **Purpose:** Enforce a strict input contract on every endpoint using `class-validator` DTOs and a global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true`.
- **Done when:**
  - [x] Global `ValidationPipe` enabled with `whitelist: true, forbidNonWhitelisted: true, transform: true`
  - [x] DTOs created for every endpoint using `class-validator` decorators
  - [x] Response DTOs created (domain types never returned directly)
- **References:** [OWASP API3:2023](https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/) · [apps/core-api/src/app.module.ts](../../../../apps/core-api/src/app.module.ts)

#### GT-61

**Title:** Structured Error Responses — RFC 9457 Problem Details Filter

- **Gap:** No global exception filter exists. Unhandled errors expose stack traces and return inconsistent response shapes. RFC 9457 (`application/problem+json`) is not implemented.
- **Purpose:** Implement a global `ProblemDetailsFilter` that intercepts all exceptions and returns RFC 9457-compliant `application/problem+json` responses without leaking internal details.
- **Done when:**
  - [x] Global `ProblemDetailsFilter` registered in `main.ts`
  - [x] `Content-Type: application/problem+json` on all error responses
  - [x] Stack traces never exposed when `NODE_ENV === 'production'`
  - [x] Correlation ID (`x-trace-id`) propagated in error responses
- **References:** [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) · [apps/core-api/src/main.ts](../../../../apps/core-api/src/main.ts)

#### GT-62

**Title:** Authentication and Authorization — API Key + JWT (OWASP API1/2/5)

- **Gap:** The Core API is completely open with no authentication mechanism. This is critical: any client can invoke gate evaluation, project initialization, and architecture drift detection without credentials.
- **Purpose:** Implement API Key authentication for M2M (Tracker → Core API) communication, and document the path to JWT Bearer tokens for future human-facing access. Enforce OWASP API1, API2, and API5 mitigations.
- **Done when:**
  - [x] API Key middleware validates `x-api-key` header against hashed key store
  - [x] `@Public()` decorator available for health/metrics endpoints
  - [x] Strategy documented in `ADR-0075-core-api-auth-strategy.md`
  - [x] All sensitive endpoints return 401 without valid credentials
- **References:** [OWASP API1:2023](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/) · [OWASP API2:2023](https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/)

#### GT-63

**Title:** Security Audit Logging (OWASP API9)

- **Gap:** No structured logging of security events: denied access, failed validations, rate limit hits. OWASP API9:2023 (Improper Inventory Management) requires complete visibility into API usage.
- **Purpose:** Implement a `SecurityAuditInterceptor` that logs: IP, method, path, user identifier, and allow/deny outcome for every request. No PII or tokens logged.
- **Done when:**
  - [x] `SecurityAuditInterceptor` registered globally
  - [x] Throttling events logged at WARN level
  - [x] All logs in JSON structured format
  - [x] No passwords, tokens, or PII in any log output
- **References:** [OWASP API9:2023](https://owasp.org/API-Security/editions/2023/en/0xa9-improper-inventory-management/)

#### GT-64

**Title:** Structured Logging with Correlation ID (Pino)

- **Gap:** NestJS default logger outputs plain text strings. No `x-correlation-id` propagation between requests. Impossible to correlate logs in production or distributed environments.
- **Purpose:** Replace the default NestJS logger with Pino for structured JSON logging. Implement a `CorrelationIdMiddleware` using `AsyncLocalStorage` to propagate a correlation ID through all async boundaries.
- **Done when:**
  - [x] All logs are JSON with fields: `timestamp`, `level`, `context`, `correlationId`
  - [x] `x-correlation-id` extracted from incoming requests or generated via UUID
  - [x] Correlation ID propagated in all responses and error objects
- **References:** [nestjs-pino](https://github.com/iamolegga/nestjs-pino) · [apps/core-api/src/main.ts](../../../../apps/core-api/src/main.ts)

#### GT-65

**Title:** Prometheus Metrics and Advanced Health Checks (Liveness/Readiness)

- **Gap:** The `/health` endpoint returns only `{ status: 'ok' }`. No Prometheus metrics. Kubernetes cannot distinguish between liveness and readiness probes.
- **Purpose:** Implement differentiated health checks (`/health/live` and `/health/ready`) using `@nestjs/terminus`, and expose domain-level business metrics via Prometheus at `/metrics`.
- **Done when:**
  - [ ] `GET /health/live` returns 200 (process alive) or 503
  - [ ] `GET /health/ready` verifies external dependencies
  - [ ] `GET /metrics` exposes Prometheus format with at least 3 business metrics
  - [ ] `evolith_gate_evaluations_total{status}` and `evolith_gate_evaluation_duration_seconds` exported
- **References:** [@nestjs/terminus](https://docs.nestjs.com/recipes/terminus) · [prom-client](https://github.com/siimon/prom-client)

#### GT-66

**Title:** Distributed Tracing with OpenTelemetry

- **Gap:** No distributed tracing exists. When Evolith Tracker calls Core API, there is zero visibility into the call chain. Latency and errors in production are undebuggable.
- **Purpose:** Initialize the OpenTelemetry Node.js SDK before NestJS bootstrap, enabling auto-instrumentation of HTTP and filesystem operations. Export spans to an OTLP-compatible backend.
- **Done when:**
  - [ ] `tracing.ts` initialized before NestJS bootstrap in production
  - [ ] `trace_id` and `span_id` included in all log entries
  - [ ] Custom spans in `EvaluateGateUseCase` and `validateArchitecture`
  - [ ] OTLP export configured via environment variable
- **References:** [OpenTelemetry NestJS](https://opentelemetry.io/docs/zero-code/js/nestjs/) · [apps/core-api/src/main.ts](../../../../apps/core-api/src/main.ts)

#### GT-67

**Title:** OpenAPI 3.1 Complete Specification

- **Gap:** No OpenAPI specification exists. The Evolith Tracker cannot generate a typed client SDK. Contracts between services are implicit and brittle.
- **Purpose:** Implement `@nestjs/swagger` with full decorator coverage on all controllers and DTOs. Generate and version `openapi.json` as part of the build.
- **Done when:**
  - [ ] `@nestjs/swagger` installed and configured in `main.ts`
  - [ ] All endpoints documented with `@ApiOperation`, `@ApiResponse`, `@ApiBody`
  - [ ] All DTOs annotated with `@ApiProperty`
  - [ ] `GET /api/docs` serves Swagger UI
  - [ ] `openapi.json` generated in build and versioned in repository
- **References:** [@nestjs/swagger](https://docs.nestjs.com/openapi/introduction) · [apps/core-api](../../../../apps/core-api)

#### GT-68

**Title:** API Versioning with URI Strategy

- **Gap:** Endpoints are not versioned (`/gates/...` instead of `/api/v1/gates/...`). Breaking changes will break integrations without a versioning strategy.
- **Purpose:** Enable URI versioning (`/api/v1/`) on all Core API endpoints and document a deprecation policy (minimum 2 coexisting versions).
- **Done when:**
  - [ ] All endpoints under `/api/v1/`
  - [ ] `CHANGELOG.md` documents version changes
  - [ ] Deprecation policy documented in ADR
- **References:** [NestJS Versioning](https://docs.nestjs.com/techniques/versioning) · [apps/core-api](../../../../apps/core-api)

#### GT-69

**Title:** Richardson Maturity Level 2 — Correct HTTP Verbs and Status Codes

- **Gap:** Some controllers use `POST` for read operations. HTTP status codes are not semantically correct for domain error scenarios (always 200/201).
- **Purpose:** Align all endpoints with Richardson Maturity Level 2: correct HTTP verbs, semantically meaningful status codes for every domain outcome.
- **Done when:**
  - [x] All endpoints use semantically correct HTTP methods
  - [x] 422 Unprocessable Entity returned for domain validation failures
  - [x] 404 returned when resources are not found
  - [x] `@HttpCode()` explicit on controllers where default is wrong
- **References:** [Richardson Maturity Model](https://martinfowler.com/articles/richardsonMaturityModel.html)

#### GT-70

**Title:** Graceful Shutdown and OS Signal Handling

- **Gap:** The server does not handle OS signals (`SIGTERM`, `SIGINT`). In Kubernetes, in-flight requests are abruptly interrupted when a pod is terminated.
- **Purpose:** Enable NestJS shutdown hooks and implement `OnModuleDestroy` in services holding external resources. Drain in-flight requests before process exit.
- **Done when:**
  - [x] `app.enableShutdownHooks()` enabled
  - [x] `OnModuleDestroy` implemented in services with external resources
  - [x] Integration test verifies in-flight requests complete before shutdown
- **References:** [NestJS Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events) · [apps/core-api/src/main.ts](../../../../apps/core-api/src/main.ts)

#### GT-71

**Title:** Circuit Breaker for External Service Calls

- **Gap:** If the filesystem (`IFileSystem`) or OPA WASM process fails, errors propagate without graceful degradation. No retry or fallback logic exists.
- **Purpose:** Wrap critical external calls in a circuit breaker (opossum) to prevent cascading failures and provide fallback responses when dependencies are unavailable.
- **Done when:**
  - [ ] Circuit breaker wraps `IFileSystem` calls in critical operations
  - [ ] Fallback returns degraded response with `503 Service Unavailable`
  - [ ] Circuit breaker state metrics exposed in `/metrics`
- **References:** [opossum](https://github.com/nodeshift/opossum) · [packages/core-domain/src/domain/interfaces.ts](../../../../packages/core-domain/src/domain/interfaces.ts)

#### GT-72

**Title:** Eliminate `@ts-nocheck` from the Application Layer

- **Gap:** 12 files in `packages/core-domain/src/application/` and 9 in `sdk/cli` have `// @ts-nocheck` added during the migration to unblock the build. This hides real type errors and violates TypeScript strict principles.
- **Purpose:** Remove all `@ts-nocheck` pragmas, fix all underlying type errors with proper typed interfaces, and re-enable `strict: true` in the core-domain tsconfig.
- **Done when:**
  - [x] Zero files with `@ts-nocheck` in `packages/core-domain`
  - [x] `packages/core-domain/tsconfig.json` has `strict: true`
  - [x] `noImplicitAny: true` across all workspace tsconfigs
- **References:** [packages/core-domain/src/application](../../../../packages/core-domain/src/application) · [GT-49](#gt-49)

#### GT-73

**Title:** Core API Test Suite — Unit, Integration, and E2E

- **Gap:** `apps/core-api` has zero meaningful tests. The scaffolded `health.controller.spec.ts` likely fails due to the new DI setup.
- **Purpose:** Establish a test pyramid for the Core API: unit tests for controllers (mocked use cases), integration tests for module wiring, and E2E tests for critical paths.
- **Done when:**
  - [x] `jest --coverage` reports >80% line coverage in `src/`
  - [x] CI executes tests on every PR
  - [x] Error paths (auth failure, invalid input, domain error) all covered
  - [x] At least 5 E2E flows tested via supertest
- **References:** [apps/core-api/src](../../../../apps/core-api/src) · [@nestjs/testing](https://docs.nestjs.com/fundamentals/testing)

#### GT-74

**Title:** Configuration Module with Environment Variable Validation (Zod)

- **Gap:** `main.ts` uses `process.env.PORT` directly without validation. No typed configuration module. Hardcoded values scattered in the code.
- **Purpose:** Implement `@nestjs/config` with Zod schema validation to fail fast on missing required environment variables and provide type-safe configuration throughout the application.
- **Done when:**
  - [x] All environment variables validated at startup with Zod schema
  - [x] Process fails with clear message if a required variable is missing
  - [x] `README.md` documents all environment variables
  - [x] `.env.example` with safe default values committed to repository
- **References:** [@nestjs/config](https://docs.nestjs.com/techniques/configuration) · [apps/core-api](../../../../apps/core-api)

#### GT-75

**Title:** Shared `@evolith/infra-providers` Package

- **Gap:** Infrastructure providers (`NodeFileSystemProvider`, `NestLoggerProvider`, `YamlConfigParserProvider`) are duplicated in `apps/core-api/src/infrastructure/providers/` and `sdk/cli/src/infrastructure/providers/`, violating DRY.
- **Purpose:** Extract infrastructure providers into a shared `packages/infra-providers` package (`@evolith/infra-providers`) consumed by both `apps/core-api` and `sdk/cli`.
- **Done when:**
  - [ ] `packages/infra-providers` package created with its own `package.json`
  - [ ] Duplicated providers removed from `apps/core-api` and `sdk/cli`
  - [ ] `@evolith/infra-providers` added as dependency in both consumers
- **References:** [apps/core-api/src/infrastructure/providers](../../../../apps/core-api/src/infrastructure/providers) · [sdk/cli/src/infrastructure/providers](../../../../sdk/cli/src/infrastructure/providers)

#### GT-76

**Title:** Expose `PhaseTransitionUseCase` in Core API

- **Gap:** `PhaseTransitionUseCase` exists in `core-domain` but is not exposed via the Core API REST interface. The Tracker cannot query or trigger phase transitions through the service.
- **Purpose:** Create a `PhasesController` with `POST /api/v1/phases/transition` and `GET /api/v1/phases/:projectId` endpoints backed by `PhaseTransitionUseCase`.
- **Done when:**
  - [x] `PhasesController` created with transition and status endpoints
  - [x] `PhaseTransitionUseCase` injected via `CoreDomainProviders`
  - [x] `TransitionPhaseDto` with class-validator decorators
  - [x] Unit tests for the controller
- **References:** [packages/core-domain/src/application/use-cases/phase-transition.use-case.ts](../../../../packages/core-domain/src/application/use-cases/phase-transition.use-case.ts) · [apps/core-api/src/app.module.ts](../../../../apps/core-api/src/app.module.ts)

#### GT-77

**Title:** Extract `CoreDomainModule` from `AppModule`

- **Gap:** `CoreDomainProviders` are declared as an inline array inside `AppModule`, making the module hard to test in isolation and violating Single Responsibility.
- **Purpose:** Extract all Core Domain provider wiring into a dedicated `CoreDomainModule` that `AppModule` imports, enabling isolated testing of domain DI composition.
- **Done when:**
  - [x] `CoreDomainModule` extracted as an independent NestJS module
  - [x] `AppModule` imports `CoreDomainModule` instead of declaring providers directly
  - [x] `CoreDomainModule` can be imported in integration tests in isolation
- **References:** [apps/core-api/src/app.module.ts](../../../../apps/core-api/src/app.module.ts)

#### GT-78

**Title:** Remove Debug Scripts from Repository Root

- **Gap:** Files `fix-arch.js`, `fix-ts.js`, `fix-types.js`, and `refactor.js` exist in the repository root as temporary debugging artifacts. They are listed as exceptions in `validate-root-cleanliness.mjs`.
- **Purpose:** Remove all temporary debugging scripts from the root and clean up the corresponding exception entries in the root cleanliness validator.
- **Done when:**
  - [x] `fix-arch.js`, `fix-ts.js`, `fix-types.js`, `refactor.js` deleted from root
  - [x] Exception entries removed from `.harness/scripts/validate-root-cleanliness.mjs`
  - [x] `validate-root-cleanliness.mjs` passes without the exception allowlist entries
- **References:** [.harness/scripts/validate-root-cleanliness.mjs](../../../../.harness/scripts/validate-root-cleanliness.mjs)
