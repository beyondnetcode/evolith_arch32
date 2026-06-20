# Evolith Global Master Index

> Bilingual navigation: [Español](./MASTER_INDEX.es.md)  
> Main portal: [README](../../README.md)

This is the complete navigation index for **Evolith** — the enterprise progressive architecture platform. Use it when you already know what type of artifact you need, or when you want to move across repository areas without browsing directories manually.

The index is organized for fast navigation: orientation first (sections 1–2), then architecture split between **agnostic Core** and **platform/runtime specific** (sections 3–4), the **SDLC phase by phase with every artifact inside** (section 5), **products** (section 6), and finally machine-readable rules and navigation meta-surfaces (sections 7–8).

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
<summary><strong>3. Evolith Core — Agnostic Architecture (provider- and runtime-neutral)</strong></summary>

> **Goal:** keep every universal, provider-neutral rule in one governed corpus. Start at the [Evolith Core Hub](../core/README.md) for the domain's goal, boundaries, and dependency rule. Anything that names a runtime or vendor lives in section 4, not here.

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Evolith Core Hub](../core/README.md) | Defines what Core is, what it is not, its domains, invariants, and dependency rule | Anchor the provider-neutral constitution | Domain hub | Yes |
| [Architecture Hub](../architecture/README.md) | Groups directives, canonical patterns, blueprints, and the agnostic tech baseline | Guide corporate design | Area hub | Yes |
| [Topology Hub](../architecture/topologies/README.md) | Multi-Topology Reference Corpus | Govern topology dimensions and composition | Area hub | Yes |
| [Agnostic Architecture Baseline](../architecture/blueprints/authoritative-tech-stack-agnostic.md) | Runtime-agnostic architecture constraints for every stack | Constrain all stacks uniformly | Universal baseline | Yes |
| [Core ADRs (agnostic)](../architecture/adrs/core/README.md) | The 45 runtime-agnostic architecture decisions | Preserve universal decision history | Decision registry | Yes |
| [ADR Decision Matrix](../architecture/adrs/adr-matrix.md) | Finds the controlling ADR by architectural concern | Speed up decision discovery | Decision index | Yes |
| [Standards and Governance Center](../governance/standards/README.md) | Groups technical directives, maturity assessment, glossary, manifestos, and onboarding | Align teams to unified policies | Area hub | Yes |
| [Operations Hub](../operations/README.md) | Groups observability guides (OpenTelemetry, Tempo, Grafana) and SRE deployments | Standardize operations | Area hub | No |
| [Infrastructure Hub](../infrastructure/README.md) | Describes the phase-based local platform: database, cache, broker, gateway, and secrets | Standardize the local runtime | Area hub | No |

</details>

<details>
<summary><strong>4. Platform- and Runtime-Specific (Node.js · .NET · Android · named vendors)</strong></summary>

> **Goal:** isolate everything that names a runtime, tool, or vendor — so Core stays neutral and platform choices stay replaceable.

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [General ADR Registry](../architecture/adrs/README.md) | All ADRs classified by scope: agnostic Core plus runtime ecosystems | Find the controlling decision per scope | Area hub | Yes |
| [Node.js / TypeScript ADRs](../architecture/adrs/nodejs/README.md) | Decisions tied to the Node.js/TypeScript runtime | Govern the Node.js ecosystem | Decision registry | Yes |
| [.NET (C#) ADRs](../architecture/adrs/dotnet/README.md) | Decisions tied to the .NET runtime | Govern the .NET ecosystem | Decision registry | Yes |
| [Android (Kotlin) ADRs](../architecture/adrs/android/README.md) | Decisions tied to native mobile clients | Govern the Android ecosystem | Decision registry | Yes |
| [Runtime Profiles Index](../architecture/blueprints/authoritative-tech-stack.md) | Approved tech stack profiles per runtime (Node.js, .NET, Android) | Bound technology choices per runtime | Blueprint index | Yes |
| [Canonical Patterns](../architecture/canonical-patterns/README.md) | Runtime-specific reference implementations of the ADRs | Reuse proven implementations | Pattern index | No |
| [Platforms Hub](../platforms/README.md) | Named tools, vendors, adapters, licensing, and deployment profiles | Isolate provider decisions | Area hub | Yes |
| [Validated Tool Catalog](../platforms/validated-tool-catalog.md) | Validated tools per phase, pattern, and runtime (consumed by the Smart CLI) | Bound tool choices to validated options | Corporate standard | Yes |
| [Quick Access by Stack](../quick-access/README.md) | Shortest path to the React, .NET, and Node.js standards | Reduce navigation friction | Navigation index | No |

</details>

<details>
<summary><strong>5. Evolith SDLC — Navigation by Phase (everything per phase)</strong></summary>

> **Goal:** govern the five lifecycle phases with explicit gates, artifacts, and traceability. Start at the [SDLC Governance Center](../governance/sdlc/README.md); below, every phase lists all of its artifacts.

**Cross-phase governance** — applies to every phase:

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [SDLC Governance Center](../governance/sdlc/README.md) | Authoritative documentation on phases, gates, roles, and deliverable mapping | Govern the full lifecycle | Domain hub | Yes |
| [Artifact Templates Hub](../governance/sdlc/04-artifact-templates/README.md) | Canonical templates for every phase artifact | Standardize deliverables | Area hub | Yes |
| [SDLC Quality Gates](../governance/sdlc/quality-gates.md) | Approval thresholds each phase must satisfy before advancing | Enforce phase quality | Standard | Yes |
| [SDLC Traceability Model](../governance/sdlc/traceability-model.md) | How requirements, stories, tests, and releases stay linked end to end | Guarantee end-to-end traceability | Standard | Yes |
| [SDLC Responsibility Matrix](../governance/sdlc/responsibility-matrix.md) | Accountability and evidence expectations per gate | Assign gate ownership | Standard | Yes |
| [SDLC Artifact Mapping](../governance/sdlc/sdlc-evolith-artifact-mapping.md) | Mapping between phases and expected deliverables | Link phases and deliverables | Reference | No |
| [SDLC Executive View](../governance/sdlc/executive-view.md) | Director-level operating model for funding, risk, and gates | Operate the SDLC at director level | Reference | No |

**Phase 01 — Conception and Discovery** · exit gate: Business Sign-Off

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Discovery Canvas](../governance/sdlc/04-artifact-templates/discovery-canvas-template.md) | Discovery canvas | Define vision and feasibility | Template | Yes |
| [PRD — Product Requirements Document](../governance/sdlc/04-artifact-templates/prd-template.md) | Product requirements | Specify functional needs | Template | Yes |
| [Evolith User Story](../governance/sdlc/04-artifact-templates/evolith-user-story-template.md) | User story template | Standardize agile stories | Template | Yes |
| [Agile Backlog](../governance/sdlc/04-artifact-templates/agile-backlog-template.md) | Backlog template | Organize deliverables | Template | Yes |
| [Technical Feasibility Canvas](../governance/sdlc/04-artifact-templates/technical-feasibility-template.md) | Feasibility analysis | Document technical stack constraints and quality attributes (NFRs) | Template | No |
| [Ballpark Estimation](../governance/sdlc/04-artifact-templates/ballpark-estimation-template.md) | High-level estimation | Project costs and times | Template | No |
| [CLI Impact Analysis](../governance/sdlc/04-artifact-templates/cli-impact-analysis.md) | CLI impact analysis | Evaluate cross-repo changes | Template | No |
| [Validation Schemas & Rules](../../rulesets/README.md) | Canvas, PRD, and Backlog schemas plus gate rules | Validate compliance in CI | Rules and schemas | Yes |

**Phase 02 — Design and Architecture** · exit gate: Design Baseline Approved

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Functional Story Template](../governance/sdlc/04-artifact-templates/functional-story-template.md) | Business behavior specification | Specify behavior verifiably | Template | Yes |
| [Functional Story Writing Standard](../governance/sdlc/03-documentation/functional-story-writing-standard.md) | Normative writing rules for functional stories | Ensure specification quality | Standard | Yes |
| [SDLC Documentation Best Practices](../governance/sdlc/03-documentation/sdlc-documentation-best-practices.md) | Documentation-as-code rules | Keep documentation honest | Standard | Yes |
| [ADR Template](../governance/sdlc/04-artifact-templates/adr-template.md) | Architecture decision record template | Document boundary-crossing decisions | Template | No |
| [DDD Model Template](../governance/sdlc/04-artifact-templates/ddd-model-template.md) | Domain modeling template | Model system domains | Template | No |
| [Validation Schemas & Rules](../../rulesets/README.md) | ADR and Functional Story schemas | Validate structure in CI | Rules and schemas | Yes |

**Phase 03 — Construction** · exit gate: Successful Build

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Technical Story Template](../governance/sdlc/04-artifact-templates/technical-story-template.md) | Engineering work item template | Structure technical work | Template | Yes |
| [Construction-Focused SDLC Framework](../governance/sdlc/02-engineering/construction-focused-sdlc-framework.md) | Phase progression, build loop, and Definition of Done | Regulate technical execution | Standard | Yes |
| [SDLC Quality Gates](../governance/sdlc/quality-gates.md) | Coverage, complexity, CVE, and debt thresholds | Enforce build quality | Standard | Yes |
| [Validation Schemas & Rules](../../rulesets/README.md) | Technical Story schema, DoD rules, thresholds, dependency pinning | Validate compliance in CI | Rules and schemas | Yes |

**Phase 04 — Validation and QA** · exit gate: RC Stamped

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Test Summary Report Template](../governance/sdlc/04-artifact-templates/test-summary-report-template.md) | Consolidated QA validation record | Consolidate QA evidence | Template | Yes |
| [SDLC Traceability Model](../governance/sdlc/traceability-model.md) | Requirement-to-test evidence chain | Link requirements and tests | Standard | Yes |
| [Validation Schemas & Rules](../../rulesets/README.md) | Test Summary Report schema | Validate compliance in CI | Rules and schemas | Yes |

**Phase 05 — Delivery and Operations** · exit gate: Production Live

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Release Notes Template](../governance/sdlc/04-artifact-templates/release-notes-template.md) | Production deployment record | Communicate the release | Template | Yes |
| [Validation Schemas & Rules](../../rulesets/README.md) | Release Notes schema, CI/CD gate rules (ADR-0005), GitFlow (ADR-0050) | Automate pipeline validation | Rules and schemas | Yes |

</details>

<details>
<summary><strong>6. Evolith Products — Suite, Designs, and Applied Reference</strong></summary>

> **Goal:** navigate from portfolio strategy down to each product's internals and the applied evidence that validates them. Start at the [Product Suite Hub](../product-suite/README.md). Suite tracking (gap board and maturity assessment) is surfaced in the [root README](../../README.md).

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Product Suite Hub](../product-suite/README.md) | Portfolio vision, strategy, positioning, methods, suite architecture, and communication | Direct the ecosystem | Domain hub | Yes |
| [Evolith Core Architecture](../architecture/blueprints/evolith-core-architecture.md) | Platform C4 Context, Containers, Components, and Interactions | Platform architecture blueprint | Architecture blueprint | Yes |
| [Product Designs Hub](../products/README.md) | Functional and technical design per product; entry to the Tracker hub | Contain product internals | Area hub | Yes |
| [Tracker Hub](../products/evolith-tracker/README.md) | Tracker product architecture and technical interfaces | Design the governance product | Product hub | No |
| [Smart CLI Hub](../../sdk/cli/README.md) | CLI documentation, architecture, vision, and state analysis | Understand the tooling product | Product hub | No |
| [Gap Tracking Board](../governance/standards/vision/gap-tracking.md) | Execution queue and dashboard of every open gap in the suite | See what remains and in which order | Tracking board | Yes |
| [Maturity Assessment](../governance/standards/vision/maturity-assessment.md) | TOGAF ACMM matrix, WAF review, and patterns audit | Measure suite maturity | Maturity matrix and audit | Yes |
| [UMS Reference Hub](../knowledge/demo/README.md) | Showcases the adoption of Evolith directives in a practical demonstrative environment (UMS) | Demonstrate real implementation | Applied reference | No |
| [Knowledge and Research Hub](../knowledge/README.md) | Platform adoption metrics, PoCs, and research | Capture evidence and learning | Area hub | No |
| [UMS Repository](https://github.com/beyondnetcode/ums) | Official external repository that implements the architecture ecosystem | Provide executable evidence | External repository | No |

</details>

<details>
<summary><strong>7. Rulesets and Validation (Machine-Readable)</strong></summary>

> **Goal:** turn the constitution into automated, CI-enforceable rules.

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Rulesets Hub](../../rulesets/README.md) | Central index for all schemas, architecture rules, CI/CD rules, SDLC, and automated governance | Validate compliance automatically | Rules hub | Yes |

</details>

<details>
<summary><strong>8. Navigation and Documentation Surfaces</strong></summary>

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
  [Back to Evolith Main Portal](../../README.md)
</div>
