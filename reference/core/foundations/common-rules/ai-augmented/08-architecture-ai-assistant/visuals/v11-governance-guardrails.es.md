# V-11 — Governance, Guardrails & Harness Orchestration


---

## Visual 11-A — The Three Guardrail Layers

```mermaid
flowchart TB
    classDef l1 fill:#7f1d1d,stroke:#ef4444,color:#fff,font-weight:bold
    classDef l2 fill:#4a3800,stroke:#f59e0b,color:#fff,font-weight:bold
    classDef l3 fill:#14532d,stroke:#22c55e,color:#fff,font-weight:bold
    classDef item fill:#1e3a5f,stroke:#3b82f6,color:#fff,font-size:12px

    subgraph L1[" LAYER 1 — SYSTEM PROMPT (Always Active)"]
        direction LR
        L1A["Evolith identity\n& role definition"]:::item
        L1B["Hard blocks list\n(10 non-negotiables)"]:::item
        L1C["Phase context\n(1, 2, or 3)"]:::item
        L1D["Runtime profile\n(Node / .NET / Android)"]:::item
    end

    subgraph L2["🟡 LAYER 2 — RAG GUARDRAILS (Context-sensitive)"]
        direction LR
        L2A["ADR constraints\nretrieved on demand"]:::item
        L2B["Pattern rules +\ncode examples"]:::item
        L2C["Confidence tier\nannotation"]:::item
        L2D["Phase-aware\nfiltering"]:::item
    end

    subgraph L3["🟢 LAYER 3 — CI/CD GATES (Post-generation)"]
        direction LR
        L3A["eslint-plugin-boundaries\ndomain isolation check"]:::item
        L3B["ADR citation\nvalidator"]:::item
        L3C["Coverage gate\n≥70% enforced"]:::item
        L3D["Security scan\nCodeQL + secrets"]:::item
    end

    note1["Override Layer 1: Impossible without Board approval"]:::l1
    note2["Override Layer 2: Requires documented ADR exception"]:::l2
    note3["Override Layer 3: Impossible — automated"]:::l3

    L1 --> L2 --> L3
    L1 -.-> note1
    L2 -.-> note2
    L3 -.-> note3
```

---

## Visual 11-B — Hard Blocks Decision Tree

```mermaid
flowchart TD
    classDef check fill:#4a3800,stroke:#f59e0b,color:#fff
    classDef block fill:#7f1d1d,stroke:#ef4444,color:#fff,font-weight:bold
    classDef warn fill:#4a3800,stroke:#f59e0b,color:#fff
    classDef pass fill:#14532d,stroke:#22c55e,color:#fff

    AI(["AI-generated code\nor suggestion"])

    C1{"Infrastructure import\ninside domain class?"}:::check
    C1 -->|YES| B1[" HARD BLOCK\nADR-0002 violation\nMove to adapter"]:::block
    C1 -->|NO| C2

    C2{"Raw SQL with string\nconcatenation?"}:::check
    C2 -->|YES| B2[" HARD BLOCK\nSQL injection risk\nUse parameterized query"]:::block
    C2 -->|NO| C3

    C3{"Hardcoded secret\nor credential?"}:::check
    C3 -->|YES| B3[" HARD BLOCK\nSecurity violation\nUse Vault / env variable"]:::block
    C3 -->|NO| C4

    C4{"Cross-schema SQL\njoin?"}:::check
    C4 -->|YES| B4[" HARD BLOCK\nADR-0031 violation\nUse domain events or API"]:::block
    C4 -->|NO| C5

    C5{"Stored procedure with\nbusiness logic?"}:::check
    C5 -->|YES| B5[" HARD BLOCK\nZero DB Business Logic rule\nMove logic to domain layer"]:::block
    C5 -->|NO| C6

    C6{"SDK import outside\nadapter boundary?"}:::check
    C6 -->|YES| B6[" HARD BLOCK\nVendor lock-in violation\nWrap in Port/Adapter"]:::block
    C6 -->|NO| C7

    C7{"Missing OTel span\non new use case?"}:::check
    C7 -->|YES| W1["️ WARNING\nADR-0007: Add OTel instrumentation\nSuggest span template"]:::warn
    C7 -->|NO| C8

    C8{"Test coverage drops\nbelow 70%?"}:::check
    C8 -->|YES| W2["️ WARNING\nADR-0018: Add missing tests\nCoverage gate will block CI"]:::warn
    C8 -->|NO| PASS[" PASS\nAll guardrail checks cleared"]:::pass
```

---

## Visual 11-C — Harness AI Approval Workflow (ADR Review)

```mermaid
sequenceDiagram
    actor Dev as Developer / AI Agent
    participant GH as GitHub PR
    participant HA as Harness AI Pipeline
    participant AA as Architect Agent
    participant Board as Architecture Board

    Dev->>GH: Open PR with new ADR draft
    GH->>HA: Webhook: PR opened
    HA->>AA: Trigger: ADR Review Agent

    AA->>AA: Validate ADR template completeness
    AA->>AA: Semantic search for conflicts/supersessions
    AA->>GH: Post review comment (conflicts found / template OK)

    alt Template incomplete or conflicts found
        AA->>Dev: Request changes (automated comment)
        Dev->>GH: Push corrections
        GH->>HA: PR updated → re-trigger
    end

    AA->>HA: ADR validated — request Board approval
    HA->>Board: Approval gate notification (Harness)
    Board->>HA: Member 1 approves
    Board->>HA: Member 2 approves (quorum met)

    HA->>GH: Approval gate passed → PR unblocked
    HA->>AA: Trigger: Knowledge Re-ingestion Agent
    AA->>AA: Re-index new ADR into vector store
    AA->>HA: Re-ingestion complete
    HA->>GH: Comment: "ADR indexed in knowledge base "
```

---

## Visual 11-D — Compliance Gate in CI/CD Pipeline

```mermaid
flowchart LR
    classDef step fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef gate fill:#4a3800,stroke:#f59e0b,color:#fff,font-weight:bold
    classDef pass fill:#14532d,stroke:#22c55e,color:#fff
    classDef fail fill:#7f1d1d,stroke:#ef4444,color:#fff

    PR(["Pull Request\nopened"]):::step

    G1["Gate 1\neslint-boundaries\nDomain isolation"]:::gate
    G2["Gate 2\nNaming convention\nvalidation (ADR-0056)"]:::gate
    G3["Gate 3\nSecurity scan\nCodeQL + secrets"]:::gate
    G4["Gate 4\nTest coverage\n≥70%"]:::gate
    G5["Gate 5\nADR citation check\n(AI-specific gate)"]:::gate
    G6["Gate 6\nArch Board review\n(new patterns only)"]:::gate

    PASS[" All gates passed\nPR ready for\nTech Lead merge"]:::pass
    FAIL[" Gate failed\nAI agent notified\nwith fix suggestion\n+ ADR citation"]:::fail

    PR --> G1
    G1 -->|FAIL| FAIL
    G1 -->|PASS| G2
    G2 -->|FAIL| FAIL
    G2 -->|PASS| G3
    G3 -->|FAIL| FAIL
    G3 -->|PASS| G4
    G4 -->|FAIL| FAIL
    G4 -->|PASS| G5
    G5 -->|FAIL| FAIL
    G5 -->|PASS| G6
    G6 -->|NEEDS BOARD REVIEW| BOARD(["Architecture Board\napproval via Harness"])
    G6 -->|NOT APPLICABLE| PASS
    BOARD -->|APPROVED| PASS
    BOARD -->|REJECTED| FAIL
```

---

## Visual 11-E — Implementation Roadmap Timeline

```mermaid
timeline
    title Evolith AI Architecture Assistant — Implementation Roadmap
    section Phase 0 · Foundation (Weeks 1-4)
        AGENTS.md base     : Write Evolith system prompt
                           : Tag all ADRs with AI metadata
        Tool configs       : .cursorrules · copilot-instructions
                           : Export ADR index as JSON
    section Phase 1 · RAG (Weeks 5-10)
        Vector store       : Choose Qdrant self-hosted
                           : Build ingestion pipeline
        MCP Server         : Expose ADR tools via MCP
                           : Benchmark 20 retrieval queries
        ADR-AI-006         : Write Knowledge Base Governance ADR
    section Phase 2 · Specialist Agents (Weeks 11-18)
        Architect Agent    : ADR lookup + pattern recommendation
        Reviewer Agent     : PR compliance + hard blocks
        Harness gates      : Architecture compliance pipeline step
        Pilot              : One product team · collect metrics
    section Phase 3 · Full Ecosystem (Weeks 19-30)
        All agents live    : Coder · QA · DevOps agents deployed
        Harness multi-agent: Full orchestration via Harness pipelines
        Knowledge versioning: Snapshots synced to Evolith tags
        Dashboard          : AI compliance rate · violations blocked
    section Phase 4 · Enterprise (Weeks 31+)
        Board integration  : ADR proposals via AI-assisted workflow
        Vendor package     : Evolith knowledge for external vendors
        Cross-product sync : Discoveries from satellite repos
```
