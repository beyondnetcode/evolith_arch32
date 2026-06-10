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

Open the phase you are working in. Each table is grouped in the following strict type order: **Format, Rule, Standard, Guide, Decision, Record, Matrix, Manifest, Reference, Index, Checklist**.

<details>
<summary><strong>Phase 01 - Conception and Discovery</strong></summary>

| Type | Document |
|---|---|
| Format | [Agile Backlog](./reference/governance/sdlc/04-artifact-templates/agile-backlog-template.md) |
| Format | [Ballpark Estimation](./reference/governance/sdlc/04-artifact-templates/ballpark-estimation-template.md) |
| Format | [Business Case ROI](./reference/governance/sdlc/04-artifact-templates/business-case-roi-template.md) |
| Format | [CLI Impact Analysis](./reference/governance/sdlc/04-artifact-templates/cli-impact-analysis.md) |
| Format | [Discovery Canvas](./reference/governance/sdlc/04-artifact-templates/discovery-canvas-template.md) |
| Format | [Evolith User Story](./reference/governance/sdlc/04-artifact-templates/evolith-user-story-template.md) |
| Format | [PRD - Product Requirements Document](./reference/governance/sdlc/04-artifact-templates/prd-template.md) |
| Rule | [Agile Backlog Schema](./rulesets/schema/agile-backlog.schema.json) |
| Rule | [Ballpark Estimation Schema](./rulesets/schema/ballpark-estimation.schema.json) |
| Rule | [Business Case ROI Schema](./rulesets/schema/business-case-roi.schema.json) |
| Rule | [CLI Impact Analysis Schema](./rulesets/schema/cli-impact-analysis.schema.json) |
| Rule | [Discovery Canvas Schema](./rulesets/schema/discovery-canvas.schema.json) |
| Rule | [Evolith User Story Schema](./rulesets/schema/evolith-user-story.schema.json) |
| Rule | [Phase Gates Rules](./rulesets/sdlc/phase-gates.rules.json) |
| Rule | [PRD Schema](./rulesets/schema/prd.schema.json) |
| Standard | [Architectural Directives](./reference/governance/standards/vision/architectural-directives.md) |
| Standard | [Repository Taxonomy](./reference/governance/standards/repository-taxonomy.md) |
| Matrix | [SDLC Artifact Mapping](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.md) |
| Manifest | [Engineering Manifesto](./reference/governance/standards/engineering/engineering-manifesto.md) |
| Reference | [Agnostic Baseline](./reference/architecture/blueprints/authoritative-tech-stack-agnostic.md) |

</details>

<details>
<summary><strong>Phase 02 - Design and Architecture</strong></summary>

| Type | Document |
|---|---|
| Format | [ADR Template](./reference/governance/sdlc/04-artifact-templates/adr-template.md) |
| Format | [DDD Model Template](./reference/governance/sdlc/04-artifact-templates/ddd-model-template.md) |
| Format | [Functional Story Template](./reference/governance/sdlc/04-artifact-templates/functional-story-template.md) |
| Rule | [ADR Rules](./rulesets/adr/README.md) |
| Rule | [ADR Schema](./rulesets/schema/adr.schema.json) |
| Rule | [Architecture Rules](./rulesets/architecture/README.md) |
| Rule | [Functional Story Schema](./rulesets/schema/functional-story.schema.json) |
| Standard | [Authoritative Tech Stack](./reference/architecture/blueprints/authoritative-tech-stack.md) |
| Standard | [Functional Story Writing Standard](./reference/governance/sdlc/03-documentation/functional-story-writing-standard.md) |
| Guide | [SDLC Documentation Best Practices](./reference/governance/sdlc/03-documentation/sdlc-documentation-best-practices.md) |
| Record | [ADR Registry](./reference/architecture/adrs/README.md) |
| Matrix | [ADR Decision Matrix](./reference/architecture/adrs/adr-matrix.md) |
| Matrix | [SDLC Artifact Mapping](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.md) |
| Reference | [Reference Blueprint](./reference/architecture/blueprints/reference-blueprint.md) |
| Index | [Architecture Hub](./reference/architecture/README.md) |
| Checklist | [Simplicity Checklist Phase 1](./reference/architecture/blueprints/simplicity-checklist-phase-01.md) |

</details>

<details>
<summary><strong>Phase 03 - Construction</strong></summary>

| Type | Document |
|---|---|
| Format | [Technical Story Template](./reference/governance/sdlc/04-artifact-templates/technical-story-template.md) |
| Rule | [Definition of Done Rules](./rulesets/cross-cutting/definition-of-done.rules.json) |
| Rule | [Dependency Pinning Rules](./rulesets/sdlc/dependency-pinning.rules.json) |
| Rule | [Engineering Manifesto Rules](./rulesets/cross-cutting/engineering-manifesto.rules.json) |
| Rule | [Quality Thresholds Rules](./rulesets/sdlc/quality-thresholds.rules.json) |
| Rule | [Technical Story Schema](./rulesets/schema/technical-story.schema.json) |
| Standard | [AI-Augmented Standards](./reference/governance/standards/ai-augmented/README.md) |
| Standard | [Definition of Done](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.md) |
| Standard | [SDLC Quality Gates](./reference/governance/sdlc/quality-gates.md) |
| Guide | [Construction-Focused SDLC Framework](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.md) |
| Guide | [Contract Testing Guideline](./reference/governance/standards/engineering/contract-testing-guideline.md) |
| Guide | [Vendor Risk Assessment](./reference/governance/standards/engineering/vendor-risk-assessment.md) |
| Matrix | [SDLC Artifact Mapping](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.md) |
| Reference | [Canonical Patterns](./reference/architecture/canonical-patterns/README.md) |
| Index | [Artifact Templates Hub](./reference/governance/sdlc/04-artifact-templates/README.md) |

</details>

<details>
<summary><strong>Phase 04 - Validation and QA</strong></summary>

| Type | Document |
|---|---|
| Format | [Test Summary Report Template](./reference/governance/sdlc/04-artifact-templates/test-summary-report-template.md) |
| Rule | [Quality Thresholds Rules](./rulesets/sdlc/quality-thresholds.rules.json) |
| Rule | [Test Summary Report Schema](./rulesets/schema/test-summary-report.schema.json) |
| Rule | [Testing Pyramid Rules](./rulesets/adr/adr-0018-testing-pyramid.rules.json) |
| Standard | [SDLC Quality Gates](./reference/governance/sdlc/quality-gates.md) |
| Decision | [Integration and E2E Testing ADR](./reference/architecture/adrs/core/0053-integration-e2e-testing-strategy.md) |
| Decision | [Testing Pyramid ADR](./reference/architecture/adrs/core/0018-testing-pyramid-quality-gates.md) |
| Decision | [Unit Testing Isolation ADR](./reference/architecture/adrs/core/0052-unit-testing-isolation-strategy.md) |
| Matrix | [SDLC Artifact Mapping](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.md) |
| Reference | [SDLC Traceability Model](./reference/governance/sdlc/traceability-model.md) |

</details>

<details>
<summary><strong>Phase 05 - Delivery and Operations</strong></summary>

| Type | Document |
|---|---|
| Format | [Release Notes Template](./reference/governance/sdlc/04-artifact-templates/release-notes-template.md) |
| Rule | [CI/CD Quality Gates Rules](./rulesets/adr/adr-0005-cicd-quality-gates.rules.json) |
| Rule | [GitFlow Branching Rules](./rulesets/adr/adr-0050-gitflow-branching.rules.json) |
| Rule | [Release Notes Schema](./rulesets/schema/release-notes.schema.json) |
| Guide | [Observability Playbook](./reference/governance/standards/engineering/observability-playbook.md) |
| Matrix | [SDLC Artifact Mapping](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.md) |
| Reference | [Multi-Cloud Deployment Scenarios](./reference/architecture/blueprints/multi-cloud-deployment-scenarios.md) |
| Reference | [Observability Architecture Flow](./reference/architecture/blueprints/observability-architecture-flow.md) |
| Index | [Infrastructure Hub](./reference/infrastructure/README.md) |
| Index | [Operations Hub](./reference/operations/README.md) |

</details>

## Cross-Cutting References

<details>
<summary><strong>Architecture, governance, and applied reference</strong></summary>

| Type | Document |
|---|---|
| Standard | [C4 Topology Spec](./reference/architecture/blueprints/c4-topology-spec.md) |
| Standard | [Governance Standards](./reference/governance/standards/README.md) |
| Record | [ADR Registry](./reference/architecture/adrs/README.md) |
| Record | [Gap Tracking Board](./reference/governance/standards/vision/gap-tracking.md) — single board for every open gap |
| Record | [Maturity Assessment](./reference/governance/standards/vision/maturity-assessment.md) — TOGAF ACMM/WAF scoring and vision alignment |
| Reference | [Adoption Cases](./reference/knowledge/adoption-cases.md) |
| Reference | [Agnostic Baseline](./reference/architecture/blueprints/authoritative-tech-stack-agnostic.md) |
| Reference | [Canonical Reference vs UMS Applied Model](./reference/knowledge/demo/demo-vs-reference.md) |
| Reference | [Reference Blueprint](./reference/architecture/blueprints/reference-blueprint.md) |
| Reference | [UMS Reference Model](./reference/knowledge/demo/ums-reference-model.md) |
| Index | [.NET ADRs](./reference/architecture/adrs/dotnet/README.md) |
| Index | [Android ADRs](./reference/architecture/adrs/android/README.md) |
| Index | [Architecture Hub](./reference/architecture/README.md) |
| Index | [Bilingual Index](./reference/navigation/BILINGUAL_INDEX.md) |
| Index | [Blueprints](./reference/architecture/blueprints/README.md) |
| Index | [Core ADRs](./reference/architecture/adrs/core/README.md) |
| Index | [Navigation Hub](./reference/navigation/README.md) |
| Index | [Node.js ADRs](./reference/architecture/adrs/nodejs/README.md) |
| Index | [Rulesets Hub](./rulesets/README.md) |
| Index | [UMS Architecture Portal](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |
| Index | [UMS Reference Hub](./reference/knowledge/demo/README.md) |

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
