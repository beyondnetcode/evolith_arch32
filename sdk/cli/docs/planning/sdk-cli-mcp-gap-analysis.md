# SDK/CLI/MCP Gap Analysis

> **Status:** Analysis Complete
> **Date:** 2026-06-06

---

## 1. Gap Summary

| Gap ID | Component | Severity | Effort | Priority |
|--------|-----------|----------|--------|----------|
| G-01 | MCP Server Protocol | CRITICAL | L | P0 |
| G-02 | Architecture Validation | HIGH | M | P1 |
| G-03 | Agent Installation | HIGH | M | P1 |
| G-04 | Upgrade Logic | HIGH | S | P1 |
| G-05 | SDLC Operations | MEDIUM | M | P2 |
| G-06 | Artifact Generation | MEDIUM | L | P2 |
| G-07 | Test Coverage | MEDIUM | XL | P2 |
| G-08 | MCP Resources | MEDIUM | M | P2 |
| G-09 | MCP Prompts | MEDIUM | S | P2 |
| G-10 | Plugin System | LOW | XL | P3 |

---

## 2. Critical Gaps

### G-01: MCP Server Protocol Not Implemented

**Current State:** `McpServerService` only logs to console
**Expected State:** JSON-RPC server with tools, resources, prompts
**Impact:** AI agents cannot consume Evolith governance
**Fix:**
```
1. Install @modelcontextprotocol/sdk
2. Create McpServer class implementing Server
3. Implement tools/list, tools/call handlers
4. Implement resources/list, resources/read handlers
5. Use StdioServerTransport
```

**Effort:** L (1-2 weeks)

---

## 3. High Priority Gaps

### G-02: Architecture Validation Incomplete

**Current State:** `validate` command checks GOV, INH, ACL, OCB rules only
**Expected State:** Full validation of F1/F2/F3 architecture rules
**Impact:** Cannot detect architectural drift in bounded contexts, layers
**Fix:**
```
1. Add F1/F2/F3 ruleset loading to RulesetValidatorService
2. Implement layer boundary checks (Domain has no framework imports)
3. Implement hexagonal architecture validation
4. Add --phase flag to validate architecture
```

**Effort:** M (2-3 weeks)

### G-03: Agent Installation Not Implemented

**Current State:** `agents command` is stub with TODO comment
**Expected State:** Install BMAD agents, Architecture Agent, QA Agent to satellite
**Impact:** Satellites cannot onboard AI agents
**Fix:**
```
1. Create AgentInstallerService
2. Copy .harness/templates/agents.md to satellite
3. Configure .harness/agents/ directory
4. Set up pre-commit hook with agent validation
5. Support --agents flag for selective installation
```

**Effort:** M (2-3 weeks)

### G-04: Upgrade Logic Not Implemented

**Current State:** `upgrade command` is stub with TODO comment
**Expected State:** Safe upgrade of satellite to new Core version
**Impact:** No safe upgrade path for satellites
**Fix:**
```
1. Create UpgradeService with version comparison
2. Detect breaking changes in rulesets
3. Generate migration script if needed
4. Backup before upgrade
5. Validate post-upgrade
```

**Effort:** S (1 week)

---

## 4. Medium Priority Gaps

### G-05: SDLC Operations Are Mocks

**Current State:** `sdlc handoff` and `sdlc generate` log mock messages
**Expected State:** Real phase transitions, artifact generation
**Impact:** Phase gates cannot be executed via CLI
**Fix:**
```
1. Implement PhaseTransitionService
2. Connect to evolith.yaml currentPhase
3. Validate gate requirements before transition
4. Generate phase-specific artifacts
5. Update gate timestamps in evolith.yaml
```

**Effort:** M (2-3 weeks)

### G-06: Artifact Generation Not Implemented

**Current State:** No artifact generation in CLI
**Expected State:** Generate PRD, User Story, ADR from templates
**Impact:** Cannot generate standard artifacts
**Fix:**
```
1. Create ArtifactGeneratorService
2. Load templates from .harness/templates/
3. Support context injection (name, phase, etc.)
4. Validate generated artifacts against schemas
5. Support bilingual generation
```

**Effort:** L (1-2 weeks)

### G-07: Test Coverage Low

**Current State:** ~25% unit test coverage, E2E tests are stubs
**Expected State:** >80% coverage, real E2E tests
**Impact:** Risk of regressions, no confidence in changes
**Fix:**
```
1. Add RulesetValidatorService tests
2. Add unit tests for all commands
3. Write real E2E tests with assertions
4. Add integration tests for SDK layer
5. Set up CI coverage gates
```

**Effort:** XL (4-6 weeks)

### G-08: MCP Resources Not Implemented

**Current State:** No resources defined
**Expected State:** Core info, rulesets, ADRs as resources
**Impact:** MCP clients cannot read Evolith data
**Fix:**
```
1. Define resource schemas
2. Implement resources/list handler
3. Implement resources/read handler
4. Add caching for resource reads
```

**Effort:** M (2-3 weeks)

### G-09: MCP Prompts Not Implemented

**Current State:** No prompts defined
**Expected State:** Reusable interaction patterns
**Impact:** AI agents lack guidance patterns
**Fix:**
```
1. Define prompt templates
2. Implement prompts/list handler
3. Implement prompts/get handler
4. Create context injection
```

**Effort:** S (1 week)

---

## 5. Low Priority Gaps

### G-10: Plugin System Not Implemented

**Current State:** No extension mechanism
**Expected State:** Plugin interface for custom commands/tools
**Impact:** Cannot extend Evolith without modifying Core
**Fix:** (Future phase)
```
1. Design EvolithPlugin interface
2. Implement plugin discovery
3. Add plugin validation
4. Create plugin registry
```

**Effort:** XL (out of scope for v1)

---

## 6. Duplication Issues

### D-01: CLI/MCP Duplication Risk

**Issue:** Current CLI commands may be duplicated in MCP tools
**Solution:** Both use shared SDK services; CLI and MCP are adapters

### D-02: Mock Code Lingering

**Issue:** MOCK comments in code may never be implemented
**Solution:** Create tracking issue for each mock, prioritize in roadmap

---

## 7. Contradictions with Architecture

### C-01: MCP Watcher Not Integrated

**Contradiction:** WatcherService watches files but doesn't notify MCP
**Resolution:** Integrate watcher with MCP notification system

### C-02: CLI Has No Architecture Validation

**Contradiction:** `validate architecture` not implemented while architecture rules exist
**Resolution:** Implement G-02

---

## 8. Missing Tests

### T-01: RulesetValidatorService Tests

**Missing:** No unit tests for core validation logic
**Priority:** HIGH

### T-02: Command E2E Tests

**Missing:** All E2E tests are stubs
**Priority:** HIGH

### T-03: MCP Integration Tests

**Missing:** No MCP protocol tests
**Priority:** MEDIUM

---

## 9. Documentation Gaps

| Gap | Status |
|-----|--------|
| SDK API documentation | NOT_STARTED |
| CLI user guide | PARTIAL (--help) |
| MCP integration guide | NOT_STARTED |
| Migration guide | NOT_STARTED |

---

## 10. Related Documents

- `sdk-cli-mcp-current-state-assessment.md`
- `sdk-cli-mcp-target-architecture.md`
- `sdk-cli-mcp-implementation-roadmap.md`

---
[Back to SDK/CLI Planning Index](./README.md)