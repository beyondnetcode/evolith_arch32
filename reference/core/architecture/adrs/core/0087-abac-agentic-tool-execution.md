> **Bilingual Navigation:** [Ver versión en Español](./0087-abac-agentic-tool-execution.es.md)

# ADR-0087: Attribute-Based Access Control (ABAC) for Agentic Tool Execution

## Status
Accepted

## Date
2026-06-20

## Context and Problem
ADR-0082 (Trust Boundary) and ADR-0083 (Action Authorization and Audit) established that agents require narrowly delegated capabilities. However, these ADRs define a static perimeter — the sandbox constraints do not vary based on the identity or attributes of the human user who initiated the agent session.

This creates a **confused deputy problem**: an agent invoked by a read-only `viewer` role could, in principle, attempt the same MCP tool calls as one invoked by an `architect` role, because the authorization check happens only at the sandbox level, not at the request level.

## Decision
We mandate **Attribute-Based Access Control (ABAC)** for all MCP tool executions within the Agentic AI Topology. Authorization decisions MUST be evaluated at the moment of tool invocation using the following four dimensions:

### ABAC Decision Model

| Dimension | Description | Example |
|---|---|---|
| **Subject** | The human user's JWT claims (roles, tenant, context) | `roles: ["developer"]`, `tenant: "acme"` |
| **Action** | The specific MCP tool being requested | `evolith-write-file`, `evolith-deploy` |
| **Resource** | The bounded context / domain the tool operates within | `billing`, `identity`, `governance` |
| **Environment** | The active runtime topology | `development`, `staging`, `production` |

### Required OPA Input Schema
All policy evaluations for MCP tool calls MUST receive the following input structure:

```json
{
  "user": {
    "id": "string",
    "roles": ["string"],
    "tenant": "string"
  },
  "tool_name": "string",
  "resource_domain": "string",
  "environment": "string"
}
```

### Dual-Engine Parity Requirement
Per ADR-0041, authorization logic MUST be implemented in **both**:
1. A native TypeScript evaluator (for inline sandbox enforcement)
2. A corresponding OPA `.rego` policy (for external policy-as-code governance)

The reference policy is located at [`rulesets/opa/abac-mcp-tool-access.rego`](../../../../../src/rulesets/opa/abac-mcp-tool-access.rego).

## Consequences

### Positive
- Agents operating on behalf of a `viewer` are strictly limited to read-only tools, regardless of what the agent's underlying system prompt requests.
- Policy changes (e.g., restricting `evolith-deploy` to `production`) are applied centrally in OPA without code changes.
- Authorization decisions are auditable — every tool call decision can be reconstructed from OPA evaluation logs.

### Negative
- Every MCP tool handler must be extended to extract and forward the user context to the OPA evaluator.
- JWT validation must be performed upstream (at the BFF/API Gateway) before the agent session is initiated.

## References
- [ADR-0041: Dual-Engine Policy Evaluation](./0041-dual-engine-policy-evaluation.md)
- [ADR-0081: Agentic AI Sandbox Isolation](./0081-agentic-ai-sandbox-isolation.md)
- [ADR-0082: Agentic AI Trust Boundary](./0082-agentic-ai-trust-boundary.md)
- [ADR-0083: Agentic AI Action Authorization and Audit](./0083-agentic-ai-action-authorization-audit.md)
- [ADR-0086: Agentic AI Telemetry & Cost Control](./0086-agentic-ai-telemetry-cost-control.md)
- [Reference ABAC Policy](../../../../../src/rulesets/opa/abac-mcp-tool-access.rego)

---
[Back to Core ADR Index](./README.md)

> **Agent Signature:** Architect Agent
