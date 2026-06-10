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

The six tables exclusively use these exact types and this order: **Formato, Regla, Estándar, Guía, Decisión, Registro, Matriz, Manifiesto, Referencia, Índice, Lista de Verificación**.

### Phase 01 - Conception and Discovery

| Tipo | Document |
|---|---|
| Formato | [Agile Backlog](./reference/governance/sdlc/04-artifact-templates/agile-backlog-template.md) |
| Formato | [Ballpark Estimation](./reference/governance/sdlc/04-artifact-templates/ballpark-estimation-template.md) |
| Formato | [Business Case ROI](./reference/governance/sdlc/04-artifact-templates/business-case-roi-template.md) |
| Formato | [CLI Impact Analysis](./reference/governance/sdlc/04-artifact-templates/cli-impact-analysis.md) |
| Formato | [Discovery Canvas](./reference/governance/sdlc/04-artifact-templates/discovery-canvas-template.md) |
| Formato | [Evolith User Story](./reference/governance/sdlc/04-artifact-templates/evolith-user-story-template.md) |
| Formato | [PRD](./reference/governance/sdlc/04-artifact-templates/prd-template.md) |
| Regla | [Agile Backlog Schema](./rulesets/schema/agile-backlog.schema.json) |
| Regla | [Ballpark Estimation Schema](./rulesets/schema/ballpark-estimation.schema.json) |
| Regla | [Business Case ROI Schema](./rulesets/schema/business-case-roi.schema.json) |
| Regla | [CLI Impact Analysis Schema](./rulesets/schema/cli-impact-analysis.schema.json) |
| Regla | [Discovery Canvas Schema](./rulesets/schema/discovery-canvas.schema.json) |
| Regla | [Evolith User Story Schema](./rulesets/schema/evolith-user-story.schema.json) |
| Regla | [Phase Gates Rules](./rulesets/sdlc/phase-gates.rules.json) |
| Regla | [PRD Schema](./rulesets/schema/prd.schema.json) |
| Estándar | [Architectural Directives](./reference/governance/standards/vision/architectural-directives.md) |
| Estándar | [Repository Taxonomy](./reference/governance/standards/repository-taxonomy.md) |
| Matriz | [SDLC Artifact Mapping](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.md) |
| Manifiesto | [Engineering Manifesto](./reference/governance/standards/engineering/engineering-manifesto.md) |
| Referencia | [Agnostic Baseline](./reference/architecture/blueprints/authoritative-tech-stack-agnostic.md) |

### Phase 02 - Design and Architecture

| Tipo | Document |
|---|---|
| Formato | [ADR Template](./reference/governance/sdlc/04-artifact-templates/adr-template.md) |
| Formato | [DDD Model Template](./reference/governance/sdlc/04-artifact-templates/ddd-model-template.md) |
| Formato | [Functional Story Template](./reference/governance/sdlc/04-artifact-templates/functional-story-template.md) |
| Regla | [ADR Rules](./rulesets/adr/README.md) |
| Regla | [ADR Schema](./rulesets/schema/adr.schema.json) |
| Regla | [Architecture Rules](./rulesets/architecture/README.md) |
| Regla | [Functional Story Schema](./rulesets/schema/functional-story.schema.json) |
| Estándar | [Authoritative Tech Stack](./reference/architecture/blueprints/authoritative-tech-stack.md) |
| Estándar | [Functional Story Writing Standard](./reference/governance/sdlc/03-documentation/functional-story-writing-standard.md) |
| Guía | [SDLC Documentation Best Practices](./reference/governance/sdlc/03-documentation/sdlc-documentation-best-practices.md) |
| Registro | [ADR Registry](./reference/architecture/adrs/README.md) |
| Matriz | [ADR Decision Matrix](./reference/architecture/adrs/adr-matrix.md) |
| Matriz | [SDLC Artifact Mapping](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.md) |
| Referencia | [Reference Blueprint](./reference/architecture/blueprints/reference-blueprint.md) |
| Índice | [Architecture Hub](./reference/architecture/README.md) |
| Lista de Verificación | [Simplicity Checklist Phase 1](./reference/architecture/blueprints/simplicity-checklist-phase-01.md) |

### Phase 03 - Construction

| Tipo | Document |
|---|---|
| Formato | [Technical Story Template](./reference/governance/sdlc/04-artifact-templates/technical-story-template.md) |
| Regla | [Definition of Done Rules](./rulesets/cross-cutting/definition-of-done.rules.json) |
| Regla | [Dependency Pinning Rules](./rulesets/sdlc/dependency-pinning.rules.json) |
| Regla | [Engineering Manifesto Rules](./rulesets/cross-cutting/engineering-manifesto.rules.json) |
| Regla | [Quality Thresholds Rules](./rulesets/sdlc/quality-thresholds.rules.json) |
| Regla | [Technical Story Schema](./rulesets/schema/technical-story.schema.json) |
| Estándar | [AI-Augmented Standards](./reference/governance/standards/ai-augmented/README.md) |
| Estándar | [Definition of Done](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.md) |
| Estándar | [SDLC Quality Gates](./reference/governance/sdlc/quality-gates.md) |
| Guía | [Construction-Focused SDLC Framework](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.md) |
| Guía | [Contract Testing Guideline](./reference/governance/standards/engineering/contract-testing-guideline.md) |
| Guía | [Vendor Risk Assessment](./reference/governance/standards/engineering/vendor-risk-assessment.md) |
| Matriz | [SDLC Artifact Mapping](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.md) |
| Referencia | [Canonical Patterns](./reference/architecture/canonical-patterns/README.md) |
| Índice | [Artifact Templates Hub](./reference/governance/sdlc/04-artifact-templates/README.md) |

### Phase 04 - Validation and QA

| Tipo | Document |
|---|---|
| Formato | [Test Summary Report Template](./reference/governance/sdlc/04-artifact-templates/test-summary-report-template.md) |
| Regla | [Quality Thresholds Rules](./rulesets/sdlc/quality-thresholds.rules.json) |
| Regla | [Test Summary Report Schema](./rulesets/schema/test-summary-report.schema.json) |
| Regla | [Testing Pyramid Rules](./rulesets/adr/adr-0018-testing-pyramid.rules.json) |
| Estándar | [SDLC Quality Gates](./reference/governance/sdlc/quality-gates.md) |
| Decisión | [Integration and E2E Testing ADR](./reference/architecture/adrs/core/0053-integration-e2e-testing-strategy.md) |
| Decisión | [Testing Pyramid ADR](./reference/architecture/adrs/core/0018-testing-pyramid-quality-gates.md) |
| Decisión | [Unit Testing Isolation ADR](./reference/architecture/adrs/core/0052-unit-testing-isolation-strategy.md) |
| Matriz | [SDLC Artifact Mapping](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.md) |
| Referencia | [SDLC Traceability Model](./reference/governance/sdlc/traceability-model.md) |

### Phase 05 - Delivery and Operations

| Tipo | Document |
|---|---|
| Formato | [Release Notes Template](./reference/governance/sdlc/04-artifact-templates/release-notes-template.md) |
| Regla | [CI/CD Quality Gates Rules](./rulesets/adr/adr-0005-cicd-quality-gates.rules.json) |
| Regla | [GitFlow Branching Rules](./rulesets/adr/adr-0050-gitflow-branching.rules.json) |
| Regla | [Release Notes Schema](./rulesets/schema/release-notes.schema.json) |
| Guía | [Observability Playbook](./reference/governance/standards/engineering/observability-playbook.md) |
| Matriz | [SDLC Artifact Mapping](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.md) |
| Referencia | [Multi-Cloud Deployment Scenarios](./reference/architecture/blueprints/multi-cloud-deployment-scenarios.md) |
| Referencia | [Observability Architecture Flow](./reference/architecture/blueprints/observability-architecture-flow.md) |
| Índice | [Infrastructure Hub](./reference/infrastructure/README.md) |
| Índice | [Operations Hub](./reference/operations/README.md) |

## Cross-Cutting References

| Tipo | Document |
|---|---|
| Estándar | [C4 Topology Spec](./reference/architecture/blueprints/c4-topology-spec.md) |
| Estándar | [Governance Standards](./reference/governance/standards/README.md) |
| Registro | [ADR Registry](./reference/architecture/adrs/README.md) |
| Registro | [Gap Tracking Board](./reference/governance/standards/vision/gap-tracking.md) |
| Registro | [Maturity Assessment](./reference/governance/standards/vision/maturity-assessment.md) |
| Referencia | [Adoption Cases](./reference/knowledge/adoption-cases.md) |
| Referencia | [Agnostic Baseline](./reference/architecture/blueprints/authoritative-tech-stack-agnostic.md) |
| Referencia | [Canonical Reference vs UMS Applied Model](./reference/knowledge/demo/demo-vs-reference.md) |
| Referencia | [Reference Blueprint](./reference/architecture/blueprints/reference-blueprint.md) |
| Referencia | [UMS Reference Model](./reference/knowledge/demo/ums-reference-model.md) |
| Índice | [.NET ADRs](./reference/architecture/adrs/dotnet/README.md) |
| Índice | [Android ADRs](./reference/architecture/adrs/android/README.md) |
| Índice | [Architecture Hub](./reference/architecture/README.md) |
| Índice | [Bilingual Index](./reference/navigation/BILINGUAL_INDEX.md) |
| Índice | [Blueprints](./reference/architecture/blueprints/README.md) |
| Índice | [Core ADRs](./reference/architecture/adrs/core/README.md) |
| Índice | [Navigation Hub](./reference/navigation/README.md) |
| Índice | [Node.js ADRs](./reference/architecture/adrs/nodejs/README.md) |
| Índice | [Rulesets Hub](./rulesets/README.md) |
| Índice | [UMS Architecture Portal](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |
| Índice | [UMS Reference Hub](./reference/knowledge/demo/README.md) |

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
