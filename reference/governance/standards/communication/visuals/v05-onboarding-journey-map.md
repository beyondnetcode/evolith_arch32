# V-05 — Onboarding Journey Map by Role

> **Audience:** HR, Tech Leads, Engineering Managers  
> **Purpose:** Structured ramp-up path — what each role reads, when, and why  
> **Bilingual:** [Español](./v05-onboarding-journey-map.es.md)

---

## Visual 5-A — Universal Onboarding Flow (All Roles)

```mermaid
flowchart LR
    classDef day fill:#0f172a,stroke:#334155,color:#fff,font-weight:bold
    classDef action fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef outcome fill:#14532d,stroke:#22c55e,color:#fff
    classDef gate fill:#4a3800,stroke:#f59e0b,color:#fff,font-weight:bold

    D1["DAY 1\nOrientation"]:::day --> A1["Read: Executive One-Pager\nV-01 visual\n30 min"]:::action
    A1 --> A2["Read: Architecture Journey\nV-02 visual\n20 min"]:::action
    A2 --> G1{"Can you explain\nthe 4 stages and\nwhy we default to\nModular Monolith?"}:::gate
    G1 -->|YES| O1["✅ Foundation cleared"]:::outcome
    G1 -->|NO| A1

    O1 --> D2["DAY 2-3\nRole Path"]:::day
    D2 --> FORK{"Your role?"}

    FORK -->|Architect/TL| PATH_ARCH["→ V-05-B\nArchitect Path"]
    FORK -->|Backend Dev| PATH_DEV["→ V-05-C\nDeveloper Path"]
    FORK -->|QA/SDET| PATH_QA["→ V-05-D\nQA Path"]
    FORK -->|DevOps/SRE| PATH_OPS["→ V-05-E\nDevOps Path"]
    FORK -->|PM/PO| PATH_PM["→ V-05-F\nPM Path"]
    FORK -->|Executive| PATH_EXEC["→ V-01 only\nExecutive briefing"]

    PATH_ARCH & PATH_DEV & PATH_QA & PATH_OPS & PATH_PM --> D3["WEEK 2\nFirst Contribution"]:::day
    D3 --> G2{"Can you write\nor review an ADR?"}:::gate
    G2 -->|YES| DONE["✅ Onboarded"]:::outcome
```

---

## Visual 5-B — Architect / Tech Lead Journey

```mermaid
flowchart TB
    classDef sectionHeader fill:#0f172a,stroke:#334155,color:#fff,font-weight:bold
    classDef task fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef score5 fill:#14532d,stroke:#22c55e,color:#fff
    classDef score4 fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef score3 fill:#4a3800,stroke:#f59e0b,color:#fff

    subgraph D1["Day 1: Foundation"]
        B1["Read Executive One-Pager V-01"]:::task
        B2["Read Architecture Journey V-02"]:::task
        B3["Understand Ecosystem Relationship"]:::task
    end

    subgraph D2["Day 2-3: Standards"]
        B4["Study Architectural Directives"]:::task
        B5["Read Evolutionary Roadmap"]:::task
        B6["Review Engineering Manifesto"]:::task
    end

    subgraph D3["Day 4-5: Decisions"]
        B7["Navigate ADR Registry V-04"]:::task
        B8["Study ADR Decision Matrix"]:::task
        B9["Read Reference Blueprint arc42 C4"]:::task
    end

    subgraph W2["Week 2: Applied Reference"]
        B10["Explore UMS Architecture Portal"]:::task
        B11["Review UMS Traceability Matrix"]:::task
        B12["Read Child Repo Inheritance Guide"]:::task
    end

    subgraph END["End of Week 2: First ADR"]
        B13["Write first ADR proposal"]:::task
        B14["Submit to Architecture Board"]:::task
    end

    D1 --> D2 --> D3 --> W2 --> END
```

---

## Visual 5-C — Backend / Frontend Developer Journey

```mermaid
flowchart TB
    classDef sectionHeader fill:#0f172a,stroke:#334155,color:#fff,font-weight:bold
    classDef task fill:#1e3a5f,stroke:#3b82f6,color:#fff

    subgraph D1["Day 1: Rules"]
        C1["Read Engineering Manifesto"]:::task
        C2["Learn anti-pattern blacklist"]:::task
        C3["Understand SOLID and Hexagonal"]:::task
    end

    subgraph D2["Day 2: Your Runtime"]
        C4["Select Node.js or .NET profile"]:::task
        C5["Read runtime-specific ADRs V-04-C or V-04-D"]:::task
        C6["Study Canonical Patterns CP-01 to 04"]:::task
    end

    subgraph D3["Day 3-5: Reference Code"]
        C7["Explore UMS source code"]:::task
        C8["Trace FS to ADR to TE in matrix"]:::task
        C9["Run UMS locally and observe"]:::task
    end

    subgraph W2["Week 2: First Deliverable"]
        C10["Write first use case with Hexagonal"]:::task
        C11["Add unit tests to 70 percent coverage"]:::task
        C12["Submit PR with PR checklist"]:::task
    end

    D1 --> D2 --> D3 --> W2
```

---

## Visual 5-D — QA / SDET Journey

```mermaid
flowchart TB
    classDef sectionHeader fill:#0f172a,stroke:#334155,color:#fff,font-weight:bold
    classDef task fill:#1e3a5f,stroke:#3b82f6,color:#fff

    subgraph D1["Day 1: Quality Model"]
        Q1["Read Testing Pyramid ADR 0018"]:::task
        Q2["Understand 70 20 10 split"]:::task
        Q3["Read Contract Testing Guideline"]:::task
    end

    subgraph D2["Day 2-3: Testing Standards"]
        Q4["Study ADR 0052 Unit Isolation"]:::task
        Q5["Study ADR 0053 Integration and E2E"]:::task
        Q6["Review CI quality gate setup"]:::task
    end

    subgraph D3["Day 4-5: Applied Evidence"]
        Q7["Review UMS test implementation"]:::task
        Q8["Run UMS test suite locally"]:::task
        Q9["Trace FS to acceptance criteria"]:::task
    end

    subgraph W2["Week 2: First Tests"]
        Q10["Write contract test for one FS"]:::task
        Q11["Write integration test with Testcontainers"]:::task
        Q12["Verify CI gate passes"]:::task
    end

    D1 --> D2 --> D3 --> W2
```

---

## Visual 5-E — DevOps / SRE Journey

```mermaid
flowchart TB
    classDef sectionHeader fill:#0f172a,stroke:#334155,color:#fff,font-weight:bold
    classDef task fill:#1e3a5f,stroke:#3b82f6,color:#fff

    subgraph D1["Day 1: Infrastructure Model"]
        O1["Read ADR 0028 Self-Hosted OSS"]:::task
        O2["Understand OSS-first principle"]:::task
        O3["Read Gitflow ADR 0050"]:::task
    end

    subgraph D2["Day 2-3: Observability Stack"]
        O4["Study OTel Loki Tempo ADR-0007"]:::task
        O5["Review Grafana dashboard setup"]:::task
        O6["Explore Infrastructure Hub"]:::task
    end

    subgraph D3["Day 4-5: Operations"]
        O7["Read all 4 Runbooks RB-01 to 04"]:::task
        O8["Review CI CD quality gates ADR-0005"]:::task
        O9["Study Multi-Cloud Scenarios"]:::task
    end

    subgraph W2["Week 2: First Contribution"]
        O10["Set up OTel locally for product"]:::task
        O11["Validate CI pipeline against ADR-0005"]:::task
        O12["Contribute to or review a Runbook"]:::task
    end

    D1 --> D2 --> D3 --> W2
```

---

## Visual 5-F — Product Manager / PO Journey

```mermaid
flowchart TB
    classDef sectionHeader fill:#0f172a,stroke:#334155,color:#fff,font-weight:bold
    classDef task fill:#1e3a5f,stroke:#3b82f6,color:#fff

    subgraph D1["Day 1: Vision"]
        P1["Read Executive One-Pager"]:::task
        P2["Understand Evolith vs UMS boundary"]:::task
        P3["Read Evolutionary Roadmap phases"]:::task
    end

    subgraph D2["Day 2: Scope Boundaries"]
        P4["Read UMS Reference Model"]:::task
        P5["Understand Demo vs Reference boundary"]:::task
        P6["Review UMS Documentation Index"]:::task
    end

    subgraph D3["Day 3-5: Delivery Model"]
        P7["Read Functional Story Writing Standard"]:::task
        P8["Understand Definition of Done"]:::task
        P9["Review SDLC Framework stages"]:::task
    end

    D1 --> D2 --> D3
```

---

## Visual 5-G — External Provider / Vendor Journey

```mermaid
flowchart TD
    classDef step fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef gate fill:#4a3800,stroke:#f59e0b,color:#fff,font-weight:bold
    classDef doc fill:#14532d,stroke:#22c55e,color:#fff
    classDef stop fill:#7f1d1d,stroke:#ef4444,color:#fff

    START(["🤝 External Vendor\nJoins Ecosystem"])

    START --> S1["STEP 1 — Understand Contracts (Day 1)\nRead: Agnostic Baseline\nRead: ADR-0040 Multi-Runtime Contracts"]:::step
    S1 --> S2["STEP 2 — Risk Assessment (Day 2)\nComplete: Vendor Risk Assessment checklist\nConfirm: Adapter boundary respected"]:::step
    S2 --> G1{"Assessment\npassed?"}:::gate
    G1 -->|NO — issues found| STOP["⛔ Integration not approved\nuntil issues resolved"]:::stop
    G1 -->|YES| S3["STEP 3 — Contract Implementation (Week 1)\nImplement against OpenAPI spec\nRun contract tests (Pact/schema)\nVerify no domain coupling"]:::step
    S3 --> S4["STEP 4 — Validation (Week 2)\nArchitecture Board review\nIntegration test suite passes\nAdapter documented in product ADR"]:::step
    S4 --> DONE["✅ Approved Integration\nMonitored via Vendor Risk Registry"]:::doc
```

---

*Part of the [Architecture Communication Strategy](../architecture-communication-strategy.md)*
