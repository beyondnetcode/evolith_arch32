# @evolith/smart-cli

Command-line interface for Evolith — governance, standards validation, architecture scaffolding, SDLC lifecycle management, and AI agent integration.

## Overview

SmartCLI is the primary entry point to the Evolith ecosystem. It connects three layers:

```
satellite repository
       │
       ▼
  smart-cli  ──────── evolith.yaml (configuration)
       │
       ├── Evolith Core (rulesets, ADRs, standards, gate evidence)
       │
       └── MCP Server ──── AI Agents (Cursor, Claude Desktop, custom)
```

## Supported Architectures

Evolith Core defines **8 architecture topologies** across complementary dimensions. Any command that accepts `--topology` references them by their canonical id:

| Topology (id) | Name | Dimension |
|---------------|------|-----------|
| `modular-monolith` | Modular Monolith | progressive-axis |
| `distributed-modules` | Distributed Modules | progressive-axis |
| `microservices` | Microservices | progressive-axis |
| `serverless` | Serverless | execution |
| `edge-computing` | Edge Computing | execution |
| `event-driven` | Event-Driven | integration |
| `data-mesh` | Data Mesh | data |
| `agentic-ai` | Agentic AI | ai |

The **progressive axis** (`modular-monolith → distributed-modules → microservices`) is a linear maturity progression managed by the `upgrade` command. The other dimensions (execution, integration, data, ai) are complementary and chosen per project needs. Use `--topology <id>` with the canonical ids above.

## Installation

```bash
npm install -g @evolith/smart-cli
```

```bash
pnpm add -g @evolith/smart-cli
```

```bash
yarn global add @evolith/smart-cli
```

Or download the binary from [GitHub Releases](https://github.com/beyondnetcode/evolith_arch32/releases) and add it to your PATH.

### Verify

```bash
smart-cli --version
# 0.0.1
```

### Troubleshooting

**EACCES on macOS/Linux:**
```bash
sudo npm install -g @evolith/smart-cli --unsafe-perm
```

**nvm — binary not found after install:**
```bash
export PATH=$(npm config get prefix)/bin:$PATH
```

**`WORKSPACE_ROOT` (optional):** the CLI ships a built-in default SDLC workflow, so it runs without any environment setup. Set `WORKSPACE_ROOT` to a checkout root only when you want to override the workflow/rulesets from disk (`$WORKSPACE_ROOT/rulesets/sdlc/default-workflow.yaml`).

### Environment variables

The CLI runs with zero configuration. The following variables are optional overrides. Those marked *(MCP)* are read by the standalone `@evolith/mcp-server` (the `evolith-mcp serve` binary).

| Variable | Read by | Purpose |
|---|---|---|
| `EVOLITH_PROFILE` | CLI | Selects the active named profile (per-environment defaults) instead of `default`. |
| `EVOLITH_API_KEY` | CLI / MCP | API key for the MCP HTTP transport (equivalent to `--api-key`); required in production HTTP mode. |
| `PORT` | CLI / MCP | Default HTTP port for `evolith-mcp serve --transport http` when `--port` is omitted (default `3000`). |
| `OTEL_ENABLED` | CLI | When `true`, enables OpenTelemetry tracing export from the CLI. |
| `WORKSPACE_ROOT` | Core | Checkout root for overriding the bundled workflow/rulesets from disk (see above). |
| `MCP_HTTP_HOST` *(MCP)* | MCP | Bind host for the HTTP transport (default `0.0.0.0`; set `127.0.0.1` for local-only). |
| `JWT_SECRET` *(MCP)* | MCP | HS256 secret enabling optional JWT bearer auth on the HTTP transport. |
| `LOG_LEVEL` *(MCP)* | MCP | Log verbosity for the MCP server (default `info`). |
| `NODE_ENV` *(MCP)* | MCP | `production` forces fail-closed auth/policy behavior in the MCP server. |

## Quickstart

```bash
# 1. Seed a demo project to explore the CLI
smart-cli fixtures --type demo

# 2. Initialize a real repository
smart-cli init

# 3. Scaffold base documentation
smart-cli docs

# 4. Validate compliance
smart-cli validate

# 5. Scaffold architecture
smart-cli scaffold --phase 1

# 6. Connect an AI agent (standalone MCP server)
evolith-mcp serve
```

---

## Commands

### init

Initializes a satellite repository with interactive tool selection. Creates `evolith.yaml` and the project structure.

```bash
smart-cli init [options]

Options:
  -d, --dry-run          Run without writing files
  -c, --config <path>    Path to evolith.setup.json for batch mode
  -r, --runtime <id>     Runtime: nodejs, dotnet, python
  -m, --monorepo <id>    Monorepo strategy: none, nx, npm-workspaces, rush
  -a, --arch <id>        Architecture pattern: clean, hexagonal, ddd
      --db <id>          Database: postgresql, mongodb, sqlserver
```

**Examples:**

```bash
# Interactive wizard
smart-cli init

# Batch mode (non-interactive)
smart-cli init --config evolith.setup.json

# Preview without writing
smart-cli init --dry-run
```

After `init` completes, the CLI prints suggested next steps including `validate`, `agents --install`, and `sdlc handoff`.

---

### init-wizard

A fully guided, step-by-step alternative to `init` that walks through project name, runtime, monorepo strategy, and architecture pattern with interactive prompts. Use it for a first-time, hand-held setup; use `init` (with flags or `--config`) for scripted or non-interactive runs.

```bash
smart-cli init-wizard [options]

Options:
      --no-wizard        Fall back to the standard init flow instead of the wizard
      --no-interactive   Run in non-interactive mode (CI/automation)
```

---

### docs

Scaffolds the base documentation files required by Evolith in the current directory.

Files created by default:
- `README.md` — project overview template
- `AGENTS.md` — AI agent configuration and rules
- `MASTER_INDEX.md` — documentation index
- `.evolith/evolith.yaml` — Evolith configuration

```bash
smart-cli docs [options]

Options:
  -d, --dry-run          Preview files without writing
  -f, --force            Overwrite existing files
  -t, --template <type>  Template type: default (all 4 files), minimal (README + AGENTS only)
      --format <format>  Output format: json (ADR-0073 envelope) or human (default)
```

**Examples:**

```bash
# Scaffold all documentation
smart-cli docs

# Preview what would be created
smart-cli docs --dry-run

# Minimal scaffold
smart-cli docs --template minimal

# Force overwrite and emit JSON envelope
smart-cli docs --force --format json
```

---

### validate

Validates repository compliance against Evolith standards. Supports multiple engines, rulesets, topologies, and SDLC phases.

```bash
smart-cli validate [options]

Options:
  -s, --satellite <path>   Satellite repository path (default: cwd)
  -c, --core <path>        Evolith Core path (default: auto-detect)
  -f, --format <format>    Output format: json, table, yaml, markdown (default: markdown)
  -o, --output <file>      Write output to file
  -r, --ruleset <id>       Validate a specific ruleset (see table below)
  -e, --engine <engine>    Validation engine: native (default) or opa
  -t, --topology <id>      Topology to validate by canonical id, e.g. modular-monolith,
                           microservices, serverless, event-driven, agentic-ai (repeatable).
  -m, --manifest <path>    SatelliteManifest JSON for end-to-end evaluation (GT-281 pipeline)
  -p, --phase <phase>      SDLC phase to evaluate: discovery, design, construction, qa, release (activates GT-281 pipeline)
      --adr <id>           Validate against a specific ADR rule set
      --file <path>        Validate a single file (ad-hoc mode)
      --composable         Use the composable GT-312 engine with intelligent mode resolution
```

**Available rulesets (`--ruleset`):**

| ID | Validates |
|----|-----------|
| `acl` | Access control layer rules |
| `open-core` | Open-core module boundaries |
| `inheritance` | Inheritance and extension contracts |
| `cli-release` | CLI release readiness |
| `cli-parity` | CLI command parity between versions |
| `evidence` | Gate evidence artifact completeness |
| `mcp` | MCP server contract compliance |
| `observability` | Logging, metrics, and tracing coverage |
| `adr-0002` | ADR-0002 specific rules |

The `rulesets` enum in `reference/config/evolith.config.schema.json` additionally recognizes: `satellite-contracts`, `executive-scorecards`, `compliance-baseline`, `definition-of-done`, `engineering-manifesto`, `repository-taxonomy`, `phase-gates`, `quality-thresholds`, and `dependency-pinning`. These are valid configuration values even though the common `--ruleset` shortcuts above cover the day-to-day set.

**Available ADR rules (`--adr`):** `adr-0002`, `adr-0005`, `adr-0010`, `adr-0018`, `adr-0032`, `adr-0040`, `adr-0050`

**Validation engines:**
- `native` — built-in TypeScript engine (default, no external dependencies)
- `opa` — Open Policy Agent WebAssembly modules

**Composable engine (GT-312):**  
When `--composable` is set, the CLI auto-resolves which validation modes to activate based on the provided context:
- `SdlcValidationMode` — activated when `--phase` is present
- `ArchitectureValidationMode` — activated when `--topology` is present
- `RulesetValidationMode` — activated when `--ruleset` is present
- `AdrValidationMode` — activated when `--adr` is present
- `AdhocValidationMode` — activated when `--file` is present

**Exit codes:** `validate` exits `0` when the repository passes (including `warning` status) and `1` when the result status is `failed`. The `gate`, `phase advance`, and `scaffold` commands likewise exit `1` on failure, and any unhandled error during CLI startup exits `1`. This makes the CLI safe to gate CI pipelines on. In `--format json`, the failure detail is carried in the ADR-0073 envelope rather than printed as prose.

**Examples:**

```bash
# Basic compliance check
smart-cli validate

# JSON output for CI
smart-cli validate --format json --output report.json

# Validate a single topology
smart-cli validate --topology microservices

# Validate multiple topologies
smart-cli validate --topology modular-monolith --topology event-driven

# Validate a specific ruleset
smart-cli validate --ruleset evidence

# Full SDLC phase evaluation (GT-281 pipeline)
smart-cli validate --phase discovery

# Validate with a SatelliteManifest
smart-cli validate --manifest ./satellite-manifest.json --phase design

# Ad-hoc file validation
smart-cli validate --file src/domain/user.entity.ts --composable

# OPA engine
smart-cli validate --engine opa --ruleset acl
```

---

### adr

Manages Architecture Decision Records.

```bash
smart-cli adr [options]

Options:
  -c, --create           Create a new ADR (interactive)
  -l, --list             List all ADRs
  -g, --get <id>         Show a specific ADR
  -u, --update <id>      Update ADR status
  -s, --status <status>  New status: Accepted, Deprecated, Superseded, Amended
  -r, --reason <text>    Reason for status change
  -m, --matrix           Show ADR matrix summary
  -d, --dry-run          Preview without writing files
```

**Examples:**

```bash
# Interactive creation
smart-cli adr --create

# List all
smart-cli adr --list

# Show specific ADR
smart-cli adr --get ADR-0002

# Update status
smart-cli adr --update ADR-0005 --status Accepted --reason "Approved in design review"

# Show matrix
smart-cli adr --matrix
```

---

### standards

Manages Evolith governance standards (architecture, governance, operations).

```bash
smart-cli standards [options]

Options:
      --init             Initialize standards directory structure
  -l, --list             List all standards
  -g, --get <id>         Show a specific standard
  -v, --validate <code>  Validate code against standards
  -e, --export <id>      Export a standard
  -f, --format <format>  Export format: markdown, json
  -c, --category <id>    Filter by category
```

**Examples:**

```bash
# Initialize
smart-cli standards --init

# List all standards
smart-cli standards --list

# Filter by category
smart-cli standards --list --category governance

# Export as markdown
smart-cli standards --export STD-001 --format markdown
```

---

### agents

Manages Evolith BMAD agents — installs, lists, and removes governance agents in the satellite repository.

```bash
smart-cli agents [options]

Options:
  -l, --list             List installed agents
  -i, --install [name]   Install a named agent (interactive if name omitted)
  -r, --remove [name]    Remove an installed agent
  -d, --dry-run          Preview without making changes
```

**Available agent templates:**

| Template | Description |
|---|---|
| `standard` | Default agent with basic governance rules (ACL-01 through ACL-06) |
| `minimal` | Lightweight agent with essential rules only |
| `full-compliance` | Full compliance agent with audit trail and approval chains |

**Examples:**

```bash
# List installed agents
smart-cli agents --list

# Interactive install
smart-cli agents --install

# Install a specific template
smart-cli agents --install standard
smart-cli agents --install full-compliance

# Preview install without writing
smart-cli agents --install standard --dry-run

# Remove an agent
smart-cli agents --remove minimal
```

---

### scaffold

Scaffolds the Evolith architecture in the current workspace **along the progressive axis** — phase 1 (`modular-monolith`), phase 2 (`distributed-modules`) and phase 3 (`microservices`). Phases 2–3 are generated as a Module Federation host + remotes (microfrontends), with configurable frontend frameworks, ORMs, and domain names. (`F1/F2/F3` remain accepted as legacy aliases for phases 1/2/3.)

```bash
smart-cli scaffold [options]

Options:
      --frontend <framework>   Frontend framework: react, angular
      --orm <orm>              ORM: prisma, typeorm
  -d, --dry-run                Preview without writing files
  -f, --format <format>        Output format: json (ADR-0073 envelope) or human (default)
      --phase <phase>          Architecture phase: 1 (F1), 2 (F2), 3 (F3) — required with --format json
      --api-name <name>        Backend API app name (default: tracker-api)
      --web-app-name <name>    Web app name for phase 1 (default: tracker-web)
      --host-name <name>       Host app name for phase 2/3 (default: tracker-host)
      --remotes <names>        Comma-separated remote names for phase 2/3
      --domains <names>        Comma-separated domain names to generate
```

**Examples:**

```bash
# Scaffold F1 (Monolithic Modular) interactively
smart-cli scaffold

# Scaffold F1 with React + Prisma, dry run
smart-cli scaffold --phase 1 --frontend react --orm prisma --dry-run

# Scaffold F2 (Microfrontend) with custom names
smart-cli scaffold --phase 2 --host-name shell-app --remotes catalog,checkout

# Scaffold F3 with custom domains and JSON output
smart-cli scaffold --phase 3 --domains orders,payments,users --format json

# Generate specific domains only
smart-cli scaffold --domains auth,notifications
```

---

### drift

Detects architecture drift between the declared topology level and the actual codebase structure. Stores history for trend analysis.

```bash
smart-cli drift [options]

Options:
  -p, --path <path>    Project path to analyze (default: cwd)
  -l, --level <level>  Declared architecture level: F1, F2, F3
      --json           Output as raw JSON
      --history        Show drift scan history (last 10 scans)
      --trend          Show drift trend analysis (improving / stable / degrading)
  -f, --format <fmt>   Output format: json (ADR-0073 envelope) or human (default)
```

The drift report includes:
- **Declared level** vs **detected level**
- **Overall score** (0–100%)
- **Drift severity**: critical, high, medium, low, none
- **New violations** — introduced since last scan
- **Persistent violations** — unresolved across multiple scans
- **Resolved violations** — fixed since last scan

**Examples:**

```bash
# Detect drift (auto-detects declared level from evolith.yaml)
smart-cli drift

# Specify declared level explicitly
smart-cli drift --level F2

# Analyze a different project path
smart-cli drift --path ../my-satellite

# Show historical scans
smart-cli drift --history

# Show trend (requires at least 2 prior scans)
smart-cli drift --trend

# JSON output for CI
smart-cli drift --format json
```

---

### gate

Evaluates SDLC phase gates and emits ADR-0073 `GateEvidence` artifacts. Supports webhook delivery and multi-actor contexts.

```bash
smart-cli gate <action> [options]

Actions:
  evaluate    Evaluate gates for the specified phase

Options:
  -p, --phase <phase>         SDLC phase: discovery, design, construction, qa, release
      --project <path>        Satellite project path (default: cwd)
  -c, --core <path>           Evolith Core path (default: auto-detect)
  -f, --format <format>       Output format: json (ADR-0073 envelope) or human (default)
      --evaluated-by <actor>  Actor class: human (default), agent, ci
      --initiative <id>       Initiative context — echoed in meta.context
      --tenant <id>           Tenant context — echoed in meta.context
      --webhook-url <url>     POST gate evidence to this URL upon completion
```

**Examples:**

```bash
# Evaluate design phase gates
smart-cli gate evaluate --phase design

# CI evaluation with JSON output
smart-cli gate evaluate --phase construction --evaluated-by ci --format json

# Agent-driven evaluation with webhook delivery
smart-cli gate evaluate --phase qa --evaluated-by agent --webhook-url https://ci.example.com/hooks/evolith

# Multi-tenant context
smart-cli gate evaluate --phase release --tenant acme --initiative Q3-launch
```

---

### phase

Proposes a phase transition between SDLC phases. Emits a transition proposal artifact.

```bash
smart-cli phase advance [options]

Options:
      --from <phase>          Current SDLC phase
      --to <phase>            Target SDLC phase
      --project <path>        Satellite project path (default: cwd)
  -c, --core <path>           Evolith Core path (default: auto-detect)
  -f, --format <format>       Output format: json (ADR-0073 envelope) or human (default)
      --evaluated-by <actor>  Actor class: human, agent (default), ci
      --initiative <id>       Initiative context — echoed in meta.context
      --tenant <id>           Tenant context — echoed in meta.context
      --webhook-url <url>     POST the transition proposal to this URL
```

**Examples:**

```bash
# Propose advancing from design to construction
smart-cli phase advance --from design --to construction

# Agent-driven with JSON output
smart-cli phase advance --from construction --to qa --evaluated-by agent --format json

# With webhook and tenant context
smart-cli phase advance --from qa --to release --webhook-url https://ci.example.com/hooks/evolith --tenant acme
```

---

### sdlc

Parent command that orchestrates SDLC artifacts and lifecycle transitions. Run without a subcommand to see available subcommands.

```bash
smart-cli sdlc <subcommand>

Subcommands:
  handoff       Transition artifacts between phases with interactive guided flow
  generate      Generate Hexagonal Architecture scaffold from a DDD model file
  gate-status   Display phase gate validation status and DORA metrics
```

#### sdlc handoff

Guides an interactive phase transition, validates gates, and generates evidence artifacts.

```bash
smart-cli sdlc handoff [options]

Options:
  -f, --from <phase>   Source phase (phase-0, phase-1, etc.)
  -t, --to <phase>     Target phase (phase-0, phase-1, etc.)
  -a, --artifacts      Generate evidence artifacts
      --validate       Validate phase gates before handoff
      --force          Force handoff even if gates fail
```

**Examples:**

```bash
# Interactive handoff wizard
smart-cli sdlc handoff

# Handoff from phase-0 to phase-1 with gate validation
smart-cli sdlc handoff --from phase-0 --to phase-1 --validate

# Generate artifacts and force even if gates fail
smart-cli sdlc handoff --from phase-1 --to phase-2 --artifacts --force
```

#### sdlc generate

Generates a complete Hexagonal Architecture scaffold by reading a Mermaid `classDiagram` from a Markdown DDD model file.

```bash
smart-cli sdlc generate [options]

Options:
  -f, --from <path>   Path to the Markdown file containing the Mermaid classDiagram
  -o, --output <dir>  Target directory for generated files (default: cwd)
      --dry-run       Print what would be generated without writing files
```

**Examples:**

```bash
# Generate from a DDD model file
smart-cli sdlc generate --from docs/domain-model.md

# Preview without writing
smart-cli sdlc generate --from docs/domain-model.md --dry-run

# Output to a specific directory
smart-cli sdlc generate --from docs/domain-model.md --output src/domain
```

The input file must contain a fenced Mermaid block with a `classDiagram`. The generator creates entities, value objects, repositories, use cases, and ports following hexagonal architecture conventions.

#### sdlc gate-status

Displays the current SDLC phase gate validation status along with DORA metrics calculated from git history.

```bash
smart-cli sdlc gate-status [options]

Options:
  --since <days>   Days of git history to analyze for DORA metrics (default: 90)
```

DORA metrics reported:
- **Deployment Frequency** — how often the team deploys to production
- **Lead Time for Changes** — time from commit to production
- **Change Failure Rate** — percentage of deployments causing failures
- **Time to Restore** — time to recover from a production failure

**Examples:**

```bash
# Current gate status with 90-day DORA window
smart-cli sdlc gate-status

# Analyze last 30 days only
smart-cli sdlc gate-status --since 30
```

---

### profile

Manages named CLI profiles. Each profile stores a set of defaults (satellite path, core path, tenant, initiative) that are applied automatically to subsequent commands.

```bash
smart-cli profile <action> [options]

Actions:
  current   Show the active profile
  list      List all profiles
  create    Create a new profile
  switch    Switch to a named profile
  delete    Delete a profile

Options:
  -n, --name <name>   Profile name (used with create and switch)
```

**Examples:**

```bash
# Show current profile
smart-cli profile current

# List all profiles
smart-cli profile list

# Create a profile interactively
smart-cli profile create

# Create with a name
smart-cli profile create --name staging

# Switch profile
smart-cli profile switch --name staging

# Delete a profile
smart-cli profile delete --name staging
```

---

### fixtures

Seeds reproducible fixture files for demos, tests, and onboarding. The first step recommended in any new environment.

```bash
smart-cli fixtures [type] [options]

Arguments:
  type   Fixture type (default: demo)

Options:
  -d, --dir <directory>   Target directory (default: cwd)
  -n, --dry-run           Preview files without writing
  -t, --type <type>       Fixture type: demo, adr, ruleset, evolith, full
```

**Fixture types:**

| Type | Contents |
|------|----------|
| `demo` | Sample project with evolith.yaml and demo structure |
| `adr` | Pre-populated ADR entries |
| `ruleset` | Example rulesets (domain, naming, file conventions) |
| `evolith` | Full Evolith configuration files |
| `full` | All of the above combined |

**Examples:**

```bash
# Seed a demo project (fastest way to explore the CLI)
smart-cli fixtures --type demo

# Preview what would be created
smart-cli fixtures --type full --dry-run

# Seed ADR fixtures into a specific directory
smart-cli fixtures --type adr --dir ./reference/core/architecture/adrs
```

---

### api

Browses and inspects the Evolith API surface: MCP tools, resources, schemas, and CLI commands.

```bash
smart-cli api [options]

Options:
  -l, --list                  List all available API operations
  -i, --inspect <name>        Inspect a specific operation, resource, or command
  -c, --category <category>   Filter by category: tools, resources, schemas, commands
```

**Examples:**

```bash
# List everything
smart-cli api --list

# Filter MCP tools only
smart-cli api --list --category tools

# Inspect a specific tool
smart-cli api --inspect evolith-validate

# Inspect a CLI command schema
smart-cli api --inspect validate --category commands
```

---

### update

Checks for and applies CLI updates.

```bash
smart-cli update [options]

Options:
  -c, --current   Show the current installed CLI version
      --check     Check for available updates without installing
  -i, --install   Install the latest available version
```

**Examples:**

```bash
# Show current version
smart-cli update --current

# Check for updates
smart-cli update --check

# Install latest
smart-cli update --install
```

---

### upgrade

Upgrades a satellite repository to the next progressive-axis topology or governance version.

```bash
smart-cli upgrade [options]

Options:
      --dry-run          Simulate the upgrade without making changes
      --target <target>  Target governance version or topology (e.g., F2, 1.1.0)
      --force            Skip eligibility checks
```

**Examples:**

```bash
# Preview upgrade to the next topology
smart-cli upgrade --dry-run

# Upgrade to F2
smart-cli upgrade --target F2

# Force upgrade ignoring eligibility checks
smart-cli upgrade --target F3 --force
```

---

### alias

Manages shorthand aliases for CLI commands.

```bash
smart-cli alias [options]

Options:
  --add <alias=command>   Add a new alias (format: name=command)
  --remove <alias>        Remove an alias
  --list                  List all aliases
```

**Examples:**

```bash
# Add an alias
smart-cli alias --add "v=validate --format table"

# List aliases
smart-cli alias --list

# Remove an alias
smart-cli alias --remove v
```

---

### history

Views and manages CLI command execution history.

```bash
smart-cli history [options]

Options:
  -l, --list             List recent commands
  -g, --get <id>         Show command details by ID
  -s, --search <query>   Search history
      --stats            Show history statistics
      --clear            Clear all history
  -n, --limit <number>   Number of entries to show (default: 20)
      --replay <id>      Show the command string for a given history entry
```

**Examples:**

```bash
# Show last 20 commands
smart-cli history

# Show last 50
smart-cli history --limit 50

# Search for validate runs
smart-cli history --search validate

# Show statistics
smart-cli history --stats

# Clear history
smart-cli history --clear
```

---

### completion

Generates and installs shell completion scripts. Also provides shell hook functions for context and status display.

```bash
smart-cli completion [options]

Options:
  --install <shell>   Install completion for specified shell: bash, zsh, fish
  --shell <shell>     Generate completion script for specified shell (prints to stdout)
  --hooks             Generate shell hook functions for context/status display
```

**Examples:**

```bash
# Install zsh completion
smart-cli completion --install zsh

# Install bash completion
smart-cli completion --install bash

# Install fish completion
smart-cli completion --install fish

# Print completion script to stdout (for manual setup)
smart-cli completion --shell zsh

# Generate hook functions
smart-cli completion --hooks
```

Pre-built scripts are also included in the package under `shell/`:
- `shell/completion.bash`
- `shell/completion.zsh`
- `shell/completion.fish`
- `shell/hooks.bash`
- `shell/hooks.zsh`

---

## MCP Server

Evolith ships a standalone MCP server, `@evolith/mcp-server`, for AI agent integration. Run it with the `evolith-mcp` binary (or `npx @evolith/mcp-server serve`).

### Starting the Server

```bash
# stdio transport (default — for Cursor, Claude Desktop)
evolith-mcp serve

# HTTP transport (for remote or containerized deployments)
evolith-mcp serve --transport http --port 3000

# HTTP with API key authentication
evolith-mcp serve --transport http --port 3000 --api-key <secret>
```

```bash
evolith-mcp [action] [options]

Actions:
  serve       Start the MCP server (default)
  version     Print the MCP server version banner

Options:
  -t, --transport <stdio|http>   Transport: stdio (default) or http
  -p, --port <number>            HTTP server port (default: 3000, or $PORT)
      --api-key <key>            API key for HTTP transport authentication (or $EVOLITH_API_KEY)
      --no-confirm               Skip confirmation prompts
```

### Smoke Test

```bash
npm run mcp:smoke
```

Verifies `initialize`, `tools/list`, `resources/list`, `prompts/list`, and a real `tools/call` end-to-end through the built CLI.

### Available MCP Tools

The bundled server registers **27 tools**. The live, authoritative set is always browsable with `smart-cli api --list --category tools`; the table below mirrors the current `@evolith/mcp-server` registry.

**Validation & architecture**

| Tool | Description |
|------|-------------|
| `evolith-validate` | Validate a satellite repository against Evolith rules (end-to-end pipeline via manifest) |
| `evolith-composable-validate` | Validate with the composable engine (GT-312): SDLC, Architecture, Ruleset, ADR, Ad-hoc modes (combinable) |
| `evolith-architecture-validate` | Validate architecture against the declared topology with optional deep analysis |
| `evolith-drift-detect` | Detect architecture drift in a repository |
| `evolith-auto-fix` | Apply automatic fixes to architectural violations reported by Core rule evaluators |
| `evolith-topology-list` | List all available architecture topologies in Evolith Core |
| `evolith-topology-get` | Get a specific architecture topology by id |

**SDLC, gates & metrics**

| Tool | Description |
|------|-------------|
| `evolith-gate-evaluate` | Evaluate a specific SDLC phase gate |
| `evolith-phase-advance` | Propose an SDLC phase transition by evaluating exit criteria |
| `evolith-sdlc-handoff` | Perform a phase gate handoff (e.g. phase-0 → phase-1) |
| `evolith-sdlc-status` | Get the current SDLC phase status |
| `evolith-dora-metrics` | Calculate DORA metric approximations from git log history |
| `evolith-metrics` | Get MCP server metrics (per-tool call counts, latency, failures) |

**Agents**

| Tool | Description |
|------|-------------|
| `evolith-agent-install` | Install a new BMAD agent |
| `evolith-agent-list` | List installed agents |
| `evolith-agent-validate` | Validate an agent ruleset |
| `evolith-agent-upgrade` | Upgrade an existing agent |
| `evolith-agent-remove` | Remove an agent |

**Configuration**

| Tool | Description |
|------|-------------|
| `evolith-config-get` | Get an Evolith configuration value |
| `evolith-config-set` | Set an Evolith configuration value |

**MoSCoW prioritization**

| Tool | Description |
|------|-------------|
| `evolith-moscow-create` | Create a new MoSCoW prioritization analysis |
| `evolith-moscow-load` | Load an existing MoSCoW analysis |
| `evolith-moscow-update` | Update an item in a MoSCoW analysis |
| `evolith-moscow-remove` | Remove an item from a MoSCoW analysis |
| `evolith-moscow-list` | List all MoSCoW analyses for a repository |
| `evolith-moscow-validate` | Validate a MoSCoW analysis for correctness |
| `evolith-moscow-report` | Generate a markdown report from a MoSCoW analysis |

### Cursor AI Configuration

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "evolith": {
      "command": "evolith-mcp",
      "args": ["serve"]
    }
  }
}
```

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "evolith": {
      "command": "evolith-mcp",
      "args": ["serve"]
    }
  }
}
```

### HTTP Transport (remote deployment)

```json
{
  "mcpServers": {
    "evolith": {
      "url": "http://localhost:3000",
      "headers": { "x-api-key": "<secret>" }
    }
  }
}
```

---

## CI/CD Integration

### SDLC Phase Validation (GT-281 Pipeline)

```bash
# Validate a specific SDLC phase with full gate evaluation
smart-cli validate --phase design --format json --output gate-evidence.json

# With explicit SatelliteManifest
smart-cli validate --manifest ./satellite-manifest.json --phase construction --format json
```

### Gate Evaluation in CI

```bash
# Evaluate construction gates from CI
smart-cli gate evaluate \
  --phase construction \
  --evaluated-by ci \
  --format json \
  --webhook-url $WEBHOOK_URL
```

### GitHub Actions Example

```yaml
- name: Evolith Gate Evaluation
  run: |
    smart-cli gate evaluate \
      --phase ${{ env.SDLC_PHASE }} \
      --evaluated-by ci \
      --format json \
      --output gate-evidence.json
  env:
    SDLC_PHASE: construction
```

---

## Configuration

Evolith uses `evolith.yaml` in `.evolith/` or the repository root:

```yaml
coreRef:
  version: "1.0.0"
  path: "../../evolith"

governance:
  version: "1.0"
  adrRegistry:
    - id: "ADR-0001"
      status: "accepted"

product:
  name: "my-project"
  type: "library"
  runtime: "typescript"
```

### Multi-Environment Profiles

```bash
# Create a profile per environment
smart-cli profile create --name local
smart-cli profile create --name staging
smart-cli profile create --name ci

# Switch before running commands
smart-cli profile switch --name staging
smart-cli validate
```

---

## Output Formats

Most commands accept `--format`:

```bash
# Human-readable (default for most commands)
smart-cli validate

# Markdown
smart-cli validate --format markdown

# Table
smart-cli validate --format table

# YAML
smart-cli validate --format yaml

# JSON (ADR-0073 envelope — for automation and CI)
smart-cli validate --format json
```

---

## Troubleshooting

**Command not found after install:**
```bash
export PATH="$(npm config get prefix)/bin:$PATH"
```

**Validation fails with no evolith.yaml:**
```bash
smart-cli docs         # scaffold evolith.yaml and base docs
smart-cli validate
```

**MCP server not responding:**
```bash
evolith-mcp serve --no-confirm
```

**Unknown topology in scaffold or drift:**
Ensure your `evolith.yaml` has a valid `product.topology` field using a canonical topology id — `modular-monolith`, `distributed-modules`, `microservices`, `serverless`, `edge-computing`, `event-driven`, `data-mesh` or `agentic-ai` (per `reference/config/evolith.config.schema.json`).

---

## Development

### Build from Source

```bash
cd sdk/cli
npm install
npm run build
npm link
```

### Tests

```bash
npm test               # unit + e2e
npm run test:unit      # unit only
npm run test:e2e       # e2e only
npm run test:cov       # coverage report
npm run mcp:smoke      # MCP protocol smoke test
```

### Project Structure

```
sdk/cli/
├── src/
│   ├── commands/       # CLI commands (one directory per command)
│   ├── config/         # Runtimes catalog, CLI commands matrix, aliases
│   ├── contributions/  # Contribution validation
│   ├── infrastructure/ # Config, filesystem, formatters, prompts, plugins
│   └── plugins/        # Plugin registry and module
├── shell/              # Bash, Zsh, Fish completion and hooks
├── templates/          # Configuration templates
├── test/               # E2E test suite
└── docs/               # Extended documentation
```

### Extended Documentation

- [Demo Guide](docs/SMART-CLI-DEMO.md) — end-to-end walkthrough of all commands and SDLC flows
- [Vision](docs/VISION.md) — CLI vision and roadmap
- [Data Models](docs/data-models.md) — domain data model reference
- [MCP Integration](docs/MCP-INTEGRATION.md) — MCP server protocol details
- [Handoff Protocol](docs/HANDOFF-PROTOCOL.md) — SDLC handoff artifact specification

---

## Contributing

See the repository-root [CONTRIBUTING.md](../../../CONTRIBUTING.md) for the full workflow, branch/commit conventions, and authoring standards.

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

---

## License

MIT

## Support

- [Issue Tracker](https://github.com/beyondnetcode/evolith_arch32/issues)
- [Discussions](https://github.com/beyondnetcode/evolith_arch32/discussions)
- [Documentation](https://github.com/beyondnetcode/evolith_arch32#readme)
