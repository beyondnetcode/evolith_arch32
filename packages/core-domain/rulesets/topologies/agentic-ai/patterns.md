# Agentic AI Patterns and Anti-Patterns

> **Bilingual Navigation:** [Version en Espanol](./patterns.es.md)

## Approved Patterns

| Pattern | Application |
|---|---|
| Explicit context assembly | Build a typed, provenance-bearing context envelope before invoking the agent. |
| Read-first capability rollout | Prove safety and usefulness with read-only tools before introducing mutations. |
| Capability-scoped tool gateway | Route tools through a gateway that checks identity, capability, approval, and sandbox policy. |
| Deterministic action adapter | Keep domain writes in deterministic application adapters behind the tool contract. |
| Correlated append-only evidence | Join request, approval, tool action, and outcome by one correlation identifier. |
| Human or policy approval | Require an independently evaluated approval for each mutative action. |

## Anti-Patterns

| Anti-pattern | Why it is prohibited | Required correction |
|---|---|---|
| Prompt as authorization | Instructions can be manipulated and have no execution authority. | Enforce capability and approval in the tool gateway. |
| Direct domain or database access | It bypasses bounded-context contracts, audit, and least privilege. | Use an owned deterministic application adapter. |
| Shared long-lived agent runtime | State or credentials can leak across executions. | Use ephemeral isolated execution with bounded resources. |
| Retrieved text as policy | Indirect prompt injection can alter behavior. | Treat it as data and validate provenance and schema. |
| Unbounded autonomous retry | It can amplify an unsafe or mutative failure. | Use finite, idempotency-aware retries only for read operations. |
| Hidden tool expansion | A prompt or dependency change silently increases authority. | Declare and validate every tool, capability, and network destination. |

## Boundary Rule

An agent may propose or invoke a governed action, but it never owns business invariants. The bounded context and its deterministic application layer validate the command, enforce its own authorization, and emit its normal audit and domain evidence.

---
[Back to Agentic AI Profile](./README.md)
