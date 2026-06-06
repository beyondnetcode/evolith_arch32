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
npm install -g @evolith/cli
```

### Manual

Download the latest binary from [GitHub Releases](https://github.com/beyondnetcode/evolith_arch32/releases) and add to your PATH.

### Verify Installation

```bash
evolith --version
# evolith version 1.0.0
```

## Quickstart

### 1. Initialize a Repository

```bash
cd your-project
evolith init
```

This creates an `evolith.yaml` file with default configuration.

### 2. Run First Validation

```bash
evolith validate
```

Output:
```
✓ Validating repository...
✓ Repository is compliant with Evolith standards
```

### 3. Install an Agent

```bash
evolith agents install
# Select "standard" template when prompted
```

## Commands

### validate

Validate repository compliance against Evolith standards.

```bash
evolith validate [options]

Options:
  --satellite <path>    Path to satellite repository (default: cwd)
  --core <path>         Path to Evolith Core
  --format <format>     Output format: json, table, yaml, markdown
  --output <file>       Write output to file
  --ruleset <id>        Validate specific ruleset (acl, open-core, inheritance)
```

**Examples:**

```bash
# Basic validation
evolith validate

# JSON output for automation
evolith validate --format json

# Table output for humans
evolith validate --format table

# Validate specific ruleset
evolith validate --ruleset acl
```

### adr

Manage Architecture Decision Records.

```bash
evolith adr <command>

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
evolith adr create

# List all ADRs
evolith adr list

# Get specific ADR
evolith adr get ADR-0002
```

### standards

Manage governance standards.

```bash
evolith standards <command>

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
evolith standards init

# List standards
evolith standards list
```

### agents

Install and manage Evolith agents.

```bash
evolith agents <command>

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
evolith agents install

# List agents
evolith agents list
```

### history

View and manage command history.

```bash
evolith history [options]

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
evolith history

# Show statistics
evolith history --stats

# Search commands
evolith history --search validate
```

### completion

Generate shell completion scripts.

```bash
evolith completion --install <shell>

Supported shells: bash, zsh, fish
```

**Examples:**

```bash
# Install bash completion
evolith completion --install bash

# Install zsh completion
evolith completion --install zsh
```

## MCP Server (AI Agent Integration)

The Evolith CLI includes an MCP server for AI agent integration.

### Starting the MCP Server

```bash
evolith mcp serve
```

The server communicates via stdio JSON-RPC.

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `evolith-validate` | Validate repository compliance |
| `evolith-agent-install` | Install new agent |
| `evolith-agent-list` | List installed agents |
| `evolith-agent-validate` | Validate agent ruleset |
| `evolith-architecture-validate` | Validate architecture |
| `evolith-sdlc-handoff` | Generate phase handoff |
| `evolith-sdlc-status` | Show SDLC phase status |
| `evolith-config-get` | Get configuration value |
| `evolith-config-set` | Set configuration value |
| `evolith-metrics` | Get MCP server metrics |

### Cursor AI Configuration

Add to `~/.cursor/mcp.json`:

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

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

You: Show me the ADRs
Agent: Let me fetch the ADR list...

      await mcp.callTool('evolith-adr-list', {})

Result: Found 5 ADRs:
        - ADR-0001: Architecture Decision Record Template
        - ADR-0002: Hexagonal Architecture (accepted)
        - ADR-0003: Testing Pyramid (accepted)
```

## Configuration

Evolith uses an `evolith.yaml` file in the repository root:

```yaml
coreRef:
  version: "1.0.0"
  path: "../evolith"

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
evolith validate --format json

# Table (human-readable)
evolith validate --format table

# YAML (pipeline integration)
evolith validate --format yaml

# Markdown (documentation)
evolith validate --format markdown
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
evolith mcp serve &
```

### Validation fails

Check your `evolith.yaml` exists and is valid:

```bash
cat evolith.yaml
evolith validate --verbose
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
npm test
```

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