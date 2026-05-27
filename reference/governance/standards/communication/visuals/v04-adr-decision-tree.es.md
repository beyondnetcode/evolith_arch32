# V-04 — Árbol de Decisión ADR

> **Audiencia:** Arquitectos, Tech Leads, Desarrolladores Senior  
> **Propósito:** Navegar al ADR correcto en menos de 60 segundos  
> **Bilingüe:** [English](./v04-adr-decision-tree.md)

---

## Nota de legibilidad

El árbol ADR fue dividido en diagramas más pequeños para evitar que Mermaid renderice una imagen demasiado grande, difícil de leer o imposible de desplazar con zoom en GitHub.

---

## Visual 4-A — Embudo de Decisión de Nivel Superior

```mermaid
flowchart TD
    classDef question fill:#1e3a5f,stroke:#4a90d9,color:#fff,font-weight:bold
    classDef category fill:#4a3800,stroke:#f59e0b,color:#fff,font-weight:bold
    classDef runtime fill:#4a1a6b,stroke:#9c27b0,color:#fff

    START(["Tengo una pregunta arquitectónica"])
    Q1{"¿Es agnóstica de runtime?"}:::question

    START --> Q1
    Q1 -->|Sí| CORE["ADRs Core\nVer Visual 4-B"]:::category
    Q1 -->|No| RT{"¿Qué runtime?"}:::question

    RT --> NODE["Node.js / TypeScript\nVer Visual 4-C"]:::runtime
    RT --> DOTNET[".NET / C#\nVer Visual 4-D"]:::runtime
    RT --> ANDROID["Android / Kotlin\nRegistro ADR Android"]:::runtime
    RT --> MATRIX["No estoy seguro\nUsar Matriz ADR"]:::category
```

---

## Visual 4-B1 — ADR Core: Arquitectura, Tenancy y Eventos

```mermaid
flowchart TD
    classDef q fill:#1e3a5f,stroke:#4a90d9,color:#fff
    classDef adr fill:#14532d,stroke:#22c55e,color:#fff

    CORE(["Preocupación Core"])

    CORE --> QA{"¿Etapa o estructura?"}:::q
    QA --> A1["ADR-0047\nMonolito / SOA / Microservicios"]:::adr
    QA --> A2["ADR-0045\nPreparación para extracción"]:::adr
    QA --> A3["ADR-0001\nMonorepo Nx"]:::adr

    CORE --> QB{"¿Multi-tenancy o aislamiento?"}:::q
    QB --> B1["ADR-0010\nRLS doble capa"]:::adr
    QB --> B2["ADR-0031\nSchema per Context"]:::adr
    QB --> B3["ADR-0044\nSeguridad configurable"]:::adr

    CORE --> QC{"¿Eventos o async?"}:::q
    QC --> C1["ADR-0015\nEvent Bus inyectable"]:::adr
    QC --> C2["ADR-0033\nTransactional Outbox"]:::adr
    QC --> C3["ADR-0035\nSagas distribuidas"]:::adr
    QC --> C4["ADR-0036\nMessage Bus FIFO / DLQ"]:::adr
```

---

## Visual 4-B2 — ADR Core: Calidad, Identidad, Infraestructura y Performance

```mermaid
flowchart TD
    classDef q fill:#1e3a5f,stroke:#4a90d9,color:#fff
    classDef adr fill:#14532d,stroke:#22c55e,color:#fff

    CORE(["Preocupación Core"])

    CORE --> QD{"¿CQRS o lectura?"}:::q
    QD --> D1["ADR-0034\nMatriz CQRS"]:::adr

    CORE --> QE{"¿Identidad, Auth o auditoría?"}:::q
    QE --> E1["ADR-0020\nIdentity Provider"]:::adr
    QE --> E2["ADR-0016\nAudit trail inmutable"]:::adr

    CORE --> QF{"¿Testing o calidad?"}:::q
    QF --> F1["ADR-0018\nPirámide de testing"]:::adr
    QF --> F2["ADR-0052\nUnit testing isolation"]:::adr
    QF --> F3["ADR-0053\nIntegración y E2E"]:::adr
    QF --> F4["ADR-0005\nGates CI/CD"]:::adr

    CORE --> QG{"¿Infraestructura?"}:::q
    QG --> G1["ADR-0028\nOSS self-hosted"]:::adr
    QG --> G2["ADR-0013\nCloud y DR"]:::adr
    QG --> G3["ADR-0006\nDapr futuro"]:::adr
    QG --> G4["ADR-0046\nObservabilidad Dapr"]:::adr

    CORE --> QH{"¿Caching o performance?"}:::q
    QH --> H1["ADR-0014\nRedis 4 niveles"]:::adr
```

---

## Visual 4-B3 — ADR Core: API, Datos, Resiliencia y Configuración

```mermaid
flowchart TD
    classDef q fill:#1e3a5f,stroke:#4a90d9,color:#fff
    classDef adr fill:#14532d,stroke:#22c55e,color:#fff

    CORE(["Preocupación Core"])

    CORE --> QI{"¿Contratos API o protocolos?"}:::q
    QI --> I1["ADR-0032\nREST vs gRPC vs GraphQL"]:::adr
    QI --> I2["ADR-0040\nContratos multi-runtime"]:::adr
    QI --> I3["ADR-0030\nAPI Gateway"]:::adr

    CORE --> QJ{"¿Base de datos o nombres?"}:::q
    QJ --> J1["ADR-0051\nMotor de BD empresarial"]:::adr
    QJ --> J2["ADR-0054\nDiseño y normalización BD"]:::adr
    QJ --> J3["ADR-0056\nConvenciones de nombres"]:::adr
    QJ --> J4["ADR-0049\nSemántica y clean code"]:::adr

    CORE --> QK{"¿Resiliencia?"}:::q
    QK --> K1["ADR-0011\nRetry / Circuit Breaker / Bulkhead"]:::adr

    CORE --> QL{"¿Feature flags o configuración?"}:::q
    QL --> L1["ADR-0017\nFeature flagging"]:::adr
    QL --> L2["ADR-0024\nConfig y features"]:::adr
    QL --> L3["ADR-0025\nFeature provider"]:::adr
```

---

## Visual 4-C1 — ADR Node.js: Arquitectura y Autorización

```mermaid
flowchart TD
    classDef q fill:#14532d,stroke:#22c55e,color:#fff
    classDef adr fill:#1e3a5f,stroke:#3b82f6,color:#fff

    NODE(["Pregunta Node.js"])

    NODE --> NA{"¿Patrón de arquitectura?"}:::q
    NA --> NA1["ADR-0002\nClean Architecture NestJS"]:::adr
    NA --> NA2["ADR-0003\nTypeScript estricto"]:::adr
    NA --> NA3["ADR-0008\nBFF progresivo"]:::adr

    NODE --> NB{"¿Autorización o grafo?"}:::q
    NB --> NB1["ADR-0012\nRBAC / ABAC"]:::adr
    NB --> NB2["ADR-0021\nAuth Graph Compiler"]:::adr
    NB --> NB3["ADR-0022\nProyecciones contextuales"]:::adr
    NB --> NB4["ADR-0023\nKernel UMS"]:::adr
```

---

## Visual 4-C2 — ADR Node.js: API, Datos, DDD y Frontend

```mermaid
flowchart TD
    classDef q fill:#14532d,stroke:#22c55e,color:#fff
    classDef adr fill:#1e3a5f,stroke:#3b82f6,color:#fff

    NODE(["Pregunta Node.js"])

    NODE --> NC{"¿Identidad o MFA?"}:::q
    NC --> NC1["ADR-0026\nMFA / Auth adaptiva"]:::adr

    NODE --> ND{"¿API o gateway?"}:::q
    ND --> ND1["ADR-0027\nREST + gRPC"]:::adr

    NODE --> NE{"¿Acceso a datos?"}:::q
    NE --> NE1["ADR-0043\nTypeORM / Dapper"]:::adr

    NODE --> NF{"¿Primitivos DDD?"}:::q
    NF --> NF1["ADR-0029\nDDD táctico"]:::adr

    NODE --> NG{"¿Errores?"}:::q
    NG --> NG1["ADR-0038\nResult Pattern TS"]:::adr

    NODE --> NH{"¿Observabilidad?"}:::q
    NH --> NH1["ADR-0007\nOTel + Loki"]:::adr

    NODE --> NI{"¿Frontend o mobile?"}:::q
    NI --> NI1["ADR-0004\nOffline frontend"]:::adr
    NI --> NI2["ADR-0055\nMicrofrontends"]:::adr
```

---

## Visual 4-D — ADR .NET / C#

```mermaid
flowchart TD
    classDef q fill:#4a1a6b,stroke:#9c27b0,color:#fff
    classDef adr fill:#1e3a5f,stroke:#3b82f6,color:#fff

    DOTNET(["Pregunta .NET"])

    DOTNET --> DA{"¿Acceso a datos?"}:::q
    DA --> DA1["ADR-0057\nEF Core + reglas Dapper"]:::adr

    DOTNET --> DB{"¿Autorización?"}:::q
    DB --> DB1["ADR-0039 ref\nPEP / PDP / PAP / PIP"]:::adr

    DOTNET --> DC{"¿Dominio / DDD?"}:::q
    DC --> DC1["ADR-0054 UMS\nShell Library DDD"]:::adr

    DOTNET --> DD{"¿Línea base?"}:::q
    DD --> DD1["Manifiesto de Ingeniería\nHexagonal / SOLID"]:::adr

    DOTNET --> DE{"¿Testing?"}:::q
    DE --> DE1["ADR-0018 / 0052 / 0053\nxUnit / Testcontainers"]:::adr

    DOTNET --> DF{"¿Multi-tenancy + RLS?"}:::q
    DF --> DF1["ADR-0010\nEF Core + SQL Server RLS"]:::adr
```

---

*Parte de la [Estrategia de Comunicación Arquitectónica](../architecture-communication-strategy.es.md)*
