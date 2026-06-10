# Corporate Standards Center (EAC)

> **Bilingual Navigation:** [Versión en Español](../standards/README.es.md)

Welcome to the central repository of architectural truth. Every document present here is considered **Mandatory Normative** for building software within the organization, unless the document explicitly declares an **Optional** or **Conditional** classification.

---

## Exhaustive Corporate Navigation Map

### Phase 00: Vision and Internal Audit
Non-negotiable principles of growth, consistency diagnostics, and self-assessment models.
* [Architectural Directives and Evolution](./vision/architectural-directives.md)
* **[Evolutionary Strategy and Dashboard](./vision/evolutionary-strategy-roadmap.md)** *(Global Vision)*
* [Maturity Assessment](./vision/maturity-assessment.md)

### Phase 01: Blueprint and Topology (arc42)
The structural design of the system detailed in C4 and CAP views.
* **[Corporate Multi-Runtime Blueprint](../../architecture/blueprints/reference-blueprint.md)** *(Mandatory Reading)*
* [C4 Spec Container Topology](../../architecture/blueprints/c4-topology-spec.md)
* [Strategic CAP Theorem Analysis](../../architecture/blueprints/cap-strategic-analysis.md)
* [Multi-Cloud Deployment Scenarios](../../architecture/blueprints/multi-cloud-deployment-scenarios.md)
* [Authoritative Tech Stack](../../architecture/blueprints/authoritative-tech-stack.md)
* [Quick Stack Summary](../../architecture/blueprints/tech-stack-summary.md)

### Phase 02: Architectural Decision Records (ADRs)
The consolidated and classified history of active architectural decisions across Core, Node.js, .NET, and Android.
* -> **[Central ADR Navigator](../../architecture/adrs/README.md)**
* -> **[ADR Decision Matrix by Concern](../../architecture/adrs/adr-matrix.md)**
 * Jump to: [Core](../../architecture/adrs/README.md) | [Node.js](../../architecture/adrs/README.md) | [.NET](../../architecture/adrs/README.md) | [Mobile](../../architecture/adrs/README.md)

### Phase 03: Engineering Standards and Stack Audit
Tactical implementation playbooks, defensive security, and market validation.
* **[Convention over Configuration — Evolith Design Standard for Configurable Systems](./engineering/convention-over-configuration.md)** *(Mandatory - Parameterization and Child Systems)*
* **[Licensing & Open Source Governance — Responsible Selection of Zero-Cost Technologies](./engineering/licensing-and-open-source-governance.md)** *(Mandatory - Technology Selection)*
* **[2026 Stack Audit Opinion](./engineering/detailed-stack-audit-2026.md)** *(Critical - License Evaluation)*
* **[Senior Architectural Assessment & Roadmap](./engineering/senior-architectural-assessment.md)** *(New)*
* [Global Engineering Manifesto (SOLID/OWASP)](./engineering/engineering-manifesto.md)
* [Content Management Abstraction — Headless CMS as a Time-to-Market Accelerator](./engineering/content-management-abstraction.md) *(Optional / Conditional)*
* [Tactical Contract Testing Guide (Pact)](./engineering/contract-testing-guideline.md)
* [Observability Strategy Playbook](./engineering/observability-playbook.md)
* [API Gateway Plugin Manual (Kong/Traefik)](./engineering/gateway-guidelines.md)
* [Vendor & Supply Chain Risk Assessment](./engineering/vendor-risk-assessment.md)

### Phase 04: Governance and Delivery
* [Release and Audit Strategy (Nx)](./governance-docs/release-audit-strategy.md)

### Phase 05: Onboarding
* **[Quick Start Guide for New Products](./onboarding/product-quick-start.md)**
* **[Child Repository Inheritance Guide](./onboarding/child-repository-inheritance-guide.md)** *(New)*
* [Architecture Glossary](../glossary.md)

---
*This documentation is agnostic to the business domain and strictly regulates the technological structure of the holding company.*

---

## AI-Augmented Architecture (Optional)

Optional extension for teams and products looking to incorporate AI agents, harness engineering, and MCP into their architecture. Does not modify or replace any existing corporate standard.

| Section | Description |
| :--- | :--- |
| [AI-Augmented Overview](./ai-augmented/README.md) | Introduction, maturity model, MCP, agentic patterns, and AI ADRs |
| **[AI-DD Frameworks — Adoption Reference](./ai-augmented/frameworks/README.md)** | **How this repository adopted BMAD-METHOD: local agent configuration, harness rules, and replication guide** |

---
[Back to Upper Level](../../README.md)
