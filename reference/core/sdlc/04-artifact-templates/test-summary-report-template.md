# Template: Test Summary Report

> **Bilingual navigation:** [Versión en Español](./test-summary-report-template.es.md)
> **Phase:** 4 — Validation and QA
> **Exit gate:** Release Candidate (RC) Stamped
> **Schema:** [`test-summary-report.schema.json`](../../../../src/rulesets/schema/test-summary-report.schema.json)
> **Parent:** [Artifact Templates](./README.md)

---

## Purpose

A Test Summary Report records release validation evidence before a Release Candidate is stamped. It consolidates test execution, quality gate results, open defects, security evidence, and RC decision status.

---

## Choose Your View

| View | Link | Use when |
|---|---|---|
| **Markdown Source** | [Open reusable Markdown source](./source/test-summary-report-template-source.md) | You need to copy the canonical Test Summary Report structure into a product or delivery repository. |
| **Rendered Example** | [Open UMS rendered example](./examples/test-summary-report-example-ums.md) | You want to see how QA evidence should be presented before RC Stamped. |

---

## Authoring Rules

- Include all relevant test layers: unit, integration, E2E, security, and acceptance validation.
- Use the canonical SDLC Quality Gates as the threshold source.
- Link every result to evidence whenever possible.
- RC Stamped cannot pass if mandatory metrics fail or blocking defects remain unresolved.

---

## Related Documents

| Document | Purpose |
|---|---|
| [SDLC Quality Gates](../quality-gates.md) | Canonical threshold baseline. |
| [Traceability Model](../traceability-model.md) | Explains how validation evidence links to release evidence. |
| [Release Notes Template](./release-notes-template.md) | Next artifact after RC is stamped. |
