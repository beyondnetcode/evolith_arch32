# C4 Level 3: MCP Server Components

> **Bilingual Navigation:** [Versión en Español](./mcp-server-components.es.md)

**Status:** Approved  
**Level:** 3 - Components  
**Parent:** [C4 Level 3: Components Hub](./README.md)

## 1. Container Context

The **Standalone MCP Server** exposes Evolith governance capabilities to external AI agents using the standard Model Context Protocol. It is fully decoupled from the Evolith CLI as a runtime, but it shares domain packages and the same canonical evaluation contracts.

## 2. Component Diagram

```mermaid
C4Component
    title Component Diagram for MCP Server

    Container_Boundary(mcp, "MCP Server Container") {
        
        Component(transport, "Transport Layer", "@modelcontextprotocol/sdk", "Handles stdio and Streamable HTTP transports for incoming MCP connections.")
        
        Component(server, "EvolithMcpServer", "App Service", "Main coordination service for MCP request handlers, resources, prompts, audit and metrics.")
        
        Component(registry, "Tool Registry", "NestJS Provider", "Registers validate, evaluate, satellites, agents, architecture, gates, phase, SDLC, topology, config, auto-fix, metrics and other tools.")
        Component(authz, "Auth / ABAC / Audit", "MCP Services", "Validates API key/JWT context, evaluates ABAC policies, emits audit logs and metrics.")
        Component(tool_validate, "Validate / Evaluate Tools", "Tool Handlers", "MCP Tools: validate repositories and evaluate canonical EvaluationContext locally through shared core-domain logic.")
        
        Component(tool_gate, "Gate Check Tool", "Tool Handler", "MCP Tool: Checks if an SDLC phase gate is passing.")
        
        Component(resource_corpus, "Resources and Prompts", "Resource/Prompt Handlers", "MCP resources and prompts expose corpus, rulesets and reusable guidance as readable context.")
        
        Component(runtime, "Agent Runtime Bridge", "@beyondnet/evolith-agent-runtime / SDK", "Runs agent intents or calls Agent Runtime API when requested by MCP tools.")

        Rel(transport, server, "Routes requests to")
        Rel(server, registry, "Lists and dispatches tools via")
        Rel(server, authz, "Authorizes and audits via")
        Rel(registry, tool_validate, "Dispatches tool call")
        Rel(server, tool_gate, "Dispatches tool call")
        Rel(server, resource_corpus, "Dispatches resource read")
        
        Rel(tool_validate, runtime, "Can invoke agent/runtime flow via")
        Rel(tool_gate, runtime, "Can invoke governed checks via")
    }
```

## 3. Key Components Breakdown

| Component | Responsibility |
|-----------|----------------|
| **Transport Layer** | Standard MCP SDK managing stdio and Streamable HTTP connection lifecycles. HTTP mode is fail-closed in production without an API key. |
| **EvolithMcpServer** | Application entry point wiring MCP request handlers to the registry, resources, prompts, metrics, ABAC and audit services. |
| **Tool Registry** | Module-composed registry fed by `packages/mcp-server/src/tools/tools.module.ts`; it is the canonical replacement for the retired lightweight `@beyondnet/evolith-mcp-tools` package. |
| **Tool Handlers** | Governed actions including `evolith-validate`, `evolith-evaluate`, satellite tools, agent tools, architecture tools, gate/phase tools, SDLC tools, topology tools, config tools, metrics and auto-fix tools. |
| **Resources and Prompts** | Read-only context and reusable prompt payloads exposed through MCP resource and prompt handlers. |
| **Auth / ABAC / Audit** | API key/JWT authentication, ABAC checks, mutative-tool gating, tool-call audit logs, and metrics. |

---
[Back to Level 3: Components Hub](./README.md)
