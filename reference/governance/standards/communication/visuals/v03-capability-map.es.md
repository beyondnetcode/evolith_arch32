# V-03 — Mapa de Capacidades Evolith

> **Audiencia:** Arquitectos, Product Managers, Tech Leads  
> **Propósito:** Qué provee la plataforma Evolith — organizado por dominio  
> **Bilingüe:** [English](./v03-capability-map.md)

---

## Visual 3-A — Landscape de Capacidades Completo

```mermaid
flowchart TB
    classDef title fill:#0f172a,stroke:#334155,color:#fff,font-weight:bold,font-size:15px
    classDef cap_arch fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef cap_eng fill:#14532d,stroke:#22c55e,color:#fff
    classDef cap_del fill:#4a3800,stroke:#f59e0b,color:#fff
    classDef cap_ops fill:#4a1a6b,stroke:#9c27b0,color:#fff
    classDef cap_sec fill:#7f1d1d,stroke:#ef4444,color:#fff
    classDef cap_gov fill:#374151,stroke:#9ca3af,color:#fff

    TITLE["⚡ EVOLITH — PLATAFORMA DE ARQUITECTURA EMPRESARIAL\nMapa de Capacidades"]:::title

    subgraph ARCH["🗺️ CAPACIDADES DE ARQUITECTURA"]
        direction LR
        A1["Ruta de Evolución\nProgresiva\n→ 4 etapas"]:::cap_arch
        A2["Multi-Tenancy\nRLS de Doble Capa\n→ ADR-0010"]:::cap_arch
        A3["Polyglot\nMulti-Runtime\n→ ADR-0040"]:::cap_arch
        A4["Arquitectura\nOrientada a Eventos\n→ ADR-0015"]:::cap_arch
        A5["Diseño API\nContract-First\n→ OpenAPI/gRPC"]:::cap_arch
        A6["Criterios de Extracción\na Microservicio\n→ ADR-0045"]:::cap_arch
    end

    subgraph ENG["⚙️ CAPACIDADES DE INGENIERÍA"]
        direction LR
        E1["SOLID / Código Limpio\nAplicado en CI\n→ Manifiesto §1"]:::cap_eng
        E2["Toolkit Táctico\nDDD\n→ ADR-0019/0029"]:::cap_eng
        E3["Arquitectura\nHexagonal\n→ ADR-0002"]:::cap_eng
        E4["Patrones Canónicos\nCP-01..08\n→ Todos los runtimes"]:::cap_eng
        E5["Lista Negra\nde Anti-Patrones\n→ Manifiesto §3"]:::cap_eng
        E6["Convenciones\nde Nombres\n→ ADR-0056"]:::cap_eng
    end

    subgraph DEL["📦 CAPACIDADES DE ENTREGA"]
        direction LR
        D1["Framework\nSDLC\n3 fases"]:::cap_del
        D2["Definition\nof Done\npor etapa"]:::cap_del
        D3["Estándar de\nEscritura de Historias\n→ Plantilla FS"]:::cap_del
        D4["Branching\nGitflow\n→ ADR-0050"]:::cap_del
        D5["Gates de Calidad\nCI/CD\n→ ADR-0005"]:::cap_del
        D6["Proceso de\nRevisión ADR\n→ Board"]:::cap_del
    end

    subgraph OBS["📡 CAPACIDADES DE OBSERVABILIDAD"]
        direction LR
        O1["OpenTelemetry\nW3C TraceContext\n→ ADR-0007"]:::cap_ops
        O2["Loki\nLogs Estructurados\n→ Stack OTel"]:::cap_ops
        O3["Grafana\nDashboards\n→ Operaciones"]:::cap_ops
        O4["Tempo\nTraza Distribuida\n→ Stack OTel"]:::cap_ops
        O5["Runbooks\nOperacionales RB-01..04\n→ UMS"]:::cap_ops
    end

    subgraph SEC["🔒 CAPACIDADES DE SEGURIDAD"]
        direction LR
        S1["Principios\nZero-Trust\n→ Fase 1+"]:::cap_sec
        S2["Autorización\nRBAC / ABAC\n→ ADR-0012"]:::cap_sec
        S3["Abstracción de\nIdentity Provider\n→ ADR-0020"]:::cap_sec
        S4["MFA / Auth\nAdaptiva\n→ ADR-0026"]:::cap_sec
        S5["Audit Trail\nInmutable\n→ ADR-0016"]:::cap_sec
        S6["Vendor Risk\nAssessment\n→ Checklist"]:::cap_sec
    end

    subgraph GOV["🏛️ CAPACIDADES DE GOBERNANZA"]
        direction LR
        G1["Architecture\nBoard\n→ Charter del Board"]:::cap_gov
        G2["Registro ADR\n57 decisiones\n→ Todos los runtimes"]:::cap_gov
        G3["Taxonomía\ndel Repositorio\n→ Estándar"]:::cap_gov
        G4["Guía de Herencia\nde Repo Hijo\n→ Guía"]:::cap_gov
        G5["Glosario\nLenguaje Ubicuo\n→ Términos de dominio"]:::cap_gov
        G6["Ingeniería\nAI-Augmented\n→ Estándares"]:::cap_gov
    end

    TITLE --> ARCH
    TITLE --> ENG
    TITLE --> DEL
    TITLE --> OBS
    TITLE --> SEC
    TITLE --> GOV
```

---

## Visual 3-B — Cobertura de Capacidades por Runtime

```mermaid
flowchart LR
    classDef runtime fill:#1e3a5f,stroke:#3b82f6,color:#fff,font-weight:bold
    classDef full fill:#14532d,stroke:#22c55e,color:#fff
    classDef partial fill:#4a3800,stroke:#f59e0b,color:#fff
    classDef planned fill:#374151,stroke:#9ca3af,color:#ccc,font-style:italic

    subgraph CORE["Core Agnóstico de Runtime"]
        direction TB
        R0A["✅ Evolución Progresiva"]:::full
        R0B["✅ Estrategia Multi-Tenancy"]:::full
        R0C["✅ Arquitectura Orientada a Eventos"]:::full
        R0D["✅ Pirámide de Testing 70%"]:::full
        R0E["✅ Observabilidad OTel"]:::full
        R0F["✅ Audit Inmutable"]:::full
        R0G["✅ Feature Flagging"]:::full
        R0H["✅ Gitflow / CI-CD"]:::full
    end

    subgraph NODE["Node.js / TypeScript"]
        direction TB
        N1["✅ Clean Architecture NestJS\nADR-0002"]:::full
        N2["✅ BFF / API Gateway\nADR-0008/0030"]:::full
        N3["✅ Auth Graph Compiler\nADR-0021"]:::full
        N4["✅ TypeORM + Dapper\nADR-0043"]:::full
        N5["✅ MFA Adaptiva\nADR-0026"]:::full
    end

    subgraph DOTNET[".NET / C#"]
        direction TB
        D1["✅ EF Core 8 ORM\nADR-0057"]:::full
        D2["✅ Hexagonal / Puertos\nClean Architecture"]:::full
        D3["✅ RLS SQL Server\nModelo 2 capas"]:::full
        D4["✅ Auth XACML\nADR-0039"]:::full
        D5["⚙️ Más ADRs .NET\nen progreso"]:::partial
    end

    subgraph ANDROID["Android / Kotlin"]
        direction TB
        A1["✅ Offline-First\nADR-0004"]:::full
        A2["⚙️ Perfil ampliado\nen progreso"]:::partial
    end

    CORE --> NODE
    CORE --> DOTNET
    CORE --> ANDROID
```

---

## Visual 3-C — Madurez de Capacidades por Fase

```mermaid
quadrantChart
    title Madurez de Capacidad vs Complejidad de Implementación
    x-axis Baja Complejidad --> Alta Complejidad
    y-axis Menor Madurez --> Mayor Madurez
    quadrant-1 Avanzado (Fase 3)
    quadrant-2 Fundación Madura (Fase 1-2)
    quadrant-3 Victorias Rápidas (Empezar Aquí)
    quadrant-4 Diferido (Inversión Justificada)

    Manifiesto de Ingeniería: [0.12, 0.90]
    Arquitectura Hexagonal: [0.20, 0.85]
    Registro ADR: [0.18, 0.88]
    Gitflow + Gates CI: [0.22, 0.82]
    Convenciones de Nombres: [0.10, 0.78]
    Pirámide de Testing: [0.30, 0.80]
    Multi-Tenancy RLS: [0.55, 0.85]
    Transactional Outbox: [0.50, 0.78]
    Tracing Distribuido: [0.52, 0.75]
    Proyecciones CQRS: [0.60, 0.72]
    Sagas Distribuidas: [0.72, 0.70]
    Dapr Service Mesh: [0.75, 0.68]
    Microfrontends: [0.78, 0.65]
    Topología Multi-Cloud: [0.85, 0.72]
    Red Zero-Trust: [0.88, 0.80]
    Compliance as Code: [0.90, 0.78]
```

---

*Parte de la [Estrategia de Comunicación Arquitectónica](../architecture-communication-strategy.es.md)*
