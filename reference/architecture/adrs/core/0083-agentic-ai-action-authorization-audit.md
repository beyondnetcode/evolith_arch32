# ADR-0083: Agentic AI Action Authorization and Audit

> **Bilingual Navigation:** [Version en Espanol](./0083-agentic-ai-action-authorization-audit.es.md)

## Status

Accepted

## Date

2026-06-20

## Context and Problem

An agent identity is not enough to authorize an action. It needs a narrowly delegated capability, an approval path for mutations, and durable evidence of what was requested, authorized, executed, and returned. Without this boundary, agents become confused deputies with excessive credentials and unverifiable side effects.

## Objective and Scope

Define authorization and audit requirements for actions performed through an Agentic AI topology. This ADR covers tool calls and delegated credentials; it does not replace domain-level authorization or business workflow ownership.

## Options Considered

- **Selected: capability-scoped delegation with append-only evidence.** Actions are authorized independently of the prompt and recorded as immutable events.
- **Shared service credential for all tools.** Rejected because it cannot express least privilege or attribute an action.
- **Audit logs without approval controls.** Rejected because detection after an irreversible action is insufficient.

## Decision and Rationale

Every agent action MUST carry an attributable agent identity, correlation identifier, requested capability, target scope, policy decision, approval reference when required, outcome, and bounded evidence of inputs and outputs. Mutative tools require `approval-required` before execution. Credentials MUST be scoped to one capability and expire; no prompt, context item, or tool output can grant a new capability.

Action evidence MUST be written to an append-only audit sink compatible with ADR-0016. Domain authorization remains the final enforcement point for state transitions; the agent cannot bypass a `RequirementChecklist`, aggregate invariant, or product authorization policy.

## Evidence and Evaluation Criteria

The decision is evaluated by whether an auditor can reconstruct who requested and approved an action, which policy allowed it, what scope was delegated, and whether the outcome can be correlated to downstream domain events. A test action without approval MUST fail before side effects occur.

## Consequences, Risks, and Trade-offs

- **Positive:** Enables accountability, revocation, forensic analysis, and controlled automation.
- **Negative:** Adds authorization and audit integration to every mutative tool.
- **Trade-off:** Autonomous throughput is limited where irreversible effects require approval.

## References

- [Human-in-the-Loop Pattern](../../../governance/standards/ai-augmented/05-agentic-patterns/human-in-the-loop.md)
- [Agentic AI Topology Profile](../../topologies/ai/agentic-ai/README.md)

## Related Decisions and Standards

- [ADR-0016: Immutable Business Audit Trail](./0016-immutable-business-audit-trail.md)
- [ADR-0069: AI Agent Context Protocol Integration](./0069-ai-agent-context-protocol-integration.md)
- [ADR-0081: Agentic AI Sandbox Isolation Boundary](./0081-agentic-ai-sandbox-isolation.md)
- [ADR-0082: Agentic AI Prompt, Context, and Tool Trust Boundary](./0082-agentic-ai-trust-boundary.md)

---
[Back to Core ADR Index](./README.md)

> **Agent Signature:** Architect Agent
