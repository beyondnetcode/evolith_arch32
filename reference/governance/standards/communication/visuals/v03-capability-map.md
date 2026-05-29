# V-03 — Evolith Capability Map

> **Audience:** Architects, Product Managers, Tech Leads  
> **Purpose:** What the Evolith platform provides — organized by domain  
> **Bilingual:** [Español](./v03-capability-map.es.md)

---

## Visual 3-A — Full Capability Landscape

```mermaid
flowchart TB
    classDef title fill:#0f172a,stroke:#334155,color:#fff,font-weight:bold,font-size:15px
    classDef cap_arch fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef cap_eng fill:#14532d,stroke:#22c55e,color:#fff
    classDef cap_del fill:#4a3800,stroke:#f59e0b,color:#fff
    classDef cap_ops fill:#4a1a6b,stroke:#9c27b0,color:#fff
    classDef cap_sec fill:#7f1d1d,stroke:#ef4444,color:#fff
    classDef cap_gov fill:#374151,stroke:#9ca3af,color:#fff

    TITLE["⚡ EVOLITH — ENTERPRISE ARCHITECTURE PLATFORM\nCapability Map"]:::title

    subgraph ARCH["🗺️ ARCHITECTURE CAPABILITIES"]
        direction LR
        A1["Progressive\nEvolution Path\n→ 4 stages"]:::cap_arch
        A2["Multi-Tenancy\nDual-Layer RLS\n→ ADR-0010"]:::cap_arch
        A3["Polyglot\nMulti-Runtime\n→ ADR-0040"]:::cap_arch
        A4["Event-Driven\nArchitecture\n→ ADR-0015"]:::cap_arch
        A5["Contract-First\nAPI Design\n→ OpenAPI/gRPC"]:::cap_arch
        A6["Microservice\nExtraction Criteria\n→ ADR-0045"]:::cap_arch
    end

    subgraph ENG["⚙️ ENGINEERING CAPABILITIES"]
        direction LR
        E1["SOLID / Clean Code\nEnforced in CI\n→ Manifesto §1"]:::cap_eng
        E2["DDD Tactical\nToolkit\n→ ADR-0019/0029"]:::cap_eng
        E3["Hexagonal\nArchitecture\n→ ADR-0002"]:::cap_eng
        E4["Canonical\nPatterns CP-01..08\n→ All runtimes"]:::cap_eng
        E5["Anti-Pattern\nBlacklist\n→ Manifesto §3"]:::cap_eng
        E6["Naming\nConventions\n→ ADR-0056"]:::cap_eng
    end

    subgraph DEL["📦 DELIVERY CAPABILITIES"]
        direction LR
        D1["SDLC\nFramework\n3 phases"]:::cap_del
        D2["Definition\nof Done\nper stage"]:::cap_del
        D3["Story Writing\nStandard\n→ FS template"]:::cap_del
        D4["Gitflow\nBranching\n→ ADR-0050"]:::cap_del
        D5["CI/CD\nQuality Gates\n→ ADR-0005"]:::cap_del
        D6["ADR Review\nProcess\n→ Board"]:::cap_del
    end

    subgraph OBS["📡 OBSERVABILITY CAPABILITIES"]
        direction LR
        O1["OpenTelemetry\nW3C TraceContext\n→ ADR-0007"]:::cap_ops
        O2["Loki\nStructured Logs\n→ OTel stack"]:::cap_ops
        O3["Grafana\nDashboards\n→ Operations"]:::cap_ops
        O4["Tempo\nDistributed Trace\n→ OTel stack"]:::cap_ops
        O5["Operational\nRunbooks RB-01..04\n→ UMS"]:::cap_ops
    end

    subgraph SEC["🔒 SECURITY CAPABILITIES"]
        direction LR
        S1["Zero-Trust\nPrinciples\n→ Phase 1+"]:::cap_sec
        S2["RBAC / ABAC\nAuthorization\n→ ADR-0012"]:::cap_sec
        S3["Identity Provider\nAbstraction\n→ ADR-0020"]:::cap_sec
        S4["MFA / Adaptive\nAuth\n→ ADR-0026"]:::cap_sec
        S5["Immutable\nAudit Trail\n→ ADR-0016"]:::cap_sec
        S6["Vendor Risk\nAssessment\n→ Checklist"]:::cap_sec
    end

    subgraph GOV["🏛️ GOVERNANCE CAPABILITIES"]
        direction LR
        G1["Architecture\nBoard\n→ Board Charter"]:::cap_gov
        G2["ADR Registry\n57 decisions\n→ All runtimes"]:::cap_gov
        G3["Repository\nTaxonomy\n→ Standard"]:::cap_gov
        G4["Child Repo\nInheritance\n→ Guide"]:::cap_gov
        G5["Glossary\nUbiquitous Language\n→ Domain terms"]:::cap_gov
        G6["AI-Augmented\nEngineering\n→ Standards"]:::cap_gov
    end

    TITLE --> ARCH
    TITLE --> ENG
    TITLE --> DEL
    TITLE --> OBS
    TITLE --> SEC
    TITLE --> GOV
```

---

## Visual 3-B — Capability Coverage by Runtime

```mermaid
flowchart LR
    classDef runtime fill:#1e3a5f,stroke:#3b82f6,color:#fff,font-weight:bold
    classDef full fill:#14532d,stroke:#22c55e,color:#fff
    classDef partial fill:#4a3800,stroke:#f59e0b,color:#fff
    classDef planned fill:#374151,stroke:#9ca3af,color:#ccc,font-style:italic

    subgraph CORE["Runtime-Agnostic Core"]
        direction TB
        R0A["✅ Progressive Evolution"]:::full
        R0B["✅ Multi-Tenancy Strategy"]:::full
        R0C["✅ Event-Driven Architecture"]:::full
        R0D["✅ Testing Pyramid 70%"]:::full
        R0E["✅ Observability OTel"]:::full
        R0F["✅ Immutable Audit"]:::full
        R0G["✅ Feature Flagging"]:::full
        R0H["✅ Gitflow / CI-CD"]:::full
    end

    subgraph NODE["Node.js / TypeScript"]
        direction TB
        N1["✅ NestJS Clean Architecture\nADR-0002"]:::full
        N2["✅ BFF / API Gateway\nADR-0008/0030"]:::full
        N3["✅ Auth Graph Compiler\nADR-0021"]:::full
        N4["✅ TypeORM + Dapper\nADR-0043"]:::full
        N5["✅ MFA Adaptive\nADR-0026"]:::full
    end

    subgraph DOTNET[".NET / C#"]
        direction TB
        D1["✅ EF Core 8 ORM\nADR-0057"]:::full
        D2["✅ Hexagonal / Ports\nClean Architecture"]:::full
        D3["✅ SQL Server RLS\n2-layer model"]:::full
        D4["✅ XACML Auth\nADR-0039"]:::full
        D5["⚙️ More .NET ADRs\nin progress"]:::partial
    end

    subgraph ANDROID["Android / Kotlin"]
        direction TB
        A1["✅ Offline-First\nADR-0004"]:::full
        A2["⚙️ Expanded profile\nin progress"]:::partial
    end

    CORE --> NODE
    CORE --> DOTNET
    CORE --> ANDROID
```

---

## Visual 3-C — Capability Maturity by Phase

```mermaid
quadrantChart
    title Capability Maturity vs Implementation Complexity
    x-axis Low Complexity --> High Complexity
    y-axis Lower Maturity --> Higher Maturity
    quadrant-1 "Advanced (Phase 3)"
    quadrant-2 "Mature Foundation (Phase 1-2)"
    quadrant-3 "Quick Wins (Start Here)"
    quadrant-4 "Deferred (Justified Investment)"

    Engineering Manifesto: [0.12, 0.90]
    Hexagonal Architecture: [0.20, 0.85]
    ADR Registry: [0.18, 0.88]
    Gitflow + CI Gates: [0.22, 0.82]
    Naming Conventions: [0.10, 0.78]
    Testing Pyramid: [0.30, 0.80]
    Multi-Tenancy RLS: [0.55, 0.85]
    Transactional Outbox: [0.50, 0.78]
    Distributed Tracing: [0.52, 0.75]
    CQRS Projections: [0.60, 0.72]
    Distributed Sagas: [0.72, 0.70]
    Dapr Service Mesh: [0.75, 0.68]
    Microfrontends: [0.78, 0.65]
    Multi-Cloud Topology: [0.85, 0.72]
    Zero-Trust Network: [0.88, 0.80]
    Compliance as Code: [0.90, 0.78]
```

---

*Part of the [Architecture Communication Strategy](../architecture-communication-strategy.md)*
