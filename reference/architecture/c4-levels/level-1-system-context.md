# C4 Level 1: System Context

> **Bilingual Navigation:** [Versión en Español](./level-1-system-context.es.md)

**Status:** Approved  
**Level:** 1 - System Context  
**Parent:** [C4 Master Architecture](../C4-MASTER-ARCHITECTURE.md)

## 1. System Overview

Evolith is designed to act as the authoritative governance engine for the entire SDLC. At the highest level, it interacts with Humans, AI Agents, and external SaaS platforms.

The system is fundamentally composed of **Evolith Tracker** (the stateful SaaS product that manages processes and UI) and **Evolith Core** (the stateless evaluation and AI agent orchestration engine).

## 2. Context Diagram

```mermaid
C4Context
    title System Context Diagram for Evolith Ecosystem

    Person(human, "Engineer / Product Owner", "Humans driving or approving the SDLC via UI or CLI.")
    Person(agent, "AI Agent", "Autonomous agents executing technical tasks via MCP and SSE.")

    System_Boundary(evolithEcosystem, "Evolith Platform") {
        System(tracker, "Evolith Tracker", "Stateful SaaS Orchestrator. Manages tenants, SDLC phase execution, approvals, and traceability.")
        System(core, "Evolith Core", "Stateless Rule & AI Engine. Provides rule evaluation (OPA), schemas, and AI agent execution capabilities (Agent Runtime).")
    }

    System_Ext(github, "Source Control / CI", "GitHub, GitLab. Holds source code and runs pipelines.")
    System_Ext(llm, "LLM Provider", "Anthropic, OpenAI. Provides the intelligence for AI Agents.")
    System_Ext(observability, "Observability", "Tempo, Prometheus. Stores traces and metrics.")
    System_Ext(workSystems, "Work Management", "Jira, Linear. Holds issue and backlog state.")

    Rel(human, tracker, "Manages and approves SDLC phases via", "HTTPS/Web")
    Rel(human, core, "Validates artifacts locally via", "CLI")
    Rel(agent, core, "Executes tasks and consumes tools via", "SSE / MCP")
    
    Rel(tracker, core, "Requests agent execution and rule evaluation via", "REST / HTTP")
    Rel(core, tracker, "Sends execution evidence and audit logs to", "REST / HTTP")

    Rel(core, llm, "Orchestrates prompts and tool calls with", "API")
    Rel(core, github, "Reads configuration and repositories from", "Git / API")
    Rel(tracker, workSystems, "Synchronizes gaps and issues with", "API")
    Rel(core, observability, "Pushes traces and telemetry to", "OTLP")
```

## 3. Key Interactions

1. **Tracker to Core:** Tracker is a client of Core. It asks Core to validate evidence against OPA rulesets, or asks Core's Agent Runtime to execute a complex task.
2. **Agents to Core:** Agents connect to Core via MCP or SSE streams to receive governed context and tools. They do *not* connect to Tracker directly.
3. **Core to External:** Core connects to LLMs for intelligence, and Git for retrieving the corporate rulesets (the reference corpus).

## 4. Zoom In

Next, we look inside the **Evolith Core** system to see its major containers.
**[Go to Level 2: Containers](./level-2-containers.md)**

---
[Back to Master Architecture](../C4-MASTER-ARCHITECTURE.md)
