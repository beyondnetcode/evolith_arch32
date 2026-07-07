# Evolith Smart CLI — Complete Demo & Guide

> **Bilingual Navigation:** [Versión en Español](./SMART-CLI-DEMO.es.md)

**Version:** 0.0.3-beta
**Package:** `@evolith/smart-cli`
**Repository:** [evolith_arch32](https://github.com/beyondnetcode/evolith_arch32)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Quick Start](#2-quick-start)
3. [Installation](#3-installation)
4. [evolith.yaml Configuration](#4-evolithyaml-configuration)
5. [Command Reference](#5-command-reference)
6. [SDLC Flow — Phase 0 to Phase 5](#6-sdlc-flow--phase-0-to-phase-5)
7. [Product Type Guides](#7-product-type-guides)
8. [MCP Server & AI Agent Integration](#8-mcp-server--ai-agent-integration)
9. [Architecture Validation — F1/F2/F3](#9-architecture-validation--f1f2f3)
10. [Best Practices & Common Workflows](#10-best-practices--common-workflows)
11. [Troubleshooting & FAQ](#11-troubleshooting--faq)

---

## 1. Introduction

### What is Evolith Smart CLI?

Evolith Smart CLI is the command-line interface for the Evolith architecture governance system. It enables teams to:

- **Initialize** satellite repositories with guided interactive wizards
- **Validate** repositories against machine-readable governance rulesets
- **Manage** the full SDLC lifecycle through phase gates with evidence tracking
- **Detect** architectural drift across F1 (modular monolith), F2 (distributed modules), and F3 (microservices) levels
- **Integrate** with AI agents via MCP (Model Context Protocol) for real-time governance context

### Three Modes of Operation

| Mode | Use Case | Example |
|------|----------|---------|
| **Interactive** | Developer workstation, guided setup | `evolith init` |
| **Batch (CI/CD)** | Automated pipelines, JSON output | `evolith validate --format json` |
| **MCP (AI)** | AI agent integration, real-time context | `evolith mcp serve` |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Evolith Core                         │
│  (Reference Corpus — Constitution, ADRs, Rulesets)      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ pinned version
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 Evolith Smart CLI                       │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │  Init   │ │ Validate │ │  SDLC    │ │   Drift    │  │
│  │ Command │ │ Command  │ │ Commands │ │  Command   │  │
│  └─────────┘ └──────────┘ └──────────┘ └────────────┘  │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │  Agents │ │   ADR    │ │   MCP    │ │  History   │  │
│  │ Command │ │ Command  │ │  Server  │ │  Command   │  │
│  └─────────┘ └──────────┘ └──────────┘ └────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ stdio / HTTP
                       ▼
┌─────────────────────────────────────────────────────────┐
│              AI Agents (Cursor, Claude)                 │
│         MCP Tools: validate, architecture, etc.         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Quick Start

### 5-Minute Setup: Zero to Validated Satellite

```bash
# Step 1: Install the CLI
npm install -g @evolith/smart-cli@beta

# Step 2: Initialize a new satellite repository
mkdir my-project && cd my-project
evolith init

# Step 3: Validate against governance rules
evolith validate --format summary

# Step 4: Install AI agent rules
evolith agents install standard

# Step 5: Check your SDLC phase status
evolith sdlc gate-status
```

**Expected output after validation:**
```
┌   Evolith SDK - Validación de Estándares
│
◇  Analizando repositorio...
│
│  Status: passed
│  Rules checked: 12
│  Issues: 0
│
│  ✓ All governance rules satisfied
```

---

## 3. Installation

### Via npm (Recommended)

```bash
npm install -g @evolith/smart-cli@beta
```

### Verify Installation

```bash
evolith --help
evolith mcp version
```

### Shell Completion

```bash
# Bash
evolith completion --install --shell bash

# Zsh
evolith completion --install --shell zsh

# Fish
evolith completion --install --shell fish
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EVOLITH_CORE_PATH` | Path to Evolith Core repository | Current directory |
| `EVOLITH_CONFIG_PATH` | Path to evolith.yaml | Current directory |
| `EVOLITH_LOG_LEVEL` | Log level (DEBUG, INFO, WARN, ERROR) | INFO |
| `EVOLITH_API_KEY` | API key for MCP HTTP mode | (none) |

---

## 4. evolith.yaml Configuration

The `evolith.yaml` file is the satellite's contract with Evolith Core. It declares runtime, architecture, SDLC phase, and governance settings.

### Minimal Configuration

```yaml
coreRef:
  version: "1.0.0"
  path: "../evolith"
governance:
  version: "1.0"
product:
  name: "my-project"
  type: "library"
```

### Full Configuration

```yaml
coreRef:
  version: "1.0.0"
  path: "../evolith"
governance:
  version: "1.0"
product:
  name: "my-service"
  type: "service"
  runtime: "nodejs"
  architecture: "hexagonal"
  monorepo: "nx"
sdlc:
  currentPhase: 0
  targetPhase: 5
boundedContexts:
  - name: "orders"
    type: "domain"
  - name: "billing"
    type: "domain"
  - name: "shipping"
    type: "domain"
observability:
  logging: "structured"
  metrics: "dora"
  tracing: "distributed"
```

### Scaffold Configuration

```bash
# Create evolith.yaml interactively
evolith docs

# Create with minimal template
evolith docs --template minimal

# Force overwrite existing files
evolith docs --force
```

---

## 5. Command Reference

### evolith init

**Description:** Initialize a satellite repository with guided interactive wizard.

**Usage:**
```bash
evolith init [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--dry-run` | Show what would be created without writing files |
| `--config <path>` | Path to configuration file |
| `--runtime <id>` | Pre-select runtime (nodejs, dotnet, python, etc.) |
| `--monorepo <id>` | Pre-select monorepo strategy (none, nx, turborepo) |
| `--arch <type>` | Pre-select architecture (clean, hexagonal, ddd, layered) |
| `--db <type>` | Pre-select database (postgresql, mongodb, sqlite, none) |

**Examples:**

```bash
# Interactive mode (default)
evolith init

# Batch mode with pre-selected options
evolith init --runtime nodejs --arch hexagonal --monorepo none --db postgresql

# Dry run to preview changes
evolith init --dry-run
```

---

### evolith validate

**Description:** Validate a satellite repository against Evolith governance rulesets.

**Usage:**
```bash
evolith validate [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--format <type>` | Output format: json, summary, table, markdown (default: markdown) |
| `--output <path>` | Write report to file |
| `--satellite <path>` | Path to satellite repository (default: cwd) |
| `--core <path>` | Path to Evolith Core |
| `--ruleset <id>` | Validate specific ruleset only |
| `--architecture` | Include architecture validation |
| `--arch-level <level>` | Architecture level: F1, F2, F3, ALL |

**Examples:**

```bash
# Quick validation with summary
evolith validate --format summary

# Full JSON report for CI/CD
evolith validate --format json --output report.json

# Validate specific satellite
evolith validate --satellite /path/to/satellite --format json

# Validate with architecture checks (F1 modular monolith)
evolith validate --architecture --arch-level F1

# Validate specific ruleset
evolith validate --ruleset acl
```

**JSON Output Example:**
```json
{
  "status": "passed",
  "rulesChecked": 12,
  "issues": [],
  "coreRef": "1.0.0",
  "timestamp": "2026-06-07T12:00:00.000Z"
}
```

---

### evolith sdlc

**Description:** SDLC phase management commands.

**Subcommands:**

#### evolith sdlc handoff

Transition artifacts between SDLC phases.

```bash
evolith sdlc handoff [options]
```

| Option | Description |
|--------|-------------|
| `--from <phase>` | Source phase (phase-0 through phase-4) |
| `--to <phase>` | Target phase (phase-1 through phase-5) |
| `--artifacts` | Generate artifact manifest |
| `--validate` | Validate before transition |
| `--force` | Skip validation warnings |

**Examples:**
```bash
# Interactive handoff
evolith sdlc handoff

# Batch handoff from phase-0 to phase-1
evolith sdlc handoff --from phase-0 --to phase-1

# Handoff with artifact manifest
evolith sdlc handoff --from phase-1 --to phase-2 --artifacts
```

#### evolith sdlc gate-status

Display current SDLC phase gate validation status.

```bash
evolith sdlc gate-status
```

#### evolith sdlc generate

Generate code scaffolding based on SDLC artifacts.

```bash
evolith sdlc generate domain --from ddd-model.md
```

---

### evolith agents

**Description:** Manage Evolith agent rulesets for AI integration.

**Subcommands:**

```bash
# Install an agent ruleset
evolith agents install <name> [options]

# List installed agents
evolith agents list

# Validate an agent ruleset
evolith agents validate <name>

# Upgrade an agent
evolith agents upgrade <name>

# Remove an agent
evolith agents remove <name>
```

**Options:**
| Option | Description |
|--------|-------------|
| `--template <type>` | Template: standard, minimal, enterprise |
| `--dir <path>` | Directory to install into |
| `--dry-run` | Show what would be installed |

**Examples:**
```bash
# Install standard agent
evolith agents install standard

# Install enterprise agent to specific directory
evolith agents install enterprise --dir /path/to/project

# List all installed agents
evolith agents list

# Validate agent ruleset
evolith agents validate standard
```

---

### evolith adr

**Description:** Manage Architecture Decision Records.

**Subcommands:**

```bash
# Create a new ADR
evolith adr create --title "Use PostgreSQL for persistence" --status proposed

# List all ADRs
evolith adr list

# Get ADR details
evolith adr get --id 001

# Update ADR status
evolith adr update --id 001 --status accepted --reason "Team consensus"

# Generate ADR matrix
evolith adr matrix
```

**Options:**
| Option | Description |
|--------|-------------|
| `--title <text>` | ADR title |
| `--status <status>` | Status: proposed, accepted, deprecated, superseded |
| `--id <number>` | ADR number |
| `--reason <text>` | Reason for status change |
| `--context <text>` | Context and problem statement |
| `--decision <text>` | Decision description |
| `--consequences <text>` | Consequences of the decision |

---

### evolith drift

**Description:** Detect and track architectural drift.

**Usage:**
```bash
evolith drift [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--path <dir>` | Path to repository (default: cwd) |
| `--level <level>` | Architecture level: F1, F2, F3 |
| `--json` | Output as JSON |
| `--history` | Show drift history |
| `--trend` | Show drift trend analysis |

**Examples:**
```bash
# Quick drift check
evolith drift

# JSON output for CI/CD
evolith drift --json

# View drift history
evolith drift --history

# Trend analysis
evolith drift --trend

# Check drift at F2 level
evolith drift --level F2 --json
```

---

### evolith history

**Description:** View and manage command execution history.

**Subcommands:**

```bash
# List command history
evolith history list

# Get specific entry
evolith history get --id <id>

# Search history
evolith history search --query "validate"

# Show statistics
evolith history stats

# Clear history
evolith history clear

# Replay a command
evolith history replay --id <id>
```

---

### evolith standards

**Description:** Manage engineering standards and conventions.

**Subcommands:**

```bash
# Initialize standards
evolith standards init

# List standards
evolith standards list

# Get specific standard
evolith standards get --id <id>

# Validate against standards
evolith standards validate

# Export standards
evolith standards export --format json
```

---

### evolith docs

**Description:** Scaffold base documentation.

**Usage:**
```bash
evolith docs [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--dry-run` | Show what would be created |
| `--force` | Overwrite existing files |
| `--template <type>` | Template: default, minimal |

**Examples:**
```bash
# Scaffold all documentation
evolith docs

# Dry run
evolith docs --dry-run

# Minimal template
evolith docs --template minimal

# Force overwrite
evolith docs --force
```

---

### evolith mcp

**Description:** Start Evolith MCP server for AI agent integration.

**Usage:**
```bash
evolith mcp serve [options]
evolith mcp version
```

**Options:**
| Option | Description |
|--------|-------------|
| `--transport <type>` | Transport: stdio (default), http |
| `--port <number>` | HTTP server port (default: 3000) |
| `--api-key <key>` | API key for authentication |

**Examples:**
```bash
# Start MCP server over stdio (for Cursor, Claude Desktop)
evolith mcp serve

# Start MCP server over HTTP
evolith mcp serve --transport http --port 3000

# Start with API key authentication
evolith mcp serve --transport http --port 3000 --api-key my-secret-key

# Check version
evolith mcp version
```

---

### evolith architecture scaffold

**Description:** Scaffold architecture using Nx workspace strategy.

**Usage:**
```bash
evolith architecture scaffold [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--frontend <type>` | Frontend framework: react, angular, vue |
| `--orm <type>` | ORM: typeorm, prisma, none |

---

### evolith completion

**Description:** Install shell completion scripts.

**Usage:**
```bash
evolith completion [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--install` | Install completion script |
| `--shell <type>` | Shell: bash, zsh, fish |

---

## 6. SDLC Flow — Phase 0 to Phase 5

Evolith defines 5 SDLC phases with gate validation between each transition.

### Phase Gate Overview

```
Phase 0          Phase 1          Phase 2          Phase 3          Phase 4          Phase 5
Discovery ─────► Specification ──► Design ────────► Construction ──► QA ────────────► Release
                 [Gate 1]         [Gate 2]         [Gate 3]         [Gate 4]         [Gate 5]
```

### Phase 0: Discovery

**Goal:** Define project scope, MoSCoW prioritization, and initial architecture decisions.

**CLI Commands:**
```bash
# Initialize the project
evolith init

# Scaffold documentation
evolith docs

# Install AI agent
evolith agents install standard

# Create MoSCoW analysis (via MCP)
# evolith-moscow-create with items

# Validate initial setup
evolith validate --format summary
```

**Evidence Artifacts:**
- `evolith.yaml` — Project configuration
- `README.md` — Project overview
- `AGENTS.md` — Agent configuration
- `MASTER_INDEX.md` — Documentation index

**Gate 1 Requirements:**
- [ ] evolith.yaml exists and is valid
- [ ] Core reference version pinned
- [ ] Product name and type declared
- [ ] Documentation scaffolded

---

### Phase 1: Specification

**Goal:** Define requirements, create ADRs, establish standards.

**CLI Commands:**
```bash
# Transition from Phase 0 to Phase 1
evolith sdlc handoff --from phase-0 --to phase-1

# Create ADRs
evolith adr create --title "Use hexagonal architecture" --status proposed
evolith adr create --title "PostgreSQL as primary database" --status proposed

# Initialize standards
evolith standards init

# Validate
evolith validate --format summary
```

**Evidence Artifacts:**
- ADRs in `reference/core/architecture/adrs/`
- Standards in `reference/core/sdlc/standards/`
- Requirements document

**Gate 2 Requirements:**
- [ ] At least 3 ADRs created
- [ ] Standards initialized
- [ ] Requirements documented
- [ ] Phase 0 gate passed

---

### Phase 2: Design

**Goal:** Design bounded contexts, define contracts, map architecture.

**CLI Commands:**
```bash
# Transition to Phase 2
evolith sdlc handoff --from phase-1 --to phase-2

# Validate ACL rules
evolith validate --ruleset acl

# Scaffold architecture (if using Nx)
evolith architecture scaffold --frontend react --orm prisma

# Architecture validation (F1)
evolith validate --architecture --arch-level F1
```

**Evidence Artifacts:**
- Bounded context map
- Contract definitions
- Architecture diagram
- DDD model (if applicable)

**Gate 3 Requirements:**
- [ ] Bounded contexts defined
- [ ] Contracts between contexts specified
- [ ] Architecture validated at F1 level
- [ ] No blocking ACL violations

---

### Phase 3: Construction

**Goal:** Implement features, write tests, maintain architecture integrity.

**CLI Commands:**
```bash
# Transition to Phase 3
evolith sdlc handoff --from phase-2 --to phase-3

# Validate architecture (F1 - modular independence)
evolith validate --architecture --arch-level F1

# Check for drift
evolith drift --level F1

# View gate status
evolith sdlc gate-status
```

**Evidence Artifacts:**
- Source code
- Unit tests
- Integration tests
- Build passing

**Gate 4 Requirements:**
- [ ] All features implemented per Phase 2 design
- [ ] Unit test coverage meets threshold
- [ ] Architecture validated at F1 level
- [ ] No architectural drift detected

---

### Phase 4: QA

**Goal:** Quality assurance, performance testing, security review.

**CLI Commands:**
```bash
# Transition to Phase 4
evolith sdlc handoff --from phase-3 --to phase-4

# Validate architecture (F2 - contract boundaries)
evolith validate --architecture --arch-level F2

# Check drift at F2 level
evolith drift --level F2 --json

# View drift trend
evolith drift --trend
```

**Evidence Artifacts:**
- QA test results
- Performance benchmarks
- Security review report
- F2 architecture validation

**Gate 5 Requirements:**
- [ ] All QA tests passed
- [ ] Performance thresholds met
- [ ] Security review completed
- [ ] Architecture validated at F2 level

---

### Phase 5: Release

**Goal:** Production deployment, monitoring setup, documentation finalization.

**CLI Commands:**
```bash
# Transition to Phase 5
evolith sdlc handoff --from phase-4 --to phase-5

# Validate architecture (F3 - extraction readiness)
evolith validate --architecture --arch-level F3

# Final drift check
evolith drift --level F3 --trend

# View full history
evolith history stats
```

**Evidence Artifacts:**
- Production deployment
- Monitoring dashboards
- Runbook
- Final documentation

**Gate 6 Requirements:**
- [ ] Production deployment successful
- [ ] Monitoring active
- [ ] Runbook documented
- [ ] Architecture validated at F3 level (if applicable)

---

## 7. Product Type Guides

### Library

**Best for:** Shared utilities, SDKs, packages without runtime.

```bash
# Initialize
evolith init --runtime nodejs --arch clean --monorepo none

# evolith.yaml
product:
  name: "my-sdk"
  type: "library"
  runtime: "nodejs"
  architecture: "clean"
  monorepo: "none"

# Validate
evolith validate --format summary
```

**Structure:**
```
my-sdk/
├── evolith.yaml
├── src/
│   ├── index.ts
│   └── core/
├── test/
├── README.md
└── AGENTS.md
```

---

### Service (Single)

**Best for:** APIs, microservices, standalone applications.

```bash
# Initialize
evolith init --runtime nodejs --arch hexagonal --monorepo none --db postgresql

# evolith.yaml
product:
  name: "user-service"
  type: "service"
  runtime: "nodejs"
  architecture: "hexagonal"
  monorepo: "none"

# Scaffold (if applicable)
evolith architecture scaffold --orm prisma

# Validate
evolith validate --architecture --arch-level F1
```

**Structure:**
```
user-service/
├── evolith.yaml
├── src/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── presentation/
├── test/
├── Dockerfile
├── README.md
└── AGENTS.md
```

---

### Modular Monolith (Nx)

**Best for:** Complex applications with multiple bounded contexts.

```bash
# Initialize
evolith init --runtime nodejs --arch ddd --monorepo nx --db postgresql

# evolith.yaml
product:
  name: "ecommerce-platform"
  type: "monolith"
  runtime: "nodejs"
  architecture: "ddd"
  monorepo: "nx"

boundedContexts:
  - name: "orders"
    type: "domain"
  - name: "billing"
    type: "domain"
  - name: "catalog"
    type: "domain"

# Scaffold Nx workspace
evolith architecture scaffold --frontend react --orm prisma

# Validate F1
evolith validate --architecture --arch-level F1
```

**Structure:**
```
ecommerce-platform/
├── evolith.yaml
├── nx.json
├── apps/
│   └── web/
├── libs/
│   ├── orders/
│   │   ├── domain/
│   │   ├── application/
│   │   └── infrastructure/
│   ├── billing/
│   └── catalog/
├── Dockerfile
├── README.md
└── AGENTS.md
```

---

### Distributed (F3 Microservices)

**Best for:** Large-scale systems requiring independent deployment.

```bash
# Start as modular monolith
evolith init --runtime nodejs --arch ddd --monorepo nx

# After maturation, validate extraction readiness
evolith validate --architecture --arch-level F3

# Check drift at F3
evolith drift --level F3 --trend

# Each extracted service becomes its own satellite
# with its own evolith.yaml
```

**Extraction Process:**
1. Validate F3 readiness: `evolith validate --architecture --arch-level F3`
2. Ensure each bounded context has:
   - Independent `evolith.yaml`
   - Own `Dockerfile`
   - Independent CI/CD pipeline
   - Contract tests with other contexts
3. Extract to separate repositories
4. Each new repo runs through Phase 0-5 independently

---

## 8. MCP Server & AI Agent Integration

### Starting the MCP Server

```bash
# stdio mode (for Cursor, Claude Desktop)
evolith mcp serve

# HTTP mode (for web-based integrations)
evolith mcp serve --transport http --port 3000

# With API key authentication
evolith mcp serve --transport http --port 3000 --api-key my-secret-key
```

### Cursor AI Configuration

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "evolith": {
      "command": "evolith",
      "args": ["mcp", "serve"]
    }
  }
}
```

### Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "evolith": {
      "command": "evolith",
      "args": ["mcp", "serve"]
    }
  }
}
```

### Available MCP Tools

| Tool | Description | Example Usage |
|------|-------------|---------------|
| `evolith-validate` | Validate repository against governance rules | Ask AI: "Validate my repository" |
| `evolith-agent-install` | Install an agent ruleset | Ask AI: "Install the standard agent" |
| `evolith-agent-list` | List installed agents | Ask AI: "What agents are installed?" |
| `evolith-agent-validate` | Validate agent ruleset | Ask AI: "Validate the standard agent" |
| `evolith-agent-upgrade` | Upgrade an agent | Ask AI: "Upgrade the standard agent" |
| `evolith-agent-remove` | Remove an agent | Ask AI: "Remove the enterprise agent" |
| `evolith-architecture-validate` | Validate architecture (F1/F2/F3) | Ask AI: "Check my architecture at F1 level" |
| `evolith-sdlc-handoff` | Generate SDLC handoff manifest | Ask AI: "Create handoff from phase-0 to phase-1" |
| `evolith-sdlc-status` | Show SDLC phase gate status | Ask AI: "What's my current SDLC phase?" |
| `evolith-config-get` | Get configuration value | Ask AI: "What's my coreRef version?" |
| `evolith-config-set` | Set configuration value | Ask AI: "Set the product type to service" |
| `evolith-metrics` | Get MCP server metrics | Ask AI: "Show server metrics" |
| `evolith-moscow-create` | Create MoSCoW analysis | Ask AI: "Create MoSCoW for phase-0" |
| `evolith-moscow-load` | Load MoSCoW analysis | Ask AI: "Load my MoSCoW analysis" |
| `evolith-moscow-update` | Update MoSCoW item | Ask AI: "Update this item to Must Have" |
| `evolith-moscow-remove` | Remove MoSCoW item | Ask AI: "Remove this item" |
| `evolith-moscow-list` | List MoSCoW analyses | Ask AI: "List all MoSCoW analyses" |
| `evolith-moscow-validate` | Validate MoSCoW analysis | Ask AI: "Validate my MoSCoW" |
| `evolith-moscow-report` | Generate MoSCoW report | Ask AI: "Generate a MoSCoW report" |

### Available MCP Resources

| Resource URI | Description |
|--------------|-------------|
| `evolith://rulesets` | All governance rulesets |
| `evolith://phase-gates` | SDLC phase gate definitions |
| `evolith://agents` | Available agent templates |
| `evolith://governance-version` | Governance version |
| `evolith://core-version` | Core reference version |
| `evolith://repository-config` | Current repository configuration |
| `evolith://moscow-analysis` | MoSCoW analyses |
| `evolith://acl-rules` | Anti-corruption layer rules |

### Available MCP Prompts

| Prompt | Description |
|--------|-------------|
| `evolith/validate-repository` | Guide for repository validation |
| `evolith/agent-onboarding` | Guide for agent installation |
| `evolith/architecture-review` | Guide for architecture review |
| `evolith/phase-gate-check` | Guide for phase gate validation |
| `evolith/sdlc-handoff` | Guide for SDLC handoff |
| `evolith/ruleset-analysis` | Guide for ruleset analysis |
| `evolith/moscow-prioritization` | Guide for MoSCoW prioritization |

---

## 9. Architecture Validation — F1/F2/F3

### F1: Modular Monolith

**Validates:** Modular independence, layer boundaries, workspace structure.

```bash
# Validate at F1 level
evolith validate --architecture --arch-level F1

# Check drift at F1
evolith drift --level F1
```

**Rules Checked:**
- F1-01: Monorepo workspace detected (SHOULD)
- F1-02: Multiple bounded contexts present (SHOULD)
- Layer violations: domain → infrastructure (MUST, blocking)
- Dependency inversion: ORM/framework in domain layer (MUST, blocking)

### F2: Distributed Modules

**Validates:** Contract boundaries, circular dependencies, context isolation.

```bash
# Validate at F2 level
evolith validate --architecture --arch-level F2

# Check drift at F2
evolith drift --level F2 --json
```

**Rules Checked:**
- F2-01: No circular dependencies between modules (MUST, blocking)
- Context coupling: cross-context direct imports (MUST, blocking)
- Contract boundaries respected
- Coupling metrics within thresholds

### F3: Microservices

**Validates:** Extraction readiness, containerization, independent deployability.

```bash
# Validate at F3 level
evolith validate --architecture --arch-level F3

# Check drift at F3
evolith drift --level F3 --trend
```

**Rules Checked:**
- F3-01: Product type declared for extraction readiness (SHOULD)
- F3-02: Dockerfile present for containerization (SHOULD)
- Independent deployability
- Database per service pattern

### Deep Analysis Mode

The architecture validation supports deep static analysis that goes beyond surface checks:

```bash
# Via CLI (deep mode enabled through validate command)
evolith validate --architecture --arch-level F1

# Via MCP tool
# evolith-architecture-validate with deep=true
```

**Deep Analysis Detects:**
- Import graph violations across layers
- Bounded context coupling metrics
- Dependency inversion issues (ORM, web frameworks in domain)
- Afferent/efferent coupling per context
- Instability metrics

---

## 10. Best Practices & Common Workflows

### Daily Developer Workflow

```bash
# Morning: Check status
evolith sdlc gate-status

# Before commit: Validate
evolith validate --format summary

# Fix issues, then commit
git add . && git commit -m "fix: resolve governance violations"
```

### Weekly Architecture Review

```bash
# Review ADRs
evolith adr matrix

# Check drift trends
evolith drift --trend

# View command history stats
evolith history stats
```

### CI/CD Pipeline Integration

```yaml
# GitHub Actions example
name: Evolith Validation
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g @evolith/smart-cli@beta
      - name: Validate governance
        run: evolith validate --format json --output report.json
      - name: Check architecture
        run: evolith validate --architecture --arch-level F1 --format json
      - name: Check drift
        run: evolith drift --json --output drift-report.json
      - name: Upload reports
        uses: actions/upload-artifact@v4
        with:
          name: evolith-reports
          path: "*.json"
```

### Pre-commit Hook

```bash
#!/bin/bash
# .husky/pre-commit
evolith validate --format summary --satellite . || exit 1
```

### Bilingual Parity Enforcement

```bash
# Check bilingual coverage
node .harness/scripts/bilingual-coverage.mjs

# Check structural parity
node .harness/scripts/ci/04-check-bilingual-parity.mjs

# Validate all documentation
node .harness/scripts/ci/01-validate-docs.mjs
```

---

## 11. Troubleshooting & FAQ

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `evolith.yaml not found` | No configuration file | Run `evolith init` or `evolith docs` |
| `Core reference not found` | Core path invalid | Update `coreRef.path` in evolith.yaml |
| `Phase transition failed` | Missing evidence artifacts | Run `evolith sdlc gate-status` to see requirements |
| `Architecture validation failed` | Layer violations detected | Run `evolith drift` to identify violations |
| `MCP server already running` | Port in use | Use different port: `--port 3001` |
| `Agent install failed` | Template not found | Use `evolith agents list` to see available templates |

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Validation failed / Error |
| 124 | Timeout |

### Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `EVOLITH_CORE_PATH` | Path to Evolith Core | Current directory |
| `EVOLITH_CONFIG_PATH` | Path to evolith.yaml | Current directory |
| `EVOLITH_LOG_LEVEL` | Log level | INFO |
| `EVOLITH_API_KEY` | MCP HTTP API key | (none) |
| `PORT` | HTTP server port | 3000 |

### FAQ

**Q: Can I use Evolith with existing projects?**
A: Yes. Run `evolith init` in your existing project directory to generate the `evolith.yaml` configuration.

**Q: How do I upgrade when Evolith Core updates?**
A: Run `evolith upgrade --dry-run` to preview changes, then `evolith upgrade` to apply.

**Q: Can I skip a phase gate?**
A: Phase gates are enforced by the CLI. Use `--force` on `sdlc handoff` to skip validation warnings, but this is not recommended.

**Q: How do I integrate with my CI/CD?**
A: Use `--format json` and `--output report.json` for machine-readable output. See CI/CD integration examples above.

**Q: What's the difference between F1, F2, and F3?**
A: F1 validates modular monolith structure. F2 validates distributed module boundaries. F3 validates microservice extraction readiness. Each level builds on the previous.

**Q: Can I use Evolith without AI agents?**
A: Yes. The CLI works independently. MCP server is optional for AI integration.

---

*This document is part of the Evolith reference corpus. For the complete vision, see [Evolith Product Vision Master](../../../suite/vision/evolith-product-vision-master.md).*

---
[Back to CLI Documentation Index](../README.md)
