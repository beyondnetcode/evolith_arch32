# E2E Traceability Matrix

> **Bilingual Navigation:** [Versión en Español](./e2e-traceability-matrix.es.md)

**Status:** Approved  
**Parent:** [C4 Master Architecture](../C4-MASTER-ARCHITECTURE.md)

## 1. Matrix Overview

This matrix maps high-level product interfaces down to their specific container, component, technological implementation, and communication protocol. It guarantees that every capability in Evolith can be traced end-to-end.

## 2. Interface to Technology Mapping

| High-Level Interface | Target Container | Target Component | Technology | Communication / Contract |
|----------------------|------------------|------------------|------------|--------------------------|
| **Gate Evaluation Request** | Core API (BFF) | `GateEvaluationUseCase` -> `OPA Evaluator` | NestJS, WASM, Rego | REST (`POST /v1/gates/evaluate`), JSON Payload |
| **Agent Task Execution** | Agent Runtime Engine | `AgentOrchestrator` -> `IAgentEnginePort` | NestJS, RxJS, TypeScript | SSE (`POST /v1/agent/stream`), Server-Sent Events |
| **LLM Tool Call** | MCP Server | `EvolithMcpServer` -> `ToolHandler` | Node.js, @modelcontextprotocol/sdk | MCP Protocol (Stdio or SSE) |
| **Local Artifact Validation** | Smart CLI | `@evolith/sdk` -> `LocalFileLoader` | Node.js, Commander.js | Local File System I/O |
| **Ruleset Read** | Core API (BFF) | `CacheAdapter` / `WorkspaceResolver` | Redis, Node.js `fs` | REST (`GET /v1/rulesets`) |
| **Remote CLI Check** | Smart CLI | `@evolith/sdk` -> `RestClient` | Node.js, Axios/Fetch | REST over HTTPS |

## 3. Communication Patterns

- **Synchronous Deterministic (REST):** Used strictly for fast, state-free evaluations (e.g., OPA gate evaluation).
- **Asynchronous Streaming (SSE):** Used for non-deterministic, multi-turn AI interactions to ensure the client stays informed of intermediate tool calls without timing out.
- **Bi-Directional Interactive (MCP):** Standardized protocol for external intelligence (like Claude Desktop) to discover and execute tools securely.

---
[Back to Master Architecture](../C4-MASTER-ARCHITECTURE.md)
