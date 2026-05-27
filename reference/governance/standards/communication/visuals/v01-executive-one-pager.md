# V-01 — Executive One-Pager: Evolith Ecosystem Overview

> **Audience:** Executive / Sponsor  
> **Purpose:** Single-page entry point — no jargon, pure value  
> **Bilingual:** [Español](./v01-executive-one-pager.es.md)

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
    classDef arrow fill:none,stroke:#888,color:#333
    classDef label fill:#f5f5f5,stroke:#ccc,color:#333,font-style:italic

    BOARD["🏛️ Architecture Board\nSets the corporate standard"]:::board

    subgraph EVOLITH["EVOLITH ARCH32 — Corporate Architecture Framework"]
        E1["📐 57 Architectural Decisions\nADRs with context, rationale & trade-offs"]:::framework
        E2["🗺️ Blueprints & Patterns\nReference models, canonical patterns"]:::framework
        E3["📜 Engineering Standards\nManifesto, SDLC, Definition of Done"]:::framework
        E4["🔒 Governance\nBoard ownership, ADR review, taxonomy"]:::framework
    end

    subgraph UMS["UMS — Enterprise Reference Implementation"]
        U1["⚙️ Running .NET 8 Product\n8 bounded contexts, 16 functional stories"]:::product
        U2["🧪 89 Technical Stories\nFull traceability to every Evolith ADR"]:::product
        U3["📊 Observability Stack\nOTel · Loki · Tempo · Grafana"]:::product
        U4["🏗️ 6 Technical Enablers\nOutbox · Sagas · CQRS · RLS · JWT · Graph"]:::product
    end

    BOARD --> EVOLITH
    EVOLITH -->|"inherits from\n(every product)"| UMS
    UMS -.->|"promotes discoveries\nback upstream"| EVOLITH

    NOTE["💡 Evolith = The Rules   |   UMS = The Proof"]:::label
    UMS --> NOTE
```

---

## Visual 1-B — Why Both Are Needed

```mermaid
flowchart LR
    classDef problem fill:#7f1d1d,stroke:#ef4444,color:#white
    classDef solution fill:#14532d,stroke:#22c55e,color:#white
    classDef outcome fill:#1e3a5f,stroke:#3b82f6,color:#white

    P1["❌ Without Evolith\nEvery team reinvents\narchitecture from scratch"]:::problem
    P2["❌ Without UMS\nRules exist on paper\nbut no one knows if they work"]:::problem

    S1["✅ With Evolith\nOne curated set of decisions,\npatterns, and standards\ninherited by all products"]:::solution
    S2["✅ With UMS\nReal enterprise product\nproving every rule works\nin production"]:::solution

    O["🎯 OUTCOME\nPredictable architecture\nAcross every product &\nevery team in the org"]:::outcome

    P1 -->|"solved by"| S1
    P2 -->|"solved by"| S2
    S1 --> O
    S2 --> O
```

---

## Visual 1-C — The 3-Phase Investment Protection Model

```mermaid
timeline
    title Evolith Evolution Roadmap — Investment Grows, Not Replaces
    section Phase 1 · MVP
        Modular Monolith    : Fast time-to-market
                            : Clean domain boundaries from day 1
                            : Zero structural debt inherited
    section Phase 2 · Scale
        Selective Extraction : Only extract what the metrics demand
                             : Dapr abstracts service mesh complexity
                             : Full observability activated
    section Phase 3 · North Star
        Cloud Sovereignty    : Swap any vendor in under 24 hours
                             : Zero-trust networking enforced
                             : Compliance-as-Code in every PR
```

---

## Visual 1-D — Value by Stakeholder

```mermaid
mindmap
  root((Evolith<br/>Value))
    Executive
      Predictable architecture costs
      No vendor lock-in risk
      Proven model reduces delivery failure
      Governance without bureaucracy
    Product Teams
      57 pre-validated decisions
      No reinventing the wheel
      Clear evolution path
      UMS as living reference
    Engineers
      Canonical patterns to copy
      Anti-pattern blacklist enforced in CI
      Runtime-specific ADR profiles
      Full traceability to requirements
    QA / DevOps
      70% coverage gate in CI
      4 operational runbooks
      OTel + Loki + Grafana stack ready
      Gitflow + semantic quality gates
```

---

*Part of the [Architecture Communication Strategy](../architecture-communication-strategy.md)*
