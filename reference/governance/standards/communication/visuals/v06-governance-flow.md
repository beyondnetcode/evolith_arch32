# V-06 — Governance Flow Diagram

> **Audience:** Architects, Tech Leads, Architecture Board  
> **Purpose:** Visualize the full ADR lifecycle and governance decision paths  
> **Bilingual:** [Español](./v06-governance-flow.es.md)

---

## Visual 6-A — ADR Lifecycle (Full State Machine)

```mermaid
stateDiagram-v2
    [*] --> Identified : Architectural\nquestion surfaces

    Identified --> Researching : Author assigned\nContext documented

    Researching --> DraftProposal : Options analyzed\nTrade-offs mapped

    DraftProposal --> ProductADR : Product-specific\ndecision

    DraftProposal --> EvolíthReview : Universal /\ncross-product decision

    ProductADR --> ProductApproved : Product\nArchitect approves
    ProductApproved --> Active : Merged to\nchild repo

    EvolíthReview --> BoardReview : Architecture Board\nmeeting scheduled

    BoardReview --> Approved : Consensus\nreached
    BoardReview --> Rejected : Does not meet\nEvolith standards
    BoardReview --> NeedsRevision : More context\nrequired

    NeedsRevision --> Researching : Back to\nresearch

    Rejected --> ProductADR : Reclassify as\nproduct-specific

    Approved --> Active : Merged to\nEvolith main
    Active --> Superseded : New ADR\nreplaces it
    Active --> Deprecated : Technology\nobsoleted

    Superseded --> [*]
    Deprecated --> [*]

    note right of Active
        All child repos automatically
        inherit this decision.
        Divergence requires
        documented override ADR.
    end note
```

---

## Visual 6-B — Who Decides What (RACI Matrix)

```mermaid
flowchart LR
    classDef role fill:#1e3a5f,stroke:#3b82f6,color:#fff,font-weight:bold
    classDef r fill:#7f1d1d,stroke:#ef4444,color:#fff
    classDef a fill:#14532d,stroke:#22c55e,color:#fff
    classDef c fill:#4a3800,stroke:#f59e0b,color:#fff
    classDef i fill:#374151,stroke:#9ca3af,color:#fff

    subgraph ROLES["ROLES"]
        R1["Architecture Board"]:::role
        R2["Product Architect"]:::role
        R3["Tech Lead"]:::role
        R4["Engineer"]:::role
    end

    subgraph DECISIONS["KEY DECISIONS"]
        D1["New Core ADR\n(universal)"]
        D2["Product ADR\n(child repo)"]
        D3["ADR Override\n(divergence)"]
        D4["Tech Stack Change"]
        D5["PR Merge\n(feature)"]
        D6["Promotion to Evolith"]
    end

    R1 -->|"A — Accountable"| D1
    R2 -->|"R — Responsible"| D1
    R3 -->|"C — Consulted"| D1
    R4 -->|"I — Informed"| D1

    R2 -->|"A — Accountable"| D2
    R3 -->|"R — Responsible"| D2
    R4 -->|"C — Consulted"| D2
    R1 -->|"I — Informed"| D2

    R1 -->|"A — Accountable"| D3
    R2 -->|"R — Responsible"| D3
    R3 -->|"C — Consulted"| D3

    R1 -->|"A — Accountable"| D4
    R2 -->|"R — Responsible"| D4

    R3 -->|"A — Accountable"| D5
    R4 -->|"R — Responsible"| D5

    R1 -->|"A — Final Approval"| D6
    R2 -->|"R — Nominates"| D6
```

---

## Visual 6-C — Promotion Path: Product → Evolith

```mermaid
flowchart TD
    classDef prod fill:#14532d,stroke:#22c55e,color:#fff
    classDef evolith fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef gate fill:#4a3800,stroke:#f59e0b,color:#fff,font-weight:bold
    classDef action fill:#374151,stroke:#9ca3af,color:#fff

    START(["💡 Discovery in\nProduct Repository\n(e.g. UMS)"]):::prod

    S1["Product Architect identifies\ndecision that may be universal\n\nDocs: product ADR + evidence\nfrom real implementation"]:::prod

    S2["Nomination submitted\nto Architecture Board\n\nIncludes: context, decision,\nconsequences, production evidence"]:::action

    G1{"Does the decision\napply to ≥ 2 runtimes\nor ≥ 2 product teams?"}:::gate
    G1 -->|NO| STAY["Remains product ADR\nReferences Evolith ADRs\nthat influenced it"]:::prod
    G1 -->|YES| REVIEW

    REVIEW["Architecture Board Review\n\nEvaluates:\n• Universality\n• Trade-off completeness\n• Compatibility with existing ADRs\n• Runtime-agnostic formulation"]:::action

    G2{"Board\nconsensus?"}:::gate
    G2 -->|NO — needs work| REVISE["Author revises\nadds missing context\nor evidence"]:::action
    G2 -->|YES| PROMOTE

    PROMOTE["ADR promoted to Evolith\n\nOriginal product ADR updated\nto reference the new core ADR\nAll child repos inherit it"]:::evolith

    REVISE --> G1

    START --> S1 --> S2 --> G1
    G1 -->|YES| REVIEW --> G2 --> PROMOTE
```

---

## Visual 6-D — Governance Enforcement Layers

```mermaid
flowchart TB
    classDef auto fill:#14532d,stroke:#22c55e,color:#fff
    classDef human fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef policy fill:#4a1a6b,stroke:#9c27b0,color:#fff

    subgraph AUTOMATED["🤖 AUTOMATED ENFORCEMENT (Cannot be bypassed)"]
        direction LR
        AE1["eslint-plugin-boundaries\nBlocks cross-layer imports\nin CI"]:::auto
        AE2["Test coverage gate\n≥70% enforced in\nGitHub Actions"]:::auto
        AE3["CodeQL security scan\nBlocks vulnerable code\n→ ADR-0005"]:::auto
        AE4["Dependency pinning\nNo ^ or ~ ranges\n→ ADR-0009"]:::auto
        AE5["Schema isolation check\nNo cross-schema SQL joins\n→ ADR-0031"]:::auto
    end

    subgraph HUMAN["👤 HUMAN REVIEW (Tech Lead + Architect)"]
        direction LR
        HR1["PR Architecture Review\nHexagonal boundaries\nPort/Adapter discipline"]:::human
        HR2["ADR Coverage Check\nEvery new pattern has\na governing ADR"]:::human
        HR3["Ubiquitous Language\nDomain naming aligns\nwith Glossary"]:::human
        HR4["No premature extraction\nADR-0045 criteria\nnot violated"]:::human
    end

    subgraph BOARD["🏛️ BOARD OVERSIGHT (Architecture Board)"]
        direction LR
        BO1["Quarterly ADR Review\nSuperseded/deprecated\nADRs processed"]:::policy
        BO2["Tech Stack Governance\nNew tools require\nBoard-approved ADR"]:::policy
        BO3["Child Repo Audit\nDivergences reviewed\nannually"]:::policy
    end

    AUTOMATED --> HUMAN --> BOARD
```

---

*Part of the [Architecture Communication Strategy](../architecture-communication-strategy.md)*
