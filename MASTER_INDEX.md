# Evolith Global Master Index

> Bilingual navigation: [Español](./MASTER_INDEX.es.md) 
> Main portal: [README](./README.md)

This is the complete navigation index for **Evolith** — the enterprise progressive architecture platform. Use it when you already know what type of artifact you need, or when you want to move across repository areas without browsing directories manually.

---

## 1. Start by Intent

| Intent | Primary entry point | Supporting reference |
|---|---|---|
| Choose an efficient reading path | [Getting Started by Role](./reference/getting-started/README.md) | [Architecture Glossary](./reference/governance/glossary.md) |
| Understand the architecture vision | [Architectural Directives](./reference/governance/standards/vision/architectural-directives.md) | [Evolutionary Strategy Roadmap](./reference/governance/standards/vision/evolutionary-strategy-roadmap.md) |
| Understand the progressive architecture model | [Architecture Hub](./reference/architecture/README.md) | [Microservice Extraction Readiness Criteria](./reference/architecture/adrs/core/0045-microservice-extraction-readiness-criteria.md) |
| Review technology choices | [Authoritative Tech Stack](./reference/architecture/blueprints/authoritative-tech-stack.md) | [Agnostic Baseline](./reference/architecture/blueprints/authoritative-tech-stack-agnostic.md) |
| Review architectural decisions | [ADR Registry](./reference/architecture/adrs/README.md) | [Core ADRs](./reference/architecture/adrs/core/README.md) |
| Learn engineering standards | [Engineering Manifesto](./reference/governance/standards/engineering/engineering-manifesto.md) | [Contract Testing Guideline](./reference/governance/standards/engineering/contract-testing-guideline.md) |
| Understand SDLC expectations | [SDLC Framework](./reference/governance/sdlc/README.md) | [Construction-Focused SDLC](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.md) |
| Explore the applied product reference | [UMS Reference Hub](./reference/knowledge/demo/README.md) | [UMS Architecture Portal](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |
| Separate policy from implementation evidence | [Canonical Reference vs UMS Applied Model](./reference/knowledge/demo/demo-vs-reference.md) | [Repository Taxonomy](./reference/governance/standards/repository-taxonomy.md) |
| Operate or deploy locally | [Operations Hub](./reference/operations/README.md) | [Infrastructure Hub](./reference/infrastructure/README.md) |
| Explain the standard to a new audience | [Architecture Communication Strategy](./reference/governance/standards/communication/architecture-communication-strategy.md) | [Visual Architecture Backlog](./reference/governance/standards/communication/visuals/README.md) |

---

## 2. Recommended Reading by Role

| Role | Reading path |
|---|---|
| **Executive / Sponsor** | [Architectural Directives](./reference/governance/standards/vision/architectural-directives.md) -> [Evolutionary Roadmap](./reference/governance/standards/vision/evolutionary-strategy-roadmap.md) -> [Maturity Matrix](./reference/governance/standards/vision/maturity-matrix.md) |
| **Product Owner / PM** | [UMS Reference Model](./reference/knowledge/demo/ums-reference-model.md) -> [UMS Documentation Index](https://github.com/beyondnetcode/ums/blob/main/docs/MASTER_INDEX.md) -> [Reference vs Applied Model](./reference/knowledge/demo/demo-vs-reference.md) |
| **Software Architect** | [Architecture Hub](./reference/architecture/README.md) -> [ADR Registry](./reference/architecture/adrs/README.md) -> [UMS Architecture Portal](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |
| **Principal / Staff Engineer** | [Agnostic Baseline](./reference/architecture/blueprints/authoritative-tech-stack-agnostic.md) -> [Tactical Design Patterns](./reference/architecture/adrs/core/0019-tactical-design-patterns-future-proofing.md) -> [Simplicity Checklist](./reference/architecture/blueprints/simplicity-checklist-phase-01.md) |
| **Backend Developer** | [Engineering Manifesto](./reference/governance/standards/engineering/engineering-manifesto.md) -> [Runtime ADR Registry](./reference/architecture/adrs/README.md) -> [UMS Reference Model](./reference/knowledge/demo/ums-reference-model.md) |
| **Frontend Developer** | [Frontend Offline Resilience ADR](./reference/architecture/adrs/nodejs/0004-frontend-offline-resilience.md) -> [Microfrontends ADR](./reference/architecture/adrs/core/0055-microfrontends-architecture-strategy.md) -> [UMS Repository](https://github.com/beyondnetcode/ums) |
| **DevOps / SRE** | [Infrastructure Hub](./reference/infrastructure/README.md) -> [Operations Hub](./reference/operations/README.md) -> [UMS Architecture Portal](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |
| **QA / SDET** | [Testing Pyramid ADR](./reference/architecture/adrs/core/0018-testing-pyramid-quality-gates.md) -> [Contract Testing Guideline](./reference/governance/standards/engineering/contract-testing-guideline.md) -> [Integration and E2E Testing ADR](./reference/architecture/adrs/core/0053-integration-e2e-testing-strategy.md) |
| **Security Engineer** | [Vendor Risk Assessment](./reference/governance/standards/engineering/vendor-risk-assessment.md) -> [Multi-Tenancy ADR](./reference/architecture/adrs/core/0010-multi-tenancy-architecture-strategy.md) -> [Immutable Audit Trail ADR](./reference/architecture/adrs/core/0016-immutable-business-audit-trail.md) |
| **AI Contributor** | [AI-Augmented Standards](./reference/governance/standards/ai-augmented/README.md) -> [AI Architecture Assistant](./reference/governance/standards/ai-augmented/08-architecture-ai-assistant/README.md) -> [BMAD Adoption Reference](./reference/governance/standards/ai-augmented/frameworks/bmad-method/README.md) -> [Harness Rules](./.harness/rules/global-rules.md) |
| **New Joiner** | [Product Quick Start](./reference/governance/standards/onboarding/product-quick-start.md) -> [Repository Taxonomy](./reference/governance/standards/repository-taxonomy.md) -> [README Portal](./README.md) |

---

## 3. Architecture

| Area | Entry point |
|---|---|
| Architecture Hub | [reference/architecture](./reference/architecture/README.md) |
| Blueprints | [reference/architecture/blueprints](./reference/architecture/blueprints/README.md) |
| ADR Registry | [reference/architecture/adrs](./reference/architecture/adrs/README.md) |
| ADR Decision Matrix | [reference/architecture/adrs/adr-matrix](./reference/architecture/adrs/adr-matrix.md) |
| Core ADRs | [reference/architecture/adrs/core](./reference/architecture/adrs/core/README.md) |
| Node.js ADRs | [reference/architecture/adrs/nodejs](./reference/architecture/adrs/nodejs/README.md) |
| .NET ADRs | [reference/architecture/adrs/dotnet](./reference/architecture/adrs/dotnet/README.md) |
| Android ADRs | [reference/architecture/adrs/android](./reference/architecture/adrs/android/README.md) |
| Canonical Patterns | [reference/architecture/canonical-patterns](./reference/architecture/canonical-patterns/README.md) |

Key architecture references:

- [Reference Blueprint](./reference/architecture/blueprints/reference-blueprint.md)
- [Authoritative Tech Stack Index](./reference/architecture/blueprints/authoritative-tech-stack.md)
- [C4 Topology Spec](./reference/architecture/blueprints/c4-topology-spec.md)
- [Observability Architecture Flow](./reference/architecture/blueprints/observability-architecture-flow.md)
- [CAP Strategic Analysis](./reference/architecture/blueprints/cap-strategic-analysis.md)
- [Multi-Cloud Deployment Scenarios](./reference/architecture/blueprints/multi-cloud-deployment-scenarios.md)

---

## 4. Governance

| Area | Entry point |
|---|---|
| Standards | [reference/governance/standards](./reference/governance/standards/README.md) |
| Architecture Glossary | [reference/governance/glossary](./reference/governance/glossary.md) |
| Vision | [reference/governance/standards/vision](./reference/governance/standards/vision/README.md) |
| Engineering | [reference/governance/standards/engineering](./reference/governance/standards/engineering/README.md) |
| Onboarding | [reference/governance/standards/onboarding](./reference/governance/standards/onboarding/README.md) |
| AI-Augmented Engineering | [reference/governance/standards/ai-augmented](./reference/governance/standards/ai-augmented/README.md) |
| AI-DD Frameworks (BMAD adoption) | [reference/governance/standards/ai-augmented/frameworks](./reference/governance/standards/ai-augmented/frameworks/README.md) |
| **AI Architecture Assistant** | [reference/governance/standards/ai-augmented/08-architecture-ai-assistant](./reference/governance/standards/ai-augmented/08-architecture-ai-assistant/README.md) |
| SDLC | [reference/governance/sdlc](./reference/governance/sdlc/README.md) |
| **SDLC–Evolith Artifact Mapping** | [reference/governance/sdlc/sdlc-evolith-artifact-mapping](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.md) |
| **SDLC Artifact Templates** | [reference/governance/sdlc/04-artifact-templates](./reference/governance/sdlc/04-artifact-templates/README.md) |
| Documentation Standards | [reference/governance/sdlc/03-documentation](./reference/governance/sdlc/03-documentation/README.md) |
| **Architecture Communication Strategy** | [reference/governance/standards/communication](./reference/governance/standards/communication/architecture-communication-strategy.md) |
| **Visual Architecture Backlog** | [reference/governance/standards/communication/visuals](./reference/governance/standards/communication/visuals/README.md) |

Key governance references:

- [Engineering Manifesto](./reference/governance/standards/engineering/engineering-manifesto.md)
- [Repository Taxonomy](./reference/governance/standards/repository-taxonomy.md)
- [Product Quick Start](./reference/governance/standards/onboarding/product-quick-start.md)
- [Functional Story Writing Standard](./reference/governance/sdlc/03-documentation/functional-story-writing-standard.md)
- [SDLC Documentation Best Practices](./reference/governance/sdlc/03-documentation/sdlc-documentation-best-practices.md)
- [Architecture Communication Strategy](./reference/governance/standards/communication/architecture-communication-strategy.md)
- [Visual Architecture Backlog (8 Mermaid diagrams)](./reference/governance/standards/communication/visuals/README.md)

---

## 5. Applied Reference and Knowledge Base

| Area | Entry point |
|---|---|
| UMS Applied Reference Hub | [reference/knowledge/demo](./reference/knowledge/demo/README.md) |
| **UMS Technical Overview** | [reference/knowledge/demo/ums-technical-overview](./reference/knowledge/demo/ums-technical-overview.md) |
| UMS Reference Model | [reference/knowledge/demo/ums-reference-model](./reference/knowledge/demo/ums-reference-model.md) |
| Reference vs Applied Model Boundary | [reference/knowledge/demo/demo-vs-reference](./reference/knowledge/demo/demo-vs-reference.md) |
| Migration Record | [reference/knowledge/demo/migration-from-todo-to-ums](./reference/knowledge/demo/migration-from-todo-to-ums.md) |
| Research | [reference/knowledge/research](./reference/knowledge/research/README.md) |
| Proofs of Concept | [reference/knowledge/poc](./reference/knowledge/poc/README.md) |

Official UMS sources:

- [UMS Repository and Setup](https://github.com/beyondnetcode/ums/blob/main/README.md)
- [UMS Documentation Index](https://github.com/beyondnetcode/ums/blob/main/docs/MASTER_INDEX.md)
- [UMS Architecture Portal](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md)

---

## 6. Operations and Infrastructure

| Area | Entry point |
|---|---|
| Operations | [reference/operations](./reference/operations/README.md) |
| OpenTelemetry | [reference/operations/otel](./reference/operations/otel/README.md) |
| Grafana | [reference/operations/grafana](./reference/operations/grafana/README.md) |
| Tempo | [reference/operations/tempo](./reference/operations/tempo/README.md) |
| Infrastructure | [reference/infrastructure](./reference/infrastructure/README.md) |

---

## 7. Official Executable Reference

| Component | Official source |
|---|---|
| UMS product source and setup | [beyondnetcode/ums](https://github.com/beyondnetcode/ums) |
| UMS architecture and traceability | [Architecture Portal](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |

This repository intentionally does not maintain product application code. UMS owns the executable demonstration of the architecture.

---

## 8. Evolith Compliance Baseline

Every artifact and implementation instantiated from Evolith must respect these pillars:

1. [Agnostic Baseline](./reference/architecture/blueprints/authoritative-tech-stack-agnostic.md)
2. [Reference Architecture](./reference/architecture/blueprints/reference-blueprint.md)
3. [Engineering Manifesto](./reference/governance/standards/engineering/engineering-manifesto.md)
4. [Definition of Done](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.md)
5. [Repository Taxonomy](./reference/governance/standards/repository-taxonomy.md)

---

<div align="center">
 <a href="./README.md">Back to Evolith Main Portal</a>
</div>
