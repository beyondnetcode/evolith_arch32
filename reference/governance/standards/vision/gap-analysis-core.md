# Evolith Core — Gap Analysis Against Product Vision

> **Bilingual Navigation:** [Versión en Español](./gap-analysis-core.es.md)

**Status:** Active Analysis
**Owner:** Evolith Architecture Board
**Date:** 2026-06-06
**Reference:** [Evolith Product Vision Master](./evolith-product-vision-master.md)

---

## 1. Executive Summary

This document provides a comprehensive gap analysis of the Evolith Core repository against its stated product vision as defined in `evolith-product-vision-master.md`. The analysis maps each vision pillar to current implementation state, identifies gaps, and provides a prioritized roadmap for closure.

### Vision Pillars vs. Reality

| Pillar | Vision Requirement | Current State | Gap Status |
|--------|-------------------|---------------|------------|
| **Evolith Core** | Reference Corpus (Constitution) | ~85% Implemented | Partial |
| **Evolith Tracker** | SaaS Suite for SDLC execution | 0% - Not Started | Missing |
| **CLI + MCP** | Interoperability layer | ~30% Implemented | Partial |

### Overall Maturity Score

| Component | Score | Assessment |
|-----------|-------|------------|
| Evolith Core (Reference Corpus) | 85% | Mature - Minor gaps in anti-corruption layer rules |
| Evolith Tracker (SaaS) | 0% | Not started - Future/planned enterprise component |
| CLI (Technological Exposure) | 50% | Functional but incomplete |
| MCP Server (Technological Exposure) | 10% | Stub implementation only |
| Rulesets (Machine-Readable) | 75% | Core rules implemented, architecture rules pending |
| SDLC Phase Gates | 40% | Documented but not executable via CLI |

**Overall Weighted Score:** ~45%

---

## 2. Vision vs. Reality Matrix

### 2.1 Evolith Core (Reference Corpus)

| Vision Requirement | Current Implementation | Gap |
|-------------------|----------------------|-----|
| **Architectural Directives** | Implemented | Complete |
| **ADRs (Architecture Decision Records)** | 70+ ADRs across core, nodejs, dotnet, android | Complete |
| **Standards & Taxonomies** | Repository taxonomy, engineering manifesto, conventions | Complete |
| **Rulesets (Machine-Readable)** | JSON rules in `rulesets/` directory | Partial |
| **Schemas (Phase Gate Artifacts)** | 13 JSON schemas in `rulesets/schema/` | Complete |
| **Federated Governance Model** | Inheritance rules, satellite contracts | Complete |
| **ACL (Anti-Corruption Layer) Rules** | `rulesets/acl/anti-corruption-layer.rules.json` exists | Partial |
| **Open-Core Boundary** | `rulesets/governance/open-core-boundary.rules.json` | Complete |

**Status:** ~85% implemented

### 2.2 Evolith Tracker (SaaS Suite)

| Vision Requirement | Current Implementation | Gap |
|-------------------|----------------------|-----|
| **Execute 5 Phase Gates** | No implementation | Missing |
| **Track Architecture Drift** | No implementation | Missing |
| **Consolidate DORA + SPACE Metrics** | No implementation | Missing |
| **Real-time Executive Scorecards** | Rules defined but not operational | Partial |
| **Approval Workflows** | No implementation | Missing |
| **Audit Trail** | No implementation | Missing |
| **Multi-tenant Dashboards** | No implementation | Missing |

**Status:** 0% - **Out of scope** - Future enterprise SaaS

### 2.3 Technological Exposure (CLI + MCP)

| Vision Requirement | Current Implementation | Gap |
|-------------------|----------------------|-----|
| **CLI Commands** | Partial - validate, init, mcp serve | Partial |
| **MCP Server** | Stub only - logs to console | Missing |
| **MCP Tools** | `sdk/cli/src/core/mcp/tools/` skeleton files | Partial |
| **MCP Resources** | Empty implementation | Missing |
| **MCP Prompts** | Empty implementation | Missing |
| **IDE Integration (Cursor, Claude Desktop)** | Config examples exist | Not tested |
| **Real-time Governance Context** | Not implemented | Missing |

**Status:** ~30% - CLI framework functional, MCP server not implemented

---

## 3. Detailed Gap Analysis

### 3.1 Gap Analysis Table

| ID | Pillar/Component | Vision Requirement | Current State | Gap | Priority |
|----|------------------|-------------------|---------------|-----|----------|
| G-01 | Core / Rulesets | F1/F2/F3 Architecture validation | CLI validate only checks GOV, INH, ACL, OCB | Partial | HIGH |
| G-02 | Core / ACL | Jira, Trello, Linear integrations | Only generic anti-corruption-layer.rules.json | Missing | MEDIUM |
| G-03 | Tracker / Phase Gates | Execute phase transitions | No implementation | Missing | HIGH |
| G-04 | Tracker / Drift Detection | Real-time architecture drift tracking | No implementation | Missing | HIGH |
| G-05 | Tracker / DORA+SPACE | Consolidated metrics dashboard | No implementation | Missing | MEDIUM |
| G-06 | Tracker / Scorecards | Executive real-time scorecards | Rules defined but not operational | Partial | MEDIUM |
| G-07 | CLI / Agent Install | `smart-cli agents install` command | Stub - TODO comment only | Missing | HIGH |
| G-08 | CLI / Upgrade | Safe satellite upgrade path | Stub - TODO comment only | Missing | HIGH |
| G-09 | CLI / Architecture Validate | F1/F2/F3 architecture rules validation | Not implemented | Missing | HIGH |
| G-10 | CLI / SDLC Operations | Phase handoff, artifact generation | Mock/POC only | Partial | MEDIUM |
| G-11 | CLI / Docs Scaffold | Documentation scaffolding | Stub - TODO comment only | Missing | MEDIUM |
| **G-12** | **MCP / Server Protocol** | **JSON-RPC over stdio** | **Stub logs only** | **Missing** | **CRITICAL** |
| G-13 | MCP / Tools | validate_project, detect_drift, etc. | Skeleton files exist | Partial | HIGH |
| G-14 | MCP / Resources | Core info, rulesets as resources | Empty implementation | Missing | MEDIUM |
| G-15 | MCP / Prompts | Reusable interaction patterns | Empty implementation | Missing | LOW |
| G-16 | Core / Bilingual Parity | Full EN/ES documentation | ~90% coverage | Partial | LOW |
| G-17 | Testing / Coverage | >80% unit test coverage | ~25% coverage | Missing | HIGH |
| G-18 | Testing / E2E | Real E2E tests with assertions | Stubs only | Missing | HIGH |

### 3.2 Critical Gaps Detail

#### G-12: MCP Server Protocol Implementation (CRITICAL)

**Gap:** `McpServerService.onModuleInit()` only logs to console; no JSON-RPC protocol implementation.

**Impact:** AI agents (Claude Desktop, Cursor) cannot consume Evolith governance as real-time context.

**Fix Required:**
1. Implement `StdioServerTransport` from @modelcontextprotocol/sdk
2. Implement tools/list, tools/call handlers
3. Implement resources/list, resources/read handlers

---

#### G-01: Architecture Ruleset Validation (HIGH)

**Gap:** CLI `validate` does not check F1/F2/F3 architecture phase rules.

**Evidence:**
- `rulesets/architecture/f1-modular-monolith.rules.json` exists
- `rulesets/architecture/f2-distributed-modules.rules.json` exists
- `rulesets/architecture/f3-microservices.rules.json` exists
- But `RulesetValidatorService` only validates governance rules

**Impact:** Cannot detect architectural drift in bounded contexts, layer boundaries.

---

## 4. Priority Matrix

| Priority | Gaps | Criteria |
|----------|------|----------|
| **CRITICAL** | G-12 | Blocks AI agent integration |
| **HIGH** | G-01, G-03, G-04, G-07, G-08, G-09, G-17, G-18 | Core functionality missing |
| **MEDIUM** | G-02, G-05, G-06, G-10, G-11, G-13, G-14 | Important but not blocking |
| **LOW** | G-15, G-16 | Nice to have |

### Effort vs. Impact

| Effort → | XS (<1wk) | S (1wk) | M (2-3wk) | L (3-4wk) |
|----------|-----------|---------|-----------|-----------|
| **HIGH Impact** | G-12 | G-08, G-09 | G-01, G-03, G-04, G-07 | G-17, G-18 |
| **MEDIUM Impact** | G-15 | G-06, G-11 | G-02, G-05, G-10, G-13 | - |
| **LOW Impact** | G-16 | - | - | - |

---

## 5. Recommendations Roadmap

### Phase 1: Foundation (Weeks 1-4) - CRITICAL/HIGH

| Action | Gap IDs | Deliverable |
|--------|---------|-------------|
| Implement MCP Server Protocol | G-12 | Functional MCP server with stdio transport |
| Implement CLI Architecture Validation | G-01, G-09 | F1/F2/F3 rules validated by CLI |
| Implement Agent Installation | G-07 | `smart-cli agents install` functional |
| Implement Upgrade Logic | G-08 | Safe satellite upgrade path |

### Phase 2: Completion (Weeks 5-8) - HIGH/MEDIUM

| Action | Gap IDs | Deliverable |
|--------|---------|-------------|
| Implement MCP Tools | G-13 | 10+ tools functional |
| Implement MCP Resources | G-14 | Core info, rulesets as resources |
| Implement SDLC Operations | G-10 | Real phase transitions |
| Increase Test Coverage | G-17, G-18 | >80% unit tests, real E2E |

### Phase 3: Consolidation (Weeks 9-12) - MEDIUM

| Action | Gap IDs | Deliverable |
|--------|---------|-------------|
| Implement ACL Integrations | G-02 | Jira/Trello/Linear validation rules |
| Implement DORA Metrics | G-05 | Metrics collection service |
| Complete Bilingual Parity | G-16 | 100% EN/ES coverage |

---

## 6. Status Summary

### Component Status

| Component | Status |
|-----------|--------|
| Core Documents | 87% (130/150 files) |
| ADRs | 100% (70+ files) |
| Rulesets (JSON) | 75% (30/40 files) |
| JSON Schemas | 100% (13/13 files) |
| CLI Commands | 50% (3 full, 3 stub) |
| MCP Server | 10% (stub only) |
| MCP Tools | 20% (skeleton only) |
| MCP Resources | 0% (empty) |
| Test Coverage | 25% |

### Vision Pillar Completeness

| Vision Pillar | Completeness | Blockers |
|---------------|--------------|----------|
| Evolith Core | 85% | ACL integrations, architecture validation |
| Evolith Tracker | 0% | Future - out of scope |
| CLI | 50% | Agent install, upgrade, docs |
| MCP | 10% | Protocol not implemented |

---

## 7. What Is Working Well

1. **Comprehensive ADR Registry** - 70+ ADRs across multiple runtimes
2. **Strong Bilingual Coverage** - ~90% of documents have EN/ES pairs
3. **Machine-Readable Rulesets** - JSON rules for governance, ACL, phases
4. **Complete JSON Schemas** - 13 schemas for artifact validation
5. **SDLC Artifact Templates** - Full template suite for all 5 phases
6. **Federated Governance** - Inheritance and satellite contracts working
7. **CLI Framework** - NestJS-based CLI with validation functional

---

## 8. Critical Path to Vision Alignment

```
Current State                          Vision Goal
     ↓                                     ↓
┌─────────────┐                    ┌─────────────────────┐
│  CLI 50%    │───────────────────►│  CLI 100%           │
│  MCP 10%    │───────────────────►│  MCP 100%           │
│  Core 85%   │───────────────────►│  Core 95%           │
│  Tracker 0% │                    │  Tracker 0% (future)│
└─────────────┘                    └─────────────────────┘
```

**Critical Path:**
1. **MCP Protocol (G-12)** - Unblocks AI agent integration
2. **Architecture Validation (G-01, G-09)** - Enables F1/F2/F3 enforcement
3. **Agent Installation (G-07)** - Enables satellite onboarding
4. **Test Coverage (G-17, G-18)** - Ensures long-term maintainability

---

## 9. Out of Scope

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