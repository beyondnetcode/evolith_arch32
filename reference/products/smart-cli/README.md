# Evolith CLI

Command-line interface for Evolith governance, standards validation, and AI agent integration.

## Features

- **Governance**: ADR management, standards tracking, agent installation
- **Validation**: Repository compliance against Evolith standards
- **AI Integration**: MCP server for AI agent tool calling
- **Observability**: Structured logging, metrics, error reporting

## Installation

### npm (Recommended)

```bash
npm install -g @evolith/smart-cli
```

### Manual

Download the latest binary from [GitHub Releases](https://github.com/beyondnetcode/evolith_arch32/releases) and add to your PATH.

### Verify Installation

```bash
smart-cli --version
# smart-cli version 1.1.0
```

## Quickstart

### 1. Initialize a Repository

```bash
cd your-project
smart-cli init
```

This creates an `evolith.yaml` file with default configuration.

### 2. Run First Validation

```bash
smart-cli validate
```

Output:
```
✓ Validating repository...
✓ Repository is compliant with Evolith standards
```

### 3. Install an Agent

```bash
smart-cli agents install
# Select "standard" template when prompted
```

## Commands

### validate

Validate repository compliance against Evolith standards with full SDLC orchestration.

```bash
smart-cli validate [options]

Options:
  --satellite <path>    Path to satellite repository (default: cwd)
  --core <path>         Path to Evolith Core
  --format <format>     Output format: json, table, yaml, markdown
  --output <file>       Write output to file
  --topology <name>     Validate against specific topology (modular-monolith, distributed-modules, microservices)
  --ruleset <id>        Validate specific ruleset (acl, open-core, inheritance)
  --engine <engine>     Policy evaluation engine: native or opa (default: native)
  --phase <id>          Validate against specific SDLC phase (f1-f5)
  --manifest <path>     Use topology manifest for validation
```

**Composable Validation Engine (GT-312):**
The validation system is intelligent and flexible — NOT rigid. You can validate from any entry point without forcing a specific flow.

**Validation Modes:**

| Mode | Command | What it validates |
|---|---|---|
| **SDLC** | `evolith validate --phase f1` | Phase → Gate → Artifacts → Schemas → Rulesets → ADRs → OPA → Blocking |
| **Architecture** | `evolith validate --topology modular-monolith` | Topology rules, hexagonal limits, domain isolation, multi-tenancy |
| **Ruleset** | `evolith validate --ruleset compliance-baseline` | Specific ruleset execution via OPA |
| **ADR** | `evolith validate --adr hexagonal-architecture` | ADR-specific architectural rules |
| **Ad-hoc** | `evolith validate --file src/domain/user.ts` | Individual file/component validation |
| **Composable** | `evolith validate --topology modular-monolith --ruleset compliance-baseline` | Multiple entry points combined |

**Intelligent Resolution:**
- `evolith validate` (no params) → reads `evolith.config.json` for defaults
- `evolith validate --topology modular-monolith` → infers architecture rules for that topology
- `evolith validate --phase f1` → resolves gate-f1 and its required artifacts
- System combines all provided inputs into optimal validation scope

**Example `evolith.config.json` (optional defaults):**
```json
{
  "topology": "modular-monolith",
  "phase": "f1",
  "rulesets": ["compliance-baseline", "definition-of-done"],
  "engine": "opa"
}
```

**Validation Flow (SDLC Mode):**
1. Resolves current phase and gate from config or flags
2. Validates required artifacts against schemas
3. Applies topology-specific rulesets
4. Enforces ADR-based architectural rules
5. Executes OPA policies in parallel for performance
6. Evaluates blocking criteria
7. Returns verdict with pass/fail per rule, evidence, blocking status, and remediation guidance

**Performance:** Full validation completes in <2s for standard projects.

**Dual-Engine Policy Evaluation:**
The CLI supports evaluating policies using either the built-in TypeScript engine (`native`) or Open Policy Agent WebAssembly modules (`opa`). See [Core ADR-0041](../../architecture/adrs/core/0041-dual-engine-policy-evaluation.md) for details.

**Examples:**

```bash
# Basic validation
smart-cli validate

# JSON output for automation
smart-cli validate --format json

# Table output for humans
smart-cli validate --format table

# Validate specific ruleset
smart-cli validate --ruleset acl
```

### adr

Manage Architecture Decision Records.

```bash
smart-cli adr <command>

Commands:
  create     Create new ADR
  list       List all ADRs
  get        Show ADR details
  update     Update existing ADR
  matrix     Show ADR matrix
```

**Examples:**

```bash
# Create new ADR
smart-cli adr create

# List all ADRs
smart-cli adr list

# Get specific ADR
smart-cli adr get ADR-0002
```

### standards

Manage governance standards.

```bash
smart-cli standards <command>

Commands:
  init       Initialize standards directory
  list       List all standards
  get        Show standard details
  validate   Validate against standards
  export     Export standard to markdown/json
```

**Examples:**

```bash
# Initialize standards
smart-cli standards init

# List standards
smart-cli standards list
```

### agents

Install and manage Evolith agents.

```bash
smart-cli agents <command>

Commands:
  install    Install new agent
  list       List installed agents
  remove     Remove agent
  validate   Validate agent ruleset
  upgrade    Upgrade agent
```

**Examples:**

```bash
# Interactive install
smart-cli agents install

# List agents
smart-cli agents list
```

### history

View and manage command history.

```bash
smart-cli history [options]

Options:
  --list              List recent commands
  --get <id>          Show command details
  --search <query>    Search commands
  --stats             Show statistics
  --clear             Clear history
```

**Examples:**

```bash
# Show last 20 commands
smart-cli history

# Show statistics
smart-cli history --stats

# Search commands
smart-cli history --search validate
```

### completion

Generate shell completion scripts.

```bash
smart-cli completion --install <shell>

Supported shells: bash, zsh, fish
```

**Examples:**

```bash
# Install bash completion
smart-cli completion --install bash

# Install zsh completion
smart-cli completion --install zsh
```

## MCP Server (AI Agent Integration)

The Evolith CLI includes an MCP server for AI agent integration.

### Starting the MCP Server

```bash
smart-cli mcp serve
```

The server communicates via stdio JSON-RPC.

### MCP Smoke Test

Use the smoke test before releases or MCP protocol changes:

```bash
npm run mcp:smoke
```

The smoke verifies `initialize`, `tools/list`, `resources/list`, `prompts/list`, and a real `tools/call` through the built CLI.

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `evolith-validate` | Validate repository compliance |
| `evolith-agent-install` | Install new agent |
| `evolith-agent-list` | List installed agents |
| `evolith-agent-validate` | Validate agent ruleset |
| `evolith-agent-upgrade` | Upgrade an existing agent |
| `evolith-agent-remove` | Remove an agent |
| `evolith-architecture-validate` | Validate architecture (F1/F2/F3) with optional deep analysis |
| `evolith-sdlc-handoff` | Generate phase handoff artifact manifest |
| `evolith-sdlc-status` | Show SDLC phase gate status |
| `evolith-config-get` | Get configuration value from `evolith.yaml` |
| `evolith-config-set` | Set configuration value in `evolith.yaml` |
| `evolith-metrics` | Get MCP server metrics |
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
      "command": "smart-cli",
      "args": ["mcp", "serve"]
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
      "command": "smart-cli",
      "args": ["mcp", "serve"]
    }
  }
}
```

## AI Agent Workflow Example

When integrated with an AI agent, you can have conversations like:

```
You: Validate my repository
Agent: Let me run the validation...

      await mcp.callTool('evolith-validate', {
        path: '/user/project',
        format: 'summary'
      })

Result: ✓ Repository is compliant with Evolith standards
        Rules checked: 12
        All gates passed

You: Show me the SDLC status
Agent: Let me check the phase gate status...

      await mcp.callTool('evolith-sdlc-status', {
        path: '/user/project'
      })

Result: Phase 1 — 3 gates passed, 0 failed
        All evidence artifacts present
```

## Configuration

Evolith uses an `evolith.yaml` file in the repository root:

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

## Output Formats

All commands support multiple output formats:

```bash
# JSON (default for automation)
smart-cli validate --format json

# Table (human-readable)
smart-cli validate --format table

# YAML (pipeline integration)
smart-cli validate --format yaml

# Markdown (documentation)
smart-cli validate --format markdown
```

## Troubleshooting

### Command not found

If `evolith` is not found after installation, ensure npm's global bin is in your PATH:

```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH="$(npm config get prefix)/bin:$PATH"
```

### MCP server not responding

Ensure the MCP server is running:

```bash
smart-cli mcp serve &
```

### Validation fails

Check your `evolith.yaml` exists and is valid:

```bash
cat evolith.yaml
smart-cli validate --verbose
```

## Development

### Building from Source

```bash
cd sdk/cli
npm install
npm run build
npm link  # Link globally for testing
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:cov
```

**Coverage (as of v1.1.0):** 80.65% statements · 81.47% lines · 1,206 unit + 121 E2E tests. The installable surface is tracked in the generated [Product Surface Inventory](./product-inventory.md).

### Project Structure

```
sdk/cli/
├── src/
│   ├── commands/      # CLI commands (adr, validate, agents, etc.)
│   ├── application/   # Use cases
│   ├── domain/        # Business logic (services, entities)
│   ├── infrastructure/# External integrations (catalog, CLI)
│   └── core/          # Shared (DI, observability, errors, MCP)
├── shell/             # Shell completion scripts
├── templates/         # Configuration templates
└── docs/              # Documentation
```

## Documentation

- [SMART CLI Demo Guide](docs/SMART-CLI-DEMO.md) - Comprehensive guide covering all commands, SDLC flow, product types, MCP integration, and architecture validation
- [Vision](docs/VISION.md) - CLI vision and roadmap
- [Data Models](docs/data-models.md) - Domain data models
- [MCP Integration](docs/MCP-INTEGRATION.md) - MCP server integration details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## License

ISC

## Support

- [Documentation](https://github.com/beyondnetcode/evolith_arch32#readme)
- [Issue Tracker](https://github.com/beyondnetcode/evolith_arch32/issues)
- [Discussions](https://github.com/beyondnetcode/evolith_arch32/discussions)
