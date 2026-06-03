# V-02 — Progressive Architecture Journey Diagram

> **Audience:** All teams  
> **Purpose:** Explain the 4 evolutionary stages and exactly what triggers each transition  
> **Bilingual:** [Español](./v02-progressive-journey.es.md)

---

## Visual 2-A — The 4 Stages with Triggers

```mermaid
flowchart TD
    classDef stage fill:#1e3a5f,stroke:#4a90d9,color:#fff,font-weight:bold,padding:10px
    classDef trigger fill:#4a3800,stroke:#f59e0b,color:#fff,font-style:italic
    classDef adr fill:#14532d,stroke:#22c55e,color:#fff,font-size:12px
    classDef forbidden fill:#7f1d1d,stroke:#ef4444,color:#fff

    START([" New Product\nIdea"]) --> S1

    subgraph S1["STAGE 1 — Simple Monolith"]
        M1["Single deployable unit\nNo module boundaries yet\nSmallest viable structure"]:::stage
    end

    T1{"Team ≥ 3 devs?\nMultiple domains\nemerging?"}:::trigger
    S1 --> T1
    T1 -->|NO — stay here| S1
    T1 -->|YES| S2

    subgraph S2["STAGE 2 — Modular Monolith  DEFAULT"]
        M2["Nx monorepo with strict boundaries\nHexagonal Architecture enforced\nShared domain via Shared Kernel\nDB: single schema (SOA) valid in Phase 1\nSchema-per-context optional → Phase 2+"]:::stage
        A2["ADR-0001 · ADR-0002\nADR-0031 (optional Ph1) · ADR-0047"]:::adr
    end

    T2{"2-of-4 extraction\ncriteria met?\nADR-0045"}:::trigger
    S2 --> T2
    T2 -->|NO — stay here| S2
    T2 -->|YES — specific module| S3

    subgraph S3["STAGE 3 — Distributed Modules"]
        M3["Selected modules extracted\nDapr sidecars for service mesh\nTransactional Outbox for async\nDistributed Sagas for multi-step flows"]:::stage
        A3["ADR-0006 · ADR-0033\nADR-0035 · ADR-0046"]:::adr
    end

    T3{"Full operational\ncomplexity justifies\nglobal distribution?"}:::trigger
    S3 --> T3
    T3 -->|NOT YET| S3
    T3 -->|YES| S4

    subgraph S4["STAGE 4 — Microservices / North Star"]
        M4["Full multi-cloud orchestration\nEvent-Driven Architecture at scale\nZero-trust networking\nCompliance-as-Code in CI"]:::stage
        A4["ADR-0013 · ADR-0046\nADR-0055 · Roadmap Phase 3"]:::adr
    end

    WARN[" NEVER SKIP STAGES\nMicroservices without Stage 2 discipline\n= Distributed Monolith (worst of both worlds)"]:::forbidden
    S4 -.-> WARN
```

---

## Visual 2-B — What You Get at Each Stage

```mermaid
flowchart LR
    classDef s1 fill:#374151,stroke:#9ca3af,color:#fff
    classDef s2 fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef s3 fill:#14532d,stroke:#22c55e,color:#fff
    classDef s4 fill:#4a1a6b,stroke:#9c27b0,color:#fff
    classDef cap fill:#f9fafb,stroke:#d1d5db,color:#111,font-size:13px

    S1["Stage 1\nSimple\nMonolith"]:::s1
    S2["Stage 2\nModular\nMonolith"]:::s2
    S3["Stage 3\nDistributed\nModules"]:::s3
    S4["Stage 4\nMicro-\nservices"]:::s4

    S1 --- C1[" Fast to ship\n Low ops cost\n Easy to understand\n No scalability story yet"]:::cap
    S2 --- C2[" Domain isolation\n Team autonomy\n Testable boundaries\n Zero-refactor upgrade path\n UMS lives here today"]:::cap
    S3 --- C3[" Independent scaling\n Fault isolation\n Polyglot possible\n Distributed tracing required\n Higher ops burden"]:::cap
    S4 --- C4[" Full cloud sovereignty\n Infinite scalability\n Zero vendor lock-in\n Requires mature platform team\n High operational investment"]:::cap
```

---

## Visual 2-C — ADR-0045 Extraction Readiness Criteria (2-of-4 Rule)

```mermaid
flowchart TD
    classDef criterion fill:#1e3a5f,stroke:#4a90d9,color:#fff
    classDef gate fill:#4a3800,stroke:#f59e0b,color:#fff,font-weight:bold
    classDef pass fill:#14532d,stroke:#22c55e,color:#fff
    classDef fail fill:#7f1d1d,stroke:#ef4444,color:#fff

    EVAL["Evaluate module for\nmicroservice extraction"]

    C1[" Criterion 1\nIndependent scaling needed\n(traffic profile differs significantly)"]:::criterion
    C2[" Criterion 2\nDedicated team ownership\n(≥ 2 engineers full-time on module)"]:::criterion
    C3[" Criterion 3\nIsolated compliance boundary\n(different SLA, security, or regulatory zone)"]:::criterion
    C4[" Criterion 4\nPerformance bottleneck proven\n(p95 > threshold after optimization)"]:::criterion

    EVAL --> C1
    EVAL --> C2
    EVAL --> C3
    EVAL --> C4

    GATE{"2 or more\ncriteria met?"}:::gate

    C1 --> GATE
    C2 --> GATE
    C3 --> GATE
    C4 --> GATE

    GATE -->|YES — extract| PASS[" Proceed with extraction\nBoard review required\nDocument in child ADR"]:::pass
    GATE -->|NO — wait| FAIL[" Do NOT extract\nStay in Modular Monolith\nRevisit in next quarter"]:::fail
```

---

## Visual 2-D — The Phase 1 Foundation Checklist (UMS as example)

```mermaid
flowchart LR
    classDef done fill:#14532d,stroke:#22c55e,color:#fff
    classDef arch fill:#1e3a5f,stroke:#4a90d9,color:#fff

    UMS["UMS Today\nPhase 1\nModular Monolith"]:::arch

    UMS --> A[" Nx monorepo\nstrict lib boundaries"]:::done
    UMS --> B[" Hexagonal Architecture\nPorts + Adapters in all layers"]:::done
    UMS --> C[" Schema-per-context\n8 bounded contexts\n(UMS choice — optional in Ph1)"]:::done
    UMS --> D[" EF Core + SQL Server 2022\nwith RLS failsafe"]:::done
    UMS --> E[" Transactional Outbox\nfor all async writes"]:::done
    UMS --> F[" 70% test coverage gate\nin GitHub Actions CI"]:::done
    UMS --> G[" OTel + Loki + Grafana\nobservability stack"]:::done
    UMS --> H[" Full ADR traceability\n16 FS → ADR → TE matrix"]:::done
```

---

*Part of the [Architecture Communication Strategy](../architecture-communication-strategy.md)*
