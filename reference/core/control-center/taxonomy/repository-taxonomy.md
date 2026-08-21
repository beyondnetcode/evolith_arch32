# Repository Taxonomy and Structuring Policy

> **Status:** Accepted | **Version:** 4.2.1 | **Framework:** Docs-as-Code and Spec-driven AI-DD

This document establishes the official taxonomy and authority limits for this architectural reference repository.

## 1. Standard Directory Structure

```text
/ (repository root)
  README.md                     # Public portal and initial navigation
  MASTER_INDEX.md               # Exhaustive routing by role and intent
  action.yml                    # The published GitHub Action (PR gate)
  evolith.yaml                  # This repository's own satellite configuration
  .bmad-core/                   # Optional spec-driven AI-DD method implementation
  .claude-plugin/               # Claude Code plugin manifest
  .github/                      # CI workflows and collaboration templates
  .harness/                     # Document and agent validation rules, and the CI guards
  .husky/                       # Git hooks (root required)
  .mimocode/                    # MiMoCode configuration (root required)
  .obsidian/                    # Optional Obsidian authoring/navigation lens
  .vscode/                      # VS Code configuration (root required)
  docs/                         # Reader-facing guides and published evidence
    guides/                     # Quickstart and task guides
    evidence/                   # Captured runs the front page quotes
  src/                          # All executable workspaces
    rulesets/                   # Machine-readable architecture rules
      topologies/               # Executable topology-specific rulesets
      opa/                      # Rego policies and the compiled bundle
      schema/                   # Phase-gate and artifact schemas
    sdk/                        # CLI and executable access tooling
    packages/                   # Shared workspaces (core-domain, mcp-server,
                                #   agent-runtime, contracts, infra-providers,
                                #   repo-facts, sdk-client, core)
    apps/                       # Application workspaces (core-api, agent-runtime-api)
    tests/                      # Contract and integration tests
  reference/                    # Architectural reference corpus
    core/                       # The Core constitution
      architecture/             # Architectural authority and implementation guide
        adrs/                   # Decision records and decision matrix
        blueprints/             # Baselines, topology, and stack profiles
        topologies/             # Human-readable multi-topology reference corpus
        foundations/            # Agent Runtime and Ports & Adapters documentation
      sdlc/                     # Phases, gates, standards, glossary, and Q&A
      foundations/              # Principles, common rules, and the inheritance model
      control-center/           # Gap tracking, maturity, audits, and taxonomy
      interfaces/               # CLI, MCP and REST how-to hub
    knowledge/                  # Applied evidence, research, and learning
    governance/                 # Upstream proposals and decision log
  product/                      # Product corpus
    products/                   # Evolith CLI, Core API, MCP Services, Tracker
    operations/                 # SRE, infrastructure, and quality gates
    suite/                      # Vision and commercial narrative
    research/                   # Demo references and applied research
    infra/                      # Compose files and deployment assets
```

The repository contains architectural artifacts, not a local product application. Product executable evidence is maintained externally in [UMS](https://github.com/beyondnetcode/ums).

## 2. Naming and Artifact Conventions

- Base directories and files use `kebab-case`.
- ADRs use `[4-digit-id]-[descriptive-title].md`.
- A runtime-specific document must identify the runtime in its owner folder, title, or scope declaration.
- Canonical patterns are implementation artifacts mapped to accepted ADRs and remain conditioned by their runtime scope.
- No directories without scope should be created such as `utils`, `misc`, `temp`, `common` or `shared`.

## 3. Navigation Strategy

1. `README.md` explains the vision and routes common intents.
2. `reference/getting-started/README.md` offers short paths by role; `MASTER_INDEX.md` is the complete navigation map.
3. `reference/core/architecture/README.md` orders the reading of baseline, ADRs, canonical patterns, and UMS evidence.
4. `reference/core/sdlc/glossary/glossary.md` controls terminology, including reference to progressive architecture, Evolith, BMAD-METHOD, UMS applied model, ADR, and canonical pattern.
5. `reference/core/architecture/adrs/adr-matrix.md` relates needs with controlling decisions.
6. Deep documents link to an owner hub or the master index.

## 4. Documentary Authority Layers

| Layer | Purpose | Canonical Locations | Authority |
|---|---|---|---|
| Guidance | Help the reader navigate the corpus | `README.md`, `MASTER_INDEX.md`, `reference/getting-started/` | Navigational |
| Canonical Reference | Define reusable policy, decision criteria, and accepted trade-offs | `reference/core/architecture/blueprints/`, `reference/core/architecture/adrs/`, `reference/core/sdlc/` | Normative or decisional depending on document status |
| Topology Reference Corpus | Define human-readable topology profiles, dimensions, ADR bindings, operating constraints, and adoption guidance for topology families | `reference/core/architecture/topologies/` | Normative when backed by an accepted ADR or standard; draft until ratified |
| Executable Rulesets | Encode architecture policy as machine-readable Native and OPA-governed rules | `rulesets/`, `src/rulesets/topologies/` | Executable governance |
| Runtime-Specific Implementation Guide | Materialize accepted decisions for a declared runtime | `reference/core/architecture/patterns/`, blueprints, and specific ADRs | Reusable only within the declared runtime scope and ADR |
| Applied Product Evidence | Demonstrate adoption and specialization in an enterprise product | `product/research/demo/`, code, and external docs of `beyondnetcode/ums` | Illustrative until promotion to a canonical artifact |

Mandatory interpretation rules:

- A technology selected by UMS does not constitute a universal mandate.
- UMS is the official executable applied reference; this repository does not duplicate its product code or setup commands.
- A UMS learning only becomes reusable authority through an accepted ADR, standard, blueprint, or canonical pattern.
- The canonical documentary corpus lives in `reference/`; a parallel `docs/` hierarchy should not be created at the root.
- Human-authored multi-topology guidance lives in `reference/core/architecture/topologies/`. This path is the canonical corpus for topology profiles and topology-dimension guidance; it is distinct from executable rules, which belong under `rulesets/`.
- Executable multi-topology rules live in `src/rulesets/topologies/`. This path is the canonical location for topology-specific machine-readable rules and must preserve Dual-Engine Parity when a rule has both Native TypeScript and OPA/Rego evaluators.

## 5. Separation Between Product and Upstream

This repository owns the architectural baseline and promotion mechanism. A product repository owns its domain, code, operational constraints, and local decisions. UMS demonstrates that relationship as the official applied model and can contribute candidate decisions to this corpus.

## 6. Repository Root Policy

The root should be kept small and navigable. Permitted categories are:

- Public navigation and legal files: `README.md`, `README.es.md`, `MASTER_INDEX.md`, `MASTER_INDEX.es.md`, `DOCUMENTATION_VERSIONS.md`, `DOCUMENTATION_VERSIONS.es.md`, `AGENTS.md`, `AGENTS.es.md` and `LICENSE`.
- Tooling and platform dot-folders: `.github/`, `.harness/`, `.husky/`, `.vscode/`, `.bmad-core/`, `.mimocode/`, `.claude/`, `.obsidian/`, and editor or automation configuration (`.editorconfig`, `.gitignore`, `.markdownlint.json`).
- **Tool folder convention:** Each AI/IDE/authoring tool gets its own dot-folder at repository root (`.claude/`, `.mimocode/`, `.obsidian/`, `.vscode/`). These cannot be nested inside a parent folder because each tool's runtime expects its configuration at the workspace root. Do NOT create `.setup/` or similar grouping folders — tool contracts require root-level placement.
- `reference/` for the documentary and architectural corpus.
- `src/sdk/` for CLI, MCP, and executable access tooling.
- `rulesets/` for machine-readable governance rules, including `src/rulesets/topologies/` for topology-specific executable rules.

No application `src/` directories are maintained in this repository; executable implementation belongs to UMS or another product repository with explicit scope.

Root-level `/topologies/` is explicitly prohibited. Multi-topology governance does not create a new repository-root content area; it must remain inside the existing authority boundaries established by [ADR-0048](../../architecture/adrs/core/0048-enterprise-taxonomy-reference-layout.md), [ADR-0070](../../architecture/adrs/core/0070-lean-root-repository-taxonomy.md), and [ADR-0079](../../architecture/adrs/core/0079-multi-topology-reference-corpus.md). Any future proposal to create `/topologies/` at the repository root requires a superseding accepted ADR that amends the root taxonomy, updates this standard, updates `src/rulesets/cross-cutting/repository-taxonomy.rules.json`, updates `src/rulesets/opa/taxonomy.rego`, and updates `.harness/scripts/ci/03-validate-root-cleanliness.mjs` in the same change.

---
[Back to Reference Hub](../../../README.md)
