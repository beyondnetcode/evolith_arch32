# SDK/CLI/MCP Implementation Roadmap

> **Status:** Proposed
> **Date:** 2026-06-06

---

## 1. Roadmap Overview

| Phase | Focus | Duration | Priority |
|-------|-------|----------|----------|
| **Phase 0** | Diagnosis & Architecture | DONE | - |
| **Phase 1** | SDK Foundation | 2-3 weeks | P0 |
| **Phase 2** | CLI Completion | 2-3 weeks | P1 |
| **Phase 3** | MCP Implementation | 2-3 weeks | P1 |
| **Phase 4** | Architecture & SDLC | 2-3 weeks | P2 |
| **Phase 5** | Integration & Testing | 3-4 weeks | P2 |
| **Phase 6** | Hardening & Release | 2 weeks | P3 |

---

## 2. Phase 1: SDK Foundation (2-3 weeks)

### Objective
Extract and formalize shared logic into SDK services that CLI and MCP will consume.

### Tasks

| Task | Effort | Dependency | Status |
|------|--------|------------|--------|
| Add `@modelcontextprotocol/sdk` dependency | XS | - | TODO |
| Create SDK service interfaces | S | - | TODO |
| Extract `CoreLoader` from current code | S | - | TODO |
| Formalize `RulesetRegistry` service | M | CoreLoader | TODO |
| Formalize `RulesetValidator` service | M | RulesetRegistry | TODO |
| Add architecture ruleset validation (F1/F2/F3) | M | RulesetValidator | TODO |
| Create `ArtifactService` for template loading | M | - | TODO |
| Add unit tests for all services (>80%) | L | Services | TODO |

### Deliverables
- `@evolith/sdk-core` package structure
- All SDK services with interfaces
- >80% unit test coverage

### Quality Gate
- All unit tests pass
- SDK services can be imported and used standalone

---

## 3. Phase 2: CLI Completion (2-3 weeks)

### Objective
Complete CLI command implementations, replacing stubs with real logic.

### Tasks

| Task | Effort | Dependency | Status |
|------|--------|------------|--------|
| Implement `agent install` command | M | SDK CoreLoader | TODO |
| Implement `upgrade` command | S | SDK RulesetRegistry | TODO |
| Implement `validate architecture` | M | SDK F1/F2/F3 validation | TODO |
| Implement `validate sdlc` | M | SDK SDLCService | TODO |
| Implement `sdlc handoff` (real phase transitions) | M | SDK SDLCService | TODO |
| Implement `sdlc generate` (real artifact gen) | M | SDK ArtifactService | TODO |
| Implement `architecture initialize` | M | NxWorkspaceStrategy | TODO |
| Implement `ruleset explain` command | S | SDK RulesetRegistry | TODO |
| Add E2E tests for all commands | L | Commands | TODO |

### Deliverables
- All CLI commands implemented (no stubs)
- Real E2E tests with assertions

### Quality Gate
- `smart-cli validate --all` passes on Core
- E2E tests for all commands

---

## 4. Phase 3: MCP Implementation (2-3 weeks)

### Objective
Implement MCP server with full tool, resource, and prompt support.

### Tasks

| Task | Effort | Dependency | Status |
|------|--------|------------|--------|
| Create `McpServer` class with stdio transport | M | Phase 1 SDK | TODO |
| Implement `tools/list` handler | S | McpServer | TODO |
| Implement `validate_project` tool | M | SDK ValidationService | DONE |
| Implement `validate_ruleset` tool | M | SDK RulesetValidator | DONE |
| Implement `list_rulesets` tool | S | SDK RulesetRegistry | DONE |
| Implement `get_ruleset` tool | S | SDK RulesetRegistry | DONE |
| Implement `detect_architecture_drift` tool | M | SDK DriftDetection | DONE |
| Implement `resources/list` handler | S | McpServer | DONE |
| Implement `evolith://core/info` resource | S | SDK CoreLoader | DONE |
| Implement `evolith://rulesets` resource | S | SDK RulesetRegistry | DONE |
| Implement `prompts/list` handler | XS | McpServer | DONE |
| Implement `prepare_discovery` prompt | S | - | DONE |
| Implement `review_architecture` prompt | S | - | DONE |
| Add MCP integration tests | M | MCP tools | DONE |

### Deliverables
- Functional MCP server
- 10+ tools implemented
- 5+ resources implemented
- 3+ prompts implemented

### Quality Gate
- MCP server connects via stdio
- Tools return valid JSON-RPC responses
- Integration tests pass with Claude Desktop

---

## 5. Phase 4: Architecture & SDLC (2-3 weeks)

### Objective
Complete architecture validation and SDLC phase gate operations.

### Tasks

| Task | Effort | Dependency | Status |
|------|--------|------------|--------|
| Implement full F1/F2/F3 validation | M | Phase 1 SDK | DONE |
| Implement bounded context checks | M | F1/F2/F3 | DONE |
| Implement layer boundary validation | M | F1/F2/F3 | DONE |
| Implement `gate validate` command | M | Phase 2 CLI | DONE |
| Implement evidence collection | M | SDK EvidenceService | DONE |
| Implement phase transition validation | M | Gate validate | DONE |
| Add architecture drift detection | M | Phase 3 MCP | DONE |
| Implement DORA metrics collection | M | SDK ReportService | DONE |

### Deliverables
- Full architecture validation
- Phase gate operations functional
- Evidence collection working

### Quality Gate
- Architecture validation detects known patterns
- Phase gate reports complete evidence

---

## 6. Phase 5: Integration & Testing (3-4 weeks)

### Objective
Ensure SDK, CLI, and MCP produce consistent results.

### Tasks

| Task | Effort | Dependency | Status |
|------|--------|------------|--------|
| Verify CLI and MCP produce identical results | M | Phase 2, Phase 3 | TODO |
| Add integration tests (SDK + CLI) | M | Phase 2 | TODO |
| Add integration tests (SDK + MCP) | M | Phase 3 | TODO |
| Set up CI/CD pipeline | M | - | TODO |
| Add coverage gates in CI | S | CI/CD | TODO |
| Performance testing (load times) | S | - | TODO |
| Offline mode testing | M | - | TODO |
| Multi-platform testing (win/linux/mac) | M | - | TODO |

### Deliverables
- CI/CD pipeline with quality gates
- Parity tests passing
- Performance benchmarks established

### Quality Gate
- All parity tests pass
- CI pipeline green
- <500ms core load, <10s full validation

---

## 7. Phase 6: Hardening & Release (2 weeks)

### Objective
Prepare for stable release.

### Tasks

| Task | Effort | Dependency | Status |
|------|--------|------------|--------|
| Security audit | M | Phase 5 | TODO |
| API documentation generation | M | Phase 1 | TODO |
| CLI user guide | M | Phase 2 | TODO |
| MCP integration guide | M | Phase 3 | TODO |
| Migration guide (v0 to v1) | S | - | TODO |
| Semantic version setup | XS | - | TODO |
| npm publishing setup | M | - | TODO |
| Release candidate testing | M | All phases | TODO |

### Deliverables
- v1.0.0 release candidate
- Complete documentation
- Migration guide

### Quality Gate
- Security audit passed
- All documentation complete
- Release criteria met

---

## 8. Effort Legend

| Code | Description |
|------|-------------|
| XS | < 1 week |
| S | 1 week |
| M | 2-3 weeks |
| L | 3-4 weeks |
| XL | > 4 weeks |

---

## 9. Risks

| Risk | Mitigation |
|------|------------|
| MCP SDK changes breaking | Pin to stable MCP SDK version |
| Scope creep | Strict phase gates, cut non-essential features |
| Test coverage burnout | Automate coverage measurement |
| Performance issues | Benchmark early, optimize critical paths |

---

## 10. Success Criteria

- CLI commands all functional (no stubs)
- MCP server working with Claude Desktop
- SDK shared between CLI and MCP
- >80% test coverage
- <500ms core load
- <10s full project validation
- Complete documentation
- v1.0.0 release ready

---
[Back to SDK/CLI Planning Index](./README.md)