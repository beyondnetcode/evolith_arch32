# CLI Command Catalog

> **Status:** Proposed
> **Date:** 2026-06-06
> **Reference:** SDK/CLI/MCP Target Architecture §3

---

## 1. Command Syntax

All commands follow: `evolith-cli <domain> <action> [options]`

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

### `evolith-cli version`
**Purpose:** Show CLI version and Core compatibility
```bash
evolith-cli version
# Output: @smart-cli/cli v1.1.0 | Core v1.0.0 | SDK v1.0.0
```

### `evolith-cli help [command]`
**Purpose:** Show help for CLI or specific command
```bash
evolith-cli help validate
```

### `evolith-cli doctor`
**Purpose:** Check CLI health and configuration
```bash
evolith-cli doctor
# Checks: Node version, Core presence, config validity, network
```

### `evolith-cli info`
**Purpose:** Show CLI capabilities and configured Core
```bash
evolith-cli info
```

---

## 3. Core Commands

### `evolith-cli core info`
**Purpose:** Show Core metadata
```bash
evolith-cli core info [--core <path>]
```

### `evolith-cli core validate`
**Purpose:** Validate Core integrity
```bash
evolith-cli core validate [--core <path>]
```

### `evolith-cli core update`
**Purpose:** Check for and apply Core updates
```bash
evolith-cli core update [--core <path>] [--force]
```

### `evolith-cli core search <query>`
**Purpose:** Search Core content
```bash
evolith-cli core search "hexagonal architecture"
```

### `evolith-cli core index`
**Purpose:** Show full Core index
```bash
evolith-cli core index [--format json]
```

---

## 4. Ruleset Commands

### `evolith-cli ruleset list`
**Purpose:** List all available rulesets
```bash
evolith-cli ruleset list [--category <category>]
# Categories: architecture, sdlc, governance, adr, cross-cutting, acl
```

### `evolith-cli ruleset show <rulesetId>`
**Purpose:** Show ruleset details
```bash
evolith-cli ruleset show adr-0002
evolith-cli ruleset show inheritance
```

### `evolith-cli ruleset validate`
**Purpose:** Validate satellite against rulesets
```bash
evolith-cli ruleset validate [--satellite <path>] [--ruleset <id>]
```

### `evolith-cli ruleset explain <ruleId>`
**Purpose:** Explain a rule's intent and validation
```bash
evolith-cli ruleset explain HXA-01
```

### `evolith-cli ruleset dependencies <rulesetId>`
**Purpose:** Show ruleset dependencies
```bash
evolith-cli ruleset dependencies adr-0002
```

---

## 5. Validate Commands

### `evolith-cli validate project`
**Purpose:** Validate entire satellite project
```bash
evolith-cli validate project [--satellite <path>] [--format json]
```
**Uses:** All applicable rulesets

### `evolith-cli validate architecture`
**Purpose:** Validate architecture rules (F1/F2/F3)
```bash
evolith-cli validate architecture [--satellite <path>]
```
**Uses:** f1-modular-monolith, f2-distributed-modules, f3-microservices

### `evolith-cli validate sdlc`
**Purpose:** Validate SDLC rules
```bash
evolith-cli validate sdlc [--satellite <path>]
```
**Uses:** phase-gates, quality-thresholds

### `evolith-cli validate all`
**Purpose:** Validate against all rulesets
```bash
evolith-cli validate all [--satellite <path>]
```

---

## 6. Artifact Commands

### `evolith-cli artifact list`
**Purpose:** List available artifact templates
```bash
evolith-cli artifact list [--phase <1-5>]
```

### `evolith-cli artifact show <templateId>`
**Purpose:** Show artifact template details
```bash
evolith-cli artifact show functional-story
```

### `evolith-cli artifact generate`
**Purpose:** Generate artifact from template
```bash
evolith-cli artifact generate <templateId> [--context <json>] [--output <path>]
```

### `evolith-cli artifact validate <file>`
**Purpose:** Validate artifact against schema
```bash
evolith-cli artifact validate ./docs/user-story.md
```

### `evolith-cli artifact trace <artifactId>`
**Purpose:** Show artifact traceability
```bash
evolith-cli artifact trace US-001
```

---

## 7. SDLC Commands

### `evolith-cli sdlc status`
**Purpose:** Show current SDLC status
```bash
evolith-cli sdlc status [--satellite <path>]
```

### `evolith-cli sdlc next`
**Purpose:** Show next action in SDLC
```bash
evolith-cli sdlc next [--satellite <path>]
```

### `evolith-cli sdlc report`
**Purpose:** Generate SDLC report
```bash
evolith-cli sdlc report [--satellite <path>] [--format json] [--output <path>]
```

---

## 8. Gate Commands

### `evolith-cli gate list`
**Purpose:** List all phase gates
```bash
evolith-cli gate list [--phase <1-5>]
```

### `evolith-cli gate status <phase> <gate>`
**Purpose:** Show gate status
```bash
evolith-cli gate status 3 2  # Phase 3, Gate 2 (Successful Build)
```

### `evolith-cli gate validate <phase> <gate>`
**Purpose:** Validate gate requirements
```bash
evolith-cli gate validate 3 2 [--satellite <path>]
```

### `evolith-cli gate evidence <phase> <gate>`
**Purpose:** Show gate evidence
```bash
evolith-cli gate evidence 3 2 [--satellite <path>]
```

---

## 9. ADR Commands

### `evolith-cli adr list`
**Purpose:** List ADRs
```bash
evolith-cli adr list [--status <status>] [--runtime <runtime>]
# Status: proposed, accepted, deprecated, superseded
# Runtime: core, nodejs, dotnet
```

### `evolith-cli adr show <adrId>`
**Purpose:** Show ADR details
```bash
evolith-cli adr show ADR-0002
```

### `evolith-cli adr search <query>`
**Purpose:** Search ADRs
```bash
evolith-cli adr search "hexagonal"
```

### `evolith-cli adr create`
**Purpose:** Create new ADR (interactive)
```bash
evolith-cli adr create [--context <json>]
```

### `evolith-cli adr validate <file>`
**Purpose:** Validate ADR against schema
```bash
evolith-cli adr validate ./docs/adr/my-decision.md
```

### `evolith-cli adr dependencies <adrId>`
**Purpose:** Show ADR dependencies
```bash
evolith-cli adr dependencies ADR-0018
```

---

## 10. Agent Commands

### `evolith-cli agent list`
**Purpose:** List available agents
```bash
evolith-cli agent list
```

### `evolith-cli agent show <agentId>`
**Purpose:** Show agent capabilities
```bash
evolith-cli agent show @architect
```

### `evolith-cli agent install [--agents <names>]`
**Purpose:** Install agents to satellite
```bash
evolith-cli agent install --agents @po,@architect --satellite <path>
```

### `evolith-cli agent validate`
**Purpose:** Validate agent configuration
```bash
evolith-cli agent validate [--satellite <path>]
```

---

## 11. Architecture Commands

### `evolith-cli architecture list`
**Purpose:** List architecture phases
```bash
evolith-cli architecture list
```

### `evolith-cli architecture show <phase>`
**Purpose:** Show phase details
```bash
evolith-cli architecture show F1
```

### `evolith-cli architecture initialize`
**Purpose:** Initialize architecture for satellite
```bash
evolith-cli architecture initialize F1 [--satellite <path>]
```

### `evolith-cli architecture validate`
**Purpose:** Validate against current phase rules
```bash
evolith-cli architecture validate [--satellite <path>]
```

### `evolith-cli architecture drift`
**Purpose:** Detect architectural drift
```bash
evolith-cli architecture drift [--satellite <path>]
```

### `evolith-cli architecture report`
**Purpose:** Generate architecture report
```bash
evolith-cli architecture report [--satellite <path>] [--format json]
```

---

## 12. Scaffold Commands

### `evolith-cli scaffold project`
**Purpose:** Scaffold new satellite project
```bash
evolith-cli scaffold project --name <name> --type <type> [--phase F1|F2|F3]
```

### `evolith-cli scaffold domain`
**Purpose:** Scaffold new domain
```bash
evolith-cli scaffold domain --name <name> --bounded-context <context>
```

### `evolith-cli scaffold workspace`
**Purpose:** Scaffold Nx workspace
```bash
evolith-cli scaffold workspace --frontend <react|angular> --orm <prisma|typeorm>
```

---

## 13. Evidence Commands

### `evolith-cli evidence list`
**Purpose:** List collected evidence
```bash
evolith-cli evidence list [--scope <scope>]
```

### `evolith-cli evidence collect`
**Purpose:** Collect evidence for compliance
```bash
evolith-cli evidence collect [--satellite <path>] [--scope <scope>]
```

### `evolith-cli evidence validate`
**Purpose:** Validate evidence completeness
```bash
evolith-cli evidence validate [--satellite <path>]
```

### `evolith-cli evidence export`
**Purpose:** Export evidence report
```bash
evolith-cli evidence export --format <sarif|json|markdown> --output <path>
```

---

## 14. Report Commands

### `evolith-cli report compliance`
**Purpose:** Generate compliance report
```bash
evolith-cli report compliance [--satellite <path>] [--format json]
```

### `evolith-cli report coverage`
**Purpose:** Generate coverage report
```bash
evolith-cli report coverage [--satellite <path>]
```

### `evolith-cli report drift`
**Purpose:** Generate drift report
```bash
evolith-cli report drift [--satellite <path>]
```

### `evolith-cli report executive`
**Purpose:** Generate executive summary (DORA+SPACE)
```bash
evolith-cli report executive [--satellite <path>] [--format json]
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