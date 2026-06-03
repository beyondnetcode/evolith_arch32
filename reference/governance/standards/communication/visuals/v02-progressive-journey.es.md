# V-02 — Diagrama del Viaje de Arquitectura Progresiva

> **Audiencia:** Todos los equipos  
> **Propósito:** Explicar las 4 etapas evolutivas y exactamente qué dispara cada transición  
> **Bilingüe:** [English](./v02-progressive-journey.md)

---

## Visual 2-A — Las 4 Etapas con sus Disparadores

```mermaid
flowchart TD
    classDef stage fill:#1e3a5f,stroke:#4a90d9,color:#fff,font-weight:bold,padding:10px
    classDef trigger fill:#4a3800,stroke:#f59e0b,color:#fff,font-style:italic
    classDef adr fill:#14532d,stroke:#22c55e,color:#fff,font-size:12px
    classDef forbidden fill:#7f1d1d,stroke:#ef4444,color:#fff

    START([" Nueva Idea\nde Producto"]) --> S1

    subgraph S1["ETAPA 1 — Monolito Simple"]
        M1["Unidad deployable única\nSin fronteras de módulo aún\nEstructura mínima viable"]:::stage
    end

    T1{"¿Equipo ≥ 3 devs?\n¿Múltiples dominios\nemergiendo?"}:::trigger
    S1 --> T1
    T1 -->|NO — quedarse aquí| S1
    T1 -->|SÍ| S2

    subgraph S2["ETAPA 2 — Monolito Modular  DEFAULT"]
        M2["Monorepo Nx con fronteras estrictas\nArquitectura Hexagonal aplicada\nDominio compartido via Shared Kernel\nDB: schema único (SOA) válido en Fase 1\nSchema-per-context opcional → Fase 2+"]:::stage
        A2["ADR-0001 · ADR-0002\nADR-0031 (opcional Fase 1) · ADR-0047"]:::adr
    end

    T2{"¿2 de 4 criterios\nde extracción cumplidos?\nADR-0045"}:::trigger
    S2 --> T2
    T2 -->|NO — quedarse aquí| S2
    T2 -->|SÍ — módulo específico| S3

    subgraph S3["ETAPA 3 — Módulos Distribuidos"]
        M3["Módulos seleccionados extraídos\nSidecars Dapr para service mesh\nTransactional Outbox para async\nSagas Distribuidas para flujos multi-paso"]:::stage
        A3["ADR-0006 · ADR-0033\nADR-0035 · ADR-0046"]:::adr
    end

    T3{"¿La complejidad operacional\ncompleta justifica la\ndistribución global?"}:::trigger
    S3 --> T3
    T3 -->|AÚN NO| S3
    T3 -->|SÍ| S4

    subgraph S4["ETAPA 4 — Microservicios / North Star"]
        M4["Orquestación multi-cloud completa\nArquitectura orientada a eventos a escala\nRed zero-trust\nCompliance-as-Code en CI"]:::stage
        A4["ADR-0013 · ADR-0046\nADR-0055 · Roadmap Fase 3"]:::adr
    end

    WARN[" NUNCA SALTAR ETAPAS\nMicroservicios sin la disciplina de la Etapa 2\n= Monolito Distribuido (lo peor de ambos mundos)"]:::forbidden
    S4 -.-> WARN
```

---

## Visual 2-B — Qué Obtienes en Cada Etapa

```mermaid
flowchart LR
    classDef s1 fill:#374151,stroke:#9ca3af,color:#fff
    classDef s2 fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef s3 fill:#14532d,stroke:#22c55e,color:#fff
    classDef s4 fill:#4a1a6b,stroke:#9c27b0,color:#fff
    classDef cap fill:#f9fafb,stroke:#d1d5db,color:#111,font-size:13px

    S1["Etapa 1\nMonolito\nSimple"]:::s1
    S2["Etapa 2\nMonolito\nModular"]:::s2
    S3["Etapa 3\nMódulos\nDistribuidos"]:::s3
    S4["Etapa 4\nMicro-\nservicios"]:::s4

    S1 --- C1[" Rápido para ship\n Costo operacional bajo\n Fácil de entender\n Sin estrategia de escalabilidad aún"]:::cap
    S2 --- C2[" Aislamiento de dominio\n Autonomía de equipo\n Fronteras testeables\n Ruta de upgrade sin refactoring\n UMS vive aquí hoy"]:::cap
    S3 --- C3[" Escala independiente\n Aislamiento de fallos\n Polyglot posible\n Tracing distribuido requerido\n Mayor carga operacional"]:::cap
    S4 --- C4[" Soberanía cloud completa\n Escalabilidad infinita\n Zero vendor lock-in\n Requiere equipo de plataforma maduro\n Alta inversión operacional"]:::cap
```

---

## Visual 2-C — Criterios de Preparación para Extracción ADR-0045 (Regla 2 de 4)

```mermaid
flowchart TD
    classDef criterion fill:#1e3a5f,stroke:#4a90d9,color:#fff
    classDef gate fill:#4a3800,stroke:#f59e0b,color:#fff,font-weight:bold
    classDef pass fill:#14532d,stroke:#22c55e,color:#fff
    classDef fail fill:#7f1d1d,stroke:#ef4444,color:#fff

    EVAL["Evaluar módulo para\nextracción a microservicio"]

    C1[" Criterio 1\nEscala independiente necesaria\n(perfil de tráfico difiere significativamente)"]:::criterion
    C2[" Criterio 2\nPropiedad de equipo dedicado\n(≥ 2 ingenieros full-time en el módulo)"]:::criterion
    C3[" Criterio 3\nFrontera de compliance aislada\n(SLA, seguridad o zona regulatoria diferente)"]:::criterion
    C4[" Criterio 4\nCuello de botella de performance probado\n(p95 > umbral tras optimización)"]:::criterion

    EVAL --> C1
    EVAL --> C2
    EVAL --> C3
    EVAL --> C4

    GATE{"¿2 o más\ncriterios cumplidos?"}:::gate

    C1 --> GATE
    C2 --> GATE
    C3 --> GATE
    C4 --> GATE

    GATE -->|SÍ — extraer| PASS[" Proceder con extracción\nRevisión del Board requerida\nDocumentar en ADR hijo"]:::pass
    GATE -->|NO — esperar| FAIL[" NO extraer\nPermanecer en Monolito Modular\nRevisitar en el próximo trimestre"]:::fail
```

---

## Visual 2-D — Checklist de Fundación Fase 1 (UMS como ejemplo)

```mermaid
flowchart LR
    classDef done fill:#14532d,stroke:#22c55e,color:#fff
    classDef arch fill:#1e3a5f,stroke:#4a90d9,color:#fff

    UMS["UMS Hoy\nFase 1\nMonolito Modular"]:::arch

    UMS --> A[" Monorepo Nx\nfronteras de lib estrictas"]:::done
    UMS --> B[" Arquitectura Hexagonal\nPuertos + Adaptadores en todas las capas"]:::done
    UMS --> C[" Schema-per-context\n8 bounded contexts\n(elección UMS — opcional en Fase 1)"]:::done
    UMS --> D[" EF Core + SQL Server 2022\ncon failsafe RLS"]:::done
    UMS --> E[" Transactional Outbox\npara todas las escrituras async"]:::done
    UMS --> F[" Gate de cobertura 70%\nen GitHub Actions CI"]:::done
    UMS --> G[" OTel + Loki + Grafana\nstack de observabilidad"]:::done
    UMS --> H[" Trazabilidad ADR completa\nmatriz 16 FS → ADR → TE"]:::done
```

---

*Parte de la [Estrategia de Comunicación Arquitectónica](../architecture-communication-strategy.es.md)*
