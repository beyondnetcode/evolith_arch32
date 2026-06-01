# Template: Release Notes

> **Bilingual navigation:** [Versión en Español](./release-notes-template.es.md)
> **Phase:** 5 — Delivery and Operations
> **Exit gate:** Production Live (Monitoring Nominal)
> **Parent:** [Artifact Templates](./README.md)

---

## Purpose

Release Notes are the formal production deployment record. They summarize release scope, deployment steps, rollback plan, observability evidence, and the Production Live decision.

---

## Choose Your View

| View | Link | Use when |
|---|---|---|
| **Markdown Source** | [Open reusable Markdown source](./source/release-notes-template-source.md) | You need to copy the canonical Release Notes structure into a product or delivery repository. |
| **Rendered Example** | [Open UMS rendered example](./examples/release-notes-example-ums.md) | You want to see how release evidence should be presented before Production Live. |

---

## Authoring Rules

- Link Release Notes to the stamped Test Summary Report.
- Include deployment steps, rollback plan, and observability checklist.
- Do not declare Production Live without validated monitoring and rollback readiness.
- Keep the summary readable by Product, Engineering, Operations, and Technology Leadership.

---

## Related Documents

| Document | Purpose |
|---|---|
| [Test Summary Report Template](./test-summary-report-template.md) | Required RC evidence before release. |
| [Traceability Model](../traceability-model.md) | Explains how release evidence connects back to business intent. |
| [Quality Gates](../quality-gates.md) | Defines production-blocking quality controls. |
