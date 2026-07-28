# ADR-0081: Agentic AI Sandbox Isolation Boundary

> **Bilingual Navigation:** [Version en Espanol](./0081-agentic-ai-sandbox-isolation.es.md)

## Status

Accepted

> **Implementation status in this repository: none** (verified 2026-07-28).
> This ADR is a normative standard published *for satellites*; it is Accepted as a decision,
> not as delivered capability. Nothing in Evolith Core implements it, and nothing enforces it.
> `sandbox.mode` appears in `src/` exactly twice, and neither is an implementation of this decision: `core-domain/.../handlers/architecture/agent-rules.ts` **evaluates a satellite's** `agent.config.json`, and `rulesets/topologies/agentic-ai/agentic-ai.rules.json` declares that rule. Evolith's own Agent Runtime does the opposite of what this ADR mandates: `packages/agent-runtime/src/adapters/harness/harness-process.adapter.ts` spawns every capability process with `{ ...process.env }`, so a capability script inherits `AGENT_RUNTIME_CORE_TOKEN`, the tracker token and `EVOLITH_RAG_PG_URL` — ambient credentials this ADR forbids.
> The generated ruleset `rulesets/adr/generated/adr-0081-agentic-ai-sandbox-isolation-boundary.rules.json` carries a single `adr-conformance` rule whose own text says the concrete checks are still "to be wired into the harness", and no evaluator handles that category — `rg "adr-conformance" src/` matches only the generated files themselves. Tracked by GT-607.

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
- [Agentic AI Topology Profile](../../../../../src/rulesets/topologies/agentic-ai/README.md)

## Related Decisions and Standards

- [ADR-0069: AI Agent Context Protocol Integration](./0069-ai-agent-context-protocol-integration.md)
- [ADR-AI-001: Harness Engineering](../../../foundations/common-rules/ai-augmented/06-adrs/adr-ai-001-harness-strategy.md)
- [ADR-AI-005: Human-in-the-Loop Policy](../../../foundations/common-rules/ai-augmented/06-adrs/adr-ai-005-human-in-the-loop-policy.md)

---
[Back to Core ADR Index](./README.md)

> **Agent Signature:** Architect Agent
