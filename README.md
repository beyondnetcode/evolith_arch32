# Evolith: Progressive Architecture Reference Base

> **Bilingual navigation:** [Versión en Español](./README.es.md)

Evolith defines architecture standards, governance, ADRs, patterns, and operational guidance that satellite products inherit and specialize.

## Start Here

- [Executive One-Pager](./reference/governance/standards/communication/visuals/v01-executive-one-pager.md)
- [Getting Started by Role](./reference/getting-started/README.md)
- [Product Vision](./reference/governance/standards/vision/evolith-product-vision-master.md)
- [SDLC Governance Center](./reference/governance/sdlc/README.md)
- [Global Master Index](./reference/navigation/MASTER_INDEX.md)

## SDLC Navigation

The six tables exclusively use these types and this order: **Format, Rule, Standard, Guide, Decision, Record, Matrix, Manifest, Reference, Index, Checklist**.

### Phase 01 - Conception and Discovery

| Type | Document |
|---|---|
| Format | [Agile Backlog](./reference/governance/sdlc/04-artifact-templates/agile-backlog-template.md) |
| Format | [Ballpark Estimation](./reference/governance/sdlc/04-artifact-templates/ballpark-estimation-template.md) |
| Format | [Business Case ROI](./reference/governance/sdlc/04-artifact-templates/business-case-roi-template.md) |
| Format | [CLI Impact Analysis](./reference/governance/sdlc/04-artifact-templates/cli-impact-analysis.md) |
| Format | [Discovery Canvas](./reference/governance/sdlc/04-artifact-templates/discovery-canvas-template.md) |
| Format | [Evolith User Story](./reference/governance/sdlc/04-artifact-templates/evolith-user-story-template.md) |
| Format | [PRD](./reference/governance/sdlc/04-artifact-templates/prd-template.md) |
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

### Phase 02 - Design and Architecture

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

### Phase 03 - Construction

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

### Phase 04 - Validation and QA

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

### Phase 05 - Delivery and Operations

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

## Cross-Cutting References

| Type | Document |
|---|---|
| Standard | [C4 Topology Spec](./reference/architecture/blueprints/c4-topology-spec.md) |
| Standard | [Governance Standards](./reference/governance/standards/README.md) |
| Record | [ADR Registry](./reference/architecture/adrs/README.md) |
| Record | [Gap Tracking Board](./reference/governance/standards/vision/gap-tracking.md) |
| Record | [Maturity Assessment](./reference/governance/standards/vision/maturity-assessment.md) |
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

## Tools and Automation

- [CLI Documentation](./sdk/cli/README.md)
- [CLI Architecture](./sdk/cli/ARCHITECTURE.md)
- [CLI Product Vision](./sdk/cli/docs/VISION.md)
- [Current-State Assessment](./sdk/cli/docs/planning/sdk-cli-mcp-current-state-assessment.md)
- [Documentation Validator](./.harness/scripts/validate-docs.mjs)
- [Bilingual Parity Validator](./.harness/scripts/check-bilingual-parity.mjs)

## Contribution

- [AGENTS.md](./AGENTS.md)
- [Repository Taxonomy](./reference/governance/standards/repository-taxonomy.md)
- [Child Repository Inheritance Guide](./reference/governance/standards/onboarding/child-repository-inheritance-guide.md)

## License

Published under the [MIT License](./LICENSE).
