# C4 Level 2: Containers

> **Bilingual Navigation:** [Versión en Español](./level-2-containers.es.md)

**Status:** Approved  
**Level:** 2 - Containers  
**Parent:** [C4 Level 1: System Context](./level-1-system-context.md)

## 1. Container Overview

This view zooms into the **Evolith Core Ecosystem** to reveal its major executing containers. Evolith Core adopts a modular architecture, exposing its rulesets and capabilities via specialized APIs (REST for stateless evaluation, SSE for Agent Runtime, and MCP for interactive AI tools).

> *Note: Evolith Tracker (the SaaS) and its BFF are treated as external systems consuming these containers.*

## 2. Container Diagram

```mermaid
C4Container
    title Container Diagram for Evolith Core Ecosystem

    Person(dev, "Engineer", "Uses Smart CLI")
    Person(agent, "AI Agent", "Autonomous LLM Executor")
    System_Ext(tracker, "Evolith Tracker", "Stateful SaaS Orchestrator")

    System_Boundary(core, "Evolith Core System") {
        Container(gateway, "API Gateway", "Traefik", "Ingress controller routing traffic and handling TLS termination.")
        
        Container(api, "Core API (BFF)", "NestJS / REST", "Stateless evaluation engine. Serves rulesets and assesses gates.")
        Container(mcp, "Standalone MCP Server", "Node.js / stdio / SSE", "Model Context Protocol server. Provides tools to AI agents.")
        Container(cli, "Smart CLI", "Node.js / TS", "Interactive terminal application orchestrating local workflows.")
        Container(sse, "Agent Runtime API", "NestJS / SSE", "Event-driven streaming API for governed agent executions.")
        Container(runtime, "Agent Runtime Engine", "TypeScript Package", "Governed orchestration layer enforcing boundaries, ports, and execution.")
        
        ContainerDb(redis, "Caching Layer", "Redis", "Caches rulesets and manifest topology for 24/7 high availability.")
        ContainerDb(corpus, "Reference Corpus", "JSON / Rego / File System", "The physical source of truth for architectural directives and OPA rules.")
        
        Rel(gateway, api, "Routes API traffic to")
        Rel(gateway, sse, "Routes stream traffic to")
        
        Rel(api, redis, "Reads/Writes cache")
        Rel(api, corpus, "Reads structured rulesets")
        
        Rel(mcp, runtime, "Delegates execution to")
        Rel(sse, runtime, "Streams events from")
        Rel(cli, runtime, "Orchestrates via")
        Rel(runtime, api, "Evaluates gates via REST")
        Rel(runtime, corpus, "Reads context from")
    }

    Rel(dev, cli, "Runs local commands")
    Rel(agent, mcp, "Consumes tools")
    Rel(agent, sse, "Subscribes to streams")
    Rel(tracker, gateway, "Consumes stateless evaluation and agent execution")
```

## 3. Core Containers Breakdown

| Container | Technology | Responsibility |
|-----------|------------|----------------|
| **Core API (REST)** | NestJS | Stateless evaluation engine. Processes OPA rulesets, returns technical evaluation results (NOT canonical state). |
| **Agent Runtime API (SSE)** | NestJS / RxJS | Exposes the Server-Sent Events endpoint (`/v1/agent/stream`) to execute multi-turn agent processes asynchronously. |
| **Standalone MCP Server** | Node.js | Exposes Evolith's toolset via the Model Context Protocol to Anthropic Claude and other capable agents. Completely decoupled from CLI. |
| **Smart CLI** | Node.js / Commander | Human-friendly interface for interacting with the reference corpus, scaffolding, and executing local checks. |
| **Agent Runtime Engine** | TypeScript (`@evolith/agent-runtime`) | The ports-and-adapters orchestration layer. Decides *how* an agent task is executed without coupling to `.harness` or Hermes directly. |
| **Redis Cache** | Redis | High-availability caching to ensure Evolith can validate rules even if I/O is slow. |

## 4. Zoom In

Next, we look inside these specific containers to understand their internal components (use cases, controllers, adapters).
**[Go to Level 3: Components](./level-3-components/README.md)**

---
[Back to Level 1: System Context](./level-1-system-context.md) | [Back to Master Architecture](../C4-MASTER-ARCHITECTURE.md)
