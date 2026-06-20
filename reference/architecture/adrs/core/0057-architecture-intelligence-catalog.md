# ADR-0057: Architecture Intelligence Catalog

## Status
Accepted

## Context

Evolith is a progressive architecture reference corpus. As the ecosystem grows, teams need a governed way to capture useful architectural ideas from external sources such as books, talks, videos, repositories, production experience, and UMS lessons.

Without a controlled catalog, external ideas may be copied directly into the standard without context, tradeoff analysis, or validation.

## Decision

Evolith adopts an **Architecture Intelligence Catalog** under:

```text
reference/knowledge/architecture-intelligence/
```

This catalog is used to:

- curate architectural ideas
- analyze tradeoffs
- classify adoption maturity
- document pattern cards
- connect external inspiration with Evolith governance
- prepare selected knowledge for AI-assisted engineering

## Rules

Every Architecture Intelligence artifact must include:

- problem
- context
- recommendation
- tradeoffs
- Evolith position
- adoption level
- AI impact when applicable
- related ADRs or ADR candidates

External ideas are not standards by default. A catalog item becomes normative only when promoted through an accepted ADR, standard, blueprint, or canonical pattern.

## Consequences

### Positive

- Enables controlled architectural learning.
- Preserves Evolith as the source of authority.
- Prevents ungoverned copying of external practices.
- Improves AI-consumable knowledge quality.
- Creates traceability from idea to decision.

### Negative / Risks

- Requires ongoing curation.
- Can become noisy if weak ideas are not filtered.
- Requires link, taxonomy, and ADR-reference validation.

## Related Artifacts

- [Architecture Intelligence](../../../knowledge/architecture-intelligence/README.md)
- [Pattern Card Template](../../../knowledge/architecture-intelligence/patterns/pattern-card-template.md)
- [Architecture Radar](../../../knowledge/architecture-intelligence/tradeoffs/architecture-radar.md)




## Objective and Scope

Historical backfill: Address the architectural tension where evolith is a progressive architecture reference corpus, establishing a standard boundary.

## Options Considered

- **Selected:** Architecture Intelligence Catalog
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

---
[Back to ADR Registry](./README.md)

> **Agent Signature:** Architect Agent
