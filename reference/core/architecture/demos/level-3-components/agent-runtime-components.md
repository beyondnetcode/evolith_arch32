# C4 Level 3: Agent Runtime Components

> **Bilingual Navigation:** [Versión en Español](./agent-runtime-components.es.md)

**Status:** Approved  
**Level:** 3 - Components  
**Parent:** [C4 Level 3: Components Hub](./README.md)

## 1. Container Context

The **Agent Runtime Engine** orchestrates governed AI agent executions. It receives tasks from Tracker, MCP, CLI, or HTTP clients, resolves skills, enforces approval and policy boundaries, invokes capabilities through abstracted ports, and publishes trace/memory events.

It uses **Ports and Adapters (Hexagonal Architecture)**.

## 2. Component Diagram

```mermaid
C4Component
    title Component Diagram for Agent Runtime Engine

    Container_Boundary(runtime, "Agent Runtime Container") {
        
        Component(api, "Runtime Command/Event API", "NestJS @Controller", "Exposes command requests and optional event streams through /v1/agent/handle, /v1/agent/stream, and /v1/agent/skills.")
        
        Component(orchestrator, "AgentOrchestratorService", "Application Service", "The core coordinator. Uses resolvers and ports to execute multi-step agent flows.")
        
        Component(resolver, "Skill & Tool Resolver", "Domain Service", "Resolves default or registered skills and maps intents to governed capabilities.")
        
        Component(boundary, "Policy / Approval Boundary", "Domain Service", "Applies HITL approval and OPA policy validation before governed effects complete.")
        
        Component(enginePort, "IAgentEnginePort", "Interface (Port)", "Contract for the underlying LLM engine (e.g. Hermes).")
        Component(harnessPort, "IHarnessPort", "Interface (Port)", "Contract for executing shell/sandbox commands.")
        Component(corePort, "ICoreEvaluationPort", "Interface (Port)", "Contract for evaluating gates deterministically.")
        Component(memoryPort, "IMemoryPort", "Interface (Port)", "Contract for runtime memory and durable conversation state.")
        Component(tracePort, "ITrackerTracePort", "Interface (Port)", "Contract for publishing trace events to Tracker.")
        
        Component(hermesAdapter, "Hermes Engine Adapter", "Infrastructure Adapter", "Implements IAgentEnginePort using the local Hermes library.")
        Component(harnessAdapter, "Harness Exec Adapter", "Infrastructure Adapter", "Implements IHarnessPort by calling .harness scripts.")

        Rel(api, orchestrator, "Initiates execution via")
        Rel(orchestrator, resolver, "Finds skills via")
        Rel(orchestrator, boundary, "Validates actions via")
        
        Rel(orchestrator, enginePort, "Drives execution via")
        Rel(orchestrator, harnessPort, "Runs scripts via")
        Rel(orchestrator, corePort, "Evaluates gates via")
        
        Rel(hermesAdapter, enginePort, "Implements")
        Rel(harnessAdapter, harnessPort, "Implements")
    }
```

## 3. Key Components Breakdown

| Component | Responsibility |
|-----------|----------------|
| **Runtime Command/Event API** | Receives an `AgentRuntimeRequest` through explicit HTTP commands. `POST /v1/agent/handle` returns one result envelope; `POST /v1/agent/stream` starts the command and keeps an event stream open for progress/tool-result/violation/final events. `GET /v1/agent/skills` exposes discovery. |
| **AgentOrchestratorService** | Coordinates the entire agent loop. It retrieves the task, asks the LLM engine for the next action, executes the action if allowed, and loops until completion. |
| **Skill & Tool Resolver** | Resolves default or registered capabilities such as gate validation, artifact checks, OPA audits, ADR validation, unblock recommendations, and trace publishing. |
| **Ports (IAgentEnginePort, etc)** | Define strict contracts for LLM planning, harness execution, Core evaluation, policy validation, Tracker trace publishing, memory, approval, and scheduling. |
| **Adapters** | Production adapters include HTTP Core evaluation, OPA CLI policy validation, harness process execution, HTTP Tracker trace publishing, and file-backed memory. Safe stubs remain available for local bootstrapping and tests. |

---
[Back to Level 3: Components Hub](./README.md)
