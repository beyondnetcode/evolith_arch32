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

- [Executive One-Pager](./reference/governance/standards/communication/visuals/v01-executive-one-pager.md) - five-minute explanation of Evolith, UMS, and the value proposition.
- [Getting Started by Role](./reference/getting-started/README.md) - recommended reading paths for executives, architects, engineers, QA, SRE, product, and AI contributors.
- [Product Vision](./reference/governance/standards/vision/evolith-product-vision-master.md) - strategic direction, roadmap, and maturity model.
- [SDLC Governance Center](./reference/governance/sdlc/README.md) - authoritative lifecycle phases, gates, artifacts, and traceability model.
- [Global Master Index](./reference/navigation/MASTER_INDEX.md) - complete repository navigation when you already know what artifact you need.

## SDLC Navigation

Open the phase you are working in. Each section groups the documents, standards, and machine-readable rules that support its gate.

<details>
<summary><strong>Phase 01 - Conception and Discovery</strong></summary>

- Documents and templates
  - [Discovery Canvas](./reference/governance/sdlc/04-artifact-templates/discovery-canvas-template.md)
  - [Business Case ROI](./reference/governance/sdlc/04-artifact-templates/business-case-roi-template.md)
  - [Ballpark Estimation](./reference/governance/sdlc/04-artifact-templates/ballpark-estimation-template.md)
  - [PRD - Product Requirements Document](./reference/governance/sdlc/04-artifact-templates/prd-template.md)
  - [Evolith User Story](./reference/governance/sdlc/04-artifact-templates/evolith-user-story-template.md)
  - [Agile Backlog](./reference/governance/sdlc/04-artifact-templates/agile-backlog-template.md)
  - [CLI Impact Analysis](./reference/governance/sdlc/04-artifact-templates/cli-impact-analysis.md)
- Standards and guidance
  - [Architectural Directives](./reference/governance/standards/vision/architectural-directives.md)
  - [Repository Taxonomy](./reference/governance/standards/repository-taxonomy.md)
  - [Agnostic Baseline](./reference/architecture/blueprints/authoritative-tech-stack-agnostic.md)
  - [Engineering Manifesto](./reference/governance/standards/engineering/engineering-manifesto.md)
  - [SDLC Artifact Mapping](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.md)
- Rules and schemas
  - [Discovery Canvas Schema](./rulesets/schema/discovery-canvas.schema.json)
  - [Business Case ROI Schema](./rulesets/schema/business-case-roi.schema.json)
  - [Ballpark Estimation Schema](./rulesets/schema/ballpark-estimation.schema.json)
  - [PRD Schema](./rulesets/schema/prd.schema.json)
  - [Evolith User Story Schema](./rulesets/schema/evolith-user-story.schema.json)
  - [Agile Backlog Schema](./rulesets/schema/agile-backlog.schema.json)
  - [CLI Impact Analysis Schema](./rulesets/schema/cli-impact-analysis.schema.json)
  - [Phase Gates Rules](./rulesets/sdlc/phase-gates.rules.json)

</details>

<details>
<summary><strong>Phase 02 - Design and Architecture</strong></summary>

- Documents and templates
  - [ADR Template](./reference/governance/sdlc/04-artifact-templates/adr-template.md)
  - [Functional Story Template](./reference/governance/sdlc/04-artifact-templates/functional-story-template.md)
  - [DDD Model Template](./reference/governance/sdlc/04-artifact-templates/ddd-model-template.md)
- Standards and guidance
  - [Architecture Hub](./reference/architecture/README.md)
  - [Reference Blueprint](./reference/architecture/blueprints/reference-blueprint.md)
  - [Authoritative Tech Stack](./reference/architecture/blueprints/authoritative-tech-stack.md)
  - [ADR Registry](./reference/architecture/adrs/README.md)
  - [ADR Decision Matrix](./reference/architecture/adrs/adr-matrix.md)
  - [Functional Story Writing Standard](./reference/governance/sdlc/03-documentation/functional-story-writing-standard.md)
  - [SDLC Documentation Best Practices](./reference/governance/sdlc/03-documentation/sdlc-documentation-best-practices.md)
  - [Simplicity Checklist Phase 1](./reference/architecture/blueprints/simplicity-checklist-phase-01.md)
  - [SDLC Artifact Mapping](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.md)
- Rules and schemas
  - [ADR Schema](./rulesets/schema/adr.schema.json)
  - [Functional Story Schema](./rulesets/schema/functional-story.schema.json)
  - [Architecture Rules](./rulesets/architecture/README.md)
  - [ADR Rules](./rulesets/adr/README.md)

</details>

<details>
<summary><strong>Phase 03 - Construction</strong></summary>

- Documents and templates
  - [Technical Story Template](./reference/governance/sdlc/04-artifact-templates/technical-story-template.md)
  - [Artifact Templates Hub](./reference/governance/sdlc/04-artifact-templates/README.md)
- Standards and guidance
  - [Construction-Focused SDLC Framework](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.md)
  - [Definition of Done](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.md)
  - [SDLC Quality Gates](./reference/governance/sdlc/quality-gates.md)
  - [Canonical Patterns](./reference/architecture/canonical-patterns/README.md)
  - [Contract Testing Guideline](./reference/governance/standards/engineering/contract-testing-guideline.md)
  - [Vendor Risk Assessment](./reference/governance/standards/engineering/vendor-risk-assessment.md)
  - [AI-Augmented Standards](./reference/governance/standards/ai-augmented/README.md)
  - [SDLC Artifact Mapping](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.md)
- Rules and schemas
  - [Technical Story Schema](./rulesets/schema/technical-story.schema.json)
  - [Definition of Done Rules](./rulesets/cross-cutting/definition-of-done.rules.json)
  - [Engineering Manifesto Rules](./rulesets/cross-cutting/engineering-manifesto.rules.json)
  - [Quality Thresholds Rules](./rulesets/sdlc/quality-thresholds.rules.json)
  - [Dependency Pinning Rules](./rulesets/sdlc/dependency-pinning.rules.json)

</details>

<details>
<summary><strong>Phase 04 - Validation and QA</strong></summary>

- Documents and templates
  - [Test Summary Report Template](./reference/governance/sdlc/04-artifact-templates/test-summary-report-template.md)
- Standards and guidance
  - [SDLC Quality Gates](./reference/governance/sdlc/quality-gates.md)
  - [SDLC Traceability Model](./reference/governance/sdlc/traceability-model.md)
  - [Testing Pyramid ADR](./reference/architecture/adrs/core/0018-testing-pyramid-quality-gates.md)
  - [Unit Testing Isolation ADR](./reference/architecture/adrs/core/0052-unit-testing-isolation-strategy.md)
  - [Integration and E2E Testing ADR](./reference/architecture/adrs/core/0053-integration-e2e-testing-strategy.md)
  - [SDLC Artifact Mapping](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.md)
- Rules and schemas
  - [Test Summary Report Schema](./rulesets/schema/test-summary-report.schema.json)
  - [Quality Thresholds Rules](./rulesets/sdlc/quality-thresholds.rules.json)
  - [Testing Pyramid Rules](./rulesets/adr/adr-0018-testing-pyramid.rules.json)

</details>

<details>
<summary><strong>Phase 05 - Delivery and Operations</strong></summary>

- Documents and templates
  - [Release Notes Template](./reference/governance/sdlc/04-artifact-templates/release-notes-template.md)
- Standards and guidance
  - [Operations Hub](./reference/operations/README.md)
  - [Infrastructure Hub](./reference/infrastructure/README.md)
  - [Observability Playbook](./reference/governance/standards/engineering/observability-playbook.md)
  - [Observability Architecture Flow](./reference/architecture/blueprints/observability-architecture-flow.md)
  - [Multi-Cloud Deployment Scenarios](./reference/architecture/blueprints/multi-cloud-deployment-scenarios.md)
  - [SDLC Artifact Mapping](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.md)
- Rules and schemas
  - [Release Notes Schema](./rulesets/schema/release-notes.schema.json)
  - [CI/CD Quality Gates Rules](./rulesets/adr/adr-0005-cicd-quality-gates.rules.json)
  - [GitFlow Branching Rules](./rulesets/adr/adr-0050-gitflow-branching.rules.json)

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
