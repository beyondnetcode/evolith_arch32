# Template Promotion

> **Bilingual Navigation:** [Versión en Español](./template-promotion.es.md)

## Purpose

Assist the governed promotion of a **tenant-scope design template** into the canonical Core corpus (ADR-0104 §9). Prepares the Upstream Proposal (UP-NNN), routes it to the Architecture Board, and — on approval — lands it as a `scope: core` template at tier `community → certified → official`.

## Contract

| Field | Value |
|-------|-------|
| ID | `template-promotion` |
| Owner | `@winston` (Architecture Board decides) |
| Version | `1.0.0` |
| Inputs | A `tenant`-scope `design-template`, its usage evidence, target tier |
| Outputs | An Upstream Proposal (`reference/core/control-center/opportunities/UP-NNN`) + a promotion recommendation |

## Algorithm

1. Validate the template against `design-template.schema.json` and the block-type registry (every `blockKind` is registered).
2. Run the CI certification gate (schema + Native/OPA parity where rules apply + bilingual parity + fixtures) — the bar does not drop because the source is a tenant.
3. Draft an Upstream Proposal (UP-NNN) capturing the template, evidence of reuse, and the requested tier; set `provenance.promotionRequest.status: requested`.
4. Route to the Architecture Board. On approval: set `scope: core`, `governance.tier` accordingly, and register in the canonical catalog; on rejection: keep it tenant-scoped with rationale.
5. **Statelessness:** the Core evaluates and receives the proposal; the tenant template itself is persisted by the Tracker until promoted.

## Usage

Invoked by `@winston` when a tenant requests promotion of a reusable template, or when a `tenant` template shows broad, repeated value. This is how the Core catalog **grows** from real product usage (upstream learning, Vision §4.1).

## References

- [Design Template Schema](../../../../src/rulesets/schema/design-template.schema.json)
- [Upstream Proposals (UP-NNN, e.g. UP-001)](../../control-center/opportunities/UP-001-canonical-gap-tracking-standard.md)
- [ADR-0104](../../architecture/adrs/core/0104-topology-driven-advisory-design-governance.md)
