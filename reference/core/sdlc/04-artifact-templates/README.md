# SDLC Artifact Templates

> **Bilingual navigation:** [Versión en Español](./README.es.md)
> **Owner:** Evolith Architecture Board
> **Status:** Active reference
> **Parent:** [Corporate SDLC Governance Center](../README.md)

---

## Purpose

This directory provides the official Evolith format templates for the artifacts required at each SDLC phase.

Each artifact is now organized as a professional three-part documentation unit:

1. **Artifact landing page** — explains purpose, usage rules, and navigation.
2. **Markdown Source** — reusable canonical Markdown that teams copy into product or delivery repositories.
3. **Rendered Example** — completed UMS example showing the expected level of detail.

Templates enforce consistency across all satellite repositories. Satellite teams may extend a template with domain-specific fields but must not remove required sections.

---

## Downloadable Working Materials

> [!IMPORTANT]
> Use these current official materials for executive briefings, SDLC implementation workshops, and Evolith technical adoption sessions.

###  Executive Communication Kit (Presentations)

| Artifact | Format | Purpose |
|---|---|---|
| **[Evolith: Executive Value Proposition](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith_value_proposition_executive.pptx)** | PPTX | Executive briefing on Evolith's strategic value, governance impact, and ROI. |
| **[Evolith: UMS Case Study](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith_ums_practical_case.pptx)** | PPTX | Success story demonstrating the Evolith framework applied to a real-world transformation. |
| **[Evolith: SDLC Technical Deep-Dive](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith_sdlc_technical_deep_dive.pptx)** | PPTX | Engineering operational guide on phases, Quality Gates, and artifacts. |

### ️ Implementation Workbook

| Artifact / Scope | Format | Purpose |
|---|---|---|
| **[Evolith SDLC Implementation Workbook F0](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith_sdlc_implementation_workbook_F0.xlsx)** | XLSX | Consolidated integrated workbook for all SDLC phases: conception, design, construction, validation, deployment, and operations. Includes templates, role registries, cross-traceability matrices, and project orchestration dashboards for facilitated working sessions with customer teams. |

---

## Template Structure

| Directory / File Type | Purpose |
|---|---|
| `*-template.md` | Artifact landing page. Start here to understand when and how to use the artifact. |
| `source/*-template-source.md` | Copy-ready Markdown source for creating a new artifact. |
| `examples/*-example-ums.md` | Rendered UMS example for understanding the expected completed artifact. |
| `*.es.md` | Spanish version following the same structure. |

---

## Template Catalog by SDLC Phase

| Phase | Artifact | Landing Page | Markdown Source | Rendered Example | Recommended profiles |
|---|---|---|---|---|---|
| **Phase 1 — Conception** | Discovery Canvas | [Open](./discovery-canvas-template.md) | Included | Included | PM, Requester |
| **Phase 1 — Conception** | Technical Feasibility Canvas | [Open](./technical-feasibility-template.md) | Included | Included | Architect, Tech Lead |
| **Phase 1 — Conception** | Ballpark Estimation | [Open](./ballpark-estimation-template.md) | Included | Included | Architect, Tech Lead |
| **Phase 1 — Conception** | MoSCoW Prioritization Matrix | [Open](./ballpark-estimation-template.md) | Included | — | PM, Product Owner |
| **Phase 1 — Conception** | Build-versus-Compose Analysis | [Open](./discovery-canvas-template.md) | Included | — | Architect, Tech Lead |
| **Phase 2 — Design** | Evolith User Story | [Open](./evolith-user-story-template.md) | Included | Included | AI Agent, PM |
| **Phase 2 — Design** | Agile Backlog | [Open](./agile-backlog-template.md) | Included | Included | Product Owner |
| **Phase 2 — Design** | CLI Impact Analysis | [Open](./cli-impact-analysis.md) | Included | Included | Platform Architect |
| **Phase 1 — Conception** | PRD — Product Requirements Document | [Open](./prd-template.md) | [Source](./source/prd-template-source.md) | [Example](./examples/prd-example-ums.md) | Product Owner, Executive Sponsor |
| **Phase 2 — Design** | DDD Model (Bounded Context Map) | [Open](./ddd-model-template.md) | Included | N/A | Architect, Tech Lead |
| **Phase 2 — Design** | ADR — Architecture Decision Record | [Open](./adr-template.md) | [Source](./source/adr-template-source.md) | [Example](./examples/adr-example-ums.md) | Software Architect, Principal Engineer |
| **Phase 2 — Design** | Functional Story | [Open](./functional-story-template.md) | [Source](./source/functional-story-template-source.md) | [Example](./examples/functional-story-example-ums.md) | Product Owner, Business Analyst |
| **Phase 3 — Construction** | Technical Story | [Open](./technical-story-template.md) | [Source](./source/technical-story-template-source.md) | [Example](./examples/technical-story-example-ums.md) | Backend Developer, Frontend Developer, Tech Lead |
| **Phase 4 — Validation** | Test Summary Report | [Open](./test-summary-report-template.md) | [Source](./source/test-summary-report-template-source.md) | [Example](./examples/test-summary-report-example-ums.md) | QA / SDET, Tech Lead, Security Engineer |
| **Phase 5 — Delivery** | Release Notes | [Open](./release-notes-template.md) | [Source](./source/release-notes-template-source.md) | [Example](./examples/release-notes-example-ums.md) | DevOps / SRE, Tech Lead |
| **Cross-phase / Release Governance** | SDLC Executive Scorecard | [Open](./executive-scorecard-template.md) | [Source](./source/executive-scorecard-template-source.md) | [Example](./examples/executive-scorecard-example-ums.md) | Director, Tech Lead |

> **Phase 2 Notes:**
> - **DDD Model** — Produces the Bounded Context Map required by Gate F2.
> - **Functional Story** — Authoring format for "Functional Stories" (Gate F2 evidence). Refine Story Seeds from Phase 1.1 KDD here.
>
> **Phase 3 Notes:**
> - **Technical Story** — Each must carry a `functionalStoryRef` linking to a Phase 2 Functional Story. Follows the Construction-Focused SDLC Framework DoD.

---

## How to Use a Template

1. Open the artifact landing page to understand purpose, gate relevance, and usage rules.
2. Open the Markdown Source file when you need to create a new artifact.
3. Copy the source into your product, release, or delivery repository.
4. Replace every `[PLACEHOLDER]` with actual content.
5. Review the rendered UMS example to calibrate expected depth and tone.
6. If a section is not applicable, write `N/A — [brief reason]` rather than deleting the heading, so reviewers can see the decision was deliberate.

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
