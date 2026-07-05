# Evolutionary Documentation Review Standard

> **Bilingual navigation:** [Versión en Español](./evolutionary-documentation-review-standard.es.md)  
> **Owner:** Evolith Architecture Board  
> **Status:** Active standard  
> **Parent:** [SDLC Documentation Standards](./README.md)

---

## 1. Purpose

Every strong evolutionary change in Evolith must trigger a documentation review before the change is considered complete.

A strong evolutionary change is any change that affects architecture direction, SDLC behavior, artifact structure, ADR governance, runtime standards, repository topology, diagrams, download assets, public navigation, or the UMS reference relationship.

---

## 2. Mandatory Rule

> No major Evolith evolution is complete until its documentation, diagrams, ADR references, menus, indexes, and bilingual equivalents have been reviewed and updated.

This rule applies to English and Spanish documentation.

---

## 3. Review Triggers

A documentation review is mandatory when any of the following changes:

| Trigger | Examples |
|---|---|
| Architecture model | Modular monolith strategy, microservice extraction criteria, bounded context model, topology model. |
| Runtime baseline | .NET version, Node.js version, frontend framework, database engine, observability stack. |
| ADR registry | New ADR, renamed ADR, deprecated ADR, ADR index movement, ADR decision matrix change. |
| SDLC model | Phase model, gates, artifact requirements, scorecard, RACI, workshop workbook, executive deck. |
| Artifact templates | PRD, ADR, Functional Story, Technical Story, Test Summary Report, Release Notes, Scorecard. |
| Visual communication | Mermaid diagrams, executive visuals, capability maps, onboarding flows, architecture communication strategy. |
| Repository navigation | README, master index, navigation hub, menus, links, download center. |
| UMS reference model | Product runtime, bounded contexts, data model, test strategy, implementation evidence, traceability. |
| Downloadable assets | PPT, workbook, scorecard, PDFs, diagrams, or direct-download links. |

---

## 4. Required Review Checklist

| Area | Required action |
|---|---|
| README files | Update affected root, section, and hub README files in both languages. |
| Indexes | Update master indexes, local indexes, artifact catalogs, and navigation hubs. |
| ADRs | Add, update, deprecate, or cross-link ADRs as needed. |
| Diagrams | Refresh Mermaid diagrams and ensure labels match current architecture and runtime versions. |
| Menus / navigation | Confirm all menu entries, visual catalogs, and download centers point to current documents. |
| Bilingual parity | Update `.md` and `.es.md` equivalents together unless a document is intentionally language-specific. |
| Traceability | Confirm cross-links from executive docs to SDLC, ADRs, templates, UMS reference, and indexes. |
| Assets | Confirm downloadable files use current names and direct-download links. |
| Freshness notes | Add or update “Last reviewed” or “Freshness rule” metadata where useful. |

---

## 5. Definition of Done for Evolutionary Changes

An evolutionary change is done only when:

- [ ] The technical or architectural change is implemented or documented.
- [ ] Affected ADRs are updated or intentionally left unchanged with rationale.
- [ ] Affected diagrams are reviewed and updated.
- [ ] Menus, indexes, READMEs, and navigation hubs are updated.
- [ ] Download links, if any, point to current assets.
- [ ] English and Spanish versions are updated together.
- [ ] Old links remain usable through stubs or compatibility pages when paths move.
- [ ] The change can be discovered from the main README or master navigation path.

---

## 6. Recommended Commit Pattern

Use explicit documentation commits for evolutionary updates:

```text
docs(scope): update documentation after evolutionary change
```

Examples:

```text
docs(sdlc): refresh executive materials and download center
docs(visuals): refresh executive one pager after SDLC v3 simplification
docs(navigation): move master index to navigation hub with root stubs
docs(architecture): update ADR and diagram references after runtime baseline change
```

---

## 7. Governance

The Architecture Board owns this rule. Product teams may propose changes, but every accepted evolution must preserve navigability, bilingual parity, and traceability.

---

[Back to Documentation Standards](./README.md)
