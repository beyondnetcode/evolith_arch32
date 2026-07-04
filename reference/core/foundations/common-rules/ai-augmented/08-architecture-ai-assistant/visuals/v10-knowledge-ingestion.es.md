# V-10 — Knowledge Ingestion & RAG Pipeline


---

## Visual 10-A — Full Ingestion Pipeline

```mermaid
flowchart LR
    classDef source fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef process fill:#4a3800,stroke:#f59e0b,color:#fff
    classDef store fill:#14532d,stroke:#22c55e,color:#fff
    classDef query fill:#4a1a6b,stroke:#9c27b0,color:#fff

    subgraph SOURCE[" Evolith Repository (Source of Truth)"]
        direction TB
        S1["reference/core/architecture/adrs/**/*.md\n57+ ADRs"]:::source
        S2["reference/core/architecture/\ncanonical-patterns/**/*.md"]:::source
        S3["reference/core/sdlc/standards/\nengineering-manifesto.md"]:::source
        S4["reference/core/sdlc/glossary/glossary.md\nNaming conventions"]:::source
        S5["AGENTS.md · .harness/rules/\nglobal-rules.md"]:::source
    end

    subgraph PIPELINE["️ Ingestion Pipeline (CI-triggered)"]
        direction TB
        P1["1. Parse Markdown\nExtract sections by H2/H3\nheadings"]:::process
        P2["2. Enrich Metadata\nADD: adr_id · runtime · phase\ndomain · severity · status"]:::process
        P3["3. Chunk Strategy\nADR: per section\nPattern: full doc\nStandard: per rule"]:::process
        P4["4. Generate Embeddings\nOpenAI text-embedding-3-large\nor self-hosted model"]:::process
        P5["5. Index + Store\nVector DB + metadata\nfilters"]:::process
    end

    subgraph STORES["️ Knowledge Stores"]
        direction TB
        VS1["ADR Vector Store\nChroma / Qdrant\n(self-hosted)"]:::store
        VS2["Patterns Store"]:::store
        VS3["Standards Store\n(rules + examples)"]:::store
        VS4["System Prompt Store\n(always-injected)"]:::store
    end

    subgraph RETRIEVAL[" Retrieval Layer (At query time)"]
        direction TB
        R1["Pre-filter\nruntime + phase + status\nfrom metadata"]:::query
        R2["Semantic Search\nvector similarity\ntop-k chunks"]:::query
        R3["Re-rank\nby ADR status\n(approved > proposed)"]:::query
        R4["Context Assembly\nchunks + metadata +\ncitation template"]:::query
    end

    SOURCE -->|"Git webhook\non main merge"| PIPELINE
    PIPELINE --> STORES
    STORES --> RETRIEVAL
    RETRIEVAL -->|"Injected into\nAI agent context"| AI(["AI Agent\nResponse"]):::query
```

---

## Visual 10-B — Metadata Filter Before Vector Search

```mermaid
flowchart TD
    classDef q fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef filter fill:#4a3800,stroke:#f59e0b,color:#fff
    classDef result fill:#14532d,stroke:#22c55e,color:#fff

    QUERY(["Agent query:\n'Should I import Redis in my domain class?'"])

    F1{"Runtime\ndetected?"}:::filter
    F1 -->|"Node.js project detected"| F2
    F1 -->|"Unknown"| BROAD["Search all runtimes"]

    F2{"Phase\ndetected?"}:::filter
    F2 -->|"Phase 1 (from AGENTS.md)"| F3
    F2 -->|"Unknown"| F3

    F3{"Status\nfilter"}:::filter
    F3 --> ACTIVE["Only chunks where\nstatus = 'approved'\nphase includes '1'\nruntime includes 'nodejs'"]:::filter

    ACTIVE --> SEARCH["Vector similarity search\nagainst pre-filtered pool\n(dramatically smaller, less noise)"]

    SEARCH --> TOP3["Top-3 results:\n1. ADR-0002 (decision section) — score 0.94\n2. Engineering Manifesto §3 (anti-patterns) — score 0.89\n3. ADR-0019 (tactical patterns) — score 0.76"]:::result

    TOP3 --> RESPONSE["AI response:\n'No. ADR-0002 prohibits infrastructure imports\nin the domain layer. Redis belongs in an\ninfrastructure adapter implementing ICache port.'"]:::result

    QUERY --> F1
```

---

## Visual 10-C — Knowledge Freshness Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Draft : Author writes ADR

    Draft --> ProposedChunk : ADR merged to feature branch
    note right of ProposedChunk
        Indexed with status=proposed
        Retrieval returns with
        ️ "DRAFT — not approved" flag
    end note

    ProposedChunk --> ApprovedChunk : Board approves ADR
    note right of ApprovedChunk
        Re-indexed with status=approved
        Full retrieval enabled
        No warning flag
    end note

    ApprovedChunk --> SupersededChunk : New ADR supersedes it
    note right of SupersededChunk
        Chunk marked deprecated=true
        Retrieval redirects to
        superseding ADR
    end note

    ApprovedChunk --> DeprecatedChunk : Technology obsoleted
    note right of DeprecatedChunk
        Blocked from retrieval
        Archived in knowledge base
        but not surfaced to agents
    end note

    SupersededChunk --> [*]
    DeprecatedChunk --> [*]
```

---

## Visual 10-D — MCP Server: ADRs as AI Tools

```mermaid
flowchart LR
    classDef tool fill:#4a1a6b,stroke:#9c27b0,color:#fff
    classDef server fill:#14532d,stroke:#22c55e,color:#fff
    classDef client fill:#1e3a5f,stroke:#3b82f6,color:#fff

    subgraph MCP_SERVER[" Evolith MCP Server (ADR-AI-002)"]
        direction TB
        T1["tool: search_adrs\nargs: query, runtime, phase\nreturns: top-k ADR chunks"]:::tool
        T2["tool: get_adr\nargs: adr_id\nreturns: full ADR structured"]:::tool
        T3["tool: validate_pattern\nargs: code_snippet, runtime\nreturns: violations + citations"]:::tool
        T4["tool: get_naming_rule\nargs: artifact_type, runtime\nreturns: naming rule + examples"]:::tool
        T5["tool: check_dod\nargs: phase, checklist_items\nreturns: DoD compliance status"]:::tool
    end

    CLAUDE["Claude Code\n(MCP client)"]:::client
    CURSOR["Cursor\n(MCP client)"]:::client
    HARNESS["Harness Agent\n(MCP client)"]:::client

    CLAUDE --> MCP_SERVER
    CURSOR --> MCP_SERVER
    HARNESS --> MCP_SERVER

    MCP_SERVER --> VECTOR["Qdrant\nVector Store\n(self-hosted)"]:::server
    MCP_SERVER --> INDEX["ADR JSON\nIndex"]:::server
```
