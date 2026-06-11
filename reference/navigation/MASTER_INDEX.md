# Evolith Global Master Index

> Bilingual navigation: [Español](./MASTER_INDEX.es.md)  
> Main portal: [README](../../README.md)

This is the complete navigation index for **Evolith** — the enterprise progressive architecture platform. Use it when you already know what type of artifact you need, or when you want to move across repository areas without browsing directories manually.

---

<details>
<summary><strong>1. Start by Intent</strong></summary>

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
| Separate policy from implementation evidence | [Canonical Reference vs UMS Applied Model](../knowledge/demo/demo-vs-reference.md) | [Repository Taxonomy](../governance/standards/repository-taxonomy.es.md) |
| Operate or deploy locally | [Operations Hub](../operations/README.md) | [Infrastructure Hub](../infrastructure/README.md) |
| Explain the standard to a new audience | [Architecture Communication Strategy](../governance/standards/communication/architecture-communication-strategy.md) | [Visual Architecture Backlog](../governance/standards/communication/visuals/README.md) |

</details>

<details>
<summary><strong>2. Recommended Reading by Role</strong></summary>

| Role | Reading path |
|---|---|
| **Executive / Sponsor** | [Architectural Directives](../governance/standards/vision/architectural-directives.md) -> [Evolutionary Roadmap](../governance/standards/vision/evolutionary-strategy-roadmap.md) -> [Maturity Assessment](../governance/standards/vision/maturity-assessment.md) |
| **Product Owner / PM** | [UMS Reference Model](../knowledge/demo/ums-reference-model.md) -> [UMS Documentation Index](https://github.com/beyondnetcode/ums/blob/main/docs/MASTER_INDEX.md) -> [Reference vs Applied Model](../knowledge/demo/demo-vs-reference.md) |
| **Software Architect** | [Architecture Hub](../architecture/README.md) -> [ADR Registry](../architecture/adrs/README.md) -> [UMS Architecture Portal](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |
| **Principal / Staff Engineer** | [Agnostic Baseline](../architecture/blueprints/authoritative-tech-stack-agnostic.md) -> [Tactical Design Patterns](../architecture/adrs/core/0019-tactical-design-patterns-future-proofing.md) -> [Simplicity Checklist](../architecture/blueprints/simplicity-checklist-phase-01.md) |
| **Backend Developer** | [Engineering Manifesto](../governance/standards/engineering/engineering-manifesto.md) -> [Runtime ADR Registry](../architecture/adrs/README.md) -> [UMS Reference Model](../knowledge/demo/ums-reference-model.md) |
| **Frontend Developer** | [Frontend Offline Resilience ADR](../architecture/adrs/nodejs/0004-frontend-offline-resilience.md) -> [Microfrontends ADR](../architecture/adrs/core/0055-microfrontends-architecture-strategy.md) -> [UMS Repository](https://github.com/beyondnetcode/ums) |
| **DevOps / SRE** | [Infrastructure Hub](../infrastructure/README.md) -> [Operations Hub](../operations/README.md) -> [UMS Architecture Portal](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |
| **QA / SDET** | [Testing Pyramid ADR](../architecture/adrs/core/0018-testing-pyramid-quality-gates.md) -> [Contract Testing Guideline](../governance/standards/engineering/contract-testing-guideline.md) -> [Integration and E2E Testing ADR](../architecture/adrs/core/0053-integration-e2e-testing-strategy.md) |
| **Security Engineer** | [Vendor Risk Assessment](../governance/standards/engineering/vendor-risk-assessment.md) -> [Multi-Tenancy ADR](../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.md) -> [Immutable Audit Trail ADR](../architecture/adrs/core/0016-immutable-business-audit-trail.md) |
| **AI Contributor** | [AI-Augmented Standards](../governance/standards/ai-augmented/README.md) -> [AI Architecture Assistant](../governance/standards/ai-augmented/08-architecture-ai-assistant/README.md) -> [BMAD Adoption Reference](../governance/standards/ai-augmented/frameworks/bmad-method/README.md) -> [Harness Rules](../../.harness/rules/global-rules.md) |
| **New Joiner** | [Product Quick Start](../governance/standards/onboarding/product-quick-start.md) -> [Repository Taxonomy](../governance/standards/repository-taxonomy.es.md) -> [README Portal](../../README.md) |

</details>

<details>
<summary><strong>3. Core Architecture</strong></summary>

| Area | Single Entry Point | Description |
|---|---|---|
| Directives and Blueprints | [Architecture Hub](../architecture/README.md) | Central hub grouping directives, canonical patterns, blueprints, and the agnostic tech baseline. |
| Architecture Decisions (ADRs) | [General ADR Registry](../architecture/adrs/README.md) | The general index that groups the decision matrix and all Evolith ADRs (Core, Node, .NET, Android). |

</details>

<details>
<summary><strong>4. Governance and Standards</strong></summary>

| Area | Single Entry Point | Description |
|---|---|---|
| Governance & Standards | [Standards and Governance Center](../governance/standards/README.md) | Access to technical directives, maturity assessment, glossary, manifestos, and onboarding. |
| SDLC | [SDLC Governance Center](../governance/sdlc/README.md) | Authoritative documentation on phases, artifact templates, and deliverable mapping. |
| Operations & Infrastructure | [Operations Hub](../operations/README.md) | Groups infrastructure, OpenTelemetry guides, Tempo, Grafana, and SRE deployments. |

</details>

<details>
<summary><strong>5. Applied Reference and Executables</strong></summary>

| Area | Single Entry Point | Description |
|---|---|---|
| UMS Applied Reference | [UMS Reference Hub](../knowledge/demo/README.md) | Showcases the adoption of Evolith directives in a practical demonstrative environment (UMS). |
| Adoption Cases and Knowledge | [Knowledge and Research Hub](../knowledge/README.md) | Platform adoption metrics, PoCs, and research. |
| UMS Product (Code) | [UMS Repository](https://github.com/beyondnetcode/ums) | Official external repository that implements the architecture ecosystem. |

</details>

<details>
<summary><strong>6. Rulesets and Validation (Machine-Readable)</strong></summary>

| Area | Single Entry Point | Description |
|---|---|---|
| General Rulesets Hub | [Rulesets Hub](../../rulesets/README.md) | Central index for all schemas, architecture rules, CI/CD rules, SDLC, and automated governance. |

</details>

---

<div align="center">
  <a href="../../README.md">Back to Evolith Main Portal</a>
</div>
