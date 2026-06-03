# V-01 — Executive One-Pager: Evolith Ecosystem Overview

> **Audience:** Executive / Sponsor  
> **Purpose:** Single-page entry point — no jargon, pure value  
> **Bilingual:** [Español](./v01-executive-one-pager.es.md)  
> **Freshness rule:** This visual must be reviewed whenever Evolith introduces a major SDLC, ADR, runtime, governance, or reference-product evolution.

---

## The Question This Visual Answers

> "What is Evolith, what is UMS, and why do we need both?"

---

## Visual 1-A — The Two-Layer Ecosystem

```mermaid
flowchart TB
    classDef framework fill:#1e3a5f,stroke:#4a90d9,color:#ffffff,font-weight:bold
    classDef product fill:#1a5c38,stroke:#4caf50,color:#ffffff,font-weight:bold
    classDef board fill:#4a1a6b,stroke:#9c27b0,color:#ffffff,font-weight:bold
    classDef label fill:#f5f5f5,stroke:#ccc,color:#333,font-style:italic

    BOARD["️ Architecture Board\nOwns the corporate architecture baseline"]:::board

    subgraph EVOLITH["EVOLITH ARCH32 — Corporate Architecture Reference"]
        E1[" ADR Registry\nDecision records with context, rationale and trade-offs"]:::framework
        E2["️ Blueprints and Patterns\nReference models, canonical patterns, topology guidance"]:::framework
        E3[" SDLC and Engineering Standards\nDefinition of Done, quality gates, artifact templates"]:::framework
        E4[" Governance\nBoard ownership, repository taxonomy, evolution rules"]:::framework
    end

    subgraph UMS["UMS — Enterprise Reference Product"]
        U1["️ Running .NET 10 Product\nIdentity and authorization reference implementation"]:::product
        U2[" DDD Bounded Contexts\nIdentity, Authorization, Configuration, Approvals, Compliance, IGA, Audit, Cache, Console"]:::product
        U3[" Observability and Operations\nOpenTelemetry, logs, traces, dashboards, runbooks"]:::product
        U4["️ Applied Evidence\nCode, tests, CI/CD, data model and traceability documentation"]:::product
    end

    BOARD --> EVOLITH
    EVOLITH -->|"sets the reusable rules"| UMS
    UMS -.->|"promotes proven lessons upstream"| EVOLITH

    NOTE[" Evolith = The Rules   |   UMS = The Proof"]:::label
    UMS --> NOTE
```

---

## Visual 1-B — Why Both Are Needed

```mermaid
flowchart LR
    classDef problem fill:#7f1d1d,stroke:#ef4444,color:#ffffff,font-weight:bold
    classDef solution fill:#14532d,stroke:#22c55e,color:#ffffff,font-weight:bold
    classDef outcome fill:#1e3a5f,stroke:#3b82f6,color:#ffffff,font-weight:bold

    P1[" Without Evolith\nEvery team reinvents architecture, standards and delivery rules"]:::problem
    P2[" Without UMS\nArchitecture rules remain theoretical and unproven"]:::problem

    S1[" With Evolith\nOne governed architecture baseline inherited by all products"]:::solution
    S2[" With UMS\nA real product validates the baseline with executable evidence"]:::solution

    O[" OUTCOME\nPredictable delivery, lower architecture risk and reusable learning across teams"]:::outcome

    P1 --> S1
    P2 --> S2
    S1 --> O
    S2 --> O
```

---

## Visual 1-C — Progressive Adoption Without Big-Bang Complexity

```mermaid
timeline
    title Evolith Adoption Roadmap — Adopt What You Need, Prove Before Scaling
    section Essential
        Govern the basics : PRD, Functional Story, Technical Story, Release Notes
                           : Good fit for MVPs and small teams
    section Governed
        Add release controls : ADRs, Test Summary Report, Quality Gates
                             : Good fit for production releases
    section Enterprise
        Scale accountability : RACI, Executive Scorecard, Traceability, Operational Readiness
                             : Good fit for multi-team, regulated or critical products
```

---

## Visual 1-D — Value by Stakeholder

```mermaid
mindmap
  root((Evolith<br/>Value))
    Executive
      Predictable architecture investment
      Lower delivery and production risk
      Governance without unnecessary bureaucracy
      Clear decision evidence
    Technology Leaders
      Reusable standards across teams
      Progressive adoption model
      Objective quality and release gates
      Better alignment between strategy and execution
    Product Teams
      Clear SDLC flow from intent to release
      Artifact set calibrated by risk and maturity
      UMS as living reference product
      Less ambiguity during delivery
    Engineers
      DDD and Clean Architecture guidance
      Canonical patterns and ADRs to reuse
      Clear Definition of Done
      Traceability from requirement to implementation
    QA / DevOps
      Quality gates tied to release decisions
      Operational readiness before production
      Observability and rollback expectations
      Evidence-based go/no-go conversations
```

---

## Executive Takeaway

> Evolith is not a document repository. It is a governed architecture operating model.  
> UMS proves that the model can be implemented in real software.

---

*Part of the [Architecture Communication Strategy](../architecture-communication-strategy.md).*