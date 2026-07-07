# Evolith Core — Maturity Assessment

> **Bilingual Navigation:** [Versión en Español](./maturity-assessment.es.md)

**Status:** Active Assessment
**Owner:** Evolith Architecture Board
**Created:** 2026-06-10 (consolidates the former `maturity-matrix.md` and `maturity-evaluation.md`)
**Last Updated:** 2026-06-22
**Companion document:** [Gap Tracking Board](../gaps/gap-tracking.md) — the single tracking surface for every open gap referenced here.

---

## 1. Purpose & Frameworks

This is the **single maturity assessment** for Evolith Core. It measures three things:

1. **Compatibility with international standards** — TOGAF Architecture Capability Maturity Model (ACMM) for enterprise process and governance maturity, plus the Cloud Well-Architected Framework (WAF) pillars for technical maturity (section 3) and the enterprise microservices pattern/anti-pattern catalog (sections 5–6).
2. **Match with the product vision** — pillar-by-pillar alignment against the [Product Vision Master](../../../../product/suite/vision/evolith-product-vision-master.md) (section 7).
3. **Open gaps** — every deviation found here is tracked exclusively as a `GT-xx` item on the [Gap Tracking Board](../gaps/gap-tracking.md) (section 8). No gap is tracked in this document.

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
* **State:** `Validated`
* **Evidence:**
  * Zero-Cost Security Pipeline via CodeQL ([ADR-0005](../../architecture/adrs/core/0005-automated-sast-quality-gates.md)).
  * Strict dependency version pinning (exact lockfiles, no ranges) with automated vulnerability management ([ADR-0009](../../architecture/adrs/core/0009-strict-dependency-pinning-vulnerability-management.md)).
  * Multi-tenant data isolation via Row-Level Security ([ADR-0010](../../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.md)).
  * Immutable audit trails via CDC ([ADR-0016](../../architecture/adrs/core/0016-immutable-business-audit-trail.md)).
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
* **State:** `Validated`
* **Evidence:**
  * Deterministic monorepo builds via Nx ([ADR-0001](../../architecture/adrs/core/0001-monorepo-orchestration-principle.md)).
  * Telemetry via LGTM stack and OpenTelemetry ([ADR-0007](../../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.md)).
  * Feature flagging decouples deployment from release ([ADR-0017](../../architecture/adrs/core/0017-feature-flagging-strategy.md)).
  * Quality gates enforce coverage thresholds in CI ([ADR-0018](../../architecture/adrs/core/0018-testing-pyramid-quality-gates.md)).
* **Path to Level 5:** autonomous blue/green deployments; AI-driven log anomaly detection.

### Pillar 5: Maintainability & Extensibility — **Level 4 (Managed)**
* **State:** `Validated`
* **Evidence:**
  * Hexagonal boundaries decoupling core from infrastructure ([ADR-0002](../../architecture/adrs/nodejs/0002-clean-architecture-nestjs.md)).
  * Tactical design patterns (Result monad) ([ADR-0019](../../architecture/adrs/core/0019-tactical-design-patterns-future-proofing.md)).
  * Event-driven decoupling of domain modules ([ADR-0015](../../architecture/adrs/core/0015-event-driven-architecture-intra-domain.md)).
* **Path to Level 5:** monolith-to-Dapr transition with zero domain changes ([ADR-0006](../../architecture/adrs/core/0006-microservices-transition-sidecar-pattern.md)). Note: strict hexagonal enforcement in the CLI itself is still open — see [GT-19](../gaps/gap-reference-catalog.md#gt-19).

---

## 4. Technological Exposure Assessment (CLI + MCP)

### Dimension 1: MCP Protocol Conformance & Transport — **Level 4 (Managed)**
* **State:** `Validated`
* **Evidence:** JSON-RPC 2.0 over stdio and official MCP SDK Streamable HTTP; API-key authentication; 29 MCP E2E cases; smoke verifies initialize, discovery, metrics, and gate evaluation over both transports. See the generated [maturity reconciliation](./maturity-reconciliation.json).
* **Path to Level 5:** automated protocol conformance against supported MCP specification versions.

### Dimension 2: Test Coverage & Quality Gates — **Level 4 (Managed)**
* **State:** `Validated`
* **Evidence:** 1,206 unit and 121 E2E tests pass from a clean checkout, and statement coverage is 80.65% (4,979/6,173) against the normative 80% threshold, restored under [GT-48](../gaps/gap-reference-catalog.md#gt-48) by testing native rule handlers, validators, and filesystem providers. The generated [maturity reconciliation](./maturity-reconciliation.json) records the executable outcome and source.
* **Path to Level 5:** durable per-run coverage thresholds in the Jest configuration ([GT-50](../gaps/gap-reference-catalog.md#gt-50)) and mutation testing.

### Dimension 3: Governance Exposure Completeness — **Level 4 (Managed)**
* **State:** `Validated`
* **Evidence:** 32 MCP tools, 9 resources, and 8 prompts cover validation, agents, architecture, SDLC, prioritization, metrics, and gate evaluation with runtime-schema conformance checks.
* **Path to Level 5:** hot-reload of rulesets and measured adoption across satellite repositories.

### Dimension 4: CLI Developer Experience — **Level 4 (Managed)**
* **State:** `Validated`
* **Evidence:** the `@evolith/smart-cli@1.1.0` package installs from the canonical workspace lockfile; lint, build, E2E, and MCP smoke pass from a clean checkout; shell completion and bilingual documentation are available. Public product documentation and release facts are synchronized from a generated [Product Surface Inventory](../../../../product/products/smart-cli/product-inventory.md), with CI rejecting drift and placeholder pages ([GT-47](../gaps/gap-reference-catalog.md#gt-47)).
* **Path to Level 5:** publish the inventory as a discoverable capability manifest consumed by satellite repositories.

### Dimension 5: Federated Governance Runtime Enforcement — **Level 3 (Defined)**
* **State:** `Designed` (Rules exist, content validation missing)
* **Evidence:** inheritance model, satellite contracts, and Open-Core boundary rules defined; `smart-cli validate` executable by any satellite; CI composite action `evolith-validate` available for satellite PR gates.
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

| Capability / Port | Objective | Currently Implemented in Core/Runtime | State | Pending / Recommended | Closing Benefit | Priority |
|---|---|---|---|---|---|---|
| **Agent Engine** | Replaceable agentic reasoning. | `StubAgentEngineAdapter`, `HermesAgentAdapter`, `SwarmsAgentAdapter`, `RoutingAgentAdapter` | `Implemented` | `OpenCodeAgentAdapter`, `OllamaLocalAgentAdapter`, `OpenAIAdapter`, `ClaudeAdapter`, `GeminiAdapter` | Allows various agentic engines without coupling Evolith to Hermes. Favors privacy, cost, flexibility. | Medium |
| **Engine Routing** | Select engine by intent or context. | `RoutingAgentAdapter` | `Partial` | `PolicyBasedEngineRouter`, `RiskAwareEngineRouter`, `CostAwareEngineRouter`, `PrivacyAwareEngineRouter` | Allows choosing engine by risk, cost, SDLC phase, privacy, or policy. | High |
| **Harness Execution** | Execute simulated or real `.harness` capabilities. | `InMemoryHarnessAdapter`, `HarnessProcessAdapter` | `Implemented` | `DockerHarnessAdapter`, `KubernetesJobHarnessAdapter`, `RemoteHarnessAdapter`, `GitHubActionsHarnessAdapter` | Isolates validations, allows remote execution, CI/CD, and Kubernetes. | Medium |
| **Core Evaluation** | Evaluate rules, gaps, risks, and governance. | `StubCoreEvaluationAdapter`, `InProcessCoreEvaluationAdapter`, `HttpCoreEvaluationAdapter` | `Implemented` | `GrpcCoreEvaluationAdapter`, `BatchCoreEvaluationAdapter`, `CachedCoreEvaluationAdapter` | Improves performance, scalability, and massive evaluation. | Medium |
| **Policy / OPA** | Validate policies and block forbidden actions. | `StubPolicyValidationAdapter`, `OpaCliPolicyValidationAdapter` | `Implemented` | `OpaHttpAdapter`, `ConftestAdapter`, `KyvernoAdapter`, `PolicyBundleRegistryAdapter` | Enables remote policy-as-code, K8s validation, and versioned bundles. | High |
| **Tracker Trace** | Publish traceability to memory or Tracker. | `InMemoryTrackerTraceAdapter`, `HttpTrackerTraceAdapter` | `Implemented` | `EventBusTraceAdapter`, `KafkaTraceAdapter`, `OpenTelemetryTraceAdapter`, `AuditLogTraceAdapter` | Enhances enterprise traceability, auditing, and observability. | Medium |
| **Memory** | Maintain temporary/persisted runtime memory. | `InMemoryMemoryAdapter`, `FileMemoryAdapter` | `Implemented` | `RedisMemoryAdapter`, `PostgresMemoryAdapter`, `VectorMemoryAdapter`, `ObsidianVaultMemoryAdapter` | Enables shared, persistent, and semantic memory for agents. | Medium |
| **Skill Registry** | Resolve intents/tools to governed capabilities. | `LocalSkillRegistryAdapter`, `DEFAULT_SKILLS` | `Implemented` | `RemoteSkillRegistryAdapter`, `GitSkillRegistryAdapter`, `MarketplaceSkillRegistryAdapter`, `TenantSkillBundleAdapter` | Allows versioned, inheritable, extensible capabilities by product/bundle. | High |
| **Communication Gateway** | Adapt existing communication surfaces. | `CliCommunicationGatewayAdapter` | `Partial` | `InteractionAdapterPort`, `SmartCliCommandInteractionAdapter`, `SmartCliChatInteractionAdapter`, `HermesChatBoxInteractionAdapter`, `OpenCodeInteractionAdapter`, `McpInteractionAdapter`, `WebhookInteractionAdapter` | **Critical piece** to allow multiple interfaces without duplicating commands or bypassing governance. | Critical |
| **Scheduler** | Schedule or defer runtime executions. | `InMemorySchedulerAdapter`, `FileSchedulerAdapter` | `Implemented` | `CronSchedulerAdapter`, `TemporalAdapter`, `BullMQSchedulerAdapter`, `KubernetesCronJobAdapter` | Allows recurrent audits, durable jobs, and scheduled re-validations. | Low |
| **Approval / HITL** | Manage human-in-the-loop approval or default blocking. | `AutoApprovalAdapter`, `DenyByDefaultApprovalAdapter` | `Partial` | `TrackerApprovalAdapter`, `GitHubApprovalAdapter`, `SlackApprovalAdapter`, `TeamsApprovalAdapter`, `EmailApprovalAdapter` | Enables real human approval for sensitive actions. | High |
| **MCP Interaction** | Expose Evolith to external agents via MCP. | MCP exists as ecosystem component, but lacks formal runtime adapter. | `Partial` | `McpInteractionAdapter`, `McpToolRegistryAdapter`, `McpPolicyGuardAdapter` | External agents consume Evolith capabilities with governance. | High |
| **Smart CLI Interaction** | Keep Smart CLI as official console and governed entry. | Smart CLI exists, but not formalized as a common interaction adapter. | `Partial` | `SmartCliCommandInteractionAdapter`, `SmartCliChatInteractionAdapter`, `CommandCapabilityAdapter` | CLI command and CLI chat use the same runtime/capability layer. | Critical |
| **Hermes Chat Box Interaction** | Use Hermes Chat Box as optional conversational UI. | `HermesAgentAdapter` exists as engine, but Chat Box not formalized as source/interface adapter. | `Partial` | `HermesChatBoxInteractionAdapter` | Expose Hermes Chat Box without it executing commands directly. | High |
| **OpenCode Interaction** | Use OpenCode as external chat/agent UI. | Not implemented. | `Not implemented` | `OpenCodeInteractionAdapter`, `OpenCodeMcpAdapter`, `OpenCodeCliBridgeAdapter` | Use OpenCode as external chat box without free shell access. | Medium |
| **GitHub Automation** | Create satellite repos, issues, PRs, CI from governed flows. | Not implemented as direct runtime adapter. | `Not implemented` | `GitHubRepositoryAdapter`, `GitHubIssueAdapter`, `GitHubPullRequestAdapter`, `GitHubActionsAdapter` | Governed SDLC automation over GitHub. | Medium |
| **Notifications / Collaboration** | Notify blocked gates, pending approvals, and results. | Not implemented as direct runtime adapter. | `Not implemented` | `SlackAdapter`, `TeamsAdapter`, `EmailNotificationAdapter`, `DiscordAdapter` | Improves collaboration, alerts, and approvals. | Medium |
| **Observability** | Observe runtime, engines, latency, errors, and blocks. | Partial via Tracker Trace. | `Partial` | `OpenTelemetryAdapter`, `PrometheusMetricsAdapter`, `StructuredAuditAdapter` | Enterprise monitoring and technical auditing. | Medium |
| **Knowledge / RAG** | Query ADRs, blueprints, rulesets before suggesting actions. | Not implemented as consolidated adapter. | `Not implemented` | `RagKnowledgeAdapter`, `DocsSearchAdapter`, `VectorStoreAdapter`, `GitDocsAdapter`, `ObsidianAdapter` | Enhances agentic recommendation quality using internal evidence. | High |
| **Secrets / Config** | Manage credentials, endpoints, engine selection, and config. | Partial via bootstrap/overrides. | `Partial` | `VaultSecretAdapter`, `EnvConfigAdapter`, `RemoteConfigAdapter`, `PolicyBundleConfigAdapter` | Avoids hardcoding, improves per-environment configuration security. | High |

---

## 6. Pattern Maturity Matrix (International Pattern Catalog)

| Pattern Cluster | Specific Pattern | Applicability | Evidence-Backed State | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Integration** | **Strangler Fig** | Critical Core | `Validated` | Foundational strategy: modules logically isolated for incremental extraction without downtime. |
| **Composition** | **BFF (Backend for Frontend)** | Core Mandatory | `Implemented` | Specialized NestJS layers per device ([ADR-0008](../../architecture/adrs/nodejs/0008-progressive-multimodule-evolution-gateway-bff.md)). |
| **Reliability** | **Circuit Breaker** | Operational | `Designed` | Distributed breakers sharing state via Redis ([ADR-0011](../../architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.md)) + edge healthchecks. |
| **Database** | **Schema Per Context** | Core Mandatory | `Validated` | Prevents cross-domain join poisoning ([ADR-0031](../../architecture/adrs/core/0031-schema-per-context-domain-event-catalog.md)). |
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
| **Shared Database Entanglement** | VERY HIGH | Isolated PostgreSQL schema per context ([ADR-0031](../../architecture/adrs/core/0031-schema-per-context-domain-event-catalog.md)); cross-schema joins physically blocked. |
| **Fat Controller / Smart Pipe** | HIGH | Dumb Pipes / Smart Endpoints: gateway runs only agnostic policies (JWT, SSL, rate limit); all business decisions live in the tested application hexagon. |
| **Log Shards (Blindness)** | HIGH | OTel distributed tracing ([ADR-0007](../../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.md)): one TraceParent ID from request inception to DB response. |
| **God Module** | HIGH | Regular boundary audits against the [UMS Applied Reference Model](../../../../product/research/demo/README.md); extraction-readiness playbook splits before a module grows too large. |
| **Leaky Shared Library** | HIGH | Shared libs restricted to generic primitives and DDD utilities; domain objects banned, enforced via `eslint-plugin-boundaries`. |

**Resiliency strength: HIGH** — circuit breakers + contract testing shield the backend from cascading failure; dual-layer tenant isolation gives provable containment.
**Performance overhead: LOW** — 4-tier caching (Client → CDN → BFF → Core) and gRPC internal backbones.
**Residual risk controls:** weekly K6 performance snapshots and Pact JS contract verification in CI ([ADR-0037](../../architecture/adrs/core/0037-performance-concurrency-chaos-strategy.md)).

---

## 8. Product Vision Alignment

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

## 9. Executive Scoring & Open Gaps

### Combined Score (TOGAF ACMM)

| Layer | Weight | Score (Evidence-Backed) |
|-------|--------|-------------------------|
| Runtime Architecture (Well-Architected pillars) | 60% | 3.4 ± 0.4 |
| Technological Exposure (CLI + MCP) | 40% | 3.2 ± 0.4 |

**Overall Evolith Core Maturity: 3.32 ± 0.4 / 5.0 (Defined → Managed)**

The system is transitioning from fully documented (Level 3) to automatically governed (Level 4). By enforcing strict evidence backing, the score formally incorporates an **uncertainty penalty** for items that are `Designed` or `Implemented` but lack full automated validation.

### Current Reconciliation

Current totals are not maintained as narrative text. The machine-readable [Maturity Reconciliation](./maturity-reconciliation.json) is generated from the canonical Core board, closure registry, inventories, and CLI release metadata. `node .harness/scripts/ci/09-reconcile-maturity.mjs --check` fails when that snapshot drifts.

Tracker and Product Suite maturity are explicitly excluded from the Core score because they have independent ownership and evidence lifecycles. Their product state cannot inflate this assessment.

---

## 10. AI-Augmented Dimension (Optional)

For products adopting the AI-Augmented engineering section, a complementary maturity matrix exists with 3 levels: AI-Assisted, AI-Integrated, and AI-Orchestrated.

-> [View AI Maturity Matrix](../../foundations/common-rules/ai-augmented/07-maturity-model/ai-maturity-matrix.md)

---

## 11. BMAD Intelligence Update

This maturity assessment explicitly feeds the **BMAD Intelligence Feedback Loop**. Insights generated here inform internal agent capabilities, evaluation rules, and standard checklists:

* **Updated Agents:** `winston` (Audit), `architect` (Architecture) now evaluate port/adapter compliance.
* **New Skills Added:** `adapter-maturity-analysis`, `interaction-adapter-gap-analysis`.
* **New Rules Added:** `core-must-remain-stateless`, `external-tech-must-use-adapter`, `chat-interfaces-cannot-execute-critical-actions`.
* **New Checklists:** `Adapter Maturity Checklist`, `Interaction Adapter Readiness Checklist`.

These intelligence resources are versioned inside `.bmad-core/agents/` and apply continuously to future PRs and governance audits.

---

*This is the single maturity assessment for Evolith Core. Gap tracking lives exclusively on the [Gap Tracking Board](../gaps/gap-tracking.md).*

---
[Back to Vision Index](../README.md)
