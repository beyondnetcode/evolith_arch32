# PRD — [Product Name]

<p align="right">
  <img src="https://img.shields.io/badge/Version-[e.g.%200.1.0--draft]-f39c12?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/Status-Draft-ff7f50?style=flat-square" alt="Status">
  <img src="https://img.shields.io/badge/Scope-Functional%20Only-8e44ad?style=flat-square" alt="Functional Only">
</p>

> **Phase:** 1 — Conception and Discovery
> **Document scope:** This PRD describes **functional and business requirements only**. Technical decisions (stack, architecture, integration protocols, infrastructure diagrams) live in architecture artifacts and ADRs, not here.

---

## 1. Metadata

- **Identifier:** `PRD-[PRODUCT]-001`
- **Product:** [Product Name]
- **Version:** [e.g. 0.1.0-draft]
- **Status:** [Draft | In Review | Approved | Superseded]
- **Author(s):** [Product Manager name]
- **Business Approver:** *(pending)*
- **Approval Date:** *(pending)*

## 2. Executive Summary

### 2.1 Problem Statement

[Describe the business problem this product solves. Focus on current volume, manual processes, wasted hours, error rates, and lack of traceability. Use `{X}` placeholders for values not yet quantified.]

### 2.2 Proposed Solution

[Briefly describe what the system does and how it solves the problem. Define the MVP scope and which future phases will extend the solution.]

### 2.3 MVP Scope

The MVP covers the following functionalities:

| Category | Functionalities |
| :------- | :-------------- |
| **[Category 1]** | [Included functionalities] |
| **[Category 2]** | [Included functionalities] |

### 2.4 Expected Benefits

| Benefit | Expected Value |
| :------ | :------------- |
| [Benefit 1] | [Measurable value] |
| [Benefit 2] | [Measurable value] |

### 2.5 Delivery Phases

| Phase | Deliverable | Timeline |
| :---- | :---------- | :------- |
| **Phase 1 — MVP** | [MVP deliverable] | [e.g. Q3 2026] |
| **Phase 2 — [Name]** | [Phase 2 deliverable] | [e.g. Q4 2026] |
| **Phase 3 — [Name]** | [Phase 3 deliverable] | [e.g. Q1 2027] |

## 3. Context and Problem

### 3.1 Current Context

- **Current operation:** [Describe how the process works today, step by step, including tools used (spreadsheets, phone calls, WhatsApp, etc.)]
- **Average [main process] time:** {X} hours from [start event] to [end event]
- **Error rate:** {X}% of [entities] have inconsistent data
- **[Entity] volume:** {X} [units]/month

### 3.2 Identified Problems

| Problem | Impact | Operational Consequence |
| :------ | :----- | :---------------------- |
| **[Problem 1]** | [Direct impact] | [Business consequence] |
| **[Problem 2]** | [Direct impact] | [Business consequence] |

### 3.3 Estimated Impact

| Metric | Estimated Value | Note |
| :----- | :------------- | :--- |
| [Metric 1] | {X} [units]/month | [Additional note] |
| [Metric 2] | USD {X}/month | [Additional note] |

### 3.4 Strategic Vision

[Describe why this product is key to the business strategy and what it enables in the future.]

## 4. Objectives and Success Metrics

| Objective | Metric | Initial Value | Target | Timeline |
| :-------- | :----- | :------------ | :----- | :------- |
| [Objective 1] | [Measurable metric] | [Current state] | [Target value] | [Date] |
| [Objective 2] | [Measurable metric] | [Current state] | [Target value] | [Date] |

## 5. Scope

### 5.1 In Scope — MVP

| Category | Included Functionalities |
| :------- | :----------------------- |
| **[Category 1]** | [F-01 Description, F-02 Description] |
| **[Category 2]** | [F-03 Description, F-04 Description] |

### 5.2 Out of Scope MVP — Future Phases

| Phase | Functionality | Timeline |
| :---- | :------------ | :------- |
| **Phase 2** | [MVP-excluded functionality] | [Date] |
| **Phase 3** | [MVP-excluded functionality] | [Date] |

### 5.3 MVP Functional Scope

[Organize the MVP into functional blocks and briefly describe each. List the main actors that interact with these blocks.]

## 6. Actors and High-Level Use Cases

### 6.1 Actor Descriptions

| Actor | Role in System | Main Responsibilities |
| :---- | :------------- | :-------------------- |
| **[Actor 1]** | [Role] | [Responsibilities] |
| **[Actor 2]** | [Role] | [Responsibilities] |

### 6.2 Use Cases by Actor

| Actor | Use Cases — MVP (Phase 1) | Use Cases — Phase 2+ |
| :---- | :------------------------ | :------------------- |
| **[Actor 1]** | [F-01, F-02, F-03] | [F-07, F-15] |
| **[Actor 2]** | [F-04, F-05] | [F-16] |

### 6.3 Interaction Matrix

| Actor | [System] | [External System 1] | [External System 2] |
| :---- | :------- | :------------------ | :------------------ |
| **[Actor 1]** | [Actions] | [Actions] | [Actions] |
| **[Actor 2]** | [Actions] | — | — |

## 7. Detailed MVP Functionalities

| ID | Functionality | Description |
| :-- | :------------ | :---------- |
| F-01 | [Functionality name] | [Detailed description of what it does, who executes it, and what restrictions apply] |
| F-02 | [Functionality name] | [Detailed description] |

## 8. Explicit Business Rules

> **Priority (MoSCoW):** **M** = Must (MVP essential) · **S** = Should (important, doesn't block MVP) · **C** = Could (desirable / future phase).

| ID | Rule | Priority |
| :-- | :--- | :------: |
| RN-01 | [Clear and precise business rule] | M |
| RN-02 | [Business rule] | S |
| RN-03 | [Business rule] | C |

## 9. Constraints and Assumptions

### 9.1 Constraints

| ID | Constraint | Category |
| :-- | :--------- | :------- |
| R-01 | [Identified constraint] | [Regulatory | Technical | Operational | Dependency | Scope] |

### 9.2 Assumptions

| ID | Assumption | Risk if Not Met |
| :-- | :--------- | :-------------- |
| S-01 | [Identified assumption] | [Consequence if not met] |

## 10. Business Risks

| ID | Risk | Probability | Impact | Mitigation |
| :-- | :--- | :---------- | :----- | :--------- |
| RS-01 | [Identified risk] | [Low | Medium | High] | [Low | Medium | High] | [Mitigation strategy] |

## 11. PRD Acceptance Criteria

The PRD is considered approved when all the following criteria are met:

### 11.1 PRD Content

| ID | Criterion | Owner | Status |
| :-- | :-------- | :---- | :----- |
| CA-01 | Executive summary validated by Business Approver | [Name] | [ ] |
| CA-02 | Success metrics with measurable initial value and target | [Name] | [ ] |
| CA-03 | Scope (5.1 and 5.2) signed by Product | [Name] | [ ] |
| CA-04 | Business rules (RN-01 to RN-XX) without contradictions and prioritized | [Name] | [ ] |
| CA-05 | Constraints and assumptions reviewed and approved | [Name] | [ ] |
| CA-06 | Actors and use cases validated with key stakeholders | [Name] | [ ] |
| CA-07 | Functionalities (F-01 to F-XX) with individual acceptance criteria | [Name] | [ ] |
| CA-08 | Business rules prioritized (Must/Should/Could) | [Name] | [ ] |
| CA-09 | Glossary complete and consistent with the domain | [Name] | [ ] |

### 11.2 Product

| ID | Criterion | Owner | Status |
| :-- | :-------- | :---- | :----- |
| CA-10 | Prototypes/wireframes approved by UX | [Name] | [ ] |
| CA-11 | Master data plan (mapping, quality, cleanup) approved | [Name] | [ ] |

### 11.3 Project

| ID | Criterion | Owner | Status |
| :-- | :-------- | :---- | :----- |
| CA-12 | MVP timeline with milestones and delivery date defined | [Name] | [ ] |
| CA-13 | Development resources assigned and available | [Name] | [ ] |
| CA-14 | Testing plan (unit, integration, acceptance) defined | [Name] | [ ] |
| CA-15 | Deployment and training plan defined | [Name] | [ ] |

## 12. Glossary

| Term | Definition |
| :--- | :--------- |
| **[Term 1]** | [Clear and precise definition] |
| **[Term 2]** | [Clear and precise definition] |

## 13. Change History

| Version | Date | Author | Changes |
| :------ | :--- | :----- | :------ |
| 0.1.0-draft | [YYYY-MM-DD] | [Name] | Initial version |

---

## Appendices

### A.1 Screen Prototypes (MVP)

MVP screen prototypes are available in [Figma / design tool]. Each screen must be reviewed and validated with the Product Owner before development begins.

| Screen | Functionality | Reference |
| :----- | :------------ | :-------- |
| [Screen name] | [F-XX] | [Link or reference] |

> *Note: Prototypes in [tool] are the source of truth for UI/UX design. This document only references screens and their associated functionalities.*

---

<p align="center">
  <strong>© Evolith</strong> · www.beyondnet.info
</p>
