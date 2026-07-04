# Design Template Proposal

> **Bilingual Navigation:** [Versión en Español](./design-template-proposal.es.md)

## Purpose

Proactively propose reusable **design templates** — compositions of blocks that guide a design — at three complexity tiers (**simple / medium / complex**) for a given need. Feeds the tenant's design intelligence (ADR-0104 §9); the tenant picks and adapts.

## Contract

| Field | Value |
|-------|-------|
| ID | `design-template-proposal` |
| Owner | `@architect` (Winston reviews) |
| Version | `1.0.0` |
| Inputs | Initiative context, confirmed/recommended topology composition, block-type registry, tenant private collection (if provided) |
| Outputs | Up to three `design-template` proposals (simple/medium/complex) conforming to `design-template.schema.json` |

## Algorithm

1. Resolve the recommended/confirmed topology composition (via the topology recommender, GT-430).
2. Derive the expected blocks (union of the composition's `designProfile`s + universal blocks).
3. Produce three templates for the same need:
   - **simple** — the minimal viable composition (universal blocks + the smallest topology-derived set);
   - **medium** — adds the conditional blocks the composition recommends;
   - **complex** — full coverage incl. resiliency/observability/performance depth.
4. Prefer canonical (`core`) blocks; only introduce `tenant` blocks when no canonical block fits.
5. Emit each as a `scope: core` (catalog) or `scope: tenant` proposal with `provenance.proposedBy: agent`.

## Usage

Invoked by `@architect`/`@winston` during Design advisory (D-002). The proposals are **non-binding** suggestions; the tenant composes the actual blueprint. Reusable tenant templates can be promoted upstream via the [`template-promotion`](./template-promotion.md) skill.

## References

- [Design Template Schema](../../../../src/rulesets/schema/design-template.schema.json)
- [Design Block Registry](../../../../src/rulesets/schema/design-block-registry.json)
- [ADR-0104](../../architecture/adrs/core/0104-topology-driven-advisory-design-governance.md)
