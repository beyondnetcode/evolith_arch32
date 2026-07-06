# Template: Product Requirements Document (PRD)

> **Bilingual navigation:** [Versión en Español](./prd-template.es.md)
> **Phase:** 1 — Conception and Discovery
> **Exit gate:** Business Sign-Off (Scope Frozen)
> **Parent:** [Artifact Templates](./README.md)

---

## Purpose

A PRD defines what the product must achieve and for whom before design or architecture starts. It is the business contract that anchors downstream Functional Stories, ADRs, Technical Stories, validation, and release evidence.

**Standard format:** 13 sections with an exclusively functional and business focus. Technical decisions live in ADRs and architecture artifacts.

---

## Choose Your View

| View | Link | Use when |
|---|---|---|
| **Markdown Source** | [Open reusable Markdown source](./source/prd-template-source.md) | You need to copy the canonical PRD structure into a product or delivery repository. |
| **Rendered Example** | [Open UMS rendered example](./examples/prd-example-ums.md) | You want to understand the expected completed format and level of detail. |

---

## PRD Structure (13 Sections)

| # | Section | Purpose |
|---|---------|---------|
| 1 | **Metadata** | ID, product, version, status, author, approver |
| 2 | **Executive Summary** | Problem, solution, MVP scope, benefits, phases |
| 3 | **Context and Problem** | Current context, identified problem, estimated impact, strategic vision |
| 4 | **Objectives and Metrics** | Objectives table with initial value, target, and timeline |
| 5 | **Scope** | In scope, out of scope, functional scope |
| 6 | **Actors and Use Cases** | Actor descriptions, use cases by actor, interaction matrix |
| 7 | **Detailed Functionalities** | F-01..F-XX table with description |
| 8 | **Business Rules** | RN-01..RN-XX with MoSCoW prioritization (M/S/C) |
| 9 | **Constraints and Assumptions** | Constraints and assumptions with risks |
| 10 | **Business Risks** | Probability, impact, mitigation |
| 11 | **PRD Acceptance Criteria** | Approval checklist (Content/Product/Project) |
| 12 | **Glossary** | Domain terms |
| 13 | **Change History** | Versions with date, author, and changes |

---

## Authoring Rules

- Use the source file as the starting point for every new PRD.
- Keep the PRD business-readable; do not design architecture inside it.
- The PRD is **functional only** — technical decisions live in ADRs and architecture artifacts.
- Use MoSCoW prioritization (Must/Should/Could) for all business rules.
- Include `{X}` placeholders for business values not yet quantified.
- Include PRD acceptance criteria (section 11) with approval checklist.
- Include domain glossary (section 12) for semantic consistency.
- Link every downstream Functional Story back to the PRD.
- Business Sign-Off cannot pass without an approved PRD.

---

## Related Documents

| Document | Purpose |
|---|---|
| [SDLC Artifact Mapping](../sdlc-evolith-artifact-mapping.md) | Defines when the PRD is required. |
| [Traceability Model](../traceability-model.md) | Explains how the PRD links to downstream evidence. |
| [Functional Story Template](./functional-story-template.md) | Next artifact created from the PRD scope. |
