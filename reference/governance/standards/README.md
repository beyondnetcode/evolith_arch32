# Corporate Standards Center (EAC)

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

Welcome to the central repository of architectural truth. Every document present here is considered **Mandatory Normative** for building software within the organization, unless the document explicitly declares an **Optional** or **Conditional** classification.

## Goal and Objectives

> **Goal:** align every team to one set of normative engineering standards, from vision down to onboarding.

**Objectives:**

- Order the standards corpus by lifecycle phase (vision → blueprint → decisions → engineering → delivery → onboarding).
- Make the mandatory/optional classification of every document explicit.
- Keep tactical playbooks and audits next to the principles that justify them.

---

## Exhaustive Corporate Navigation Map

### Phase 00: Vision and Internal Audit

Non-negotiable principles of growth, consistency diagnostics, and self-assessment models.

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Vision, Maturity, and Gaps Hub](./vision/README.md) | Canonical hub for maturity reports, audits, gap tracking, opportunities, and evidence | Start governance health reviews | Reporting hub | Yes |
| [Architectural Directives and Evolution](./vision/architectural-directives.md) | Non-negotiable architecture growth principles | Set the strategic direction | Directive | Yes |
| [Evolutionary Strategy and Dashboard](./vision/evolutionary-strategy-roadmap.md) | Global vision, strategy roadmap, and control dashboard | Align teams to the roadmap | Vision and strategy | Yes |
| [Maturity Assessment](./vision/maturity-assessment.md) | Consolidated maturity evaluation (TOGAF ACMM, WAF, patterns) | Measure architectural maturity | Assessment | Yes |

### Phase 01: Blueprint and Topology (arc42)

The structural design of the system detailed in C4 and CAP views.

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Corporate Multi-Runtime Blueprint](../../architecture/blueprints/reference-blueprint.md) | The reference blueprint across runtimes (mandatory reading) | Define the structural baseline | Blueprint | Yes |
| [C4 Spec Container Topology](../../architecture/blueprints/c4-topology-spec.md) | Container topology specified in C4 views | Visualize the topology | Blueprint | Yes |
| [Strategic CAP Theorem Analysis](../../architecture/blueprints/cap-strategic-analysis.md) | CAP trade-off analysis for the platform | Ground consistency decisions | Blueprint | Yes |
| [Multi-Cloud Deployment Scenarios](../../architecture/blueprints/multi-cloud-deployment-scenarios.md) | Deployment scenarios across clouds and on-premise | Plan portable deployments | Blueprint | Yes |
| [Authoritative Tech Stack](../../architecture/blueprints/authoritative-tech-stack.md) | Index of approved runtime profiles | Bound technology choices | Blueprint | Yes |
| [Quick Stack Summary](../../architecture/blueprints/tech-stack-summary.md) | Condensed view of the approved stack | Summarize stack decisions | Reference | Yes |

### Phase 02: Architectural Decision Records (ADRs)

The consolidated and classified history of active architectural decisions across Core, Node.js, .NET, and Android.

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Central ADR Navigator](../../architecture/adrs/README.md) | All Evolith ADRs classified by scope | Find the controlling decision | Area hub | Yes |
| [ADR Decision Matrix by Concern](../../architecture/adrs/adr-matrix.md) | Maps architectural concerns to their controlling ADRs | Speed up decision discovery | Decision index | Yes |

### Phase 03: Engineering Standards and Stack Audit

Tactical implementation playbooks, defensive security, and market validation.

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Convention over Configuration](./engineering/convention-over-configuration.md) | Design standard for configurable systems and child products | Standardize parameterization | Standard | Yes |
| [Licensing & Open Source Governance](./engineering/licensing-and-open-source-governance.md) | Responsible selection of zero-cost technologies | Govern technology selection | Standard | Yes |
| [2026 Stack Audit Opinion](./engineering/detailed-stack-audit-2026.md) | License evaluation and stack audit | Validate the stack legally | Assessment | Yes |
| [Senior Architectural Assessment & Roadmap](./engineering/senior-architectural-assessment.md) | Senior technical assessment and improvement roadmap | Prioritize improvements | Assessment | Yes |
| [Global Engineering Manifesto (SOLID/OWASP)](./engineering/engineering-manifesto.md) | Global engineering principles and security baseline | Align engineering practice | Standard | Yes |
| [Content Management Abstraction](./engineering/content-management-abstraction.md) | Headless CMS as a time-to-market accelerator | Accelerate content delivery | Standard | No |
| [Tactical Contract Testing Guide (Pact)](./engineering/contract-testing-guideline.md) | Contract testing implementation guide | Verify service contracts | Playbook | Yes |
| [Observability Strategy Playbook](./engineering/observability-playbook.md) | Observability strategy and practices | Standardize instrumentation | Playbook | Yes |
| [API Gateway Plugin Manual (Kong/Traefik)](./engineering/gateway-guidelines.md) | Gateway plugin guidance | Standardize the edge | Playbook | Yes |
| [Vendor & Supply Chain Risk Assessment](./engineering/vendor-risk-assessment.md) | Vendor and supply chain risk evaluation | Control third-party risk | Assessment | Yes |

### Phase 04: Governance and Delivery

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Release and Audit Strategy (Nx)](./governance-docs/release-audit-strategy.md) | Release and audit strategy for the monorepo | Govern releases | Standard | Yes |

### Phase 05: Onboarding

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Quick Start Guide for New Products](./onboarding/product-quick-start.md) | Fast path for bootstrapping a new product | Accelerate product onboarding | Guide | Yes |
| [Child Repository Inheritance Guide](./onboarding/child-repository-inheritance-guide.md) | How satellite repositories inherit from Evolith | Standardize inheritance | Guide | Yes |
| [Architecture Glossary](../glossary.md) | Canonical terminology for the whole corpus | Keep language consistent | Glossary | Yes |

---

*This documentation is agnostic to the business domain and strictly regulates the technological structure of the holding company.*

---

## AI-Augmented Architecture (Optional)

Optional extension for teams and products looking to incorporate AI agents, harness engineering, and MCP into their architecture. Does not modify or replace any existing corporate standard.

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [AI-Augmented Overview](./ai-augmented/README.md) | Introduction, maturity model, MCP, agentic patterns, and AI ADRs | Adopt AI safely | Area hub | No |
| [AI-DD Frameworks — Adoption Reference](./ai-augmented/frameworks/README.md) | How this repository adopted BMAD-METHOD: agents, harness rules, and replication guide | Replicate the AI-DD setup | Reference | No |

---

[Back to Governance Hub](../README.md)
