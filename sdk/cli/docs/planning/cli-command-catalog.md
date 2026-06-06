# CLI Command Catalog

> **Status:** Proposed
> **Date:** 2026-06-06
> **Reference:** SDK/CLI/MCP Target Architecture §3

---

## 1. Command Syntax

All commands follow: `smart-cli <domain> <action> [options]`

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

### `smart-cli version`
**Purpose:** Show CLI version and Core compatibility
```bash
smart-cli version
# Output: @smart-cli/cli v1.1.0 | Core v1.0.0 | SDK v1.0.0
```

### `smart-cli help [command]`
**Purpose:** Show help for CLI or specific command
```bash
smart-cli help validate
```

### `smart-cli doctor`
**Purpose:** Check CLI health and configuration
```bash
smart-cli doctor
# Checks: Node version, Core presence, config validity, network
```

### `smart-cli info`
**Purpose:** Show CLI capabilities and configured Core
```bash
smart-cli info
```

---

## 3. Core Commands

### `smart-cli core info`
**Purpose:** Show Core metadata
```bash
smart-cli core info [--core <path>]
```

### `smart-cli core validate`
**Purpose:** Validate Core integrity
```bash
smart-cli core validate [--core <path>]
```

### `smart-cli core update`
**Purpose:** Check for and apply Core updates
```bash
smart-cli core update [--core <path>] [--force]
```

### `smart-cli core search <query>`
**Purpose:** Search Core content
```bash
smart-cli core search "hexagonal architecture"
```

### `smart-cli core index`
**Purpose:** Show full Core index
```bash
smart-cli core index [--format json]
```

---

## 4. Ruleset Commands

### `smart-cli ruleset list`
**Purpose:** List all available rulesets
```bash
smart-cli ruleset list [--category <category>]
# Categories: architecture, sdlc, governance, adr, cross-cutting, acl
```

### `smart-cli ruleset show <rulesetId>`
**Purpose:** Show ruleset details
```bash
smart-cli ruleset show adr-0002
smart-cli ruleset show inheritance
```

### `smart-cli ruleset validate`
**Purpose:** Validate satellite against rulesets
```bash
smart-cli ruleset validate [--satellite <path>] [--ruleset <id>]
```

### `smart-cli ruleset explain <ruleId>`
**Purpose:** Explain a rule's intent and validation
```bash
smart-cli ruleset explain HXA-01
```

### `smart-cli ruleset dependencies <rulesetId>`
**Purpose:** Show ruleset dependencies
```bash
smart-cli ruleset dependencies adr-0002
```

---

## 5. Validate Commands

### `smart-cli validate project`
**Purpose:** Validate entire satellite project
```bash
smart-cli validate project [--satellite <path>] [--format json]
```
**Uses:** All applicable rulesets

### `smart-cli validate architecture`
**Purpose:** Validate architecture rules (F1/F2/F3)
```bash
smart-cli validate architecture [--satellite <path>]
```
**Uses:** f1-modular-monolith, f2-distributed-modules, f3-microservices

### `smart-cli validate sdlc`
**Purpose:** Validate SDLC rules
```bash
smart-cli validate sdlc [--satellite <path>]
```
**Uses:** phase-gates, quality-thresholds

### `smart-cli validate all`
**Purpose:** Validate against all rulesets
```bash
smart-cli validate all [--satellite <path>]
```

---

## 6. Artifact Commands

### `smart-cli artifact list`
**Purpose:** List available artifact templates
```bash
smart-cli artifact list [--phase <1-5>]
```

### `smart-cli artifact show <templateId>`
**Purpose:** Show artifact template details
```bash
smart-cli artifact show functional-story
```

### `smart-cli artifact generate`
**Purpose:** Generate artifact from template
```bash
smart-cli artifact generate <templateId> [--context <json>] [--output <path>]
```

### `smart-cli artifact validate <file>`
**Purpose:** Validate artifact against schema
```bash
smart-cli artifact validate ./docs/user-story.md
```

### `smart-cli artifact trace <artifactId>`
**Purpose:** Show artifact traceability
```bash
smart-cli artifact trace US-001
```

---

## 7. SDLC Commands

### `smart-cli sdlc status`
**Purpose:** Show current SDLC status
```bash
smart-cli sdlc status [--satellite <path>]
```

### `smart-cli sdlc next`
**Purpose:** Show next action in SDLC
```bash
smart-cli sdlc next [--satellite <path>]
```

### `smart-cli sdlc report`
**Purpose:** Generate SDLC report
```bash
smart-cli sdlc report [--satellite <path>] [--format json] [--output <path>]
```

---

## 8. Gate Commands

### `smart-cli gate list`
**Purpose:** List all phase gates
```bash
smart-cli gate list [--phase <1-5>]
```

### `smart-cli gate status <phase> <gate>`
**Purpose:** Show gate status
```bash
smart-cli gate status 3 2  # Phase 3, Gate 2 (Successful Build)
```

### `smart-cli gate validate <phase> <gate>`
**Purpose:** Validate gate requirements
```bash
smart-cli gate validate 3 2 [--satellite <path>]
```

### `smart-cli gate evidence <phase> <gate>`
**Purpose:** Show gate evidence
```bash
smart-cli gate evidence 3 2 [--satellite <path>]
```

---

## 9. ADR Commands

### `smart-cli adr list`
**Purpose:** List ADRs
```bash
smart-cli adr list [--status <status>] [--runtime <runtime>]
# Status: proposed, accepted, deprecated, superseded
# Runtime: core, nodejs, dotnet
```

### `smart-cli adr show <adrId>`
**Purpose:** Show ADR details
```bash
smart-cli adr show ADR-0002
```

### `smart-cli adr search <query>`
**Purpose:** Search ADRs
```bash
smart-cli adr search "hexagonal"
```

### `smart-cli adr create`
**Purpose:** Create new ADR (interactive)
```bash
smart-cli adr create [--context <json>]
```

### `smart-cli adr validate <file>`
**Purpose:** Validate ADR against schema
```bash
smart-cli adr validate ./docs/adr/my-decision.md
```

### `smart-cli adr dependencies <adrId>`
**Purpose:** Show ADR dependencies
```bash
smart-cli adr dependencies ADR-0018
```

---

## 10. Agent Commands

### `smart-cli agent list`
**Purpose:** List available agents
```bash
smart-cli agent list
```

### `smart-cli agent show <agentId>`
**Purpose:** Show agent capabilities
```bash
smart-cli agent show @architect
```

### `smart-cli agent install [--agents <names>]`
**Purpose:** Install agents to satellite
```bash
smart-cli agent install --agents @po,@architect --satellite <path>
```

### `smart-cli agent validate`
**Purpose:** Validate agent configuration
```bash
smart-cli agent validate [--satellite <path>]
```

---

## 11. Architecture Commands

### `smart-cli architecture list`
**Purpose:** List architecture phases
```bash
smart-cli architecture list
```

### `smart-cli architecture show <phase>`
**Purpose:** Show phase details
```bash
smart-cli architecture show F1
```

### `smart-cli architecture initialize`
**Purpose:** Initialize architecture for satellite
```bash
smart-cli architecture initialize F1 [--satellite <path>]
```

### `smart-cli architecture validate`
**Purpose:** Validate against current phase rules
```bash
smart-cli architecture validate [--satellite <path>]
```

### `smart-cli architecture drift`
**Purpose:** Detect architectural drift
```bash
smart-cli architecture drift [--satellite <path>]
```

### `smart-cli architecture report`
**Purpose:** Generate architecture report
```bash
smart-cli architecture report [--satellite <path>] [--format json]
```

---

## 12. Scaffold Commands

### `smart-cli scaffold project`
**Purpose:** Scaffold new satellite project
```bash
smart-cli scaffold project --name <name> --type <type> [--phase F1|F2|F3]
```

### `smart-cli scaffold domain`
**Purpose:** Scaffold new domain
```bash
smart-cli scaffold domain --name <name> --bounded-context <context>
```

### `smart-cli scaffold workspace`
**Purpose:** Scaffold Nx workspace
```bash
smart-cli scaffold workspace --frontend <react|angular> --orm <prisma|typeorm>
```

---

## 13. Evidence Commands

### `smart-cli evidence list`
**Purpose:** List collected evidence
```bash
smart-cli evidence list [--scope <scope>]
```

### `smart-cli evidence collect`
**Purpose:** Collect evidence for compliance
```bash
smart-cli evidence collect [--satellite <path>] [--scope <scope>]
```

### `smart-cli evidence validate`
**Purpose:** Validate evidence completeness
```bash
smart-cli evidence validate [--satellite <path>]
```

### `smart-cli evidence export`
**Purpose:** Export evidence report
```bash
smart-cli evidence export --format <sarif|json|markdown> --output <path>
```

---

## 14. Report Commands

### `smart-cli report compliance`
**Purpose:** Generate compliance report
```bash
smart-cli report compliance [--satellite <path>] [--format json]
```

### `smart-cli report coverage`
**Purpose:** Generate coverage report
```bash
smart-cli report coverage [--satellite <path>]
```

### `smart-cli report drift`
**Purpose:** Generate drift report
```bash
smart-cli report drift [--satellite <path>]
```

### `smart-cli report executive`
**Purpose:** Generate executive summary (DORA+SPACE)
```bash
smart-cli report executive [--satellite <path>] [--format json]
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