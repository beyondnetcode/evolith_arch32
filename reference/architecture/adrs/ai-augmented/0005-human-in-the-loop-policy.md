> **Bilingual Navigation:** [Ver version en Espanol](./0005-human-in-the-loop-policy.es.md)

# ADR-0005: Human-in-the-Loop Policy for Autonomous Agent Operations

## Status
Accepted

## Date
2026-06-23

## Context and Problem
As Evolith's AI agents gain autonomy through MCP tool chains, automated code review, and CI-triggered remediation, the risk of unintended consequences grows. Agents operating without human oversight can: merge code with subtle regressions, escalate API costs beyond budget, modify governance artifacts without approval, or propagate cascading changes across satellite repositories.

The principle of human-in-the-loop (HITL) is not new, but it must be codified as an architectural rule rather than left to individual workflow discretion. Without explicit boundaries, the line between "useful automation" and "dangerous autonomy" becomes unclear.

Current risk vectors include: (1) `13-agentic-code-review.mjs` can propose code changes via LLM without human review of the diff; (2) RAG index sync can upsert embeddings based on stale content; (3) CI-triggered gap closure can modify governance artifacts without explicit approval.

## Decision
We establish a **Human-in-the-Loop Policy** with three tiers of human oversight:

### Tier 1: Notification (Autonomous, Human Informed)
Agents MAY operate autonomously for these actions:
- Running validation scripts and reporting results
- Generating documentation drafts (not committing)
- Classifying changes into impact categories
- Emitting cost telemetry and budget alerts

The agent MUST log the action to OpenTelemetry with a `hitl.tier: 1` attribute.

### Tier 2: Approval Gate (Human Must Confirm)
These actions require explicit human approval before execution:
- Committing code changes to any branch
- Merging pull requests
- Modifying `.rules.json` or `.rego` governance artifacts
- Invoking external service deployments
- Changing CI pipeline configuration

The agent MUST present a structured change summary and wait for a boolean confirmation.

### Tier 3: Escalation (Human Must Intervene)
These conditions trigger immediate escalation and halt all autonomous operations:
- Token budget exhaustion (remaining < 10% of declared budget)
- Circuit breaker activation (`AGENT_LOOP_BREAKER`)
- Validation gate failure in CI pipeline
- Detection of governance artifact drift between Native and OPA engines
- Any action affecting production infrastructure

The agent MUST NOT proceed until a human explicitly resolves the escalation.

### Escalation Routing
Escalation notifications are routed via:
- OpenTelemetry span with `severity: critical`
- GitHub Issue creation (for CI failures)
- Slack/webhook notification (for budget and circuit breaker events)

## Consequences

### Positive
- **Safety**: Tier 3 escalation prevents agents from making irreversible changes without human awareness.
- **Cost control**: Tier 1 telemetry combined with Tier 2 approval gates prevents budget overruns.
- **Governance integrity**: Tier 2 approval for governance artifacts ensures human authorship of architectural decisions.
- **Auditability**: Every agent action is classified by tier, enabling post-hoc compliance review.

### Negative
- **Throughput reduction**: Tier 2 approval gates add latency to development workflows.
- **Alert fatigue**: If Tier 3 escalations are too frequent, humans may become desensitized to critical alerts.
- **Classification ambiguity**: Some edge cases may be difficult to classify into a single tier.

### Neutral
- **Tier assignment disputes**: When an action spans multiple tiers, the highest applicable tier governs. Disputes are resolved by the Architect agent.

## References
- [ADR-0001: Harness Engineering](./0001-harness-engineering.md)
- [ADR-0002: MCP Integration Protocol](./0002-mcp-integration-protocol.md)
- [ADR-0092: Agent Infinite Loop Prevention](../core/0092-agent-infinite-loop-prevention.md)
- [ADR-0083: Agentic AI Action Authorization Audit](../core/0083-agentic-ai-action-authorization-audit.md)
- [ADR-0091: Workload Identity Token Rotation](../core/0091-workload-identity-token-rotation.md)

---
[Back to ADR Index](../README.md)

> **Agent Signature:** Architect Agent
