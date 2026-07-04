# V-04 — Árbol de Decisión ADR

> **Audiencia:** Arquitectos, Tech Leads, Desarrolladores Senior  
> **Propósito:** Navegar al ADR correcto en menos de 60 segundos  
> **Bilingüe:** [English](./v04-adr-decision-tree.md)

---

## Nota de legibilidad

El diagrama completo del árbol ADR se encuentra en la versión en inglés. Esta versión en español proporciona vistas simplificadas para evitar renderizados ilegibles en GitHub.

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

## Visual 4-B — ADR Core: Arquitectura, Tenancy y Eventos

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

## Visual 4-C — ADR Node.js: Arquitectura y Autorización

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
