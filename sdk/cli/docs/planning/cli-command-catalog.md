# CLI Command Catalog

> **Status:** Proposed
> **Date:** 2026-06-06
> **Reference:** SDK/CLI/MCP Target Architecture §3

---

## 1. Command Syntax

All commands follow: `evolith <domain> <action> [options]`

### Global Options (all commands)

| Option | Description | Default |
|--------|-------------|---------|
| `--core <path>` | Path to Evolith Core | auto-detect |
| `--satellite <path>` | Path to satellite | cwd |
| `--format <format>` | Output format (json/yaml/text) | text |
| `--output <path>` | Write output to file | stdout |
| `--verbose` | Enable verbose output | false |
| `--quiet` | Suppress non-essential output | false |
| `--dry-run` | Simulate without making changes | false |
| `--help` | Show help for command | - |

---

## 2. General Commands

### `evolith version`
**Purpose:** Show CLI version and Core compatibility
```bash
evolith version
# Output: @evolith/cli v1.1.0 | Core v1.0.0 | SDK v1.0.0
```

### `evolith help [command]`
**Purpose:** Show help for CLI or specific command
```bash
evolith help validate
```

### `evolith doctor`
**Purpose:** Check CLI health and configuration
```bash
evolith doctor
# Checks: Node version, Core presence, config validity, network
```

### `evolith info`
**Purpose:** Show CLI capabilities and configured Core
```bash
evolith info
```

---

## 3. Core Commands

### `evolith core info`
**Purpose:** Show Core metadata
```bash
evolith core info [--core <path>]
```

### `evolith core validate`
**Purpose:** Validate Core integrity
```bash
evolith core validate [--core <path>]
```

### `evolith core update`
**Purpose:** Check for and apply Core updates
```bash
evolith core update [--core <path>] [--force]
```

### `evolith core search <query>`
**Purpose:** Search Core content
```bash
evolith core search "hexagonal architecture"
```

### `evolith core index`
**Purpose:** Show full Core index
```bash
evolith core index [--format json]
```

---

## 4. Ruleset Commands

### `evolith ruleset list`
**Purpose:** List all available rulesets
```bash
evolith ruleset list [--category <category>]
# Categories: architecture, sdlc, governance, adr, cross-cutting, acl
```

### `evolith ruleset show <rulesetId>`
**Purpose:** Show ruleset details
```bash
evolith ruleset show adr-0002
evolith ruleset show inheritance
```

### `evolith ruleset validate`
**Purpose:** Validate satellite against rulesets
```bash
evolith ruleset validate [--satellite <path>] [--ruleset <id>]
```

### `evolith ruleset explain <ruleId>`
**Purpose:** Explain a rule's intent and validation
```bash
evolith ruleset explain HXA-01
```

### `evolith ruleset dependencies <rulesetId>`
**Purpose:** Show ruleset dependencies
```bash
evolith ruleset dependencies adr-0002
```

---

## 5. Validate Commands

### `evolith validate project`
**Purpose:** Validate entire satellite project
```bash
evolith validate project [--satellite <path>] [--format json]
```
**Uses:** All applicable rulesets

### `evolith validate architecture`
**Purpose:** Validate architecture rules (F1/F2/F3)
```bash
evolith validate architecture [--satellite <path>]
```
**Uses:** f1-modular-monolith, f2-distributed-modules, f3-microservices

### `evolith validate sdlc`
**Purpose:** Validate SDLC rules
```bash
evolith validate sdlc [--satellite <path>]
```
**Uses:** phase-gates, quality-thresholds

### `evolith validate all`
**Purpose:** Validate against all rulesets
```bash
evolith validate all [--satellite <path>]
```

---

## 6. Artifact Commands

### `evolith artifact list`
**Purpose:** List available artifact templates
```bash
evolith artifact list [--phase <1-5>]
```

### `evolith artifact show <templateId>`
**Purpose:** Show artifact template details
```bash
evolith artifact show functional-story
```

### `evolith artifact generate`
**Purpose:** Generate artifact from template
```bash
evolith artifact generate <templateId> [--context <json>] [--output <path>]
```

### `evolith artifact validate <file>`
**Purpose:** Validate artifact against schema
```bash
evolith artifact validate ./docs/user-story.md
```

### `evolith artifact trace <artifactId>`
**Purpose:** Show artifact traceability
```bash
evolith artifact trace US-001
```

---

## 7. SDLC Commands

### `evolith sdlc status`
**Purpose:** Show current SDLC status
```bash
evolith sdlc status [--satellite <path>]
```

### `evolith sdlc next`
**Purpose:** Show next action in SDLC
```bash
evolith sdlc next [--satellite <path>]
```

### `evolith sdlc report`
**Purpose:** Generate SDLC report
```bash
evolith sdlc report [--satellite <path>] [--format json] [--output <path>]
```

---

## 8. Gate Commands

### `evolith gate list`
**Purpose:** List all phase gates
```bash
evolith gate list [--phase <1-5>]
```

### `evolith gate status <phase> <gate>`
**Purpose:** Show gate status
```bash
evolith gate status 3 2  # Phase 3, Gate 2 (Successful Build)
```

### `evolith gate validate <phase> <gate>`
**Purpose:** Validate gate requirements
```bash
evolith gate validate 3 2 [--satellite <path>]
```

### `evolith gate evidence <phase> <gate>`
**Purpose:** Show gate evidence
```bash
evolith gate evidence 3 2 [--satellite <path>]
```

---

## 9. ADR Commands

### `evolith adr list`
**Purpose:** List ADRs
```bash
evolith adr list [--status <status>] [--runtime <runtime>]
# Status: proposed, accepted, deprecated, superseded
# Runtime: core, nodejs, dotnet
```

### `evolith adr show <adrId>`
**Purpose:** Show ADR details
```bash
evolith adr show ADR-0002
```

### `evolith adr search <query>`
**Purpose:** Search ADRs
```bash
evolith adr search "hexagonal"
```

### `evolith adr create`
**Purpose:** Create new ADR (interactive)
```bash
evolith adr create [--context <json>]
```

### `evolith adr validate <file>`
**Purpose:** Validate ADR against schema
```bash
evolith adr validate ./docs/adr/my-decision.md
```

### `evolith adr dependencies <adrId>`
**Purpose:** Show ADR dependencies
```bash
evolith adr dependencies ADR-0018
```

---

## 10. Agent Commands

### `evolith agent list`
**Purpose:** List available agents
```bash
evolith agent list
```

### `evolith agent show <agentId>`
**Purpose:** Show agent capabilities
```bash
evolith agent show @architect
```

### `evolith agent install [--agents <names>]`
**Purpose:** Install agents to satellite
```bash
evolith agent install --agents @po,@architect --satellite <path>
```

### `evolith agent validate`
**Purpose:** Validate agent configuration
```bash
evolith agent validate [--satellite <path>]
```

---

## 11. Architecture Commands

### `evolith architecture list`
**Purpose:** List architecture phases
```bash
evolith architecture list
```

### `evolith architecture show <phase>`
**Purpose:** Show phase details
```bash
evolith architecture show F1
```

### `evolith architecture initialize`
**Purpose:** Initialize architecture for satellite
```bash
evolith architecture initialize F1 [--satellite <path>]
```

### `evolith architecture validate`
**Purpose:** Validate against current phase rules
```bash
evolith architecture validate [--satellite <path>]
```

### `evolith architecture drift`
**Purpose:** Detect architectural drift
```bash
evolith architecture drift [--satellite <path>]
```

### `evolith architecture report`
**Purpose:** Generate architecture report
```bash
evolith architecture report [--satellite <path>] [--format json]
```

---

## 12. Scaffold Commands

### `evolith scaffold project`
**Purpose:** Scaffold new satellite project
```bash
evolith scaffold project --name <name> --type <type> [--phase F1|F2|F3]
```

### `evolith scaffold domain`
**Purpose:** Scaffold new domain
```bash
evolith scaffold domain --name <name> --bounded-context <context>
```

### `evolith scaffold workspace`
**Purpose:** Scaffold Nx workspace
```bash
evolith scaffold workspace --frontend <react|angular> --orm <prisma|typeorm>
```

---

## 13. Evidence Commands

### `evolith evidence list`
**Purpose:** List collected evidence
```bash
evolith evidence list [--scope <scope>]
```

### `evolith evidence collect`
**Purpose:** Collect evidence for compliance
```bash
evolith evidence collect [--satellite <path>] [--scope <scope>]
```

### `evolith evidence validate`
**Purpose:** Validate evidence completeness
```bash
evolith evidence validate [--satellite <path>]
```

### `evolith evidence export`
**Purpose:** Export evidence report
```bash
evolith evidence export --format <sarif|json|markdown> --output <path>
```

---

## 14. Report Commands

### `evolith report compliance`
**Purpose:** Generate compliance report
```bash
evolith report compliance [--satellite <path>] [--format json]
```

### `evolith report coverage`
**Purpose:** Generate coverage report
```bash
evolith report coverage [--satellite <path>]
```

### `evolith report drift`
**Purpose:** Generate drift report
```bash
evolith report drift [--satellite <path>]
```

### `evolith report executive`
**Purpose:** Generate executive summary (DORA+SPACE)
```bash
evolith report executive [--satellite <path>] [--format json]
```

---

## 15. Implementation Status

| Command | Status | Priority |
|---------|--------|----------|
| `version` | IMPLEMENTED | - |
| `help` | IMPLEMENTED | - |
| `doctor` | NOT_IMPLEMENTED | MEDIUM |
| `info` | NOT_IMPLEMENTED | LOW |
| `core info` | IMPLEMENTED | - |
| `core validate` | IMPLEMENTED | - |
| `core update` | NOT_IMPLEMENTED | MEDIUM |
| `core search` | NOT_IMPLEMENTED | LOW |
| `core index` | NOT_IMPLEMENTED | LOW |
| `ruleset list` | IMPLEMENTED | - |
| `ruleset show` | IMPLEMENTED | - |
| `ruleset validate` | IMPLEMENTED | - |
| `ruleset explain` | NOT_IMPLEMENTED | HIGH |
| `validate project` | IMPLEMENTED | - |
| `validate architecture` | NOT_IMPLEMENTED | HIGH |
| `validate sdlc` | NOT_IMPLEMENTED | HIGH |
| `artifact list` | NOT_IMPLEMENTED | MEDIUM |
| `artifact generate` | NOT_IMPLEMENTED | MEDIUM |
| `artifact validate` | NOT_IMPLEMENTED | MEDIUM |
| `sdlc status` | NOT_IMPLEMENTED | MEDIUM |
| `sdlc next` | NOT_IMPLEMENTED | MEDIUM |
| `gate list` | NOT_IMPLEMENTED | MEDIUM |
| `gate status` | NOT_IMPLEMENTED | MEDIUM |
| `gate validate` | NOT_IMPLEMENTED | HIGH |
| `adr list` | NOT_IMPLEMENTED | MEDIUM |
| `adr show` | NOT_IMPLEMENTED | MEDIUM |
| `adr create` | NOT_IMPLEMENTED | MEDIUM |
| `agent install` | STUB | HIGH |
| `architecture initialize` | PARTIALLY_IMPLEMENTED | HIGH |
| `architecture validate` | NOT_IMPLEMENTED | HIGH |
| `architecture drift` | NOT_IMPLEMENTED | HIGH |
| `scaffold project` | PARTIALLY_IMPLEMENTED | HIGH |
| `evidence collect` | NOT_IMPLEMENTED | MEDIUM |
| `report compliance` | NOT_IMPLEMENTED | MEDIUM |

---
[Back to SDK/CLI Planning Index](./README.md)