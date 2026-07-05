# E2E Traceability Matrix

> **Bilingual Navigation:** [Versión en Español](./e2e-traceability-matrix.es.md)

**Status:** Approved  
**Parent:** [C4 Master Architecture](../C4-MASTER-ARCHITECTURE.md)

## 1. Matrix Overview

This matrix maps high-level product interfaces down to their specific container, component, technological implementation, and communication protocol. It guarantees that every capability in Evolith can be traced end-to-end.

## 2. Interface to Technology Mapping

| High-Level Interface | Target Container | Target Component | Technology | Communication / Contract |
|----------------------|------------------|------------------|------------|--------------------------|
| **Canonical Evaluation Request** | Core API | `EvaluationOrchestrator` -> Kind Evaluators / Validation Pipeline | NestJS, TypeScript, Native Evaluator, OPA/Rego | REST (`POST /api/v1/evaluate`), `EvaluationContext` JSON payload |
| **Specific Gate Evaluation Request** | Core API | `EvaluateGateUseCase` -> `PhaseGateValidatorService` | NestJS, TypeScript, Native/OPA validators | REST (`POST /api/v1/gates/:gateId/evaluate`), JSON payload |
| **Agent Task Execution** | Agent Runtime API / Engine | `AgentRuntimeController` -> `AgentRuntimeService` -> Ports | NestJS, RxJS, TypeScript | Command/Event HTTP (`POST /v1/agent/handle` for one result, `POST /v1/agent/stream` for command plus event stream) |
| **LLM Tool Call** | MCP Server | `EvolithMcpServer` -> `ToolRegistryService` -> `ToolHandler` | NestJS, @modelcontextprotocol/sdk | MCP Protocol (stdio or Streamable HTTP) |
| **Local Artifact Validation** | Smart CLI | `ValidateCommand` / `EvaluateCommand` -> `@evolith/core-domain` | Nest Commander, TypeScript | Local File System I/O |
| **Ruleset Read** | Core API | `ReferenceController` / `CoreReferenceQueryService` | NestJS, cache-manager, Node.js `fs` | REST (`GET /api/v1/rulesets`) |
| **Remote CLI Check** | Smart CLI | `@evolith/sdk` -> REST clients | Node.js Fetch | REST over HTTPS |

## 3. Communication Patterns

- **Synchronous Deterministic (REST):** Used strictly for fast, state-free evaluations (e.g., OPA gate evaluation).
- **Command/Event Runtime (HTTP + optional SSE):** Used for governed multi-step agent execution. Commands are explicit HTTP requests; SSE is only the server-to-client event transport for progress, tool results, violations, and final output.
- **Interactive Tool Access (MCP):** Standardized protocol for external intelligence to discover and execute tools securely over stdio or Streamable HTTP.

For IN/OUT contracts, resilience behavior, and client guidance by interface, see [Core Interface Flows](../views/view-by-interface-flow.md).

---
[Back to Master Architecture](../C4-MASTER-ARCHITECTURE.md)
