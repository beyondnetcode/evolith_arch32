# C4 Level 3: Agent Runtime Components

> **Bilingual Navigation:** [Versión en Español](./agent-runtime-components.es.md)

**Status:** Approved  
**Level:** 3 - Components  
**Parent:** [C4 Level 3: Components Hub](./README.md)

## 1. Container Context

The **Agent Runtime Engine** orchestrates governed AI agent executions. It receives tasks from the Tracker or SSE streams, resolves skills, enforces boundaries using OPA, and invokes capabilities via abstracted ports (so it isn't coupled directly to `.harness` or Hermes).

It uses **Ports and Adapters (Hexagonal Architecture)**.

## 2. Component Diagram

```mermaid
C4Component
    title Component Diagram for Agent Runtime Engine

    Container_Boundary(runtime, "Agent Runtime Container") {
        
        Component(api, "SSE Runtime API", "NestJS @Controller", "Exposes /v1/agent/stream for real-time Server-Sent Events execution streaming.")
        
        Component(orchestrator, "AgentOrchestratorService", "Application Service", "The core coordinator. Uses resolvers and ports to execute multi-step agent flows.")
        
        Component(resolver, "Skill & Tool Resolver", "Domain Service", "Resolves required skills and tools for a given initiative context.")
        
        Component(boundary, "Boundary Enforcer (OPA)", "Domain Service", "Consults OPA policies before executing any tool or side effect.")
        
        Component(enginePort, "IAgentEnginePort", "Interface (Port)", "Contract for the underlying LLM engine (e.g. Hermes).")
        Component(harnessPort, "IHarnessPort", "Interface (Port)", "Contract for executing shell/sandbox commands.")
        Component(corePort, "ICoreEvaluationPort", "Interface (Port)", "Contract for evaluating gates deterministically.")
        
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
| **SSE Runtime API** | Receives an `AgentRuntimeRequest` and maintains a long-lived HTTP connection, streaming state updates and tool execution logs back to the client. |
| **AgentOrchestratorService** | Coordinates the entire agent loop. It retrieves the task, asks the LLM engine for the next action, executes the action if allowed, and loops until completion. |
| **Skill & Tool Resolver** | Inspects the `workspaceRef` and tenant context to determine what specific tools or prompts the agent is allowed to use. |
| **Ports (IAgentEnginePort, etc)** | Define strict contracts. The orchestrator depends *only* on the ports, ensuring the underlying engine or script executor can be swapped out. |
| **Hermes Engine Adapter** | Plugs the internal Hermes execution engine into the runtime. |

---
[Back to Level 3: Components Hub](./README.md)
