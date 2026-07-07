# C4 Level 2: Containers

> **Bilingual Navigation:** [Versión en Español](./level-2-containers.es.md)

**Status:** Approved  
**Level:** 2 - Containers  
**Parent:** [C4 Level 1: System Context](./level-1-system-context.md)

## 1. Container Overview

This view zooms into the **Evolith Core Ecosystem** to reveal its major executing containers. Evolith Core adopts a modular architecture, exposing its rulesets and capabilities via specialized APIs (REST for stateless evaluation, a command/event API for Agent Runtime, MCP for interactive AI tools, and CLI commands for local workflows).

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
        
        Container(api, "Core API", "NestJS / REST", "Stateless evaluation surface. Serves rulesets, evaluates contexts, gates and topology checks, and hosts transitional satellite registry endpoints.")
        Container(mcp, "Standalone MCP Server", "NestJS / MCP stdio + Streamable HTTP", "Model Context Protocol gateway. Provides governed tools, resources, prompts, ABAC, audit and metrics.")
        Container(cli, "Smart CLI", "Nest Commander / TypeScript", "Terminal application for local validation, evaluation, scaffolding, profiles, plugins and satellite workflows.")
        Container(agentApi, "Agent Runtime Command/Event API", "NestJS / HTTP + optional SSE", "Command requests plus optional event stream for governed agent executions.")
        Container(runtime, "Agent Runtime Engine", "TypeScript Package", "Governed orchestration layer enforcing boundaries, ports, and execution.")
        
        ContainerDb(redis, "Caching Layer", "Redis", "Caches rulesets and manifest topology for 24/7 high availability.")
        ContainerDb(corpus, "Reference Corpus", "JSON / Rego / File System", "The physical source of truth for architectural directives and OPA rules.")
        
        Rel(gateway, api, "Routes API traffic to")
        Rel(gateway, agentApi, "Routes command and event traffic to")
        
        Rel(api, redis, "Reads/Writes cache")
        Rel(api, corpus, "Reads structured rulesets")
        
        Rel(mcp, runtime, "Runs agent intents through")
        Rel(agentApi, runtime, "Starts commands and streams events from")
        Rel(cli, runtime, "Can call through SDK/API")
        Rel(runtime, api, "Evaluates contexts via REST")
        Rel(runtime, corpus, "Reads context from")
    }

    Rel(dev, cli, "Runs local commands")
    Rel(agent, mcp, "Consumes tools")
    Rel(agent, agentApi, "Sends commands and listens for events")
    Rel(tracker, gateway, "Consumes stateless evaluation and agent execution")
```

## 3. Core Containers Breakdown

| Container | Technology | Responsibility |
|-----------|------------|----------------|
| **Core API (REST)** | NestJS | Stateless evaluation engine. Exposes `/api/v1/evaluate`, ruleset/reference endpoints, gate/phase endpoints, architecture checks, and a transitional in-memory satellite registry. It returns technical evaluation results, not binding Tracker decisions. |
| **Agent Runtime Command/Event API** | NestJS / RxJS | Exposes `POST /v1/agent/handle` for request/response execution, `POST /v1/agent/stream` for command submission plus event delivery, and `GET /v1/agent/skills` for discovery. SSE is an event transport, not the command channel. |
| **Standalone MCP Server** | NestJS / Node.js | Exposes Evolith tools, resources, prompts, ABAC, audit, metrics, and stdio/Streamable HTTP transports through the Model Context Protocol. It is decoupled from the CLI but shares domain packages. |
| **Smart CLI** | Nest Commander / TypeScript | Human-friendly interface for local validation, canonical evaluation, scaffolding, profiles, plugins, satellites, and API inspection. |
| **Agent Runtime Engine** | TypeScript (`@evolith/agent-runtime`) | The ports-and-adapters orchestration layer. Decides *how* an agent task is executed without coupling to `.harness` or Hermes directly. |
| **Redis Cache** | Redis / cache-manager | Optional high-availability cache for topology/reference reads and service performance. Core still falls back safely when Redis is unavailable. |

## 4. Zoom In

Next, we look inside these specific containers to understand their internal components (use cases, controllers, adapters).
**[Go to Level 3: Components](./level-3-components/README.md)**

---
[Back to Level 1: System Context](./level-1-system-context.md) | [Back to Master Architecture](./C4-MASTER-ARCHITECTURE.md)
