# C4 Level 3: MCP Server Components

> **Bilingual Navigation:** [Versión en Español](./mcp-server-components.es.md)

**Status:** Approved  
**Level:** 3 - Components  
**Parent:** [C4 Level 3: Components Hub](./README.md)

## 1. Container Context

The **Standalone MCP Server** exposes Evolith's governance capabilities to external AI Agents (such as Claude via Claude Desktop, or other capable agentic workflows) using the standard Model Context Protocol. It is fully decoupled from the Smart CLI.

## 2. Component Diagram

```mermaid
C4Component
    title Component Diagram for MCP Server

    Container_Boundary(mcp, "MCP Server Container") {
        
        Component(transport, "Transport Layer", "@modelcontextprotocol/sdk", "Handles Stdio and SSE transport for incoming MCP connections.")
        
        Component(server, "EvolithMcpServer", "App Service", "Main coordination class for registering tools and resources.")
        
        Component(tool_validate, "Validate Tool", "Tool Handler", "MCP Tool: Validates local files against OPA rulesets via Agent Runtime / Core API.")
        
        Component(tool_gate, "Gate Check Tool", "Tool Handler", "MCP Tool: Checks if an SDLC phase gate is passing.")
        
        Component(resource_corpus, "Corpus Resource", "Resource Handler", "MCP Resource: Exposes the physical rulesets and OPA files as readable context.")
        
        Component(client, "Core API Client", "Adapter", "Communicates with the Core API (BFF) to execute evaluations.")

        Rel(transport, server, "Routes requests to")
        Rel(server, tool_validate, "Dispatches tool call")
        Rel(server, tool_gate, "Dispatches tool call")
        Rel(server, resource_corpus, "Dispatches resource read")
        
        Rel(tool_validate, client, "Executes validation via")
        Rel(tool_gate, client, "Executes gate check via")
    }
```

## 3. Key Components Breakdown

| Component | Responsibility |
|-----------|----------------|
| **Transport Layer** | Standard MCP SDK managing connection lifecycle (Stdio for local processes, SSE for remote streaming). |
| **EvolithMcpServer** | The application entry point that registers the available tool and resource schema with the connecting LLM. |
| **Tool Handlers** | Specific, bounded actions the AI can take (e.g., `validate_artifact`, `check_gate`). |
| **Resource Handlers** | Read-only context the AI can request (e.g., `ruleset://...`). |
| **Core API Client** | Instead of duplicating business logic, the MCP Server makes REST calls to the `Core API` to process validations and read topologies. |

---
[Back to Level 3: Components Hub](./README.md)
