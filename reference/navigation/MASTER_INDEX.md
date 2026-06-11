# Evolith Global Master Index

> Bilingual navigation: [Español](./MASTER_INDEX.es.md)  
> Main portal: [README](../../README.md)

This is the complete navigation index for **Evolith** — the enterprise progressive architecture platform. Use it when you already know what type of artifact you need, or when you want to move across repository areas without browsing directories manually.

The index follows the portal's order: orientation first (sections 1–2), then the three domains from generic to specific — **Core**, **SDLC**, **Products** (sections 3–5) — and finally machine-readable rules and navigation meta-surfaces (sections 6–7).

Every document entry uses the same five fields: **Document** (linked title), **Description** (what the document does), **Goal / Objective** (why it exists), **Type** (document category), and **Mandatory** (Yes when the document is normative or required reading for its domain; No when it is informative or optional).

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
<summary><strong>3. Evolith Core — Architecture Constitution</strong></summary>

> **Goal:** keep every universal, provider-neutral rule in one governed corpus. Start at the [Evolith Core Hub](../core/README.md) for the domain's goal, boundaries, and dependency rule.

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Evolith Core Hub](../core/README.md) | Defines what Core is, what it is not, its domains, invariants, and dependency rule | Anchor the provider-neutral constitution | Domain hub | Yes |
| [Architecture Hub](../architecture/README.md) | Groups directives, canonical patterns, blueprints, and the agnostic tech baseline | Guide corporate design | Area hub | Yes |
| [General ADR Registry](../architecture/adrs/README.md) | Groups the decision matrix and all Evolith ADRs (Core, Node, .NET, Android) | Preserve decision history and governance | Area hub | Yes |
| [Standards and Governance Center](../governance/standards/README.md) | Groups technical directives, maturity assessment, glossary, manifestos, and onboarding | Align teams to unified policies | Area hub | Yes |
| [Operations Hub](../operations/README.md) | Groups observability guides (OpenTelemetry, Tempo, Grafana) and SRE deployments | Standardize operations | Area hub | No |
| [Infrastructure Hub](../infrastructure/README.md) | Describes the phase-based local platform: database, cache, broker, gateway, and secrets | Standardize the local runtime | Area hub | No |

</details>

<details>
<summary><strong>4. Evolith SDLC — Lifecycle Governance</strong></summary>

> **Goal:** govern the five lifecycle phases with explicit gates, artifacts, and traceability. Start at the [SDLC Governance Center](../governance/sdlc/README.md).

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [SDLC Governance Center](../governance/sdlc/README.md) | Authoritative documentation on phases, gates, roles, and deliverable mapping | Govern the full lifecycle | Domain hub | Yes |
| [Artifact Templates Hub](../governance/sdlc/04-artifact-templates/README.md) | Canonical templates for every phase artifact, from Discovery Canvas to Release Notes | Standardize deliverables | Area hub | Yes |
| [SDLC Quality Gates](../governance/sdlc/quality-gates.md) | Approval thresholds each phase must satisfy before advancing | Enforce phase quality | Standard | Yes |
| [SDLC Traceability Model](../governance/sdlc/traceability-model.md) | How requirements, stories, tests, and releases stay linked end to end | Guarantee end-to-end traceability | Standard | Yes |
| [SDLC Artifact Mapping](../governance/sdlc/sdlc-evolith-artifact-mapping.md) | Mapping between phases and expected deliverables | Link phases and deliverables | Reference | No |

</details>

<details>
<summary><strong>5. Evolith Products — Suite, Designs, and Applied Reference</strong></summary>

> **Goal:** navigate from portfolio strategy down to each product's internals and the applied evidence that validates them. Start at the [Product Suite Hub](../product-suite/README.md).

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Product Suite Hub](../product-suite/README.md) | Portfolio vision, strategy, positioning, methods, suite architecture, and communication | Direct the ecosystem | Domain hub | Yes |
| [Product Designs Hub](../products/README.md) | Functional and technical design per product; entry to the Tracker hub | Contain product internals | Area hub | Yes |
| [Tracker Hub](../products/evolith-tracker/README.md) | Tracker product architecture and technical interfaces | Design the governance product | Product hub | No |
| [Smart CLI Hub](../../sdk/cli/README.md) | CLI documentation, architecture, vision, and state analysis | Understand the tooling product | Product hub | No |
| [Platforms Hub](../platforms/README.md) | Named tools, vendors, adapters, licensing, and deployment profiles | Isolate provider decisions | Area hub | Yes |
| [UMS Reference Hub](../knowledge/demo/README.md) | Showcases the adoption of Evolith directives in a practical demonstrative environment (UMS) | Demonstrate real implementation | Applied reference | No |
| [Knowledge and Research Hub](../knowledge/README.md) | Platform adoption metrics, PoCs, and research | Capture evidence and learning | Area hub | No |
| [UMS Repository](https://github.com/beyondnetcode/ums) | Official external repository that implements the architecture ecosystem | Provide executable evidence | External repository | No |

</details>

<details>
<summary><strong>6. Rulesets and Validation (Machine-Readable)</strong></summary>

> **Goal:** turn the constitution into automated, CI-enforceable rules.

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Rulesets Hub](../../rulesets/README.md) | Central index for all schemas, architecture rules, CI/CD rules, SDLC, and automated governance | Validate compliance automatically | Rules hub | Yes |

</details>

<details>
<summary><strong>7. Navigation and Documentation Surfaces</strong></summary>

> **Goal:** keep navigation, bilingual coverage, and documentation releases observable.

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Navigation Hub](./README.md) | Home of repository-level navigation documents | Centralize navigation | Navigation hub | Yes |
| [Bilingual Index](./BILINGUAL_INDEX.md) | Auto-generated EN/ES pairing status for the reference corpus | Audit bilingual coverage | Auto-generated index | No |
| [Quick Access by Stack](../quick-access/README.md) | Shortest path to React, .NET, and Node.js standards | Reduce navigation friction | Navigation index | No |
| [Documentation Version Log](./DOCUMENTATION_VERSIONS.md) | Documentation release history and policy | Trace documentation releases | Version log | No |
| [Documentation Taxonomy](../documentation-taxonomy.md) | Defines what kind of document belongs where | Keep the corpus organized | Governance standard | Yes |
| [Getting Started by Role](../getting-started/README.md) | Role-based reading paths for new readers | Accelerate onboarding | Onboarding guide | No |

</details>

---

<div align="center">
  <a href="../../README.md">Back to Evolith Main Portal</a>
</div>
