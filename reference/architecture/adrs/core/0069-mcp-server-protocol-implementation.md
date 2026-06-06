# ADR 0069: MCP Server Protocol Implementation

## Status
Proposed

## Date
2026-06-06

## Context

Evolith Core provides governance rulesets (ACL, Open-Core Boundary, Executive Scorecards) that AI agents must consume to enforce architectural decisions. Currently, agents access governance through manual CLI commands or direct file reading. This creates two problems:

1. **Inconsistent enforcement:** Agents may not run validation consistently without tooling integration
2. **No standardized protocol:** Each agent implements custom logic to parseEvolith artifacts

The Model Context Protocol (MCP) provides a standardized way for AI models to interact with external tools and resources. Implementing an MCP server for Evolith enables:
- Claude Desktop and other MCP-compatible agents to consume Evolith governance natively
- Consistent validation enforcement across all agent implementations
- A single source of truth for ruleset access via tools, resources, and prompts

## Decision

We will implement an MCP server (`evolith-mcp-server`) that exposes Evolith governance via JSON-RPC 2.0 over stdio transport. The server will NOT become a new truth source — it will proxy existing SDK service layer logic.

---

## 1. Architecture

### 1.1 Components

```
┌─────────────────────────────────────────────────────────────┐
│                      MCP Client (Claude Desktop)            │
└─────────────────────────────────────────────────────────────┘
                              │ stdio (JSON-RPC 2.0)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Evolith MCP Server                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Tools Handler│  │Resources   │  │ Prompts     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     SDK Service Layer                       │
│  ┌─────────────────┐  ┌────────────────────────┐           │
│  │RulesetValidator │  │ArchitectureValidation  │           │
│  └─────────────────┘  └────────────────────────┘           │
│  ┌─────────────────┐  ┌────────────────────────┐           │
│  │AgentInstallation│  │SdlcOperations          │           │
│  └─────────────────┘  └────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Transport

- **Protocol:** JSON-RPC 2.0 over stdio
- **Package:** `@modelcontextprotocol/sdk`
- **Transport Class:** `StdioServerTransport`
- **No HTTP/WebSocket:** MCP server is subprocess, not network service

### 1.3 SDK as Single Source of Truth

The MCP server MUST NOT implement business logic directly. It delegates to SDK service layer:

```
McpServer.tools/call → SDKService.method() → JSON-RPC response
```

This ensures:
- CLI and MCP share identical validation logic
- Bug fixes only need to happen in one place (SDK)
- SDK extraction remains possible in future phases

---

## 2. MCP Capabilities

### 2.1 Tools (30+)

| Tool Name | Arguments | Returns |
|-----------|-----------|---------|
| `evolith-validate` | `path: string, format?: string, ruleset?: string` | Validation result JSON |
| `evolith-agent-install` | `name: string, template?: string, dir?: string` | Installation confirmation |
| `evolith-agent-list` | `dir?: string` | List of installed agents |
| `evolith-agent-validate` | `name: string, dir?: string` | Agent ruleset validation |
| `evolith-agent-upgrade` | `name: string, dir?: string` | Upgrade result |
| `evolith-agent-remove` | `name: string, dir?: string` | Removal confirmation |
| `evolith-architecture-validate` | `path: string, level?: F1\|F2\|F3` | Architecture validation |
| `evolith-sdlc-handoff` | `path: string, fromPhase: string, toPhase: string` | Handoff manifest |
| `evolith-sdlc-status` | `path: string` | Current phase gate status |
| `evolith-config-get` | `key: string` | Configuration value |
| `evolith-config-set` | `key: string, value: string` | Set confirmation |

### 2.2 Resources (12)

| Resource URI | Description |
|--------------|-------------|
| `evolith://rulesets` | List of available ruleset names and paths |
| `evolith://ruleset/{name}` | Full content of a specific ruleset |
| `evolith://ruleset/{name}/rule/{code}` | Single rule from a ruleset |
| `evolith://phase-gates` | Current phase gate definitions |
| `evolith://phase-gate/{phase}` | Specific phase gate requirements |
| `evolith://agents` | List of installed agents |
| `evolith://agent/{name}` | Agent configuration and rules |
| `evolith://repository/config` | Repository evolith.yaml content |
| `evolith://governance/version` | Governance schema version |
| `evolith://core/version` | Core schema version |
| `evolith://open-core/artifacts` | List of Open-Core artifacts |
| `evolith://acl/rules` | ACL ruleset summary |

### 2.3 Prompts (6)

| Prompt Name | Purpose |
|-------------|---------|
| `evolith/validate-repository` | Template for validating a repository against governance |
| `evolith/agent-onboarding` | Template for installing and configuring a new agent |
| `evolith/architecture-review` | Template for performing F1/F2/F3 architecture review |
| `evolith/phase-gate-check` | Template for checking phase gate readiness |
| `evolith/sdlc-handoff` | Template for executing SDLC phase handoff |
| `evolith/ruleset-analysis` | Template for analyzing a ruleset for compliance |

---

## 3. Implementation Requirements

### 3.1 Package Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0"
  }
}
```

### 3.2 Project Structure

```
sdk/cli/
├── src/
│   ├── cli/
│   │   ├── index.ts              # CLI entry point
│   │   └── commands/
│   │       └── mcp.ts            # 'smart-cli mcp' command
│   ├── mcp/
│   │   ├── server.ts             # McpServer class
│   │   ├── tools/
│   │   │   ├── validate.ts       # evolith-validate tool
│   │   │   ├── agent.ts          # agent management tools
│   │   │   ├── architecture.ts   # architecture validation tools
│   │   │   └── sdlc.ts           # sdlc tools
│   │   ├── resources/
│   │   │   └── index.ts          # Resource handlers
│   │   └── prompts/
│   │       └── index.ts          # Prompt templates
│   └── core/
│       └── services/             # SDK service layer (shared)
└── dist/
    ├── cli.js                    # CLI output
    └── mcp-server.js             # MCP server output
```

### 3.3 Server Implementation

```typescript
import { Server } from '@modelcontextprotocol/sdk/server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types';

export class EvolithMcpServer extends Server {
  constructor() {
    super({
      name: 'evolith-mcp-server',
      version: '1.0.0',
    });

    this.setRequestHandler(ListToolsRequestSchema, this.handleListTools.bind(this));
    this.setRequestHandler(CallToolRequestSchema, this.handleCallTool.bind(this));
  }

  private async handleListTools() {
    return {
      tools: [
        { name: 'evolith-validate', description: 'Validate repository against Evolith governance', inputSchema: {...} },
        // ... more tools
      ]
    };
  }

  private async handleCallTool(name: string, args: Record<string, unknown>) {
    // Delegate to SDK service layer
    const service = getSdkService(name);
    const result = await service.execute(args);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
}
```

### 3.4 CLI Integration

The MCP server is invoked via `smart-cli mcp` subcommand:

```typescript
export const mcpCommand = new Command('mcp')
  .description('Start Evolith MCP server for AI agent integration')
  .action(async () => {
    const server = new EvolithMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
  });
```

---

## 4. Protocol Compliance

### 4.1 JSON-RPC 2.0 Requirements

- All requests MUST have `jsonrpc: '2.0'`
- All requests MUST have `id` (string or number)
- Notifications (no response expected) omit `id`
- Errors MUST include `code`, `message`, and optionally `data`

### 4.2 Required Handlers

| Handler | Required | Description |
|---------|----------|-------------|
| `initialize` | YES | Server capability announcement |
| `tools/list` | YES | Enumerate available tools |
| `tools/call` | YES | Execute tool by name |
| `resources/list` | YES | Enumerate available resources |
| `resources/read` | YES | Read resource content |
| `prompts/list` | YES | Enumerate available prompts |
| `prompts/get` | YES | Get prompt template |
| `shutdown` | YES | Graceful server shutdown |

### 4.3 Error Codes

| Code | Meaning | Usage |
|------|---------|-------|
| `-32700` | Parse error | Invalid JSON received |
| `-32600` | Invalid request | Missing required fields |
| `-32601` | Method not found | Unknown tool/resource |
| `-32603` | Internal error | SDK service failure |

---

## 5. Non-Goals (Architectural Violations to Avoid)

| Non-Goal | Reason |
|----------|--------|
| MCP server does NOT notify clients | WatcherService pattern rejected (G-01 gap analysis) |
| MCP server does NOT store state | State lives in repository file system |
| MCP server does NOT become truth source | SDK service layer is source of truth |
| MCP server does NOT expose network transport | stdio only; no HTTP/WebSocket |

---

## 6. Security Considerations

### 6.1 Input Validation

- All tool arguments MUST be validated against JSON schema
- Path arguments MUST be sandboxed to repository root
- No shell execution from tool arguments

### 6.2 Resource Access Control

- Resources are read-only (no write resources)
- Path traversal attacks prevented by normalizing and validating paths
- Large resource responses truncated to prevent DoS

### 6.3 Prompt Injection Prevention

- Prompt templates do not include raw user input
- All user input is escaped before insertion into prompts

---

## 7. Testing Requirements

### 7.1 Unit Tests

- McpServer handler methods tested with mocked SDK services
- Tool argument validation tested with invalid inputs
- Resource path normalization tested

### 7.2 Integration Tests

- MCP server spawned as subprocess over stdio
- JSON-RPC requests sent and responses validated
- Full round-trip: CLI → MCP → SDK → Response

### 7.3 Protocol Compliance Tests

- All required handlers return correct schema
- Error codes are correct for failure scenarios
- Notification-only methods do not return responses

---

## 8. Phase Gate Alignment

| Phase | MCP Deliverable | Exit Criteria |
|-------|----------------|---------------|
| Phase 1 | SDK foundation | SDK services unit tested 80%+ |
| Phase 2 | CLI completion | CLI commands functional |
| Phase 3 | MCP server | MCP tools, resources, prompts working |
| Phase 4 | SDK extraction | SDK published to npm (if applicable) |

---

## 9. Consequences

### Positive

- AI agents can consume Evolith governance natively via MCP
- Consistent validation enforcement across all MCP-compatible agents
- CLI and MCP share SDK service layer (single source of truth)
- Standardized protocol replaces custom agent implementations

### Negative

- Additional maintenance burden for MCP server
- Protocol compliance testing adds CI complexity
- MCP SDK dependency adds to bundle size

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| MCP SDK changes break server | Pin SDK version; test on upgrade |
| stdio transport has buffering issues | Use official StdioServerTransport; test large outputs |
| Protocol schema evolves | Version negotiation in initialize handler |

---

## 10. References

- [SDK/CLI/MCP Target Architecture](../../../../sdk/cli/docs/planning/sdk-cli-mcp-target-architecture.md)
- [MCP Capability Catalog](../../../../sdk/cli/docs/planning/mcp-capability-catalog.md)
- [Gap Analysis G-01: MCP Server Protocol Not Implemented](../../../../sdk/cli/docs/planning/sdk-cli-mcp-gap-analysis.md)
- [Testing Strategy](../../../../sdk/cli/docs/planning/testing-strategy.md)
- [Release Readiness Checklist](../../../../sdk/cli/docs/planning/release-readiness-checklist.md)
- [ACL Ruleset](../../../../rulesets/acl/anti-corruption-layer.rules.json)
- [Open-Core Boundary Rules](../../../../rulesets/governance/open-core-boundary.rules.json)
- [@modelcontextprotocol/sdk](https://modelcontextprotocol.io)

---

[Back to Index](./README.md)