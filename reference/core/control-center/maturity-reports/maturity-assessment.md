# Evolith Core — Maturity Assessment

> **Bilingual Navigation:** [Versión en Español](./maturity-assessment.es.md)

**Status:** Active Assessment
**Owner:** Evolith Architecture Board
**Created:** 2026-06-10 (consolidates the former `maturity-matrix.md` and `maturity-evaluation.md`)
**Last Updated:** 2026-07-26
**Companion document:** [Gap Tracking Board](../gaps/gap-tracking.md) — the single tracking surface for every open gap referenced here.

---

## 1. Purpose & Frameworks

This is the **single maturity assessment** for Evolith Core. It is a **bidimensional evaluation** measuring two orthogonal aspects of the platform:

**Dimension A — Internal Quality Maturity:** How well is Evolith Core built? Measured against TOGAF ACMM, Cloud WAF, international pattern catalogs, and adapter maturity levels (sections 3–7).

**Dimension B — Governance Scope Maturity:** How broad is Evolith Core's architectural governance reach? Measured against its own multi-topology dimensional model across 5 dimensions and 8 composable topologies, plus AI-Augmented maturity (sections 8–10).

This dual view prevents a common evaluation failure: a platform with high internal quality but narrow governance scope is fundamentally different from one with the same quality and full-spectrum topological coverage. Evolith Core is the latter.

Specifically, the assessment measures:

1. **Compatibility with international standards** — TOGAF ACMM for enterprise process governance maturity, Cloud WAF pillars for technical maturity (section 3), the enterprise microservices pattern/anti-pattern catalog (sections 6–7), and adapter capability maturity (section 5).
2. **Multi-topology governance scope** — coverage across the 5 topology dimensions (progressive-axis, execution, integration, data, ai) with 8 composable topologies. Dual-engine parity is reported per artifact in section 8 (repository corpus, published package, blocking gate) rather than asserted as a single global figure.
3. **AI-Augmented maturity** — position against the 3-level × 5-dimension AI maturity matrix (section 10).
4. **Match with the product vision** — pillar-by-pillar alignment against the [Product Vision Master](../../../../product/suite/vision/evolith-product-vision-master.md) (section 11).
5. **Open gaps** — every deviation found here is tracked exclusively as a `GT-xx` item on the [Gap Tracking Board](../gaps/gap-tracking.md) (section 12). No gap is tracked in this document.

**How to update:** re-score a section when its underlying evidence changes (ADR merged, gate closed, GT item done), update `Last Updated`, and keep gap registration on the board — never here.

---

## 2. Maturity Levels & Evidence-Backed States

The assessment scores against the 5 standard TOGAF ACMM levels (1: Initial to 5: Optimizing). However, to prevent conflating designed capabilities with validated ones, every capability must declare its **Evidence-Backed State**:

* **Visioned** (Weight 0.0) — Concept or strategy only. No formal design.
* **Designed** (Weight 0.2) — Approved Architecture Decision Record (ADR), but no code implementation.
* **Prototyped** (Weight 0.5) — Proof of concept or draft PR. Not production-ready.
* **Implemented** (Weight 0.8) — Merged to `main` and executable, but lacking full operational metrics or automated testing.
* **Validated** (Weight 1.0) — Passing all quality gates, tests, and active in CI/CD.
* **Scaled** (Weight 1.2+) — Multi-region, dynamically auto-scaled, or hardened by chaos engineering.

*Only "Validated" or "Scaled" states grant the full ACMM Level score. "Designed" or "Implemented" states impose an uncertainty penalty on the aggregate score.*

---

## 3. Runtime Architecture Assessment (Well-Architected Pillars)

### Pillar 1: Security & Compliance — **Level 4 (Managed)**
* **State:** `Designed` — downgraded from `Validated` by [GT-576](../gaps/gap-reference-catalog.md#gt-576). The two controls this pillar was scored on (tenant isolation, immutable audit) have an approved ADR and no code.
* **Evidence — executable (runs in CI):**
  * Zero-Cost Security Pipeline via CodeQL ([ADR-0005](../../architecture/adrs/core/0005-automated-sast-quality-gates.md)) — job `codeql-analysis` at `.github/workflows/sdk-cli-ci.yml:362`, alongside Trivy (`sdk-cli-ci.yml:389`) and gitleaks secret detection (`sdk-cli-ci.yml:418`).
  * Automated vulnerability management ([ADR-0009](../../architecture/adrs/core/0009-strict-dependency-pinning-vulnerability-management.md)) — `npm audit --audit-level=high` in the `security-audit` job at `.github/workflows/sdk-cli-ci.yml:83`. Exact-version pinning is the convention in every workspace manifest, but no gate rejects a range specifier yet, so pinning is observed, not enforced.
* **Intent — ADR approved, no implementation (must not be read as evidence):**
  * Multi-tenant data isolation via Row-Level Security ([ADR-0010](../../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.md)) — **not implemented.** `grep -rniE 'row.level.security|current_setting\('` over `src/` matches only topology pattern prose (`src/rulesets/topologies/event-driven/patterns.md`), and no workspace under `src/` declares a PostgreSQL driver or an ORM.
  * Immutable audit trails via CDC ([ADR-0016](../../architecture/adrs/core/0016-immutable-business-audit-trail.md)) — **not implemented.** No CDC component, no `debezium` dependency, and no persistence layer to capture changes from.
* **Path to `Implemented`:** a persistence layer with the RLS policy actually applied and an append-only audit store, each covered by a test that fails when the isolation is removed.
* **Path to Level 5:** automated penetration testing in CI; dynamic secrets rotation.

### Pillar 2: Performance Efficiency — **Level 4 (Managed)**
* **State:** `Implemented` (Needs load-testing validation)
* **Evidence:**
  * Auth graph compilation under 5 ms using Redis ([ADR-0021](../../architecture/adrs/nodejs/0021-high-performance-auth-and-graph-compilation.md)).
  * Dual-protocol strategy: REST public, gRPC internal ([ADR-0027](../../architecture/adrs/nodejs/0027-dual-protocol-rest-grpc-api-gateway.md)).
  * Optimized frontend payloads via BFF Gateway ([ADR-0008](../../architecture/adrs/nodejs/0008-progressive-multimodule-evolution-gateway-bff.md)).
* **Path to Level 5:** serverless auto-scaling; predictive caching.

### Pillar 3: Reliability & Resiliency — **Level 3 (Defined)**
* **State:** `Designed` (ADRs approved, missing circuit breaker tests)
* **Evidence:**
  * Frontend offline resilience via React Query ([ADR-0004](../../architecture/adrs/nodejs/0004-frontend-offline-resilience.md)).
  * Circuit breakers (`opossum`) and retries ([ADR-0011](../../architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.md)).
  * Multi-region DR topology proposed ([ADR-0013](../../architecture/adrs/core/0013-cloud-infrastructure-topology-dr.md)).
* **Path to Level 5:** regular chaos engineering drills; active-active multi-region.

### Pillar 4: Operational Excellence — **Level 4 (Managed)**
* **State:** `Implemented` — downgraded from `Validated` by [GT-576](../gaps/gap-reference-catalog.md#gt-576). The build-orchestration citation named a tool that was never adopted, and one capability in the list has no code.
* **Evidence — executable (runs in CI):**
  * Quality gates enforce coverage thresholds in CI ([ADR-0018](../../architecture/adrs/core/0018-testing-pyramid-quality-gates.md)) — the `Check Coverage Threshold` step at `.github/workflows/sdk-cli-ci.yml:195` fails the `unit-tests` job when statement coverage drops below the normative threshold.
  * Deterministic monorepo builds ([ADR-0001](../../architecture/adrs/core/0001-monorepo-orchestration-principle.md)) — npm workspaces plus TypeScript project references (`npm run build` is `tsc -b tsconfig.json`) over an exact `package-lock.json`. **The Nx orchestration cited in earlier revisions of this document is not adopted:** there is no `nx.json` and no `nx` dependency anywhere in the tree.
  * Telemetry via OpenTelemetry ([ADR-0007](../../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.md)) — `NodeSDK` bootstrapped at `src/apps/core-api/src/tracing.ts:7`. The LGTM collector side is a deployment concern and is not evidenced here.
* **Intent — ADR approved, no implementation (must not be read as evidence):**
  * Feature flagging decouples deployment from release ([ADR-0017](../../architecture/adrs/core/0017-feature-flagging-strategy.md)) — **not implemented.** No flag provider, no flag evaluation code and no flag store exist under `src/`.
* **Path to Level 5:** autonomous blue/green deployments; AI-driven log anomaly detection.

### Pillar 5: Maintainability & Extensibility — **Level 4 (Managed)**
* **State:** `Validated`
* **Evidence — executable (runs in CI):**
  * Hexagonal boundaries decoupling core from infrastructure ([ADR-0002](../../architecture/adrs/nodejs/0002-clean-architecture-nestjs.md)) — enforced by `eslint-plugin-boundaries` and by the repository boundary guard `.harness/scripts/ci/34-boundary-guard-repository.mjs`, executed in the `Validate documentation` job at `.github/workflows/docs.yml:113`.
  * Tactical design patterns ([ADR-0019](../../architecture/adrs/core/0019-tactical-design-patterns-future-proofing.md)) — outcomes travel as explicit result-carrying value types, `GateEvaluationResult` at `src/packages/core-domain/src/evaluation/contracts/evaluation-result.ts:108`, rather than as exceptions. Earlier revisions named a "Result monad": no `Result<T, E>` type and no `neverthrow`/`fp-ts` dependency exists in the tree, so that specific pattern is **not** adopted.
  * Event-driven decoupling of domain modules ([ADR-0015](../../architecture/adrs/core/0015-event-driven-architecture-intra-domain.md)) — port at `src/packages/core-domain/src/application/ports/event-bus.port.ts:10`, adapter at `src/packages/core-domain/src/infrastructure/events/in-memory-event-bus.ts:13`.
* **Path to Level 5:** monolith-to-Dapr transition with zero domain changes ([ADR-0006](../../architecture/adrs/core/0006-microservices-transition-sidecar-pattern.md)). Note: strict hexagonal enforcement in the CLI itself is still open — see [GT-19](../gaps/gap-reference-catalog.md#gt-19).

---

## 4. Technological Exposure Assessment (CLI + MCP)

### Dimension 1: MCP Protocol Conformance & Transport — **Level 4 (Managed)**
* **State:** `Validated`
* **Evidence:** JSON-RPC 2.0 over stdio and official MCP SDK Streamable HTTP; API-key authentication; 29 MCP E2E cases; smoke verifies initialize, discovery, metrics, and gate evaluation over both transports. Executed in CI by the `e2e-tests` job (`.github/workflows/sdk-cli-ci.yml:323`), whose `npm run mcp:smoke` step is at `.github/workflows/sdk-cli-ci.yml:357`. See the generated [maturity reconciliation](./maturity-reconciliation.json).
* **Path to Level 5:** automated protocol conformance against supported MCP specification versions.

### Dimension 2: Test Coverage & Quality Gates — **Level 4 (Managed)**
* **State:** `Validated`
* **Evidence:** 1,206 unit and 121 E2E tests pass from a clean checkout, and statement coverage is 80.65% (4,979/6,173) against the normative 80% threshold, restored under [GT-48](../gaps/gap-reference-catalog.md#gt-48) by testing native rule handlers, validators, and filesystem providers. The threshold is enforced, not merely reported: the `Check Coverage Threshold` step at `.github/workflows/sdk-cli-ci.yml:195` fails the build below it. The generated [maturity reconciliation](./maturity-reconciliation.json) records the executable outcome and source.
* **Path to Level 5:** durable per-run coverage thresholds in the Jest configuration ([GT-50](../gaps/gap-reference-catalog.md#gt-50)) and mutation testing.

### Dimension 3: Governance Exposure Completeness — **Level 4 (Managed)**
* **State:** `Validated`
* **Evidence:** MCP tools, resources, and prompts cover validation, agents, architecture, SDLC, prioritization, metrics, and gate evaluation with runtime-schema conformance checks. The inventory is kept honest by the bidirectional surface-parity guard `.harness/scripts/ci/24-check-surface-parity.mjs`, executed at `.github/workflows/docs.yml:92`: every operation in the source tree must appear in the matrix, and every matrix reference must resolve to real code. Absolute counts are deliberately not restated here — earlier revisions quoted 47 in this section and 50 in section 10.1, and no gate reconciled the two.
* **Path to Level 5:** hot-reload of rulesets and measured adoption across satellite repositories.

### Dimension 4: CLI Developer Experience — **Level 4 (Managed)**
* **State:** `Validated`
* **Evidence:** the `@beyondnet/evolith-cli@1.1.0` package installs from the canonical workspace lockfile, verified by the `package-integrity` job at `.github/workflows/sdk-cli-ci.yml:257`; lint, build, E2E, and MCP smoke pass from a clean checkout; shell completion and bilingual documentation are available. Public product documentation and release facts are synchronized from a generated [Product Surface Inventory](../../../../product/products/smart-cli/product-inventory.md), with CI rejecting drift and placeholder pages ([GT-47](../gaps/gap-reference-catalog.md#gt-47)).
* **Path to Level 5:** publish the inventory as a discoverable capability manifest consumed by satellite repositories.

### Dimension 5: Federated Governance Runtime Enforcement — **Level 3 (Defined)**
* **State:** `Designed` (Rules exist, content validation missing)
* **Evidence:** inheritance model, satellite contracts, and Open-Core boundary rules defined; `evolith-cli validate` executable by any satellite; CI composite action `evolith-validate` available for satellite PR gates.
* **Path to Level 4:** phase-gate evidence deepened from existence-only checks to content/threshold validation ([GT-08](../gaps/gap-reference-catalog.md#gt-08)–[GT-11](../gaps/gap-reference-catalog.md#gt-11)); ACL runtime adapters (Tracker scope).

---

## 5. Adapter Capability Maturity (Agent Runtime)

This dimension measures the maturity of the interaction surfaces and internal orchestration ports against the Evolith Core stateless boundary rules.

**Maturity Levels:**
* **M0 — Not identified:** Capability conceptualized but no port/interface defined.
* **M1 — Documented:** Documented requirement or design, no code.
* **M2 — Port defined:** TypeScript interface (`IPort`) exists.
* **M3 — Stub/InMemory adapter implemented:** Implementation exists but simulates behavior (not production-ready).
* **M4 — Production adapter implemented:** Real integration implemented (e.g., HTTP, Redis).
* **M5 — Governed, observable and tested:** Fully covered by OPA, tracing, approval flows, and CI gates.

### 5.1 Interaction Adapters (M-Level Assessment)

All 6 interaction adapters have been implemented as production adapters (M4). None have reached M5.

| Adapter | M-Level | Tests | Priority | Gaps to M5 |
|---|:---:|:---|:---|:---|
| `McpInteractionAdapter` | **M4** | 11 unit tests | High | OPA guard, tracing, manifest registration |
| `SmartCliCommandInteractionAdapter` | **M4** | None | Critical | Unit tests, edge cases, manifest registration |
| `SmartCliChatInteractionAdapter` | **M4** | None | Critical | Unit tests, edge cases, manifest registration |
| `HermesChatBoxInteractionAdapter` | **M4** | None | High | Unit tests, manifest registration, standalone docs |
| `OpenCodeInteractionAdapter` | **M4** | None | Medium | Distinct sourceInterface, tests, manifest |
| `ExternalTriggerInteractionAdapter` | **M4** | None | High | Input validation, tests, manifest registration |

**Distribution:** 0 M0-M3 · **6 M4** · 0 M5

**Cross-cutting gaps to M5:** Only `McpInteractionAdapter` has test coverage. The remaining 5 adapters share: missing unit tests, no manifest registration, no agent definition references, no adapter-level OPA/trace/HITL integration (handled downstream in the runtime pipeline but not at adapter level).

### 5.2 Port Adapters (Capability Inventory)

| Capability / Port | Objective | Currently Implemented | State | Pending / Recommended | Priority |
|---|---|---|---|---|---|
| **Agent Engine** | Replaceable agentic reasoning. | `StubAgentEngineAdapter`, `HermesAgentAdapter`, `SwarmsAgentAdapter`, `RoutingAgentAdapter` | `Implemented` | `OpenCodeAgentAdapter`, `OllamaLocalAgentAdapter`, `OpenAIAdapter`, `ClaudeAdapter`, `GeminiAdapter` | Medium |
| **Engine Routing** | Select engine by intent or context. | `RoutingAgentAdapter` | `Partial` | `PolicyBasedEngineRouter`, `RiskAwareEngineRouter`, `CostAwareEngineRouter`, `PrivacyAwareEngineRouter` | High |
| **Harness Execution** | Execute simulated or real `.harness` capabilities. | `InMemoryHarnessAdapter`, `HarnessProcessAdapter` | `Implemented` | `DockerHarnessAdapter`, `KubernetesJobHarnessAdapter`, `RemoteHarnessAdapter`, `GitHubActionsHarnessAdapter` | Medium |
| **Core Evaluation** | Evaluate rules, gaps, risks, and governance. | `StubCoreEvaluationAdapter`, `InProcessCoreEvaluationAdapter`, `HttpCoreEvaluationAdapter` | `Implemented` | `GrpcCoreEvaluationAdapter`, `BatchCoreEvaluationAdapter`, `CachedCoreEvaluationAdapter` | Medium |
| **Policy / OPA** | Validate policies and block forbidden actions. | `StubPolicyValidationAdapter`, `OpaCliPolicyValidationAdapter` | `Implemented` | `OpaHttpAdapter`, `ConftestAdapter`, `KyvernoAdapter`, `PolicyBundleRegistryAdapter` | High |
| **Tracker Trace** | Publish traceability to memory or Tracker. | `InMemoryTrackerTraceAdapter`, `HttpTrackerTraceAdapter` | `Implemented` | `EventBusTraceAdapter`, `KafkaTraceAdapter`, `OpenTelemetryTraceAdapter`, `AuditLogTraceAdapter` | Medium |
| **Memory** | Maintain temporary/persisted runtime memory. | `InMemoryMemoryAdapter`, `FileMemoryAdapter` | `Implemented` | `RedisMemoryAdapter`, `PostgresMemoryAdapter`, `VectorMemoryAdapter`, `ObsidianVaultMemoryAdapter` | Medium |
| **Skill Registry** | Resolve intents/tools to governed capabilities. | `LocalSkillRegistryAdapter`, `DEFAULT_SKILLS` | `Implemented` | `RemoteSkillRegistryAdapter`, `GitSkillRegistryAdapter`, `MarketplaceSkillRegistryAdapter`, `TenantSkillBundleAdapter` | High |
| **Communication Gateway** | Adapt existing communication surfaces. | `CliCommunicationGatewayAdapter` + 6 interaction adapters (see 5.1) | `Implemented` | `WebhookInteractionAdapter` | Critical |
| **Scheduler** | Schedule or defer runtime executions. | `InMemorySchedulerAdapter`, `FileSchedulerAdapter` | `Implemented` | `CronSchedulerAdapter`, `TemporalAdapter`, `BullMQSchedulerAdapter`, `KubernetesCronJobAdapter` | Low |
| **Approval / HITL** | Manage human-in-the-loop approval or default blocking. | `AutoApprovalAdapter`, `DenyByDefaultApprovalAdapter` | `Partial` | `TrackerApprovalAdapter`, `GitHubApprovalAdapter`, `SlackApprovalAdapter`, `TeamsApprovalAdapter`, `EmailApprovalAdapter` | High |
| **Knowledge / RAG** | Query ADRs, blueprints, rulesets before suggesting actions. | `PgVectorKnowledgeAdapter` (deploy-gated), `InMemoryMemoryAdapter` (default) | `Implemented (deploy-gated)` | Live pgvector + sidecar run | High |
| **Observability** | Observe runtime, engines, latency, errors, and blocks. | Partial via Tracker Trace. | `Partial` | `OpenTelemetryAdapter`, `PrometheusMetricsAdapter`, `StructuredAuditAdapter` | Medium |
| **GitHub Automation** | Create satellite repos, issues, PRs, CI from governed flows. | Not implemented as direct runtime adapter. | `Not implemented` | `GitHubRepositoryAdapter`, `GitHubIssueAdapter`, `GitHubPullRequestAdapter`, `GitHubActionsAdapter` | Medium |
| **Notifications / Collaboration** | Notify blocked gates, pending approvals, and results. | Not implemented as direct runtime adapter. | `Not implemented` | `SlackAdapter`, `TeamsAdapter`, `EmailNotificationAdapter`, `DiscordAdapter` | Medium |
| **Secrets / Config** | Manage credentials, endpoints, engine selection, and config. | Partial via bootstrap/overrides. | `Partial` | `VaultSecretAdapter`, `EnvConfigAdapter`, `RemoteConfigAdapter`, `PolicyBundleConfigAdapter` | High |

---

## 6. Pattern Maturity Matrix (International Pattern Catalog)

| Pattern Cluster | Specific Pattern | Applicability | Evidence-Backed State | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Integration** | **Strangler Fig** | Critical Core | `Validated` | Foundational strategy: modules logically isolated for incremental extraction without downtime. |
| **Composition** | **BFF (Backend for Frontend)** | Core Mandatory | `Implemented` | Specialized NestJS layers per device ([ADR-0008](../../architecture/adrs/nodejs/0008-progressive-multimodule-evolution-gateway-bff.md)). |
| **Reliability** | **Circuit Breaker** | Operational | `Designed` | Distributed breakers sharing state via Redis ([ADR-0011](../../architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.md)) + edge healthchecks. |
| **Database** | **Schema Per Context** | Core Mandatory | `Designed` | Intended to prevent cross-domain join poisoning ([ADR-0031](../../architecture/adrs/core/0031-schema-per-context-domain-event-catalog.md)). Downgraded from `Validated` by [GT-576](../gaps/gap-reference-catalog.md#gt-576): no workspace under `src/` declares a database driver or ORM, so no schema boundary exists to validate. |
| **Scalability** | **CQRS (Basic)** | Optional | `Visioned` | Read-models only when write contention demands it. |
| **Consistency** | **Saga Pattern** | Distributed Future | `Visioned` | Reserved for Phase 3+ distributed transactions. |
| **Messaging** | **Transactional Outbox** | Phase 2+ | `Visioned` | Atomic DB-state/event consistency at async scale. |

**Legend:** *Adopted* — fully designed and verified in specs. *Roadmap* — infrastructure-ready, implementation deferred to demand. *Incompatible* — none currently identified.

---

## 7. Anti-Pattern Immunization

The architecture deploys explicit "antibodies" against the six highest-risk anti-patterns. Summary (criticality · defense):

| Anti-Pattern | Criticality | Immunization Defense |
| :--- | :--- | :--- |
| **Distributed Monolith** | EXTREME | Async event bus ([ADR-0015](../../architecture/adrs/core/0015-event-driven-architecture-intra-domain.md)) + hexagonal isolation ([ADR-0002](../../architecture/adrs/nodejs/0002-clean-architecture-nestjs.md)): fire-and-forget messaging, no synchronous cross-module chains. |
| **Shared Database Entanglement** | VERY HIGH | *Designed defense, not yet deployed.* Isolated PostgreSQL schema per context ([ADR-0031](../../architecture/adrs/core/0031-schema-per-context-domain-event-catalog.md)) with cross-schema joins physically blocked — no persistence layer exists yet, so the anti-pattern is currently absent rather than immunized. |
| **Fat Controller / Smart Pipe** | HIGH | Dumb Pipes / Smart Endpoints: gateway runs only agnostic policies (JWT, SSL, rate limit); all business decisions live in the tested application hexagon. |
| **Log Shards (Blindness)** | HIGH | OTel distributed tracing ([ADR-0007](../../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.md)): one TraceParent ID from request inception to DB response. |
| **God Module** | HIGH | Regular boundary audits against the [UMS Applied Reference Model](../../../../product/research/demo/README.md); extraction-readiness playbook splits before a module grows too large. |
| **Leaky Shared Library** | HIGH | Shared libs restricted to generic primitives and DDD utilities; domain objects banned, enforced via `eslint-plugin-boundaries`. |

**Resiliency strength: DESIGNED** — circuit breakers + contract testing are specified to shield the backend from cascading failure. Dual-layer tenant isolation is design intent only: with no persistence layer in the tree there is nothing to contain, and the containment claim previously made here was not provable (see Pillar 1).
**Performance overhead: LOW** — 4-tier caching (Client → CDN → BFF → Core) and gRPC internal backbones.
**Residual risk controls:** weekly K6 performance snapshots and Pact JS contract verification in CI ([ADR-0037](../../architecture/adrs/core/0037-performance-concurrency-chaos-strategy.md)).

---

## 8. Topology Governance Scope (Multi-Dimensional Coverage)

> *This is the dimension that distinguishes Evolith from conventional architecture frameworks: not just internal quality, but breadth of governance reach.*

### 8.1 Dimensional Model

Evolith Core does not treat architecture topologies as mutually exclusive maturity labels. The [Topology Dimensions Model](../../architecture/topologies/topology-dimensions.md) (governed by [ADR-0079](../../architecture/adrs/core/0079-multi-topology-reference-corpus.md)) defines 5 dimensions with 8 composable topologies.

| Dimension | Question Answered | Topologies |
|---|---|---|
| `progressive-axis` | How is the system decomposed and evolved? | `modular-monolith`, `distributed-modules`, `microservices` |
| `execution` | Where and how does code execute? | `serverless`, `edge-computing` |
| `integration` | How do components coordinate? | `event-driven` |
| `data` | How is data ownership distributed? | `data-mesh` |
| `ai` | How are AI agents governed? | `agentic-ai` |

**Coverage: 5/5 dimensions (100%), 8/8 topologies (100%)**

### 8.2 Per-Topology Maturity State

| Topology | Dimension | Status | Native Rules | OPA Policy | OPA Tests | WASM | Config Schema | Fixtures | Bilingual | Budgets | ADRs |
|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Modular Monolith** | progressive-axis | Accepted v1.0.0 | YES | YES | YES | YES | YES | YES | YES | — | 4 |
| **Distributed Modules** | progressive-axis | Accepted v1.0.0 | YES | YES | YES | YES | YES | YES | YES | — | 3 |
| **Microservices** | progressive-axis | Accepted v1.0.0 | YES | YES | YES | YES | YES | YES | YES | — | 4 |
| **Serverless** | execution | Accepted v1.0.0 | YES | YES | YES | YES | YES | YES | YES | YES | 2 |
| **Edge Computing** | execution | Accepted v1.0.0 | YES | YES | YES | YES | YES | YES | YES | YES | 2 |
| **Event-Driven** | integration | Accepted v1.0.0 | YES | YES | YES | YES | YES | YES | YES | — | 2 |
| **Data Mesh** | data | Accepted v1.0.0 | YES | YES | YES | YES | YES | YES | YES | — | 2 |
| **Agentic AI** | ai | Accepted v0.1.0 | YES | YES | YES | YES | YES | YES | YES | YES | 5 |

**The table above describes the repository corpus, not the shipped artifact.** All 8 topologies do carry Native `.rules.json` + OPA `.rego` + `.test.rego` + `.wasm` in-tree, split across two roots: the 3 progressive-axis topologies under `reference/core/architecture/topologies/progressive-axis/`, the other 5 under `src/rulesets/topologies/`. Parity as *shipped* and as *gated* is materially narrower — see 8.6.

### 8.3 Composition Matrix

Topologies from different dimensions compose via `spec.compatibility.composableWith`. Two hub topologies provide maximum composability:

| Hub Topology | Composes With |
|---|---|
| **Event-Driven** | ALL 7 other topologies |
| **Agentic AI** | ALL 7 other topologies |

**Reference composition:** `modular-monolith + event-driven` (validates in CI via `22-validate-topology-composition.mjs`).

### 8.4 Operational Budgets

Execution and AI topologies enforce operational budget contracts:

| Topology | Budget Fields |
|---|---|
| Serverless | `latencyBudgetMs=1500`, `coldStartCeilingMs=1000`, `costCeilingPerExecutionCents=1` |
| Edge Computing | `latencyBudgetMs=200`, `coldStartCeilingMs=300`, `costCeilingPerExecutionCents=1` |
| Agentic AI | `tokenBudgetPerExecution=100000`, `credentialRotationIntervalHours=24`, `sandboxTimeoutMs=30000` |

### 8.5 CI Validation Infrastructure

| Script | Purpose |
|---|---|
| `validate-topology-manifests.mjs` | Validates all manifests against schema, budgets, R-27 corpus completeness |
| `22-validate-topology-composition.mjs` | Cross-topology composition validation, pairwise composability |
| `26-validate-topology-rule-coverage.mjs` | Native/OPA rule-ID coverage per manifest |
| `28-test-topology-opa.mjs` | OPA test suites — scans only `reference/core/architecture/topologies` (`28-test-topology-opa.mjs:15`), so it reaches 3 of 8 topologies, and no workflow invokes it |
| `30-validate-phase-topology-disjoint.mjs` | Namespace anti-collision (SDLC phases vs topology IDs) |

Only `22-validate-topology-composition.mjs` and `26-validate-topology-rule-coverage.mjs` run per commit (dispatched by the topology branch of `.harness/scripts/ci-runner.mjs`). The full Native/OPA semantic parity sweep `27-opa-parity-gate.mjs` runs exclusively on the daily schedule at `.github/workflows/opa-parity.yml:36`; it is not a required check on `main`.

### 8.6 Governance Scope Score

| Indicator | Value |
|---|---|
| Dimensions governed | **5/5 (100%)** |
| Topologies governed | **8/8 (100%)** |
| Dual-engine parity — repository corpus | **8/8 (100%)** (`.rules.json` + `.rego` + `.test.rego` + `.wasm` present in-tree) |
| Dual-engine parity — published artifact `@beyondnet/evolith-cli@1.1.0` | **5/8 (63%)** — `rulesets/topologies/` ships OPA policy + test + WASM for `agentic-ai`, `data-mesh`, `edge-computing`, `event-driven`, `serverless`. The 3 progressive-axis topologies ship Native `.rules.json` only; the package carries no `.rego` or `.wasm` for them. |
| Dual-engine parity — covered by a blocking gate | **0/8** — `28-test-topology-opa.mjs` (3 topologies in scope) is invoked by no workflow, and the full sweep `27-opa-parity-gate.mjs` is schedule-only. |
| Operational budgets enforced | **3/3 required** |
| Compositions validated in CI | Infrastructure complete |
| Topology-specific ADRs | 13 across 8 topologies |

**Governance Scope: corpus COMPLETE, distribution and enforcement INCOMPLETE.** Evolith Core authors rules for the full spectrum of topologies in its dimensional model; it does not yet ship, nor block on, the OPA half of that corpus for every topology.

---

## 9. Product Vision Alignment

Pillar-by-pillar match against the [Product Vision Master](../../../../product/suite/vision/evolith-product-vision-master.md). Detailed component scores live in the [Baseline Snapshot](../gaps/gap-reference-catalog.md#2-historical-baseline-snapshot) of the Gap Reference Catalog.

| Vision Pillar | Vision Requirement | Evidence-Backed State | Notes |
|---|---|:---:|---|
| **Evolith Core** | Reference Corpus (Constitution): directives, ADRs, standards, rulesets, schemas | `Implemented` | See live [Reference Corpus Inventory](./inventory-summary.md). ACL integration rules defined but not executed (Tracker scope). |
| **Evolith Tracker** | SaaS SDLC orchestrator | `Visioned` | Separate repository; Core's obligation is the API/MCP contract it will consume. |
| **Technological Exposure** | CLI + Core API + MCP serving governance as real-time context | `Implemented` | Core API (NestJS) exposes REST/GraphQL/MCP for external orchestrators. |
| **5 Phase Gates** | Auditable gates with blocking evidence | `Implemented` | All 5 gates evaluate; blocking criteria are existence-only checks. |
| **Federated Governance** | Hub-and-spoke inheritance, satellite validation | `Designed` | Inheritance rules + satellite CI composite action shipped; runtime ACLs deferred. |
| **Open-Core Strategy** | Free CLI+MCP tier publicly available | `Prototyped` | Publication blocked only by release logistics ([GT-18](../gaps/gap-reference-catalog.md#gt-18)). |

---

## 10. AI-Augmented Dimension

Evolith Core adopts the AI-Augmented engineering section. The complementary [AI Maturity Matrix](../../foundations/common-rules/ai-augmented/07-maturity-model/ai-maturity-matrix.md) defines 3 levels across 5 dimensions.

### 10.1 Per-Dimension Assessment

| Dimension | Level | Key Evidence | Gap to Level 3 |
|---|:---:|---|---|
| **Documentation** | **2 (AI-Integrated)** | AGENTS.md (132 lines, updated regularly), MCP Tools Catalog (50 tools), Model Catalog, Router Agent + 10 Discovery Agents with declared scope/inputs/outputs/handoff | Agent-specific ADRs, C4 architecture diagrams of orchestration topology |
| **Tools** | **3 (AI-Orchestrated)** | 50 registered MCP tools, recursive agentic tool-calling with budget propagation (ADR-0002 §4), RAG semantic memory via pgvector + Qwen3 embedder, OTel/Langfuse observability, `LangfuseEvidenceAdapter` mapping traces/cost/latency | — (already Level 3) |
| **Verification** | **2 (AI-Integrated)** | `.husky/pre-commit` (5 CI modes), 12 GitHub Actions workflows, daily OPA parity validation, architecture boundary guards, documentation validation, coverage gates (80.65%) | Autonomous verification agents patrolling continuously (Winston audit exists but requires manual invocation) |
| **Models** | **2 (AI-Integrated)** | ADR-AI-003 formal governance, tiered model catalog (Large/Flash/Local), cost-per-token optimization targeting 30-40% reduction, Langfuse cost tracking infrastructure | Live token cost dashboard per agent/feature, automatic role-based multi-model routing |
| **Security** | **2 (AI-Integrated)** | OAuth/API key/JWT authentication with constant-time comparison, ABAC dual-engine (OPA + TypeScript), role-based tool filtering, `AuditLogger` with redaction, HITL policy for destructive tools | Immutable audit storage, execution sandboxing, adaptive rate limiting with cost-based limits |

### 10.2 AI Maturity Summary

| Level | Dimensions at this level |
|---|---|
| Level 1 (AI-Assisted) | 0 |
| Level 2 (AI-Integrated) | 4 (Documentation, Verification, Models, Security) |
| Level 3 (AI-Orchestrated) | 1 (Tools) |

**Overall AI Maturity: Level 2.2 (AI-Integrated → AI-Orchestrated)**

### 10.3 Certification Evidence

| Level | Criterion | Status |
|---|---|---|
| **Level 1** | `.husky/pre-commit` exists | PASS |
| **Level 1** | `AGENTS.md` updated within 30 days | PASS |
| **Level 2** | JSON Schema tool catalog published | PASS (MCP Tools Catalog) |
| **Level 2** | CI logs with model mocks | PASS (OPA parity + architecture boundary guards) |
| **Level 2** | Backend does not expose untokenized PII to LLM | PASS (SENSITIVE_ARG_KEYS redaction) |
| **Level 3** | Token cost dashboard per agent/feature | NOT MET (infrastructure exists, live dashboard missing) |
| **Level 3** | HITL switch blocking simulated transaction | PARTIAL (policy defined, full demo not evidenced) |
| **Level 3** | Multi-agent architecture diagram approved | PARTIAL (agents documented, no C4 diagram)

---

## 11. BMAD Intelligence Update

This maturity assessment explicitly feeds the **BMAD Intelligence Feedback Loop**. Insights generated here inform internal agent capabilities, evaluation rules, and standard checklists:

* **Updated Agents:** `winston` (Audit), `architect` (Architecture) now evaluate port/adapter compliance.
* **New Skills Added:** `adapter-maturity-analysis`, `interaction-adapter-gap-analysis`.
* **New Rules Added:** `core-must-remain-stateless`, `external-tech-must-use-adapter`, `chat-interfaces-cannot-execute-critical-actions`.
* **New Checklists:** `Adapter Maturity Checklist`, `Interaction Adapter Readiness Checklist`.

These intelligence resources are versioned inside `.bmad-core/agents/` and apply continuously to future PRs and governance audits.

---

## 12. Executive Scoring & Open Gaps

### Dimension A: Internal Quality Score (TOGAF ACMM)

| Layer | Weight | Score (Evidence-Backed) |
|-------|--------|-------------------------|
| Runtime Architecture (Well-Architected pillars) | 60% | 3.4 ± 0.4 |
| Technological Exposure (CLI + MCP) | 40% | 3.2 ± 0.4 |

**Internal Quality: 3.32 ± 0.4 / 5.0 (Defined → Managed)**

### Dimension B: Governance Scope Score

| Indicator | Value |
|---|---|
| Topology dimensions governed | 5/5 (100%) |
| Topologies with dual-engine parity (repository corpus) | 8/8 (100%) |
| Topologies with dual-engine parity (published `@beyondnet/evolith-cli@1.1.0`) | 5/8 (63%) |
| Interaction adapters at M4 | 6/6 (100%) |
| Anti-patterns immunized | 5/6 (83%) — Shared Database Entanglement has a designed defense only (section 7) |
| AI maturity (avg across 5 dimensions) | 2.2/3 (AI-Integrated) |

**Governance Scope: COMPLETE across all 5 topology dimensions**

### Combined Bidimensional Verdict

> **Evolith Core is a multi-dimensional architectural governance platform with internal quality level 3.32/5 (Defined → Managed).** Its governance scope covers 100% of defined topologies (5 dimensions × 8 composable topologies) with dual-engine parity in the repository corpus, though only 5 of those 8 ship their OPA half in the published `@beyondnet/evolith-cli@1.1.0` package and none is covered by a blocking OPA gate on `main` (section 8.6). All 6 interaction adapters are production-ready (M4), 5 of the 6 critical anti-patterns are immunized in code (the sixth has a designed defense awaiting a persistence layer), and the AI-Augmented dimension has one capability (Tools) at Level 3 (AI-Orchestrated). Primary gaps: security pillar reduced to `Designed` for want of a persistence layer, reliability pillar (Level 3→4), adapter M4→M5 progression (tests, OPA guard, tracing), and AI Verification/Models/Security (Level 2→3).

### Current Reconciliation

Current totals are not maintained as narrative text. The machine-readable [Maturity Reconciliation](./maturity-reconciliation.json) is generated from the canonical Core board, closure registry, inventories, and CLI release metadata. `node .harness/scripts/ci/09-reconcile-maturity.mjs --check` fails when that snapshot drifts.

Tracker and Product Suite maturity are explicitly excluded from the Core score because they have independent ownership and evidence lifecycles. Their product state cannot inflate this assessment.

---

*This is the single maturity assessment for Evolith Core. Gap tracking lives exclusively on the [Gap Tracking Board](../gaps/gap-tracking.md).*

---
[Back to Vision Index](../README.md)
