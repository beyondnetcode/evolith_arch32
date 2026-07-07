> **Bilingual Navigation:** [Ver version en Espanol](./0002-mcp-integration-protocol.es.md)

# ADR-0002: MCP Integration Protocol for Agent Tool Invocation

## Status
Accepted

## Date
2026-06-23

## Context and Problem
The Model Context Protocol (MCP) is the standard interface through which AI agents discover and invoke tools within the Evolith ecosystem. As the number of MCP-registered tools grows across satellite repositories, integration points become fragile: agents may invoke tools without capability verification, tool responses may exceed expected schemas, and cross-agent tool chains may create hidden coupling between otherwise independent bounded contexts.

Without a formal integration protocol, MCP tool registration becomes a free-for-all where any agent can expose or consume any tool, violating the principle of least privilege and making it impossible to reason about the blast radius of tool changes.

The `mcp-smoke.mjs` script currently validates MCP server availability, but does not enforce capability boundaries, response schema compliance, or budget propagation across tool chains. As agent autonomy increases, these gaps become architectural risks.

## Decision
We define the **MCP Integration Protocol** with five mandatory rules for all tool producers and consumers within Evolith.

### 1. Tool Registration Contract
Every MCP tool MUST be registered with:
- A unique tool ID following `{domain}.{capability}.{version}` format
- A JSON Schema for input parameters and output payload
- A declared capability tag (`read-only`, `mutation`, `side-effect`)
- An explicit trust level (`trusted`, `sandboxed`, `untrusted`)

Registration is recorded in the tool registry artifact and validated by `validate-rulesets.mjs`.

### 2. Capability-Based Access Control
Agent-to-tool invocation MUST be governed by a capability matrix. Agents are assigned a set of allowed capability tags at creation time. An agent with `read-only` capability MUST NOT invoke tools tagged `mutation` or `side-effect`. Violations are logged to OpenTelemetry with `access_control.violation` as the event name.

### 3. Response Schema Validation
All MCP tool responses MUST be validated against the registered output schema before being consumed by downstream agents. Invalid responses trigger a circuit breaker and an OpenTelemetry error span. The validation pattern mirrors `review-result.mjs`: fail-closed, schema-versioned, with explicit error codes for malformed payloads.

### 4. Tool Chain Budget Propagation
When Agent A invokes Tool T which triggers Agent B, the original execution budget (tokens, time, depth) MUST be propagated and decremented. Tool chains that exhaust their budget are terminated with `AGENT_LOOP_BREAKER`. Budget propagation uses the `X-Agent-Depth` header defined in ADR-0092.

### 5. Breaking Change Protocol
Modifying an MCP tool's input or output schema constitutes a breaking change. Tool producers MUST:
- Publish the new schema version at least one release cycle before enforcement
- Maintain backward compatibility for one deprecation window
- Notify all registered consumers via the tool registry event bus

## Consequences

### Positive
- **Security**: Capability-based access control prevents privilege escalation through tool chains.
- **Reliability**: Response schema validation catches provider drift before it propagates.
- **Observability**: Budget propagation enables end-to-end cost tracking across agent chains.
- **Evolvability**: Breaking change protocol prevents silent integration failures.

### Negative
- **Registration overhead**: Every new tool requires schema documentation before it can be used.
- **Latency**: Response validation adds a small per-call overhead to every tool invocation.

### Neutral
- **Migration scope**: Existing unregistered tools must be cataloged and registered before this protocol takes effect. The tool registry artifact serves as the migration checklist.

## References
- [ADR-0001: Harness Engineering](./0001-harness-engineering.md)
- [ADR-0004: AGENTS.md Mandatory Artifact](./0004-agents-md-mandatory-artifact.md)
- [ADR-0087: ABAC for Agentic Tool Execution](../core/0087-abac-agentic-tool-execution.md)
- [ADR-0092: Agent Infinite Loop Prevention](../core/0092-agent-infinite-loop-prevention.md)
- [mcp-smoke.mjs](../../../../../.harness/scripts/mcp-smoke.mjs)
- [validate-rulesets.mjs](../../../../../.harness/scripts/validate-rulesets.mjs)

---
[Back to ADR Index](../README.md)

> **Agent Signature:** Architect Agent
