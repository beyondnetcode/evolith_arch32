# Evolith CLI Backlog

## Overview

This backlog tracks all improvements, gaps, and feature requests for the Evolith CLI. Items are prioritized by impact and effort, organized by phases.

---

## GAPS CRÍTICOS

### GAP-001: Shell Autocomplete
**Status:** [DONE] Implemented
**Priority:** 🔴 High
**Phase:** 1
**Created:** 2026-06-06
**Completed:** 2026-06-06

**Description:** Users cannot tab-complete commands, subcommands, options, or arguments.

**Expected Behavior:**
```bash
evolith <TAB>          # → validate adr standards agents sdlc init mcp
evolith validate --<TAB>  # → --satellite --core --format --output --ruleset
evolith adr <TAB>      # → create list get update matrix
```

**References:**
- AWS CLI v2: `aws_completer`
- GitHub CLI: `gh completion`

**Related Items:** GAP-002, GAP-003

---

### GAP-002: Command History
**Status:** [DONE] Implemented
**Priority:** 🔴 High
**Phase:** 1
**Created:** 2026-06-06
**Completed:** 2026-06-06

**Description:** No command history tracking or retrieval.

**Expected Behavior:**
```bash
evolith history list         # List recent commands
evolith history show <id>    # Show command details
evolith history clear        # Clear history
```

**References:**
- AWS CLI v2: `aws history list/show`

---

### GAP-003: Table/YAML Output Formats
**Status:** [DONE] Implemented
**Priority:** 🔴 High
**Phase:** 1
**Created:** 2026-06-06
**Completed:** 2026-06-06

**Description:** Only JSON output supported. Table and YAML formats missing.

**Expected Behavior:**
```bash
evolith validate --output table  # Human-readable table
evolith adr list --format yaml   # YAML output for pipelines
```

**References:**
- AWS CLI: `--output table|json|text|yaml`
- GitHub CLI: `--json` with jq support

**Related Items:** GAP-001

---

## ENTERPRISE READINESS

### GAP-004: Multiple Profiles
**Status:** 🟡 Pending
**Priority:** 🔴 High
**Phase:** 2
**Created:** 2026-06-06

**Description:** No support for multiple configuration profiles (production, staging, development).

**Expected Behavior:**
```bash
evolith config --profile production set coreRef.version "1.0.0"
evolith validate --profile production
EVOLITH_PROFILE=staging evolith validate
```

**References:**
- AWS CLI: `aws configure --profile <name>`
- GitHub CLI: `gh auth status` with multiple hosts

---

### GAP-005: Extension/Plugin System
**Status:** 🟡 Pending
**Priority:** 🔴 High
**Phase:** 2
**Created:** 2026-06-06

**Description:** No way to extend CLI with community plugins.

**Expected Behavior:**
```bash
evolith ext install evolith/adr-generator
evolith ext list
evolith ext uninstall adr-generator
evolith ext update
```

**References:**
- GitHub CLI: `gh extension install`
- Stripe CLI: `stripe plugin install`

---

### GAP-006: SSO/SAML Authentication
**Status:** 🟡 Pending
**Priority:** 🔴 High
**Phase:** 2
**Created:** 2026-06-06

**Description:** No enterprise SSO support for authentication.

**Expected Behavior:**
```bash
evolith auth login --sso --provider okta
evolith auth status
evolith auth logout
```

**References:**
- AWS CLI: `aws configure sso`
- GitHub CLI: `gh auth login --hostname`

---

## DEVELOPER EXPERIENCE

### GAP-007: API Browser/Explorer
**Status:** 🟡 Pending
**Priority:** 🟡 Medium
**Phase:** 3
**Created:** 2026-06-06

**Description:** No interactive way to explore available commands and their usage.

**Expected Behavior:**
```bash
evolith browse              # Opens docs in browser
evolith commands list       # Lists all commands with descriptions
evolith commands search validate  # Search for commands
evolith <command> --help    # Better contextual help
```

**References:**
- Stripe CLI: `stripe browse`, `stripe resources list`

---

### GAP-008: Auto-Update Mechanism
**Status:** 🟡 Pending
**Priority:** 🟡 Medium
**Phase:** 3
**Created:** 2026-06-06

**Description:** No automatic update checking or self-update command.

**Expected Behavior:**
```bash
evolith update              # Check and install updates
evolith version             # Show current version
# On startup: "A new version (1.2.0) is available. Run 'evolith update'"
```

**References:**
- GitHub CLI: `gh upgrade`
- Stripe CLI: Automatic prompt on outdated

---

### GAP-009: Real-time Progress/Streaming
**Status:** 🟡 Pending
**Priority:** 🟡 Medium
**Phase:** 3
**Created:** 2026-06-06

**Description:** No progress indication during long-running operations.

**Expected Behavior:**
```bash
evolith validate --verbose  # Show real-time progress
# Output:
# [1/5] Checking evolith.yaml...
# [2/5] Validating ADR registry...
# [3/5] Running ACL checks...
# [4/5] Validating architecture...
# [5/5] Generating report...
```

**References:**
- Stripe CLI: `stripe logs tail` (real-time streaming)

---

### GAP-010: Subcommand Depth
**Status:** 🟡 Pending
**Priority:** 🟡 Medium
**Phase:** 3
**Created:** 2026-06-06

**Description:** All commands are flat. No nested subcommands for organization.

**Expected Behavior:**
```bash
# Current (flat)
evolith adr create
evolith adr list

# Desired (nested)
evolith adr status list
evolith adr status get <id>
evolith validate ruleset list
evolith validate ruleset acl detail
evolith validate ruleset open-core check
```

**References:**
- GitHub CLI: `gh pr create`, `gh pr checks`, `gh pr comment`
- AWS CLI: Deep nesting (e.g., `aws ec2 describe-instances`)

---

## DISTRIBUTION

### GAP-011: Package Manager Distribution
**Status:** 🟡 Pending
**Priority:** 🟡 Medium
**Phase:** 3
**Created:** 2026-06-06

**Description:** No official packages for Homebrew, apt, yum, winget.

**Expected Behavior:**
```bash
brew install evolith/tap/cli
apt install evolith-cli
yum install evolith-cli
winget install Evolith.CLI
```

**References:** All major CLIs support multiple package managers

---

### GAP-012: Docker Image
**Status:** 🟡 Pending
**Priority:** 🟡 Medium
**Phase:** 3
**Created:** 2026-06-06

**Description:** No official Docker image for CI/CD usage.

**Expected Behavior:**
```bash
docker run evolith/cli validate --satellite /repo
# In CI/CD
docker pull evolith/cli:latest
```

**References:**
- Stripe CLI: `docker run stripe/stripe-cli`
- AWS CLI: Official images

---

## NICE-TO-HAVE

### GAP-013: Aliases
**Status:** 🟡 Pending
**Priority:** 🟢 Low
**Phase:** 4
**Created:** 2026-06-06

**Description:** No user-defined command aliases.

**Expected Behavior:**
```bash
evolith alias set validate v
evolith alias set "adr create" adr-new
evolith alias list
evolith alias delete validate
```

**References:**
- GitHub CLI: `gh alias set`

---

### GAP-014: Interactive Wizards
**Status:** 🟡 Pending
**Priority:** 🟢 Low
**Phase:** 4
**Created:** 2026-06-06

**Description:** No step-by-step wizards for complex operations.

**Expected Behavior:**
```bash
evolith init --wizard  # Interactive setup wizard
# Step 1: Select runtime
# Step 2: Configure core path
# Step 3: Set governance version
# Step 4: Initialize directory structure
```

**References:**
- AWS CLI v2: `aws configure wizard`
- AWS CLI v2: `aws dynamodb wizard`

---

### GAP-015: Fixtures/Test Data
**Status:** 🟡 Pending
**Priority:** 🟢 Low
**Phase:** 4
**Created:** 2026-06-06

**Description:** No built-in test fixtures or sample data for testing.

**Expected Behavior:**
```bash
evolith fixture generate  # Generate sample evolith.yaml
evolith fixture list      # List available fixtures
evolith fixture apply sample-project  # Apply fixture to current dir
```

**References:**
- Stripe CLI: `stripe fixtures`
- API testing tools

---

### GAP-016: Shell Integration
**Status:** 🟡 Pending
**Priority:** 🟢 Low
**Phase:** 4
**Created:** 2026-06-06

**Description:** No eval/hook for shell prompt integration.

**Expected Behavior:**
```bash
# In .bashrc/.zshrc
eval "$(evolith init --shell)"  # Adds custom prompt info
# Shows current phase in prompt: [phase-2] my-project $
```

**References:**
- AWS CLI: `aws_zsh_completer`
- GitHub CLI: Shell integration hints

---

## COMPLETED ITEMS

### DONE-001: MCP Native Integration
**Status:** [DONE] Completed
**Completed:** 2026-06-06

**Description:** MCP server implemented with stdio transport.

**Evidence:**
- `sdk/cli/src/core/mcp/server.ts`
- Tools: validate, agent-*, architecture-validate, sdlc-*, config-*, metrics
- Resources and prompts implemented

---

### DONE-002: Structured Logging
**Status:** [DONE] Completed
**Completed:** 2026-06-06

**Description:** JSON structured logging with context.

**Evidence:**
- `sdk/cli/src/core/observability/structured-logger.ts`
- CommandWatcher, ErrorReporter, @Timed decorator

---

### DONE-003: Bilingual Support (EN/ES)
**Status:** [DONE] Completed
**Completed:** 2026-06-06

**Description:** All commands available in English and Spanish.

**Evidence:**
- All commands use @clack/prompts with ES messages
- Help text in Spanish

---

## Statistics

| Category | Total | Completed | In Progress | Pending |
|----------|-------|-----------|-------------|---------|
| Gaps Críticos | 3 | 3 | 0 | 0 |
| Enterprise Readiness | 3 | 0 | 0 | 3 |
| Developer Experience | 4 | 0 | 0 | 4 |
| Distribution | 2 | 0 | 0 | 2 |
| Nice-to-Have | 4 | 0 | 0 | 4 |
| **Total** | **16** | **6** | **0** | **10** |

---

## Phase Roadmap

### Phase 1 (Weeks 1-2): UX Essentials
- [x] GAP-001: Shell Autocomplete
- [x] GAP-002: Command History
- [x] GAP-003: Table/YAML Output

### Phase 2 (Weeks 3-4): Enterprise Ready
- [ ] GAP-004: Multiple Profiles
- [ ] GAP-005: Extension/Plugin System
- [ ] GAP-006: SSO/SAML Authentication

### Phase 3 (Weeks 5-6): Developer Experience
- [ ] GAP-007: API Browser/Explorer
- [ ] GAP-008: Auto-Update Mechanism
- [ ] GAP-009: Real-time Progress/Streaming
- [ ] GAP-010: Subcommand Depth

### Phase 4 (Future): Polish
- [ ] GAP-011: Package Manager Distribution
- [ ] GAP-012: Docker Image
- [ ] GAP-013: Aliases
- [ ] GAP-014: Interactive Wizards
- [ ] GAP-015: Fixtures/Test Data
- [ ] GAP-016: Shell Integration

---

## Distribution Priority (Current Focus)

The following items are prioritized for making the CLI consumable by users and AI agents.

### DIS-001: CLI README.md
**Status:** 🟡 Pending
**Priority:** 🔴 High
**Created:** 2026-06-06

**Description:** Complete README.md with installation, quickstart, and command reference.

**Expected:**
- Installation instructions (npm, direct binary)
- Quickstart guide (3 commands to get started)
- MCP integration examples for Cursor, Claude Desktop
- Command reference with examples
- Troubleshooting section

---

### DIS-002: MCP Integration Examples
**Status:** 🟡 Pending
**Priority:** 🔴 High
**Created:** 2026-06-06

**Description:** Working examples of AI agents using the Evolith MCP server.

**Expected:**
- Cursor AI configuration example
- Claude Desktop configuration example  
- Example AI agent sessions showing MCP tool usage
- Step-by-step guide for AI-first workflow

---

### DIS-003: npm Package Preparation
**Status:** 🟡 Pending
**Priority:** 🔴 High
**Created:** 2026-06-06

**Description:** Prepare package.json for public npm publication.

**Expected:**
- Version bump to 1.0.0-alpha or beta
- Update description, keywords, repository
- Add FUNDING.yml, engines field
- Validate npm install works
- Add npm registry publication workflow

---

### DIS-004: Docker Image
**Status:** 🟡 Pending
**Priority:** 🟡 Medium
**Created:** 2026-06-06

**Description:** Official Docker image for CI/CD usage.

**Expected:**
- Dockerfile in root
- Multi-stage build for small image
- Test container in CI

---

### DIS-005: Quickstart Guide
**Status:** 🟡 Pending
**Priority:** 🟡 Medium
**Created:** 2026-06-06

**Description:** 5-minute quickstart for new users.

**Expected:**
- Create evolith.yaml example
- Run first validation
- Install first agent
- Generate first ADR

---

## Deprecated Phases (Deferred)

Phase 2-4 have been deferred to focus on Distribution first.

### Phase 2 (Weeks 3-4): Enterprise Ready
**Status:** ⏸️ Deferred
- GAP-004: Multiple Profiles
- GAP-005: Extension/Plugin System  
- GAP-006: SSO/SAML Authentication

### Phase 3 (Weeks 5-6): Developer Experience
**Status:** ⏸️ Deferred
- GAP-007: API Browser/Explorer
- GAP-008: Auto-Update Mechanism
- GAP-009: Real-time Progress/Streaming
- GAP-010: Subcommand Depth

### Phase 4 (Future): Polish
**Status:** ⏸️ Deferred
- GAP-011: Package Manager Distribution
- GAP-012: Docker Image
- GAP-013: Aliases
- GAP-014: Interactive Wizards
- GAP-015: Fixtures/Test Data
- GAP-016: Shell Integration

---

## Changelog

| Date | Item | Change |
|------|------|--------|
| 2026-06-06 | All | Initial backlog created |
| 2026-06-06 | DONE-001, DONE-002, DONE-003 | Marked as completed |
| 2026-06-06 | GAP-001, GAP-002, GAP-003 | Phase 1 completed: Autocomplete, History, Table/YAML output |
| 2026-06-06 | Phase 2-4 | DEPRECATED - Deferred to focus on Distribution first |
| 2026-06-06 | DIS-001 to DIS-005 | Added Distribution Priority items |