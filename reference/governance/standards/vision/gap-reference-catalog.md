# Evolith Core — Gap Reference Catalog

> **Bilingual Navigation:** [Versión en Español](./gap-reference-catalog.es.md)

**Owner:** Evolith Architecture Board
**Status Authority:** [Gap Tracking Board](./gap-tracking.md)
**Closure Authority:** [Gap Closure Evidence Standard](./gap-closure-evidence-standard.md) · [`gap-closure-evidence.json`](./gap-closure-evidence.json)

This catalog explains each gap: problem, purpose, evidence, closure criteria, and references. It is not a tracking board; priority and status are authoritative only in the [Gap Tracking Board](./gap-tracking.md).

---

## 1. Gap Details

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
  - [ ] Native rules cover event ordering guarantees, idempotency, schema-evolution discipline (event-driven) and data-product lineage, retention, and consumption contracts (data-mesh).
  - [ ] OPA counterparts exist with rule-ID parity per GT-151.
  - [ ] Maturity assessment reflects the increased coverage.


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
  - [ ] Playbooks for Phases 1, 2, and 4 exist in EN and ES with procedural checklists tied to each gate's mandatory evidence.
  - [ ] Cross-links from `quality-gates.md` and `phase-gates.rules.json` point to the playbooks.
  - [ ] Bilingual parity validator and validate-docs pass.


#### GT-167

**Title:** Phase-gate evidence templates and acceptance checklists

- **Purpose:** Provide downloadable templates for every gate's mandatory evidence (Observability checklist, Security Incident Report, Test Summary Report, Integration Evidence) so reviewers have a structured surface rather than free-form prose.
- **Evidence:** `phase-gates.rules.json` mandates Observability Validation, security scans, test reports, and integration evidence, but `04-artifact-templates/` lacks dedicated templates for these specific artifacts.
- **Complexity:** M
- **Done when:**
  - [ ] Template files exist for Observability, Security, Test Summary, and Integration evidence (EN + ES), referenced by `phase-gates.rules.json`.
  - [ ] Each gate's playbook (GT-166) cites its template.
  - [ ] A native rule fails when a gate's evidence does not match the template's schema.


#### GT-168

**Title:** Cross-topology composition reference application

- **Purpose:** Ship a working reference application demonstrating a composable manifest (e.g., modular-monolith + event-driven) so adopters can verify the composition validator and learn the integration pattern from running code, not from prose.
- **Evidence:** `topology-dimensions.md` §3 lists five composition examples but no fixture or sample repository exercises them end-to-end.
- **Complexity:** L
- **Done when:**
  - [ ] A reference application (or fixture project) lives under `examples/` (or its equivalent) with a composable manifest exercising at least two topologies.
  - [ ] CI runs the topology validator on the example and asserts a passing composition.
  - [ ] Documentation walks the reader through the example in EN and ES.


#### GT-169

**Title:** Agentic AI operational budgets, credential lifecycle, and runbooks

- **Purpose:** Make the Agentic AI topology operationally complete by defining concrete prompt/context token budgets, MCP tool concurrency limits, satellite credential rotation/revocation, and incident runbooks for common failure modes (agent hang, token overflow, sandbox escape).
- **Evidence:** `reference/architecture/topologies/ai/agentic-ai/operations.md` mentions "execution timeout and resource budget per capability" without quantitative limits; `README.md` declares `toolPolicy` without concurrency caps or credential lifecycle; no runbook covers token overflow or sandbox escape.
- **Complexity:** L
- **Done when:**
  - [ ] Manifest fields declare token budgets, context window ceilings, MCP tool concurrency limits, and credential rotation cadence.
  - [ ] Runbooks cover agent hang, token overflow, unapproved action, and sandbox escape with explicit recovery steps.
  - [ ] Native and OPA rules fail manifests missing the budget fields.


#### GT-170

**Title:** UMS reference product hub

- **Purpose:** Promote the UMS reference materials into a first-class product hub so the reference case has the same product structure as Tracker, Smart CLI, MCP Services, and the Core API hub (GT-156).
- **Evidence:** UMS materials live across SDLC examples and demo files (`ums-technical-overview.md`, `ums-reference-model.md`) but `reference/products/` has no dedicated hub. Cross-links into UMS are scattered.
- **Complexity:** M
- **Done when:**
  - [ ] `reference/products/ums-reference/` exists with README, overview, and reference-model in EN and ES.
  - [ ] All existing UMS references in SDLC and demo materials point to the hub.
  - [ ] Product inventory is regenerated and validated.


#### GT-171

**Title:** Command-as-a-service surface parity audit (CLI vs MCP vs REST)

- **Purpose:** Resolve the ADR-0073 §6 promise of surface parity by enumerating every operation, listing where it is exposed today, and deciding for each gap whether to expose it on the remaining surfaces or to document the exemption (e.g., shell-only commands like `completion`).
- **Evidence:** CLI exposes `alias`, `completion`, `docs`, `drift`, `fixtures`, `history`, `profile`, `standards`, `update` with no MCP or REST equivalents. REST exposes operations not present in MCP and vice versa.
- **Complexity:** L
- **Done when:**
  - [ ] A surface-parity matrix (machine-readable) lists every operation and the surfaces that expose it, with explicit `exempt:<reason>` markers where parity is not desirable.
  - [ ] A validator fails when a new operation lands on one surface without a parity entry.
  - [ ] The matrix is the source of truth for the inventory generator.


#### GT-172

**Title:** Cross-surface contract roundtrip test suite

- **Purpose:** Add an end-to-end suite that exercises the same operation (starting with `gate evaluate` and `phase advance`) through CLI, MCP, and REST and asserts semantically identical envelopes and evidence payloads.
- **Evidence:** CLI E2E, MCP smoke, and REST E2E tests each mock or stub the other surfaces. No test verifies the three surfaces return equivalent `GateEvidence` for the same input.
- **Complexity:** L
- **Done when:**
  - [ ] A roundtrip suite under `tests/contract/` invokes the same input via CLI, MCP (Streamable HTTP), and REST, then asserts envelope and evidence equivalence.
  - [ ] CI runs the suite on PRs that touch any of the three surfaces or shared use cases.
  - [ ] The suite is documented as the contract regression net for ADR-0073.


#### GT-173

**Title:** OpenTelemetry export parity across CLI, MCP, and REST

- **Purpose:** Bring MCP and CLI to OTel parity with the Core API so distributed traces, latency, token usage, and cost can be correlated end-to-end via a single trace ID across all three surfaces.
- **Evidence:** Core API exports OTLP traces (`tracing.ts`); CLI writes local `CommandTrace` JSON; MCP server has no structured trace or metric export.
- **Complexity:** M
- **Done when:**
  - [ ] MCP server emits OTLP traces using the same trace ID propagated through `correlationId` (GT-160) and exports them via OTLP exporters.
  - [ ] CLI optionally exports OTLP when configured, preserving its local trace as the default offline mode.
  - [ ] A shared dashboard demonstrates a single agent-driven workflow stitched across the three surfaces.


#### GT-174

**Title:** Envelope `meta.schemaVersion` and producer/consumer compatibility matrix

- **Purpose:** Add an explicit schema version to the ADR-0073 envelope and publish a producer/consumer compatibility matrix so clients can detect drift and CI can block incompatible releases.
- **Evidence:** Envelope lacks `meta.schemaVersion`. Gap catalog already records (line 356) that no cross-repository compatibility matrix or CI suite exercises producer/consumer versions together.
- **Complexity:** S
- **Done when:**
  - [ ] Envelope schema declares `meta.schemaVersion` as required and pinned per surface.
  - [ ] A machine-readable compatibility matrix (`reference/governance/standards/vision/surface-compatibility.json` or equivalent) records supported producer/consumer pairs.
  - [ ] CI rejects a producer change that would break a supported consumer pair without an explicit migration entry.


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

- **Purpose:** Formalize Winston (`@wilson`) as the lifecycle custodian for external knowledge, with a reproducible promotion pipeline: `candidate → evaluated → accepted → executable`. Each promotion leaves dated evidence and an ADR where required.
- **Evidence:** Current pilot has no promotion pipeline; knowledge enters RAG directly without architectural review.
- **Complexity:** M
- **Done when:**
  - [x] Winston (`@wilson`) owns the lifecycle record and an Architecture Board decision promotes `candidate → evaluated → accepted → executable` with dated evidence and an ADR where required.
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
- **Closed by:** Commit `b443dcd2` makes accepted-topology Native/OPA rule-ID divergence fail closed in both directions and adds regression coverage. All eight topologies align: `15-validate-topology-rule-coverage.mjs` reports 0 errors and 0 warnings.
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
- **Closure evidence:** Commit `861505e`. `.harness/scripts/ci/drift-audit.mjs` (`auditSource` → `DRIFT-FALSE-SUCCESS` for a success claim next to a commented/TODO external op, `DRIFT-UNBOUNDED-CALL` for external calls without budget/redaction/timeout/retry/fail-closed markers; `auditTopology` → `TOPO-MISSING-ARTIFACT`/`TOPO-ORPHAN-REF` for accepted topologies; versioned report + `summarize`). `15-operational-drift-audit.mjs` runs it over the numbered CI capability scripts and every accepted topology manifest and is auto-discovered by `ci-runner.mjs` (pre-commit + CI), failing closed on error findings — currently clean across 17 scripts. `drift-audit.test.mjs` — 10 `node:test` cases covering the historical RAG false-upsert and unbounded-agentic-diff plus compliant examples (no false positives) and topology parity/orphan/draft-skip. Scope note: criterion 3's measurable latency/I-O/token-reduction analysis is a presence+parity+orphan baseline; deeper efficiency heuristics are a tracked follow-up.

#### GT-148

**Title:** Topology-Aware Rule Reference and Coverage Migration Repair

- **Purpose:** Restore a trustworthy, topology-aware coverage report and remove obsolete phase-path references so rule discovery, satellite inheritance, and governance reporting use the canonical topology corpus.
- **Evidence:** Wilson V5 ran `.harness/scripts/generate-rule-coverage.mjs`; it fails before producing a matrix because it reads the deleted `rulesets/architecture/f1-modular-monolith.rules.json` and `rulesets/opa/architecture.rego`. `rulesets/governance/satellite-contracts.rules.json` still declares the same missing F1/F2/F3 files, while the canonical artifacts live beneath `reference/architecture/topologies/progressive-axis/`.
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
- **Closed by:** 8 `.test.rego` files for central `rulesets/opa/*` policies (version-pinning, evidence, governance, taxonomy, ci-cd, cli-readiness, mcp, abac) + 16 `parity-fixtures/` JSON files (2 per topology: compliant + violation) + 8 compiled `<topology>.wasm` bundles + pinned `@open-policy-agent/opa-wasm` evaluator + `16-opa-parity-gate.mjs` and `16-test-topology-opa.mjs` CI steps. Verified: `opa test` runs 25 topology test cases (0 failures); parity gate evaluates 16 fixtures across 8 topologies (0 drift); WASM compiled with OPA v0.65.0.
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
  - `closureCommit`: pending
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
  - `closureCommit`: pending
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
  - `closureCommit`: pending
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
  - `closureCommit`: pending
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
  - `closureCommit`: pending
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
