# SDLC Artifact Templates

> **Bilingual navigation:** [Versión en Español](./README.es.md)
> **Owner:** Evolith Architecture Board
> **Status:** Active reference
> **Parent:** [Corporate SDLC Governance Center](../README.md)

---

## Purpose

This directory provides the official Evolith format templates for the artifacts required at each SDLC phase. Every template includes:

1. **The canonical blank structure** — copy this as the starting point for every new artifact.
2. **A worked example** — filled using the UMS reference product so teams can see the expected level of detail.

Templates enforce consistency across all satellite repositories. Satellite teams may extend a template with domain-specific fields but must not remove required sections.

---

## Template Catalog by SDLC Phase

| Phase | Template | Purpose |
|---|---|---|
| **Phase 1 — Conception** | [PRD Template](./prd-template.md) | Product Requirements Document — defines scope, personas, and OKRs before any design work begins. |
| **Phase 2 — Design** | [ADR Template](./adr-template.md) | Architectural Decision Record — the standard format for every architectural decision. |
| **Phase 2 — Design** | [Functional Story Template](./functional-story-template.md) | The canonical format for functional requirements readable by PO and engineering. Complements the [Functional Story Writing Standard](../03-documentation/functional-story-writing-standard.md). |
| **Phase 3 — Construction** | [Technical Story Template](./technical-story-template.md) | Engineering-facing implementation story derived from a Functional Story. |
| **Phase 4 — Validation** | [Test Summary Report Template](./test-summary-report-template.md) | Formal quality gate document required before the Release Candidate is stamped. |
| **Phase 5 — Delivery** | [Release Notes Template](./release-notes-template.md) | Standard release communication required before Production Live is declared. |

---

## How to Use a Template

1. Copy the blank template section verbatim into your target artifact file.
2. Replace every `[PLACEHOLDER]` with your actual content.
3. Delete placeholder instructions (lines in italics or brackets) before publication.
4. Refer to the worked example section in the same file to calibrate the expected depth.
5. If a section is not applicable, write `N/A — [brief reason]` rather than deleting the heading, so reviewers can see the decision was deliberate.

---

## Quality Checklist Before Submitting Any Artifact

All templates must pass this checklist before entering gate review:

- [ ] All required sections are present and populated (no empty headings)
- [ ] Functional sections contain no implementation detail (see [Writing Standard](../03-documentation/functional-story-writing-standard.md))
- [ ] Traceability section links to at least one ADR and one bounded context
- [ ] Language matches document language (no mixed EN/ES within the same file)
- [ ] Document is stored in version control alongside the relevant code or design artifacts

---

## Related Documents

| Document | Role |
|---|---|
| [SDLC–Evolith Artifact Mapping](../sdlc-evolith-artifact-mapping.md) | Which of these templates is Required vs Optional at each phase. |
| [Functional Story Writing Standard](../03-documentation/functional-story-writing-standard.md) | Normative rules that the Functional Story template enforces. |
| [Construction-Focused SDLC Framework](../02-engineering/construction-focused-sdlc-framework.md) | Phase definitions, exit gates, and the DoD checklist. |
| [SDLC Documentation Best Practices](../03-documentation/sdlc-documentation-best-practices.md) | Versioning, review, and documentation-as-code rules. |

---

<div align="center">
  <sub>Evolith — Enterprise Architecture Platform | SDLC Artifact Templates</sub>
</div>
