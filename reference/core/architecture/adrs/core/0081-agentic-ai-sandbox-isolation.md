# ADR-0081: Agentic AI Sandbox Isolation Boundary

> **Bilingual Navigation:** [Version en Espanol](./0081-agentic-ai-sandbox-isolation.es.md)

## Status

Accepted

## Date

2026-06-20

## Context and Problem

An agent can invoke tools, process untrusted content, and produce commands faster than a human review loop. A declaration that a sandbox exists is not sufficient: satellites need a portable baseline for filesystem, process, network, resource, secret, and cleanup boundaries.

## Objective and Scope

Define the runtime-agnostic minimum isolation boundary for an Agentic AI workload. This ADR governs execution environments and delegated tools; it does not select a container runtime, cloud vendor, or agent framework.

## Options Considered

- **Selected: isolated, least-privilege execution boundary.** Each tool invocation runs with explicit filesystem, process, network, resource, and secret restrictions.
- **Host-process execution.** Rejected because an agent compromise inherits developer or service credentials.
- **Framework-specific sandbox standard.** Rejected because it would make the corporate rule depend on a volatile tool ecosystem.

## Decision and Rationale

Agentic AI tool execution MUST occur in an isolated boundary. The boundary MUST deny network and process access by default, allow only explicit allowlists, mount writable storage only where required, use ephemeral execution state, enforce time and resource limits, and avoid ambient credentials. Secrets are delegated for one capability and one lifetime, never copied into prompts or durable workspace files.

The topology contract records the required posture through `sandbox.mode`, `sandbox.network`, and `sandbox.process`. Runtime profiles may define stricter mechanisms, such as containers, microVMs, or restricted workers.

## Evidence and Evaluation Criteria

The selected option is evaluated by whether it prevents a compromised prompt or tool response from gaining ambient host access, exfiltrating data through unrestricted egress, persisting state after a run, or consuming unbounded resources. It remains valid if a chosen sandbox technology changes.

## Consequences, Risks, and Trade-offs

- **Positive:** Limits blast radius and makes authorization review explicit.
- **Negative:** Some tools require adapters for controlled filesystem, network, or secret access.
- **Trade-off:** Convenience of unrestricted local execution is exchanged for reproducible controls.

## References

- [MCP Security Guidance](../../../foundations/common-rules/ai-augmented/02-mcp-integration/mcp-security.md)
- [Agentic AI Topology Profile](../../topologies/ai/agentic-ai/README.md)

## Related Decisions and Standards

- [ADR-0069: AI Agent Context Protocol Integration](./0069-ai-agent-context-protocol-integration.md)
- [ADR-AI-001: Harness Engineering](../../../foundations/common-rules/ai-augmented/06-adrs/adr-ai-001-harness-strategy.md)
- [ADR-AI-005: Human-in-the-Loop Policy](../../../foundations/common-rules/ai-augmented/06-adrs/adr-ai-005-human-in-the-loop-policy.md)

---
[Back to Core ADR Index](./README.md)

> **Agent Signature:** Architect Agent
