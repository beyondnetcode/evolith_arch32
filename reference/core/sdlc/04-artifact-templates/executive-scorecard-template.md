# Template: SDLC Executive Scorecard

> **Bilingual navigation:** [Versión en Español](./executive-scorecard-template.es.md)
> **Phase:** Cross-phase / Release Governance
> **Gate relevance:** Design Baseline, Successful Build, RC Stamped, Production Live
> **Parent:** [Artifact Templates](./README.md)

---

## Purpose

The SDLC Executive Scorecard is the one-page leadership control panel for an Evolith-based initiative, product, or release. It summarizes phase readiness, artifact evidence, RACI ownership, quality gates, risks, decisions, and go/no-go status.

---

## Choose Your View

| View | Link | Use when |
|---|---|---|
| **Markdown Source** | [Open reusable Markdown source](./source/executive-scorecard-template-source.md) | You need to copy the canonical Executive Scorecard structure into a product or release workspace. |
| **Rendered Example** | [Open UMS rendered example](./examples/executive-scorecard-example-ums.md) | You want to see how leadership status, risks, gates, and decisions should be presented. |

---

## Authoring Rules

- Use the scorecard for executive-visible, customer-facing, production-impacting, regulated, or multi-team releases.
- Summarize source evidence with links; do not duplicate uncontrolled evidence.
- Overall status should follow the worst critical dimension, not a simple average.
- Production Live cannot be marked Ready if rollback or observability evidence is missing.

---

## Related Documents

| Document | Purpose |
|---|---|
| [Executive View for Technology Directors](../executive-view.md) | Director-level operating model. |
| [Responsibility Matrix](../responsibility-matrix.md) | RACI and gate ownership model. |
| [Quality Gates](../quality-gates.md) | Metrics used by the scorecard. |
