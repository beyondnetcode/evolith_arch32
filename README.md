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

- [Executive One-Pager](./reference/governance/standards/communication/visuals/v01-executive-one-pager.md) - five-minute explanation of Evolith, UMS, and the value proposition.
- [Getting Started by Role](./reference/getting-started/README.md) - recommended reading paths for executives, architects, engineers, QA, SRE, product, and AI contributors.
- [Product Vision](./reference/governance/standards/vision/evolith-product-vision-master.md) - strategic direction, roadmap, and maturity model.
- [SDLC Governance Center](./reference/governance/sdlc/README.md) - authoritative lifecycle phases, gates, artifacts, and traceability model.
- [Global Master Index](./reference/navigation/MASTER_INDEX.md) - complete repository navigation when you already know what artifact you need.

</details>

## SDLC Navigation

Open the phase you are working in. Each section groups the documents, standards, and machine-readable rules that support its gate.

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
| [Architectural Directives](./reference/governance/standards/vision/architectural-directives.md) | Architectural directives | Align corporate design | Standards and guidance |
| [Repository Taxonomy](./reference/governance/standards/repository-taxonomy.md) | Repository taxonomy | Classify repositories | Standards and guidance |
| [Agnostic Baseline](./reference/architecture/blueprints/authoritative-tech-stack-agnostic.md) | Agnostic tech stack | Define baseline technologies | Standards and guidance |
| [Engineering Manifesto](./reference/governance/standards/engineering/engineering-manifesto.md) | Engineering manifesto | Establish technical principles | Standards and guidance |
| [SDLC Artifact Mapping](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.md) | Artifact mapping | Link phases and deliverables | Standards and guidance |
| [Discovery Canvas Schema](./rulesets/schema/discovery-canvas.schema.json) | Discovery canvas | Define vision and feasibility | Rules and schemas |
| [Business Case ROI Schema](./rulesets/schema/business-case-roi.schema.json) | ROI analysis | Justify business value | Rules and schemas |
| [Ballpark Estimation Schema](./rulesets/schema/ballpark-estimation.schema.json) | High-level estimation | Project costs and times | Rules and schemas |
| [PRD Schema](./rulesets/schema/prd.schema.json) | Product requirements | Specify functional needs | Rules and schemas |
| [Evolith User Story Schema](./rulesets/schema/evolith-user-story.schema.json) | User story template | Standardize agile stories | Rules and schemas |
| [Agile Backlog Schema](./rulesets/schema/agile-backlog.schema.json) | Backlog template | Organize deliverables | Rules and schemas |
| [CLI Impact Analysis Schema](./rulesets/schema/cli-impact-analysis.schema.json) | CLI impact analysis | Evaluate cross-repo changes | Rules and schemas |
| [Phase Gates Rules](./rulesets/sdlc/phase-gates.rules.json) | Automated rules | Validate compliance in CI | Rules and schemas |

</details>

<details>
<summary><strong>Phase 02 - Design and Architecture</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [ADR Template](./reference/governance/sdlc/04-artifact-templates/adr-template.md) | ADR template | Document key decisions | Documents and templates |
| [Functional Story Template](./reference/governance/sdlc/04-artifact-templates/functional-story-template.md) | Functional story template | Detail behavior | Documents and templates |
| [DDD Model Template](./reference/governance/sdlc/04-artifact-templates/ddd-model-template.md) | DDD model template | Model system domains | Documents and templates |
| [Architecture Hub](./reference/architecture/README.md) | Architecture hub | Centralize design resources | Standards and guidance |
| [Reference Blueprint](./reference/architecture/blueprints/reference-blueprint.md) | Reference blueprint | Guide standard implementation | Standards and guidance |
| [Authoritative Tech Stack](./reference/architecture/blueprints/authoritative-tech-stack.md) | Authoritative tech stack | Regulate technology usage | Standards and guidance |
| [ADR Registry](./reference/architecture/adrs/README.md) | ADRs registry | Maintain decision history | Standards and guidance |
| [ADR Decision Matrix](./reference/architecture/adrs/adr-matrix.md) | ADR decision matrix | Visualize decision impact | Standards and guidance |
| [Functional Story Writing Standard](./reference/governance/sdlc/03-documentation/functional-story-writing-standard.md) | Functional story standard | Ensure specs quality | Standards and guidance |
| [SDLC Documentation Best Practices](./reference/governance/sdlc/03-documentation/sdlc-documentation-best-practices.md) | Documentation best practices | Improve documentation quality | Standards and guidance |
| [Simplicity Checklist Phase 1](./reference/architecture/blueprints/simplicity-checklist-phase-01.md) | Simplicity checklist | Prevent over-engineering | Standards and guidance |
| [SDLC Artifact Mapping](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.md) | Artifact mapping | Link phases and deliverables | Standards and guidance |
| [ADR Schema](./rulesets/schema/adr.schema.json) | JSON validation schema | Validate data structure | Rules and schemas |
| [Functional Story Schema](./rulesets/schema/functional-story.schema.json) | JSON validation schema | Validate data structure | Rules and schemas |
| [Architecture Rules](./rulesets/architecture/README.md) | Architecture rules | Validate design | Rules and schemas |
| [ADR Rules](./rulesets/adr/README.md) | ADR rules | Ensure decision format | Rules and schemas |

</details>

<details>
<summary><strong>Phase 03 - Construction</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [Technical Story Template](./reference/governance/sdlc/04-artifact-templates/technical-story-template.md) | Technical story template | Structure technical tasks | Documents and templates |
| [Artifact Templates Hub](./reference/governance/sdlc/04-artifact-templates/README.md) | Templates hub | Centralize SDLC formats | Documents and templates |
| [Construction-Focused SDLC Framework](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.md) | Construction framework | Regulate technical execution | Standards and guidance |
| [Definition of Done](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.md) | Construction framework | Regulate technical execution | Standards and guidance |
| [SDLC Quality Gates](./reference/governance/sdlc/quality-gates.md) | Quality gates | Establish approval thresholds | Standards and guidance |
| [Canonical Patterns](./reference/architecture/canonical-patterns/README.md) | Canonical patterns | Reuse proven solutions | Standards and guidance |
| [Contract Testing Guideline](./reference/governance/standards/engineering/contract-testing-guideline.md) | Contract testing guideline | Ensure API compatibility | Standards and guidance |
| [Vendor Risk Assessment](./reference/governance/standards/engineering/vendor-risk-assessment.md) | Vendor risk assessment | Mitigate technological lock-in | Standards and guidance |
| [AI-Augmented Standards](./reference/governance/standards/ai-augmented/README.md) | AI-augmented standards | Guide AI-driven development | Standards and guidance |
| [SDLC Artifact Mapping](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.md) | Artifact mapping | Link phases and deliverables | Standards and guidance |
| [Technical Story Schema](./rulesets/schema/technical-story.schema.json) | JSON validation schema | Validate data structure | Rules and schemas |
| [Definition of Done Rules](./rulesets/cross-cutting/definition-of-done.rules.json) | Automated rules | Validate compliance in CI | Rules and schemas |
| [Engineering Manifesto Rules](./rulesets/cross-cutting/engineering-manifesto.rules.json) | Engineering manifesto | Establish technical principles | Rules and schemas |
| [Quality Thresholds Rules](./rulesets/sdlc/quality-thresholds.rules.json) | Automated rules | Validate compliance in CI | Rules and schemas |
| [Dependency Pinning Rules](./rulesets/sdlc/dependency-pinning.rules.json) | Automated rules | Validate compliance in CI | Rules and schemas |

</details>

<details>
<summary><strong>Phase 04 - Validation and QA</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [Test Summary Report Template](./reference/governance/sdlc/04-artifact-templates/test-summary-report-template.md) | Test summary report | Consolidate QA results | Documents and templates |
| [SDLC Quality Gates](./reference/governance/sdlc/quality-gates.md) | Quality gates | Establish approval thresholds | Standards and guidance |
| [SDLC Traceability Model](./reference/governance/sdlc/traceability-model.md) | Traceability model | Link requirements and tests | Standards and guidance |
| [Testing Pyramid ADR](./reference/architecture/adrs/core/0018-testing-pyramid-quality-gates.md) | Quality gates | Establish approval thresholds | Standards and guidance |
| [Unit Testing Isolation ADR](./reference/architecture/adrs/core/0052-unit-testing-isolation-strategy.md) | Testing isolation ADR | Regulate mocks usage | Standards and guidance |
| [Integration and E2E Testing ADR](./reference/architecture/adrs/core/0053-integration-e2e-testing-strategy.md) | Integration tests ADR | Establish end-to-end tests | Standards and guidance |
| [SDLC Artifact Mapping](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.md) | Artifact mapping | Link phases and deliverables | Standards and guidance |
| [Test Summary Report Schema](./rulesets/schema/test-summary-report.schema.json) | Test summary report | Consolidate QA results | Rules and schemas |
| [Quality Thresholds Rules](./rulesets/sdlc/quality-thresholds.rules.json) | Automated rules | Validate compliance in CI | Rules and schemas |
| [Testing Pyramid Rules](./rulesets/adr/adr-0018-testing-pyramid.rules.json) | Testing pyramid ADR | Define testing strategy | Rules and schemas |

</details>

<details>
<summary><strong>Phase 05 - Delivery and Operations</strong></summary>

| Link (URL) | Description (brief explanation) | Goal / Objective | Typification (category or type) |
|---|---|---|---|
| [Release Notes Template](./reference/governance/sdlc/04-artifact-templates/release-notes-template.md) | Release notes template | Communicate release changes | Documents and templates |
| [Operations Hub](./reference/operations/README.md) | Operations hub | Centralize operational guides | Standards and guidance |
| [Infrastructure Hub](./reference/infrastructure/README.md) | Infrastructure hub | Regulate deployments | Standards and guidance |
| [Observability Playbook](./reference/governance/standards/engineering/observability-playbook.md) | Observability playbook | Guide telemetry | Standards and guidance |
| [Observability Architecture Flow](./reference/architecture/blueprints/observability-architecture-flow.md) | Observability architecture flow | Trace signals propagation | Standards and guidance |
| [Multi-Cloud Deployment Scenarios](./reference/architecture/blueprints/multi-cloud-deployment-scenarios.md) | Multi-cloud scenarios | Define cloud topologies | Standards and guidance |
| [SDLC Artifact Mapping](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.md) | Artifact mapping | Link phases and deliverables | Standards and guidance |
| [Release Notes Schema](./rulesets/schema/release-notes.schema.json) | Release notes template | Communicate release changes | Rules and schemas |
| [CI/CD Quality Gates Rules](./rulesets/adr/adr-0005-cicd-quality-gates.rules.json) | Quality gates | Establish approval thresholds | Rules and schemas |
| [GitFlow Branching Rules](./rulesets/adr/adr-0050-gitflow-branching.rules.json) | Branching strategy ADR | Establish Git flow | Rules and schemas |

</details>

## Cross-Cutting References

<details>
<summary><strong>Architecture, governance, and applied reference</strong></summary>

- Architecture baseline
  - [Architecture Hub](./reference/architecture/README.md)
  - [Blueprints](./reference/architecture/blueprints/README.md)
  - [Agnostic Baseline](./reference/architecture/blueprints/authoritative-tech-stack-agnostic.md)
  - [Reference Blueprint](./reference/architecture/blueprints/reference-blueprint.md)
  - [C4 Topology Spec](./reference/architecture/blueprints/c4-topology-spec.md)
- Architecture decisions
  - [ADR Registry](./reference/architecture/adrs/README.md)
  - [Core ADRs](./reference/architecture/adrs/core/README.md)
  - [Node.js ADRs](./reference/architecture/adrs/nodejs/README.md)
  - [.NET ADRs](./reference/architecture/adrs/dotnet/README.md)
  - [Android ADRs](./reference/architecture/adrs/android/README.md)
- Governance and navigation
  - [Governance Standards](./reference/governance/standards/README.md)
  - [Maturity Assessment](./reference/governance/standards/vision/maturity-assessment.md) - TOGAF ACMM/WAF scoring, vision alignment, and open-gap links
  - [Gap Tracking Board](./reference/governance/standards/vision/gap-tracking.md) - single board for every open gap (criticality, complexity, status)
  - [Bilingual Index](./reference/navigation/BILINGUAL_INDEX.md)
  - [Navigation Hub](./reference/navigation/README.md)
  - [Rulesets Hub](./rulesets/README.md)
- Applied reference
  - [UMS Reference Hub](./reference/knowledge/demo/README.md)
  - [UMS Reference Model](./reference/knowledge/demo/ums-reference-model.md)
  - [Canonical Reference vs UMS Applied Model](./reference/knowledge/demo/demo-vs-reference.md)
  - [UMS Architecture Portal](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md)
  - [Adoption Cases](./reference/knowledge/adoption-cases.md)

</details>

## Tools and Automation

<details>
<summary><strong>Smart CLI and validation hooks</strong></summary>

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
