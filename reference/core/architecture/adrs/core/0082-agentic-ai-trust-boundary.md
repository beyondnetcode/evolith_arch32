# ADR-0082: Agentic AI Prompt, Context, and Tool Trust Boundary

> **Bilingual Navigation:** [Version en Espanol](./0082-agentic-ai-trust-boundary.es.md)

## Status

Accepted

## Date

2026-06-20

## Context and Problem

An agent receives instructions from system prompts, user input, retrieved documents, tool output, and repository content. Treating all of them as equally trusted allows indirect prompt injection or a compromised tool response to override policy, reveal data, or trigger unsafe actions.

## Objective and Scope

Define a portable trust model that keeps policy, prompts, context, and tool output distinct. This ADR applies to AI-assisted engineering and product agents; it does not prescribe a particular retrieval system or model provider.

## Options Considered

- **Selected: explicit provenance and trust classification.** Every input is classified before it can influence an action.
- **Prompt-only safeguards.** Rejected because untrusted context can imitate instructions.
- **Trust all authenticated tools.** Rejected because authentication does not prove that a response is correct, current, or safe to execute.

## Decision and Rationale

System policy and approval rules are authoritative and cannot be modified by retrieved context, user text, repository content, or tool output. Prompts are stored separately from implementation roots. Untrusted content is data, not instructions; it MUST be labeled with source and trust level, constrained to the task, and excluded from permission elevation.

Before a tool result can drive a mutative action, the agent MUST validate its schema and provenance, then pass through the authorization boundary defined by ADR-0083. Critical decisions require independent verification or human review.

## Evidence and Evaluation Criteria

The decision is evaluated by whether an attacker can cause untrusted text to alter policy, whether tool outputs are traceable to a source and schema, and whether a retrieved instruction can obtain a capability not explicitly delegated. These controls are independent of model behavior.

## Consequences, Risks, and Trade-offs

- **Positive:** Reduces prompt injection, confused-deputy, and fabricated-tool-result risks.
- **Negative:** Requires input labeling, schema validation, and more explicit context assembly.
- **Trade-off:** The agent receives less ambient context in exchange for a reliable authorization boundary.

## References

- [MCP Security Guidance](../../../sdlc/standards/ai-augmented/02-mcp-integration/mcp-security.md)
- [Tool Design Principles](../../../sdlc/standards/ai-augmented/03-tools-catalog/tool-design-principles.md)

## Related Decisions and Standards

- [ADR-0058: AI-Consumable Architecture Knowledge](./0058-ai-consumable-architecture-knowledge.md)
- [ADR-0069: AI Agent Context Protocol Integration](./0069-ai-agent-context-protocol-integration.md)
- [ADR-0081: Agentic AI Sandbox Isolation Boundary](./0081-agentic-ai-sandbox-isolation.md)

---
[Back to Core ADR Index](./README.md)

> **Agent Signature:** Architect Agent
