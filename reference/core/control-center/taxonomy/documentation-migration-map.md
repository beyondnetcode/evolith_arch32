# Evolith Documentation Migration Map

> **Bilingual navigation:** [Versión en Español](./documentation-migration-map.es.md)

**Status:** Active Migration Plan  
**Owner:** Evolith Architecture Board  
**Scope:** Documentation only — no source-code movement or implementation change

---

## 1. Objective

Migrate mixed documentation into explicit domains without breaking historical links, bilingual navigation, or audit references.

The governing separation is:

```text
Evolith Core
  = universal architecture + SDLC governance + standards + rules + schemas

Evolith Product Suite
  = portfolio vision + strategy + product map + business positioning

Product-Specific Design
  = internal design of Tracker, Evolith CLI, MCP services, and future products

Platform Guidance
  = named vendors, tools, adapters, licenses, and deployment profiles
```

---

## 2. Migration Status Values

| Status | Meaning |
|---|---|
| **Classified** | Target domain is approved; source remains at legacy path |
| **Indexed** | Canonical hub links to the legacy source |
| **Copied** | Canonical file exists and legacy source remains |
| **Redirected** | Legacy file contains a relocation notice to the canonical file |
| **Validated** | Links, anchors, diagrams, and bilingual parity pass validators |
| **Deprecated** | Legacy path is in an approved removal period |
| **Retired** | Legacy path has been removed after validation and deprecation |

---

## 3. Current Migration Matrix

| Legacy Document | Classification | Canonical Target | Current Status |
|---|---|---|---|
| `reference/core/control-center/evolith-product-vision-master.md` | Product Suite Vision | `product/suite/vision/evolith-product-vision-master.md` | Indexed |
| `.../evolith-product-vision-master.es.md` | Product Suite Vision | `product/suite/vision/evolith-product-vision-master.es.md` | Indexed |
| `.../evolith-strategic-validation-and-composition-framework.md` | Product Suite Strategy | `product/suite/strategy/strategic-validation-and-composition-framework.md` | Indexed |
| `.../evolith-strategic-positioning-comparative-landscape.md` | Product Suite Positioning | `product/suite/positioning/strategic-comparative-landscape.md` | Indexed |
| `.../evolith-ai-assisted-validation-workflow.md` | Product Suite Method | `product/suite/methods/ai-assisted-validation-workflow.md` | Indexed |
| `.../evolith-governed-composition-target-design.md` | Mixed; must split | Suite architecture + Core principle + Tracker design | Classified |
| `.../evolith-provider-abstraction-plugin-model.md` | Core Architecture Principle | `reference/core/foundations/principles/provider-abstraction-plugin-model.md` | Indexed |
| `.../sdlc-tracker-technical-interfaces.md` | Product-Specific Design | `product/products/evolith-tracker/interfaces/technical-interfaces.md` | Indexed |
| `reference/core/sdlc/traceability-model.md` | SDLC Governance Standard | `reference/core/sdlc/traceability/evidence-graph-model.md` | Classified |
| `reference/core/foundations/common-rules/communication/visuals/v01-executive-one-pager.md` | Product Suite Communication | `product/suite/communication/executive-one-pager.md` | Indexed |

The same migration state applies to each Spanish counterpart unless explicitly recorded otherwise.

---

## 4. Split Required for Governed Composition Target Design

The current target-design document contains three scopes and must not move as one file.

| Content Section | Canonical Destination |
|---|---|
| Provider neutrality, abstraction, plugin invariants | Core Architecture Principle |
| Product portfolio context and cross-product relationships | Product Suite Architecture |
| Tracker containers, services, domain entities, REST/MCP, and persistence | Evolith Tracker Product Design |
| Phase Gate authority and Evidence Graph semantics | SDLC Governance |
| Langfuse, Claude, Superset, Jira, and named examples | Platform Guidance or informative examples |

The split must remove duplication and establish one authoritative source per concept.

---

## 5. Migration Order

### Wave 1 — Boundaries and Hubs

- [x] Documentation taxonomy created.
- [x] Evolith Core hub created.
- [x] Product Suite hub created.
- [x] Product-specific design hub created.
- [x] Platform/provider hub created.
- [x] Reference Hub updated.

### Wave 2 — Canonical Copies

- [ ] Copy Product Vision Master to Product Suite Vision.
- [ ] Copy strategy, positioning, methods, and communication documents.
- [ ] Copy Provider Abstraction to Core Architecture Principles.
- [ ] Copy Tracker technical design into Tracker product structure.
- [ ] Copy Evidence Graph into SDLC traceability structure.

### Wave 3 — Link and Content Alignment

- [ ] Update all inbound links to canonical locations.
- [ ] Update bilingual counterparts.
- [ ] Repair relative links and anchors after movement.
- [ ] Ensure suite documents do not define universal Core rules.
- [ ] Ensure product documents do not redefine SDLC governance.
- [ ] Ensure named vendors remain under Platform Guidance or examples.

### Wave 4 — Compatibility Redirects

- [ ] Replace legacy files with bilingual relocation notices.
- [ ] Preserve Git history and historical URLs.
- [ ] Add deprecation metadata and planned retirement date.

### Wave 5 — Validation

- [ ] Run documentation validator.
- [ ] Run bilingual parity validator.
- [ ] Validate Mermaid diagrams.
- [ ] Validate anchors and relative links.
- [ ] Review classification metadata.
- [ ] Obtain Architecture Board approval.

---

## 6. Rules During Migration

1. Do not delete an authoritative document before its canonical replacement is validated.
2. Do not maintain two editable authoritative copies.
3. Canonical files become editable; relocation notices become immutable compatibility files.
4. English and Spanish files move together.
5. A move that changes relative links requires a complete link review.
6. ADR identifiers and historical evidence references must remain stable.
7. No source code, ruleset, or schema change is included in this documentation migration.

---

## 7. Approval Gate

Physical document moves require approval of:

- taxonomy and domain boundaries;
- canonical target paths;
- split of mixed-scope documents;
- compatibility and deprecation approach;
- bilingual migration sequence.

---

[Back to Documentation Taxonomy](./documentation-taxonomy.md)
