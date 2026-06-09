# Reference Skeleton Architecture Maturity Model (AMM)

## Framework Reference: TOGAF ACMM & Well-Architected Framework

## Status
Approved

## Date
2026-06-09

## Context & Purpose
As the Technical Manager and Enterprise Architect, it is critical to measure the objective quality and evolution of the Reference System using internationally recognized standards. 

This assessment document leverages a hybrid framework combining the **TOGAF Architecture Capability Maturity Model (ACMM)** (for enterprise process and governance maturity) and the **Cloud Well-Architected Framework (WAF)** (for technical and cloud-native maturity across pillars like Security, Reliability, and Operational Excellence).

---

## 1. Maturity Levels Definition (Based on TOGAF ACMM)

We evaluate the Reference Skeleton across 5 standard levels of maturity:

* **Level 1: Initial (Ad-Hoc)** - No formal architecture. IT processes are chaotic, undocumented, and reactive.
* **Level 2: Under Development** - Basic architecture process is in place. Some standards exist but are not consistently enforced.
* **Level 3: Defined** - Architecture is well-defined, documented (C4 Model, ADRs), and integrated into the SDLC.
* **Level 4: Managed** - Architecture is quantitatively measured (CodeQL, Sonar, Coverage) and governed automatically.
* **Level 5: Optimizing** - Continuous architectural improvement (Dapr evolution, progressive decoupling, auto-scaling).

---

## 2. Reference Skeleton Current Maturity Assessment (Well-Architected Pillars)

We evaluate the Reference Skeleton architecture against the 5 critical pillars of the Well-Architected Framework.

### Pillar 1: Security & Compliance
**Current Maturity Level: 4 (Managed)**
* **Evidence**: 
 * Zero-Cost Security Pipeline implemented via CodeQL ([ADR-0005](../../../architecture/adrs/core/0005-ci-cd-quality-codeql.md)).
 * Strict Dependency Pinning prevents Supply Chain attacks ([ADR-0009](../../../architecture/adrs/core/0009-strict-dependency-pinning-vulnerability-management.md)).
 * Data Isolation enforced at the DB level using Row-Level Security (RLS) for multi-tenancy ([ADR-0010](../../../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.md)).
 * Immutable Audit Trails via CDC ([ADR-0016](../../../architecture/adrs/core/0016-immutable-business-audit-trail.md)).
* **Path to Level 5**: Implement automated penetration testing in CI and dynamic secrets rotation via HashiCorp Vault.

### Jump to: Pillar 2: Performance Efficiency
**Current Maturity Level: 4 (Managed)**
* **Evidence**: 
 * High-Performance Auth Graph compilation under <5ms using Redis ([ADR-0021](../../../architecture/adrs/nodejs/0021-high-performance-auth-and-graph-compilation.md)).
 * Dual-Protocol Strategy (REST for public, gRPC for internal speed) ([ADR-0027](../../../architecture/adrs/nodejs/0027-dual-protocol-rest-grpc-api-gateway.md)).
 * Frontend optimized payloads via BFF Gateway ([ADR-0008](../../../architecture/adrs/nodejs/0008-progressive-multimodule-evolution-gateway-bff.md)).
* **Path to Level 5**: Implement serverless auto-scaling and predictive caching algorithms.

### Pillar 3: Reliability & Resiliency
**Current Maturity Level: 3 (Defined) -> Moving to 4**
* **Evidence**: 
 * Frontend Offline Resilience via React Query ([ADR-0004](../../../architecture/adrs/nodejs/0004-frontend-offline-resilience.md)).
 * Fault Tolerance via Circuit Breakers (`opossum`) and Retries ([ADR-0011](../../../architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.md)).
 * Cloud Infrastructure Multi-Region DR limits proposed ([ADR-0013](../../../architecture/adrs/core/0013-cloud-infrastructure-topology-dr.md)).
* **Path to Level 5**: Execute regular Chaos Engineering drills (Chaos Monkey) and fully active-active multi-region deployment.

### Pillar 4: Operational Excellence
**Current Maturity Level: 4 (Managed)**
* **Evidence**: 
 * Monorepo Orchestration via Nx ensures deterministic builds ([ADR-0001](../../../architecture/adrs/core/0001-monorepo-orchestration-nx.md)).
 * Comprehensive Telemetry using LGTM and OpenTelemetry ([ADR-0007](../../../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.md)).
 * Feature Flagging allows decoupling deployment from release ([ADR-0017](../../../architecture/adrs/core/0017-feature-flagging-strategy.md)).
 * Quality Gates enforce >70% test coverage strictly via CI ([ADR-0018](../../../architecture/adrs/core/0018-testing-pyramid-quality-gates.md)).
* **Path to Level 5**: Achieve fully autonomous, zero-downtime Blue/Green automated deployments with AI-driven anomaly detection in logs.

### Pillar 5: Maintainability & Extensibility (Clean Architecture)
**Current Maturity Level: 4 (Managed)**
* **Evidence**: 
 * Strict Hexagonal Boundaries decoupling core from infra ([ADR-0002](../../../architecture/adrs/nodejs/0002-clean-architecture-nestjs.md)).
 * Tactical Design Patterns (Result Monad) future-proofing the core ([ADR-0019](../../../architecture/adrs/core/0019-tactical-design-patterns-future-proofing.md)).
 * Event-Driven Architecture decoupling domain modules ([ADR-0015](../../../architecture/adrs/core/0015-event-driven-architecture-intra-domain.md)).
 * Vendor Lock-In mitigation strategies clearly defined (Feature Flags, IdPs).
* **Path to Level 5**: Seamless transition from Modular Monolith to Dapr Microservices with zero domain code changes ([ADR-0006](../../../architecture/adrs/core/0006-future-microservices-transition-dapr.md)).

---

---

## 3. Technological Exposure Layer — CLI + MCP Maturity Assessment

This section extends the TOGAF ACMM assessment to cover the **Technological Exposure layer** (Evolith CLI + MCP Server) as required by [G-25](./gap-analysis-core.md#g-25-maturity-matrix-climcp-coverage-resolved-100).

### Dimension 1: MCP Protocol Conformance & Transport
**Current Maturity Level: 4 (Managed)**
* **Evidence:**
  * `MinimalStdioTransport` — line-buffered JSON-RPC 2.0 over stdin/stdout; `onmessage`, `onerror`, `onclose` all wired.
  * `MinimalHttpTransport` — HTTP/SSE server with `/health`, `/message` (POST), `/sse` (GET), 404 fallback; Bearer-token and X-API-Key authentication validated per request.
  * Outer-catch hardened: `transport.send()` inside error recovery wrapped in nested try/catch — no unhandled rejections.
  * Dead SSE client cleanup on broken write.
  * `mcp:smoke` script verifies `initialize`, `tools/list`, `resources/list`, `prompts/list`, and `tools/call` on every run against the compiled binary.
* **Path to Level 5:** External IDE integration smoke (Cursor / Claude Desktop) formally evidenced as part of CI (G-18). Automated protocol conformance test against the MCP specification version changelog.

### Dimension 2: Test Coverage & Quality Gates
**Current Maturity Level: 4 (Managed)**
* **Evidence:**
  * 1 369 tests across 63 unit suites + 11 E2E suites — all green.
  * Statement coverage: **88.70%** · Line: **89.80%** · Branch: **76.93%** (target ≥75%) · Function: **83.58%**.
  * `--forceExit` removed; teardown is clean; no open-handle warnings.
  * JSON coverage summary artifact generated via `json-summary` reporter.
  * `server.ts` (MCP core): 85.8% statements · 96% functions.
* **Path to Level 5:** Enforce coverage gates in CI as a blocking check (currently advisory). Lift branch coverage to ≥80% over time.

### Dimension 3: Governance Exposure Completeness
**Current Maturity Level: 4 (Managed)**
* **Evidence:**
  * **17 MCP tools** covering validate, agent lifecycle (5), architecture F1/F2/F3, SDLC handoff/status, config get/set, metrics, and MoSCoW prioritization (7).
  * **8 MCP resources** exposing rulesets, phase-gates, agents, versions, config, moscow, and acl in real-time.
  * **7 MCP prompts** for validate, onboarding, architecture, phase-gate, handoff, ruleset, and moscow workflows.
  * All tools, resources, and prompts registered and covered by the HTTP routing test suite.
* **Path to Level 5:** Dynamic resource refresh (hot-reload rulesets without server restart). Resource versioning aligned to Core corpus updates.

### Dimension 4: CLI Developer Experience
**Current Maturity Level: 3 (Defined)**
* **Evidence:**
  * 13 commands covering all vision-required operations.
  * Shell completion for bash, zsh, and fish.
  * Bilingual documentation (EN/ES parity 100%, validated by automated script).
  * Cursor AI and Claude Desktop configuration examples in README.
  * `mcp:smoke` runnable in < 5 seconds.
* **Path to Level 4:** End-to-end IDE integration smoke evidence (G-18). Satellite CI composite action ships so `smart-cli validate` runs automatically on satellite PRs (G-27).

### Dimension 5: Federated Governance Runtime Enforcement
**Current Maturity Level: 3 (Defined)**
* **Evidence:**
  * Inheritance model, satellite contracts, and Open-Core boundary rules fully defined.
  * `smart-cli validate --ruleset inheritance` executable by any satellite.
  * ACL rule files present in `rulesets/acl/`.
* **Path to Level 4:** GitHub Actions composite action (G-27) that satellite repositories include to run `smart-cli validate` as a blocking PR gate. ACL runtime adapters for Jira/Trello/Linear (G-02, Tracker SaaS scope).

### CLI + MCP Summary Score

| Dimension | Level | Score |
|-----------|-------|-------|
| Protocol Conformance & Transport | 4 — Managed | 4.0 |
| Test Coverage & Quality Gates | 4 — Managed | 4.0 |
| Governance Exposure Completeness | 4 — Managed | 4.0 |
| CLI Developer Experience | 3 — Defined | 3.0 |
| Federated Governance Enforcement | 3 — Defined | 3.0 |

**CLI + MCP Layer Score: 3.6 / 5.0 (Defined to Managed)**

---

## 4. Executive Summary & Scoring

Based on the TOGAF ACMM criteria applied to our current architecture evaluated with support from the spec-driven AI-DD method:

### Reference Skeleton (Runtime Architecture)

**Score: 3.8 / 5.0 (Defined to Managed)**

The Reference Skeleton architecture is currently transitioning from a perfectly documented system (Level 3) to a fully automated and governed system (Level 4). The strict enforcement of ADRs, static boundaries (`eslint-plugin-boundaries`), and CI/CD quality gates ensures that the system will not degrade into technical debt.

To reach **Level 5 (Optimizing)**, the engineering organization must focus on Chaos Engineering, Multi-Region Active-Active deployments, and the eventual split into Dapr microservices as operational load demands it.

### Technological Exposure Layer (CLI + MCP)

**Score: 3.6 / 5.0 (Defined to Managed)**

The CLI and MCP server have reached a functional beta state with strong test coverage and verified smoke evidence. Protocol implementation is hardened (outer-catch, lifecycle handlers, auth). The remaining delta to Level 4 is satellite CI enforcement (G-27) and formal external IDE smoke evidence (G-18).

### Combined Evolith Core Score

| Layer | Weight | Score |
|-------|--------|-------|
| Reference Skeleton (Runtime Architecture) | 60% | 3.8 |
| Technological Exposure (CLI + MCP) | 40% | 3.6 |

**Overall Evolith Core Maturity: 3.72 / 5.0 (Defined to Managed)**

---

## AI-Augmented Dimension (Optional)

For products that adopt the AI-Augmented engineering section, a complementary maturity matrix exists with 3 levels: AI-Assisted, AI-Integrated, and AI-Orchestrated.

-> [View AI Maturity Matrix](../ai-augmented/07-maturity-model/ai-maturity-matrix.md)


---
[Back to Index](./README.md)
