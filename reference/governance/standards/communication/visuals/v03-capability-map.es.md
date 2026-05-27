# V-03 — Mapa de Capacidades Evolith

> **Audiencia:** Arquitectos, Product Managers, Tech Leads  
> **Propósito:** Qué provee la plataforma Evolith — organizado por dominio  
> **Bilingüe:** [English](./v03-capability-map.md)

---

## Nota de legibilidad

Esta versión divide el mapa de capacidades en diagramas más pequeños para evitar renderizados rotos o ilegibles en GitHub Mermaid.

---

## Visual 3-A — Landscape de Capacidades Evolith

```mermaid
flowchart TB
    classDef core fill:#0f172a,stroke:#334155,color:#fff,font-weight:bold
    classDef area fill:#1e3a5f,stroke:#3b82f6,color:#fff

    EVOLITH["EVOLITH\nPlataforma de Arquitectura Empresarial"]:::core

    ARCH["Arquitectura\nEvolución progresiva, DDD, eventos, API contracts"]:::area
    ENG["Ingeniería\nClean Code, DDD táctico, patrones canónicos"]:::area
    DEL["Entrega\nSDLC, DoD, Gitflow, CI/CD, ADR review"]:::area
    OBS["Observabilidad\nOpenTelemetry, Grafana, Loki, Tempo, runbooks"]:::area
    SEC["Seguridad\nZero Trust, RBAC/ABAC, IdP, MFA, audit trail"]:::area
    GOV["Gobernanza\nArchitecture Board, ADRs, taxonomía, AI-Augmented"]:::area

    EVOLITH --> ARCH
    EVOLITH --> ENG
    EVOLITH --> DEL
    EVOLITH --> OBS
    EVOLITH --> SEC
    EVOLITH --> GOV
```

---

## Visual 3-A1 — Capacidades de Arquitectura

```mermaid
flowchart LR
    classDef cap fill:#1e3a5f,stroke:#3b82f6,color:#fff

    A0["Arquitectura Evolith"]:::cap
    A1["Evolución progresiva\nSimple -> Modular -> Distribuido"]:::cap
    A2["Multi-Tenancy\nRLS de doble capa\nADR-0010"]:::cap
    A3["Multi-Runtime\nContratos agnósticos\nADR-0040"]:::cap
    A4["Eventos\nIntra-dominio e integración\nADR-0015"]:::cap
    A5["API Contract-First\nREST / gRPC / GraphQL\nADR-0032"]:::cap
    A6["Extracción a Microservicio\nCriterios de preparación\nADR-0045"]:::cap

    A0 --> A1
    A0 --> A2
    A0 --> A3
    A0 --> A4
    A0 --> A5
    A0 --> A6
```

---

## Visual 3-A2 — Capacidades de Ingeniería y Entrega

```mermaid
flowchart TB
    classDef eng fill:#14532d,stroke:#22c55e,color:#fff
    classDef del fill:#4a3800,stroke:#f59e0b,color:#fff

    subgraph ENG["Ingeniería"]
        E1["SOLID / Código Limpio"]:::eng
        E2["DDD táctico"]:::eng
        E3["Arquitectura Hexagonal"]:::eng
        E4["Patrones Canónicos"]:::eng
        E5["Anti-patrones prohibidos"]:::eng
        E6["Convenciones de nombres\nADR-0056"]:::eng
    end

    subgraph DEL["Entrega"]
        D1["SDLC 3 fases"]:::del
        D2["Definition of Done"]:::del
        D3["Historias funcionales"]:::del
        D4["Gitflow\nADR-0050"]:::del
        D5["Gates CI/CD"]:::del
        D6["Revisión ADR"]:::del
    end

    ENG --> DEL
```

---

## Visual 3-A3 — Capacidades Operacionales, Seguridad y Gobernanza

```mermaid
flowchart TB
    classDef obs fill:#4a1a6b,stroke:#9c27b0,color:#fff
    classDef sec fill:#7f1d1d,stroke:#ef4444,color:#fff
    classDef gov fill:#374151,stroke:#9ca3af,color:#fff

    subgraph OBS["Observabilidad"]
        O1["OpenTelemetry\nTraceContext"]:::obs
        O2["Logs estructurados"]:::obs
        O3["Grafana"]:::obs
        O4["Tempo"]:::obs
        O5["Runbooks"]:::obs
    end

    subgraph SEC["Seguridad"]
        S1["Zero Trust"]:::sec
        S2["RBAC / ABAC"]:::sec
        S3["Identity Provider"]:::sec
        S4["MFA / Auth adaptiva"]:::sec
        S5["Audit trail inmutable"]:::sec
        S6["Vendor risk"]:::sec
    end

    subgraph GOV["Gobernanza"]
        G1["Architecture Board"]:::gov
        G2["Registro ADR"]:::gov
        G3["Taxonomía del repositorio"]:::gov
        G4["Herencia de repositorio hijo"]:::gov
        G5["Glosario"]:::gov
        G6["AI-Augmented Engineering"]:::gov
    end

    OBS --> SEC
    SEC --> GOV
```

---

## Visual 3-B — Cobertura de Capacidades por Runtime

```mermaid
flowchart LR
    classDef runtime fill:#1e3a5f,stroke:#3b82f6,color:#fff,font-weight:bold
    classDef full fill:#14532d,stroke:#22c55e,color:#fff
    classDef partial fill:#4a3800,stroke:#f59e0b,color:#fff

    CORE["Core Agnóstico\nEvolución, multi-tenancy, eventos, testing, OTel, audit, feature flags, Gitflow"]:::runtime

    NODE["Node.js / TypeScript\nClean Architecture, BFF, Auth Graph, TypeORM, MFA"]:::full
    DOTNET[".NET / C#\nEF Core, Clean Architecture, RLS, authorization, DDD"]:::full
    ANDROID["Android / Kotlin\nOffline-first y perfil móvil progresivo"]:::partial

    CORE --> NODE
    CORE --> DOTNET
    CORE --> ANDROID
```

---

## Visual 3-C — Madurez de Capacidades por Fase

```mermaid
flowchart TB
    classDef quick fill:#14532d,stroke:#22c55e,color:#fff
    classDef mature fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef advanced fill:#4a1a6b,stroke:#9c27b0,color:#fff
    classDef deferred fill:#4a3800,stroke:#f59e0b,color:#fff

    subgraph Q1["Victorias rápidas"]
        QR1["Convenciones de nombres"]:::quick
        QR2["Manifiesto de ingeniería"]:::quick
        QR3["Registro ADR"]:::quick
        QR4["Gitflow + gates CI"]:::quick
    end

    subgraph Q2["Fundación madura"]
        M1["Arquitectura hexagonal"]:::mature
        M2["Pirámide de testing"]:::mature
        M3["Multi-tenancy RLS"]:::mature
        M4["Tracing distribuido"]:::mature
        M5["Transactional Outbox"]:::mature
    end

    subgraph Q3["Avanzado"]
        A1["Proyecciones CQRS"]:::advanced
        A2["Sagas distribuidas"]:::advanced
        A3["Service mesh / Dapr"]:::advanced
        A4["Microfrontends"]:::advanced
    end

    subgraph Q4["Diferido / inversión justificada"]
        D1["Topología multi-cloud"]:::deferred
        D2["Zero Trust avanzado"]:::deferred
        D3["Compliance as Code"]:::deferred
    end

    Q1 --> Q2
    Q2 --> Q3
    Q3 --> Q4
```

---

*Parte de la [Estrategia de Comunicación Arquitectónica](../architecture-communication-strategy.es.md)*
