<div align="center">

# Evolith: Progressive Architecture Reference Base

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

[![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)]()
[![Method](https://img.shields.io/badge/Method-Spec--driven_AI--DD-blueviolet?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-informational?style=for-the-badge)]()
[![CI](https://img.shields.io/github/actions/workflow/status/beyondnetcode/evolith_arch32/docs.yml?style=for-the-badge&label=CI)](https://github.com/beyondnetcode/evolith_arch32/actions)
[![Coverage](https://img.shields.io/badge/Docs-100%25-brightgreen?style=for-the-badge)](./COVERAGE_REPORT.md)

<br/>

<a href="./reference/governance/sdlc/assets/master-view.png" title="Evolith E2E Product Vision — click to enlarge">
  <img src="./reference/governance/sdlc/assets/master-view.png"
       alt="Evolith E2E Product Vision"
       width="780"
       style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);" />
</a>

<sub>↑ Evolith E2E Product Vision · MD3 — <i>click to enlarge</i></sub>

<br/>

**Evolith is the corporate architecture upstream for product repositories.**<br/>
It defines reusable architecture standards, governance rules, ADRs, patterns,<br/>
and operating guidance that satellite products inherit and specialize.

> *Separate conceptually before separating physically.*

</div>

---

## How This Repository Is Organized

Evolith documentation flows from the most general surface to the most specific artifact. Every page belongs to one of three domains — **Evolith Core** (the architecture constitution), **Evolith SDLC** (lifecycle governance), and **Evolith Products** (the suite) — and every domain descends through the same levels:

| Level | Surface | Use it to |
|---|---|---|
| 1. Portal | This README | Choose a domain or a starting path |
| 2. Domain hubs | [Evolith Core](./reference/core/README.md) · [Evolith SDLC](./reference/governance/sdlc/README.md) · [Evolith Products](./reference/product-suite/README.md) | Understand each domain's goal, objectives, and boundaries |
| 3. Area hubs | Architecture, ADRs, Standards, SDLC phases, Product designs | Locate the family of artifacts for one concern |
| 4. Detail documents | ADRs, templates, standards, rulesets, guides | Apply one specific, authoritative artifact |

When you already know which artifact you need, skip the descent and open the [Global Master Index](./reference/navigation/MASTER_INDEX.md).

## Start Here

> **Goal:** orient any reader — executive, architect, engineer, or AI agent — in less than five minutes.
>
> **Objectives:** explain what Evolith is, route each role to its shortest reading path, and expose the full navigation index for direct access.

<details>
<summary><strong>Primary entry points</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [Executive One-Pager](./reference/governance/standards/communication/visuals/v01-executive-one-pager.md) | Five-minute explanation of Evolith, UMS, and the value proposition | Communicate strategic value quickly | Executive summary |
| [Getting Started by Role](./reference/getting-started/README.md) | Recommended reading paths for executives, architects, engineers, QA, SRE, product, and AI contributors | Accelerate onboarding by role | Onboarding guide |
| [Product Vision](./reference/governance/standards/vision/evolith-product-vision-master.md) | Strategic direction, roadmap, and maturity model | Align teams to long-term goals | Vision and strategy |
| [SDLC Governance Center](./reference/governance/sdlc/README.md) | Authoritative lifecycle phases, gates, artifacts, and traceability model | Govern the full development lifecycle | Governance hub |
| [Global Master Index](./reference/navigation/MASTER_INDEX.md) | Complete repository navigation when you already know what artifact you need | Locate any artifact quickly | Navigation index |

</details>

## 1. Evolith Core

> **Goal:** define the provider-neutral architecture constitution that every product and satellite repository inherits.
>
> **Objectives:** centralize architecture directives and blueprints, preserve decision history through ADRs, align teams on standards and governance, and automate compliance with rulesets.
>
> **Domain hub:** [Evolith Core](./reference/core/README.md) — what Core is, what it is not, its domains, and its dependency rule.

<details>
<summary><strong>Architecture and Blueprints</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [Architectural Directives & Hub](./reference/architecture/README.md) | Single entry point to directives, blueprints, base stack and topologies | Guide corporate design | Architecture hub |

</details>

<details>
<summary><strong>Architecture Decisions (ADRs)</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [General ADR Registry](./reference/architecture/adrs/README.md) | Central hub grouping the decision matrix and all ecosystem ADRs | Maintain history and governance | Decisions hub |

</details>

<details>
<summary><strong>Standards and Governance</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [Standards and Governance Center](./reference/governance/standards/README.md) | Main directory for manifestos, taxonomies, technical directives and observability | Align teams to unified policies | Governance hub |
| [Infrastructure & Operations Hub](./reference/operations/README.md) | Consolidated access to deployments, SRE guides and infrastructure | Standardize deployments and operations | Operations hub |

</details>

<details>
<summary><strong>Rulesets and Validation</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [General Rulesets Hub](./rulesets/README.md) | Centralizes all automated architecture rules, schemas and CI validation | Validate automated compliance | Rules hub |

</details>

## 2. Evolith SDLC

> **Goal:** govern the full development lifecycle through five phases with explicit gates and verifiable evidence.
>
> **Objectives:** map every phase to its mandatory and optional artifacts, standardize templates, enforce quality gates and traceability, and validate compliance automatically in CI.
>
> **Domain hub:** [SDLC Governance Center](./reference/governance/sdlc/README.md) — phases, gates, artifacts, roles, and the traceability model.

The five phases below run from conception to operations; each section lists that phase's artifacts with their requirement level.

<details>
<summary><strong>General SDLC References</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [SDLC Artifact Mapping](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.md) | Artifact mapping | Link phases and deliverables | Standards and guidance |

</details>

<details>
<summary><strong>Phase 01 - Conception and Discovery</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) | Requirement |
|---|---|---|---|---|
| [Discovery Canvas](./reference/governance/sdlc/04-artifact-templates/discovery-canvas-template.md) | Discovery canvas | Define vision and feasibility | Documents and templates | **Mandatory** |
| [Business Case ROI](./reference/governance/sdlc/04-artifact-templates/business-case-roi-template.md) | ROI analysis | Justify business value | Documents and templates | Optional |
| [Ballpark Estimation](./reference/governance/sdlc/04-artifact-templates/ballpark-estimation-template.md) | High-level estimation | Project costs and times | Documents and templates | Optional |
| [PRD - Product Requirements Document](./reference/governance/sdlc/04-artifact-templates/prd-template.md) | Product requirements | Specify functional needs | Documents and templates | **Mandatory** |
| [Evolith User Story](./reference/governance/sdlc/04-artifact-templates/evolith-user-story-template.md) | User story template | Standardize agile stories | Documents and templates | **Mandatory** |
| [Agile Backlog](./reference/governance/sdlc/04-artifact-templates/agile-backlog-template.md) | Backlog template | Organize deliverables | Documents and templates | **Mandatory** |
| [CLI Impact Analysis](./reference/governance/sdlc/04-artifact-templates/cli-impact-analysis.md) | CLI impact analysis | Evaluate cross-repo changes | Documents and templates | Optional |
| [Validation Schemas & Rules (Phase 1)](./rulesets/README.md) | Validation schemas for Canvas, PRD, Backlog and Gate rules | Validate compliance in CI | Rules and schemas | **Mandatory** |

</details>

<details>
<summary><strong>Phase 02 - Design and Architecture</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) | Requirement |
|---|---|---|---|---|
| [ADR Template](./reference/governance/sdlc/04-artifact-templates/adr-template.md) | ADR template | Document key decisions | Documents and templates | Optional |
| [Functional Story Template](./reference/governance/sdlc/04-artifact-templates/functional-story-template.md) | Functional story template | Detail behavior | Documents and templates | **Mandatory** |
| [DDD Model Template](./reference/governance/sdlc/04-artifact-templates/ddd-model-template.md) | DDD model template | Model system domains | Documents and templates | Optional |
| [Functional Story Writing Standard](./reference/governance/sdlc/03-documentation/functional-story-writing-standard.md) | Functional story standard | Ensure specs quality | Standards and guidance | **Mandatory** |
| [SDLC Documentation Best Practices](./reference/governance/sdlc/03-documentation/sdlc-documentation-best-practices.md) | Documentation best practices | Improve documentation quality | Standards and guidance | **Mandatory** |
| [Validation Schemas & Rules (Phase 2)](./rulesets/README.md) | Validation schemas for ADRs and Functional Stories | Validate data structure | Rules and schemas | **Mandatory** |

</details>

<details>
<summary><strong>Phase 03 - Construction</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) | Requirement |
|---|---|---|---|---|
| [Artifact Templates Hub](./reference/governance/sdlc/04-artifact-templates/README.md) | Templates hub | Centralize SDLC formats | Documents and templates | **Mandatory** |
| [Technical Story Template](./reference/governance/sdlc/04-artifact-templates/technical-story-template.md) | Technical story template | Structure technical tasks | Documents and templates | **Mandatory** |
| [Construction-Focused SDLC Framework](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.md) | Construction framework and Definition of Done (DoD) | Regulate technical execution | Standards and guidance | **Mandatory** |
| [SDLC Quality Gates](./reference/governance/sdlc/quality-gates.md) | Quality gates | Establish approval thresholds | Standards and guidance | **Mandatory** |
| [Validation Schemas & Rules (Phase 3)](./rulesets/README.md) | Schemas for Technical Stories, DoD rules, Thresholds and Dependency Pinning | Validate compliance in CI | Rules and schemas | **Mandatory** |

</details>

<details>
<summary><strong>Phase 04 - Validation and QA</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) | Requirement |
|---|---|---|---|---|
| [Test Summary Report Template](./reference/governance/sdlc/04-artifact-templates/test-summary-report-template.md) | Test summary report | Consolidate QA results | Documents and templates | **Mandatory** |
| [SDLC Traceability Model](./reference/governance/sdlc/traceability-model.md) | Traceability model | Link requirements and tests | Standards and guidance | **Mandatory** |
| [Validation Schemas & Rules (Phase 4)](./rulesets/README.md) | Test summary report validation schema | Validate compliance in CI | Rules and schemas | **Mandatory** |

</details>

<details>
<summary><strong>Phase 05 - Delivery and Operations</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) | Requirement |
|---|---|---|---|---|
| [Release Notes Template](./reference/governance/sdlc/04-artifact-templates/release-notes-template.md) | Release notes template | Communicate release changes | Documents and templates | **Mandatory** |
| [Validation Schemas & Rules (Phase 5)](./rulesets/README.md) | Release notes validation schema, CI/CD gates rules (ADR-0005) and GitFlow (ADR-0050) | Automate pipeline validation | Rules and schemas | **Mandatory** |

</details>

## 3. Evolith Products

> **Goal:** deliver the Core constitution as working products and prove it through applied references.
>
> **Objectives:** direct the portfolio through the Product Suite, document each product's internal design, demonstrate real adoption through UMS and adoption cases, and tool the workflow with the Smart CLI.
>
> **Domain hubs:** [Product Suite](./reference/product-suite/README.md) (portfolio vision and strategy) · [Product Designs](./reference/products/README.md) (per-product internals)

<details>
<summary><strong>Evolith Product Suite</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [Product Suite Hub](./reference/product-suite/README.md) | Single entry point to portfolio vision, strategy and positioning | Ecosystem direction | Product reference |

</details>

<details>
<summary><strong>Evolith Tracker</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [Evolith Tracker Hub](./reference/products/evolith-tracker/README.md) | Central hub grouping Tracker product architecture and technical interfaces | Governance product | Product reference |

</details>

<details>
<summary><strong>UMS (Applied Reference)</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [UMS Reference Hub](./reference/knowledge/demo/README.md) | Consolidated access to UMS reference models, comparisons and architecture portal | Demonstrate real implementation | Applied reference |

</details>

<details>
<summary><strong>Smart CLI</strong></summary>

### Smart CLI (Official)

```bash
# Initialize new satellite repository
npx @evolith/smart-cli init

# Validate against Evolith standards
smart-cli validate

# Manage ADRs
smart-cli adr create
smart-cli adr list

# MCP server for AI assistants
smart-cli mcp serve
```

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [Smart CLI Hub](./sdk/cli/README.md) | Central access to CLI documentation, architecture, vision and state analysis | Understand the tool | Product reference |

</details>

<details>
<summary><strong>Adoption Cases and Tools</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [Adoption Cases](./reference/knowledge/adoption-cases.md) | Adoption cases | Showcase success and learning | Applied reference |

### Pre-commit Hooks

- [validate-docs.mjs](./.harness/scripts/validate-docs.mjs) - link, anchor, encoding, and Mermaid validation.
- [check-bilingual-parity.mjs](./.harness/scripts/check-bilingual-parity.mjs) - EN/ES structure parity validation.
- [impact-analysis-synchronizer.mjs](./.harness/scripts/impact-analysis-synchronizer.mjs) - cross-repository impact synchronization.

</details>

---

## 4. Navigation and Documentation Map

> **Goal:** make every document findable in two clicks or less, in both languages.
>
> **Objectives:** maintain the master index as the complete navigation surface, audit EN/ES parity, and record documentation releases.

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [Navigation Hub](./reference/navigation/README.md) | Home of all repository-level navigation surfaces | Centralize navigation | Navigation hub |
| [Global Master Index](./reference/navigation/MASTER_INDEX.md) | Complete repository navigation by intent, role, and domain | Locate any artifact quickly | Navigation index |
| [Bilingual Index](./reference/navigation/BILINGUAL_INDEX.md) | Auto-generated EN/ES pairing status for the reference corpus | Audit bilingual coverage | Navigation index |
| [Quick Access by Stack](./reference/quick-access/README.md) | Shortest path to React, .NET, and Node.js standards | Reduce navigation friction | Navigation index |
| [Documentation Taxonomy](./reference/documentation-taxonomy.md) | What kind of document belongs where | Keep the corpus organized | Governance reference |

## Contribution

Before contributing, read:

- [AGENTS.md](./AGENTS.md) — Agent rules and conventions
- [Repository Taxonomy](./reference/governance/standards/repository-taxonomy.md) — What goes where
- [Child Repository Inheritance Guide](./reference/governance/standards/onboarding/child-repository-inheritance-guide.md) — How products inherit

---

## License

Published under the [MIT License](./LICENSE).

---

<div align="center">
  <sub>Evolith - Enterprise Architecture Platform | Progressive Reference Corpus | Spec-driven AI-DD</sub>
</div>
