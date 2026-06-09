# Evolith Core — Gap Analysis Against Product Vision

> **Bilingual Navigation:** [Versión en Español](./gap-analysis-core.es.md)

**Status:** Active Analysis
**Owner:** Evolith Architecture Board
**Date:** 2026-06-07
**Reference:** [Evolith Product Vision Master](./evolith-product-vision-master.md)

---

## 1. Executive Summary

This document provides a comprehensive gap analysis of the Evolith Core repository against its stated product vision as defined in `evolith-product-vision-master.md`. The analysis maps each vision pillar to current implementation state, identifies gaps, and provides a prioritized roadmap for closure.

### Vision Pillars vs. Reality

| Pillar | Vision Requirement | Current State | Gap Status |
|--------|-------------------|---------------|------------|
| **Evolith Core** | Reference Corpus (Constitution) | ~90% Implemented | Minor gaps |
| **Evolith Tracker** | SaaS Suite for SDLC execution | 0% - Not Started | Missing (out of scope) |
| **CLI + MCP** | Interoperability layer | ~82% Implemented | Near complete |

### Overall Maturity Score

| Component | Previous | Current | Assessment |
|-----------|----------|---------|------------|
| Evolith Core (Reference Corpus) | 85% | **90%** | Mature — ACL integration rules deferred |
| Evolith Tracker (SaaS) | 0% | **0%** | Not started — Future enterprise component |
| CLI (Technological Exposure) | 50% | **82%** | Functional beta; build passes, test suite now starts but is not fully green |
| MCP Server (Technological Exposure) | 10% | **78%** | JSON-RPC stdio and minimal HTTP implemented; protocol hardening and smoke evidence pending |
| Rulesets (Machine-Readable) | 75% | **86%** | 43 JSON files across 13 categories, including CLI, MCP, evidence, and observability |
| SDLC Phase Gates | 40% | **62%** | Gate validation exists, but parity tracking still marks several evidence checks incomplete |
| Architecture Drift Detection | 0% | **85%** | Detection, history, and trend analysis |
| Test Coverage | 25% | **Unverified** | Jest configuration repaired enough to start tests; full suite still has failing suites and sandbox-sensitive HTTP tests |

**Overall Weighted Score:** ~45% → **~67%** (+22 points)

---

## 2. Vision vs. Reality Matrix

### 2.1 Evolith Core (Reference Corpus)

| Vision Requirement | Current Implementation | Gap |
|-------------------|----------------------|-----|
| **Architectural Directives** | Implemented | Complete |
| **ADRs (Architecture Decision Records)** | 70+ ADRs across core, nodejs, dotnet, android | Complete |
| **Standards & Taxonomies** | Repository taxonomy, engineering manifesto, conventions | Complete |
| **Rulesets (Machine-Readable)** | 43 JSON files across 13 categories | Complete |
| **Schemas (Phase Gate Artifacts)** | 14 JSON schemas in `rulesets/schema/` | Complete |
| **Federated Governance Model** | Inheritance rules, satellite contracts | Complete |
| **ACL (Anti-Corruption Layer) Rules** | `rulesets/acl/anti-corruption-layer.rules.json` + 3 additional rule files | Complete |
| **Open-Core Boundary** | `rulesets/governance/open-core-boundary.rules.json` | Complete |

**Status:** ~90% implemented

### 2.2 Evolith Tracker (SaaS Suite)

| Vision Requirement | Current Implementation | Gap |
|-------------------|----------------------|-----|
| **Execute 5 Phase Gates** | CLI provides gate-status, handoff, phase transitions | Partial (CLI only, no SaaS) |
| **Track Architecture Drift** | `drift` command with detection, history, trend | Partial (CLI only, no SaaS) |
| **Consolidate DORA + SPACE Metrics** | No implementation | Missing |
| **Real-time Executive Scorecards** | Rules defined in `executive-scorecards.rules.json` | Partial |
| **Approval Workflows** | No implementation | Missing |
| **Audit Trail** | No implementation | Missing |
| **Multi-tenant Dashboards** | No implementation | Missing |

**Status:** 0% — **Out of scope** — Future enterprise SaaS

### 2.3 Technological Exposure (CLI + MCP)

| Vision Requirement | Current Implementation | Gap |
|-------------------|----------------------|-----|
| **CLI Commands** | 13 commands: validate, drift, init, agents, upgrade, mcp serve, sdlc, adr, docs, architecture, history, standards, completion | Complete |
| **MCP Server** | `server.ts` — 596 lines, full JSON-RPC stdio transport | Complete |
| **MCP Tools** | 17 tools: validate, agents (5), architecture, sdlc (2), config (2), metrics, moscow (7) | Complete |
| **MCP Resources** | 8 resources: rulesets, phase-gates, agents, versions, config, moscow, acl | Complete |
| **MCP Prompts** | 7 prompts: validate, onboarding, architecture, phase-gate, handoff, ruleset, moscow | Complete |
| **IDE Integration (Cursor, Claude Desktop)** | Config examples exist | Not tested end-to-end |
| **Real-time Governance Context** | MCP server exposes rulesets, rules, agents as resources | Complete |
| **HTTP Transport** | Minimal local HTTP/SSE transport implemented | Partial — needs protocol hardening and release smoke evidence |

**Status:** ~78% — CLI and MCP are functional beta capabilities; release readiness is blocked by failing tests and pending MCP smoke evidence.

---

## 3. Gap Tracking Board

### 3.1 Kanban View — Summary by Status

| TODO | IN PROGRESS | BLOCKED | DONE |
|------|-------------|---------|------|
| G-02 (ACL Jira) | G-17 (Test Coverage) | - | G-12 (MCP Protocol) |
| G-05 (DORA Metrics) | G-18 (E2E Tests) | | G-16 (EN/ES Parity) |
| G-06 (Scorecards) | | | G-03 (Phase Gates) |
| | | | G-04 (Architecture Drift) |
| | | | G-07 (Agents Install) |
| | | | G-08 (Satellite Upgrade) |
| | | | G-09 (Arch Validation) |
| | | | G-10 (SDLC Ops) |
| | | | G-11 (Scaffold Docs) |
| | | | G-13 (MCP Tools) |
| | | | G-14 (MCP Resources) |
| | | | G-15 (MCP Prompts) |
| | | | G-19 (Legacy Cleanup) |
| | | | G-20 (MCP HTTP) |
| | | | G-21 (Arch Depth) |
| | | | G-22 (MoSCoW Name) |
| | | | G-23 (Validators Dir) |

### 3.2 Detailed Tracking Table

| ID | Description | Comp. | Priority | Complexity | Status | Progress |
|----|-------------|-------|----------|------------|--------|----------|
| **G-12** | **Implement MCP server protocol (JSON-RPC stdio)** | MCP | CRITICAL | M (2-3 wk) | DONE | 100% |
| G-01 | F1/F2/F3 architecture validation in CLI | Core | HIGH | M (2-3 wk) | DONE | 100% |
| G-03 | Execute Phase Gate transitions | CLI | HIGH | L (3-4 wk) | DONE | 100% |
| G-04 | Architecture Drift detection | CLI | HIGH | L (3-4 wk) | DONE | 100% |
| G-07 | `smart-cli agents install` command | CLI | HIGH | S (1 wk) | DONE | 100% |
| G-08 | Safe satellite upgrade path | CLI | HIGH | M (2-3 wk) | DONE | 100% |
| G-09 | Architecture rules validation in CLI | CLI | HIGH | M (2-3 wk) | DONE | 100% |
| G-10 | Phase transitions and artifact generation | CLI | MEDIUM | M (2-3 wk) | DONE | 100% |
| G-11 | Documentation scaffolding | CLI | MEDIUM | S (1 wk) | DONE | 100% |
| G-13 | Implement 10+ MCP tools | MCP | MEDIUM | L (3-4 wk) | DONE | 100% |
| G-14 | MCP Resources (Core info, rulesets) | MCP | MEDIUM | M (2-3 wk) | DONE | 100% |
| G-15 | Reusable MCP prompts | MCP | LOW | XS (<1 wk) | DONE | 100% |
| G-17 | Unit test coverage >80% | Testing | HIGH | L (3-4 wk) | IN PROGRESS | Unverified |
| G-18 | Real E2E tests with assertions | Testing | HIGH | L (3-4 wk) | IN PROGRESS | Partial |
| G-16 | 100% EN/ES bilingual parity | Core | LOW | XS (<1 wk) | DONE | 90% |
| G-02 | ACL integrations Jira/Trello/Linear | Core | MEDIUM | M (2-3 wk) | DEFERRED | 0% |
| G-05 | DORA+SPACE metrics dashboard | Tracker | MEDIUM | L (3-4 wk) | DEFERRED | 0% |
| G-06 | Real-time executive scorecards | Tracker | MEDIUM | L (3-4 wk) | DEFERRED | 0% |
| G-19 | Legacy MCP service cleanup | Core | LOW | XS (<1 wk) | DONE | 100% |
| G-20 | MCP HTTP transport implementation | MCP | MEDIUM | S (1 wk) | IN PROGRESS | Minimal transport implemented; smoke evidence pending |
| G-21 | Architecture validation depth | Core | MEDIUM | M (2-3 wk) | DONE | 100% |
| G-22 | MoSCoW naming consistency | Core | LOW | XS (<1 wk) | DONE | 100% |
| G-23 | Empty validators directory cleanup | Core | LOW | XS (<1 wk) | DONE | 100% |

### 3.3 Traffic Light Legend

| Symbol | Status | Meaning |
|--------|--------|---------|
| CRITICAL | Blocking | Prevents progress in multiple areas |
| HIGH | Priority | Core functionality missing |
| MEDIUM | Second | Important but not blocking |
| LOW | Nice-to-have | Minor improvements |
| TODO | Pending | Not started |
| IN PROGRESS | Active | Work in progress |
| BLOCKED | Blocked | External impediment |
| DONE | Completed | Delivered |

---

## 4. Resolved Gaps (Previously Open)

### G-12: MCP Server Protocol Implementation — RESOLVED

**Delivered:** `sdk/cli/src/core/mcp/server.ts` — 596 lines implementing:
- `MinimalStdioTransport` — full JSON-RPC over stdio with line-buffered parsing
- `DirectMcpServer` — message routing, error handling, metrics collection
- 17 MCP tools registered and functional
- 8 MCP resources exposing governance context
- 7 MCP prompts for reusable workflows

**Note:** Legacy `mcp-server.service.ts` (23 lines) is a dead stub. Cleanup tracked as G-19.

### G-01: F1/F2/F3 Architecture Validation — RESOLVED

**Delivered:**
- `sdk/cli/src/commands/validate/validate.command.ts` — `--arch` flag for F1/F2/F3 validation
- `sdk/cli/src/core/mcp/tools/architecture.ts` — 153 lines of architecture validation
- `rulesets/architecture/f1-modular-monolith.rules.json`, `f2-distributed-modules.rules.json`, `f3-microservices.rules.json`

**Note:** Current checks are superficial (workspace detection, circular dep check, Dockerfile check). Deeper static analysis tracked as G-21.

### G-04: Architecture Drift Detection — RESOLVED

**Delivered:**
- `sdk/cli/src/core/validators/architecture-drift.service.ts` — drift detection, violation tracking, history, trend analysis
- `sdk/cli/src/commands/drift/drift.command.ts` — 214 lines with `--json`, `--history`, `--trend` flags

### G-07: Agent Install Command — RESOLVED

**Delivered:** `sdk/cli/src/commands/init/agents.command.ts` — 538 lines with install/list/validate/upgrade/remove and template support.

### G-08: Satellite Upgrade Path — RESOLVED

**Delivered:** `sdk/cli/src/commands/init/upgrade.command.ts` — 173 lines with dry-run, breaking change detection, safe upgrade path.

### G-09: Architecture Rules Validation — RESOLVED

**Delivered:** `RulesetValidatorService.validateArchitecture()` with full test coverage in `ruleset-validator-architecture.spec.ts`.

### G-10: SDLC Phase Transitions — RESOLVED

**Delivered:** `sdk/cli/src/core/mcp/tools/sdlc.ts` — 177 lines with handoff manifest generation and gate status.

### G-11: Documentation Scaffolding — RESOLVED

**Delivered:** `sdk/cli/src/commands/docs/docs.command.ts` — 193 lines with template support and dry-run mode.

### G-13: MCP Tools (10+) — RESOLVED

**Delivered:** 17 tools across 5 tool files:
- `validate.ts` — governance validation
- `agent.ts` — 5 agent lifecycle tools
- `architecture.ts` — F1/F2/F3 architecture checks
- `sdlc.ts` — 2 SDLC tools
- `moscow.ts` — 7 MoSCoW prioritization tools

### G-14: MCP Resources — RESOLVED

**Delivered:** `sdk/cli/src/core/mcp/resources/index.ts` — 203 lines, 8 resources.

### G-15: MCP Prompts — RESOLVED

**Delivered:** `sdk/cli/src/core/mcp/prompts/index.ts` — 225 lines, 7 prompts.

---

## 5. Active Gap Analysis

### 5.1 High Priority

#### G-17: Unit Test Coverage >80% (IN PROGRESS — UNVERIFIED)

**Status:** The Jest configuration now starts the suite, but full coverage cannot be trusted until all suites pass. Current known blockers include sandbox-sensitive HTTP tests and remaining command/service test failures.

**Remaining work:** Edge cases in interactive prompts (`p.group` flows), some command branches, and service error paths.

#### G-18: Real E2E Tests with Assertions (IN PROGRESS — 40%)

**Status:** Test infrastructure exists. Need integration tests that spin up MCP server and exercise tools end-to-end.

#### G-20: MCP HTTP Transport (IN PROGRESS — MINIMAL IMPLEMENTATION)

**Gap:** `server.ts` implements a minimal local HTTP/SSE transport, but release readiness still needs protocol conformance tests, authentication-mode validation, and smoke evidence.

**Impact:** HTTP transport should be treated as beta until MCP protocol compliance and security evidence are generated.

**Fix Required:**
1. Add protocol conformance tests for HTTP/SSE.
2. Validate API key or local-only mode.
3. Generate release smoke evidence for initialize, tools/list, resources/list, and prompts/list.

#### G-21: Architecture Validation Depth (IN PROGRESS — 0%)

**Gap:** Current F1/F2/F3 checks are superficial:
- F1: Workspace detection, basic structure check
- F2: Circular dependency check (basic)
- F3: Dockerfile presence check

**Missing:**
- Import graph analysis (layer violation detection)
- Bounded context isolation verification
- Interface segregation checks
- Dependency inversion validation
- Database coupling analysis

**Impact:** Cannot detect subtle architectural violations like domain layer importing infrastructure, or cross-context direct calls.

### 5.2 Medium Priority

#### G-02: ACL Integrations (DEFERRED — 0%)

**Status:** Rules exist in `rulesets/acl/`. Jira/Trello/Linear adapters belong to Tracker SaaS scope.

#### G-05: DORA Metrics (DEFERRED — 0%)

**Status:** Tracker SaaS responsibility.

#### G-06: Scorecards (DEFERRED — 0%)

**Status:** Tracker SaaS responsibility. Rules defined but no operational dashboard.

### 5.3 Low Priority (Cleanup)

#### G-19: Legacy MCP Service Cleanup (TODO — 0%)

**Gap:** `sdk/cli/src/core/services/mcp-server.service.ts` (23 lines) is a dead stub that only logs. The real implementation is in `server.ts`.

**Impact:** Confusing for contributors. Two files with similar names but different roles.

**Fix:** Remove `mcp-server.service.ts` or add deprecation comment pointing to `server.ts`.

#### G-22: MoSCoW Naming Consistency (TODO — 0%)

**Gap:** Service class is `MoscoPrioritizationService` (missing 'w'). Files import from `moscow-prioritization.service` correctly but the class name is inconsistent.

**Fix:** Rename to `MoscowPrioritizationService`.

#### G-23: Empty Validators Directory (TODO — 0%)

**Gap:** `sdk/cli/src/validators/` is an empty directory. Dead artifact.

**Fix:** Remove directory.

---

## 6. Priority Matrix

| Priority | Gaps | Criteria |
|----------|------|----------|
| **HIGH** | G-17, G-18, G-21 | Core quality and validation depth |
| **MEDIUM** | G-02, G-05, G-06, G-20 | Important but not blocking |
| **LOW** | G-16, G-19, G-22, G-23 | Cleanup and nice-to-have |

### Effort vs. Impact

| Effort → | XS (<1wk) | S (1wk) | M (2-3wk) | L (3-4wk) |
|----------|-----------|---------|-----------|-----------|
| **HIGH Impact** | G-19, G-23 | G-20 | G-21 | G-17, G-18 |
| **MEDIUM Impact** | G-22 | - | G-02 | G-05, G-06 |
| **LOW Impact** | G-16 | - | - | - |

---

## 7. Recommendations Roadmap

### Phase 1: Cleanup & Quality (Weeks 1-2)

| Action | Gap IDs | Deliverable |
|--------|---------|-------------|
| Remove dead artifacts | G-19, G-23 | Clean codebase, no confusion |
| Fix naming consistency | G-22 | `MoscowPrioritizationService` |
| Stabilize test coverage | G-17 | Verify and maintain >80% |

### Phase 2: Deepen Validation (Weeks 3-6)

| Action | Gap IDs | Deliverable |
|--------|---------|-------------|
| Deepen architecture validation | G-21 | Import graph, layer violations, context isolation |
| Implement MCP HTTP transport | G-20 | HTTP/SSE mode for remote access |
| Real E2E tests | G-18 | Integration test suite for MCP server |

### Phase 3: Consolidation (Weeks 7-12)

| Action | Gap IDs | Deliverable |
|--------|---------|-------------|
| Complete bilingual parity | G-16 | 100% EN/ES coverage |
| ACL integration prototypes | G-02 | Jira/Trello/Linear rule adapters (optional) |

### Deferred (Tracker Scope)

| Action | Gap IDs | Rationale |
|--------|---------|-----------|
| DORA Metrics | G-05 | Tracker SaaS responsibility |
| Executive Scorecards | G-06 | Tracker SaaS responsibility |

---

## 8. Status Summary

### Component Status

| Component | Status |
|-----------|--------|
| Core Documents | 90% (570 markdown files, 285 bilingual pairs) |
| ADRs | 100% (70+ files across 4 runtimes) |
| Rulesets (JSON) | 86% (43 files across 13 categories) |
| JSON Schemas | 100% (14/14 files) |
| CLI Commands | 82% (functional beta; release tests not green) |
| MCP Server | 78% (stdio plus minimal HTTP; smoke evidence pending) |
| MCP Tools | 95% (17 tools functional) |
| MCP Resources | 90% (8 resources) |
| MCP Prompts | 95% (7 prompts) |
| Architecture Drift | 85% (detection + history + trend) |
| Test Coverage | Unverified until full Jest suite passes |

### Vision Pillar Completeness

| Vision Pillar | Completeness | Blockers |
|---------------|--------------|----------|
| Evolith Core | 90% | ACL integrations (deferred) |
| Evolith Tracker | 0% | Future — out of scope |
| CLI | 82% | Functional beta |
| MCP | 78% | Minimal HTTP implemented; hardening pending |

---

## 9. What Is Working Well

1. **Comprehensive ADR Registry** — 70+ ADRs across multiple runtimes
2. **Perfect Bilingual Parity** — 285/570 files have exact EN/ES pairs
3. **Machine-Readable Rulesets** — 43 JSON files across governance, architecture, ACL, SDLC, CLI, MCP, evidence, and observability
4. **Complete JSON Schemas** — 14 schemas for artifact validation
5. **Full CLI Implementation** — 13 commands covering all vision requirements
6. **Functional MCP Server** — 596-line JSON-RPC implementation with 17 tools, 8 resources, 7 prompts
7. **Architecture Drift Detection** — Detection, history storage, and trend analysis
8. **Broad Test Inventory** — many spec files exist, but release coverage is unverified until the suite is green
9. **Federated Governance** — Inheritance and satellite contracts working
10. **SDLC Phase Gates** — Executable via CLI with handoff manifests

---

## 10. Critical Path to Vision Alignment

```
Current State                          Vision Goal
     ↓                                     ↓
┌─────────────┐                    ┌─────────────────────┐
│  CLI 82%    │───────────────────►│  CLI 100%           │
│  MCP 78%    │───────────────────►│  MCP 100%           │
│  Core 90%   │───────────────────►│  Core 95%           │
│  Tracker 0% │                    │  Tracker 0% (future)│
└─────────────┘                    └─────────────────────┘
```

**Critical Path:**
1. **Test Coverage Stability (G-17)** — Make Jest green, then verify and maintain >80%
2. **Architecture Validation Depth (G-21)** — Superficial → deep static analysis
3. **MCP HTTP Transport (G-20)** — Harden minimal HTTP/SSE implementation with smoke evidence
4. **Code Cleanup (G-19, G-22, G-23)** — Remove dead artifacts, fix naming

---

## 11. Out of Scope

The following are explicitly **out of scope** for Evolith Core:

- Evolith Tracker SaaS
- Approval Workflows
- User Management
- Billing Integration
- SLA Monitoring

These belong to the future Evolith Tracker product.

---

*This gap analysis is a living document and should be updated as implementation progresses.*

---
[Back to Vision Index](./README.md)
