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

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Options Considered

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Evidence and Evaluation Criteria

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

---
[Back to ADR Registry](./README.md)
