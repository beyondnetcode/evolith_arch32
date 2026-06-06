# Evolith MCP Integration Guide for AI Agents

## Overview

The Evolith CLI includes a Model Context Protocol (MCP) server that allows AI agents to interact with Evolith governance tools. This guide shows how to configure and use Evolith with popular AI coding assistants.

## What is MCP?

The Model Context Protocol is a standard for AI agents to use tools. When you configure Evolith as an MCP server, AI agents like Cursor or Claude can:

1. **Discover available tools** - The agent queries `tools/list` to see what it can do
2. **Call tools** - The agent invokes `tools/call` with tool name and arguments
3. **Read resources** - The agent accesses documentation and data
4. **Use prompts** - The agent gets structured guidance for workflows

---

## Cursor AI Configuration

### 1. Install Evolith CLI

```bash
npm install -g @evolith/cli
```

### 2. Configure MCP Server

Create or edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "evolith": {
      "command": "evolith",
      "args": ["mcp", "serve"],
      "env": {
        "EVOLITH_CORE_PATH": "/path/to/evolith"
      }
    }
  }
}
```

### 3. Restart Cursor AI

Close and reopen Cursor AI to load the new MCP configuration.

### 4. Using Evolith in Cursor

Once configured, you can chat with Cursor:

```
User: Validate my repository
→ Cursor calls evolith-validate tool
→ Displays validation results

User: Show me the ADR matrix
→ Cursor calls evolith-adr-list tool
→ Displays ADRs with status

User: Install a standard agent
→ Cursor calls evolith-agent-install tool
→ Guides through installation
```

---

## Claude Desktop Configuration

### 1. Install Evolith CLI

```bash
npm install -g @evolith/cli
```

### 2. Configure MCP Server

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "evolith": {
      "command": "evolith",
      "args": ["mcp", "serve"],
      "env": {
        "EVOLITH_CORE_PATH": "/path/to/evolith"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

Close and reopen Claude Desktop to load the MCP configuration.

---

## Available Tools

### Validation Tools

#### `evolith-validate`

Validate repository compliance against Evolith standards.

**Arguments:**
```typescript
{
  path: string;           // Path to repository (required)
  format?: 'json' | 'summary' | 'table';  // Output format
  ruleset?: string;       // Specific ruleset (acl, open-core, etc.)
  corePath?: string;      // Path to Evolith Core
}
```

**Example:**
```javascript
const result = await callTool('evolith-validate', {
  path: '/user/project',
  format: 'summary'
});
// Returns: { status: 'passed', rulesChecked: 12, issues: [] }
```

#### `evolith-architecture-validate`

Validate repository architecture against F1/F2/F3 rules.

**Arguments:**
```typescript
{
  path: string;
  level?: 'F1' | 'F2' | 'F3';  // Architecture level
}
```

---

### ADR Tools

#### `evolith-adr-list`

List all ADRs in the repository.

**Arguments:**
```typescript
{
  status?: string;  // Filter by status (accepted, proposed, etc.)
}
```

#### `evolith-adr-get`

Get specific ADR details.

**Arguments:**
```typescript
{
  id: string;  // ADR ID (e.g., "ADR-0002")
}
```

---

### Agent Tools

#### `evolith-agent-install`

Install a new Evolith agent.

**Arguments:**
```typescript
{
  name: string;              // Agent name
  template?: string;         // Template (standard, minimal, enterprise)
  dir?: string;              // Installation directory
}
```

#### `evolith-agent-list`

List installed agents.

**Arguments:**
```typescript
{
  dir?: string;  // Directory to search
}
```

#### `evolith-agent-validate`

Validate agent ruleset.

**Arguments:**
```typescript
{
  name: string;  // Agent name
  dir?: string;  // Agent directory
}
```

---

### SDLC Tools

#### `evolith-sdlc-handoff`

Generate phase handoff manifest.

**Arguments:**
```typescript
{
  path: string;           // Repository path
  fromPhase: string;      // Source phase (phase-0, phase-1, etc.)
  toPhase: string;        // Target phase
}
```

#### `evolith-sdlc-status`

Show current SDLC phase status.

**Arguments:**
```typescript
{
  path: string;  // Repository path
}
```

---

### Configuration Tools

#### `evolith-config-get`

Get configuration value.

**Arguments:**
```typescript
{
  key: string;  // Config key (e.g., "coreRef.version")
  dir?: string; // Repository directory
}
```

#### `evolith-config-set`

Set configuration value.

**Arguments:**
```typescript
{
  key: string;   // Config key
  value: string; // New value
  dir?: string;  // Repository directory
}
```

---

### Metrics

#### `evolith-metrics`

Get MCP server usage metrics.

**Arguments:** `{}` (none)

---

## Example AI Agent Sessions

### Session 1: Repository Validation

```
Human: Please validate my repository and fix any issues

Claude: I'll validate your repository against Evolith standards.

await callTool('evolith-validate', {
  path: '/user/project',
  format: 'summary'
})

Result: Validation found 2 blocking issues:
- GOV-01: evolith.yaml missing
- INH-02: Core version not pinned

Claude: I found 2 issues that need fixing:

1. **evolith.yaml missing** - Your repository doesn't have the required configuration file.

2. **Core version not pinned** - The evolith.yaml doesn't specify coreRef.version.

Let me help you fix these:
```

### Session 2: ADR Management

```
Human: Create a new ADR for our database decision

Claude: I'll create a new Architecture Decision Record for your database choice.

await callTool('evolith-adr-create', {
  title: 'Use PostgreSQL as Primary Database',
  context: 'We need to select a database for our main data store...',
  decision: 'We decided to use PostgreSQL because...',
  consequences: {
    positive: ['ACID compliance', 'Rich indexing', 'JSON support'],
    negative: ['Requires more memory', 'Migration complexity']
  }
})

Result: ADR-0042 created successfully
```

### Session 3: Agent Installation

```
Human: Set up Evolith governance for our project

Claude: I'll initialize Evolith governance and install the standard agent.

First, let me check the current state:

await callTool('evolith-sdlc-status', { path: '/user/project' })

Result: No evolith.yaml found. Initializing...

Now installing the standard agent:

await callTool('evolith-agent-install', {
  name: 'governance-agent',
  template: 'standard',
  dir: '/user/project'
})

Result: Agent installed successfully with 6 rulesets

Claude: ✅ Evolith governance initialized!

Your project now has:
- evolith.yaml configuration
- Standard agent with 6 rulesets
- ADR registry (empty, ready for first decision)
```

---

## Resources

The MCP server provides these resources:

### `evolith://adr-registry`
Lists all ADRs with metadata.

### `evolith://standards`
Available governance standards.

### `evolith://agents`
Installed agents and their rulesets.

---

## Prompts

The MCP server includes prompts for common workflows:

### `handoff-template`
Generates a phase handoff manifest template.

### `adr-creation`
Guides through ADR creation process.

---

## Troubleshooting

### Tool not found

If the AI says "Tool not found", check:
1. MCP server is running: `evolith mcp serve`
2. Configuration is correct in mcp.json
3. Restart the AI application

### Permission denied

Ensure the AI application has permission to execute `evolith`.

### Timeout

For long operations, increase timeout in MCP config:

```json
{
  "mcpServers": {
    "evolith": {
      "command": "evolith",
      "args": ["mcp", "serve"],
      "timeout": 30000
    }
  }
}
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EVOLITH_CORE_PATH` | Path to Evolith Core | Auto-detect |
| `EVOLITH_CONFIG_PATH` | Custom config location | `~/.evolith` |
| `EVOLITH_LOG_LEVEL` | Logging level | `info` |

---

## Next Steps

1. Configure your AI assistant with the MCP server
2. Try validating an existing repository
3. Create your first ADR
4. Install an agent for automated governance