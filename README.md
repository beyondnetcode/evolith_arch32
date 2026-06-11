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

## Start Here

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

## Evolith Core

<details>
<summary><strong>Architecture and Blueprints</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [Architecture Hub](./reference/architecture/README.md) | Architecture hub | Centralize design resources | Architecture baseline |
| [Blueprints](./reference/architecture/README.md) | Blueprints directory | Guide reference architectures | Architecture baseline |
| [Agnostic Baseline](./reference/architecture/blueprints/authoritative-tech-stack-agnostic.md) | Agnostic tech stack | Define baseline technologies | Architecture baseline |
| [Reference Blueprint](./reference/architecture/blueprints/reference-blueprint.md) | Reference blueprint | Guide standard implementation | Architecture baseline |
| [Authoritative Tech Stack](./reference/architecture/blueprints/authoritative-tech-stack.md) | Authoritative tech stack | Regulate technology usage | Architecture baseline |
| [C4 Topology Spec](./reference/architecture/blueprints/c4-topology-spec.md) | C4 topology spec | Standardize architecture diagrams | Architecture baseline |
| [Canonical Patterns](./reference/architecture/canonical-patterns/README.md) | Canonical patterns | Reuse proven solutions | Architecture baseline |
| [Observability Architecture Flow](./reference/architecture/blueprints/observability-architecture-flow.md) | Observability architecture flow | Trace signals propagation | Architecture baseline |
| [Multi-Cloud Deployment Scenarios](./reference/architecture/blueprints/multi-cloud-deployment-scenarios.md) | Multi-cloud scenarios | Define cloud topologies | Architecture baseline |
| [Simplicity Checklist Phase 1](./reference/architecture/blueprints/simplicity-checklist-phase-01.md) | Simplicity checklist | Prevent over-engineering | Architecture baseline |

</details>

<details>
<summary><strong>Architecture Decisions (ADRs)</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [ADR Registry](./reference/architecture/adrs/README.md) | ADRs registry | Maintain decision history | Architecture decisions |
| [ADR Decision Matrix](./reference/architecture/adrs/adr-matrix.md) | ADR decision matrix | Visualize decision impact | Architecture decisions |
| [Core ADRs](./reference/architecture/adrs/core/README.md) | Core ADRs | Core system decisions | Architecture decisions |
| [Node.js ADRs](./reference/architecture/adrs/nodejs/README.md) | Node.js ADRs | Node ecosystem decisions | Architecture decisions |
| [.NET ADRs](./reference/architecture/adrs/dotnet/README.md) | .NET ADRs | .NET ecosystem decisions | Architecture decisions |
| [Android ADRs](./reference/architecture/adrs/android/README.md) | Android ADRs | Mobile ecosystem decisions | Architecture decisions |
| [Testing Pyramid ADR](./reference/architecture/adrs/core/0018-testing-pyramid-quality-gates.md) | Testing pyramid and automated gates | Define layered testing strategy | Architecture decisions |
| [Unit Testing Isolation ADR](./reference/architecture/adrs/core/0052-unit-testing-isolation-strategy.md) | Testing isolation ADR | Regulate mocks usage | Architecture decisions |
| [Integration and E2E Testing ADR](./reference/architecture/adrs/core/0053-integration-e2e-testing-strategy.md) | Integration tests ADR | Establish end-to-end tests | Architecture decisions |

</details>

<details>
<summary><strong>Standards and Governance</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [Governance Standards](./reference/governance/standards/README.md) | Governance standards | Align teams to policies | Governance |
| [Architectural Directives](./reference/governance/standards/vision/architectural-directives.md) | Architectural directives | Align corporate design | Governance |
| [Repository Taxonomy](./reference/governance/standards/repository-taxonomy.md) | Repository taxonomy | Classify repositories | Governance |
| [Engineering Manifesto](./reference/governance/standards/engineering/engineering-manifesto.md) | Engineering manifesto | Establish technical principles | Governance |
| [Maturity Assessment](./reference/governance/standards/vision/maturity-assessment.md) | Maturity assessment | Measure current architecture state | Governance |
| [Gap Tracking Board](./reference/governance/standards/vision/gap-tracking.md) | Gap tracking board | Monitor technical gaps | Governance |
| [Contract Testing Guideline](./reference/governance/standards/engineering/contract-testing-guideline.md) | Contract testing guideline | Ensure API compatibility | Engineering standards |
| [Vendor Risk Assessment](./reference/governance/standards/engineering/vendor-risk-assessment.md) | Vendor risk assessment | Mitigate technological lock-in | Engineering standards |
| [AI-Augmented Standards](./reference/governance/standards/ai-augmented/README.md) | AI-augmented standards | Guide AI-driven development | Engineering standards |
| [Observability Playbook](./reference/governance/standards/engineering/observability-playbook.md) | Observability playbook | Guide telemetry | Engineering standards |
| [Operations Hub](./reference/operations/README.md) | Operations hub | Centralize operational guides | Navigation hub |
| [Infrastructure Hub](./reference/infrastructure/README.md) | Infrastructure hub | Regulate deployments | Navigation hub |
| [Navigation Hub](./reference/navigation/README.md) | Navigation hub | Facilitate documentation access | Navigation hub |
| [Bilingual Index](./reference/navigation/BILINGUAL_INDEX.md) | Bilingual index | Map EN/ES correspondence | Navigation hub |

</details>

<details>
<summary><strong>Rulesets and Validation</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [Rulesets Hub](./rulesets/README.md) | Rulesets hub | Centralize validation rules | Rules and schemas |
| [Architecture Rules](./rulesets/architecture/README.md) | Architecture rules | Validate design | Rules and schemas |
| [ADR Rules](./rulesets/adr/README.md) | ADR rules | Ensure decision format | Rules and schemas |
| [Engineering Manifesto Rules](./rulesets/cross-cutting/engineering-manifesto.rules.json) | Engineering manifesto rules | Verify principles compliance in CI | Rules and schemas |
| [Testing Pyramid Rules](./rulesets/adr/adr-0018-testing-pyramid.rules.json) | Testing pyramid ADR | Define testing strategy | Rules and schemas |

</details>

## SDLC

<details>
<summary><strong>General SDLC References</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [SDLC Artifact Mapping](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.md) | Artifact mapping | Link phases and deliverables | Standards and guidance |

</details>

<details>
<summary><strong>Phase 01 - Conception and Discovery</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [Discovery Canvas](./reference/governance/sdlc/04-artifact-templates/discovery-canvas-template.md) | Discovery canvas | Define vision and feasibility | Documents and templates |
| [Business Case ROI](./reference/governance/sdlc/04-artifact-templates/business-case-roi-template.md) | ROI analysis | Justify business value | Documents and templates |
| [Ballpark Estimation](./reference/governance/sdlc/04-artifact-templates/ballpark-estimation-template.md) | High-level estimation | Project costs and times | Documents and templates |
| [PRD - Product Requirements Document](./reference/governance/sdlc/04-artifact-templates/prd-template.md) | Product requirements | Specify functional needs | Documents and templates |
| [Evolith User Story](./reference/governance/sdlc/04-artifact-templates/evolith-user-story-template.md) | User story template | Standardize agile stories | Documents and templates |
| [Agile Backlog](./reference/governance/sdlc/04-artifact-templates/agile-backlog-template.md) | Backlog template | Organize deliverables | Documents and templates |
| [CLI Impact Analysis](./reference/governance/sdlc/04-artifact-templates/cli-impact-analysis.md) | CLI impact analysis | Evaluate cross-repo changes | Documents and templates |
| [Discovery Canvas Schema](./rulesets/schema/discovery-canvas.schema.json) | Discovery canvas validation schema | Validate artifact structure | Rules and schemas |
| [Business Case ROI Schema](./rulesets/schema/business-case-roi.schema.json) | Business case validation schema | Validate artifact structure | Rules and schemas |
| [Ballpark Estimation Schema](./rulesets/schema/ballpark-estimation.schema.json) | Estimation validation schema | Validate artifact structure | Rules and schemas |
| [PRD Schema](./rulesets/schema/prd.schema.json) | PRD validation schema | Validate artifact structure | Rules and schemas |
| [Evolith User Story Schema](./rulesets/schema/evolith-user-story.schema.json) | User story validation schema | Validate artifact structure | Rules and schemas |
| [Agile Backlog Schema](./rulesets/schema/agile-backlog.schema.json) | Backlog validation schema | Validate artifact structure | Rules and schemas |
| [CLI Impact Analysis Schema](./rulesets/schema/cli-impact-analysis.schema.json) | Impact analysis validation schema | Validate artifact structure | Rules and schemas |
| [Phase Gates Rules](./rulesets/sdlc/phase-gates.rules.json) | Automated gate rules | Validate compliance in CI | Rules and schemas |

</details>

<details>
<summary><strong>Phase 02 - Design and Architecture</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [ADR Template](./reference/governance/sdlc/04-artifact-templates/adr-template.md) | ADR template | Document key decisions | Documents and templates |
| [Functional Story Template](./reference/governance/sdlc/04-artifact-templates/functional-story-template.md) | Functional story template | Detail behavior | Documents and templates |
| [DDD Model Template](./reference/governance/sdlc/04-artifact-templates/ddd-model-template.md) | DDD model template | Model system domains | Documents and templates |
| [Functional Story Writing Standard](./reference/governance/sdlc/03-documentation/functional-story-writing-standard.md) | Functional story standard | Ensure specs quality | Standards and guidance |
| [SDLC Documentation Best Practices](./reference/governance/sdlc/03-documentation/sdlc-documentation-best-practices.md) | Documentation best practices | Improve documentation quality | Standards and guidance |
| [ADR Schema](./rulesets/schema/adr.schema.json) | JSON validation schema | Validate data structure | Rules and schemas |
| [Functional Story Schema](./rulesets/schema/functional-story.schema.json) | JSON validation schema | Validate data structure | Rules and schemas |

</details>

<details>
<summary><strong>Phase 03 - Construction</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [Artifact Templates Hub](./reference/governance/sdlc/04-artifact-templates/README.md) | Templates hub | Centralize SDLC formats | Documents and templates |
| [Technical Story Template](./reference/governance/sdlc/04-artifact-templates/technical-story-template.md) | Technical story template | Structure technical tasks | Documents and templates |
| [Construction-Focused SDLC Framework](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.md) | Construction framework | Regulate technical execution | Standards and guidance |
| [Definition of Done](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.md) | Completeness criteria (DoD) | Define when a deliverable is done | Standards and guidance |
| [SDLC Quality Gates](./reference/governance/sdlc/quality-gates.md) | Quality gates | Establish approval thresholds | Standards and guidance |
| [Technical Story Schema](./rulesets/schema/technical-story.schema.json) | JSON validation schema | Validate data structure | Rules and schemas |
| [Definition of Done Rules](./rulesets/cross-cutting/definition-of-done.rules.json) | Automated rules | Validate compliance in CI | Rules and schemas |
| [Quality Thresholds Rules](./rulesets/sdlc/quality-thresholds.rules.json) | Automated rules | Validate compliance in CI | Rules and schemas |
| [Dependency Pinning Rules](./rulesets/sdlc/dependency-pinning.rules.json) | Automated rules | Validate compliance in CI | Rules and schemas |

</details>

<details>
<summary><strong>Phase 04 - Validation and QA</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [Test Summary Report Template](./reference/governance/sdlc/04-artifact-templates/test-summary-report-template.md) | Test summary report | Consolidate QA results | Documents and templates |
| [SDLC Traceability Model](./reference/governance/sdlc/traceability-model.md) | Traceability model | Link requirements and tests | Standards and guidance |
| [Test Summary Report Schema](./rulesets/schema/test-summary-report.schema.json) | Test summary report validation schema | Validate artifact structure | Rules and schemas |

</details>

<details>
<summary><strong>Phase 05 - Delivery and Operations</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [Release Notes Template](./reference/governance/sdlc/04-artifact-templates/release-notes-template.md) | Release notes template | Communicate release changes | Documents and templates |
| [Release Notes Schema](./rulesets/schema/release-notes.schema.json) | Release notes validation schema | Validate artifact structure | Rules and schemas |
| [CI/CD Quality Gates Rules](./rulesets/adr/adr-0005-cicd-quality-gates.rules.json) | CI/CD gates rules (ADR-0005) | Automate pipeline validation | Rules and schemas |
| [GitFlow Branching Rules](./rulesets/adr/adr-0050-gitflow-branching.rules.json) | Branching strategy ADR | Establish Git flow | Rules and schemas |

</details>

## Products

<details>
<summary><strong>Evolith Product Suite</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [Product Suite Hub](./reference/product-suite/README.md) | Product portfolio | Strategy and positioning | Product reference |
| [Suite Vision](./reference/product-suite/vision/README.md) | Evolith Suite vision | Ecosystem direction | Product vision |
| [Suite Strategy](./reference/product-suite/strategy/README.md) | Strategy and execution | Roadmap | Strategy |

</details>

<details>
<summary><strong>Evolith Tracker</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [Evolith Tracker Hub](./reference/products/evolith-tracker/README.md) | Evolith Tracker hub | Governance product | Product reference |
| [Tracker Architecture](./reference/products/evolith-tracker/architecture/README.md) | Product architecture | Technical design | Product architecture |

</details>

<details>
<summary><strong>UMS (Applied Reference)</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [UMS Reference Hub](./reference/knowledge/demo/README.md) | UMS reference hub | Demonstrate real implementation | Applied reference |
| [UMS Reference Model](./reference/knowledge/demo/ums-reference-model.md) | UMS reference model | Guide satellite product development | Applied reference |
| [Canonical Reference vs UMS Applied Model](./reference/knowledge/demo/demo-vs-reference.md) | Canonical vs UMS | Compare theory and application | Applied reference |
| [UMS Architecture Portal](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) | UMS architecture portal | Document UMS specifically | Applied reference |

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

- [CLI Documentation](./sdk/cli/README.md)
- [CLI Architecture](./sdk/cli/ARCHITECTURE.md)
- [CLI Product Vision](./sdk/cli/docs/VISION.md)
- [Gap Analysis](./sdk/cli/docs/planning/sdk-cli-mcp-current-state-assessment.md)

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
