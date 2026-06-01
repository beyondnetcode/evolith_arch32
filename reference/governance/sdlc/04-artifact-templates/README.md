# SDLC Artifact Templates

> **Bilingual navigation:** [Versión en Español](./README.es.md)
> **Owner:** Evolith Architecture Board
> **Status:** Active reference
> **Parent:** [Corporate SDLC Governance Center](../README.md)

---

## Purpose

This directory provides the official Evolith format templates for the artifacts required at each SDLC phase. Every template includes:

1. **The canonical blank structure** — copy this as the starting point for every new artifact.
2. **A worked example or usage guidance** — use it to calibrate the expected level of detail.

Templates enforce consistency across all satellite repositories. Satellite teams may extend a template with domain-specific fields but must not remove required sections.

---

## Downloadable Working Materials

| Material | Format | When to use it |
|---|---|---|
| [Evolith Executive SDLC Presentation](../assets/evolith_product_vision_sdlc_executive_v2.pptx) | PPTX | Use during executive briefings, technology leadership alignment, and commercial/product vision sessions. |
| [Evolith SDLC Workshop and Scorecard Workbook](../assets/evolith_sdlc_workshop_scorecard_workbook_bilingual.xlsx) | XLSX | Use during hands-on client workshops to define applicable phases, nominal RACI assignments, artifact readiness, quality gates, risks, decisions, and scorecard follow-up. |

---

## Template Catalog by SDLC Phase

| Phase | Artifact | Objective | Recommended profiles |
|---|---|---|---|
| **Phase 1 — Conception** | [PRD — Product Requirements Document](./prd-template.md) | Captures product scope, personas, OKRs, constraints, and non-goals. Required before any architecture or design work begins. | Product Owner, Executive Sponsor |
| **Phase 2 — Design** | [ADR — Architecture Decision Record](./adr-template.md) | Records a single architectural decision with context, options evaluated, chosen option, and consequences. One ADR per significant decision. | Software Architect, Principal / Staff Engineer |
| **Phase 2 — Design** | [Functional Story — Business Behavior Specification](./functional-story-template.md) | Describes a user-facing capability in business language: actors, flows, business rules, and acceptance criteria. The contract between Product and Engineering. Complements the [Functional Story Writing Standard](../03-documentation/functional-story-writing-standard.md). | Product Owner, Business Analyst |
| **Phase 3 — Construction** | [Technical Story — Engineering Implementation Work Item](./technical-story-template.md) | Breaks a Functional Story into a concrete engineering task with implementation steps, technical acceptance criteria, and a DoD checklist. | Backend Developer, Frontend Developer, Tech Lead |
| **Phase 4 — Validation** | [Test Summary Report — Quality Gate Validation Record](./test-summary-report-template.md) | Aggregates test results and confirms all mandatory quality thresholds are met. Required before the Release Candidate is stamped. | QA / SDET, Tech Lead |
| **Phase 5 — Delivery** | [Release Notes — Production Deployment Record](./release-notes-template.md) | Formal deployment record with features, breaking changes, deployment steps, rollback procedure, and observability checklist. Required before Production Live is declared. | DevOps / SRE, Tech Lead |
| **Cross-phase / Release Governance** | [SDLC Executive Scorecard](./executive-scorecard-template.md) | One-page leadership control panel summarizing phase readiness, artifact evidence, RACI ownership, quality gates, risks, decisions, and go/no-go status. Required for executive-visible, production-impacting, customer-facing, regulated, or multi-team releases. | Technology Director, Executive Sponsor, Delivery Owner, Architecture Board, QA Lead, SRE Lead |

---

## How to Use a Template

1. Copy the blank template section verbatim into your target artifact file.
2. Replace every `[PLACEHOLDER]` with your actual content.
3. Delete placeholder instructions (lines in italics or brackets) before publication.
4. Refer to the worked example or usage guidance in the same file to calibrate the expected depth.
5. If a section is not applicable, write `N/A — [brief reason]` rather than deleting the heading, so reviewers can see the decision was deliberate.

---

## Quality Checklist Before Submitting Any Artifact

All templates must pass this checklist before entering gate review:

- [ ] All required sections are present and populated (no empty headings)
- [ ] Functional sections contain no implementation detail (see [Writing Standard](../03-documentation/functional-story-writing-standard.md))
- [ ] Traceability section links to at least one ADR and one bounded context when applicable
- [ ] Language matches document language (no mixed EN/ES within the same file)
- [ ] Document is stored in version control alongside the relevant code or design artifacts
- [ ] Executive-facing artifacts summarize source evidence with links rather than duplicating uncontrolled evidence

---

## Related Documents

| Document | Role |
|---|---|
| [SDLC–Evolith Artifact Mapping](../sdlc-evolith-artifact-mapping.md) | Which of these templates is Required, Optional, or Conditional at each phase. |
| [Functional Story Writing Standard](../03-documentation/functional-story-writing-standard.md) | Normative rules that the Functional Story template enforces. |
| [Construction-Focused SDLC Framework](../02-engineering/construction-focused-sdlc-framework.md) | Phase definitions, exit gates, and the DoD checklist. |
| [SDLC Quality Gates](../quality-gates.md) | Canonical thresholds used by the scorecard and Test Summary Report. |
| [SDLC Responsibility Matrix](../responsibility-matrix.md) | Role accountability model used by the scorecard. |
| [SDLC Documentation Best Practices](../03-documentation/sdlc-documentation-best-practices.md) | Versioning, review, and documentation-as-code rules. |

---

<div align="center">
  <sub>Evolith — Enterprise Architecture Platform | SDLC Artifact Templates</sub>
</div>
