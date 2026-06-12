# Evolith Core — Maturity Assessment

> **Bilingual Navigation:** [Versión en Español](./maturity-assessment.es.md)

**Status:** Active Assessment
**Owner:** Evolith Architecture Board
**Created:** 2026-06-10 (consolidates the former `maturity-matrix.md` and `maturity-evaluation.md`)
**Last Updated:** 2026-06-10
**Companion document:** [Gap Tracking Board](./gap-tracking.md) — the single tracking surface for every open gap referenced here.

---

## 1. Purpose & Frameworks

This is the **single maturity assessment** for Evolith Core. It measures three things:

1. **Compatibility with international standards** — TOGAF Architecture Capability Maturity Model (ACMM) for enterprise process and governance maturity, plus the Cloud Well-Architected Framework (WAF) pillars for technical maturity (section 3) and the enterprise microservices pattern/anti-pattern catalog (sections 5–6).
2. **Match with the product vision** — pillar-by-pillar alignment against the [Product Vision Master](./evolith-product-vision-master.md) (section 7).
3. **Open gaps** — every deviation found here is tracked exclusively as a `GT-xx` item on the [Gap Tracking Board](./gap-tracking.md) (section 8). No gap is tracked in this document.

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
  * Zero-Cost Security Pipeline via CodeQL ([ADR-0005](../../../architecture/adrs/core/0005-automated-sast-quality-gates.md)).
  * Strict dependency version pinning (exact lockfiles, no ranges) with automated vulnerability management ([ADR-0009](../../../architecture/adrs/core/0009-strict-dependency-pinning-vulnerability-management.md)).
  * Multi-tenant data isolation via Row-Level Security ([ADR-0010](../../../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.md)).
  * Immutable audit trails via CDC ([ADR-0016](../../../architecture/adrs/core/0016-immutable-business-audit-trail.md)).
* **Path to Level 5:** automated penetration testing in CI; dynamic secrets rotation.

### Pillar 2: Performance Efficiency — **Level 4 (Managed)**
* **State:** `Implemented` (Needs load-testing validation)
* **Evidence:**
  * Auth graph compilation under 5 ms using Redis ([ADR-0021](../../../architecture/adrs/nodejs/0021-high-performance-auth-and-graph-compilation.md)).
  * Dual-protocol strategy: REST public, gRPC internal ([ADR-0027](../../../architecture/adrs/nodejs/0027-dual-protocol-rest-grpc-api-gateway.md)).
  * Optimized frontend payloads via BFF Gateway ([ADR-0008](../../../architecture/adrs/nodejs/0008-progressive-multimodule-evolution-gateway-bff.md)).
* **Path to Level 5:** serverless auto-scaling; predictive caching.

### Pillar 3: Reliability & Resiliency — **Level 3 (Defined)**
* **State:** `Designed` (ADRs approved, missing circuit breaker tests)
* **Evidence:**
  * Frontend offline resilience via React Query ([ADR-0004](../../../architecture/adrs/nodejs/0004-frontend-offline-resilience.md)).
  * Circuit breakers (`opossum`) and retries ([ADR-0011](../../../architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.md)).
  * Multi-region DR topology proposed ([ADR-0013](../../../architecture/adrs/core/0013-cloud-infrastructure-topology-dr.md)).
* **Path to Level 5:** regular chaos engineering drills; active-active multi-region.

### Pillar 4: Operational Excellence — **Level 4 (Managed)**
* **State:** `Validated`
* **Evidence:**
  * Deterministic monorepo builds via Nx ([ADR-0001](../../../architecture/adrs/core/0001-monorepo-orchestration-principle.md)).
  * Telemetry via LGTM stack and OpenTelemetry ([ADR-0007](../../../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.md)).
  * Feature flagging decouples deployment from release ([ADR-0017](../../../architecture/adrs/core/0017-feature-flagging-strategy.md)).
  * Quality gates enforce coverage thresholds in CI ([ADR-0018](../../../architecture/adrs/core/0018-testing-pyramid-quality-gates.md)).
* **Path to Level 5:** autonomous blue/green deployments; AI-driven log anomaly detection.

### Pillar 5: Maintainability & Extensibility — **Level 4 (Managed)**
* **State:** `Validated`
* **Evidence:**
  * Hexagonal boundaries decoupling core from infrastructure ([ADR-0002](../../../architecture/adrs/nodejs/0002-clean-architecture-nestjs.md)).
  * Tactical design patterns (Result monad) ([ADR-0019](../../../architecture/adrs/core/0019-tactical-design-patterns-future-proofing.md)).
  * Event-driven decoupling of domain modules ([ADR-0015](../../../architecture/adrs/core/0015-event-driven-architecture-intra-domain.md)).
* **Path to Level 5:** monolith-to-Dapr transition with zero domain changes ([ADR-0006](../../../architecture/adrs/core/0006-microservices-transition-sidecar-pattern.md)). Note: strict hexagonal enforcement in the CLI itself is still open — see [GT-19](./gap-reference-catalog.md#gt-19).

---

## 4. Technological Exposure Assessment (CLI + MCP)

### Dimension 1: MCP Protocol Conformance & Transport — **Level 4 (Managed)**
* **State:** `Implemented` (Needs Streamable HTTP)
* **Evidence:** JSON-RPC 2.0 stdio transport; minimal HTTP/SSE transport with `/health`, `/message`, `/sse` and Bearer/X-API-Key auth; hardened error recovery; `mcp:smoke` verifies initialize, discovery, and tool calls on every release.
* **Path to Level 5:** adopt the official MCP SDK Streamable HTTP transport ([GT-05](./gap-reference-catalog.md#gt-05)); automated protocol conformance against the MCP spec changelog.

### Dimension 2: Test Coverage & Quality Gates — **Level 4 (Managed)**
* **State:** `Validated`
* **Evidence:** ~1 369 tests (unit + E2E) green; 88.70% statements · 89.80% lines · 76.93% branches (target ≥75%) · 83.58% functions; clean teardown without `--forceExit`.
* **Path to Level 5:** blocking coverage gates in CI; branch coverage ≥80%.

### Dimension 3: Governance Exposure Completeness — **Level 4 (Managed)**
* **State:** `Implemented` (Missing Tracker integration)
* **Evidence:** 17+ MCP tools, 8 resources, 7 prompts covering validation, agents, architecture, SDLC, and prioritization; all covered by routing tests.
* **Path to Level 5:** gate evaluation exposed as a structured-evidence tool ([GT-06](./gap-reference-catalog.md#gt-06)); hot-reload of rulesets.

### Dimension 4: CLI Developer Experience — **Level 3 (Defined)**
* **State:** `Validated`
* **Evidence:** 13 commands; shell completion (bash/zsh/fish); 100% EN/ES documentation parity; `mcp:smoke` under 5 seconds; DORA metrics computed from real git history in `gate-status`.
* **Path to Level 4:** unified output envelope and global flags ([GT-01](./gap-reference-catalog.md#gt-01)); complete `--dry-run` coverage ([GT-12](./gap-reference-catalog.md#gt-12)); npm publication ([GT-18](./gap-reference-catalog.md#gt-18)).

### Dimension 5: Federated Governance Runtime Enforcement — **Level 3 (Defined)**
* **State:** `Designed` (Rules exist, content validation missing)
* **Evidence:** inheritance model, satellite contracts, and Open-Core boundary rules defined; `smart-cli validate` executable by any satellite; CI composite action `evolith-validate` available for satellite PR gates.
* **Path to Level 4:** phase-gate evidence deepened from existence-only checks to content/threshold validation ([GT-08](./gap-reference-catalog.md#gt-08)–[GT-11](./gap-reference-catalog.md#gt-11)); ACL runtime adapters (Tracker scope).

---

## 5. Pattern Maturity Matrix (International Pattern Catalog)

| Pattern Cluster | Specific Pattern | Applicability | Evidence-Backed State | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Integration** | **Strangler Fig** | Critical Core | `Validated` | Foundational strategy: modules logically isolated for incremental extraction without downtime. |
| **Composition** | **BFF (Backend for Frontend)** | Core Mandatory | `Implemented` | Specialized NestJS layers per device ([ADR-0008](../../../architecture/adrs/nodejs/0008-progressive-multimodule-evolution-gateway-bff.md)). |
| **Reliability** | **Circuit Breaker** | Operational | `Designed` | Distributed breakers sharing state via Redis ([ADR-0011](../../../architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.md)) + edge healthchecks. |
| **Database** | **Schema Per Context** | Core Mandatory | `Validated` | Prevents cross-domain join poisoning ([ADR-0031](../../../architecture/adrs/core/0031-schema-per-context-domain-event-catalog.md)). |
| **Scalability** | **CQRS (Basic)** | Optional | `Visioned` | Read-models only when write contention demands it. |
| **Consistency** | **Saga Pattern** | Distributed Future | `Visioned` | Reserved for Phase 3+ distributed transactions. |
| **Messaging** | **Transactional Outbox** | Phase 2+ | `Visioned` | Atomic DB-state/event consistency at async scale. |

**Legend:** *Adopted* — fully designed and verified in specs. *Roadmap* — infrastructure-ready, implementation deferred to demand. *Incompatible* — none currently identified.

---

## 6. Anti-Pattern Immunization

The architecture deploys explicit "antibodies" against the six highest-risk anti-patterns. Summary (criticality · defense):

| Anti-Pattern | Criticality | Immunization Defense |
| :--- | :--- | :--- |
| **Distributed Monolith** | EXTREME | Async event bus ([ADR-0015](../../../architecture/adrs/core/0015-event-driven-architecture-intra-domain.md)) + hexagonal isolation ([ADR-0002](../../../architecture/adrs/nodejs/0002-clean-architecture-nestjs.md)): fire-and-forget messaging, no synchronous cross-module chains. |
| **Shared Database Entanglement** | VERY HIGH | Isolated PostgreSQL schema per context ([ADR-0031](../../../architecture/adrs/core/0031-schema-per-context-domain-event-catalog.md)); cross-schema joins physically blocked. |
| **Fat Controller / Smart Pipe** | HIGH | Dumb Pipes / Smart Endpoints: gateway runs only agnostic policies (JWT, SSL, rate limit); all business decisions live in the tested application hexagon. |
| **Log Shards (Blindness)** | HIGH | OTel distributed tracing ([ADR-0007](../../../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.md)): one TraceParent ID from request inception to DB response. |
| **God Module** | HIGH | Regular boundary audits against the [UMS Applied Reference Model](../../../knowledge/demo/README.md); extraction-readiness playbook splits before a module grows too large. |
| **Leaky Shared Library** | HIGH | Shared libs restricted to generic primitives and DDD utilities; domain objects banned, enforced via `eslint-plugin-boundaries`. |

**Resiliency strength: HIGH** — circuit breakers + contract testing shield the backend from cascading failure; dual-layer tenant isolation gives provable containment.
**Performance overhead: LOW** — 4-tier caching (Client → CDN → BFF → Core) and gRPC internal backbones.
**Residual risk controls:** weekly K6 performance snapshots and Pact JS contract verification in CI ([ADR-0037](../../../architecture/adrs/core/0037-performance-concurrency-chaos-strategy.md)).

---

## 7. Product Vision Alignment

Pillar-by-pillar match against the [Product Vision Master](./evolith-product-vision-master.md). Detailed component scores live in the [Baseline Snapshot](./gap-reference-catalog.md#2-historical-baseline-snapshot) of the Gap Reference Catalog.

| Vision Pillar | Vision Requirement | Evidence-Backed State | Notes |
|---|---|:---:|---|
| **Evolith Core** | Reference Corpus (Constitution): directives, ADRs, standards, rulesets, schemas | `Implemented` | See live [Reference Corpus Inventory](./inventory-summary.md). ACL integration rules defined but not executed (Tracker scope). |
| **Evolith Tracker** | SaaS SDLC orchestrator | `Visioned` | Separate repository; Core's obligation is the CLI/MCP contract it will consume. |
| **Technological Exposure** | CLI + MCP serving governance as real-time context | `Implemented` | Functional beta: 13 commands, MCP stdio + HTTP. Remaining: Tracker contract, transport upgrade. |
| **5 Phase Gates** | Auditable gates with blocking evidence | `Implemented` | All 5 gates evaluate; blocking criteria are existence-only checks. |
| **Federated Governance** | Hub-and-spoke inheritance, satellite validation | `Designed` | Inheritance rules + satellite CI composite action shipped; runtime ACLs deferred. |
| **Open-Core Strategy** | Free CLI+MCP tier publicly available | `Prototyped` | Publication blocked only by release logistics ([GT-18](./gap-reference-catalog.md#gt-18)). |

---

## 8. Executive Scoring & Open Gaps

### Combined Score (TOGAF ACMM)

| Layer | Weight | Score (Evidence-Backed) |
|-------|--------|-------------------------|
| Runtime Architecture (Well-Architected pillars) | 60% | 3.4 ± 0.4 |
| Technological Exposure (CLI + MCP) | 40% | 3.2 ± 0.4 |

**Overall Evolith Core Maturity: 3.32 ± 0.4 / 5.0 (Defined → Managed)**

The system is transitioning from fully documented (Level 3) to automatically governed (Level 4). By enforcing strict evidence backing, the score formally incorporates an **uncertainty penalty** for items that are `Designed` or `Implemented` but lack full automated validation.

### Open Gaps

All open gaps live exclusively on the **[Gap Tracking Board](./gap-tracking.md)** — current state: 16 pending, 1 deferred, 6 done out of 23 `GT` items, plus the closed legacy `G-01…G-27` archive. The maturity-relevant subset:

* **Gate evidence depth (P1):** [GT-08](./gap-reference-catalog.md#gt-08), [GT-09](./gap-reference-catalog.md#gt-09), [GT-10](./gap-reference-catalog.md#gt-10), [GT-11](./gap-reference-catalog.md#gt-11)
* **Architecture integrity (P1):** [GT-04](./gap-reference-catalog.md#gt-04), [GT-17](./gap-reference-catalog.md#gt-17), [GT-19](./gap-reference-catalog.md#gt-19)
* **Exposure & distribution (P1):** [GT-05](./gap-reference-catalog.md#gt-05), [GT-12](./gap-reference-catalog.md#gt-12), [GT-14](./gap-reference-catalog.md#gt-14), [GT-18](./gap-reference-catalog.md#gt-18)

---

## 9. AI-Augmented Dimension (Optional)

For products adopting the AI-Augmented engineering section, a complementary maturity matrix exists with 3 levels: AI-Assisted, AI-Integrated, and AI-Orchestrated.

-> [View AI Maturity Matrix](../ai-augmented/07-maturity-model/ai-maturity-matrix.md)

---

*This is the single maturity assessment for Evolith Core. Gap tracking lives exclusively on the [Gap Tracking Board](./gap-tracking.md).*

---
[Back to Vision Index](./README.md)
