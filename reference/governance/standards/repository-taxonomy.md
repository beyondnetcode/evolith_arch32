# Enterprise Taxonomy and Repository Structuring Policy

> **Status:** Accepted | **Version:** 4.2.0 | **Framework:** Docs-as-Code and Spec-driven AI-DD

This document establishes the official taxonomy and authority boundaries for this architecture reference repository.

## 1. Standard Directory Structure

```text
/ (repository root)
 README.md                     # Public portal and initial navigation
 MASTER_INDEX.md               # Exhaustive role and intent routing
 .bmad-core/                   # Optional spec-driven AI-DD method implementation
 .github/                      # CI workflows and collaboration templates
 .harness/                     # Documentation and agent validation rules
 reference/                    # Architecture reference corpus
   getting-started/            # Short reader paths
   architecture/               # Architecture authority and implementation guidance
     README.md                 # Architecture hub and reading order
     blueprints/               # Baselines, topology, and stack profiles
     adrs/                     # Decision records and decision matrix
     canonical-patterns/       # Runtime-specific implementation patterns mapped to ADRs
   governance/                 # Policies, SDLC, terminology, and onboarding
   knowledge/                  # Applied evidence, research, and learning material
     demo/                     # UMS reference boundary and migration record
   operations/                 # Operational guidance and observability assets
   infrastructure/             # Platform and infrastructure reference assets
```

The repository contains architecture artifacts, not a local product application. Executable product evidence is maintained externally in [UMS](https://github.com/beyondnetcode/ums).

## 2. Naming and Artifact Conventions

- Directories and base files use `kebab-case`.
- ADRs use `[4-digit-id]-[descriptive-title].md`.
- A runtime-specific document must identify the runtime in its owning folder, title, or scope statement.
- Canonical patterns are implementation artifacts mapped to accepted ADRs and remain conditioned by their runtime scope.
- Do not create unscoped folders such as `utils`, `misc`, `temp`, `common`, or `shared`.

## 3. Navigation Strategy

1. `README.md` explains the vision and routes common intents.
2. `reference/getting-started/README.md` offers short paths by role; `MASTER_INDEX.md` is the complete navigation map.
3. `reference/architecture/README.md` orders baseline, ADR, canonical-pattern, and UMS evidence reading.
4. `reference/governance/glossary.md` controls terminology including progressive architecture reference, Evolith, BMAD-METHOD, UMS applied reference model, ADR, and canonical pattern.
5. `reference/architecture/adrs/adr-matrix.md` maps concerns to controlling decisions.
6. Deep documents link to an owning hub or the master index.

## 4. Documentation Authority Layers

| Layer | Purpose | Canonical locations | Authority |
|---|---|---|---|
| Orientation | Help readers navigate the corpus | `README.md`, `MASTER_INDEX.md`, `reference/getting-started/` | Navigational |
| Canonical reference | Define reusable policy, decision criteria, and accepted trade-offs | `reference/architecture/blueprints/`, `reference/architecture/adrs/`, `reference/governance/` | Normative or decision-bearing according to document status |
| Runtime implementation guidance | Materialize accepted decisions for a stated runtime | `reference/architecture/canonical-patterns/`, runtime-specific blueprints and ADRs | Reusable only within declared runtime and ADR scope |
| Applied product evidence | Demonstrate adoption and specialization in an enterprise product | `reference/knowledge/demo/`, external `beyondnetcode/ums` source and docs | Illustrative until promoted into a canonical artifact |

Mandatory interpretation rules:

- A technology selected by UMS is not a universal mandate.
- UMS is the official executable applied reference; this repository does not duplicate its product source or setup commands.
- A lesson from UMS becomes reusable authority only through an accepted ADR, standard, blueprint, or canonical pattern.
- The canonical documentation corpus lives in `reference/`; do not create a parallel root `docs/` hierarchy.

## 5. Product and Upstream Separation

This repository owns the architectural baseline and promotion mechanism. A product repository owns its domain scope, code, operational constraints, and local decisions. UMS demonstrates that relationship as the official applied model and may contribute candidate decisions back into this corpus.

## 6. Root Directory Policy

The repository root must remain small and navigable. Allowed root categories are:

- Public navigation and legal files: `README.md`, `README.es.md`, `MASTER_INDEX.md`, `MASTER_INDEX.es.md`, and `LICENSE`.
- Tooling and platform dot-folders: `.github/`, `.harness/`, `.bmad-core/`, and editor or automation configuration.
- `reference/` for the documentation and architecture corpus.

Application `src/` directories are not maintained in this repository; executable implementation belongs to UMS or another explicitly scoped product repository.

---
[Back to Reference Hub](../../../README.md)
