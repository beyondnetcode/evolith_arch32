# Evolith Global Master Index

> Bilingual navigation: [Español](./MASTER_INDEX.es.md)  
> Main portal: [README](../../README.md)

This is the complete navigation index for **Evolith** — the enterprise progressive architecture platform. Use it when you already know what type of artifact you need, or when you want to move across repository areas without browsing directories manually.

---

## 1. Start by Intent

| Intent | Primary entry point | Supporting reference |
|---|---|---|
| Choose an efficient reading path | [Getting Started by Role](../getting-started/README.md) | [Architecture Glossary](../governance/glossary.md) |
| Understand the architecture vision | [Architectural Directives](../governance/standards/vision/architectural-directives.md) | [Evolutionary Strategy Roadmap](../governance/standards/vision/evolutionary-strategy-roadmap.md) |
| Understand the progressive architecture model | [Architecture Hub](../architecture/README.md) | [Microservice Extraction Readiness Criteria](../architecture/adrs/core/0045-microservice-extraction-readiness-criteria.md) |
| Review technology choices | [Authoritative Tech Stack](../architecture/blueprints/authoritative-tech-stack.md) | [Agnostic Baseline](../architecture/blueprints/authoritative-tech-stack-agnostic.md) |
| Review architectural decisions | [ADR Registry](../architecture/adrs/README.md) | [Core ADRs](../architecture/adrs/core/README.md) |
| Learn engineering standards | [Engineering Manifesto](../governance/standards/engineering/engineering-manifesto.md) | [Contract Testing Guideline](../governance/standards/engineering/contract-testing-guideline.md) |
| Understand SDLC expectations | [SDLC Governance Center](../governance/sdlc/README.md) | [SDLC Artifact Templates](../governance/sdlc/04-artifact-templates/README.md) |
| Explore the applied product reference | [UMS Reference Hub](../knowledge/demo/README.md) | [UMS Architecture Portal](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |
| Separate policy from implementation evidence | [Canonical Reference vs UMS Applied Model](../knowledge/demo/demo-vs-reference.md) | [Repository Taxonomy](../governance/standards/repository-taxonomy.md) |
| Review licensing and IP terms | [BeyondNet Tech Dual License](../../LICENSE) | [NOTICE](../../NOTICE) |
| Operate or deploy locally | [Operations Hub](../operations/README.md) | [Infrastructure Hub](../infrastructure/README.md) |
| Explain the standard to a new audience | [Architecture Communication Strategy](../governance/standards/communication/architecture-communication-strategy.md) | [Visual Architecture Backlog](../governance/standards/communication/visuals/README.md) |

---

## 2. Recommended Reading by Role

| Role | Reading path |
|---|---|
| **Executive / Sponsor** | [Architectural Directives](../governance/standards/vision/architectural-directives.md) -> [Evolutionary Roadmap](../governance/standards/vision/evolutionary-strategy-roadmap.md) -> [Maturity Matrix](../governance/standards/vision/maturity-matrix.md) -> [Dual License](../../LICENSE) |
| **Product Owner / PM** | [UMS Reference Model](../knowledge/demo/ums-reference-model.md) -> [UMS Documentation Index](https://github.com/beyondnetcode/ums/blob/main/docs/MASTER_INDEX.md) -> [Reference vs Applied Model](../knowledge/demo/demo-vs-reference.md) |
| **Software Architect** | [Architecture Hub](../architecture/README.md) -> [ADR Registry](../architecture/adrs/README.md) -> [UMS Architecture Portal](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |
| **Principal / Staff Engineer** | [Agnostic Baseline](../architecture/blueprints/authoritative-tech-stack-agnostic.md) -> [Tactical Design Patterns](../architecture/adrs/core/0019-tactical-design-patterns-future-proofing.md) -> [Simplicity Checklist](../architecture/blueprints/simplicity-checklist-phase-01.md) |
| **Backend Developer** | [Engineering Manifesto](../governance/standards/engineering/engineering-manifesto.md) -> [Runtime ADR Registry](../architecture/adrs/README.md) -> [UMS Reference Model](../knowledge/demo/ums-reference-model.md) |
| **Frontend Developer** | [Frontend Offline Resilience ADR](../architecture/adrs/nodejs/0004-frontend-offline-resilience.md) -> [Microfrontends ADR](../architecture/adrs/core/0055-microfrontends-architecture-strategy.md) -> [UMS Repository](https://github.com/beyondnetcode/ums) |
| **DevOps / SRE** | [Infrastructure Hub](../infrastructure/README.md) -> [Operations Hub](../operations/README.md) -> [UMS Architecture Portal](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |
| **QA / SDET** | [Testing Pyramid ADR](../architecture/adrs/core/0018-testing-pyramid-quality-gates.md) -> [Contract Testing Guideline](../governance/standards/engineering/contract-testing-guideline.md) -> [Integration and E2E Testing ADR](../architecture/adrs/core/0053-integration-e2e-testing-strategy.md) |
| **Security Engineer** | [Vendor Risk Assessment](../governance/standards/engineering/vendor-risk-assessment.md) -> [Multi-Tenancy ADR](../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.md) -> [Immutable Audit Trail ADR](../architecture/adrs/core/0016-immutable-business-audit-trail.md) |
| **AI Contributor** | [AI-Augmented Standards](../governance/standards/ai-augmented/README.md) -> [AI Architecture Assistant](../governance/standards/ai-augmented/08-architecture-ai-assistant/README.md) -> [BMAD Adoption Reference](../governance/standards/ai-augmented/frameworks/bmad-method/README.md) -> [Harness Rules](../../.harness/rules/global-rules.md) |
| **New Joiner** | [Product Quick Start](../governance/standards/onboarding/product-quick-start.md) -> [Repository Taxonomy](../governance/standards/repository-taxonomy.md) -> [README Portal](../../README.md) |

---

## 3. Architecture

| Area | Entry point |
|---|---|
| Architecture Hub | [reference/architecture](../architecture/README.md) |
| Blueprints | [reference/architecture/blueprints](../architecture/blueprints/README.md) |
| ADR Registry | [reference/architecture/adrs](../architecture/adrs/README.md) |
| ADR Decision Matrix | [reference/architecture/adrs/adr-matrix](../architecture/adrs/adr-matrix.md) |
| Core ADRs | [reference/architecture/adrs/core](../architecture/adrs/core/README.md) |
| Node.js ADRs | [reference/architecture/adrs/nodejs](../architecture/adrs/nodejs/README.md) |
| .NET ADRs | [reference/architecture/adrs/dotnet](../architecture/adrs/dotnet/README.md) |
| Android ADRs | [reference/architecture/adrs/android](../architecture/adrs/android/README.md) |
| Canonical Patterns | [reference/architecture/canonical-patterns](../architecture/canonical-patterns/README.md) |

Key architecture references:

- [Reference Blueprint](../architecture/blueprints/reference-blueprint.md)
- [Authoritative Tech Stack Index](../architecture/blueprints/authoritative-tech-stack.md)
- [C4 Topology Spec](../architecture/blueprints/c4-topology-spec.md)
- [Observability Architecture Flow](../architecture/blueprints/observability-architecture-flow.md)
- [CAP Strategic Analysis](../architecture/blueprints/cap-strategic-analysis.md)
- [Multi-Cloud Deployment Scenarios](../architecture/blueprints/multi-cloud-deployment-scenarios.md)

---

## 4. Governance

| Area | Entry point |
|---|---|
| Standards | [reference/governance/standards](../governance/standards/README.md) |
| Architecture Glossary | [reference/governance/glossary](../governance/glossary.md) |
| Vision | [reference/governance/standards/vision](../governance/standards/vision/README.md) |
| Engineering | [reference/governance/standards/engineering](../governance/standards/engineering/README.md) |
| Onboarding | [reference/governance/standards/onboarding](../governance/standards/onboarding/README.md) |
| Repository Taxonomy | [reference/governance/standards/repository-taxonomy](../governance/standards/repository-taxonomy.md) |
| Legal and IP | [BeyondNet Tech Dual License](../../LICENSE) / [NOTICE](../../NOTICE) |
| AI-Augmented Engineering | [reference/governance/standards/ai-augmented](../governance/standards/ai-augmented/README.md) |
| SDLC | [reference/governance/sdlc](../governance/sdlc/README.md) |
| SDLC Artifact Mapping | [reference/governance/sdlc/sdlc-evolith-artifact-mapping](../governance/sdlc/sdlc-evolith-artifact-mapping.md) |
| SDLC Artifact Templates | [reference/governance/sdlc/04-artifact-templates](../governance/sdlc/04-artifact-templates/README.md) |
| Documentation Standards | [reference/governance/sdlc/03-documentation](../governance/sdlc/03-documentation/README.md) |
| Architecture Communication Strategy | [reference/governance/standards/communication](../governance/standards/communication/architecture-communication-strategy.md) |
| Visual Architecture Backlog | [reference/governance/standards/communication/visuals](../governance/standards/communication/visuals/README.md) |

---

## 5. Applied Reference and Knowledge Base

| Area | Entry point |
|---|---|
| UMS Applied Reference Hub | [reference/knowledge/demo](../knowledge/demo/README.md) |
| UMS Technical Overview | [reference/knowledge/demo/ums-technical-overview](../knowledge/demo/ums-technical-overview.md) |
| UMS Reference Model | [reference/knowledge/demo/ums-reference-model](../knowledge/demo/ums-reference-model.md) |
| Reference vs Applied Model Boundary | [reference/knowledge/demo/demo-vs-reference](../knowledge/demo/demo-vs-reference.md) |
| Migration Record | [reference/knowledge/demo/migration-from-todo-to-ums](../knowledge/demo/migration-from-todo-to-ums.md) |
| Research | [reference/knowledge/research](../knowledge/research/README.md) |
| Proofs of Concept | [reference/knowledge/poc](../knowledge/poc/README.md) |

Official UMS sources:

- [UMS Repository and Setup](https://github.com/beyondnetcode/ums/blob/main/README.md)
- [UMS Documentation Index](https://github.com/beyondnetcode/ums/blob/main/docs/MASTER_INDEX.md)
- [UMS Architecture Portal](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md)

---

## 6. Operations and Infrastructure

| Area | Entry point |
|---|---|
| Operations | [reference/operations](../operations/README.md) |
| OpenTelemetry | [reference/operations/otel](../operations/otel/README.md) |
| Grafana | [reference/operations/grafana](../operations/grafana/README.md) |
| Tempo | [reference/operations/tempo](../operations/tempo/README.md) |
| Infrastructure | [reference/infrastructure](../infrastructure/README.md) |

---
