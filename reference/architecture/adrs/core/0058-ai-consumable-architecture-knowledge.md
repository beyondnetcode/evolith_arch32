# ADR-0058: AI-Consumable Architecture Knowledge

## Status
Accepted

## Date
2026-05-27

## Context

Evolith is intended to guide humans and AI-assisted engineering agents. AI tools such as Claude, Codex, Copilot, Cursor, and Harness Agents require structured, stable, and semantically clear architecture knowledge to operate safely.

If documentation is ambiguous, stale, unstructured, or disconnected from ADRs, AI agents may generate code or recommendations that violate the architecture standard.

## Decision

Evolith will prepare selected architecture knowledge for AI consumption using explicit structure, stable taxonomy, and traceable links to authoritative artifacts.

AI-consumable knowledge may include:

- ADRs
- standards
- blueprints
- canonical patterns
- Architecture Intelligence pattern cards
- Architecture Radar entries
- UMS applied evidence

## Required Structure

AI-consumable documents should include:

- title
- purpose
- scope
- decision or recommendation
- tradeoffs
- validation rules
- related ADRs
- related standards
- links to authoritative sources

## Governance Rules

AI agents must not invent architecture rules.

AI agents must:

- respect repository taxonomy
- distinguish universal standards from product-specific evidence
- reference controlling artifacts
- propose ADRs when reusable authority is needed
- report uncertainty or missing context

## Consequences

### Positive

- Improves AI-assisted development quality.
- Reduces architectural drift.
- Makes standards easier to query and explain.
- Supports private enterprise architecture assistants.

### Negative / Risks

- Requires additional documentation discipline.
- Poor indexing can amplify outdated content.
- Human review remains mandatory for promoted decisions.

## Related Artifacts

- [AI Knowledge Strategy](../../../knowledge/architecture-intelligence/ai/ai-knowledge-strategy.md)
- [AI-Augmented Standards](../../../governance/standards/ai-augmented/README.md)
- [Repository Taxonomy](../../../governance/standards/repository-taxonomy.md)




## Objective and Scope

Historical backfill: Address the architectural tension where evolith is intended to guide humans and AI-assisted engineering agents, establishing a standard boundary.

## Options Considered

- **Selected:** AI-Consumable Architecture Knowledge
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

---
[Back to ADR Registry](./README.md)

> **Agent Signature:** Architect Agent
