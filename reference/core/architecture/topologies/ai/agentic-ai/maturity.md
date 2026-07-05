# Agentic AI Adoption, Operations, and Evolution Guide

> **Bilingual Navigation:** [Version en Espanol](./maturity.es.md)

## Adoption

Adopt only when an agent needs governed context and bounded tool use. Declare `agent.config.json`, validate with `evolith validate --topology agentic-ai`, and begin with read-only capabilities.

## Patterns and Anti-Patterns

Use explicit context assembly, capability-scoped tools, isolated execution, and approval for mutations. Do not embed credentials in prompts, treat retrieved text as authority, or let an agent call a repository or database directly.

## Security and Audit

Apply ADR-0081 sandbox isolation, ADR-0082 trust boundaries, and ADR-0083 capability-scoped authorization with append-only correlated evidence. Context is data until provenance and schema validation establish otherwise.

## Operations and Resilience

Set bounded execution resources, cancellation and timeout behavior, trace every tool call, and retain evidence sufficient to reconstruct a policy decision. Failure of a tool, policy, or approval path fails closed; it never grants a broader capability.

## Evolution

Keep agent orchestration in cross-cutting shells, preserve bounded-context ownership, and extract an agent-facing service only when the normal progressive extraction criteria are met. Reassess the topology whenever tools acquire a new mutative capability or a new trust boundary.

## Validation Checklist

- `agent.config.json` satisfies AAI-R01 through AAI-R07 in Native and OPA.
- The profile has accepted ADRs, bilingual README and this maturity guide.
- CLI, MCP, and Core API expose the manifest through the shared topology control plane.
- Tests include a valid contract and each blocking negative condition.

---
[Back to Agentic AI Profile](./README.md)
