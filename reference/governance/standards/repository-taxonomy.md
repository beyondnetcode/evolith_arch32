# Enterprise Taxonomy & Repository Structuring Policy

> **Status:** Accepted | **Version:** 4.1.0 | **Framework:** Docs-as-Code & Spec-driven AI-DD

This document establishes the **official policy** for the structuring, taxonomy, and governance of this architecture reference repository.

---

## 1. Standard Directory Structure (The Blue-Map Layout)

```text
/ (Repository Root)
 README.md # Executive Portal (Vision and initial navigation)
 MASTER_INDEX.md # Role-Based Routing
 .bmad-core/ # Jump to: ENGINE: spec-driven AI-DD method implementation (Agents, Tooling)
 .github/ # CI/CD: Workflows, Actions, Issue/PR Templates
 .harness/ # AI CONTEXT: Base rules, Playbooks, Prompts
 reference/ # REFERENCE CORPUS: Architecture, governance, knowledge, operations, and infrastructure
   getting-started/ # ORIENTATION: Guided entry paths by role and reading purpose
   architecture/ # BLUEPRINTS: ADRs, architecture, C4 models, stack profiles
     adrs/adr-matrix.md # DISCOVERY: Decisions indexed by concern
   governance/ # LAWS: Policies, SDLC, standards, onboarding, documentation rules
     glossary.md # LANGUAGE: Canonical terminology and concept boundaries
   knowledge/ # LEARNING: Demo documentation, research, POCs, examples
     demo/demo-vs-reference.md # BOUNDARY: General guidance versus demo-only choices
   operations/ # RUN: Operations playbooks and observability assets
   infrastructure/ # FOUNDATION: Local platform, gateway, containers, infrastructure assets
 src/ # SOURCE: Executable reference implementation and technical sandbox
```

> [!IMPORTANT]
> **Prohibition of "Junk" Folders:** It is strictly forbidden to create folders with names like `utils`, `misc`, `temp`, `common`, `shared` without context. Every piece of code must belong to a Domain, Infrastructure, or Operations.

## 2. Taxonomy and Naming Conventions

- **Directories and Base Files:** Strict `kebab-case` (e.g. `user-management`).
- **ADRs:** `[4-digit-ID]-[descriptive-title].md` -> `0001-use-postgresql-for-users.md`
- **Layer Naming in Domains:**
 - `app-*`: Deployable application or artifact (e.g. `app-user-api`).
 - `lib-*`: Domain or shared technical library (e.g. `lib-auth-guard`).

## 3. Navigation Strategy (SSoT)

1. **Public Entry:** `README.md` explains the vision and sends readers to the appropriate path.
2. **Role-Based Navigation:** `reference/getting-started/README.md` provides short reading sequences; `MASTER_INDEX.md` remains the exhaustive routing index.
3. **Terminology:** `reference/governance/glossary.md` is canonical for names such as progressive architecture reference, arc32, BMAD-METHOD, standard, ADR, and demo sandbox.
4. **Decision Discovery:** `reference/architecture/adrs/adr-matrix.md` maps architectural concerns to their controlling records.
5. **Docs-as-Code:** Forbidden to repeat standards; always link to the canonical artifact under `reference/`.
6. **Breadcrumbs:** Every deep Markdown document must contain a backlink to `MASTER_INDEX.md` or an owning hub that routes back to it.

## 4. Documentation Layering Policy

Documentation must distinguish reusable architecture from illustrative implementation choices.

| Layer | Purpose | Canonical locations | Authority |
|---|---|---|---|
| Orientation | Help a reader enter and navigate the corpus | `README.md`, `MASTER_INDEX.md`, `reference/getting-started/`, `reference/governance/glossary.md` | Navigational; it links to controlling artifacts |
| Canonical Reference | Define architecture rules, decisions, policies, and technology selection criteria | `reference/architecture/`, `reference/governance/` | Normative or decision-bearing according to document status |
| Applied Example | Demonstrate patterns in a concrete executable context | `reference/knowledge/demo/`, `src/` | Illustrative unless a canonical artifact explicitly adopts it |

Mandatory interpretation rules:

- A technology used by the To-Do demo is not a universal technology mandate.
- Runtime-specific guidance must be identified as a profile, option, or demo implementation unless governed by a selected ADR.
- New demo documentation must link to `reference/knowledge/demo/demo-vs-reference.md` when a reader could reasonably confuse the example with general policy.
- The canonical documentation corpus lives in `reference/`; do not create a parallel root `docs/` hierarchy.

## 5. Domain Separation (DDD)

The code in `src/` is organized by **Business Capability**. Code inside `user-management` cannot directly import internal files from another domain. Inter-domain communication must be resolved via formal contracts (Interfaces, APIs, Events).

## 6. Root Directory Policy

The repository root must remain intentionally small and navigable. Public discovery starts in `README.md` and `MASTER_INDEX.md`; deep architectural, governance, operational, infrastructure, and knowledge artifacts live under `reference/`.

Only these categories are allowed at root:

- Public navigation files (`README.md`, `README.es.md`, `MASTER_INDEX.md`, `MASTER_INDEX.es.md`, `LICENSE`).
- Tooling and platform dot-folders (`.github/`, `.harness/`, `.bmad-core/`, editor and automation configuration).
- `src/` for executable implementation.
- `reference/` for the documentation and architecture corpus.

---
[Back to Reference Hub](../../../README.md)
