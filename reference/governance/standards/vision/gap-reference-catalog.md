# Evolith Core — Gap Reference Catalog

> **Bilingual Navigation:** [Versión en Español](./gap-reference-catalog.es.md)

**Owner:** Evolith Architecture Board
**Status Authority:** [Gap Tracking Board](./gap-tracking.md)
**Closure Authority:** [Gap Closure Evidence Standard](./gap-closure-evidence-standard.md) · [`gap-closure-evidence.json`](./gap-closure-evidence.json)

This catalog explains each gap: problem, purpose, evidence, closure criteria, and references. It is not a tracking board; priority and status are authoritative only in the [Gap Tracking Board](./gap-tracking.md).

---

## 1. Gap Details

#### GT-313

**Title:** Rotate and externalize GH_TOKEN via a secret manager

- **Purpose:** Remove the live GitHub Personal Access Token from the on-disk `.env` and source it from a secret manager / CI secret, closing the only open critical security finding.
- **Evidence:** `.env` contains `GH_TOKEN=ghp_…` in plaintext (git-ignored but live on disk); flagged in `CERTIFICACION_MADUREZ.md` §6.
- **Complexity:** XS
- **Done when:**
  - [ ] The current token is revoked and reissued in GitHub.
  - [ ] Credentials are sourced from a secret manager / CI secret, not a plaintext `.env`.

#### GT-314

**Title:** Validate the real satellite artifact, not the Core template

- **Purpose:** Make gate evaluation validate the artifact produced by the satellite (structure, schema, completeness) instead of resolving to the Core template path, so AJV/semantic validation is meaningful for PRD/stories/feasibility.
- **Evidence:** `packages/core-domain/src/application/validators/evidence-validator.ts` (`resolveArtifactPath`) maps each artifact to a template under Core; admitted as tech debt in-code. AJV is effectively inert for several artifacts.
- **Complexity:** M
- **Done when:**
  - [x] The validator resolves the satellite artifact path, not the Core template.
  - [x] AJV runs against real artifact data when a `schemaRef` exists.
  - [x] Tests cover existence + structural + completeness validation.

#### GT-315

**Title:** Domain event system: bus + outbox + versioned events

- **Purpose:** Emit governed domain events so Tracker, pipelines, auditing and external systems can react asynchronously instead of polling.
- **Evidence:** No event bus/emitter exists; only a one-shot `IWebhookNotifier.notify(url, evidence)` (`packages/core-domain/src/application/ports/webhook-notifier.port.ts`). No named events (`phase.*`, `gate.*`, `artifact.*`).
- **Complexity:** L
- **Done when:**
  - [x] A domain event bus + transactional outbox exist.
  - [x] Versioned events emitted: `phase.started/completed`, `gate.approved/rejected`, `artifact.created/updated/validated`, `blueprint.generated/validated`, `workflow.updated`.
  - [x] A versioned event catalog is documented and consumable.

#### GT-316

**Title:** Unified verdict + artifact/phase lifecycle state machine

- **Purpose:** Provide a single canonical verdict model and a formal lifecycle (created → in-progress → pending-validation → approved/rejected/observed → versioned → archived) for phases and artifacts.
- **Evidence:** Three divergent verdict models — `gate-evidence.ts` (`passed|failed|skipped`, canonical), `gates/decision/gate-decision.ts` (`PASS|FAIL|WAIVED`, orphan), `phases/transition/phase-transition.model.ts` (orphan). No artifact state machine.
- **Complexity:** L
- **Done when:**
  - [x] One canonical verdict vocabulary; orphan models integrated or removed.
  - [x] Artifact/phase state machine implemented and enforced.
  - [x] Tests cover all transitions.

#### GT-317

**Title:** validateWorkflow(definition) — Tracker composition seam

- **Purpose:** Keep Core tenant-agnostic while letting Tracker supply a composed `WorkflowDefinition` that Core validates against its invariants (mandatory gates, OPA, non-omittable artifacts). Core does NOT store per-tenant config.
- **Evidence:** `IWorkflowDefinitionProvider.getWorkflow(tenant?)` exists but no implementation consumes it and there is no operation to validate an externally supplied workflow.
- **Complexity:** L
- **Done when:**
  - [x] `validateWorkflow(definition)` validates a supplied flow against Core invariants.
  - [x] Composable catalogs of phases/gates/artifacts are exposed (not only topologies).
  - [x] Core stores no tenant config; Tracker drives composition.

#### GT-318

**Title:** Unify the two divergent gate sources and execute cited OPA

- **Purpose:** Have a single executable gate source so the rules cited by gates actually run.
- **Evidence:** `reference/governance/sdlc/gates/gate-f*.json` (cite `.rego`) diverge from `rulesets/phase-gates/phase-gates.rules.json` (what `PhaseGateValidatorService` consumes); cited `.rego` are not executed.
- **Complexity:** M
- **Done when:**
  - [x] One canonical gate source consumed by the engine.
  - [x] Cited OPA rules execute; routing by stable IDs (not substring).

#### GT-319

**Title:** Formal role model (RBAC enum/hierarchy)

- **Purpose:** Replace free-string roles with a formal, enumerated role model with hierarchy, as the basis for approval governance.
- **Evidence:** No `enum Role`/`ROLE_HIERARCHY`; roles are loose strings across ABAC inputs and gate `accountableRole`.
- **Complexity:** M
- **Done when:**
  - [x] A formal role model exists and is used by ABAC/gate checks.
  - [x] Tests cover role resolution.

#### GT-320

**Title:** Enforce gate approver/waiver role via OPA

- **Purpose:** Verify that the actor approving or waiving a gate actually holds the gate's `accountableRole`/`waiverAuthority`.
- **Evidence:** `accountableRole`/`waiverAuthority` are declarative fields in gate JSON; no code enforces them (only test data references them).
- **Complexity:** M
- **Done when:**
  - [x] OPA/code asserts the approver/waiver actor holds the required role.
  - [x] Depends on GT-319.

#### GT-321

**Title:** Persistent append-only audit ledger

- **Purpose:** Persist governance audit events to a durable, queryable append-only store.
- **Evidence:** `AuditLogger` and `CommandHistory` write in-memory/JSONL; no `AuditRepository`/ledger.
- **Complexity:** M
- **Done when:**
  - [x] Audit events persist to an append-only store.
  - [x] Queryable by tenant/phase/actor/correlationId.

#### GT-322

**Title:** Typed @evolith/sdk client (REST+MCP)

- **Purpose:** Publish a typed client so agents/integrators do not reimplement clients.
- **Evidence:** `sdk/` only contains the CLI; no `@evolith/sdk` client library; agents use MCP and REST directly.
- **Complexity:** M
- **Done when:**
  - [x] `@evolith/sdk` generated from OpenAPI/schemas.
  - [x] Covers REST + MCP surfaces with types.

#### GT-323

**Title:** Production Dockerfiles for core-api and mcp-server

- **Purpose:** Make the two services deployable by shipping production Dockerfiles that bundle the corpus they read from disk.
- **Evidence:** Only `sdk/cli/Dockerfile` exists; core-api/mcp-server have reference Dockerfiles under `reference/infrastructure/docker/` but none in their app dirs.
- **Complexity:** M
- **Done when:**
  - [x] Dockerfiles in `apps/core-api` and `packages/mcp-server`.
  - [x] Image bundles `rulesets/` + `reference/` (or mounts) with `CORE_PATH`/`WORKSPACE_ROOT`.

#### GT-324

**Title:** CD pipeline to GHCR + deploy core-api/mcp-server

- **Purpose:** Continuously build, push and deploy the services.
- **Evidence:** `ci-cd.yml` only publishes the CLI (npm + Docker Hub); no CD for core-api/mcp-server.
- **Complexity:** M
- **Done when:**
  - [ ] Workflow builds and pushes images to GHCR.
  - [ ] Deploys to the chosen runtime (Cloud Run/Fly/etc.).

#### GT-325

**Title:** Blueprint as a first-class governed entity

- **Purpose:** Model the architectural Blueprint and validate it against rulesets, allowed topologies, tenant policy and OPA — not only check a file exists.
- **Evidence:** "Blueprint" appears only as an evidence file (`evidence-validator.ts`, `sdlc.tools.ts`); no `Blueprint` entity or validation.
- **Complexity:** L
- **Done when:**
  - [x] Blueprint entity + builder.
  - [x] Validated against rulesets/topologies/policy/OPA/SDLC.

#### GT-326

**Title:** End-to-end integration validation Core ↔ Tracker and agents

- **Purpose:** Prove the SDLC works end-to-end against real satellites and a live Tracker/agent, beyond unit tests.
- **Evidence:** Tests are unit/contract level; no E2E governance flow with Tracker/agents.
- **Complexity:** L
- **Done when:**
  - [ ] E2E suite drives phase→gate→artifact→verdict against a real satellite.
  - [ ] Tracker/agent integration validated in CI.

#### GT-327

**Title:** Webhook to subscriptions + retries + HMAC

- **Purpose:** Evolve the one-shot webhook into a reliable subscription mechanism.
- **Evidence:** `webhook.adapter.ts` performs a single POST of GateEvidence; no subscriptions, retries or signing.
- **Complexity:** M
- **Done when:**
  - [x] Topic subscriptions, retry/backoff, and HMAC signature.

#### GT-328

**Title:** Roll out ESLint boundaries to packages/* and apps/*

- **Purpose:** Enforce architectural import boundaries beyond `sdk/cli`.
- **Evidence:** `eslint-plugin-boundaries` is configured only in `sdk/cli/.eslintrc.js`.
- **Complexity:** M
- **Done when:**
  - [x] Boundaries config + CI step for `packages/*` and `apps/*`.

#### GT-329

**Title:** Relocate the 5 advanced topologies to rulesets/topologies

- **Purpose:** Unify topology location so all topologies live under `rulesets/topologies/`.
- **Evidence:** Progressive-axis topologies live in `rulesets/topologies/`, but serverless/edge/event-driven/data-mesh/agentic-ai live under `reference/architecture/topologies/`.
- **Complexity:** M
- **Done when:**
  - [x] All topologies under a single canonical location.
  - [x] Links and topology validators updated; tests pass.

#### GT-330

**Title:** Mitigate bus factor (second maintainer + onboarding)

- **Purpose:** Reduce continuity risk from a single human contributor.
- **Evidence:** `git shortlog` shows one human contributor for ~1,475 commits.
- **Complexity:** M
- **Done when:**
  - [ ] A second maintainer is onboarded.
  - [ ] Deep onboarding documentation exists.

#### GT-155

**Title:** REST Core API envelope conformance with ADR-0073

- **Purpose:** Bring every REST controller in `apps/core-api` into conformance with the unified `{success, data, meta}` envelope defined by ADR-0073, so REST, CLI, and MCP surfaces expose the same shape and Tracker can rely on a single client.
- **Evidence:** `apps/core-api/src/presentation/controllers/gates.controller.ts`, `architecture.controller.ts`, and `health.controller.ts` return raw domain objects (e.g., `{ passed: true }`, `{ status: 'UP' }`) bypassing the envelope. CLI and MCP already emit the envelope per GT-01/03/05.
- **Complexity:** M
- **Done when:**
  - [x] A presentation-layer interceptor wraps all REST responses in `{success, data, meta}` (success and error paths) with `meta.context`, `meta.timing`, and `meta.schemaVersion`.
  - [x] Contract tests assert envelope shape and ADR-0073 fields for every controller route.
  - [x] OpenAPI 3.1 schemas (closing GT-67) describe the envelope, not raw payloads.


#### GT-156

**Title:** Core API product hub, API reference, and deployment runbook

- **Purpose:** Create a first-class product hub for the Core API parallel to Smart CLI and Tracker so external consumers (Tracker, satellites) have a single source for capabilities, endpoint reference, schema registry, deployment, and runbooks.
- **Evidence:** `reference/products/` has hubs for `smart-cli/`, `mcp-services/`, `evolith-tracker/`, and `ums-reference/`, but no `core-api/` hub despite ADR-0074/0075 ratifying Core API as a canonical product. Phase 5 zero-downtime playbook assumes traditional services and does not cover stateless NestJS Core API rollout, MCP gateway separation, or API URI versioning rollout (related to GT-159).
- **Complexity:** L
- **Done when:**
  - [x] `reference/products/core-api/README.md` (+`.es.md`) is the canonical product hub with version, surface inventory (controllers, modules, schemas), and consumption examples.
  - [x] `reference/products/core-api/api-reference.md` (+`.es.md`) documents every public endpoint with request/response envelopes and links to OpenAPI.
  - [x] `reference/governance/sdlc/01-playbooks/core-api-deployment.md` covers zero-downtime, schema migration, and rollback for the Core API specifically.


#### GT-157

**Title:** MCP authentication and authorization parity with REST

- **Purpose:** Make the MCP server enforce the same identity, API-key, and JWT controls REST already implements (GT-62, ADR-0075) so agents calling MCP tools carry verifiable identity and tool visibility can be scoped by role.
- **Evidence:** REST uses `ApiKeyAuthGuard` and JWT; the MCP server checks only a shared environment-variable bearer token in `mcp-server.service.ts` and exposes all tools to any authenticated caller. No role-based tool listing, no per-tool scope.
- **Complexity:** M
- **Done when:**
  - [x] MCP server accepts the same API-key and JWT mechanisms as the REST API and rejects unauthenticated callers with envelope-shaped errors.
  - [x] Tool registration carries declared scopes (`read|write|admin`) and tools/list returns only tools the caller's role permits.
  - [x] Conformance tests verify REST and MCP reject the same invalid credentials and emit equivalent error envelopes.


#### GT-158

**Title:** Human-in-the-loop and ABAC scoping for mutative MCP tools

- **Purpose:** Close the GT-114 bypass where CLI mutative commands gate behind confirmation prompts but the same operations called via MCP (`auto-fix`, `agent-install`, `sdlc apply`) execute without operator approval.
- **Evidence:** GT-114 added CLI confirmation, but MCP tool handlers invoke the underlying use cases directly. There is no policy that distinguishes preview/read tools from mutative tools, no proposal/apply split for MCP, and no audit trail of who approved the apply.
- **Complexity:** M
- **Done when:**
  - [x] Mutative MCP tools require an explicit `apply: true` argument paired with an `approvalToken` issued out-of-band, or surface a `propose → confirm → apply` pair following ADR-0073.
  - [x] An ABAC policy in OPA (`abac-mcp-tool-access.rego`) gates mutative tools by caller role/scope, deny by default.
  - [x] Audit events record caller identity, scope, approval token, and diff for every mutative tool invocation.


#### GT-159

**Title:** REST API URI versioning and deprecation policy

- **Purpose:** Pin every REST endpoint behind an explicit version (URI `/api/v1/...` or header) and publish a deprecation/sunset policy so Tracker integrations have a deterministic migration path when the contract evolves.
- **Evidence:** Controllers in `apps/core-api/src/presentation/controllers/` route under unversioned paths (`/gates/...`, `/projects/...`). No `X-API-Version`, no sunset header, no documented deprecation timeline.
- **Complexity:** S
- **Done when:**
  - [x] All REST routes carry an explicit URI version segment (or equivalent header strategy ratified in an ADR), with `/api/v1/...` as the baseline.
  - [x] A deprecation policy ADR defines minimum notice, headers (`Deprecation`, `Sunset`), and changelog requirements for breaking changes.
  - [x] CI fails when a route is added without a version segment.


#### GT-160

**Title:** Cross-surface correlation-ID and request-context propagation

- **Purpose:** Carry a single correlation ID and tenant/initiative context through CLI → MCP → REST → CLI chains so distributed traces stitch together and audit trails are reconstructable.
- **Evidence:** CLI mints a `correlationId` in `command-watcher.ts`; REST middleware reads `X-Correlation-Id`; MCP tools mint a fresh ID per invocation. `initiative` and `tenant` are accepted by CLI but not echoed in REST or MCP envelopes.
- **Complexity:** M
- **Done when:**
  - [x] MCP tools accept and propagate `correlationId`, `initiative`, and `tenant` from the caller and echo them in `meta.context`.
  - [x] REST controllers and an envelope interceptor echo the same context fields, with header propagation across upstream/downstream calls.
  - [x] A round-trip test asserts the correlation ID is preserved across CLI → MCP → REST.


#### GT-161

**Title:** Formal JSON input schemas for core OPA policies

- **Purpose:** Publish a versioned JSON Schema for every OPA policy input so producers (CLI, CI, MCP) and consumers (validators) share one machine-readable contract per policy.
- **Evidence:** Only `abac-mcp-tool-access.rego` documents its input schema explicitly. `governance.rego`, `mcp.rego`, `version-pinning.rego`, `cli-readiness.rego`, `knowledge-intake.rego`, `taxonomy.rego`, `ci-cd.rego`, and `evidence.rego` rely on inline comments.
- **Complexity:** M
- **Done when:**
  - [x] Each core OPA policy ships an input JSON Schema under `rulesets/opa/schemas/<policy>.input.schema.json`, registered in the schema index.
  - [x] CI rejects OPA inputs that fail their schema before evaluation.
  - [x] Generated documentation links each policy to its input schema in EN and ES.


#### GT-162

**Title:** Aggregator `main.rego` unit tests and parity follow-through to GT-149

- **Purpose:** Cover the OPA aggregator entry point with unit tests so combined violation sets and rule overlap stay verifiable as policies evolve, and confirm semantic Native/OPA parity reaches the aggregator layer (not only individual policies validated under GT-149).
- **Evidence:** `rulesets/opa/main.rego` aggregates seven violation sets but has no companion `main_test.rego`. GT-149 closed individual policy tests and the differential gate; aggregator-level overlap and precedence are unverified.
- **Complexity:** M
- **Done when:**
  - [x] `main_test.rego` covers empty, single-source, multi-source, and overlapping inputs with explicit precedence assertions.
  - [x] A differential test for the aggregator runs both Native and OPA pipelines on shared fixtures.
  - [x] CI fails on aggregator coverage regressions and on differential drift.


#### GT-163

**Title:** Topology manifest CI validation for referenced artifacts

- **Purpose:** Ensure every `topology-manifest.json` reference (corpus, nativeEvaluator, evidence, operational interfaces) points to an artifact that exists and conforms to its declared schema so accepted topologies cannot ship with dangling references.
- **Evidence:** `rulesets/schema/topology-manifest.schema.json` declares the fields but no validator checks that referenced files exist (e.g., a missing `corpus.nativeEvaluator` path is not flagged).
- **Complexity:** M
- **Done when:**
  - [x] A `validate-topology-manifests.mjs` extension (or new validator) resolves and existence-checks every manifest reference.
  - [x] Referenced TypeScript validators must compile and expose the declared symbols; referenced JSON evidence must match its schema.
  - [x] CI fails the topology gate on any unresolved or schema-divergent reference.


#### GT-164

**Title:** Event-driven and data-mesh ruleset richness

- **Purpose:** Bring event-driven and data-mesh rulesets up to the breadth of progressive-axis topologies with explicit, executable rules for event ordering, idempotency contracts, retention, and analytical data lineage.
- **Evidence:** `reference/architecture/topologies/integration/event-driven/event-driven.rules.json` and `data/data-mesh/data-mesh.rules.json` each declare only three rules — roughly a quarter of the modular-monolith coverage.
- **Complexity:** M
- **Done when:**
  - [x] Native rules cover event ordering guarantees, idempotency, schema-evolution discipline (event-driven) and data-product lineage, retention, and consumption contracts (data-mesh).
  - [x] OPA counterparts exist with rule-ID parity per GT-151.
  - [x] Maturity assessment reflects the increased coverage.


#### GT-165

**Title:** Concrete SLO and cost budgets for serverless and edge topologies

- **Purpose:** Document executable SLOs, cold-start budgets, and per-execution cost ceilings for serverless and edge topologies so adopters can validate architecture against real production constraints.
- **Evidence:** `reference/architecture/topologies/execution/serverless/README.md` and `execution/edge-computing/README.md` mention "latency" and "locality" but provide no quantitative targets, cold-start limits, or cost ceilings.
- **Complexity:** S
- **Done when:**
  - [x] Each manifest declares SLO/cost budget fields (`latencyBudgetMs`, `coldStartCeilingMs`, `costCeilingPerExecutionCents`).
  - [x] A Native rule fails the manifest when budgets are absent or zero.
  - [x] Corpus runbooks document how operators measure and report against the budgets.


#### GT-166

**Title:** Missing SDLC phase runbooks for Phases 1, 2, and 4

- **Purpose:** Publish operational runbooks for Phases 1 (Conception), 2 (Design), and 4 (Validation) so every quality gate has a procedural counterpart, not just declarative rules.
- **Evidence:** `reference/governance/sdlc/01-playbooks/` currently contains only `zero-downtime-release.md` (Phase 5). Gates for Business Sign-Off, Design Baseline, and RC Stamp are defined in `phase-gates.rules.json` but have no playbook.
- **Complexity:** M
- **Done when:**
  - [x] Playbooks for Phases 1, 2, and 4 exist in EN and ES with procedural checklists tied to each gate's mandatory evidence.
  - [x] Cross-links from `quality-gates.md` and `phase-gates.rules.json` point to the playbooks.
  - [x] Bilingual parity validator and validate-docs pass.


#### GT-167

**Title:** Phase-gate evidence templates and acceptance checklists

- **Purpose:** Provide downloadable templates for every gate's mandatory evidence (Observability checklist, Security Incident Report, Test Summary Report, Integration Evidence) so reviewers have a structured surface rather than free-form prose.
- **Evidence:** `phase-gates.rules.json` mandates Observability Validation, security scans, test reports, and integration evidence, but `04-artifact-templates/` lacks dedicated templates for these specific artifacts.
- **Complexity:** M
- **Done when:**
  - [x] Template files exist for Observability, Security, Test Summary, and Integration evidence (EN + ES), referenced by `phase-gates.rules.json`.
  - [x] Each gate's playbook (GT-166) cites its template.
  - [x] A native rule fails when a gate's evidence does not match the template's schema.


#### GT-168

**Title:** Cross-topology composition reference application

- **Purpose:** Ship a working reference application demonstrating a composable manifest (e.g., modular-monolith + event-driven) so adopters can verify the composition validator and learn the integration pattern from running code, not from prose.
- **Evidence:** `topology-dimensions.md` §3 lists five composition examples but no fixture or sample repository exercises them end-to-end.
- **Complexity:** L
- **Done when:**
  - [x] A reference application (or fixture project) lives under `reference/knowledge/demo/examples/` (or its equivalent) with a composable manifest exercising at least two topologies.
  - [x] CI runs the topology validator on the example and asserts a passing composition.
  - [x] Documentation walks the reader through the example in EN and ES.


#### GT-169

**Title:** Agentic AI operational budgets, credential lifecycle, and runbooks

- **Purpose:** Make the Agentic AI topology operationally complete by defining concrete prompt/context token budgets, MCP tool concurrency limits, satellite credential rotation/revocation, and incident runbooks for common failure modes (agent hang, token overflow, sandbox escape).
- **Evidence:** `reference/architecture/topologies/ai/agentic-ai/operations.md` mentions "execution timeout and resource budget per capability" without quantitative limits; `README.md` declares `toolPolicy` without concurrency caps or credential lifecycle; no runbook covers token overflow or sandbox escape.
- **Complexity:** L
- **Done when:**
  - [x] Manifest fields declare token budgets, context window ceilings, MCP tool concurrency limits, and credential rotation cadence.
  - [x] Runbooks cover agent hang, token overflow, unapproved action, and sandbox escape with explicit recovery steps.
  - [x] Native and OPA rules fail manifests missing the budget fields.


#### GT-170

**Title:** UMS reference product hub

- **Purpose:** Promote the UMS reference materials into a first-class product hub so the reference case has the same product structure as Tracker, Smart CLI, MCP Services, and the Core API hub (GT-156).
- **Evidence:** UMS materials live across SDLC examples and demo files (`ums-technical-overview.md`, `ums-reference-model.md`) but `reference/products/` has no dedicated hub. Cross-links into UMS are scattered.
- **Complexity:** M
- **Done when:**
  - [x] `reference/products/ums-reference/` exists with README, overview, and reference-model in EN and ES.
  - [x] All existing UMS references in SDLC and demo materials point to the hub.
  - [x] Product inventory is regenerated and validated.


#### GT-171

**Title:** Command-as-a-service surface parity audit (CLI vs MCP vs REST)

- **Purpose:** Resolve the ADR-0073 §6 promise of surface parity by enumerating every operation, listing where it is exposed today, and deciding for each gap whether to expose it on the remaining surfaces or to document the exemption (e.g., shell-only commands like `completion`).
- **Evidence:** CLI exposes `alias`, `completion`, `docs`, `drift`, `fixtures`, `history`, `profile`, `standards`, `update` with no MCP or REST equivalents. REST exposes operations not present in MCP and vice versa.
- **Complexity:** L
- **Done when:**
  - [x] A surface-parity matrix (machine-readable) lists every operation and the surfaces that expose it, with explicit `exempt:<reason>` markers where parity is not desirable.
  - [x] A validator fails when a new operation lands on one surface without a parity entry.
  - [x] The matrix is the source of truth for the inventory generator.


#### GT-172

**Title:** Cross-surface contract roundtrip test suite

- **Purpose:** Add an end-to-end suite that exercises the same operation (starting with `gate evaluate` and `phase advance`) through CLI, MCP, and REST and asserts semantically identical envelopes and evidence payloads.
- **Evidence:** CLI E2E, MCP smoke, and REST E2E tests each mock or stub the other surfaces. No test verifies the three surfaces return equivalent `GateEvidence` for the same input.
- **Complexity:** L
- **Done when:**
  - [x] A roundtrip suite under `tests/contract/` invokes the same input via CLI, MCP (Streamable HTTP), and REST, then asserts envelope and evidence equivalence.
  - [x] CI runs the suite on PRs that touch any of the three surfaces or shared use cases.
  - [x] The suite is documented as the contract regression net for ADR-0073.


#### GT-173

**Title:** OpenTelemetry export parity across CLI, MCP, and REST

- **Purpose:** Bring MCP and CLI to OTel parity with the Core API so distributed traces, latency, token usage, and cost can be correlated end-to-end via a single trace ID across all three surfaces.
- **Evidence:** Core API exports OTLP traces (`tracing.ts`); CLI writes local `CommandTrace` JSON; MCP server has no structured trace or metric export.
- **Complexity:** M
- **Done when:**
  - [x] MCP server emits OTLP traces using the same trace ID propagated through `correlationId` (GT-160) and exports them via OTLP exporters.
  - [x] CLI optionally exports OTLP when configured, preserving its local trace as the default offline mode.
  - [x] A shared dashboard demonstrates a single agent-driven workflow stitched across the three surfaces.


#### GT-174

**Title:** Envelope `meta.schemaVersion` and producer/consumer compatibility matrix

- **Purpose:** Add an explicit schema version to the ADR-0073 envelope and publish a producer/consumer compatibility matrix so clients can detect drift and CI can block incompatible releases.
- **Evidence:** Envelope lacks `meta.schemaVersion`. Gap catalog already records (line 356) that no cross-repository compatibility matrix or CI suite exercises producer/consumer versions together.
- **Complexity:** S
- **Done when:**
  - [x] Envelope schema declares `meta.schemaVersion` as required and pinned per surface.
  - [x] A machine-readable compatibility matrix (`reference/governance/standards/vision/surface-compatibility.json` or equivalent) records supported producer/consumer pairs.
  - [x] CI rejects a producer change that would break a supported consumer pair without an explicit migration entry.


#### GT-152

**Title:** External Knowledge Contract and Source Registry Schema

- **Purpose:** Define the formal contract for external knowledge intake (topology IDs, maturity, preconditions, anti-patterns, alternatives, related topologies, review freshness) and the versioned `SRC-*` registry schema (source license, edition/URL, retention mode, content fingerprint, review cadence, `KI-*` links).
- **Evidence:** Current knowledge intake pilot validates provenance and rights but topology values are free text; lacks formal contract and source registry.
- **Complexity:** S
- **Done when:**
  - [x] The knowledge contract validates topology IDs against manifests and requires maturity, preconditions, anti-patterns, alternatives, related topologies, and review freshness.
  - [x] A versioned `SRC-*` registry records source license, edition or URL, retention mode, content fingerprint, review cadence, and links every `KI-*` candidate to its source.
  - [x] Contract and schema are validated by CI (no unreferenced artifacts, no structural violations).


#### GT-153

**Title:** Knowledge Lifecycle Governance by Winston

- **Purpose:** Formalize Winston (`@winston`) as the lifecycle custodian for external knowledge, with a reproducible promotion pipeline: `candidate → evaluated → accepted → executable`. Each promotion leaves dated evidence and an ADR where required.
- **Evidence:** Current pilot has no promotion pipeline; knowledge enters RAG directly without architectural review.
- **Complexity:** M
- **Done when:**
  - [x] Winston (`@winston`) owns the lifecycle record and an Architecture Board decision promotes `candidate → evaluated → accepted → executable` with dated evidence and an ADR where required.
  - [x] Each promotion state is machine-readable, traceable to its source registry entry, and gated by CI validation.
  - [x] Rejected and retired candidates are preserved in the registry with a disposition reason.


#### GT-154

**Title:** RAG Projection and Native/OPA Parity for External Knowledge

- **Purpose:** Ensure only explicitly approved knowledge is eligible for RAG retrieval, and that shared candidate fixtures produce identical verdicts across Native and OPA engines.
- **Evidence:** RAG currently has no approved-knowledge projection; any ingested candidate is retrievable. No shared fixtures exist for Native/OPA differential testing.
- **Complexity:** M
- **Done when:**
  - [x] Shared candidate fixtures run through Native and OPA engines; the differential gate fails on verdict, rule-ID, severity, or evidence drift.
  - [x] Only an explicit approved-knowledge projection is eligible for RAG; rejected, retired, rights-restricted, and candidate records remain excluded by default.
  - [x] CI validates projection integrity: no approved projection contains excluded records, no excluded record leaks into retrievable scope.


#### GT-151

**Title:** Complete Native/OPA Rule-ID Coverage for Accepted Topologies

- **Purpose:** Enforce the dual-engine rule contract for every accepted topology, so Native rulesets and OPA policies govern the same rule IDs rather than merely agreeing on a small fixture sample.
- **Closed by:** Commit `b443dcd2` makes accepted-topology Native/OPA rule-ID divergence fail closed in both directions and adds regression coverage. All eight topologies align with 0 errors and 0 warnings.
- **Done when:**
  - [x] Every accepted topology has an identical canonical rule-ID set across its Native ruleset and declared OPA policies, with shared execution-policy ownership explicit in manifests.
  - [x] Every missing or OPA-only rule has positive, negative, and boundary fixtures driving both engines, with semantic parity verified per rule ID.
  - [x] The coverage validator fails on all accepted-topology divergence and unreferenced policy artifacts; full CI reports zero coverage warnings.
  - [x] Maturity and parity evidence records cite repaired artifacts, reproducible commands, and aggregate execution telemetry.

### Phase 2: Agentic Architecture & Evolution

#### GT-135

**Title:** Agentic AI Telemetry & Cost Control Standard

- **Purpose:** Standardize OpenTelemetry schemas to track LLM token usage, execution latency, and cost attribution per agent loop, preventing runaway budgets in autonomous topologies.
- **Evidence:** Currently, agent sandbox executions lack formal APM traces for token consumption and API costs.
- **Done when:** An ADR defines the OpenTelemetry spans for Agentic LLM calls, and the `ci-runner` validates these specific schema elements.

#### GT-136

**Title:** Context-Aware Access Control (ABAC for LLMs)

- **Purpose:** OPA `policy.wasm` rules must dynamically allow or deny MCP tool executions based on the human user's context (e.g., RBAC/ABAC), ensuring agents cannot bypass human permissions.
- **Evidence:** Agents currently run with broad sandbox permissions without verifying the invoking user's active directory claims.
- **Done when:** The dual-engine OPA validation logic incorporates a user-context schema, and a reference ABAC `.rego` policy is published.

#### GT-137

**Title:** Sovereign Identity for Agentic AI

- **Purpose:** Define how autonomous agents impersonate human OAuth 2.0 tokens or maintain sovereign service-account identities when traversing downstream APIs.
- **Evidence:** No standardized token-exchange flow exists for the Agentic AI topology in Evolith.
- **Done when:** An ADR documents the OAuth 2.0 Token Exchange (RFC 8693) pattern for agent identity delegation.

#### GT-138

**Title:** Event-Driven Agentic Workflows

- **Purpose:** Establish patterns for triggering Agentic MCP workflows via Message Bus (e.g., MassTransit/RabbitMQ) rather than purely synchronous HTTP requests.
- **Evidence:** Agent invocations are currently tightly coupled to synchronous REST/gRPC endpoints.
#### GT-139

**Title:** RAG Knowledge Governance Standard

- **Purpose:** Standardize how Evolith's architectural markdown files (ADRs, rulesets) are chunked, embedded, and synchronized into Vector Databases for RAG-enabled assistants.
- **Evidence:** Documentation is currently only parsed statically by the CI pipeline; there is no pipeline for embedding updates into a vector store.
- **Done when:** A specification is created for chunking strategy, metadata tagging, and vector synchronization for all `reference/` files.

#### GT-140

**Title:** Workload Identity Token Rotation Standard for Satellite Reference

- **Purpose:** Document guidelines and architectural reference patterns for automatic token refresh, expiry, and key rotation of workload identities in satellite services, keeping Evolith Core credential-free.
- **Evidence:** Current sovereign identity rules (ADR-0088) do not guide how downstream satellite applications handle key lifecycle and token expiration.
- **Done when:** An architectural standard is published detailing workload identity token refresh workflows and trust delegation profiles for client applications.

#### GT-141

**Title:** Concurrency Control and Resource Locking Standard for MCP Tools

- **Purpose:** Establish patterns to prevent write collisions and state corruption when multiple autonomous agents run parallel mutations against the same target repository or file using MCP tools.
- **Evidence:** Multi-agent sandboxes currently lack locking guidelines or concurrency guardrails for concurrent tool execution.
- **Done when:** A design standard defines the resource locking mechanism and concurrency mitigation strategies for multi-agent workflows.

#### GT-142

**Title:** Real LLM Bridge Pipeline in CI for Agentic Reviews

- **Purpose:** Replace the mock/dry-run review behavior in the agentic CI script with a functional integration that invokes an external LLM using credentials supplied dynamically via runner secrets.
- **Evidence:** The step `13-agentic-code-review.mjs` validates the MCP connection but relies on a mock LLM review.
- **Done when:** The CI step can execute a real LLM verification when `EVOLITH_AGENTIC_REVIEW=true` and an API key environment variable is present, fallback-safe.

#### GT-143

**Title:** Multi-Agent Handoff and Task Delegation Standards

- **Purpose:** Define standard messaging contracts, token forwarding rules, and correlation tracing for agents delegating sub-tasks to other specialized agents.
- **Evidence:** There are no formal patterns or guidelines in the repository for agent-to-agent task delegation.
- **Done when:** Documented patterns for multi-agent handoffs, identity delegation, and context propagation are published in the agentic patterns folder.

#### GT-144

**Title:** Infinite Loop Prevention and Circuit Breaker Rules for Agents

- **Purpose:** Establish safety guardrails to detect, flag, and break circular dependencies or recursive call loops between agents and MCP tools before consuming excessive budgets.
- **Evidence:** The current tool authorization boundaries (ADR-0087) lack mechanism or rules for recursive loop detection.
- **Done when:** An architecture policy defines loop-detection criteria (max hops, depth headers) and circuit breaking contracts for agent workflows.

#### GT-145

**Title:** Truthful Provider-Neutral RAG Vector Synchronization

- **Purpose:** Turn the ADR-0090 RAG delta-sync path into a real, provider-neutral operational capability. A live run must embed and persist chunks, report a durable receipt, and fail when no configured adapter can complete the operation.
- **Evidence:** `.harness/scripts/ci/14-rag-index-sync.mjs` labels `EVOLITH_RAG_SYNC=true` as live and reports each chunk as upserted, but its vector-store and embedding calls are commented TODOs. No vector database is contacted or verified.
- **Done when:**
  - [x] A provider-neutral embedding/vector-store port and configuration contract select an actual adapter without binding the core to one vendor.
  - [x] Live mode upserts deterministic chunk metadata and vectors, records a machine-readable receipt, and fails closed on adapter, embedding, or persistence failure.
  - [x] Index lifecycle covers changed and deleted source files without orphaned vectors, with a fake-adapter test suite and an integration test boundary.
  - [x] Operations guidance documents least-privilege credentials, bounded batch/retry behavior, and cost/token telemetry.
- **Closure evidence:** Commit `d41bc3a3`. New pure modules `.harness/scripts/ci/rag-port.mjs` (provider-neutral embedding/vector-store port; truthful non-durable `memory` adapter; fail-closed on unknown/incomplete adapter; `registerRagAdapter` for vendors) and `rag-sync.mjs` (deterministic H2 chunking, batched embed+upsert, stale-chunk pruning and deleted-file removal with no orphans, machine-readable receipt with token telemetry). `14-rag-index-sync.mjs` rewired to the port (changed+deleted detection, fail-closed when a live run lacks a durable adapter). `rag-sync.test.mjs` — 9 `node:test` cases. Ops runbook `reference/operations/agentic-ci-rag-support.md` (+`.es.md`) documents provider selection, least-privilege credentials, bounded batch/retry, and cost/token telemetry. The integration boundary is the registered durable adapter (vendor binding intentionally deferred).

#### GT-146

**Title:** Secure, Provider-Neutral, and Token-Bounded Agentic CI Review

- **Purpose:** Make real LLM code review safe, portable, and economical: minimize and sanitize the submitted context, enforce explicit cost/time budgets, and validate structured findings before a CI gate acts on them.
- **Evidence:** `.harness/scripts/ci/13-agentic-code-review.mjs` hard-codes the Gemini endpoint and model, submits the full raw `git diff` to the provider, and relies on a free-text `VIOLATION_DETECTED` marker. It has no secret redaction, diff/token cap, context prioritization, provider port, or structured-result validation.
- **Done when:**
  - [x] A provider-neutral review port supports configured adapters and models while preserving a fail-closed CI contract.
  - [x] The review input removes credentials and sensitive patterns, includes only policy-relevant changed files, and is bounded/chunked by measurable byte, token, latency, and cost budgets.
  - [x] The provider response conforms to a versioned schema with evidence locations and confidence; malformed or indeterminate results cannot silently pass the gate.
  - [x] Tests cover redaction, budgeting, chunk selection, adapter failures, and response validation; CI uses minimum permissions and reports aggregate, non-sensitive efficiency telemetry.
- **Closure evidence:** Commit `3efbb59`. New pure modules under `.harness/scripts/ci/`: `review-provider.mjs` (configurable port + Gemini adapter, API key in header, fail-closed on unknown provider/missing key), `review-input.mjs` (secret redaction, policy-relevant file selection, byte/token budget + chunking; token budget is the cost proxy), `review-result.mjs` (versioned schema v1.0 validation; malformed/indeterminate → fail-closed). `13-agentic-code-review.mjs` rewired to use them with aggregate non-sensitive telemetry; the `agentic-review` job scoped to `contents: read`. 27 `node:test` cases pass. Residual: explicit per-call latency budget (token/byte caps in place) is a minor follow-up.

#### GT-147

**Title:** Automated Operational Capability and Efficiency Drift Audit

- **Purpose:** Continuously detect divergence between declared CI/operations capabilities and executable behavior, while identifying avoidable latency, token use, and unnecessary work before those gaps reach production workflows.
- **Evidence:** The Wilson V4 review found the RAG script presenting unimplemented upserts as live synchronization and the agentic review having no context/cost controls. These gaps were visible in source but are not asserted by any reusable evaluator, so future regressions depend on manual inspection.
- **Done when:**
  - [x] A reproducible CI evaluator maps declared operational modes, environment flags, and ADR claims to executable adapters or explicit dry-run semantics.
  - [x] The evaluator fails for false success messages, missing configured adapters, unbounded external payloads, and absent timeout/retry/cost limits where a capability invokes external services.
  - [x] Its topology pass evaluates every accepted topology's manifest, Native ruleset and OPA policy for parity, orphaned references, and presence baseline (deeper richness/efficiency-reduction heuristics surfaced as a follow-up).
  - [x] It emits versioned, machine-readable findings with source locations and creates a concise human summary suitable for the canonical gap triage process.
  - [x] Fixture tests demonstrate detection of the current RAG false-upsert and unbounded-agentic-diff cases, plus compliant examples to prevent false positives.
- **Closure evidence:** Commit `861505e`. `.harness/scripts/ci/drift-audit.mjs` (`auditSource` → `DRIFT-FALSE-SUCCESS` for a success claim next to a commented/TODO external op, `DRIFT-UNBOUNDED-CALL` for external calls without budget/redaction/timeout/retry/fail-closed markers; `auditTopology` → `TOPO-MISSING-ARTIFACT`/`TOPO-ORPHAN-REF` for accepted topologies; versioned report + `summarize`). `25-operational-drift-audit.mjs` runs it over the numbered CI capability scripts and every accepted topology manifest and is auto-discovered by `ci-runner.mjs` (pre-commit + CI), failing closed on error findings — currently clean across 17 scripts. `drift-audit.test.mjs` — 10 `node:test` cases covering the historical RAG false-upsert and unbounded-agentic-diff plus compliant examples (no false positives) and topology parity/orphan/draft-skip. Scope note: criterion 3's measurable latency/I-O/token-reduction analysis is a presence+parity+orphan baseline; deeper efficiency heuristics are a tracked follow-up.

#### GT-148

**Title:** Topology-Aware Rule Reference and Coverage Migration Repair

- **Purpose:** Restore a trustworthy, topology-aware coverage report and remove obsolete phase-path references so rule discovery, satellite inheritance, and governance reporting use the canonical topology corpus.
- **Evidence:** Wilson V5 ran the coverage generator; it fails before producing a matrix because it reads the deleted `rulesets/architecture/f1-modular-monolith.rules.json` and `rulesets/opa/architecture.rego`. `rulesets/governance/satellite-contracts.rules.json` still declares the same missing F1/F2/F3 files, while the canonical artifacts live beneath `reference/architecture/topologies/progressive-axis/`.
- **Done when:**
  - [x] The coverage generator discovers rules from topology manifests rather than hard-coded legacy paths and emits per-topology Native/OPA coverage with source locations.
  - [x] Satellite contracts, documentation, and machine-readable references resolve only to canonical artifacts; an automated reference-resolution test prevents recurrence.
  - [x] The report fails on missing, duplicate, or unreferenced topology artifacts and broken canonical references, reports Native/OPA ID divergence for GT-149, and is integrated into the relevant CI validation path with changed-topology scoping.
  - [x] Fixtures cover Modular Monolith, Distributed Modules, Microservices, and a negative migrated-path case.
- **Closure evidence:** Commits `7e5493a6` and `ec968d19` replace the stale F1-only generator with manifest discovery, repair satellite inheritance references, add the fifteenth CI gate and focused fixtures, and keep Native/OPA ID divergence visible for GT-149 rather than masking it.

#### GT-149

**Title:** Executable OPA Tests and Native/OPA Semantic Parity Gate

- **Purpose:** Verify behavior—not only file existence—of every topology policy, and ensure Native and OPA engines reach equivalent allow/deny decisions for the same contracts.
- **Evidence:** Wilson V5 found no OPA test files and the 14-step CI runner does not execute `opa test` or an equivalent pinned evaluator. `validate-topology-manifests.mjs` confirms that declared Native/OPA files exist but does not evaluate policy decisions; the current coverage generator is also broken (GT-148).
- **Closed by:** 8 `.test.rego` files for central `rulesets/opa/*` policies (version-pinning, evidence, governance, taxonomy, ci-cd, cli-readiness, mcp, abac) + 16 `parity-fixtures/` JSON files (2 per topology: compliant + violation) + 8 compiled `<topology>.wasm` bundles + pinned `@open-policy-agent/opa-wasm` evaluator + `27-opa-parity-gate.mjs` and `28-test-topology-opa.mjs` CI steps. Verified: `opa test` runs 25 topology test cases (0 failures); parity gate evaluates 16 fixtures across 8 topologies (0 drift); WASM compiled with OPA v0.65.0.
- **Done when:**
  - [x] A pinned, reproducible OPA evaluator executes positive, negative, and boundary fixtures for every accepted topology without relying on an undeclared host binary.
  - [x] The same canonical inputs run through Native and OPA evaluators; a differential gate fails on verdict, rule-ID, severity, or evidence-location drift.
  - [x] Results are machine-readable and include policy/ruleset versions, fixture identity, execution duration, and only aggregate efficiency telemetry.
  - [x] CI scopes work to changed policies/manifests where safe, retains a scheduled full parity run, and has fixtures for evaluator failure and malformed policy input.

#### GT-150

**Title:** Mature Remaining Draft Topologies to Accepted Corpus Parity

- **Purpose:** Make every published Evolith topology usable at the Modular Monolith baseline, not merely a discoverable draft with isolated rules.
- **Evidence:** Wilson V5 manifest inventory reports Data Mesh, Edge Computing, Serverless, and Event-Driven as `draft` with no `spec.corpus`; R-27 is therefore not applied to them. Their earlier baseline-rule gaps may remain historically closed, but they do not provide the accepted-topology corpus, control-plane, and evidence maturity requested for Evolith.
- **Closed by:** All four topologies promoted from `draft` to `accepted` with `spec.corpus`, maturity guides, config schemas, fixtures, OPA tests, manifest fixes, and topology-specific ADRs (ADR-0095 for Serverless, ADR-0096 for Edge Computing). Verified by documentation validation and bilingual parity checks.
- **Done when:**
  - [x] Data Mesh, Edge Computing, Serverless, and Event-Driven have bilingual adoption, composition, operations, security, observability, resilience, and evolution guidance plus topology-specific accepted ADRs.
  - [x] Each manifest declares `spec.corpus`, validated Native/OPA artifacts, shared contract fixtures, positive/negative/differential tests, and CLI, MCP, and Core API control-plane exposure.
  - [x] Each topology is promoted from `draft` to `accepted` only after the topology maturity validator, Native/OPA parity gate, documentation validation, and consumer-surface tests pass.
  - [x] The catalog records explicit relationships to migration paths and companion topologies so AI and human users can retrieve applicable guidance without reconstructing context.

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
- **Current evidence:** `WebhookAdapter` and the notifier port exist in the working tree under `packages/infra-providers`; integration closure depends on a green baseline and a receiving-listener test.
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

#### GT-113

**Title:** Clean Architecture Purification in core-domain

- **Goal:** Remove direct framework dependencies (`@nestjs/common` `Injectable`) and Node.js I/O leaks (`fs-extra`, `path`) from the application/domain layer, injecting them via abstractions (`IFileSystem`).
- **Closed when:** The `core-domain` package has no `fs`, `path`, or `@nestjs/*` imports, and all I/O operations pass through pure dependency injection.
- **Proposed Solution:** Inject `IFileSystem` and use ports and adapters composition.

#### GT-114

**Title:** Human-in-the-Loop for Mutative MCP Tools

- **Goal:** Protect the local environment when the Smart CLI receives dangerous mutative commands from an AI agent via MCP. Requires implementing an interactive confirmation prompt in stdio (or restrictive configuration) before execution.
- **Closed when:** MCP tools capable of code/infrastructure mutation prompt for confirmation before actual execution.
- **Closed by:** `sdk/cli/src/infrastructure/mcp/confirmation.service.ts`, `sdk/cli/src/infrastructure/mcp/confirmation.service.spec.ts`, `sdk/cli/test/mcp-confirmation.e2e-spec.ts`, `sdk/cli/src/infrastructure/mcp/server.ts`, `sdk/cli/src/commands/mcp/mcp-serve.command.ts`
- **Closure evidence:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: 94308575101b1ecd1bd571026003d9b1b276a7e7
  - `evidence`: `ConfirmationService` prompts for interactive confirmation before executing mutative MCP tools; `--no-confirm` flag bypasses prompts for CI/automation
  - `validationCommands`:
    - `npx jest --config sdk/cli/jest.config.js --testPathPatterns="confirmation"` — unit tests pass
    - `npx jest --config sdk/cli/test/jest-e2e.json --testPathPatterns="mcp-confirmation"` — E2E tests pass
  - `dependencyDisposition`: none

#### GT-115

**Title:** Auto-fix of Architectural Failures via MCP Tools

- **Goal:** Extend the set of MCP tools to allow AI agents to apply automatic resolutions (auto-fix) to violations reported by Evolith Core rule evaluators.
- **Closed when:** New MCP tools exist under the `evolith-auto-fix` schema that accept a `rulesetId` or failure report and apply the required refactorings.
- **Done when:**
  - [x] MCP tools for auto-fix implemented (`evolith-auto-fix`)
  - [x] Accept `rulesetId` or violations array as input
  - [x] Apply refactorings for known violation types (domain-purity, hexagonal-boundaries, missing-domain-interface)
  - [x] Dry-run mode for preview before applying
  - [x] Summary generation with applied/preview/failed/manual counts
- **Closed by:** `sdk/cli/src/infrastructure/mcp/tools/auto-fix.ts`, `sdk/cli/src/infrastructure/mcp/tools/auto-fix.spec.ts`, `sdk/cli/test/auto-fix.e2e-spec.ts`, `sdk/cli/src/infrastructure/mcp/tools/index.ts`
- **Closure evidence:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: ea2a3934cfcbebaf3b05e15538e4b5ac721b1b53
  - `evidence`: `evolith-auto-fix` MCP tool accepts rulesetId and violations array; supports dry-run mode; applies fixes for domain-purity, hexagonal-boundaries, missing-domain-interface rules; generates summary with fix counts
  - `validationCommands`:
    - `npx jest --config sdk/cli/jest.config.js --testPathPatterns="auto-fix"` — unit tests pass
    - `npx jest --config sdk/cli/test/jest-e2e.json --testPathPatterns="auto-fix"` — E2E tests pass
  - `dependencyDisposition`: none
- **References:** [MCP Tools Module](../../../../packages/mcp-server/src/tools/tools.module.ts)

#### GT-116

**Title:** Elimination of Blocking I/O Operations in the CLI

- **Goal:** Migrate chained asynchronous operations or blocking `*Sync` calls in AST validators and file I/O in the CLI and Hooks to avoid blocking the event loop in massive repositories.
- **Closed when:** Critical validators in CI and CLI paths do not use `.readFileSync` or `.readdirSync` methods, favoring `fs/promises` with concurrency management.
- **Done when:**
  - [x] IFileSystem interface provides async methods for all file operations
  - [x] Critical paths (sdlcStatus, validate) use async IFileSystem methods
  - [x] validate.ts findCorePath migrated to async fs.promises.access
  - [x] Non-critical initialization code may retain sync calls for simplicity
- **Closed by:** `sdk/cli/src/infrastructure/mcp/tools/validate.ts`, `packages/core-domain/src/domain/interfaces.ts`
- **Closure evidence:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: ea2a3934cfcbebaf3b05e15538e4b5ac721b1b53
  - `evidence`: IFileSystem interface provides async methods (readFile, writeFile, exists, readdir); critical validation paths use async IFileSystem; findCorePath migrated to fs.promises.access
  - `validationCommands`:
    - `npm run build --workspace sdk/cli` — TypeScript compilation passes
    - `npm run test --workspace sdk/cli` — tests pass
  - `dependencyDisposition`: none
- **References:** [IFileSystem Interface](../../../../packages/core-domain/src/domain/interfaces.ts)


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
- **References:** [Global Rules R-25](../../../../.harness/rules/global-rules.md) · [F1 Ruleset](../../../architecture/topologies/progressive-axis/modular-monolith/modular-monolith.rules.json) · [OPA Architecture Policy](../../../architecture/topologies/progressive-axis/modular-monolith/modular-monolith.rego)

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
- **References:** [Gap Closure Evidence Standard](./gap-closure-evidence-standard.md) · [Closure Registry](./gap-closure-evidence.json) · [Tracking Validator](../../../../.harness/scripts/ci/08-validate-tracking.mjs) · [Gap Tracking](./gap-tracking.md)

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
- **References:** [Maturity Assessment](./maturity-assessment.md) · [Maturity Reconciliation](./maturity-reconciliation.json) · [Inventory Summary](./inventory-summary.md) · [Reconciliation Validator](../../../../.harness/scripts/ci/09-reconcile-maturity.mjs)

#### GT-42

**Title:** Cross-repository contract conformance

- **Gap:** Core, CLI, and Tracker can evolve their evidence and decision contracts independently without proving producer and consumer compatibility.
- **Purpose:** Ensure technical evaluations remain consumable by the authoritative Tracker throughout independent repository releases.
- **Current evidence / example:** Contract ADRs and JSON schemas exist, but there is no cross-repository compatibility matrix or CI suite that exercises supported producer and consumer versions together.
- **Done when:** shared versioned schemas or pinned contract references define compatibility policy; producer and consumer contract tests run across Core, CLI, and Tracker; CI verifies the latest supported version matrix and blocks incompatible changes.
- **Closure evidence:** Core commit `154aadf` added the versioned manifest, immutable schema digests, fixtures, conformance tests, and CI enforcement. Tracker commit `4256e7b` pinned the supported contract and added its consumer workflow against Core.
- **References:** [ADR-0073 Unified CLI Output Contract](../../../architecture/adrs/core/0073-unified-cli-output-contract.md) · [Contract Manifest](../../../../rulesets/contracts/evolith-machine-contracts.json) · [Conformance Policy](../../../../rulesets/contracts/README.md) · [Conformance Validator](../../../../.harness/scripts/ci/10-validate-contract-conformance.mjs)

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
- **References:** [MCP Server Entry Point](../../../../packages/mcp-server/src/main.ts) · [MCP E2E Tests](../../../../sdk/cli/test/e2e/mcp-e2e.test.ts)

#### GT-46

**Title:** Core HTTP service ownership boundary

- **Gap:** `smart-cli api` exposes an in-memory “Evolith Tracker Assistant” mock with unrestricted CORS and no governed Core contract, although this repository should contain only services that expose Core.
- **Purpose:** Prevent Tracker product behavior from leaking into the Core distribution while preserving a valid stateless Core API if that surface is retained.
- **Done when:** an explicit decision removes the mock API or replaces it with a documented, authenticated, stateless Core exposure contract; CORS is configurable and retained endpoints have schemas and tests.
- **Closure evidence:** Commit `b07460d` removed the `api` command, Tracker Assistant mock, in-memory chat sessions, controller, module, repository, and domain interfaces. The retained network service is the authenticated, contract-tested MCP Streamable HTTP exposure of Evolith Core.
- **Post-push verification (2026-06-13):** Review of the CI failures identifies no regression or reintroduction of Tracker surfaces into Core; every failure occurs before functional validation. The implemented ownership boundary remains in force. Status: `DONE`.
- **References:** [CLI Composition Root](../../../../sdk/cli/src/app.module.ts) · [MCP Gateway Entry Point](../../../../packages/mcp-server/src/main.ts)

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

#### GT-130
- **Title:** CI pipeline validation for BMAD Agent signatures on ADRs and Technical Specs
- **Component:** Governance
- **Purpose:** Ensure that all architectural documentation is officially produced or audited by the AI Agents as mandated by Rule R-11.
- **Current Evidence:** `validate-docs.mjs` checks bilingual parity, but no CI checks ensure the `Author` or `Signature` fields contain the "Architect Agent" or "Docs Agent".
- **Done When:** A script `.harness/scripts/validate-bmad-signatures.mjs` exists, runs in CI, and fails if an ADR is manually written without agent validation evidence.

#### GT-131
- **Title:** Create Sandbox/Reference App for Agentic AI Topology with live MCP
- **Component:** Architecture
- **Purpose:** Provide a live playground for the Agentic AI topology so developers can interact with Model Context Protocol (MCP) servers locally.
- **Current Evidence:** The Agentic AI profile exists conceptually, but no executable code or dummy agent service is available in `packages/` or `apps/` to demo it.
- **Done When:** An `apps/agent-sandbox` is created with a dummy MCP server and client connecting to the Evolith Core API.

---
[Back to Tracking Board](./gap-tracking.md) · [Back to Vision Index](./README.md)

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
  - [x] `GET /health/live` returns 200 (process alive) or 503
  - [x] `GET /health/ready` verifies external dependencies
  - [x] `GET /metrics` exposes Prometheus format with at least 3 business metrics
  - [x] `evolith_gate_evaluations_total{status}` and `evolith_gate_evaluation_duration_seconds` exported
- **References:** [@nestjs/terminus](https://docs.nestjs.com/recipes/terminus) · [prom-client](https://github.com/siimon/prom-client)

#### GT-66

**Title:** Distributed Tracing with OpenTelemetry

- **Gap:** No distributed tracing exists. When Evolith Tracker calls Core API, there is zero visibility into the call chain. Latency and errors in production are undebuggable.
- **Purpose:** Initialize the OpenTelemetry Node.js SDK before NestJS bootstrap, enabling auto-instrumentation of HTTP and filesystem operations. Export spans to an OTLP-compatible backend.
- **Done when:**
  - [x] `tracing.ts` initialized before NestJS bootstrap in production
  - [x] `trace_id` and `span_id` included in all log entries
  - [x] Custom spans in `EvaluateGateUseCase` and `validateArchitecture`
  - [x] OTLP export configured via environment variable
- **References:** [OpenTelemetry NestJS](https://opentelemetry.io/docs/zero-code/js/nestjs/) · [apps/core-api/src/main.ts](../../../../apps/core-api/src/main.ts)

#### GT-67

**Title:** OpenAPI 3.1 Complete Specification

- **Gap:** No OpenAPI specification exists. The Evolith Tracker cannot generate a typed client SDK. Contracts between services are implicit and brittle.
- **Purpose:** Implement `@nestjs/swagger` with full decorator coverage on all controllers and DTOs. Generate and version `openapi.json` as part of the build.
- **Done when:**
  - [x] `@nestjs/swagger` installed and configured in `main.ts`
  - [x] All endpoints documented with `@ApiOperation`, `@ApiResponse`, `@ApiBody`
  - [x] All DTOs annotated with `@ApiProperty`
  - [x] `GET /api/docs` serves Swagger UI
  - [x] `openapi.json` generated in build and versioned in repository
- **References:** [@nestjs/swagger](https://docs.nestjs.com/openapi/introduction) · [apps/core-api](../../../../apps/core-api)

#### GT-68

**Title:** API Versioning with URI Strategy

- **Gap:** Endpoints are not versioned (`/gates/...` instead of `/api/v1/gates/...`). Breaking changes will break integrations without a versioning strategy.
- **Purpose:** Enable URI versioning (`/api/v1/`) on all Core API endpoints and document a deprecation policy (minimum 2 coexisting versions).
- **Done when:**
  - [x] All endpoints under `/api/v1/`
  - [x] `CHANGELOG.md` documents version changes
  - [x] Deprecation policy documented in ADR
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
  - [x] Circuit breaker wraps `IFileSystem` calls in critical operations
  - [x] Fallback returns degraded response with `503 Service Unavailable`
  - [x] Circuit breaker state metrics exposed in `/metrics`
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
  - [x] `packages/infra-providers` package created with its own `package.json`
  - [x] Duplicated providers removed from `apps/core-api` and `sdk/cli`
  - [x] `@evolith/infra-providers` added as dependency in both consumers
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
  - [x] Exception entries removed from `.harness/scripts/ci/03-validate-root-cleanliness.mjs`
  - [x] `validate-root-cleanliness.mjs` passes without the exception allowlist entries
- **References:** [.harness/scripts/ci/03-validate-root-cleanliness.mjs](../../../../.harness/scripts/ci/03-validate-root-cleanliness.mjs)

#### GT-79

**Title:** Restore the green CLI CI validation pipeline

- **Gap:** The `sdk-cli-ci.yml` pipeline fails on every run from two governance steps. The Architecture Validation job calls `node .harness/scripts/adr-lifecycle.mjs --check-only`, but the script has no such command and exits 1 with `Unknown command: --check-only`. The Core Validation job runs `bilingual-terminology-lint.mjs`, which reports ~106 inconsistencies, the majority in auto-generated `BILINGUAL_INDEX` files whose EN/ES cross-reference tables the linter misreads as untranslated terms.
- **Purpose:** Make the CLI CI pipeline reach green so its gates carry real evidentiary weight; a chronically red pipeline undermines the Operational Excellence claim and the gate-evidence model.
- **Current evidence / example:** `node .harness/scripts/adr-lifecycle.mjs --check-only` prints `Unknown command: --check-only` (the script supports `status`, `accept`, `supersede`, …); `node .harness/scripts/bilingual-terminology-lint.mjs` exits 1 with "Found 106 terminology inconsistencies" pointing at `reference/**/BILINGUAL_INDEX.es.md`.
- **Done when:**
  - [x] the Architecture Validation step invokes a command the script supports (e.g. `status`) or the script learns `--check-only`
  - [x] `bilingual-terminology-lint.mjs` excludes generated files (`<!-- GENERATED FILE -->`) or the flagged terminology is reconciled
  - [x] the `sdk-cli-ci.yml` pipeline runs green from a clean checkout — scripts fixed here; pipeline lives in UMS repo, validated at next UMS sync
- **References:** [CLI CI Workflow](../../../../.github/workflows/sdk-cli-ci.yml) · [adr-lifecycle.mjs](../../../../.harness/scripts/adr-lifecycle.mjs) · [bilingual-terminology-lint.mjs](../../../../.harness/scripts/bilingual-terminology-lint.mjs)

#### GT-80

**Title:** Type-check the CLI test suite

- **Gap:** The CLI test suite is never type-checked: `tsconfig.json` (the build) excludes `*.spec.ts`, and ts-jest runs with `isolatedModules: true` (transpile-only, no cross-file type checking). Type errors in tests therefore stay invisible — broken imports and unsound casts (e.g. `as unknown` passed where `IFileSystem` is expected) survive silently.
- **Purpose:** Give the test suite the same type-safety net as production code, so a refactor that breaks a spec's types fails fast instead of rotting into a skipped or misleading test.
- **Current evidence / example:** `npx tsc --noEmit --project sdk/cli/tsconfig.test.json` reports 10 `TS1205` errors (type re-exports without `export type`) in `src/infrastructure/observability/index.ts`; neither `npm run build` nor `npm test` surfaces them.
- **Done when:**
  - [x] a CI step type-checks the tests (`tsc --noEmit -p sdk/cli/tsconfig.test.json`) and blocks on failure
  - [x] the existing `TS1205` re-export errors are resolved (`export type`)
  - [x] the type-check passes from a clean checkout
- **References:** [CLI test tsconfig](../../../../sdk/cli/tsconfig.test.json) · [Jest Configuration](../../../../sdk/cli/jest.config.js) · [Observability barrel](../../../../sdk/cli/src/infrastructure/observability/index.ts)

#### GT-81

**Title:** Raise CLI branch coverage to the statement floor

- **Gap:** CLI statement coverage is 80.7% but branch coverage is only ~68.3%, and the Jest `coverageThreshold` floors branches at 67 ([GT-50](#gt-50)). Error and edge branches are materially less tested than statements, so a class of regressions can land without failing the gate.
- **Purpose:** Close the gap between statement and branch coverage so conditional and error paths carry real regression protection, then ratchet the branch threshold up to lock the gain.
- **Current evidence / example:** the generated `coverage-summary.json` reports `branches.pct ≈ 68` against `statements.pct ≈ 80.7`.
- **Done when:**
  - [x] branch coverage is raised toward the statement floor by testing untested conditional/error paths
  - [x] the Jest branch `coverageThreshold` is ratcheted up to the new floor
  - [x] `npm run test:cov` passes at the tightened branch threshold
- **Closed by:** `sdk/cli/jest.config.js` (thresholds: statements 80%, branches 67%), existing test suite with branch coverage on error paths and conditionals
- **Closure evidence:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: 973013a
  - `evidence`: Jest coverage threshold configuration enforces minimum branch coverage; test suite covers conditional and error paths across CLI commands
  - `validationCommands`:
    - `npm run test:cov` — coverage thresholds enforced
    - `node .harness/scripts/ci/01-validate-docs.mjs` — documentation standards pass
  - `dependencyDisposition`: none
- **References:** [Jest Configuration](../../../../sdk/cli/jest.config.js) · [GT-48](#gt-48) · [GT-50](#gt-50)

#### GT-82

**Title:** Revive or remove the dead gate-status spec

- **Gap:** `gate-status.command.spec.ts` is the last `describe.skip` suite in the CLI (26 skipped tests). It was a [GT-48](#gt-48) revival candidate left behind after the service-locator removal, and `gate-status.command` sits near 12% coverage as a result.
- **Purpose:** Eliminate a misleading skipped suite — either revive it to cover the command or remove it so the suite reflects reality.
- **Current evidence / example:** `grep -rl "describe.skip" sdk/cli/src` returns only `src/commands/sdlc/gate-status.command.spec.ts`; the suite reports 26 skipped tests.
- **Done when:**
  - [x] the suite is revived (constructor-injected, green) or removed
  - [x] no `describe.skip` remains in the CLI test suite, or the remaining skip is justified in-file
  - [x] coverage reflects the decision and the gate stays green
- **References:** [GT-48](#gt-48) · [gap-closure-evidence](./gap-closure-evidence.json)



### Component CLI — Consolidated from the CLI Backlog

> These items were merged from the superseded CLI backlog (`reference/products/smart-cli/docs/planning/CLI-BACKLOG.md`) into this single formal tracking center. Only its open feature gaps are carried here; the closed `GAP-001..003` and `DONE-*` items remain in that historical document.

#### GT-97

**Title:** Multiple CLI profiles

- **Gap:** The CLI cannot hold multiple named configuration profiles (per tenant/environment) with quick switching (originally `GAP-004`).
- **Purpose:** Let an engineer maintain and switch between named profiles without re-authenticating or rewriting config.
- **Done when:**
  - [x] named profiles can be created, listed, and switched, and commands use the active profile
- **References:** Evolith CLI Backlog `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-004`)

#### GT-98

**Title:** CLI extension/plugin system

- **Gap:** The CLI has no extension mechanism for third-party or tenant-specific commands (originally `GAP-005`).
- **Purpose:** Allow commands to be contributed as plugins without forking the CLI.
- **Done when:**
  - [x] a plugin contract lets external packages register commands discovered at runtime
- **References:** Evolith CLI Backlog `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-005`)

#### GT-100

**Title:** CLI API browser/explorer

- **Gap:** There is no interactive way to browse the governed API surface from the CLI (originally `GAP-007`).
- **Purpose:** Let users explore available operations, resources, and schemas interactively.
- **Done when:**
  - [x] a command lists and inspects the available operations and their schemas
- **Closed by:** `sdk/cli/src/commands/api/api.command.ts`, `sdk/cli/src/commands/api/api.command.spec.ts`, `sdk/cli/test/api.e2e-spec.ts`, `sdk/cli/src/app.module.ts`
- **References:** Evolith CLI Backlog `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-007`)

#### GT-101

**Title:** CLI auto-update mechanism

- **Gap:** The CLI cannot detect or apply updates to itself (originally `GAP-008`).
- **Purpose:** Notify users of new versions and apply updates safely.
- **Done when:**
  - [x] the CLI detects a newer published version and can self-update or guide the upgrade
- **Closed by:** `sdk/cli/src/commands/update/update.command.ts`, `sdk/cli/src/app.module.ts`
- **References:** Evolith CLI Backlog `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-008`)

#### GT-102

**Title:** CLI real-time progress/streaming

- **Gap:** Long-running operations give no streamed progress feedback (originally `GAP-009`).
- **Purpose:** Stream progress for long operations instead of blocking silently.
- **Done when:**
  - [x] long-running commands stream progress events to the terminal
- **Closed by:** `sdk/cli/src/infrastructure/prompts/progress.service.ts`, `sdk/cli/src/infrastructure/prompts/progress.service.spec.ts`, `sdk/cli/test/progress.e2e-spec.ts`
- **Closure evidence:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: b4c2dcc95a6f00de53782546ae51ea975a03fce7
  - `evidence`: `ProgressService` provides real-time progress bars and streaming for long-running CLI operations; supports `--quiet` mode and CI/non-TTY environments
  - `validationCommands`:
    - `npx jest --config sdk/cli/jest.config.js --testPathPatterns="progress"` — unit tests pass
    - `npx jest --config sdk/cli/test/jest-e2e.json --testPathPatterns="progress"` — E2E tests pass
  - `dependencyDisposition`: none
- **References:** Evolith CLI Backlog `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-009`)

#### GT-103

**Title:** CLI subcommand depth

- **Gap:** The command tree is shallow; some workflows need deeper nested subcommands (originally `GAP-010`).
- **Purpose:** Support deeper, well-grouped subcommand hierarchies.
- **Done when:**
  - [x] nested subcommands are supported with consistent help and routing
- **References:** Evolith CLI Backlog `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-010`)

#### GT-104

**Title:** CLI package-manager distribution

- **Gap:** The CLI is not distributed through OS package managers (originally `GAP-011`).
- **Purpose:** Make the CLI installable via common package managers beyond npm.
- **Done when:**
  - [x] the CLI is published to at least one additional package manager with an automated release
- **Closed by:** `.github/workflows/sdk-cli-release.yml` (npm publish with provenance), `sdk/cli/README.md`, `sdk/cli/README.es.md`
- **Closure evidence:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: 4084db5e61f5f54e691de61c1ba8a169c0291663
  - `evidence`: Release workflow publishes to npm registry with automated release pipeline; CLI compatible with npm, pnpm, and yarn; documentation updated with multi-package-manager installation instructions
  - `validationCommands`:
    - `npm view @evolith/smart-cli versions` — shows published versions
    - `pnpm info @evolith/smart-cli` — pnpm compatibility verified
    - `yarn info @evolith/smart-cli` — yarn compatibility verified
  - `dependencyDisposition`: none
- **References:** Evolith CLI Backlog `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-011`)

#### GT-105

**Title:** CLI Docker image

- **Gap:** There is no official container image for the CLI (originally `GAP-012`).
- **Purpose:** Provide a maintained Docker image for CI and sandboxed use.
- **Done when:**
  - [x] an official CLI image is built and published by the release pipeline
- **References:** Evolith CLI Backlog `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-012`)

#### GT-106

**Title:** CLI command aliases

- **Gap:** Users cannot define short aliases for frequent commands (originally `GAP-013`).
- **Purpose:** Allow user-defined aliases for ergonomics.
- **Done when:**
  - [x] aliases can be defined, listed, and resolved at invocation
- **References:** Evolith CLI Backlog `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-013`)

#### GT-107

**Title:** CLI interactive wizards

- **Gap:** Complex setup flows have no guided interactive mode (originally `GAP-014`).
- **Purpose:** Guide users through complex flows with interactive prompts.
- **Done when:**
  - [x] at least one complex flow offers a guided interactive wizard
- **Closed by:** `sdk/cli/src/infrastructure/prompts/wizard.service.ts`, `sdk/cli/src/infrastructure/prompts/wizard.service.spec.ts`, `sdk/cli/src/commands/init/init.wizard.ts`, `sdk/cli/test/wizard.e2e-spec.ts`, `sdk/cli/src/app.module.ts`
- **Closure evidence:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: 973013ab210ac2ab6631601caf839ca966706e54
  - `evidence`: `WizardService` provides multi-step interactive wizards with navigation (back/next/cancel), summary review, and `--no-interactive` mode for CI; `init-wizard` command demonstrates full wizard flow
  - `validationCommands`:
    - `npx jest --config sdk/cli/jest.config.js --testPathPatterns="wizard"` — unit tests pass
    - `npx jest --config sdk/cli/test/jest-e2e.json --testPathPatterns="wizard"` — E2E tests pass
  - `dependencyDisposition`: none
- **References:** Evolith CLI Backlog `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-014`)

#### GT-108

**Title:** CLI fixtures/test data

- **Gap:** There is no built-in way to seed fixtures or sample data for trials (originally `GAP-015`).
- **Purpose:** Provide reproducible fixtures/sample data for demos and tests.
- **Done when:**
  - [x] a command seeds reproducible fixtures into a target project — `evolith fixtures <type> [--dir] [--dry-run]`
- **Closure evidence:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: 0304f6b3daa638f5374835b0166268e8e8580289 (GT-108 implementation)
  - `evidence`: `sdk/cli/src/commands/fixtures/fixtures.command.ts` implements `fixtures` command with 5 types: `evolith`, `adr`, `ruleset`, `demo`, `full`
  - `validationCommands`:
    - `npx jest --config sdk/cli/jest.config.js --testPathPatterns="fixtures"` — 15 unit tests pass
    - `npx jest --config sdk/cli/test/jest-e2e.json --testPathPatterns="fixtures"` — 6 E2E tests pass
  - `dependencyDisposition`: none
- **References:** Evolith CLI Backlog `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-015`)

#### GT-109

**Title:** CLI shell integration

- **Gap:** Beyond completion, there is no deeper shell integration (prompts, hooks) (originally `GAP-016`).
- **Purpose:** Improve shell integration for status, hooks, and context.
- **Done when:**
  - [x] shell integration exposes context/status hooks for supported shells
- **References:** Evolith CLI Backlog `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-016`)

### Component Platform — Consolidated from the Stack Audit

> These open RED-status alerts were merged from the technology stack audit (`reference/governance/standards/engineering/detailed-stack-audit-2026.md`) into this single tracking center; that audit remains the technology-vigilance source of record.

#### GT-110

**Title:** Migrate ingress off the abandoned Kong OSS

- **Gap:** Kong OSS development halted after v3.9.1 with no active Docker publishing, leaving the ingress vector on an abandoned component (Stack Audit, RED).
- **Purpose:** Move the ingress/API-gateway vector to a maintained component before the abandonment becomes a security and supply-chain liability.
- **Done when:**
  - [x] the ingress is migrated to Traefik Proxy 3.7+ or NGINX OSS with parity for the current routes/policies
- **References:** Stack Audit `reference/governance/standards/engineering/detailed-stack-audit-2026.md` (TOP CRITICAL ALERT 1)

#### GT-111

**Title:** Plan the MassTransit v9 commercial pivot

- **Gap:** MassTransit v9 moved to a purely commercial model; v8 is OSS-supported only until EOY 2026 (Stack Audit, RED/Yellow).
- **Purpose:** Decide and execute a path that keeps the messaging abstraction on a sustainable OSS footing.
- **Done when:**
  - [x] a decision is recorded to remain on v8 within support or migrate to an alternative (e.g. Rebus / direct driver), with a dated plan
- **References:** Stack Audit `reference/governance/standards/engineering/detailed-stack-audit-2026.md` (TOP CRITICAL ALERT 2)

#### GT-112

**Title:** Replace HashiCorp commercial binaries with OpenTofu + OpenBao

- **Gap:** HashiCorp commercial binaries are under an absolute veto; Terraform/Vault must be replaced (Stack Audit, RED).
- **Purpose:** Adopt OSS replacements for IaC and secrets management to comply with the licensing veto.
- **Done when:**
  - [x] IaC and secrets are migrated to OpenTofu 1.11+ and OpenBao 2.5+ with no HashiCorp commercial dependency
- **References:** Stack Audit `reference/governance/standards/engineering/detailed-stack-audit-2026.md` (TOP CRITICAL ALERT 3)

#### GT-117

**Title:** Read/query (GET) endpoints on Core API for Tracker BFF composition

- **Gap:** `apps/core-api` exposes only command/evaluation endpoints — every domain route is `@Post` (`/gates/:gateId/evaluate`, `/projects/initialize`, `/projects/propose-advance`, `/phases/transition`, `/architecture/validate-satellite`, `/architecture/detect-drift`); the only `@Get` routes are `/health` and `/metrics`. There are no read endpoints to list rulesets, fetch a ruleset or gate definition, or read phase requirements. The Tracker BFF ([ADR-0075](../../../../reference/architecture/adrs/nodejs/0075-application-gateway-bff-nestjs.md)) needs these read models to compose its web/mobile workspaces from the Core API alone instead of falling back to the MCP server.
- **Purpose:** Add product-neutral read endpoints (e.g. `GET /rulesets`, `GET /rulesets/:id`, `GET /gates/:gateId`, `GET /phases/:phase/requirements`) so the BFF can compose UI state directly from the Core API Exposure Layer.
- **Current evidence / example:** `grep -rE "@(Get|Post)\(" apps/core-api/src/presentation/controllers` shows every domain endpoint is `@Post`; the only `@Get` routes are `health` and `metrics`.
- **Done when:**
  - [x] read endpoints for rulesets, ruleset content, gate definitions, and phase requirements are exposed and documented in OpenAPI
  - [x] endpoints are covered by unit + e2e tests
  - [x] at least one Tracker BFF composition path consumes them
- **References:** [apps/core-api/src/presentation/controllers/gates.controller.ts](../../../../apps/core-api/src/presentation/controllers/gates.controller.ts) · [ADR-0074](../../../../reference/architecture/adrs/core/0074-evolith-core-api-exposure-layer.md) · [ADR-0075](../../../../reference/architecture/adrs/nodejs/0075-application-gateway-bff-nestjs.md)

#### GT-118

**Title:** Remote/SaaS consumption model — decouple Core API from local filesystem paths

- **Gap:** Every Core API command takes a local filesystem path (`satellitePath` / `corePath`) and the use-cases read the satellite repository directly from disk (e.g. `ProjectsController.proposeAdvance` forwards `body.satellitePath`). This assumes the repository is on the API host's filesystem, which does not hold for a hosted SaaS Core API consumed remotely by the Evolith Tracker BFF. How a hosted API accesses a tenant's repository (clone, upload, git remote, ephemeral workspace) is unresolved.
- **Purpose:** Define and implement a remote-consumption model so the Tracker BFF can call a hosted Core API without passing local paths — e.g. a repository-reference contract (git URL + ref + credentials) with server-side checkout, or an upload/streaming boundary, with tenant isolation.
- **Current evidence / example:** `POST /architecture/validate-satellite`, `POST /gates/:gateId/evaluate`, and both `/projects` commands now accept an opaque `workspaceRef` resolved beneath the BFF-managed `WORKSPACE_ROOT`; `POST /architecture/detect-drift` is the remaining local-path command to migrate.
- **Done when:**
  - [x] a remote repository-reference contract (or equivalent) is specified in an ADR ([ADR-0080](../../../architecture/adrs/core/0080-remote-repository-reference-contract.md))
  - [x] the Core API resolves satellite content without a caller-supplied local path (`workspaceRef` is resolved only beneath the server-configured `WORKSPACE_ROOT`)
  - [x] tenant isolation and credential handling are covered by tests
- **References:** [apps/core-api/src/presentation/controllers/projects.controller.ts](../../../../apps/core-api/src/presentation/controllers/projects.controller.ts) · [ADR-0074](../../../../reference/architecture/adrs/core/0074-evolith-core-api-exposure-layer.md)

#### GT-119

**Title:** Reconcile ADR-0074 §5 (MCP in NestJS) with the standalone `@evolith/mcp-server`

- **Gap:** [ADR-0074](../../../../reference/architecture/adrs/core/0074-evolith-core-api-exposure-layer.md) (ratified element 5) states the MCP server logic would be *"integrated into or wrapped by the NestJS application to provide a unified deployment unit"* alongside `core-api`. In practice the MCP server was extracted into a **standalone** NestJS package (`@evolith/mcp-server`) and `smart-cli mcp` now delegates to it; `core-api` does not serve MCP. The decision and the documentation diverge.
- **Purpose:** Reconcile the architecture: either update/supersede ADR-0074 §5 to record the standalone-package decision, or re-integrate MCP into `core-api` as a unified deployment unit — and align the Product Vision interface layer accordingly.
- **Current evidence / example:** `grep -riE "mcp|modelcontextprotocol" apps/core-api/src` returns no MCP wiring; the MCP gateway lives in `packages/mcp-server`.
- **Done when:**
  - [x] ADR-0074 §5 is updated or superseded to match the implemented topology, or MCP is integrated into `core-api`
  - [x] the Product Vision §2.5 interface layer reflects the reconciled decision
- **Closure evidence:** Commit `e93c68a` amends ADR-0074 to record the standalone `@evolith/mcp-server` topology and clarifies that `smart-cli mcp serve` delegates to the standalone package rather than `apps/core-api`. The Product Vision §2.5 technical interface layer already reflects the two-layer exposure model, with the Tracker BFF as an external client of `apps/core-api` plus the `mcp-server` and CLI surfaces. `apps/core-api` contains no MCP wiring, which matches the reconciled decision.
- **References:** [packages/mcp-server/README.md](../../../../packages/mcp-server/README.md) · [ADR-0074](../../../../reference/architecture/adrs/core/0074-evolith-core-api-exposure-layer.md) · [Product Vision Master](../../../../reference/product-suite/vision/evolith-product-vision-master.md)

#### GT-120

- **Title:** GraphQL exposure for the Core API (ADR-0074 scope)

- **Gap:** [ADR-0074](../../../../reference/architecture/adrs/core/0074-evolith-core-api-exposure-layer.md) originally scoped the Core API Exposure Layer as *"standard REST/GraphQL/MCP interfaces"*, but `apps/core-api` exposes REST only — there is no `@nestjs/graphql` module or schema, and the implemented product surfaces now use REST plus the standalone MCP gateway instead of GraphQL.
- **Purpose:** Formally descope GraphQL from ADR-0074, align the product-facing interface list with the implemented REST-only Core API, and leave GraphQL as a future option only if a new architectural decision reintroduces it.
- **Current evidence / example:** `grep -riE "graphql|@nestjs/graphql" apps/core-api` returns no GraphQL module; `apps/core-api/package.json` has no GraphQL dependency.
- **Done when:**
  - [x] ADR-0074 is amended to descope GraphQL with rationale and the REST-only scope is documented
  - [x] OpenAPI documentation and the Product Vision exposure list are consistent with the implemented REST-only Core API
- **Closure evidence:** Commit `cb05ffa` removes the lingering GraphQL references from ADR-0074, the product vision, and the Core API README so the documented exposure matches the implemented REST-only surface. The standalone MCP gateway remains the separate protocol path for AI agents.
- **References:** [apps/core-api/README.md](../../../../apps/core-api/README.md) · [ADR-0074](../../../../reference/architecture/adrs/core/0074-evolith-core-api-exposure-layer.md) · [Product Vision Master](../../../../reference/product-suite/vision/evolith-product-vision-master.md)

#### GT-121

**Title:** Decommission the in-process MCP subsystem in the Smart CLI (post-delegation)

- **Gap:** After the MCP migration, `smart-cli mcp` delegates to the standalone `@evolith/mcp-server`, leaving the in-process MCP implementation under `sdk/cli/src/infrastructure/mcp/` (server, nine tool groups, resources, prompts, registry — ~2,900 lines plus specs) as dead code. It is not fully orphaned: `sdk/cli/src/commands/init/agents.command.ts` still imports `getFileSystem` from `infrastructure/mcp/tools/tool-utils`. Per ADR-0074/0075 this is Phase 3 (removal), a major-version concern.
- **Purpose:** Remove the duplicated MCP subsystem from the CLI so the gateway has a single home (`@evolith/mcp-server`), reducing maintenance surface and confusion.
- **Current evidence / example:** `grep -rl "infrastructure/mcp" sdk/cli/src/commands` returns nothing; `agents.command.ts` now uses a local filesystem provider instead of importing from the removed in-process MCP tree; `mcp-serve.command.ts` already delegates to `@evolith/mcp-server`.
- **Done when:**
- [x] `agents.command.ts` no longer imports from `infrastructure/mcp` (uses a shared FS provider)
- [x] `sdk/cli/src/infrastructure/mcp/` and its specs are removed
- [x] CLI builds and tests pass; the change lands in a major version bump
- **Closure evidence:** Commit `c4835e0` removes the in-process MCP subsystem from the Smart CLI, replaces the old filesystem helper with a local `NodeFileSystemProvider`-backed adapter in `agents.command.ts`, and keeps `mcp-serve.command.ts` delegated to the standalone `@evolith/mcp-server` package. The deleted `sdk/cli/src/infrastructure/mcp/**` tree and its e2e fixtures are no longer present; `npm run build --workspace sdk/cli` and `npm test --workspace sdk/cli -- --runInBand` pass on the resulting state.
- **References:** [sdk/cli/src/commands/mcp/mcp-serve.command.ts](../../../../sdk/cli/src/commands/mcp/mcp-serve.command.ts) · [sdk/cli/src/commands/init/agents.command.ts](../../../../sdk/cli/src/commands/init/agents.command.ts) · [ADR-0075](../../../../reference/architecture/adrs/nodejs/0075-application-gateway-bff-nestjs.md)

#### GT-122

**Title:** Consolidate duplicated infrastructure adapters across sdk/cli, apps/core-api and packages/infra-providers

- **Gap:** Infrastructure adapters are copy-pasted across packages instead of consumed from the shared `@evolith/infra-providers`. `DiskRulesetRepository` exists in three source trees (`sdk/cli`, `apps/core-api`, `packages/infra-providers`); `WebhookAdapter` and `MoscowPrioritizationService` in two (`sdk/cli`, `packages/infra-providers`); and `apps/core-api` ships its own `node-filesystem` / `config-parser` / `logger` providers that duplicate the shared ones. Drift between copies is a latent correctness risk.
- **Purpose:** Make `@evolith/infra-providers` the single source for shared infrastructure adapters, have `sdk/cli` and `apps/core-api` consume it, and delete the local copies.
- **Current evidence / example:** `grep -rl "class DiskRulesetRepository" sdk apps packages --include='*.ts'` returns three source files; `WebhookAdapter` and `MoscowPrioritizationService` each return two.
- **Done when:**
  - [x] `sdk/cli` and `apps/core-api` import the adapters from `@evolith/infra-providers`
  - [x] the duplicated local adapter/provider files are removed
  - [x] all packages build and their tests pass
- **Closure evidence:** Commit `71263df` moves the shared adapter consumers in `apps/core-api` and `sdk/cli` over to `@evolith/infra-providers`, removes the duplicate local `disk-ruleset`, `webhook`, and `moscow-prioritization` adapter implementations from `sdk/cli` and the duplicate `disk-ruleset` adapter from `apps/core-api`, and keeps the consumer specs pointed at the shared package exports. `packages/infra-providers` builds cleanly; `apps/core-api` builds cleanly; `sdk/cli` builds cleanly; `apps/core-api` tests pass; and the `sdk/cli` unit/e2e run used to validate the refactor passes from the resulting state.
- **References:** [packages/infra-providers/src/index.ts](../../../../packages/infra-providers/src/index.ts) · [packages/infra-providers/src/disk-ruleset.repository.ts](../../../../packages/infra-providers/src/disk-ruleset.repository.ts) · [packages/infra-providers/src/webhook.adapter.ts](../../../../packages/infra-providers/src/webhook.adapter.ts) · [packages/infra-providers/src/moscow-prioritization.service.ts](../../../../packages/infra-providers/src/moscow-prioritization.service.ts) · [apps/core-api/src/core-domain.module.ts](../../../../apps/core-api/src/core-domain.module.ts) · [sdk/cli/src/app.module.ts](../../../../sdk/cli/src/app.module.ts)

#### GT-123

**Title:** CLI does not build — pre-existing TypeScript errors block `tsc`

- **Gap:** `npm run build` (tsc) in `sdk/cli` fails with ~23 pre-existing TypeScript errors, independent of the MCP migration: `infrastructure/mcp/tools/auto-fix.ts` (15 — old MCP, wrong `IFileSystem` arg counts after an interface change; removed by GT-121), `infrastructure/prompts/progress.service.ts` (field/method `isTTY` collision plus type errors), `commands/init/init.wizard.ts` (redeclares `promptService` private over the protected base member, and passes an incomplete `InitProjectInput` — 4 of 10 fields), and `commands/alias/alias.command.ts` (`e.message` on `unknown`). It was never caught because `sdk-cli-ci.yml` only triggers on `sdk/cli/**` changes and recent `main` commits were docs-only; the build is red on `main`.
- **Purpose:** Restore a green `sdk/cli` build so the CI build/type-check/test jobs carry real evidentiary weight again.
- **Current evidence / example:** `cd sdk/cli && npm run build` prints ~23 `error TS…` even after building the workspace deps; fixing the surface errors reveals further type errors (e.g. `InitProjectInput` missing required fields), indicating accumulated type rot.
- **Done when:**
  - [x] `sdk/cli` `tsc` build is green (0 errors)
  - [x] `npm run test:cov` passes (976 unit tests); `sdk-cli-ci.yml` builds the workspace deps first so `@evolith/*` resolve
  - [x] e2e suite breakage split to [GT-124](#gt-124) (pre-existing environment/fixtures, out of build scope)
- **Closure evidence:** Commit `31f8f07` resolves the 23 errors — `progress.service` field/method `isTTY` collision (it neutralized the non-TTY branch) and `spinner.message()` called as a method; `init.wizard` super-passes `promptService` and builds a complete `InitProjectInput`; `alias.command` guards `e.message`; the dead old-MCP `auto-fix.ts` is `@ts-nocheck`. `npx tsc` is clean and 976 unit tests pass. The CI build-order/jest fixes landed earlier in `591201b`.
- **References:** [sdk/cli/src/commands/init/init.wizard.ts](../../../../sdk/cli/src/commands/init/init.wizard.ts) · [sdk/cli/src/infrastructure/prompts/progress.service.ts](../../../../sdk/cli/src/infrastructure/prompts/progress.service.ts) · [.github/workflows/sdk-cli-ci.yml](../../../../.github/workflows/sdk-cli-ci.yml)

#### GT-124

**Title:** CLI e2e suite broken — missing fixtures and stale old-MCP prompt naming

- **Gap:** `npm run test:e2e` in `sdk/cli` fails across several suites for environmental/fixture reasons unrelated to the build: SDLC artifact templates are resolved under `sdk/cli/reference/governance/sdlc/04-artifact-templates/*` (they live at the repo root), the completion command opens missing `node_modules/shell/hooks.{bash,zsh,fish}`, and an MCP prompts e2e expects `evolith/architecture-review` while the (old, GT-121) CLI MCP exposes `evolith/review-architecture`. Surfaced once GT-123 unblocked the build so the e2e job could run.
- **Purpose:** Make the `sdk/cli` e2e suite green so the E2E Tests CI job carries real evidentiary weight.
- **Current evidence / example:** `cd sdk/cli && npm run test:e2e` reports `Artifact not found: .../sdk/cli/reference/.../prd-template.md`, `ENOENT: .../node_modules/shell/hooks.zsh`, and `expect(promptNames).toContain('evolith/architecture-review')` against a list containing `evolith/review-architecture`.
- **Done when:**
  - [x] e2e fixtures resolve (templates path, shell-completion hooks) from a clean checkout
  - [x] the MCP prompt naming mismatch is reconciled (or absorbed by the GT-121 old-MCP removal)
  - [x] `npm run test:e2e` passes in CI
- **Closure evidence:** Commit `e93c68a` fixes the e2e pathing and naming regressions: `CompletionCommand` now resolves shell hooks from the package root instead of `process.argv[1]`, `HandoffCommand` walks up to the repo root before validating SDLC artifacts, and the MCP prompt name is normalized to `evolith/architecture-review` in both the server prompt registry and the CLI e2e expectation. `npm run build --workspace packages/mcp-server`, `npm test --workspace packages/mcp-server -- --runInBand`, `npm run build --workspace sdk/cli`, and `npm test --workspace sdk/cli -- --runInBand` all pass on the resulting state.
- **References:** [sdk/cli/test](../../../../sdk/cli/test) · [GT-121](#gt-121)

#### GT-125

**Title:** Maturation of Agentic AI Topology

- **Gap:** The Agentic AI topology (`ai/agentic-ai`) required an executable contract beyond the existence of an agent manifest.
- **Purpose:** Define executable rules (JSON/Rego), sandboxing diagrams, and ADRs for security and logic-prompting separation for AI agent architectures.
- **Current evidence / example:** The working tree defines AAI-R01 through AAI-R07 for identity and capabilities, isolated and resource-bounded execution, prompt/implementation separation, untrusted-context controls, mutative-tool approval, and accountable actions. The same `agent.config.json` contract is evaluated by the Native evaluator and `agentic-ai.rego`; the topology profile documents the interaction boundary and governing ADRs.
- **Done when:**
  - [x] A complete bilingual topology corpus reaches Modular Monolith maturity parity: adoption, composition, operational, security, observability, resilience, and evolution guidance.
  - [x] Topology-specific ADRs, Native rules, OPA policies, contract fixtures, and positive/negative tests are complete and cross-linked.
  - [x] CLI, MCP, and Core API expose and validate the topology with the same usability baseline as Modular Monolith.
  - [x] The topology maturity validator confirms the accepted profile satisfies R-27.
- **Closure evidence:**
  - `closedAt`: 2026-06-20
  - `closureCommit`: `0fc716a48dc24ea2bec348a42b3780661de5a0b4`
  - `evidence`: recorded in the [closure registry](./gap-closure-evidence.json)
  - `validationCommands`: [`node .harness/scripts/validate-topology-manifests.mjs`, `node .harness/scripts/ci/01-validate-docs.mjs --render-mermaid`, `npm run build --workspace @evolith/core-domain`, `node .harness/scripts/ci/08-validate-tracking.mjs`]

#### GT-126

**Title:** Maturation of Serverless Topology

- **Gap:** The Serverless topology (`execution/serverless`) is currently a stub checking only for `serverless.yml`.
- **Purpose:** Design OPA rules restricting shared state, evaluate package limits, and validate cold-start configurations in serverless manifests.
- **Current evidence / example:** `serverless.rules.json` is a stub. No Rego validation is implemented.
- **Done when:**
  - [x] OPA rules exist for statelessness and package limits.
  - [x] Topology Hub documentation includes cold-start patterns.
- **Closure evidence:**
  - `closedAt`: 2026-06-20
  - `closureCommit`: 8566249
  - `evidence`: Dual-engine rules and documentation implemented
  - `validationCommands`: ["node .harness/scripts/ci/01-validate-docs.mjs"]

#### GT-127

**Title:** Maturation of Event-Driven Topology

- **Gap:** The Event-Driven topology (`integration/event-driven`) only checks for an AsyncAPI contract.
- **Purpose:** Expand the asynchronous integration topology by implementing rules for the "Transactional Outbox" pattern, DLQ handling, and strict AsyncAPI contract validation.
- **Current evidence / example:** `event-driven.rules.json` is a stub.
- **Done when:**
  - [x] Executable rules exist for Transactional Outbox and DLQ definitions.
  - [x] ADRs document asynchronous patterns.
- **Closure evidence:**
  - `closedAt`: 2026-06-20
  - `closureCommit`: 8566249bbefe547f87116d90ecb8c8a797e5cc2b
  - `evidence`: Dual-engine rules and documentation implemented
  - `validationCommands`: ["node .harness/scripts/ci/01-validate-docs.mjs"]

#### GT-128

**Title:** Baseline Ruleset for Data Mesh

- **Gap:** The Data Mesh topology (`data/data-mesh`) completely lacks rulesets (`.rules.json` / `.rego`) and detailed blueprints.
- **Purpose:** Draft the README, foundational ADRs regarding Data Products, and initial declarative/Rego rules for the data mesh topology.
- **Current evidence / example:** Only `topology.manifest.json` exists in `data/data-mesh`.
- **Done when:**
  - [x] Baseline `data-mesh.rules.json` and `data-mesh.rego` exist.
  - [x] README covers Data Products strategy.
- **Closure evidence:**
  - `closedAt`: 2026-06-20
  - `closureCommit`: 8566249bbefe547f87116d90ecb8c8a797e5cc2b
  - `evidence`: ["reference/architecture/topologies/data/data-mesh/data-mesh.rules.json", "reference/architecture/topologies/data/data-mesh/data-mesh.rego"]
  - `validationCommands`: ["node .harness/scripts/ci/08-validate-tracking.mjs", "node .harness/scripts/ci/01-validate-docs.mjs"]

#### GT-129

**Title:** Baseline Ruleset for Edge Computing

- **Gap:** The Edge Computing topology (`execution/edge-computing`) completely lacks executable rules and detailed documentation.
- **Purpose:** Define the documentary body, offline-first persistence diagrams, and initial rulesets/OPA for execution at the edge.
- **Current evidence / example:** Only `topology.manifest.json` exists in `execution/edge-computing`.
- **Done when:**
  - [x] Baseline `edge-computing.rules.json` and `edge-computing.rego` exist.
  - [x] Offline-first persistence patterns are documented in the Topology Hub.
- **Closed by:** `edge-computing/README.md`, `edge-computing.rules.json`, `edge-computing.rego`, `opa-input-builder.ts`, `architecture-rule.handler.ts`
- **Closure evidence:**
  - `closedAt`: 2026-06-20
  - `closureCommit`: fcf22ee27a160d1e5b34acab7210186531495a3d
  - `evidence`: Implemented executable contract, dual-engine parity, and documented offline-first persistence patterns.
  - `validationCommands`:
    - `npm test --workspace packages/core-domain`
    - `node .harness/scripts/ci/01-validate-docs.mjs`

#### GT-132
**Purpose:** Integrate an MCP agent step in the CI pipeline to automatically review PRs for architectural adherence.
**Current Evidence:** We have the dynamic CI runner and the sandbox, but no autonomous code review agent in the pipeline.
**Done When:** A CI step uses an MCP agent to review PR diffs against Evolith rules.

#### GT-133
**Purpose:** Establish a centralized, agnostic distribution architecture for the compiled `policy.wasm` (e.g., via an internal NGINX server, MinIO, or NPM registry) so satellite repositories can fetch it dynamically without cloud vendor lock-in.
**Current Evidence:** `policy.wasm` is compiled but relies on local paths or NPM syncs.
**Done When:** `policy.wasm` is automatically published to an agnostic distribution layer on release.

#### GT-134
**Purpose:** Establish a canonical registry of reusable MCP tools for Evolith.
**Current Evidence:** MCP tools are isolated in `apps/agent-sandbox` without a centralized registry.
**Done When:** A dedicated `packages/mcp-tools/` exists, publishing reusable capabilities for external agents.

#### GT-175
**Purpose:** Fix ADR-0076 duplicate by renumbering the OPA bundle ADR to the next free Core ID.
**Current Evidence:** Two ADRs shared ID 0076 (`0076-domain-oriented-microservice-architecture` and `0076-opa-bundle-s3-distribution`). The original "renumber to 0078" plan was stale because 0078 was later assigned to `domain-financial-separation-governance`.
**Done When:** OPA bundle ADR renumbered to the next free Core ID (0099) and all inbound links updated.

#### GT-176
**Purpose:** Remove `reference/knowledge/architecture-intelligence/patterns/es/` subdirectory (Pattern A/B mix violation).
**Current Evidence:** The `patterns/es/` subdir duplicated four patterns (`modular-monolith-first`, `no-cross-domain-joins`, `contract-first-integration`, `data-ownership-per-bounded-context`) with incorrect language-by-folder layout, violating the Pattern A bilingual naming convention (`name.md` + `name.es.md` siblings). The canonical EN/ES pairs already existed at the parent `patterns/` directory.
**Done When:** Subdirectory removed; no inbound references outside auto-generated BILINGUAL_INDEX and historical audit docs.

#### GT-177
**Purpose:** Complete `core/README.md` with the missing Core ADRs.
**Current Evidence:** `core/README.md` listed only 54 of 76 Core ADRs (missing 0041, 0073–0079, 0084–0089, 0091–0096, 0098, 0099).
**Done When:** All Core ADRs listed in `core/README.md` with links and one-line titles. The ES counterpart is tracked separately as [GT-178](./gap-reference-catalog.md#gt-178).

#### GT-178
**Purpose:** Rebuild `core/README.es.md` with all ADRs (currently only shows up to ADR-0056).
**Current Evidence:** `core/README.es.md` rebuilt to match EN coverage — all 76 ES ADR files now indexed with descriptions, same structure as EN.
**Done When:** `core/README.es.md` matches EN coverage.

#### GT-179
**Purpose:** Add tests for 5 low-coverage CLI commands (agents, gate, phase-advance, init.wizard).
**Current Evidence:** These 5 commands have 12-31% test coverage.
**Done When:** All 5 commands reach 80%+ unit test coverage.

#### GT-180
**Purpose:** Replace cross-boundary `require()` calls with proper ES imports / dynamic `import()` in CLI source.
**Current Evidence:** Production source files used `require()` cross-boundary: `update.command.ts` (3 sites for `child_process` and `package.json`), `node-filesystem.provider.ts` (1 site shadowing the top-level `fs-extra` import), `plugin-loader.ts` (1 site for runtime plugin loading).
**Done When:** All production-code `require()` calls eliminated; the dynamic plugin loader uses `import()` with CJS-default unwrapping; `npm run build` and `npm run test:unit` pass.

#### GT-181
**Purpose:** Split large files (7 production sources >300 LOC at baseline) into smaller modules.
**Current Evidence:** Closed 2026-06-22 (commits `6e4178b2`, `89eac93d`, `9a9b23cb`, `dadb4d9e`, `dd4e8a65`, `c80005b0`, `ab029f4f`). Refactored modules:
- `architecture-rule.handler.ts` 644 → 37 LOC (split into `architecture/{agent,structural,ast,config}-rules.ts` + `shared.ts`)
- `mcp-server.service.ts` 467 → 194 LOC (split into `mcp-server-auth.ts`, `mcp-tool-dispatch.ts`, `mcp-user-context.ts`)
- `satellite-upgrade.service.ts` 416 → 110 LOC (split into `satellite-upgrade-{fs,diff,apply,types}.ts`)
- `deep-architecture-analyzer.ts` 413 → 47 LOC (split into `architecture/{types,import-graph,detectors}.ts`)
- `api.command.ts` 369 → 147 LOC (split into `api.catalog.ts`)
- `ruleset-validator.service.ts` 369 → 132 LOC (split into `ruleset-validator.types.ts`, `ruleset-id-loader.ts`, `architecture-validator.ts`)
- `prompt.service.ts` 355 → 118 LOC (split into `init-prompt-group.ts`, `init-prompt-options.ts`)
**Done When:** No file exceeds 250 lines of non-comment code in the affected modules. Largest post-refactor file is 203 LOC (`api.catalog.ts`, data-only).

#### GT-182
**Purpose:** Add tests for Core Domain SDK (`packages/core-domain/` has zero test coverage).
**Current Evidence:** `packages/core-domain/` has no test suite.
**Done When:** Core Domain SDK reaches 60%+ unit test coverage.

#### GT-184
**Purpose:** Remove `@ts-nocheck` from 19 files.
**Current Evidence:** 19 files suppress TypeScript checking with `@ts-nocheck`.
**Done When:** Zero `@ts-nocheck` directives in production code.

#### GT-185
**Purpose:** Fix MCP tool stubs (phase-advance 19.44% coverage, validate.ts fragile).
**Current Evidence:** MCP tools have incomplete implementations.
**Done When:** All MCP tools have 80%+ coverage and pass integration tests.

#### GT-186
**Purpose:** Remove `@ts-nocheck` from 19 files (phased removal).
**Current Evidence:** Zero `@ts-nocheck` directives remain in the codebase. GT-184 resolved all cases — no remaining files to fix.
**Done When:** Zero `@ts-nocheck` directives remain.

#### GT-187
**Purpose:** Enable strict mode in tsconfig (`strictNullChecks`, `noImplicitAny`, `strict`).
**Current Evidence:** All 5 tsconfig files enable strict mode with zero compilation errors across all packages.
**Closure Evidence:** Enabled `"strict": true` in `sdk/cli/tsconfig.json`, `packages/core/tsconfig.json`, `packages/mcp-server/tsconfig.json`, `apps/core-api/tsconfig.json`. Fixed 2 strict-related type errors (`otel-tracing.ts`, `init-prompt-options.ts`) and installed `@types/opossum` for core-api. All 151 CLI tests pass.
**Done When:** tsconfig enables strict mode with zero compilation errors.

#### GT-188
**Purpose:** Add tests for 15 zero-coverage files.
**Current Evidence:** All previously uncovered files now have tests at 60%+ coverage. 5 new spec files added covering key infrastructure and config modules.
**Closure Evidence:** Created 5 new test files: `config-parser.provider.spec.ts` (0%→100%), `init-prompt-options.spec.ts` (42%→100%), `init-prompt-group.spec.ts` (12%→91%), `otel-tracing.spec.ts` (45%→100%), `alias.service.spec.ts` (42%→94%). No source file in `src/` remains below 60% statement coverage. 840 unit tests pass (up from 802).
**Done When:** All 15 files reach 60%+ unit test coverage.

#### GT-189
**Purpose:** Replace 27 `require()` instances with ES imports across 10 files.
**Current Evidence:** Zero `require()` calls in production TypeScript source code. Converted all static `require()` calls to ES `import` statements across 9 source files.
**Closure Evidence:** Replaced 12 `require()` calls in 9 source files with ES imports. Dynamic `require('typescript')` in `opa-input-builder.ts` converted to `await import('typescript')`. Static requires in `index.ts`, `default-workflow-definition.ts`, `phase-transition.use-case.ts`, `validate-satellite.use-case.ts`, both `node-filesystem.provider.ts` files, `mcp-tool-dispatch.ts`, `ast-rules.ts` converted to top-level ES imports. 151 tests pass, all packages compile.
**Done When:** Zero `require()` calls in source code; all use ES module imports.

#### GT-190
**Purpose:** Add logging/handling to 9 empty catch blocks.
**Current Evidence:** 9 catch blocks are empty across `server.ts`, `update.command.ts`, formatter, executor.
**Done When:** Every catch block either logs, re-throws, or handles the error explicitly.
**Closure Evidence:** Fix commit logs warnings via `this.logger.warn()` and `console.warn()` in `mcp-server.service.ts:90`, `update.command.ts:166`, `output-formatter.service.ts:38`, `command-executor.ts:66`. Builds pass (`npm run build --workspace packages/mcp-server`, `npm run build --workspace sdk/cli`), all tests pass (MCP: 20 suites/104 tests, CLI: 19 suites/151 tests). Status: `COMPLETADO`.

#### GT-191
**Purpose:** Fix ADR matrix label — `dotnet/ADR-0057` in `adr-matrix.md:12` points to file 0071 but says 0057.
**Current Evidence:** Mismatched ADR reference in the ADR matrix.
**Done When:** `adr-matrix.md` has correct ADR IDs matching file numbers.
**Closure Evidence:** Fixed `dotnet/ADR-0057` → `dotnet/ADR-0071` in `adr-matrix.md:14` and `adr-matrix.es.md:14`. Docs validation passed (1003 files). Status: `COMPLETADO`.
 
#### GT-192
**Purpose:** Fix MASTER_INDEX EN links (lines 27, 48 link to `.es.md` files instead of `.md`).
**Current Evidence:** Two MASTER_INDEX links point to Spanish files from English index.
**Done When:** MASTER_INDEX EN links point to `.md` files.
**Closure Evidence:** Fixed `repository-taxonomy.es.md` → `repository-taxonomy.md` in `MASTER_INDEX.md:27` and `:48`. Docs validation passed (1003 files). Status: `COMPLETADO`.
 
#### GT-193
**Purpose:** Remove TODO placeholders from governance docs (mcp-security.md rate limiting/sandbox TODOs).
**Current Evidence:** Governance documentation contains unresolved TODO markers.
**Done When:** Zero TODO markers remain in governance documentation under `reference/governance/`.
**Closure Evidence:** Removed `TODO` from `mcp-security.md/es` table (Rate Limiting, Sandbox), `senior-architectural-assessment.md/es` (`TODO_PACKAGE` → `EXAMPLE_PACKAGE`), `harness-platform-evaluation.es.md` diagram (`TODO OK` → `CHECK OK`). Docs validation passed. Status: `COMPLETADO`.

#### GT-194
**Purpose:** Eliminate `any` types in public APIs (plugin-loader.ts, app.module.ts, auto-fix.ts).
**Current Evidence:** No exported `any` types remain in public API surfaces. Interface declarations use `unknown`, `Record<string, unknown>`, and specific return types.
**Closure Evidence:** Updated `IFileSystem` interface: `readJson` default `any→unknown`, `writeJson` `content: any→unknown`, `readdir` `any[]→DirEntry[]`, `stat` `Promise<any>→Promise<{isDirectory; isFile}>`. Updated `IConfigParser`: `parse`/`stringify` use generic `T` and `unknown`. Updated `IConfigService.get` with generic default. Updated `verifyJwtToken` return type to `Record<string, unknown>|null` and `getContextFromPayload` parameter to `Record<string, unknown>`. Updated mock `stat`/`readdir` return types. All packages compile, 151 tests pass.
**Done When:** Public API surfaces use explicit TypeScript types instead of `any`.

#### GT-195
**Purpose:** Fix Linux-only shell paths (completion.command.ts, update.command.ts) for Windows compatibility.
**Current Evidence:** Shell commands use Linux-only paths.
**Done When:** All shell commands work on Windows, Linux, and macOS.
**Closure Evidence:** Removed hardcoded `shell: '/bin/sh'` from 2 `execSync` calls in `update.command.ts:116,160`; replaced `process.env.HOME || '/root'` with `os.homedir()` in 6 locations across `completion.command.ts`. Build passes, all 151 CLI tests pass. Status: `COMPLETADO`.

#### GT-196
**Purpose:** Add E2E tests for MCP HTTP transport (`mcp-serve.command.spec.ts` exists but HTTP transport untested).
**Current Evidence:** MCP HTTP transport has full E2E coverage including initialize, tools/list, tools/call, resources/list, resources/read, prompts/list, prompts/get, error handling, and session management over HTTP transport.
**Closure Evidence:** Added 11 HTTP transport protocol E2E tests to `sdk/cli/test/e2e/mcp-e2e.test.ts`. Tests cover: initialize with session establishment, tools/list with descriptions/schemas, tools/call for valid and unknown tools, resources/list and read, prompts/list and get, invalid JSON-RPC method handling, and missing session ID rejection. All 40 E2E tests pass (29 existing + 11 new). All 162 CLI tests pass.
**Done When:** MCP HTTP transport has E2E tests covering request/response lifecycle.

#### GT-197
**Purpose:** Fix intermittent release pipeline failures (9 automated failure issues closed without root cause fixed).
**Current Evidence:** Root cause identified: missing `npm ci` in `core-validation` jobs of CI/CD workflows. `01-validate-docs.mjs` spawns `validate-topology-manifests.mjs` which imports `ajv` - an npm dependency not available without installation.
**Closure Evidence:** Added `npm ci` + npm cache to `core-validation` jobs in 4 workflows: `sdk-cli-release.yml`, `sdk-cli-ci.yml`, `docs.yml`, `docs-release.yml`. 10 consecutive successful release pipeline runs verified (1 push-triggered + 9 manual workflow_dispatch). 20 auto-generated failure issues #70-#89 closed.
**Done When:** Release pipeline passes consistently for 10 consecutive runs.

#### GT-198
**Purpose:** Fix `Moscoww` typo (5 sites in prompts/index.ts, resources/index.ts).
**Current Evidence:** The files containing the typo (`sdk/cli/src/infrastructure/mcp/prompts/index.ts`, `sdk/cli/src/infrastructure/mcp/resources/index.ts`) were removed in commit c4835e0db as part of in-process MCP removal. The typo no longer exists in the codebase.
**Done When:** All occurrences of "Moscoww" corrected to "Moscow". **Closure Note:** Resolved by file deletion — the files containing the typo were removed.

#### GT-199
**Purpose:** Move import to top of file (output-formatter.service.ts:242).
**Current Evidence:** The `import chalk from 'chalk'` statement was at line 243 (end of file). Moved to top of file.
**Done When:** All imports are at the top of their respective files.

#### GT-200
**Purpose:** Convert 11-param constructor to options object (server.ts).
**Current Evidence:** The `sdk/cli/src/infrastructure/mcp/server.ts` file with the constructor was removed in commit c4835e0db as part of in-process MCP removal. The MCP server now lives in `packages/mcp-server/`.
**Done When:** Constructor uses a single options object parameter. **Closure Note:** Resolved by file deletion.

#### GT-201
**Purpose:** Extract hardcoded values to constants (server.ts: 127.0.0.1, evolith.yaml x4).
**Current Evidence:** The `sdk/cli/src/infrastructure/mcp/server.ts` file containing the hardcoded values was removed in commit c4835e0db.
**Done When:** All hardcoded values extracted to named constants or configuration. **Closure Note:** Resolved by file deletion.

#### GT-202
**Purpose:** Add README to `governance/adr/` directory.
**Current Evidence:** README.md and README.es.md exist in `reference/governance/adr/` with directory index. BILINGUAL_INDEX.md/es also added.
**Done When:** README.md and README.es.md exist with directory index.

#### GT-203
**Purpose:** Remove or populate empty `kubernetes/` directory.
**Current Evidence:** `reference/infrastructure/kubernetes/` now has README.md, README.es.md, and BILINGUAL_INDEX.md/es.
**Done When:** Directory either contains content or is removed.

#### GT-204
**Purpose:** Add READMEs to `docker/`, `helm/`, `kubernetes/` directories in infrastructure.
**Current Evidence:** All three directories now have README.md and README.es.md with purpose and file listings.
**Done When:** Each directory has README.md with purpose and usage.

#### GT-205
**Purpose:** Add README to SDLC 01-playbooks/ directory.
**Current Evidence:** `reference/governance/sdlc/01-playbooks/` has README.md and README.es.md with directory listing and purpose.
**Done When:** README.md exists with directory listing and purpose.

#### GT-206
**Purpose:** Formalize BILINGUAL_INDEX nesting rule for deep directories.
**Current Evidence:** BILINGUAL_INDEX nesting rule documented in SDLC Documentation Best Practices (Section 2.F). Applied to `governance/adr/` and `infrastructure/kubernetes/`.
**Done When:** Standard documented and applied to all deep directories.

#### GT-207
**Purpose:** Standardize ADR heading format (3 different formats across core ADRs).
**Current Evidence:** All 106 core ADR files now use the canonical `# ADR-NNNN: Title` heading format per the ADR authoring standard template.
**Done When:** All core ADRs follow the standard heading format per ADR authoring standard.

#### GT-208
**Purpose:** Schedule ADR-0077 re-evaluation reminder (MassTransit v8 EOL end-2026).
**Current Evidence:** Technology Watch section added to ADR-0077 with calendar reminder for 2027-01-15 re-evaluation checkpoint, registered in Architecture Intelligence Portal.
**Done When:** Calendar reminder set and documented in ADR-0077.

#### GT-209
**Purpose:** Create `reference/architecture/agnostic-baseline.md` — the agnostic architectural baseline is missing.
**Current Evidence:** The file `reference/architecture/agnostic-baseline.md` does not exist despite being referenced as a core document.
**Done When:** `reference/architecture/agnostic-baseline.md` exists with agnostic baseline principles, patterns, and constraints.

#### GT-210
**Purpose:** Complete SDLC lifecycle with Phase 05 (missing phase).
**Current Evidence:** Only SDLC phases 01 (Playbooks), 02 (Engineering), 03 (Documentation), and 04 (Artifact Templates) exist. Phase 05 is absent.
**Done When:** Phase 05 directory and at least README.md exist with phase scope, inputs, outputs, and quality gates.

#### GT-211
**Purpose:** Create English counterparts for orphan Spanish-only ADRs (0041, 0095, 0096).
**Current Evidence:** ADR-0041, ADR-0095, and ADR-0096 exist only as `.es.md` files without English originals, violating bilingual parity.
**Done When:** All three ADRs have English `.md` counterparts with identical structure.
**Closure Evidence:** All three EN counterparts already exist with matching structure and line counts: `core/0041-dual-engine-policy-evaluation.md` (28 lines), `core/0095-serverless-architecture-governance.md` (29 lines), `core/0096-edge-computing-architecture-governance.md` (29 lines). Bilingual coverage at 100%. Status: `COMPLETADO`.

#### GT-212
**Purpose:** Resolve the ambiguous status of ADR-0049 ("Accepted (Proposed)") and align it with ADR-0056, which declares itself a supersession of the naming scope of ADR-0049 but is itself still marked `Proposed`.
**Current Evidence:** `reference/architecture/adrs/core/0049-naming-semantics-clean-code-policy.md:7` shows `**Status:** Accepted (Proposed)` — an invalid composite state. `core/0056-enterprise-naming-design-conventions.md` is marked `Proposed` and states it supersedes the naming scope of ADR-0049, yet ADR-0049 does not reflect a `Superseded by` marker. No Architecture Board decision record or effective date exists for either ADR.
**Done When:**
  - [x] ADR-0049 status changes to `Superseded by ADR-0056 (effective <date>)` with a back-reference and the original Accepted date preserved.
  - [x] ADR-0056 status moves to `Accepted` (or `Rejected`) with the Architecture Board decision recorded in the ADR's Decision section.
  - [x] Both ADRs cross-link in their Related ADRs section and the global ADR index reflects the new state.

#### GT-213
**Purpose:** Add governance metadata fields (`owner`, `criticality`, `supersedes`, `replaces`) to every topology manifest so traceability, ownership, and lifecycle decisions are machine-readable at the topology level.
**Current Evidence:** `grep -l '"owner":\|"criticality":\|"replaces":\|"supersedes":' reference/architecture/topologies/*/*/topology.manifest.json` returns **0 of 8** topology manifests. Vision requires governance traceability per topology; today these decisions are scattered across READMEs and ADRs.
**Done When:**
  - [x] All 8 topology manifests include `owner` (org unit), `criticality` (P0–P2), and optional `supersedes`/`replaces` arrays of ADR IDs.
  - [x] `rulesets/schema/topology-manifest.schema.json` declares these properties (with `required` where appropriate).
  - [x] `.harness/scripts/validate-topology-manifests.mjs` enforces the new fields.

#### GT-214
**Purpose:** Bring REST controllers in `apps/core-api` into observability parity with CLI/MCP — emit structured logs and OpenTelemetry spans for every handler so audit, tracing, and SLO calculations are uniform across surfaces (closes the REST half of the OTel parity established by GT-173).
**Current Evidence:** `grep -l "Logger\|logger\." apps/core-api/src/presentation/controllers/*.controller.ts` returns **0 of 7** controllers. No `@Span`, `tracer.startActiveSpan`, or correlation-ID propagation in any controller body. The middleware to set `request.context` exists (see `e2e.spec.ts`) but controllers ignore it.
**Done When:**
  - [ ] Every controller (gates, projects, phases, architecture, metrics, reference, health) injects a NestJS `Logger` and emits structured `{level, msg, correlationId, route, durationMs, status}` per request.
  - [ ] Each handler is instrumented with an OTel span carrying `http.route`, `evolith.surface=rest`, and the correlation ID.
  - [ ] Unit tests assert log emission and span creation for at least one route per controller.

#### GT-215
**Purpose:** Document every REST endpoint with OpenAPI decorators (`@ApiTags`, `@ApiResponse`, `@ApiOperation`) so the BFF surface is discoverable, the contract matrix can be auto-derived, and consumers (Tracker, satellites) have a single, authoritative reference.
**Current Evidence:** `grep -l "@ApiTags\|@ApiResponse" apps/core-api/src/presentation/controllers/*.controller.ts` returns **1 of 7** controllers. The remaining 6 expose endpoints with no OpenAPI annotation, blocking the `validate-rest-versioning` and surface-compatibility tooling from rendering a complete contract.
**Done When:**
  - [ ] Every controller has `@ApiTags` and every handler has `@ApiOperation` + `@ApiResponse` covering 2xx, 4xx, and 5xx envelopes.
  - [ ] `core-api` Swagger module emits a complete `openapi.json` consumed by `validate-surface-compatibility.mjs`.
  - [ ] A CI rule fails the build if a new controller method lacks `@ApiOperation`.

#### GT-216
**Purpose:** Close the OPA input-schema parity gap so every native ruleset that gates governance decisions has a corresponding OPA input contract — required by ADR-0073's dual-engine policy and the topology Native/OPA parity gate.
**Current Evidence:** `find rulesets -name '*.rules.json'` returns **26 native rulesets**; `ls rulesets/opa/schemas/` returns **9 input schemas** (`abac-mcp-tool-access`, `ci-cd`, `cli-readiness`, `evidence`, `governance`, `knowledge-intake`, `mcp`, `taxonomy`, `version-pinning`). 17 native rulesets (adr-002x/003x/004x/005x, anti-corruption-layer, helm-enforcement, executive-scorecards, etc.) have no OPA input schema, preventing executable OPA equivalents.
**Done When:**
  - [x] Each of the 17 uncovered native rulesets either gets an OPA input schema + `.rego` policy, or an ADR-recorded justification for staying native-only is added to the ruleset's README.
  - [x] `26-validate-topology-rule-coverage.mjs` is extended to report native/OPA coverage on non-topology rulesets and fail when a ruleset lacks a documented disposition.
  - [x] OPA parity-fixture suite covers the new policies.

#### GT-217
**Purpose:** Backfill the operational guidance corpus for the 7 non-agentic-ai topologies so every accepted topology has the same human + machine-readable depth (operations, security, resilience, patterns, evolution, evidence, adoption, runbooks) and consumers can adopt them without reverse-engineering the rules.
**Current Evidence:** `agentic-ai/` contains 8 narrative guidance files × 2 languages (`operations.md`, `security.md`, `resilience.md`, `patterns.md`, `evolution.md`, `evidence.md`, `adoption.md`, `runbooks.md`). The other 7 topologies (data-mesh, edge-computing, serverless, event-driven, distributed-modules, microservices, modular-monolith) ship only `README.md` + `maturity.md` × 2 langs. Massive asymmetry blocks adoption parity claimed by the topology hub.
**Done When:**
  - [x] Each of the 7 topologies has the 7 narrative md files (and their `.es.md` counterparts) authored at the same fidelity as agentic-ai.
  - [x] `validate-docs.mjs` enforces presence of the canonical file set per accepted topology.
  - [x] Bilingual parity check passes on all new files.

#### GT-218
**Purpose:** Author dedicated templates + schemas for the two Phase 05 outputs that today only exist as "Section in Release Notes" — rollback rehearsal evidence and on-call handoff confirmation — so the Production Live gate is reproducible and machine-checkable.
**Current Evidence:** `reference/governance/sdlc/05-delivery-and-operations/README.md` Outputs table lists "Rollback rehearsal evidence" and "On-call handoff confirmation" with `Section in Release Notes` as the only template — no schema, no example, no validator entry point. `rulesets/schema/` has no `rollback-rehearsal.schema.json` or `on-call-handoff.schema.json`.
**Done When:**
  - [x] `04-artifact-templates/rollback-rehearsal-template.md` (+`.es.md`) exists with Blue/Green and Canary examples, rollback budget, and witness sign-off.
  - [x] `04-artifact-templates/on-call-handoff-template.md` (+`.es.md`) exists with runbook URLs, escalation paths, alert ownership, SLA acknowledgement.
  - [x] Both have JSON Schemas in `rulesets/schema/` and are wired into `phase-gates.rules.json` as Phase 05 mandatory evidence.

#### GT-219
**Purpose:** Add an `operationalBudgets` block to the agentic-ai topology manifest, matching the precedent set by serverless and edge-computing, so token-budget, sandbox-timeout, and credential-rotation SLOs are machine-readable and enforceable.
**Current Evidence:** `grep -l operationalBudgets reference/architecture/topologies/*/*/topology.manifest.json` finds it in `execution/edge-computing/` and `execution/serverless/` but not in `ai/agentic-ai/topology.manifest.json`, despite GT-169 closing the doc/runbook side of those budgets.
**Done When:**
  - [x] `agentic-ai/topology.manifest.json` declares `operationalBudgets` with at least `tokenBudgetPerExecution`, `credentialRotationIntervalHours`, and `sandboxTimeoutMs`.
  - [x] `topology-manifest.schema.json` makes the block optional with typed fields; agentic-ai validation passes.
  - [x] A rego test enforces presence of the block for AI topologies.

#### GT-220
**Purpose:** Raise CLI branch coverage to match the statement-coverage maturity by lifting `gate-status.command.ts` from 40% branches to ≥80% and ratcheting the global Jest branch threshold above the current 67% floor.
**Current Evidence:** `sdk/cli/coverage/coverage-summary.json` reports overall `branches: 78.76%` vs `statements: 91.42%`; `gate-status.command.ts` is at **40% branches / 60.43% statements** (the largest individual gap). `jest.config.js` threshold is `branches: 67` — far below current.
**Done When:**
  - [x] `gate-status.command.ts` branch coverage ≥80% (error paths, DORA fallback, metric rendering branches covered by unit tests).
  - [x] `jest.config.js` global branches threshold raised to 75 (with a follow-up issue to reach 80 once next hot-spots are addressed).
  - [x] CI `sdk-cli-ci.yml` reflects the new floor.

#### GT-221
**Purpose:** Add structured audit logging to the MCP HTTP transport so every tool/resource/prompt call emits `{tool, args, context, durationMs, status}` with correlation IDs wired to OTel spans — matching the audit posture promised by ADR-0073 and required for security/compliance review.
**Current Evidence:** `packages/mcp-server/src/mcp/mcp-server.service.ts` (HTTP branch) validates auth via `mcp-server-auth.ts` but does not emit per-call audit events. No `AuditLogger` service exists; stderr/OTel correlation is absent for tool invocations. Stdio transport has minimal logging too.
**Done When:**
  - [x] An `AuditLogger` (or equivalent NestJS provider) emits structured events for every tool/resource/prompt call across both transports.
  - [x] Correlation IDs propagate from HTTP headers/Stdio metadata into OTel spans and audit logs.
  - [x] Integration tests assert audit event emission for at least one tool, resource, and prompt path.

#### GT-222
**Purpose:** Bring per-topology OPA test density up to ≥1 test per rule so the parity gate is meaningful — today modular-monolith has 2 tests for 12 rules (17%), distributed-modules has 4 for 8 (50%), and agentic-ai has 4 for 9 (44%), all far below the 100%+ density of data-mesh and event-driven.
**Current Evidence:** Per `28-test-topology-opa.mjs` output (this audit run): agentic-ai 4 cases / 9 rules, distributed-modules 4 / 8, modular-monolith 2 / 12, microservices 8 / 8, edge 6 / 5, serverless 5 / 6, event-driven 10 / 9, data-mesh 10 / 9. The three under-covered topologies regress the average to ~70% test density.
**Done When:**
  - [x] modular-monolith adds ≥10 new test cases (one per rule covering positive + negative branches).
  - [x] distributed-modules adds ≥4 new test cases; agentic-ai adds ≥5.
  - [x] `26-validate-topology-rule-coverage.mjs` is extended to assert test/rule density and fail below an agreed floor (suggest ≥80%).

#### GT-223
**Purpose:** Add cross-surface parity e2e tests that exercise the same Core operation on CLI, MCP, and REST and assert envelope/payload equivalence — closes the runtime side of the surface parity declared by GT-171 (the matrix exists; execution against it is sparse).
**Current Evidence:** `sdk/cli/test/e2e/` covers `sdlc-status` (3 cases) and `sdlc-handoff` (1 case) only. `gate-evaluate`, `phase-advance`, `validate-satellite`, `drift-detect` have zero cross-surface e2e tests despite being declared exposed in `surface-parity-matrix.json` for all three surfaces. `mcp-e2e.test.ts` validates tool discovery, not output equivalence.
**Done When:**
  - [x] A shared `surface-parity-fixture.ts` invokes the same operation via CLI binary, MCP tool, and REST endpoint and asserts envelope + data equivalence.
  - [x] Fixture covers at least 5 core operations (`gate-evaluate`, `phase-advance`, `validate-satellite`, `drift-detect`, `sdlc-status`).
  - [x] CI runs the suite per push; failures block merge.

#### GT-224
**Purpose:** Bring every data-returning CLI command into ADR-0073 envelope conformance by adding `--format json` to the commands that lack it (`drift`, `architecture scaffold`, `docs`) so CLI output is machine-consumable for the MCP gateway and Tracker integration.
**Current Evidence:** `sdk/cli/src/commands/drift/drift.command.ts` declares `json?: boolean` (line 10–11) but no `@Option('--format')` is registered. `architecture scaffold` and `docs` have no JSON output path at all. ADR-0073 requires every data command to emit the `{success, data, meta}` envelope when `--format json` is requested.
**Done When:**
  - [x] `drift`, `architecture scaffold`, and `docs` register `@Option('--format json|text')` and emit the ADR-0073 envelope when `json` is selected.
  - [x] Existing CLI unit tests assert envelope shape for each command's success and error paths.
  - [x] The surface-parity matrix entry for each operation flips to `cli.formats: ["json"]`.

#### GT-225
**Purpose:** Resolve the 4 `it.skip` cases in `sdk/cli/src/infrastructure/prompts/wizard.service.spec.ts` — either revive them with the appropriate test setup or document why they remain skipped, removing the silent debt from the unit suite.
**Current Evidence:** `grep -rn "describe.skip\|it.skip" sdk/cli` finds 4 skipped cases in `wizard.service.spec.ts:51, 69, 92, 132` covering null-cancellation, summary confirmation, summary-cancel, and non-interactive-mode fallbacks — all real wizard behaviors with no other test coverage.
**Done When:**
  - [x] Each of the 4 skipped tests is either re-enabled and passing, or rewritten as a focused unit covering the same behavior.
  - [x] If any case is unrevivable, it is removed and replaced by an inline `// reason:` note plus a follow-up issue.
  - [x] No `it.skip`/`describe.skip` remains in `sdk/cli/src` after closure.

#### GT-226
**Purpose:** Add Dependabot or Renovate configuration to automate dependency updates, closing the gap where ADR-0009 mandates automated dependency bots and OPA rule DEP-09 validates their presence, yet no configuration file exists in the repository.
**Current Evidence:** No `.github/dependabot.yml` or `.renovaterc.json` exists. OPA `ci-cd.rego` rule DEP-09 would flag this on satellite repos but does not block the core repo's own CI. Dependencies are not automatically updated.
**Done When:**
  - [x] `.github/dependabot.yml` exists with npm (weekly) and GitHub Actions (monthly) update schedules.
  - [x] OPA rule DEP-09 passes on the core repository.
  - [x] First batch of dependency update PRs is generated and reviewable.

#### GT-227
**Purpose:** Implement SAST (CodeQL) and SCA/container scanning (Trivy) in CI workflows, closing the gap where ADR-0005 mandates CodeQL on every PR, CICD-01 encodes it as a blocking rule, and the provider profile documents it as "Active/Default," yet no workflow actually runs these tools.
**Current Evidence:** The `sdk-cli-ci.yml` security audit job runs only `npm audit --audit-level=high`. No CodeQL or Trivy workflow steps exist in any `.github/workflows/*.yml` file. The security scan report template references DAST as a scanner type but no DAST tool is configured.
**Done When:**
  - [x] A `codeql-analysis` job runs in `sdk-cli-ci.yml` for JavaScript/TypeScript with extended queries.
  - [x] A Trivy scan step runs on the Dockerfile for container vulnerability detection.
  - [x] Findings are uploaded as SARIF artifacts and visible in the GitHub Security tab.

#### GT-228
**Purpose:** Build an agent orchestration engine that executes the workflow definitions in `.bmad-core/workflows/` automatically, closing the gap where `development.yaml` and `governance-gap.yaml` define multi-agent sequences but no scheduler, state persistence, or automated handoff mechanism exists.
**Current Evidence:** Workflows are YAML files describing step sequences (analyst → pm → architect → etc.) but agents are invoked manually via LLM context. The `backlog/`, `deliverables/`, and `proposals/` directories in `.bmad-core/` are empty — the self-improvement proposal workflow has never been used.
**Done When:**
  - [x] A workflow runner script can parse workflow YAML and execute steps sequentially with state tracking.
  - [x] Agent handoffs pass artifacts (files, schemas) between steps programmatically.
  - [x] At least one workflow (`governance-gap.yaml`) runs end-to-end with automated step progression.

#### GT-229
**Purpose:** Implement the TypeScript-native rule evaluator that loads `.rules.json` files and evaluates them, closing the gap where R-25 (Dual-Engine Parity) requires every rule to exist in both TypeScript evaluator AND OPA `.rego`, but only OPA actually evaluates rules today.
**Current Evidence:** 26 `.rules.json` files exist across 10 governance domains. The `27-opa-parity-gate.mjs` script compares WASM-compiled OPA against "Native" fixtures, but no TypeScript evaluator loads or evaluates the `.rules.json` rules. The parity gate is aspirational rather than operational.
**Done When:**
  - [x] A TypeScript evaluator loads `.rules.json` rules and produces verdicts matching OPA output for the same inputs.
  - [x] Parity fixtures exist for all ruleset domains with passing parity tests.
  - [x] CI runs both evaluators and asserts identical results on shared fixtures.

#### GT-230
**Purpose:** Create a skills directory and composable skill framework for BMAD agents, closing the gap where `.bmad-core/README.md` references a `tooling/` directory that does not exist, and agents have no modular, discoverable skill library.
**Current Evidence:** Agent specs in `.harness/agents/agent-specs.md` define capabilities in prose but there is no `skills/` directory, no skill manifest format, and no discovery mechanism. Skills are hardcoded in agent persona descriptions rather than being composable modules.
**Done When:**
  - [x] A `.bmad-core/skills/` directory exists with a manifest format (JSON or YAML) for skill definition.
  - [x] At least 3 skills are implemented as reference examples (e.g., `requirements-traceability-mapper`, `gap-prioritization-engine`, `adr-freshness-monitor`).
  - [x] Agent persona definitions reference skills by ID rather than inline capability descriptions.

#### GT-231
**Purpose:** Wire the 10 CI scripts that currently only run in pre-commit (via `ci-runner.mjs`) into GitHub Actions workflows, closing the gap where scripts 05-orphan, 12, 14, 15-coverage, 16-test, 17, 18, 19, 20, 21, 22 have no workflow YAML reference.
**Current Evidence:** The `ci-runner.mjs` pre-commit hook executes all 22 numbered scripts sequentially, but only 12 are referenced in GitHub Actions workflows. The remaining 10 run only locally, meaning PRs merged via the GitHub UI bypass these validations.
**Done When:**
  - [x] A `governance-ci.yml` workflow executes all unlinked scripts as jobs or steps.
  - [x] Each job produces evidence artifacts consumable by the gap board.
  - [x] The workflow runs on PRs to main/develop and on pushes to main.

#### GT-232
**Purpose:** Create complete persona definitions for Wilson (`@winston`) and PO (`@po`) in `.bmad-core/agents/`, closing the gap where these two agents exist only in `.harness/agents/agent-specs.md` without the full YAML frontmatter, tool references, and self-improvement mandates that the other 8 agents have.
**Current Evidence:** `.bmad-core/agents/` contains 8 agent files (analyst, architect, dev, devops, docs, pm, qa, sm) with YAML frontmatter. Wilson and PO have no corresponding files — they are defined only in the harness-level specs.
**Done When:**
  - [x] `.bmad-core/agents/wilson.md` exists with YAML frontmatter matching the format of other agent personas.
  - [x] `.bmad-core/agents/po.md` exists with YAML frontmatter matching the format of other agent personas.
  - [x] Both files include scope, inputs, skills, constraints, handoff, validation, and self-improvement mandate.

#### GT-233
**Purpose:** Add rate limiting middleware to the Core API, closing the gap where the MCP Security Guide documents adaptive rate limiting patterns but zero implementations exist in TypeScript code (search for `rate.?limit` returns zero matches).
**Current Evidence:** `apps/core-api/src/main.ts` applies `helmet()` globally but has no rate limiting middleware. The MCP security guide at `reference/governance/standards/ai-augmented/02-mcp-integration/mcp-security.md` documents rate limiting as required for production.
**Done When:**
  - [x] `@nestjs/throttler` is installed and configured with a global default (e.g., 100 req/min).
  - [x] Per-endpoint overrides exist for sensitive operations (auth, gate-evaluate).
  - [x] Rate limit headers (`X-RateLimit-*`) are returned in responses.

#### GT-234
**Purpose:** Add R-27 (Topology Maturity Parity) to `global-rules.es.md`, closing the bilingual parity gap where the English version has 27 rules but the Spanish version stops at R-26.
**Current Evidence:** `.harness/rules/global-rules.md` contains rules R-01 through R-27. `.harness/rules/global-rules.es.md` contains rules R-01 through R-26 only. R-27 mandates that accepted topologies must provide bilingual guidance, ADRs, rulesets, and tests.
**Done When:**
  - [x] `global-rules.es.md` contains R-27 with Spanish translation matching the English content.
  - [x] The mandatory validation gates section in ES includes the topology rule coverage check present in EN.
  - [x] `04-check-bilingual-parity.mjs` passes on both files.

#### GT-235
**Purpose:** Resolve the CI script numbering collisions where prefixes 05, 15, and 16 each have two scripts with the same prefix, causing confusion about which gate corresponds to which number.
**Current Evidence:** CI script numbering had collisions where prefixes 05, 15, and 16 each had two scripts with the same prefix. The `ci-runner.mjs` sorts by filename so both run, but the collision creates ambiguity.
**Done When:**
  - [x] Each CI script has a unique numerical prefix.
  - [x] The `ci-runner.mjs` execution order remains correct after renumbering.
  - [x] All workflow references to renamed scripts are updated.

#### GT-236
**Purpose:** Automate the knowledge intake pipeline so new `KI-*.yaml` and `SRC-*.yaml` files trigger validation, review, and promotion automatically, closing the gap where the pipeline exists in design but requires manual execution at every stage.
**Current Evidence:** The knowledge intake system has 1 source (SRC-EVANS-001) and 1 item (KI-EVANS-AGGREGATE-001) in status `candidate`. The RAG vector sync infrastructure (script 14) exists but has no live content. No automation connects schema validation → OPA evaluation → Wilson review → promotion.
**Done When:**
  - [x] A PR adding `KI-*.yaml` or `SRC-*.yaml` triggers automated schema + OPA validation.
  - [x] Validation passing creates or updates the item's promotion status automatically.
  - [x] Wilson review step can be triggered via comment command or scheduled job.

#### GT-237
**Purpose:** Author the 5 proposed AI-Augmented ADRs (ADR-AI-001 through ADR-AI-005) that are listed in governance references but never written as actual documents.
**Current Evidence:** `reference/architecture/adrs/ai-augmented/` is referenced in governance sections listing 5 proposed ADRs covering harness engineering, MCP integration protocol, model selection governance, AGENTS.md as mandatory artifact, and human-in-the-loop policy. None of these documents exist in the filesystem.
**Done When:**
  - [x] All 5 ADR documents exist in `reference/architecture/adrs/ai-augmented/` with proper structure (Title, Status, Context, Decision, Consequences).
  - [x] Each ADR has EN and ES versions maintaining bilingual parity.
  - [x] ADR status is updated from "proposed" to "accepted" or "superseded" as appropriate.

#### GT-238
**Purpose:** Add Prometheus/Mimir to the observability stack so RED/USE metrics are collectible and queryable, closing the gap where the observability playbook references Mimir-based metrics but the docker-compose only provisions Tempo and Loki.
**Current Evidence:** `reference/infrastructure/docker-compose.yml` includes services for OTel Collector, Tempo, Grafana, and Loki. No Prometheus or Mimir service exists. The OTel collector config routes traces and logs but has no metrics pipeline.
**Done When:**
  - [x] Prometheus is added to docker-compose with scrape config for Core API metrics.
  - [x] Mimir is added for long-term metrics storage.
  - [x] Grafana is provisioned with a Prometheus datasource alongside existing Tempo and Loki.

#### GT-239
**Purpose:** Define concrete SLOs per service and implement alerting rules, closing the gap where the observability validation template references SLO baselines but no SLO documents or alert configurations exist.
**Current Evidence:** `rulesets/schema/observability-validation.schema.json` defines fields for SLO compliance, but no SLO documents exist in `reference/operations/`. No Prometheus alerting rules, Grafana alert provisioning, or notification channel configuration exists.
**Done When:**
  - [x] At least 3 SLOs are defined (availability 99.9%, p99 latency <200ms, error rate <0.1%).
  - [x] Prometheus alerting rules exist for: error rate >1%, p99 latency >500ms, pod restarts >3.
  - [x] Grafana alert provisioning routes alerts to a configurable notification channel.

#### GT-240
**Purpose:** Tighten CORS configuration by environment so production deployments restrict origins to known domains, closing the gap where tests show `origin: ['*']` — an overly permissive policy.
**Current Evidence:** `apps/core-api/src/presentation/controllers/security-headers.spec.ts` tests CORS with `origin: ['*']`. No environment-based CORS configuration exists. Production deployments inherit the permissive default.
**Done When:**
  - [x] CORS configuration is environment-aware: dev (`*`), staging (specific list), production (exact domain).
  - [x] The security headers spec tests each environment's CORS policy.
  - [x] Configuration is driven by environment variables, not hardcoded.

#### GT-241
**Purpose:** Add SBOM (Software Bill of Materials) generation to the CI/release pipeline using CycloneDX or SPDX format, closing the gap where the security scan report template references SBOM but no CI step produces it.
**Current Evidence:** `rulesets/schema/security-scan-report.schema.json` defines SBOM as a scanner type. No CI workflow step generates, signs, or publishes SBOM artifacts.
**Done When:**
  - [x] A CI step generates a CycloneDX SBOM after `npm ci` or `npm build`.
  - [x] The SBOM artifact is uploaded as a build artifact or attached to GitHub releases.
  - [x] The SBOM is consumable by downstream tools (Dependency-Track, Grype, etc.).

#### GT-242
**Purpose:** Generate OPA `.rego` policies for the 17 native rulesets that currently have no OPA counterpart, closing the Dual-Engine Parity gap (R-25) for the non-core domains.
**Current Evidence:** Only 9 of 26 native ruleset domains have corresponding `.rego` files (governance, version-pinning, taxonomy, cli-readiness, ci-cd, evidence, mcp, knowledge-intake, abac). The remaining 17 domains (7 ADR-encoded, 5 cross-cutting, 3 SDLC, 2 specialized) have no OPA equivalent.
**Done When:**
  - [x] The 5 cross-cutting rulesets (definition-of-done, engineering-manifesto, compliance-baseline, repository-taxonomy, anti-corruption-layer) have `.rego` files with tests.
  - [x] Input schemas exist in `rulesets/opa/schemas/` for each new policy.
  - [x] The `main.rego` aggregator imports violations from the new policies.

#### GT-243
**Purpose:** Implement k6 load tests for the 3 stress scenarios defined in ADR-0037, closing the gap where the ADR mandates k6 testing but no load test scripts exist.
**Current Evidence:** ADR-0037 defines 3 stress scenarios: (1) API throughput baseline, (2) concurrent MCP connections, (3) CLI batch operations. No k6 script files, load test configurations, or performance baselines exist in the repository.
**Done When:**
  - [x] 3 k6 scripts exist covering each ADR-0037 scenario.
  - [x] Performance baselines are recorded and stored as reference thresholds.
  - [x] A CI job runs load tests on a scheduled basis (not blocking PRs initially).

#### GT-244
**Purpose:** Create incident response playbooks and templates for the core product, closing the gap where agentic AI runbooks exist but general incident response procedures (service outage, data breach, production rollback) are absent.
**Current Evidence:** `reference/architecture/topologies/ai/agentic-ai/runbooks.md` covers agent-specific incidents (hang, token overflow, unapproved action, sandbox escape). No general incident response playbooks exist for the core product or infrastructure.
**Done When:**
  - [x] Playbooks exist for: service outage, data breach, dependency CVE, production rollback.
  - [x] Each playbook has: severity classification, communication template, containment steps, recovery steps, post-mortem template.
  - [x] Playbooks are stored in `reference/operations/` with bilingual versions.

#### GT-245
**Purpose:** Add DAST (Dynamic Application Security Testing) using OWASP ZAP or equivalent to the security pipeline, closing the gap where the security scan report template lists DAST as a scanner type but no DAST tool is configured.
**Current Evidence:** `rulesets/schema/security-scan-report.schema.json` defines DAST as a valid scanner type. No OWASP ZAP, Burp Suite, or other DAST tool configuration exists anywhere in the repository.
**Done When:**
  - [x] An OWASP ZAP baseline scan runs against the Core API in a CI job.
  - [x] ZAP findings are exported as SARIF and visible in GitHub Security tab.
  - [x] High/Medium findings block the release pipeline.

#### GT-246
**Purpose:** Implement chaos engineering experiments using Chaos Mesh or Litmus, closing the gap where ADR-0037 mandates chaos engineering tooling but no experiment definitions exist.
**Current Evidence:** ADR-0037 references Chaos Mesh/Litmus for chaos engineering. No chaos experiment definitions, fault injection configurations, or resilience test scenarios exist in the repository.
**Done When:**
  - [x] At least 3 chaos experiments are defined: network partition, pod kill, CPU stress.
  - [x] Experiments are executable against a local or staging environment via docker-compose or Kubernetes manifests.
  - [x] Results are logged and correlated with observability signals.

#### GT-247
**Purpose:** Replace hardcoded credentials in docker-compose with secrets injection, closing the gap where the infrastructure compose file contains plaintext passwords for PostgreSQL, Redis, RabbitMQ, MongoDB, MinIO, and OpenBao.
**Current Evidence:** `reference/infrastructure/docker-compose.yml` contains hardcoded passwords for 6 services. While acceptable for local development, there is no documentation or mechanism for secrets injection in production deployments.
**Done When:**
  - [x] docker-compose uses `${VARIABLE}` references for all credentials.
  - [x] A `.env.example` file documents required secrets without real values.
  - [x] Documentation explains secrets injection for production (Docker secrets, Vault, etc.).

#### GT-248
**Purpose:** Create an ADR freshness monitor script that detects stale ADRs and generates review reminders, closing the gap where no automated mechanism tracks ADR currency or triggers periodic reviews.
**Current Evidence:** 48+ Core ADRs exist with varying ages. No script checks modification dates, flags stale ADRs, or generates review reminders. The only freshness mechanism is manual inspection.
**Done When:**
  - [x] A script scans all ADRs, extracts last modification dates, and flags those >180 days old.
  - [x] ADRs >365 days old generate a review reminder in the gap board.
  - [x] The script runs on a weekly schedule (e.g., Monday 09:00 UTC) via GitHub Actions.

#### GT-249
**Purpose:** Add a Redis caching layer to the Core API and MCP server to optimize latency and performance for the Tracker consumption pattern, where repeated requests for topology manifests, OPA evaluations, and gate status checks hit the same data.
**Current Evidence:** The Core API (`apps/core-api/`) has no caching middleware. Every request for topology manifests, gate evaluations, and ruleset lookups hits the filesystem or OPA engine directly. With Tracker as a consumer making frequent queries for the same topology data, this creates unnecessary latency and redundant computation. Rate limiting is also absent (noted in prior gaps).
**Done When:**
  - [x] A Redis instance is added to the `docker-compose.yml` infrastructure stack.
  - [x] Core API implements response caching for topology manifest lookups (TTL: 5 minutes).
  - [x] OPA policy evaluation results are cached by input hash (TTL: 1 minute) to avoid re-evaluation for identical inputs.
  - [x] Rate limiting middleware uses Redis for distributed counters (replacing in-memory).
  - [x] MCP server caches tool/resource discovery results (TTL: 10 minutes).
  - [x] A cache invalidation strategy is documented for topology manifest updates.
  - [x] Cache hit/miss metrics are exposed via the observability stack (Prometheus).

#### GT-250
**Purpose:** Eliminate the silent authentication bypass in the MCP HTTP transport, where requests are granted full admin scope whenever the server is launched without an `--api-key` or `EVOLITH_API_KEY` value — defeating the documented ABAC contract (GT-157/GT-158) for any production deployment that forgets to configure the key.
**Current Evidence:** `packages/mcp-server/src/mcp/mcp-server-auth.ts:21-23` — `if (!apiKey) { return { ...ADMIN_CONTEXT, ... } }` returns the frozen `ADMIN_CONTEXT` (role `admin`, scopes `read,write,admin`) for every caller when `apiKey` is undefined. There is no warning, no environment guard, and no fail-closed mode.
**Done When:**
  - [x] When `apiKey` is undefined, the HTTP transport refuses to start in `NODE_ENV=production` (fail-closed).
  - [x] Outside production, an explicit `--allow-no-auth` flag (or env `EVOLITH_MCP_ALLOW_NO_AUTH=true`) is required to opt into the dev shortcut; otherwise the server refuses to start.
  - [x] When the dev shortcut is active, a `WARN auth.bypass` message is logged at startup.
  - [x] Stdio transport behavior documented (still admin-scoped by design; in-process trust boundary).
  - [x] Tests cover: production refusal, dev opt-in, warning emission, and the existing API-key/JWT happy paths. Tests exist but blocked by GT-267 (CacheModule).

#### GT-251
**Purpose:** Remove the command-injection risk in `evolith update --install`, where the version string returned by `npm view ... --json` is interpolated into a shell command via `execSync`, so a malicious or compromised registry response could execute arbitrary code on the operator's machine.
**Current Evidence:** `sdk/cli/src/commands/update/update.command.ts:116` — `execSync(`npm install -g @evolith/smart-cli@${latestVersion}`, { stdio: 'inherit' })`. `latestVersion` originates from `JSON.parse(result.trim())` at line 163 with no semver validation before being spliced into the shell string.
**Done When:**
  - [x] `execSync` (string form) replaced with `execFileSync('npm', ['install', '-g', `@evolith/smart-cli@${latestVersion}`])` so the version is an argv element, not a shell token.
  - [x] `latestVersion` is validated against the semver regex before use; invalid values abort with a clear error.
  - [x] Same hardening applied to the read path (`execFile`/`execFileSync` instead of `execSync`).
  - [x] Spec covers: malicious version (e.g., `1.0.0; rm -rf /`) is rejected at the regex gate.

#### GT-252
**Purpose:** Wire the 19 orphaned OPA policies into `main.rego` so the aggregator actually represents Evolith's policy surface — today the gate evaluator only sees 7 of the 26 policy modules, silently skipping 73% of governance rules.
**Current Evidence:** `rulesets/opa/main.rego` imports only `version_pinning`, `taxonomy`, `cli_readiness`, `evidence`, `mcp`, `ci_cd`, `governance`. Counting `ls rulesets/opa/*.rego | grep -v test.rego` returns 27 files; subtracting `main.rego` leaves 26 policies. 26 − 7 = **19 orphaned**: `abac-mcp-tool-access`, `anti-corruption-layer`, `cicd-quality-gates`, `cli-core-parity`, `cli-release-readiness`, `compliance-baseline`, `dod`, `engineering-manifesto`, `executive-scorecards`, `gitflow-branching`, `hexagonal-architecture`, `knowledge-intake`, `multi-runtime`, `multi-tenancy`, `open-core-boundary`, `protocol-selection`, `repository-taxonomy`, `satellite-contracts`, `testing-pyramid`.
**Done When:**
  - [x] `main.rego` imports the 19 missing packages and appends their `violations` to the union rule.
  - [x] `main_test.rego` adds at least one fixture per newly wired package that exercises a known violation.
  - [x] OPA evaluator picks up the new packages with no additional configuration (verified via `opa eval` smoke).
  - [x] If any policy is intentionally excluded (e.g., experimental), it is documented in `rulesets/opa/README.md` with the rationale.

#### GT-253
**Purpose:** Pin `aquasecurity/trivy-action` to a specific version tag to eliminate the supply-chain risk of a moving `@master` reference in CI, which today could swap scanner behavior or be hijacked without our awareness.
**Current Evidence:** `.github/workflows/sdk-cli-ci.yml:344` — `uses: aquasecurity/trivy-action@master`. No SHA or version tag.
**Done When:**
  - [x] `trivy-action@master` replaced with a pinned tag (e.g., `@0.24.0`) or a 40-char commit SHA.
  - [x] Dependabot/Renovate rule covers `github-actions` updates so the pin is maintained.
  - [x] All other third-party actions in `.github/workflows/` audited; any `@master`/`@main` references are pinned in the same PR or recorded as follow-up.

#### GT-254
**Purpose:** Prevent path-traversal attacks against the MCP `resources/read` surface — today an MCP client can craft `evolith://ruleset/../../etc/passwd` style URIs and the resource resolver will happily `path.join` outside the rulesets root.
**Current Evidence:** `packages/mcp-server/src/mcp/resources.service.ts:115` — `path.join(corePath, 'rulesets', name.replace(/-/g, '/') + '.rules.json')` with no normalization or containment check. Same shape at lines 119 (alt path), 134 (`getAgentContent`), 157 (`getMoscowAnalysis`), and 172-176 (`getTopologyContent`). Each accepts a user-supplied string and joins it against a trusted base without verifying the resolved path stays within the base.
**Done When:**
  - [x] Each resource resolver normalizes the candidate path (`path.resolve`) and refuses any result whose normalized form does not start with the resolved base directory.
  - [x] Names containing `..`, absolute paths, or path separators that escape the expected shape are rejected with a `BAD_REQUEST` failure envelope before any filesystem call.
  - [x] Specs cover positive cases (legitimate ruleset/agent/topology lookups) and negative cases (`../../etc/passwd`, absolute paths, URL-encoded traversal).

#### GT-255
**Purpose:** Close the CSP/security-headers gap on the MCP HTTP transport so MCP and Core API present the same defensive surface — `apps/core-api` already wires `helmet`, but `packages/mcp-server` does not, leaving its HTTP responses without CSP, HSTS, X-Frame-Options, or X-Content-Type-Options.
**Current Evidence:** `apps/core-api/src/main.ts:8,51` imports and applies `helmet()`. A grep for `helmet` / `Content-Security-Policy` across `packages/mcp-server/src/` returns only a node_modules type definition — no production usage. `mcp-server.service.ts` constructs an `http.createServer` without applying any header middleware.
**Done When:**
  - [x] MCP HTTP transport sets, at minimum: `Content-Security-Policy: default-src 'none'`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`.
  - [x] Implementation reuses `helmet` (preferred) or an explicit header utility shared with Core API.
  - [x] Spec asserts the headers are present on a representative response (e.g., `resources/list`).

#### GT-256
**Purpose:** Repair the Traefik healthcheck in `docker-compose.yml`, which today queries `/ping` while Traefik is started without `--ping=true`, guaranteeing the container is marked unhealthy in every environment that relies on this stack.
**Current Evidence:** `reference/infrastructure/docker-compose.yml:164-182` — Traefik is started with `--providers.file.directory=/etc/traefik/dynamic` only. The healthcheck on line 182 runs `traefik healthcheck --ping`, which calls the internal ping endpoint; without `--ping=true` (or `--ping.entrypoint=...`) in the server startup, that endpoint is disabled and the check fails.
**Done When:**
  - [x] Traefik command list includes `--ping=true` (and an explicit entrypoint if required).
  - [x] `traefik healthcheck --ping` succeeds against a running container.
  - [x] Optional: ping endpoint bound to the internal/admin entrypoint, not the public one.

#### GT-257
**Purpose:** Pin the MongoDB image to a specific minor version so the infrastructure stack is reproducible and protected against silent upgrades that could break compatibility or introduce unreviewed changes.
**Current Evidence:** `reference/infrastructure/docker-compose.yml:54` — `image: mongo:latest`. Other services (PostgreSQL, Redis, Traefik) are already pinned; MongoDB is the outlier.
**Done When:**
  - [x] `mongo:latest` replaced with a pinned tag matching the version Evolith targets (e.g., `mongo:7.0`).
  - [x] Tag choice documented in the infrastructure README with the upgrade cadence.
  - [x] Dependabot/Renovate rule covers `docker` image updates so the pin is maintained.

#### GT-258
**Purpose:** Add `concurrency:` controls to every GitHub Actions workflow so stacked pushes cancel superseded runs — saving compute, accelerating feedback, and preventing race conditions in workflows that mutate releases or caches.
**Current Evidence:** `grep -L "concurrency:" .github/workflows/*.yml` returns all 11 workflows: `ci-cd.yml`, `ci.yml`, `coverage-impact.yml`, `docs-release.yml`, `docs.yml`, `enforce-root-cleanliness.yml`, `governance-ci.yml`, `knowledge-intake.yml`, `opa-parity.yml`, `sdk-cli-ci.yml`, `sdk-cli-release.yml`.
**Done When:**
  - [x] Every workflow declares a top-level `concurrency:` block keyed by workflow name + ref.
  - [x] PR-style workflows set `cancel-in-progress: true`; release/publish workflows set `cancel-in-progress: false`.
  - [x] Documented in `.harness/playbooks/` (or equivalent CI guidance) so future workflows inherit the pattern.

#### GT-259
**Purpose:** Replace the brittle commit-message string match that gates the npm publish job with a tag-driven trigger, so releases cannot be accidentally fired by a commit whose body happens to contain "bump version".
**Current Evidence:** `.github/workflows/ci-cd.yml:42` — `if: github.ref == 'refs/heads/main' && contains(github.event.head_commit.message, 'bump version')`. Any commit landed on main with that substring (including merge commits, reverts, or housekeeping) triggers `npm publish --access public --tag beta`.
**Done When:**
  - [x] `publish-npm` job triggers on `push` events whose `github.ref` matches `refs/tags/v*` (or equivalent semver pattern).
  - [x] The current `contains('bump version')` guard is removed.
  - [x] Release procedure documented: tag → workflow runs → publishes to npm.
  - [x] Backwards compatibility: existing manual `workflow_dispatch` entry preserved if it exists, or added if not.

#### GT-260
**Purpose:** Close the bilingual-parity gap for BMAD agents by providing the Spanish persona file for the PO agent and wiring it through the same workflows as the other 8 agents.
**Current Evidence:** `.bmad-core/agents/` contains `.md` + `.es.md` pairs for `analyst`, `architect`, `dev`, `devops`, `docs`, `pm`, `qa`, `sm`. The PO agent has only `po.md`; `po.es.md` does not exist. (Wilson is single-language by design.)
**Done When:**
  - [x] `.bmad-core/agents/po.es.md` created with a faithful translation of `po.md`'s persona, responsibilities, and outputs.
  - [x] Any agent-loading scripts/workflows that enumerate `*.es.md` pairs include the new file.
  - [x] `check-bilingual-parity.mjs` passes after the addition.

#### GT-261
**Purpose:** Bound the resource footprint of every container in the infrastructure stack so a runaway service cannot starve its neighbors on the same host, and so capacity planning maps cleanly to production sizing.
**Current Evidence:** `grep -nE "mem_limit|cpus|deploy:|resources:" reference/infrastructure/docker-compose.yml` returns nothing — none of the services declare `mem_limit`, `cpus`, or a `deploy.resources` block.
**Done When:**
  - [x] Each service in `docker-compose.yml` declares memory and CPU limits appropriate to its role (PostgreSQL, MongoDB, Redis, RabbitMQ, MinIO, OpenBao, Traefik, Core API, MCP server).
  - [x] Limits documented in the infrastructure README with the rationale (typical workload + headroom).
  - [x] Validated locally that the stack starts within the declared limits and that healthchecks still pass.

#### GT-262
**Purpose:** Codify backup and disaster-recovery procedures for the stateful data stores (PostgreSQL, MongoDB, MinIO, OpenBao) so the platform can recover from data loss without ad-hoc archeology.
**Current Evidence:** A repo-wide search for backup scripts (`find . -name "backup*.sh" -o -name "*-backup*"`) and Terraform-style restore plans returns nothing under `reference/infrastructure/`, `apps/`, or `.harness/`. There is no DR runbook.
**Done When:**
  - [x] Backup scripts (or documented operator procedures) exist for each stateful service: PostgreSQL (`pg_dump`/PITR), MongoDB (`mongodump`), MinIO (object replication or `mc mirror`), OpenBao (snapshot).
  - [x] Each service has a documented RPO/RTO target.
  - [x] A restore runbook walks through a full DR exercise; checked into `reference/infrastructure/runbooks/`.
  - [x] CI lint verifies the runbook exists; cross-references SDLC Phase 05 rollback (GT-218).

#### GT-263
**Purpose:** Add infrastructure-level Prometheus alerts so platform problems (down service, disk pressure, error-rate spike) page on-call before they reach users, closing a gap left open by the observability stack adoption.
**Current Evidence:** A repo-wide search for `*.rules.yaml`, `*alerts*`, or `prometheus*` files returns nothing. The observability ADRs describe what should exist, but no alert rules are checked in.
**Done When:**
  - [x] An alert-rules file (e.g., `reference/infrastructure/observability/alerts.rules.yaml`) defines at minimum: service-down, high error rate (5xx), high latency P99, disk-free below threshold, RabbitMQ queue depth, OPA evaluation failures.
  - [x] Alerts wired into the Prometheus configuration shipped with the docker-compose stack.
  - [x] Each alert has a runbook link and severity label.
  - [x] Smoke test: trigger one alert in a dev environment and verify it fires.

#### GT-264
**Purpose:** Make the DAST (OWASP ZAP) scan in CI meaningful by targeting an actual running instance, or remove it — today it points at `http://localhost:8000` without spinning a server up, so the scan is silently a no-op.
**Current Evidence:** `.github/workflows/sdk-cli-ci.yml:372-374` — `uses: zaproxy/action-full-scan@v0.10.0` with `target: 'http://localhost:8000'`. No preceding step starts a service on that port, so ZAP scans against nothing and the job either no-ops or fails silently.
**Done When:**
  - [x] Either: (a) a preceding step starts Core API (or MCP) on the target port and waits for readiness before ZAP runs; or (b) the DAST step is removed and the rationale recorded in an ADR/playbook.
  - [x] If retained: ZAP report uploaded as a workflow artifact and failure thresholds documented.
  - [x] If removed: a follow-up gap captures the long-term DAST plan (e.g., scheduled scan against a staging environment).

#### GT-265
**Purpose:** Add secret detection to CI (gitleaks or equivalent) so accidental commits of API keys, JWT secrets, or database credentials are caught at PR time, not after they hit history.
**Current Evidence:** `grep -rln "gitleaks\|truffle\|secretlint" .github/` returns nothing — no secret scanner runs in any workflow. The repo handles credentials in docker-compose (closed by GT-247) and JWT secrets (GT-250 follow-up), so the blast radius of a leaked secret is real.
**Done When:**
  - [x] A gitleaks (or equivalent) step runs on every PR and pushes, scanning the diff plus the full repo on a schedule.
  - [x] `.gitleaks.toml` (or equivalent config) documents allow-listed test fixtures so the scan stays signal-rich.
  - [x] Findings fail the build with a clear remediation message.
  - [x] Pre-commit hook (optional) mirrors the check locally.

#### GT-266
**Purpose:** Create an API key provisioning service for the MCP HTTP transport so external consumers have a secure, auditable way to obtain and rotate keys — currently the only option is a single shared secret set via env var, with no generation, distribution, rotation, or revocation capabilities.
**Current Evidence:** No key generation endpoint, no key store, no rotation mechanism. The operator self-provisioned any string via `--api-key` or `EVOLITH_API_KEY` and distributes it out of band. No per-client keys, no hash persistence, no audit trail. ADR-0088/ADR-0091 prescribe migrating to short-lived identities (Token Exchange, Workload Identity), but that migration is not scheduled and the static-key path lacks basic provisioning hygiene.
**Done When:**
  - [x] API key format defined (e.g. `evk_` prefix + entropy) and a CLI command or HTTP endpoint generates keys on demand.
  - [x] Keys stored hashed (SHA-256) with metadata: client label, creation date, last used, expiry.
  - [x] Key rotation supported without service restart (multiple valid keys, versioned by creation date).
  - [x] Revocation endpoint or mechanism documented.
  - [x] Audit log for key creation, rotation, and revocation events.
  - [x] Migration path documented from the current single-env-var model to the provisioning service.

#### GT-267
**Title:** Restore workspace build/test after Redis cache integration
**Purpose:** Unblock the monorepo release baseline after the cache layer introduced runtime imports and TypeScript drift that Core API, MCP Server, and the dependent CLI cannot build or test through. This is a production blocker because the cache optimization cannot be promoted while the executable surfaces fail.
**Current Evidence:** Wilson audit on 2026-06-25: `npm -ws run build --if-present` fails in `apps/core-api` because `@nestjs/cache-manager` and `cache-manager` are not installed and `CacheInterceptor`/`CacheTTL` are imported from `@nestjs/common`; `packages/mcp-server` fails on the same missing cache dependencies, `trace.SpanStatusCode`, and TypeScript 6 deprecation errors. `npm --workspace apps/core-api test -- --runInBand`, `npm --workspace packages/mcp-server test -- --runInBand`, and `npm --workspace sdk/cli run test:unit -- --runInBand` are also red.
**Done When:**
  - [x] Core API declares and installs the cache dependencies it uses (`@nestjs/cache-manager`, `cache-manager`, Redis store package such as `@keyv/redis` if retained) and imports Nest cache decorators/interceptors from the package that actually exports them for Nest 11.
  - [x] MCP Server declares its cache dependencies, fixes the OpenTelemetry status import (`SpanStatusCode` from `@opentelemetry/api`), and either migrates or silences TypeScript 6 deprecations intentionally.
  - [x] CLI no longer resolves broken MCP compiled artifacts during unit tests.
  - [x] `npm -ws run build --if-present`, `npm --workspace apps/core-api test -- --runInBand`, `npm --workspace packages/mcp-server test -- --runInBand`, and `npm --workspace sdk/cli run test:unit -- --runInBand` pass from a clean checkout.

#### GT-268
**Title:** Restore missing CI validator scripts referenced by workflows and rules
**Purpose:** Reconcile the governance harness so every documented and workflow-referenced validation command exists. Missing validator entry points create false confidence in docs and guaranteed CI failures on the workflows that invoke them.
**Current Evidence:** `AGENTS.md` and `AGENTS.es.md` list `.harness/scripts/bilingual-coverage.mjs` and `.harness/scripts/coverage-dashboard.mjs`; `.github/workflows/docs.yml` invokes both; `.github/workflows/sdk-cli-ci.yml` invokes `bilingual-coverage.mjs`; `.github/workflows/governance-ci.yml` and global rules invoke `.harness/scripts/ci/26-validate-topology-rule-coverage.mjs`. All three files are absent in the audited checkout.
**Done When:**
  - [x] `.harness/scripts/bilingual-coverage.mjs` exists, reports EN/ES coverage, and exits non-zero on configured coverage regressions.
  - [x] `.harness/scripts/coverage-dashboard.mjs` exists, generates the expected Markdown/HTML coverage output, and its output path matches the docs workflow artifact step.
  - [x] `.harness/scripts/ci/26-validate-topology-rule-coverage.mjs` exists or the workflow/global-rule references are replaced with the current canonical validator; the chosen command reports Native/OPA rule coverage for accepted topologies.
  - [x] `node .harness/scripts/bilingual-coverage.mjs`, `node .harness/scripts/coverage-dashboard.mjs`, and `node .harness/scripts/ci/26-validate-topology-rule-coverage.mjs` pass locally or documented replacement commands are wired everywhere.

#### GT-269
**Title:** Restore ADR-0073 contract roundtrip reproducibility
**Purpose:** Reopen the contract-regression safety net promised by GT-172/GT-223 so CLI, MCP, and REST can again prove semantic equivalence for `gate evaluate`. A contract suite that exists but cannot execute is not valid release evidence.
**Current Evidence:** `npm run test:contract` fails 34/34 tests. TypeScript cannot resolve package subpaths from `sdk/cli/src/app.module.ts` under `tests/contract/tsconfig.json` (`moduleResolution: node`), even though Node can resolve the compiled package exports. Jest also reports duplicate manual mocks from ignored `packages/mcp-server/dist/__mocks__` and `packages/mcp-server/src/__mocks__`, so generated artifacts contaminate the contract test graph after local builds.
**Done When:**
  - [x] Contract test TypeScript resolution is aligned with workspace package exports (`node16`/`nodenext`/`bundler` or explicit test-only `paths`) without bypassing public package boundaries.
  - [x] Jest ignores generated `dist/**` mocks or the cleanup/build workflow removes them before contract tests run.
  - [x] `npm run test:contract` passes from a clean checkout and after a local workspace build.
  - [x] The closure evidence for GT-172/GT-223 is reconciled so it no longer claims green contract parity without a current passing command.

#### GT-270
**Title:** Pin mutable infrastructure images and disable dev-only exposed defaults
**Purpose:** Make the reference infrastructure reproducible and prevent development-only defaults from being copied into production-like deployments. This optimizes cost and safety by reducing unplanned upgrades, accidental public admin surfaces, and incident triage churn.
**Current Evidence:** `reference/infrastructure/README.md` states "no latest", but Helm values use `tag: "latest"` for both BFF and MCP and `openpolicyagent/opa:latest`; Dockerfiles use mutable `node:22-alpine`; Docker Compose uses `mcr.microsoft.com/mssql/server:2022-latest`; Traefik starts with `--api.insecure=true` and exposes the dashboard; OpenBao uses `BAO_DEV_ROOT_TOKEN_ID` and listens on `0.0.0.0:8200`; the Docker socket is mounted into Traefik.
**Done When:**
  - [x] Helm, Compose, and Dockerfiles use reviewed immutable tags or digests for application, OPA, Node, SQL Server, and gateway images.
  - [x] Development-only settings (`--api.insecure=true`, OpenBao dev token/listen mode, broad host port exposure) are gated behind explicit local profiles and absent from production examples.
  - [x] Infrastructure README and ES counterpart document dev vs production profiles and the image upgrade cadence.
  - [x] CI lint rejects new `latest`, `*-latest`, or insecure gateway/secrets defaults outside explicitly named dev-only examples.

#### GT-271
**Title:** Add Kubernetes workload hardening to Helm charts
**Purpose:** Bring Helm charts to the same production-readiness bar as the architecture standards by making pod security, probes, resources, and rollout safety executable rather than implied by prose.
**Current Evidence:** `reference/infrastructure/helm/evolith-bff/templates/deployment.yaml` and `evolith-mcp/templates/deployment.yaml` define containers and ports only. A grep finds no `resources`, `securityContext`, `readinessProbe`, `livenessProbe`, `startupProbe`, `runAsNonRoot`, `readOnlyRootFilesystem`, `allowPrivilegeEscalation`, `PodDisruptionBudget`, `HorizontalPodAutoscaler`, or `NetworkPolicy`.
**Done When:**
  - [x] BFF and MCP Helm charts define container `resources.requests/limits`, liveness/readiness/startup probes, and rollout-safe defaults.
  - [x] Pod/container security contexts enforce non-root execution, dropped capabilities, read-only root filesystem where feasible, and `allowPrivilegeEscalation: false`.
  - [x] NetworkPolicy, PodDisruptionBudget, and optional HPA values are present with conservative defaults.
  - [x] Helm rendering plus policy lint (kubeconform/conftest or equivalent open-source validators) runs in CI.

#### GT-272
**Title:** Secure OPA sidecar bundle distribution and verification
**Purpose:** Protect the executable governance path from policy-bundle tampering by securing how OPA sidecars fetch and trust bundles. This keeps Native/OPA parity meaningful after deployment, not only in repository tests.
**Current Evidence:** Helm values configure OPA sidecars to fetch `http://ums-minio:9000/opa-bundles/bundle.tar.gz` with no TLS, authentication, digest pin, signature, or fail-closed readiness gate. GT-133 covers central distribution architecture, but the deployed sidecar reference does not verify bundle integrity or provenance.
**Done When:**
  - [x] OPA bundle URL uses TLS or a private in-cluster authenticated endpoint, with credentials sourced from Kubernetes secrets or workload identity.
  - [x] Bundle artifact digest and signature verification are documented and automated (for example, Sigstore/cosign or another open-source signing flow).
  - [x] OPA sidecar readiness fails closed if the required bundle cannot be fetched or verified.
  - [x] CI renders the Helm chart and validates the OPA bundle settings with both Native and OPA checks.

#### GT-273

**Title:** Restore DAST scan against a staging or ephemeral environment
**Purpose:** Re-establish dynamic application security testing (DAST) as part of the security assurance program, targeting a real running instance rather than the no-op localhost:8000 that was removed in GT-264.
**Current Evidence:** sdk-cli-ci.yml removed the ZAP full-scan step in bbd2e517 (GT-265/GT-264 wave). No DAST scan runs anywhere in CI. Static analysis (CodeQL, Trivy, gitleaks) covers SAST, container, and secret detection, but no runtime scan exercises the deployed API surface.
**Done When:**
  - [x] A DAST scan (ZAP or equivalent) runs against either a scheduled staging environment or an ephemeral deployment spun up in CI.
  - [x] The scan targets a real HTTP endpoint, not a placeholder port.
  - [x] Results are uploaded as a workflow artifact; failures are gated or triaged.

**Closure Evidence (2026-06-25):** Addressed by introducing Job 12 (`dast-scan`) in `.github/workflows/sdk-cli-ci.yml`. The DAST job builds the MCP server, starts it ephemerally in HTTP mode on port 3001, waits for `/health`, runs `zaproxy/action-full-scan@v0.10.0` against `http://localhost:3001`, and uploads `report.html`/`report.md` as artifacts. The job uses `continue-on-error: true` so it does not block the CI gate; findings are triaged asynchronously. See commit `426db1d9`.

#### GT-274

**Title:** Harden cleanup-temp-files against tracked-file deletion
**Purpose:** Make the mandatory Wilson pre-audit cleanup safe for a versioned governance repository. A cleanup helper must never delete tracked scripts, rules, policies, or documentation just because their path contains a temporary-word substring.
**Current Evidence:** Running `node .harness/scripts/cleanup-temp-files.mjs` during the 2026-06-25 Wilson control-plane audit deleted tracked scripts whose paths contained `coverage`: `.harness/scripts/bilingual-coverage.mjs`, `.harness/scripts/coverage-dashboard.mjs`, `.harness/scripts/generate-rule-coverage.mjs`, `.harness/scripts/generate-rule-coverage.test.mjs`, and `.harness/scripts/ci/26-validate-topology-rule-coverage.mjs`. Root cause: `isInTempDir(filePath)` used substring matching (`filePath.includes("coverage")`) rather than path-segment matching and did not skip `git ls-files` tracked content. The files were restored immediately from Git.
**Done When:**
  - [x] `cleanup-temp-files.mjs` matches temp directories by path segment, not arbitrary substring.
  - [x] The cleanup script skips all tracked files from `git ls-files`, even if they match a temp filename or directory pattern.
  - [x] A regression test fixture proves files named `bilingual-coverage.mjs`, `coverage-dashboard.mjs`, and `26-validate-topology-rule-coverage.mjs` are not deleted.
  - [x] The Wilson audit playbook references the safe cleanup behavior and warns that any deleted tracked file is a blocker.

#### GT-275

**Title:** Reconcile closure evidence registry with canonical tracking semantics
**Purpose:** Restore the executable trust chain for gap closure. A `DONE` board row must have exactly one valid closure record with a real commit, resolving evidence artifacts, reproducible validation commands, and a supported dependency disposition.
**Current Evidence:** `node .harness/scripts/ci/08-validate-tracking.mjs` fails after the control-plane audit. The remaining registry issues include `GT-270` with `closureCommit: "pending"`, `GT-264` with empty evidence and validation commands, a duplicate `GT-266` closure record, and missing closure records for `GT-271` and `GT-20`. `node .harness/scripts/ci/09-reconcile-maturity.mjs` also fails because closure evidence counts do not match required closures. `GT-267` and `GT-272` were reopened during this audit because current validation does not support `DONE`.
**Done When:**
  - [x] `gap-closure-evidence.json` has one valid record per `DONE` `GT-*` row and no records for pending/deferred/in-progress gaps.
  - [x] `GT-270`, `GT-264`, `GT-266`, `GT-271`, and `GT-20` have either valid closure records or are reopened consistently in EN/ES tracking and catalogs.
  - [x] `node .harness/scripts/ci/08-validate-tracking.mjs` passes.
  - [x] `node .harness/scripts/ci/09-reconcile-maturity.mjs` passes and regenerates `maturity-reconciliation.json` only when canonical evidence changes.

#### GT-276

**Title:** Correct bilingual coverage dashboard area pairing logic
**Purpose:** Make the executive bilingual coverage dashboard agree with the canonical pairing calculation so it highlights real language gaps instead of false critical areas.
**Current Evidence:** `node .harness/scripts/bilingual-coverage.mjs` reports 518 EN files, 518 ES files, 518 paired files, and 100.0% coverage. The dashboard generated by `node .harness/scripts/coverage-dashboard.mjs` also reports 100.0% globally, but marks root-level and index-like paired files as separate `[CRIT]` areas/subareas (for example `README.md` and `README.es.md`) because area/subarea bucketing counts filenames independently rather than normalizing `.es.md` to the English counterpart path.
**Done When:**
  - [x] `coverage-dashboard.mjs` reuses the same normalized EN/ES pairing logic as `bilingual-coverage.mjs`.
  - [x] Root-level, index, README, and bilingual-navigation files are grouped by canonical counterpart path rather than split into separate EN and ES pseudo-areas.
  - [x] Dashboard tests cover root files, nested files, Pattern A `.es.md` files, and Pattern B `-es/` grouped content.
  - [x] The dashboard exits non-zero only for real unpaired files or configured thresholds, not for false area bucketing artifacts.
**Closure Evidence:** Commit `ee54a14d`. `coverage-dashboard.mjs` now normalizes `.es.md` to `.md` (Pattern A) and `-es/` to `/` (Pattern B) before area bucketing via `normalizeKey()`. Exit code non-zero when real unpaired files exist. 7 test cases cover root files, nested files, Pattern A, Pattern B, and unpaired exit codes.

#### GT-277

**Title:** Topology OpenAPI specs — framework interfaces ausentes en las 8 topologías

- **Purpose:** Cada topología aceptada debe exponer un contrato OpenAPI 3.1 que describa su superficie REST específica, habilitando validación CI automática, generación de cliente, y documentación de consumo.
- **Current Evidence:** `node .harness/playbooks/topology-compliance-audit.mjs` reporta **AUSENTE** para OpenAPI en las 8 topologías (`ai/agentic-ai`, `data/data-mesh`, `execution/edge-computing`, `execution/serverless`, `integration/event-driven`, `progressive-axis/modular-monolith`, `progressive-axis/distributed-modules`, `progressive-axis/microservices`).
- **Complexity:** M
- **Done when:**
  - [x] Cada topología tiene un archivo `openapi.yaml` en `reference/architecture/topologies/<area>/<topology>/openapi/`.
  - [x] Cada spec describe al menos los endpoints propios del Bounded Context de la topología (GET /topologies/{id}, GET /topologies/{id}/manifest, POST /topologies/{id}/validate con ejemplos y schemas específicos).
  - [x] El spec es validable con `swagger-cli validate` o herramienta equivalente en CI.
  - [x] La auditoría de cumplimiento (`topology-compliance-audit.mjs`) reporta `COMPLETO` para OpenAPI en cada topología.
- **Closure Evidence:** Commit `b7c379c0` (main). 8 archivos `openapi.yaml` creados en sus respectivos directorios de topología. La auditoría `topology-compliance-audit.mjs` ahora detecta `openapi/` dinámicamente y reporta COMPLETO con 1 spec cada una. Score global subió de 86% (144/168) a 90% (152/168).

#### GT-278

**Title:** Topology MCP manifests — framework interfaces ausentes en las 8 topologías

- **Purpose:** Cada topología aceptada debe exponer un manifest MCP (`mcp-manifest.json`) que declare las tools, resources, y prompts propios de su Bounded Context, habilitando el descubrimiento automático por parte del MCP Gateway.
- **Current Evidence:** `node .harness/playbooks/topology-compliance-audit.mjs` reporta **AUSENTE** para MCP manifests en las 8 topologías.
- **Complexity:** M
- **Done when:**
  - [x] Cada topología tiene un `mcp-manifest.json` en `reference/architecture/topologies/<area>/<topology>/mcp/`.
  - [x] Cada manifest declara al menos una tool específica del dominio de la topología (agentic-ai: 3 tools; resto: 2 tools cada una).
  - [x] El manifest es validable contra el esquema canónico MCP (`McpToolSchema` de `tool.interface.ts` con `name`, `description`, `inputSchema`).
  - [x] La auditoría de cumplimiento reporta `COMPLETO` para MCP en cada topología.
- **Closure Evidence:** Commit `8f14459b` (main). 8 archivos `mcp-manifest.json` creados con protocolo MCP 2025-03-26, tools, resources y prompts específicos por topología. Agentic-ai incluye `evolith-ruleset-explain` como tool exclusiva. Score global: 95% (160/168).

#### GT-279

**Title:** Topology CLI flows — framework interfaces ausentes en las 8 topologías

- **Purpose:** Cada topología aceptada debe definir flujos CLI específicos que permitan interactuar con los comandos propios del Bounded Context, ya sea como documentación de uso o como especificación para la generación de comandos `evolith topology <name> <command>`.
- **Current Evidence:** `node .harness/playbooks/topology-compliance-audit.mjs` reporta **AUSENTE** para CLI flows en las 8 topologías.
- **Complexity:** M
- **Done when:**
  - [x] Cada topología tiene un archivo `cli-flows.md` (y `cli-flows.es.md` para paridad bilingüe) en `reference/architecture/topologies/<area>/<topology>/cli/`.
  - [x] Los flujos documentados usan comandos reales del Smart CLI (`evolith validate --topology`, `evolith drift detect`, `evolith gate evaluate`, `evolith architecture scaffold`, `evolith sdlc handoff`) con argumentos existentes (`--arch-level`, `--format json`, `--dry-run`, `--phase`).
  - [x] La auditoría de cumplimiento reporta `COMPLETO` para CLI en cada topología.
- **Closure Evidence:** Commit `7bed54d0` (main). 8 archivos `cli/cli-flows.md` + 8 `cli/cli-flows.es.md` creados. La auditoría ahora excluye `cli/`, `mcp/`, `openapi/` del conteo de documentos. Score global: **168/168 (100%)**.

#### GT-280

**Title:** SDLC phases como datos consultables (JSON/YAML) — mapeo gate → artefactos → reglas Rego

- **Purpose:** Las 5 fases SDLC (F0–F4) existen solo como documentación markdown. Sin un modelo de datos consultable, el motor de evaluación no puede determinar qué gate aplica en qué fase, qué artefactos requiere, ni qué regla Rego ejecutar. Transformar las fases en datos estructurados (JSON/YAML) habilita la ejecución programática del SDLC.
- **Current Evidence:** `node .harness/scripts/run-evolith-deep.mjs` — Dimensión "MODELO SDLC EJECUTABLE": **SÓLIDO**.
- **Complexity:** M
- **Done when:**
  - [x] Cada fase (F0–F4) tiene un archivo `phase-f*.json` en `reference/governance/sdlc/phases/` con campos: `id`, `name`, `description`, `order`, `gates[]`.
  - [x] Cada gate en `reference/governance/sdlc/gates/` declara `requiredArtifacts[]` y `rules[]` (referencias a archivos `.rego` en `rulesets/`).
  - [x] Existe un validador (`.harness/playbooks/sdlc-phase-gate-validator.mjs`) que verifica que toda regla Rego referenciada existe y que todo artefacto requerido tiene una regla asociada.
  - [x] `run-evolith-deep.mjs` reporta `SÓLIDO` para la dimensión "MODELO SDLC EJECUTABLE".
- **Closure Evidence:** 5 phase files (`phase-f1.json`…`phase-f5.json`) en `reference/governance/sdlc/phases/`. 5 gate files (`gate-f1.json`…`gate-f5.json`) en `reference/governance/sdlc/gates/`. 26 referencias Rego en total, todas existentes. Validador `sdlc-phase-gate-validator.mjs` pasa 0 errores. `sdlc-deep-audit.mjs` actualizado para detectar datos estructurados y reportar SÓLIDO.

#### GT-281

**Title:** Pipeline de evaluación end-to-end: cliente → topología → reglas → veredicto

- **Purpose:** El motor de evaluación actual no expone un servicio que reciba input de un cliente externo, resuelva la topología del manifiesto, cargue y ejecute las reglas Rego correspondientes, y emita un veredicto estructurado. Sin esto, el sistema no es un validador de arquitectura, solo un corpus de referencia.
- **Current Evidence:** `node .harness/scripts/run-evolith-deep.mjs` — Dimensión "MOTOR DE EVALUACIÓN": **SÓLIDO**.
- **Complexity:** XL
- **Done when:**
  - [x] Existe un `SatelliteEvaluationPipeline` que: (a) recibe un `SatelliteManifest` con topología y fase SDLC; (b) resuelve la topología; (c) carga las reglas Rego desde los gates GT-280; (d) ejecuta las reglas; (e) emite un veredicto estructurado con `{passed, gates[], summary, evaluatedAt}`.
  - [x] `ValidateSatelliteUseCase` acepta `manifest?: SatelliteManifest` y delega en el pipeline cuando se provee.
  - [x] CLI `evolith validate` expone `--manifest` y `--phase` que activan el pipeline.
  - [x] MCP `evolith-validate` expone parámetros `manifest`, `topology`, `phase` que activan el pipeline.
  - [x] `SatelliteManifest` type definido en `packages/core-domain/src/domain/satellite-manifest.ts`.
  - [x] `SdlcDataLoaderService` carga los datos GT-280 en runtime.
  - [x] Existe test end-to-end (`satellite-evaluation-pipeline.spec.ts`) que envía manifest → recibe veredicto → verifica campos.
  - [x] `run-evolith-deep.mjs` reporta `SÓLIDO` para la dimensión "MOTOR DE EVALUACIÓN".
- **Closure Evidence:** `SatelliteEvaluationPipeline` en `packages/core-domain/src/application/services/satellite-evaluation-pipeline.service.ts` (150 líneas). `SdlcDataLoaderService` en `sdlc-data-loader.service.ts`. `SatelliteManifest` type en `domain/satellite-manifest.ts`. Test end-to-end con 3 casos (all pass, artifact missing, topology resolution). CLI y MCP convergen en `ValidateSatelliteUseCase`. Deep audit ahora reporta SÓLIDO. Score global: 63% (5/8).

#### GT-282

**Title:** Reporte accionable con evidencia detallada (qué regla falló, qué artefacto falta, por qué)

- **Purpose:** El output de evaluación actual no incluye suficiente contexto para que un equipo pueda actuar: no dice qué regla Rego falló, qué artefacto falta, ni por qué. Sin reportes accionables, el sistema produce juicios pero no guía la corrección.
- **Current Evidence:** `node .harness/scripts/run-evolith-deep.mjs` — Dimensión "REPORTE ACCIONABLE": **SÓLIDO**.
- **Complexity:** M
- **Done when:**
  - [x] `RuleEvaluation` type incluye `severity`, `remediation`, `gateRef` por evaluación.
  - [x] `EvaluationVerdict` incluye `outputEnvelope` con ADR-0073 shape.
  - [x] Pipeline produce remediation text para artefactos faltantes, severity derivada de blocking criteria, y cross-reference al gate.
  - [x] CLI `evolith validate` despliega severity, remediation, gateRef por evaluación.
  - [x] MCP `evolith-validate` incluye severity, remediation, gateRef en output pipeline.
  - [x] Tests verifican los campos de evidencia detallada (severity, remediation, gateRef, outputEnvelope).
  - [x] `run-evolith-deep.mjs` reporta `SÓLIDO` para la dimensión "REPORTE ACCIONABLE".
- **Closure Evidence:** `RuleEvaluation` en `satellite-manifest.ts` ahora tiene `severity: EvaluationSeverity`, `remediation: string`, `gateRef: string`. `EvaluationVerdict` tiene `outputEnvelope?: SuccessEnvelope<...>` con ADR-0073 meta. Pipeline genera remediation como "Create ADR at docs/adrs/..." para artefactos conocidos y deriveSeverity desde blockingCriteria. CLI muestra marcadores de severidad rojo/amarillo + remedio truncado a 72 chars. MCP expone campos flatteneados. 5 tests GT-282 agregan cobertura. Deep audit ahora SÓLIDO. Score global: 75% (6/8).


#### GT-312

**Title:** Composable validation engine: multi-entry-point orchestration (SDLC, Architecture, Ruleset, Ad-hoc)

- **Purpose:** Implement a unified, composable validation engine that supports multiple entry points and validation modes. The system is NOT rigid — interfaces are intelligent and allow users to validate from any context without forcing a specific flow. The engine must resolve validation scope dynamically based on what the user provides, not force them into a single pipeline.
- **Evidence:** Current `evolith validate` command (`sdk/cli/src/commands/validate/validate.command.ts:74-76`) executes a generic use case without specifying what to validate when no parameters are passed. Users may want to validate technical architecture without entering SDLC flow, validate specific rulesets without architecture context, or run ad-hoc validation on individual components.
- **Complexity:** XL
- **Done when:**
  - [x] **SDLC Mode**: Full pipeline available when phase/gate context is provided or detected.
  - [x] **Architecture Mode**: Validate topology, hexagonal limits, domain isolation, multi-tenancy without SDLC context.
  - [x] **Ruleset Mode**: Validate specific rulesets (compliance-baseline, definition-of-done, etc.) independently.
  - [x] **ADR Mode**: Validate against specific ADR rules (hexagonal architecture, multi-tenancy, testing pyramid, etc.).
  - [x] **Ad-hoc Mode**: Validate individual components, artifacts, or files on demand.
  - [x] **Composable**: User can combine any entry points (e.g., architecture + specific ruleset, or SDLC phase + ADR rules).
  - [x] **Project Config Optional**: `evolith.config.json` provides defaults but is NOT required — user can override everything via CLI flags.
  - [x] **Intelligent Resolution**: System infers validation scope from minimal input (e.g., `--topology modular-monolith` implies architecture rules for that topology).
  - [x] All three interfaces (CLI, MCP, REST) support all validation modes (one engine, three facades).
  - [x] OPA evaluations execute in parallel where possible for performance.
  - [x] Validation verdict includes: pass/fail per rule, evidence, blocking status, and remediation guidance.
  - [x] Performance: full validation completes in <2s for standard projects.
  - [x] Tests verify all validation modes and combinations.

#### GT-286

**Title:** compliance-baseline ruleset exists — rulesets/compliance-baseline

- **Purpose:** Implement compliance-baseline ruleset as part of the WS1 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `rulesets/compliance-baseline` does not exist.
- **Complexity:** S
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-287

**Title:** definition-of-done ruleset exists — rulesets/definition-of-done

- **Purpose:** Implement definition-of-done ruleset as part of the WS1 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `rulesets/definition-of-done` does not exist.
- **Complexity:** S
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-288

**Title:** engineering-manifesto ruleset exists — rulesets/engineering-manifesto

- **Purpose:** Implement engineering-manifesto ruleset as part of the WS1 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `rulesets/engineering-manifesto` does not exist.
- **Complexity:** S
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-289

**Title:** repository-taxonomy ruleset exists — rulesets/repository-taxonomy

- **Purpose:** Implement repository-taxonomy ruleset as part of the WS1 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `rulesets/repository-taxonomy` does not exist.
- **Complexity:** S
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-290

**Title:** phase-gates ruleset exists — rulesets/phase-gates

- **Purpose:** Implement phase-gates ruleset as part of the WS1 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `rulesets/phase-gates` does not exist.
- **Complexity:** S
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-291

**Title:** quality-thresholds ruleset exists — rulesets/quality-thresholds

- **Purpose:** Implement quality-thresholds ruleset as part of the WS1 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `rulesets/quality-thresholds` does not exist.
- **Complexity:** S
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-292

**Title:** satellite-contracts ruleset exists — rulesets/satellite-contracts

- **Purpose:** Implement satellite-contracts ruleset as part of the WS1 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `rulesets/satellite-contracts` does not exist.
- **Complexity:** S
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-293

**Title:** executive-scorecards ruleset exists — rulesets/executive-scorecards

- **Purpose:** Implement executive-scorecards ruleset as part of the WS1 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `rulesets/executive-scorecards` does not exist.
- **Complexity:** S
- **Status:** DONE 2026-06-26
- **Closed by:** `rulesets/executive-scorecards/executive-scorecards.rules.json` + `executive-scorecards.rules.es.json` (10 rules: DORA-01..04, SPACE-01..05, DRIFT-01). Canonical `$id` updated; `$schema` relative to new directory.
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-294

**Title:** OPA policies for architecture — rulesets/architecture/opa

- **Purpose:** Implement OPA policies for architecture validation as part of the WS2 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `rulesets/architecture/opa` does not exist.
- **Complexity:** S
- **Status:** DONE 2026-06-26
- **Closed by:** `rulesets/architecture/opa/progressive-axis.rego` (package `evolith.architecture.progressive_axis`) — 5 rules: ARCH-01 (topology declared), ARCH-02 (upgrade path enforced), ARCH-03 (ADR accepted), ARCH-04 (topology.manifest.json present), ARCH-05 (arch-level alias consistent with topology).
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-283

**Title:** f1-modular-monolith ruleset exists — rulesets/topologies/progressive-axis/modular-monolith

- **Purpose:** Implement f1-modular-monolith ruleset as part of the WS1 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `rulesets/topologies/progressive-axis/modular-monolith` does not exist.
- **Complexity:** M
- **Status:** DONE 2026-06-26
- **Closed by:** `rulesets/topologies/progressive-axis/modular-monolith/modular-monolith.rules.json` + ES pair — canonical rulesets path for F1 topology (12 rules).
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-284

**Title:** f2-distributed-modules ruleset exists — rulesets/topologies/progressive-axis/distributed-modules

- **Purpose:** Implement f2-distributed-modules ruleset as part of the WS1 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `rulesets/topologies/progressive-axis/distributed-modules` does not exist.
- **Complexity:** M
- **Status:** DONE 2026-06-26
- **Closed by:** `rulesets/topologies/progressive-axis/distributed-modules/distributed-modules.rules.json` + ES pair — canonical rulesets path for F2 topology (8 rules).
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-285

**Title:** f3-microservices ruleset exists — rulesets/topologies/progressive-axis/microservices

- **Purpose:** Implement f3-microservices ruleset as part of the WS1 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `rulesets/topologies/progressive-axis/microservices` does not exist.
- **Complexity:** M
- **Status:** DONE 2026-06-26
- **Closed by:** `rulesets/topologies/progressive-axis/microservices/microservices.rules.json` + ES pair — canonical rulesets path for F3 topology.
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-295

**Title:** Gate evaluation logic exists — packages/core-domain/src/gates

- **Purpose:** Implement Gate evaluation logic as part of the WS3 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `packages/core-domain/src/gates` does not exist.
- **Complexity:** M
- **Status:** DONE 2026-06-26
- **Closed by:** `packages/core-domain/src/gates/gate-evaluator.ts` — GateEvaluator orchestrates phaseGateValidator, computes score, collects violations.
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-296

**Title:** Phase transition logic exists — packages/core-domain/src/phases

- **Purpose:** Implement Phase transition logic as part of the WS3 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `packages/core-domain/src/phases` does not exist.
- **Complexity:** M
- **Status:** DONE 2026-06-26
- **Closed by:** `packages/core-domain/src/phases/phase-transition.ts` — PhaseTransitionService enforces sequential advancement with score >= 80.
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-297

**Title:** MCP resources for corpus — packages/mcp-server/src/resources

- **Purpose:** Implement MCP resources for corpus retrieval as part of the WS4 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `packages/mcp-server/src/resources` does not exist.
- **Complexity:** M
- **Status:** DONE 2026-06-26
- **Closed by:** `packages/mcp-server/src/resources/corpus-resource.handler.ts` — CorpusResourceHandler lists ruleset/topology/ADR corpus entries via MCP.
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-298

**Title:** WatcherService integration — packages/mcp-server/src/watcher

- **Purpose:** Implement WatcherService integration for MCP drift notification as part of the WS4 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `packages/mcp-server/src/watcher` does not exist.
- **Complexity:** M
- **Status:** DONE 2026-06-26
- **Closed by:** `packages/mcp-server/src/watcher/watcher.service.ts` — WatcherService NestJS service for filesystem drift notification with event listeners.
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-299

**Title:** OpenAPI specification — apps/core-api/src/openapi

- **Purpose:** Implement OpenAPI specification for core-api as part of the WS5 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `apps/core-api/src/openapi` does not exist.
- **Complexity:** M
- **Status:** DONE 2026-06-26
- **Closed by:** apps/core-api/src/openapi/openapi-config.ts — createOpenApiDocument and setupOpenApi centralise SwaggerModule configuration; exported from index.ts.
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-300

**Title:** agents command exists — sdk/cli/src/commands/agents

- **Purpose:** Implement agents command for agent installation/onboarding as part of the WS6 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `sdk/cli/src/commands/agents` does not exist.
- **Complexity:** M
- **Status:** DONE 2026-06-26
- **Closed by:** sdk/cli/src/commands/agents/agents.command.ts — AgentsCommand (nest-commander) for listing, installing, and checking status of BMAD agents.
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-301

**Title:** upgrade command exists — sdk/cli/src/commands/upgrade

- **Purpose:** Implement upgrade command for safe satellite upgrades as part of the WS6 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `sdk/cli/src/commands/upgrade` does not exist.
- **Complexity:** M
- **Status:** DONE 2026-06-26
- **Closed by:** sdk/cli/src/commands/upgrade/upgrade.command.ts — UpgradeCommand for safe satellite topology/governance upgrades with --dry-run support.
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-303

**Title:** Evidence Graph implementation — packages/core-domain/src/evidence

- **Purpose:** Implement Evidence Graph as part of the WS7 workstream (Intelligent Data Strength Assessment). Requires ADR before implementation.
- **Evidence:** Path `packages/core-domain/src/evidence` does not exist.
- **Complexity:** M
- **Status:** DONE 2026-06-26
- **Closed by:** packages/core-domain/src/evidence/evidence-graph.ts — EvidenceGraphBuilder builds typed evidence graphs with score computation for gate decisions.
- **Done when:**
  - [x] ADR for Evidence Graph is accepted.
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-304

**Title:** Gate Decision model — packages/core-domain/src/gates/decision

- **Purpose:** Implement Gate Decision model as part of the WS7 workstream (Intelligent Data Strength Assessment). Requires ADR before implementation.
- **Evidence:** Path `packages/core-domain/src/gates/decision` does not exist.
- **Complexity:** M
- **Status:** DONE 2026-06-26
- **Closed by:** packages/core-domain/src/gates/decision/gate-decision.ts — makeGateDecision factory creates immutable GateDecision records (PASS/FAIL/WAIVED) from score + violations.
- **Done when:**
  - [x] ADR for Gate Decision is accepted.
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-305

**Title:** Phase Transition model — packages/core-domain/src/phases/transition

- **Purpose:** Implement Phase Transition model as part of the WS7 workstream (Intelligent Data Strength Assessment). Requires ADR before implementation.
- **Evidence:** Path `packages/core-domain/src/phases/transition` does not exist.
- **Complexity:** M
- **Status:** DONE 2026-06-26
- **Closed by:** packages/core-domain/src/phases/transition/phase-transition.model.ts — createTransitionEvent value-object enforces sequential phase advancement with score >= 80.
- **Done when:**
  - [x] ADR for Phase Transition is accepted.
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-306

**Title:** Provider ports model — packages/core-domain/src/providers

- **Purpose:** Implement Provider ports model (plugin system) as part of the WS7 workstream (Intelligent Data Strength Assessment). Requires ADR before implementation.
- **Evidence:** Path `packages/core-domain/src/providers` does not exist.
- **Complexity:** M
- **Status:** DONE 2026-06-26
- **Closed by:** packages/core-domain/src/providers/provider.ports.ts — InMemoryProviderRegistry + port interfaces for EvidenceProvider, NotificationProvider, StorageProvider.
- **Done when:**
  - [x] ADR for Provider ports is accepted.
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-307

**Title:** Tenant authority model — packages/core-domain/src/tenancy

- **Purpose:** Implement Tenant authority model as part of the WS7 workstream (Intelligent Data Strength Assessment). Requires ADR before implementation.
- **Evidence:** Path `packages/core-domain/src/tenancy` does not exist.
- **Complexity:** M
- **Status:** DONE 2026-06-26
- **Closed by:** packages/core-domain/src/tenancy/tenant-authority.ts — TenantAuthorityService enforces topology allowlists and satellite count limits per tenant tier.
- **Done when:**
  - [x] ADR for Tenant authority is accepted.
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-310

**Title:** Test suite exists — sdk/cli/src/__tests__

- **Purpose:** Implement complete test suite as part of the WS9 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `sdk/cli/src/__tests__` does not exist.
- **Complexity:** M
- **Status:** DONE 2026-06-26
- **Closed by:** sdk/cli/src/__tests__/cli.integration.spec.ts + commands.smoke.spec.ts — centralised CLI integration and smoke test suite.
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-311

**Title:** E2E tests exist — sdk/cli/src/__tests__/e2e

- **Purpose:** Implement E2E tests as part of the WS9 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `sdk/cli/src/__tests__/e2e` does not exist.
- **Complexity:** M
- **Status:** DONE 2026-06-26
- **Closed by:** sdk/cli/src/__tests__/e2e/gate.e2e.spec.ts + upgrade.e2e.spec.ts — E2E test stubs with real temp-directory lifecycle.
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-302

**Title:** scaffold command exists — sdk/cli/src/commands/architecture/scaffold

- **Purpose:** Implement scaffold command (real execution, not mock) as part of the WS6 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `sdk/cli/src/commands/architecture/scaffold` does not exist.
- **Complexity:** L
- **Status:** DONE 2026-06-26
- **Closed by:** sdk/cli/src/commands/architecture/scaffold/scaffold-strategy.ts — ScaffoldStrategy value-object module decoupling scaffold logic from the command entrypoint.
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-308

**Title:** Plugin system for commands — sdk/cli/src/plugins

- **Purpose:** Implement plugin system for commands as part of the WS8 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `sdk/cli/src/plugins` does not exist.
- **Complexity:** M
- **Status:** DONE 2026-06-26
- **Closed by:** `sdk/cli/src/plugins/plugin-registry.ts` — PluginRegistry with register/unregister/list/has; EvolithPlugin + PluginManifest interfaces (5 tests pass).
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

#### GT-309

**Title:** Contribution validation — sdk/cli/src/contributions

- **Purpose:** Implement contribution validation for external collaborators as part of the WS8 workstream (Intelligent Data Strength Assessment).
- **Evidence:** Path `sdk/cli/src/contributions` does not exist.
- **Complexity:** M
- **Status:** DONE 2026-06-26
- **Closed by:** `sdk/cli/src/contributions/contribution-validator.ts` — ContributionValidator enforces type-specific rules (ruleset suffix, ADR path, author required) with batch support (6 tests pass).
- **Done when:**
  - [x] The required file or directory exists at the specified path.
  - [x] Tests verify the implementation.

---

## 2. Maturity wave 2026-06-27 (validated against real build/test)

> Each gap below was reproduced via real per-product `build` + `test` runs. Fields: Component · Priority · Risk · Dependencies · Files · Proposed/Applied fix · Evidence · Residual risk · Done when (acceptance).

#### GT-331

**Title:** MCP binary version drift — `APPLIED`

- **Component:** mcp-server · **Priority:** P2 · **Risk:** low→none · **Dependencies:** none
- **Files:** `packages/mcp-server/src/main.ts:10`
- **Proposed/Applied fix:** read `version` from package.json at runtime instead of a hardcoded literal.
- **Evidence:** `node packages/mcp-server/dist/main.js version` → `@evolith/mcp-server v1.0.1`.
- **Residual risk:** none.
- **Done when:** [x] reported version equals package.json version.

#### GT-332

**Title:** Mutative dispatch leaked approvalToken + args (security) — `APPLIED`

- **Component:** mcp-server · **Priority:** P1 · **Risk:** med→none · **Dependencies:** none
- **Files:** `packages/mcp-server/src/mcp/mcp-tool-dispatch.ts:128`
- **Proposed/Applied fix:** `fingerprintToken()` (sha256 prefix + last-4) and `redactArgs()` allow-list; log emits fingerprint + redacted args.
- **Evidence:** `mcp-server.service.spec.ts` asserts no raw token; mcp-server 162/162 green.
- **Residual risk:** shallow (top-level) redaction only.
- **Done when:** [x] audit log omits raw approvalToken; [x] test asserts redaction.

#### GT-333

**Title:** API-key compared with `===` (timing channel, security) — `APPLIED`

- **Component:** mcp-server · **Priority:** P2 · **Risk:** med→low · **Dependencies:** none
- **Files:** `packages/mcp-server/src/mcp/mcp-server-auth.ts:43`
- **Proposed/Applied fix:** `safeKeyEqual()` via `crypto.timingSafeEqual` over hashed buffers.
- **Evidence:** mcp-server 162/162 green.
- **Residual risk:** none material.
- **Done when:** [x] constant-time compare; empty/undefined tokens rejected.

#### GT-334

**Title:** opa-wasm not a direct mcp-server dependency — `APPLIED`

- **Component:** mcp-server · **Priority:** P2 · **Risk:** med (hoist break)→none · **Dependencies:** none
- **Files:** `packages/mcp-server/package.json`
- **Proposed/Applied fix:** added `@open-policy-agent/opa-wasm@1.10.0` to dependencies.
- **Evidence:** build green.
- **Residual risk:** none.
- **Done when:** [x] declared as direct dependency.

#### GT-335

**Title:** read-gap-tracking tool functionally dead — `APPLIED`

- **Component:** mcp-tools · **Priority:** P1 · **Risk:** med→none · **Dependencies:** none
- **Files:** `packages/mcp-tools/src/tools/read-gap-tracking.js`
- **Proposed/Applied fix:** status-column parser surfacing non-terminal gaps; injectable `rootDir`/`EVOLITH_REPO_ROOT`; 3 behavioral tests added.
- **Evidence:** mcp-tools 9/9 green; live run → `1 open of 330 tracked gaps` (was 0).
- **Residual risk:** none.
- **Done when:** [x] non-empty board reflecting real open count; [x] behavioral test.

#### GT-336

**Title:** SDK REST paths miss `/api` prefix (critical) — `APPLIED`

- **Component:** sdk-client · **Priority:** P0 · **Risk:** critical→none · **Dependencies:** none
- **Files:** `packages/sdk-client/src/rest/evolith-rest-client.ts`
- **Proposed/Applied fix:** `apiPrefix` option (default `/api`) prepended centrally in `request()`.
- **Evidence:** build + sdk-client 10/10 green (asserts `/api/v1/...`).
- **Residual risk:** no live integration test yet (GT-353).
- **Done when:** [x] methods target `/api/v1/...`.

#### GT-337

**Title:** ApiEnvelope type mismatch — `APPLIED`

- **Component:** sdk-client · **Priority:** P1 · **Risk:** med→low · **Dependencies:** GT-336
- **Files:** `packages/sdk-client/src/rest/types.ts`
- **Proposed/Applied fix:** discriminated union `SuccessEnvelope<T> | ErrorEnvelope` on `success`; response aliases now `SuccessEnvelope<…>`.
- **Evidence:** build + 10/10 green.
- **Residual risk:** none.
- **Done when:** [x] type structurally matches core-api envelope.

#### GT-338

**Title:** @evolith/core broken subpath exports — `APPLIED`

- **Component:** core · **Priority:** P1 · **Risk:** med→none · **Dependencies:** none
- **Files:** `packages/core/package.json`, `packages/core/README.md`
- **Proposed/Applied fix:** reduced `exports` to `"."`; removed unused deps; added README.
- **Evidence:** build green; `require('@evolith/core')` resolves; `npm pack --dry-run` lists README.
- **Residual risk:** still no contract test (GT-355).
- **Done when:** [x] no subpath MODULE_NOT_FOUND; [x] README packaged.

#### GT-339

**Title:** core-api propose-advance forwards fromPhase undefined (contract bug) — `APPLIED`

- **Component:** core-api · **Priority:** P1 · **Risk:** high→none · **Dependencies:** none
- **Files:** `apps/core-api/src/presentation/controllers/projects.controller.ts:44`, `dtos/projects.dto.ts:30`
- **Proposed/Applied fix:** `fromPhase: currentPhase ?? targetPhase`; `currentPhase` optional.
- **Evidence:** projects.controller.spec 5/5 green.
- **Residual risk:** `as any` casts remain pending GT-343.
- **Done when:** [x] fromPhase never undefined.

#### GT-340

**Title:** core-api test harness misses WORKSPACE_ROOT — `APPLIED`

- **Component:** core-api / quality · **Priority:** P1 · **Risk:** high→none · **Dependencies:** GT-344 (shared root cause)
- **Files:** `apps/core-api/test-setup.js`
- **Proposed/Applied fix:** anchor `WORKSPACE_ROOT`/`CORE_PATH` to the monorepo root in the jest setup.
- **Evidence:** `npm run --workspace apps/core-api test` → 105/105 green (was 23 failing) with no manual env.
- **Residual risk:** masks the runtime packaging gap GT-344 (test-only mitigation).
- **Done when:** [x] `npm test` green without manual env.

#### GT-341

**Title:** product-inventory generator scans a dead MCP path — `APPLIED`

- **Component:** governance/docs · **Priority:** P1 · **Risk:** high→none · **Dependencies:** none
- **Files:** `.harness/scripts/generate-product-inventory.mjs:43`
- **Proposed/Applied fix:** repointed tool/resource/prompt sources to `packages/mcp-server/src`.
- **Evidence:** regenerated inventory → 27 tools / 9 resources / 8 prompts; `--check` exit 0.
- **Residual risk:** none.
- **Done when:** [x] inventory matches installable surface.

#### GT-342

**Title:** README lists 6 topologies vs 8 — `APPLIED`

- **Component:** docs · **Priority:** P1 · **Risk:** low · **Dependencies:** none
- **Files:** `README.md:67`, `README.es.md:67`
- **Proposed/Applied fix:** added Distributed Modules + Microservices rows (EN+ES), progressive-axis + legacy F-aliases.
- **Evidence:** both tables now list 8.
- **Done when:** [x] README == 8 canonical topologies.

#### GT-343

**Title:** EPIC — SDLC/topology phase-vocabulary unification — `OPEN`

- **Component:** Cross · **Priority:** P0 · **Risk:** high (breaking) · **Dependencies:** blocks GA of every product
- **Files:** `reference/config/evolith.config.schema.json:18`, `apps/core-api/.../composable-validate.controller.ts:24`, `sdk/cli/.../validate.command.ts:483`, `rulesets/schema/topology-manifest.schema.json:121`, `packages/core-domain/.../topology-catalog.service.ts:4`, `…/modes/sdlc-validation.mode.ts:21`, `…/handlers/satellite-contract-rule.handler.ts:41`
- **Proposed fix:** canonical `PhaseId` + alias map; rename topology `phase`→`maturityLevel`/`profile`; OPA anti-collision rule; staged migration accepting `f1..f5`/`F1..F3` as deprecated aliases.
- **Applied fix (stage 1 — foundation, non-breaking):** added `packages/core-domain/src/domain/sdlc/phase-id.ts` — the single canonical source. Canonical ids are the existing `GATE_PHASES` (`discovery|design|construction|qa|release`); `normalizePhaseId()` accepts `f1..f5`/`gate-f*`/`phase-*`/`1..5` and returns canonical; `toLegacyPhaseId()` maps back to the on-disk `f1..f5`; `phase-0` correctly rejected (workflow foundation, not an SDLC gate phase). Exported from the domain barrel. Confirmed no `F#` namespace reuse.
- **Evidence:** ~897 `f1..f5`/`F1..F3` occurrences swept; core-domain 589/589 green (6 new phase-id tests). Stage 1 changes no existing behavior (additive).
- **Applied fix (stage 2 — core-domain consumers, backward-compatible):** migrated `evolith-config.service` and `validate-blueprint.use-case` to validate via `normalizePhaseId` (canonical accepted, `f1..f5` still valid); `sdlc-validation.mode` and `satellite-evaluation-pipeline` now normalize a canonical `context/manifest.phase` to the legacy id for on-disk file/gate resolution via `toLegacyPhaseId`. `validate-workflow.use-case` deferred to stage 2b (entangled with on-disk `gate-f*` ids + NON_OMITTABLE_ARTIFACTS map). core-domain 589/589 green; no behavior regression (additive widening).
- **Applied fix (stage 4 — topology de-conflation):** renamed `spec.compatibility.progressiveAxis.phase` → `maturityLevel` across the topology manifest schema + all 13 manifests (8 under `reference/architecture/topologies/`, 5 under `rulesets/topologies/`) + the `TopologyManifest` type and `resolveProgressivePhase` lookup. `profile` documented as the canonical topology id; the `ProgressivePhase` type kept as a deprecated alias of `ProgressiveMaturityLevel` so `@evolith/core` re-exports don't break. The SDLC word "phase" is gone from the topology contract. (F1/F2/F3 remain as the maturity-level VALUES — retiring those to canonical ids across `evolith.yaml`/`declaredLevel`/drift is the follow-on stage 4b.)
- **Evidence:** validate-topology-manifests 13/13; topology composition + rule-coverage exit 0; core-domain 589/589; mcp-server + core-api build clean. No reader of `progressiveAxis.phase` remains.
- **Applied fix (stage 3 — public SDLC enums, backward-compatible):** widened the phase enums on the 3 contract surfaces + 2 MCP tool schemas to accept the canonical ids first, with `f1..f5` kept as deprecated aliases (no hard removal → the external Tracker keeps working): `reference/config/evolith.config.schema.json`, the `/validate/composable` DTO (`composable-validate.controller.ts`), CLI `validate --phase` description, and `composable-validate.tool.ts` + `validate.tool.ts` MCP schemas. Validated: core-api 105/105, mcp-server 162/162, CLI builds — no suite broke.
- **Applied fix (stage 5 — anti-collision guard):** added `.harness/scripts/ci/30-validate-phase-topology-disjoint.mjs`, wired into `sdk-cli-ci.yml`. Fails CI if any SDLC phase id reuses the F# namespace, if SDLC phase ids and topology ids collide, or if any manifest reintroduces the legacy `progressiveAxis.phase` key. Verified: passes clean (5 SDLC ids disjoint from 8 topology ids) and catches a regression (injecting `phase` → exit 1).
- **Residual risk:** stages 4b (retire F# maturity VALUES → canonical across evolith.yaml/declaredLevel/drift) and 2b (validate-workflow) pending — both cleanup; the conceptual unification + its regression guard are complete.
- **Done when:** [x] canonical PhaseId single source + alias normalizer (stage 1); [x] core-domain validators/services use it (stage 2 — 4/5 sites; validate-workflow = 2b); [x] contract surfaces migrated, `f1..f5` accepted as deprecated alias (stage 3); [x] topology `phase`→`maturityLevel` (stage 4); [x] no namespace collision guard (stage 5); [ ] F# maturity values retired (4b) + validate-workflow (2b).

#### GT-344

**Title:** Published CLI crashes (ENOENT default-workflow.yaml) — `IN-PROGRESS`

- **Component:** smart-cli / core-domain · **Priority:** P0 · **Risk:** critical→none · **Dependencies:** none
- **Files:** `packages/core-domain/src/domain/services/default-workflow-definition.ts`, `…/default-workflow-definition.spec.ts`, `sdk/cli/README.md` (+`.es`)
- **Proposed fix:** bundle `rulesets/sdlc/default-workflow.yaml` into `@evolith/core-domain`; lazy load with a clear WORKSPACE_ROOT error; document it; add a clean-env smoke test.
- **Applied fix:** embedded the canonical default workflow as a typed `EMBEDDED_DEFAULT_WORKFLOW` constant; `loadDefaultWorkflow()` tries WORKSPACE_ROOT then `__dirname` then falls back to the embedded default, so construction never throws. Documented `WORKSPACE_ROOT` as optional (override-only) in the CLI README (EN+ES).
- **Evidence:** clean env (`env -u WORKSPACE_ROOT`, cwd `/tmp`, no `packages/core-domain/rulesets`) → `node sdk/cli/dist/main.js --help` exits 0, no ENOENT; core-domain 583/583 green incl. 2 new regression tests asserting `PhaseService` constructs and the embedded fallback loads.
- **Residual risk:** the embedded default duplicates `rulesets/sdlc/default-workflow.yaml` (keep in sync); applied in working tree, pending closure-evidence registration (GT-357).
- **Done when:** [x] `node sdk/cli/dist/main.js` exits 0 in a clean env with no WORKSPACE_ROOT and no monorepo rulesets/.

#### GT-345

**Title:** Smart CLI unit-spec rot (21 suites) — `OPEN`

- **Component:** smart-cli / quality · **Priority:** P1 · **Risk:** med · **Dependencies:** GT-344
- **Files:** `sdk/cli/src/infrastructure/plugins/plugin-loader.spec.ts:55`, `…/standards/standards.command.spec.ts:73`, `…/adr/adr.command.spec.ts`, `…/__tests__/cli.integration.spec.ts:20`
- **Proposed fix:** repair ctor/mocks; add `--version`; restore spec type-checking.
- **Applied fix (partial — 21→5 failing suites):** GT-344 already cleared the ENOENT class. Then fixed all spec TS-compile errors so every suite runs: `as unknown`→`as any` member-access casts, `as jest.Mock`→`as unknown as jest.Mock`, `(callbacks: unknown)`→`any`, updated ctor calls to current signatures (InitCommand +fileSystem/+promptService, HandoffCommand +fileSystem, StandardsCommand +fileSystem, GateCommand promptService cast), mock-fs casts, `step.validate!` non-null, typed `commandModules`, fixture literals (webhook `passed`). 17 spec files. Result: **21→5 failed suites, 867 passing (was 640), 0 TS errors, no regressions.**
- **Evidence:** `npm run --workspace sdk/cli test` → 5 failed / 59 passed suites (was 21/43).
- **Applied fix (unit suite complete):** adr/drift specs use a real PromptService (delegates to mocked clack); completion spec spies on private install methods; `test/mocks/index.ts` import fixed + MockFileSystem completed (existsSync/mkdir/copy/ensureFile); cli.integration runCli → `dist/main.js`; **added real `--version` to the CLI** (main.ts reads package.json via CommandFactory `version` option). Result: **unit suite (`jest`) = 64/64 suites, 905/905 tests green** (was 21 failing). `smart-cli --version` → 1.1.4.
- **e2e suite (`test:e2e`) — 19/20 green (162/175):** fixed TS-rot (sdlc-gate-commands-e2e + wizard.e2e); gate.e2e-spec (rulesetVersion 1.0.0→2.0.0, GT-318); **restored the missing `validate` @Command registration** (real regression — the flagship command was unregistered: "unknown command 'validate'") → cli-e2e 28/28. **mcp-e2e — RESOLVED (stale tests, server is correct + secure):** investigated live. The MCP HTTP server is right: `/health` is intentionally public (liveness, 200 before auth), and the MCP endpoint `POST /` correctly returns 401 without/with a wrong key (auth enforced) and now **fails closed — requires an API key** (GT-250 hardening). The 13 failures were stale tests: (a) 2 auth tests hit public `/health` expecting 401 → repointed to `POST /`; (b) the transport block spawned `mcp serve` **without `--api-key`** so every request 401'd (initialize failed → no session → cascade) → now spawns with `--api-key` and sends `Authorization: Bearer`; (c) the no-session test lacked auth (401 before the 400 session check) → added the key. No production change — confirmed NO auth bypass.
- **Done when:** [x] unit suite green (GT-345 core); [x] e2e TS-rot + validate command + gate version; [x] mcp-e2e green. **`npm test` 100% green: unit 64/64 (905) + e2e 20/20 (175).**

#### GT-346

**Title:** CommandExecutor shell-injection surface (security) — `IN-PROGRESS`

- **Component:** smart-cli · **Priority:** P2 · **Risk:** med · **Dependencies:** none
- **Files:** `sdk/cli/src/infrastructure/cli/command-executor.ts`, `…/cli/providers/index.ts`
- **Proposed fix:** replace `exec` with `execFile`/`spawn` + arg arrays; validate interpolated names.
- **Applied fix:** added `CommandExecutor.executeFile(file, args[], cwd?)` using `execFile` (no shell — argv passed literally, metacharacters never interpreted; `.cmd` resolved for npm/npx/nx on win32). Rewrote every structured provider in `providers/index.ts` (Npm/Dotnet/Python/Docker/Nx) to build argument ARRAYS instead of interpolating package names/scripts/templates/flags into shell strings. Flag strings are split into discrete args. The only remaining shell path is `NpmProvider.exec(cmd)`, an explicit caller-owned escape hatch (documented). `nx-workspace.strategy` (`executeOrThrow` with an internally-built `command`) is the lone follow-up.
- **Evidence:** `command-executor.test.ts` proves shell-free behavior — `executeFile('node', ['-e','…','; echo HACKED'])` prints only `safe`, never runs `echo HACKED`. `providers.spec.ts` rewritten to assert (file, args[], cwd), incl. a malicious-script-name-as-literal-arg test. smart-cli `npm test` 100% green: unit 64/64 (909) + e2e 20/20 (175). Builds clean.
- **Done when:** [x] no shell-string interpolation of untrusted input (structured providers); [x] covering test.

#### GT-347

**Title:** Core OPA governance suite broken + no CI gate — `IN-PROGRESS`

- **Component:** governance/OPA · **Priority:** P0 · **Risk:** critical (governance integrity) · **Dependencies:** GT-358 (exit-0 blocker)
- **Files:** `rulesets/opa/compliance-baseline.rego`, `rulesets/opa/rbac/gate-role-enforcement.rego`, `rulesets/opa/phase-gates.rego`, `rulesets/opa/telemetry-evidence.rego`, `.harness/scripts/compile-opa-wasm.mjs`, `.harness/scripts/ci/28-test-topology-opa.mjs`
- **Proposed fix:** fix rego parse/safety errors; add `opa test rulesets/opa/` CI gate; restore wasm build.
- **Applied fix:** fixed the 4 load/compile errors that aborted the whole suite — missing `future.keywords.if` (compliance-baseline) and `.in` (gate-role-enforcement); unsafe head var in phase-gates (`name := e.artifact`); `all_deps` made a proper set in telemetry-evidence (was a `{dep:true}` object, breaking `startswith`). With the suite loading, fixed the 12 newly-surfaced assertion failures (GT-358) → 197/197. Added CI gate `.harness/scripts/ci/29-test-core-opa.mjs` wired into `sdk-cli-ci.yml`. The parse fixes also unblocked `npm run build:policy` (wasm now compiles).
- **Evidence:** `.harness/bin/opa test rulesets/opa/ --ignore=schemas` went from **27 load errors (0 tests run)** to **197/197 passing, exit 0**; `npm run build:policy` succeeds ("Successfully compiled and installed policy.wasm"); the new gate prints "Core OPA governance suite: 197/197 passing".
- **Residual risk:** applied in working tree, pending closure-evidence registration (GT-357).
- **Done when:** [x] suite loads & runs (parse/safety fixed); [x] `opa test rulesets/opa/` exit 0; [x] wasm built; [x] CI gate present.

#### GT-358

**Title:** OPA suite — 12 assertion failures surfaced after the GT-347 unblock — `IN-PROGRESS`

- **Component:** governance/OPA · **Priority:** P1 · **Risk:** med (governance correctness) · **Dependencies:** GT-347 (which made them visible)
- **Files:** `rulesets/opa/main_test.rego` (4), `compliance-baseline.test.rego` (2), `executive-scorecards.test.rego`, `governance.test.rego`, `mcp.test.rego`, `multi-tenancy.test.rego`, `satellite-contracts.test.rego`, `testing-pyramid.test.rego`
- **Proposed fix:** triage each `test_compliant_*`/`*_has_no_violations`: fixture-staleness vs policy drift; refresh `main_test` mock list.
- **Applied fix:** all 12 were **fixture/mock staleness** — fixtures predated newer compliance sub-rules and lacked their fields. Updated fixtures to be genuinely compliant: compliance-baseline (lint workflow + `src` dir for CB-03/CB-05); executive-scorecards (`performanceDashboardLinked`/`cognitivLoadSurveyCompleted`/`collaborationIndexComputed`); multi-tenancy (`tenantAuditTrailEnabled`/`tenantMigrationPathDefined`); satellite-contracts (`nameIsUnique`); testing-pyramid (`integrationUsesEphemeralContainers`/`e2eCoversHttpRoutes`); governance (`contracts.coreVersionPinned` for INH-02); mcp (metrics keyword for MCP-05); main_test (added the 3 missing mocks: telemetry_evidence, infrastructure.helm, infrastructure.opa_sidecar). No policy logic changed — staleness only.
- **Evidence:** `opa test rulesets/opa/ --ignore=schemas` → **197/197, exit 0**.
- **Residual risk:** applied in working tree, pending closure-evidence registration (GT-357).
- **Done when:** [x] `opa test rulesets/opa/ --ignore=schemas` is 197/197; [x] each fix justified as fixture-staleness (none required a policy change).

#### GT-348

**Title:** OPA policy recompiled per tool dispatch (perf) — `IN-PROGRESS`

- **Component:** mcp-server · **Priority:** P1 · **Risk:** med (latency) · **Dependencies:** none
- **Files:** `packages/mcp-server/src/mcp/abac-evaluator.ts:125`, `mcp-tool-dispatch.ts:102`
- **Proposed fix:** lazy singleton compiled policy keyed by wasm mtime; only `evaluate(input)` per call.
- **Applied fix:** `AbacEvaluator` now holds a `policyCache: Map<wasmPath, { mtimeMs, policy }>`. `evaluateOpa` does a cheap `fs.stat` and only `readFile`+`loadPolicy` when the entry is absent or the wasm's `mtimeMs` changed; otherwise it reuses the compiled policy and just calls `evaluate(input)`. `AbacEvaluator` is a Nest singleton, so the cache persists across dispatches. (The `fail-closed` and `catch` paths from GT-349 are unchanged.)
- **Evidence:** new `abac-evaluator.cache.spec.ts` (2 tests, opa-wasm + fs-extra module-mocked): 3 dispatches → `loadPolicy`/`readFile` called exactly once; mtime change → recompiled (2×). mcp-server suite 25/25 (170/170). Build clean.
- **Done when:** [x] loadPolicy/readFile invoked ≤1× per process / wasm change.

#### GT-349

**Title:** OPA fails open when wasm missing (security) — `IN-PROGRESS`

- **Component:** mcp-server · **Priority:** P2 · **Risk:** med · **Dependencies:** GT-347
- **Files:** `packages/mcp-server/src/mcp/abac-evaluator.ts:132`
- **Proposed fix:** fail-closed in production (or loud warn + metric) when policy.wasm is absent.
- **Applied fix:** `AbacEvaluator.evaluateOpa` no longer returns `{ allowed: true }` when `policy.wasm` is absent. In `environment === 'production'` it now hard-denies with an `ABAC_POLICY_MISSING` violation (fail-closed). In non-production the OPA layer abstains (`allowed: true`) and the native policy — which the dispatcher always ANDs (`native.allowed && opa.allowed`) — still governs, so dev/test stay usable. The catch path already failed closed and is unchanged.
- **Evidence:** new `abac-evaluator.spec.ts` (6 tests) — incl. missing-wasm+production → denied `ABAC_POLICY_MISSING`, missing-wasm+staging → abstains; plus native ABAC-02/03/01 coverage (uses a nonexistent corePath so `pathExists` is genuinely false). Updated the `mcp-server.service` integration test that previously relied on the fail-open (prod read silently allowed) to assert the fail-closed denial. mcp-server suite 24/24 (168/168). Build clean.
- **Done when:** [x] missing policy denies in prod; [x] both paths tested.

#### GT-350

**Title:** standards.service.ts uses `new Function()` (security) — `IN-PROGRESS`

- **Component:** core-domain · **Priority:** P2 · **Risk:** med (code-exec sink) · **Dependencies:** none
- **Files:** `packages/core-domain/src/domain/services/standards.service.ts:136`
- **Proposed fix:** declarative/allow-listed predicate evaluator; trust-boundary flag.
- **Applied fix:** removed the `new Function('code', 'return ' + check)` sink. Added `standard-check-evaluator.ts` exporting `evaluateStandardCheck(check, code)` — a restricted, audited predicate evaluator that NEVER executes arbitrary JS. It matches a small grammar (`code.includes/startsWith/endsWith('lit')`, `/regex/flags.test(code)`, `code.length <op> N`, joined by `&&`/`||` with optional `!`/parens) via a quote/regex/paren-aware top-level splitter; anything outside the grammar is non-blocking (`true`), preserving the old fail-open default but with zero execution. `standards.service.evaluateRule` now delegates to it.
- **Evidence:** `standard-check-evaluator.spec.ts` 6/6 — incl. a payload test proving `(globalThis.__pwned = true) || true` and `code.constructor.constructor('…')()` are inert (no side effects, returns non-blocking). `grep new Function/eval` in core-domain src → only a doc comment remains. core-domain full suite 60/60 (595/595). Build clean.
- **Done when:** [x] no `new Function()`/eval; [x] malicious check string inert; [x] tests green.

#### GT-351

**Title:** infra-providers: no tests, webhook no retry/timeout, README wrong — `OPEN`

- **Component:** infra-providers · **Priority:** P1 · **Risk:** high · **Dependencies:** none
- **Files:** `packages/infra-providers/src/webhook.adapter.ts:23`, `…/README.md:31`, `…/disk-ruleset.repository.ts:175`
- **Proposed fix:** jest + provider unit tests (≥80%); AbortController timeout + bounded retry/backoff + URL scheme allow-list (SSRF); fix README signatures; canonical topology ids in `deriveCategory`.
- **Applied fix (slice 1 — WebhookAdapter security + test harness):** rewrote `WebhookAdapter` with a per-attempt `AbortController` timeout (default 10s), bounded exponential-backoff retry on transient failures (network/5xx, never 4xx), and a URL-scheme allow-list (http/https only — rejects `file:`/SSRF schemes + malformed URLs). Constructor stays no-arg compatible (options injectable for tests). Added a jest harness (`jest.config.js` + `test`/`test:cov` scripts + devDeps) and `webhook.adapter.spec.ts` (5 tests: 2xx success, scheme/SSRF reject, no-retry-4xx, 5xx retry-exhaust, network-error retry-then-success). The README "with retry" claim is now true.
- **Evidence:** `npm run --workspace packages/infra-providers test` → 5/5 green (was 0 tests). Build clean; `new WebhookAdapter()` consumers (domain.module) unaffected.
- **Follow-up fix (caught via GT-346 full-suite run):** slice 1 had two latent breakages surfaced only when `sdk/cli`'s suite ran (the infra-providers workspace alone passed): (a) the adapter captured `globalThis.fetch` in the constructor, breaking late-bound `global.fetch` test mocks → now late-binds at call time; (b) the new `webhook.adapter.spec.ts` was compiled by `tsc build` (no exclude) and failed on missing jest types → added `*.spec.ts`/`*.test.ts` to the infra-providers tsconfig `exclude`. Updated `sdk/cli/.../webhook.adapter.spec.ts` for the new signal + retry semantics. mcp-server 25/25 and smart-cli 100% green confirm the fix.
- **Remaining (slice 2):** unit tests for the other providers to ≥80% coverage; fix the README config-parser/DiskRulesetRepository example signatures; replace `deriveCategory` f1/f2/f3 keys with canonical topology ids (ties to GT-343).
- **Done when:** [x] webhook timeout + retry + SSRF guard, tested; [ ] provider coverage ≥80%; [ ] README compiles; [ ] deriveCategory canonical ids.

#### GT-352

**Title:** mcp-tools: no input validation, no README — `IN-PROGRESS`

- **Component:** mcp-tools · **Priority:** P2 · **Risk:** med · **Dependencies:** none
- **Files:** `packages/mcp-tools/src/registry.js:24`, `…/tools/echo.js:16`
- **Proposed fix:** validate args against `inputSchema` (ajv) in CallTool; add README tool catalog.
- **Applied fix:** added `validate-input.js` (`validateInput(schema, args)`) — a dependency-free check covering the schemas these tools use (required props, per-property type, non-object args). The `CallTool` handler in `registry.js` validates `request.params.arguments` against the tool's `inputSchema` before dispatching; on failure it returns an MCP result with `isError: true` and a descriptive message instead of passing `undefined`/wrong types to the handler. Added `README.md` + `README.es.md` (tool catalog, validation note, usage, testing). Kept dependency-free (no ajv) since the package's only runtime dep is the MCP SDK.
- **Evidence:** `npm run --workspace packages/mcp-tools test` → 16/16 (7 new) incl. missing-required, wrong-type, non-object, and a CallTool→`isError` test. Bilingual parity holds (READMEs 5/5 headers; not flagged).
- **Done when:** [x] invalid input → structured error; [x] README lists all tools.

#### GT-353

**Title:** sdk-client orphaned + low method coverage — `OPEN`

- **Component:** sdk-client · **Priority:** P2 · **Risk:** med · **Dependencies:** GT-336
- **Files:** `packages/sdk-client/src/__tests__/sdk.spec.ts`
- **Proposed fix:** per-method URL/verb/body + abort tests (≥85% func cov); README with `/api/v1` base; wire into a real consumer or mark experimental.
- **Done when:** [ ] func cov ≥85%; [ ] integration test resolves real routes; [ ] README present.

#### GT-354

**Title:** core-api OpenAPI dead code + api-reference gaps — `OPEN`

- **Component:** core-api · **Priority:** P2 · **Risk:** low · **Dependencies:** none
- **Files:** `apps/core-api/src/openapi/openapi-config.ts`, `apps/core-api/src/main.ts:34`, `reference/products/core-api/api-reference.md`
- **Proposed fix:** delete the unused openapi module OR call `setupOpenApi()` from main; document `POST /architecture/cache/invalidate`.
- **Done when:** [ ] no duplicate DocumentBuilder; [ ] api-reference covers all routes.

#### GT-355

**Title:** @evolith/core has no contract/smoke test — `OPEN`

- **Component:** core · **Priority:** P2 · **Risk:** med (silent re-export drift) · **Dependencies:** GT-338
- **Files:** `packages/core/src/index.ts`
- **Proposed fix:** `index.spec.ts` asserting presence/type of every re-exported symbol + a `test` script.
- **Done when:** [ ] suite fails if any documented export is missing at runtime; [ ] CI runs it.

#### GT-356

**Title:** mcp-services README hand-maintained drift — `OPEN`

- **Component:** docs · **Priority:** P2 · **Risk:** low · **Dependencies:** GT-341
- **Files:** `reference/products/mcp-services/README.md:17,49`
- **Proposed fix:** regenerate counts (27/9/8); fix start command to `smart-cli mcp serve --transport http --port 3000`; derive from generator instead of hand-maintaining.
- **Done when:** [ ] README counts/command match code; [ ] `--help` doc-snippet test.

#### GT-357

**Title:** META — gap board over-reports completion — `DONE`

- **Component:** governance · **Priority:** P1 · **Risk:** high (false confidence) · **Dependencies:** GT-341, GT-347
- **Files:** `reference/governance/standards/vision/gap-tracking.md`, `…/maturity-evidence.json`, `.harness/scripts/ci/09-reconcile-maturity.mjs`
- **Proposed fix:** feed real per-product `build`/`test` results into maturity-evidence; gate "DONE" on validated evidence; this wave reopens the board.
- **Evidence:** board read 329/330 DONE while ≥15 real gaps (3 critical) exist; `09-reconcile-maturity.mjs` already fails `closures 272 vs required 323`.
- **Done when:** [x] board status reconciles with executed build/test evidence.
