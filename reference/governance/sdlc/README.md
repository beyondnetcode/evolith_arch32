# Corporate SDLC Governance Center

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

This center is the authoritative governance hub for the Software Development Lifecycle within Evolith. It defines the procedural requirements, phase exit gates, artifact formats, quality gates, responsibility model, traceability rules, and compliance mapping that govern every product built from this reference platform.

---

## Executive View for Technology Directors

For Technology Directors, the Evolith SDLC is not a documentation process. It is a delivery control system.

Its purpose is to ensure that funded work is traceable, architectural risk is resolved before construction, quality gates are objective, and production readiness is proven before release.

| Executive need | Go to |
|---|---|
| Understand director-level control points | [SDLC Executive View](./executive-view.md) |
| Validate objective release-blocking criteria | [SDLC Quality Gates](./quality-gates.md) |
| Confirm who owns each gate decision | [SDLC Responsibility Matrix](./responsibility-matrix.md) |
| Trace business intent to production evidence | [SDLC Traceability Model](./traceability-model.md) |
| Review required and optional artifacts by phase | [SDLC–Evolith Artifact Mapping](./sdlc-evolith-artifact-mapping.md) |
| Start authoring official SDLC artifacts | [Artifact Templates Hub](./04-artifact-templates/README.md) |

### Director-Level Operating Rule

No lifecycle phase should advance based on verbal agreement alone. Each gate requires version-controlled evidence, an accountable owner, and an objective approval criterion.

---

## Download Center — Executive SDLC Materials

> [!IMPORTANT]
> **Start here for executive briefings and client workshops.** These v3 materials are the simplified official package for explaining how to adopt Evolith SDLC, select applicable phases, assign milestone owners, and track execution with a lightweight scorecard.
>
> Use the buttons below to download the files directly.

### 📊 Executive Communication Kit (Presentations)

| Artifact | Format | Purpose |
|---|---|---|
| **[Evolith: Executive Value Proposition](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith-sdlc-value-proposition.pptx)** | PPTX | Executive presentation aligning commercial and technological vision on the benefits of the Evolith SDLC. |
| **[Evolith: UMS Case Study](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith-ums-case-study.pptx)** | PPTX | Success story demonstrating the application of the 8 phases in a real industrial environment. |
| **[Evolith: SDLC Technical Deep-Dive](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith-sdlc-technical-deepdive.pptx)** | PPTX | Engineering operational guide on phases, Quality Gates, and artifacts. |

### 🛠️ Phase-by-Phase Tool Kit (Workbooks)

| Artifact / Phase | Format | Purpose |
|---|---|---|
| **[Master Workbook Integrator](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Master_Workbook.xlsx)** | XLSX | Consolidated dashboard, role registry, cross-traceability, and project status. |
| **[Workbook F1: Ideation](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F1_Ideacion.xlsx)** | XLSX | Templates for Business Case, Project Charter, and initial risk registry. |
| **[Workbook F2: Analysis](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F2_Analisis.xlsx)** | XLSX | Documentation and traceability of business requirements. |
| **[Workbook F3: Design](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F3_Diseno.xlsx)** | XLSX | Architectural Decision Records (ADRs) and Blueprint tracking. |
| **[Workbook F4: Construction](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F4_Construccion.xlsx)** | XLSX | Technical debt control, Pipeline Quality Gates, and Definition of Done. |
| **[Workbook F5: Testing](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F5_Pruebas.xlsx)** | XLSX | Master plan, test case execution, and defect log. |
| **[Workbook F6: Deployment](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F6_Despliegue.xlsx)** | XLSX | Runbook execution, pre-deployment checklists, and Rollback plans. |
| **[Workbook F7: Operation](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F7_Operacion.xlsx)** | XLSX | SRE dashboards and post-launch incident tracking. |
| **[Workbook F8: Retirement](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F8_Retiro.xlsx)** | XLSX | Secure checklist for sunsetting and disconnecting legacy systems. |

> The workbooks are intended for facilitated working sessions with customer teams. The presentations are intended for executive alignment, product vision, and technology leadership communication.

---

## SDLC Operating Model

```mermaid
flowchart LR
    classDef phase fill:#1e3a5f,stroke:#3b82f6,color:#fff,font-weight:bold
    classDef gate fill:#4a3800,stroke:#f59e0b,color:#fff,font-size:12px

    P1["Phase 1\nConception"]:::phase
    P2["Phase 2\nDesign"]:::phase
    P3["Phase 3\nConstruction"]:::phase
    P4["Phase 4\nValidation"]:::phase
    P5["Phase 5\nDelivery"]:::phase
    G1(["Business\nSign-Off"]):::gate
    G2(["Design\nBaseline"]):::gate
    G3(["Successful\nBuild"]):::gate
    G4(["RC\nStamped"]):::gate
    G5(["Production\nLive"]):::gate

    P1 --> G1 --> P2 --> G2 --> P3 --> G3 --> P4 --> G4 --> P5 --> G5
```

---

## Minimum Viable Governance

For small MVPs, the minimum mandatory artifact chain is:

```text
PRD -> Functional Story -> Technical Story -> Test Summary Report -> Release Notes
```

An ADR is mandatory whenever the work introduces or changes architecture boundaries, technology selection, security model, multi-tenancy model, persistence strategy, API contract strategy, deployment topology, observability topology, or any exception to an existing Evolith standard.

The full compliance matrix applies when the product reaches scale, regulated environments, multi-tenancy, public APIs, production-critical workflows, or cross-team dependencies.

---

## Phase 01 — Conception and Discovery

> **Objective:** Establish shared understanding of what the product must achieve and why before any design begins. Outputs from this phase authorize entry to architecture and design work.
> **Phase exit gate:** Business Sign-Off
> **Primary audience:** Product Owner, Executive Sponsor, Software Architect

Scope definition, persona profiling, OKR mapping, and architectural constraint alignment.

| Artifact | Objective and when to use it | Recommended profiles |
|---|---|---|
| [PRD — Product Requirements Document](./04-artifact-templates/prd-template.md) | Captures the complete product scope: user personas, business OKRs, functional boundaries, constraints, and non-goals. Created once per product or major release initiative. Required before any architecture or design work begins. | Product Owner, Executive Sponsor — written by PO, reviewed and signed by Sponsor and Architect |
| [SDLC–Evolith Artifact Mapping — Phase 1](./sdlc-evolith-artifact-mapping.md#2-phase-1-conception-and-discovery) | Reference table listing which Evolith artifacts are Required or Optional during this phase. Use it as a compliance checklist before declaring Business Sign-Off. | Product Owner, Governance Reviewer, Software Architect |

---

## Phase 02 — Design and Architecture

> **Objective:** Produce verifiable, traceable design decisions that bound the solution space before construction starts. Architecture decisions made here constrain all subsequent phases.
> **Phase exit gate:** Design Baseline Approved
> **Primary audience:** Software Architect, Principal / Staff Engineer, Product Owner, QA / SDET

Pattern selection, ADR production, bounded context definition, API contracts, and functional story writing.

| Artifact | Objective and when to use it | Recommended profiles |
|---|---|---|
| [Construction-Focused SDLC Framework](./02-engineering/construction-focused-sdlc-framework.md) | Normative standard governing phase progression, quality thresholds, inner build loop, and the Definition of Done. Every engineer must read this before construction begins. | Software Architect, Tech Lead, All Engineers — read by everyone, enforced by Tech Lead |
| [ADR — Architecture Decision Record](./04-artifact-templates/adr-template.md) | Captures a single architectural decision: context, considered options, chosen option, trade-offs, and consequences. One ADR per significant decision. Required before implementing any non-trivial architectural choice. | Software Architect, Principal / Staff Engineer — written by Architect, reviewed by Engineering Lead |
| [Functional Story — Business Behavior Specification](./04-artifact-templates/functional-story-template.md) | Describes a user-facing capability in business language. Defines actors, flows, business rules, acceptance criteria, and technical constraints without prescribing implementation. Serves as the contract between Product and Engineering. | Product Owner, Business Analyst — written by PO/BA, reviewed by Architect and QA |
| [Functional Story Writing Standard](./03-documentation/functional-story-writing-standard.md) | Normative rules governing the structure, language, and completeness of Functional Stories. All authors of Functional Stories must read this before writing. | Product Owner, Business Analyst, QA / SDET — normative reference for all story authors |
| [SDLC–Evolith Artifact Mapping — Phase 2](./sdlc-evolith-artifact-mapping.md#3-phase-2-design-and-architecture) | Reference table listing Required and Optional artifacts for this phase. Use as a checklist before declaring Design Baseline. | Software Architect, Governance Reviewer, Product Owner |

---

## Phase 03 — Construction

> **Objective:** Translate design decisions into working, tested, and documented software that meets the Definition of Done. All code merged to main must pass quality gates before this phase closes.
> **Phase exit gate:** Successful Build (all quality gates green)
> **Primary audience:** Backend Developer, Frontend Developer, Tech Lead, DevOps / SRE, QA / SDET

Source code composition, automated testing, CI/CD enforcement, and Definition of Done.

| Artifact | Objective and when to use it | Recommended profiles |
|---|---|---|
| [Technical Story — Engineering Implementation Work Item](./04-artifact-templates/technical-story-template.md) | Breaks down a Functional Story into a concrete engineering task with specific implementation steps, technical acceptance criteria, and a DoD checklist. One Technical Story per discrete implementation unit. | Backend Developer, Frontend Developer, Tech Lead — written by Engineer, reviewed by Tech Lead and QA |
| [SDLC Documentation Best Practices](./03-documentation/sdlc-documentation-best-practices.md) | Mandatory documentation-as-code rules: versioning, ADR updates, inline documentation, and review cadence. Applies to every code contribution during construction. | All Engineers, Tech Lead — normative, applies to every commit |
| [SDLC Quality Gates](./quality-gates.md) | Canonical threshold baseline for coverage, complexity, CVEs, technical debt, documentation delta, and observability evidence. | Tech Lead, QA / SDET, Governance Reviewer |
| [SDLC–Evolith Artifact Mapping — Phase 3](./sdlc-evolith-artifact-mapping.md#4-phase-3-construction) | Reference table listing Required and Optional artifacts for this phase. Use as a DoD compliance checklist on every sprint. | Tech Lead, QA / SDET, Governance Reviewer |

---

## Phase 04 — Validation and QA

> **Objective:** Formally verify that the software meets all acceptance criteria and quality thresholds before the Release Candidate is stamped. No production deployment proceeds without a sealed RC.
> **Phase exit gate:** RC Stamped
> **Primary audience:** QA / SDET, Tech Lead, Product Owner, Security Engineer

Regression verification, security scanning, UAT, and Release Candidate stamping.

| Artifact | Objective and when to use it | Recommended profiles |
|---|---|---|
| [Test Summary Report — Quality Gate Validation Record](./04-artifact-templates/test-summary-report-template.md) | Aggregates test execution results across unit, integration, and E2E layers. Confirms all mandatory quality thresholds are met (coverage, complexity, CVEs, tech debt). Required before the RC can be stamped. | QA / SDET — written by QA, signed off by Tech Lead and Product Owner |
| [SDLC Quality Gates](./quality-gates.md) | Canonical threshold baseline. Use it to confirm whether an RC may be stamped or must be blocked. | QA / SDET, Tech Lead, Security Engineer |
| [SDLC–Evolith Artifact Mapping — Phase 4](./sdlc-evolith-artifact-mapping.md#5-phase-4-validation-and-qa) | Reference table for this phase. Use to verify all required QA artifacts are present before RC sign-off. | QA / SDET, Tech Lead, Governance Reviewer |

---

## Phase 05 — Delivery and Operations

> **Objective:** Deploy the sealed Release Candidate to production and confirm the system is live, observable, and nominal. Production Live cannot be declared until all observability checks pass.
> **Phase exit gate:** Production Live
> **Primary audience:** DevOps / SRE, Tech Lead, Product Owner

Production deployment, observability validation, and monitoring nominality.

| Artifact | Objective and when to use it | Recommended profiles |
|---|---|---|
| [Release Notes — Production Deployment Record](./04-artifact-templates/release-notes-template.md) | Formal deployment record: new features, breaking changes, bug fixes, deployment steps, rollback procedure, and observability checklist. Required before Production Live is declared. | DevOps / SRE, Tech Lead — written by DevOps/Tech Lead, reviewed by Product Owner |
| *Coming Soon: Zero-Downtime Release Playbook* | Operational runbook for blue-green and canary deployments with zero-downtime constraints. | DevOps / SRE |
| [SDLC–Evolith Artifact Mapping — Phase 5](./sdlc-evolith-artifact-mapping.md#6-phase-5-delivery-and-operations) | Reference table for this phase. Use to verify all delivery artifacts are in place before declaring Production Live. | DevOps / SRE, Governance Reviewer |

---

## Cross-Phase References

The following documents apply across the lifecycle and must be consulted regardless of where a team is operating.

| Document | Role across all phases |
|---|---|
| [SDLC Executive View](./executive-view.md) | Practical director-level operating model for funding, risk, gates, and production readiness. |
| [SDLC Quality Gates](./quality-gates.md) | Canonical quality thresholds and waiver policy. |
| [SDLC Responsibility Matrix](./responsibility-matrix.md) | Accountable, responsible, consulted, and evidence expectations per gate. |
| [SDLC Traceability Model](./traceability-model.md) | End-to-end evidence chain from PRD to production observability. |
| [SDLC–Evolith Artifact Mapping](./sdlc-evolith-artifact-mapping.md) | Master compliance matrix: 40+ Evolith artifacts mapped to the five SDLC phases with Required / Optional signal. The definitive reference for governance reviewers and team leads. |
| [Artifact Templates Hub](./04-artifact-templates/README.md) | Index of all six format templates with blank structures and UMS worked examples. The starting point for authoring any new SDLC artifact. |

---

[Back to Upper Level](../../README.md)
