# V-03 — Mapa de Capacidades Evolith

> **Audiencia:** Arquitectos, Product Managers, Tech Leads  
> **Propósito:** Qué provee la plataforma Evolith — organizado por dominio  
> **Bilingüe:** [English](./v03-capability-map.md)

---

## Nota de legibilidad

El diagrama 3-A completo se encuentra en la versión en inglés. Esta versión en español proporciona una vista simplificada del landscape de capacidades.

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
