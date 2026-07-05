# Agentic AI Adoption Guide

> **Bilingual Navigation:** [Version en Espanol](./adoption.es.md)

## Entry Criteria

Adopt Agentic AI only when a bounded workflow needs governed reasoning over context and bounded tool use. The owning bounded context remains accountable for the business decision; the agent is an assisting execution component, not an owner of domain policy.

Before enabling an agent, the adopter MUST identify the accountable owner, declare a read-only initial capability set, and record the tools, context sources, and approval authority. The topology composes with a progressive-axis profile; it does not replace that profile's extraction or data-ownership rules.

## Adoption Sequence

1. Create `agent.config.json` with a stable identity, explicit capabilities, isolated sandbox, and `approval-required` mutative policy.
2. Start with read-only tools and representative non-production context.
3. Validate the contract with `evolith validate --topology agentic-ai` using both Native and OPA engines.
4. Exercise denial, timeout, invalid-context, and approval-rejection paths before enabling a capability in a higher environment.
5. Add a mutative tool only after its owner, scoped delegation, approval path, and correlated append-only evidence are reviewed.

## Adoption Checklist

- A bounded-context owner and tool owner are named.
- Context sources have a declared provenance and classification.
- Prompt sources and deterministic implementation roots are separate.
- The sandbox has finite CPU, memory, duration, process, and network authority.
- Mutative tools fail closed when approval or policy evidence is absent.
- Valid and blocking-invalid fixtures cover the intended contract.

## Exit and Non-Adoption

Do not adopt this topology for deterministic work that a normal application service can perform, for workflows without a safe tool boundary, or where evidence and approval cannot be retained. Disable a capability when its required evidence, owner, sandbox control, or approval path is no longer available.

## Related Guidance

Read the [security guide](./security.md), [operations guide](./operations.md), and [evolution guide](./evolution.md) before production adoption. [ADR-0081](../../../adrs/core/0081-agentic-ai-sandbox-isolation.md), [ADR-0082](../../../adrs/core/0082-agentic-ai-trust-boundary.md), and [ADR-0083](../../../adrs/core/0083-agentic-ai-action-authorization-audit.md) are mandatory authority.

---
[Back to Agentic AI Profile](./README.md)
