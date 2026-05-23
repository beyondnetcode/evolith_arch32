# Global Master Index

> Bilingual navigation: [Español](./MASTER_INDEX.es.md) 
> Main portal: [README](./README.md)

This is the complete navigation index for this progressive architecture reference. Use it when you already know what type of artifact you need, or when you want to move across repository areas without browsing directories manually.

---

## 1. Start by Intent

| Intent | Primary entry point | Supporting reference |
|---|---|---|
| Choose an efficient reading path | [Getting Started by Role](./reference/getting-started/README.md) | [Architecture Glossary](./reference/governance/glossary.md) |
| Understand the architecture vision | [Architectural Directives](./reference/governance/standards/vision/architectural-directives.md) | [Evolutionary Strategy Roadmap](./reference/governance/standards/vision/evolutionary-strategy-roadmap.md) |
| Understand the progressive architecture model | [Reference Blueprint](./reference/architecture/blueprints/reference-blueprint.md) | [Microservice Extraction Readiness Criteria](./reference/architecture/adrs/core/0045-microservice-extraction-readiness-criteria.md) |
| Review technology choices | [Authoritative Tech Stack](./reference/architecture/blueprints/authoritative-tech-stack.md) | [Agnostic Baseline](./reference/architecture/blueprints/authoritative-tech-stack-agnostic.md) |
| Review architectural decisions | [ADR Registry](./reference/architecture/adrs/README.md) | [Core ADRs](./reference/architecture/adrs/core/README.md) |
| Learn engineering standards | [Engineering Manifesto](./reference/governance/standards/engineering/engineering-manifesto.md) | [Contract Testing Guideline](./reference/governance/standards/engineering/contract-testing-guideline.md) |
| Understand SDLC expectations | [SDLC Framework](./reference/governance/sdlc/README.md) | [Construction-Focused SDLC](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.md) |
| Explore the demo sandbox | [Demo Hub](./reference/knowledge/demo/README.md) | [Sandbox Verification Matrix](./reference/knowledge/demo/technical/sandbox-verification.md) |
| Separate policy from implementation examples | [Demo vs Reference](./reference/knowledge/demo/demo-vs-reference.md) | [Repository Taxonomy](./reference/governance/standards/repository-taxonomy.md) |
| Operate or deploy locally | [Operations Hub](./reference/operations/README.md) | [Infrastructure Hub](./reference/infrastructure/README.md) |

---

## 2. Recommended Reading by Role

| Role | Reading path |
|---|---|
| **Executive / Sponsor** | [Architectural Directives](./reference/governance/standards/vision/architectural-directives.md) -> [Evolutionary Roadmap](./reference/governance/standards/vision/evolutionary-strategy-roadmap.md) -> [Maturity Matrix](./reference/governance/standards/vision/maturity-matrix.md) |
| **Product Owner / PM** | [Demo PRD](./reference/knowledge/demo/project/01-prd-demo-sandbox.md) -> [Business Glossary](./reference/knowledge/demo/functional/business-glossary.md) -> [Backlog and Epics](./reference/knowledge/demo/project/02-backlog-and-epics.md) |
| **Software Architect** | [Reference Blueprint](./reference/architecture/blueprints/reference-blueprint.md) -> [ADR Registry](./reference/architecture/adrs/README.md) -> [Microservice Extraction Criteria](./reference/architecture/adrs/core/0045-microservice-extraction-readiness-criteria.md) |
| **Principal / Staff Engineer** | [Agnostic Baseline](./reference/architecture/blueprints/authoritative-tech-stack-agnostic.md) -> [Tactical Design Patterns](./reference/architecture/adrs/core/0019-tactical-design-patterns-future-proofing.md) -> [Simplicity Checklist](./reference/architecture/blueprints/simplicity-checklist-phase-01.md) |
| **Backend Developer** | [Engineering Manifesto](./reference/governance/standards/engineering/engineering-manifesto.md) -> [Clean Architecture ADR](./reference/architecture/adrs/nodejs/0002-clean-architecture-nestjs.md) -> [Sandbox Verification](./reference/knowledge/demo/technical/sandbox-verification.md) |
| **Frontend Developer** | [Frontend Offline Resilience ADR](./reference/architecture/adrs/nodejs/0004-frontend-offline-resilience.md) -> [Gateway/BFF ADR](./reference/architecture/adrs/nodejs/0008-progressive-multimodule-evolution-gateway-bff.md) -> [Microfrontends ADR](./reference/architecture/adrs/core/0055-microfrontends-architecture-strategy.md) -> [To-Do Web App](./src/apps/todo-web/README.md) |
| **DevOps / SRE** | [Infrastructure Hub](./reference/infrastructure/README.md) -> [Operations Hub](./reference/operations/README.md) -> [Observability ADR](./reference/architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.md) |
| **QA / SDET** | [Testing Pyramid ADR](./reference/architecture/adrs/core/0018-testing-pyramid-quality-gates.md) -> [Contract Testing Guideline](./reference/governance/standards/engineering/contract-testing-guideline.md) -> [Integration and E2E Testing ADR](./reference/architecture/adrs/core/0053-integration-e2e-testing-strategy.md) |
| **Security Engineer** | [Vendor Risk Assessment](./reference/governance/standards/engineering/vendor-risk-assessment.md) -> [Multi-Tenancy ADR](./reference/architecture/adrs/core/0010-multi-tenancy-architecture-strategy.md) -> [Immutable Audit Trail ADR](./reference/architecture/adrs/core/0016-immutable-business-audit-trail.md) |
| **AI Contributor** | [AI-Augmented Standards](./reference/governance/standards/ai-augmented/README.md) -> [BMAD Adoption Reference](./reference/governance/standards/ai-augmented/frameworks/bmad-method/README.md) -> [Agents Catalog](./reference/governance/standards/ai-augmented/frameworks/bmad-method/agents-catalog.md) -> [Harness Rules](./.harness/rules/global-rules.md) |
| **New Joiner** | [Product Quick Start](./reference/governance/standards/onboarding/product-quick-start.md) -> [Repository Taxonomy](./reference/governance/standards/repository-taxonomy.md) -> [README Portal](./README.md) |

---

## 3. Architecture

| Area | Entry point |
|---|---|
| Blueprints | [reference/architecture/blueprints](./reference/architecture/blueprints/README.md) |
| ADR Registry | [reference/architecture/adrs](./reference/architecture/adrs/README.md) |
| ADR Decision Matrix | [reference/architecture/adrs/adr-matrix](./reference/architecture/adrs/adr-matrix.md) |
| Core ADRs | [reference/architecture/adrs/core](./reference/architecture/adrs/core/README.md) |
| Node.js ADRs | [reference/architecture/adrs/nodejs](./reference/architecture/adrs/nodejs/README.md) |
| .NET ADRs | [reference/architecture/adrs/dotnet](./reference/architecture/adrs/dotnet/README.md) |
| Android ADRs | [reference/architecture/adrs/android](./reference/architecture/adrs/android/README.md) |

Key architecture references:

- [Reference Blueprint](./reference/architecture/blueprints/reference-blueprint.md)
- [Authoritative Tech Stack Index](./reference/architecture/blueprints/authoritative-tech-stack.md)
- [C4 Topology Spec](./reference/architecture/blueprints/c4-topology-spec.md)
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
| SDLC | [reference/governance/sdlc](./reference/governance/sdlc/README.md) |
| Documentation Standards | [reference/governance/sdlc/03-documentation](./reference/governance/sdlc/03-documentation/README.md) |

Key governance references:

- [Engineering Manifesto](./reference/governance/standards/engineering/engineering-manifesto.md)
- [Repository Taxonomy](./reference/governance/standards/repository-taxonomy.md)
- [Product Quick Start](./reference/governance/standards/onboarding/product-quick-start.md)
- [Functional Story Writing Standard](./reference/governance/sdlc/03-documentation/functional-story-writing-standard.md)
- [SDLC Documentation Best Practices](./reference/governance/sdlc/03-documentation/sdlc-documentation-best-practices.md)

---

## 5. Demo and Knowledge Base

| Area | Entry point |
|---|---|
| Demo Hub | [reference/knowledge/demo](./reference/knowledge/demo/README.md) |
| Demo vs Reference Boundary | [reference/knowledge/demo/demo-vs-reference](./reference/knowledge/demo/demo-vs-reference.md) |
| Demo Project Planning | [reference/knowledge/demo/project](./reference/knowledge/demo/project/README.md) |
| Demo Functional Layer | [reference/knowledge/demo/functional](./reference/knowledge/demo/functional/README.md) |
| Demo Technical Layer | [reference/knowledge/demo/technical](./reference/knowledge/demo/technical/README.md) |
| Research | [reference/knowledge/research](./reference/knowledge/research/README.md) |
| Proofs of Concept | [reference/knowledge/poc](./reference/knowledge/poc/README.md) |

Key demo references:

- [Demo PRD](./reference/knowledge/demo/project/01-prd-demo-sandbox.md)
- [Backlog and Epics](./reference/knowledge/demo/project/02-backlog-and-epics.md)
- [Business Glossary](./reference/knowledge/demo/functional/business-glossary.md)
- [Bounded Context Map](./reference/knowledge/demo/technical/bounded-context-map.md)
- [Sandbox Verification Matrix](./reference/knowledge/demo/technical/sandbox-verification.md)

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

## 7. Source Code

| Component | Entry point |
|---|---|
| To-Do API | [src/apps/todo-api](./src/apps/todo-api/README.md) |
| To-Do Web | [src/apps/todo-web](./src/apps/todo-web/README.md) |
| Shared AOP Library | [src/libs/aop](./src/libs/aop/package.json) |

---

## 8. Mandatory Compliance Baseline

Every artifact and implementation should respect these pillars:

1. [Agnostic Baseline](./reference/architecture/blueprints/authoritative-tech-stack-agnostic.md)
2. [Reference Architecture](./reference/architecture/blueprints/reference-blueprint.md)
3. [Engineering Manifesto](./reference/governance/standards/engineering/engineering-manifesto.md)
4. [Definition of Done](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.md)
5. [Repository Taxonomy](./reference/governance/standards/repository-taxonomy.md)

---

<div align="center">
 <a href="./README.md">Back to Main Portal</a>
</div>
