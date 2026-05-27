# V-07 — Visual de Trazabilidad UMS → Evolith

> **Audiencia:** Tech Leads, QA, Arquitectos  
> **Propósito:** Mostrar que cada requerimiento UMS traza a un ADR Evolith — y viceversa  
> **Bilingüe:** [English](./v07-traceability-visual.md)

---

## Visual 7-A — Heatmap de Cobertura ADR por Clúster de Dominio

```mermaid
flowchart TB
    classDef cluster fill:#0f172a,stroke:#334155,color:#aaa,font-weight:bold
    classDef fs fill:#1e3a5f,stroke:#3b82f6,color:#fff,font-size:12px
    classDef adr fill:#14532d,stroke:#22c55e,color:#fff,font-size:11px
    classDef te fill:#4a3800,stroke:#f59e0b,color:#fff,font-size:11px
    classDef hot fill:#7f1d1d,stroke:#ef4444,color:#fff,font-size:11px

    subgraph IDENTITY["🔐 CLÚSTER IDENTIDAD"]
        FS01["FS-01\nAutenticación de Usuario"]:::fs
        FS08["FS-08\nRedireccionamiento Login Hosted"]:::fs
        FS09["FS-09\nMFA / Passwordless Adaptiva"]:::fs
        ADR_ID["ADR-0020 Abstracción IdP\nADR-0026 MFA Adaptiva"]:::adr
        TE_ID["TE-01 Flujo JWT / OIDC"]:::te
        FS01 & FS08 & FS09 --> ADR_ID --> TE_ID
    end

    subgraph AUTHZ["🛡️ CLÚSTER AUTORIZACIÓN"]
        FS02["FS-02\nCrear Plantilla de Auth"]:::fs
        FS05["FS-05\nCrear Perfil / Plantilla Manual"]:::fs
        FS07["FS-07\nResolvedor Visual de Grafo"]:::fs
        FS14["FS-14\nAdministración Delegada"]:::fs
        FS16["FS-16\nPolítica de Aplicación de Acceso"]:::fs
        ADR_AZ["ADR-0012 RBAC/ABAC\nADR-0021 Grafo de Auth\nADR-0022 Proyecciones Contextuales\nADR-0023 Frontera Kernel"]:::hot
        TE_AZ["TE-02 Compilador de Grafo de Permisos"]:::te
        FS02 & FS05 & FS07 & FS14 & FS16 --> ADR_AZ --> TE_AZ
    end

    subgraph TENANT["🏢 CLÚSTER TENANCY"]
        FS03["FS-03\nRegistrar Organización"]:::fs
        FS04["FS-04\nRegistrar Topología del Sistema"]:::fs
        ADR_TN["ADR-0010 RLS Multi-Tenancy\nADR-0031 Schema por Contexto\nADR-0034 CQRS"]:::adr
        TE_TN["TE-03 Provisionamiento de Tenant\nTE-06 Reconstrucción Proyección CQRS"]:::te
        FS03 & FS04 --> ADR_TN --> TE_TN
    end

    subgraph EVENTS["⚡ CLÚSTER EVENTOS"]
        FS06["FS-06\nAsignación Auto de Plantilla"]:::fs
        FS10["FS-10\nAcceso B2B Externo / Aprobación"]:::fs
        FS11["FS-11\nCarga de Documento"]:::fs
        FS12["FS-12\nProceso de Promoción de Rol"]:::fs
        FS15["FS-15\nReglas de Notificación"]:::fs
        ADR_EV["ADR-0015 Event Bus Inyectable\nADR-0033 Transactional Outbox\nADR-0035 Sagas Distribuidas\nADR-0036 FIFO / DLQ"]:::hot
        TE_EV["TE-04 Transactional Outbox\nTE-05 Saga Distribuida (Dapr)"]:::te
        FS06 & FS10 & FS11 & FS12 & FS15 --> ADR_EV --> TE_EV
    end

    subgraph CONFIG["⚙️ CLÚSTER CONFIGURACIÓN"]
        FS13["FS-13\nConfiguración Jerárquica"]:::fs
        ADR_CF["ADR-0024 Plataforma de Config\nADR-0034 CQRS"]:::adr
        TE_CF["TE-06 Reconstrucción Proyección CQRS"]:::te
        FS13 --> ADR_CF --> TE_CF
    end
```

---

## Visual 7-B — Traza Completa FS → ADR → TE (Forward)

```mermaid
flowchart LR
    classDef fs fill:#1e3a5f,stroke:#3b82f6,color:#fff,font-size:11px
    classDef adr fill:#14532d,stroke:#22c55e,color:#fff,font-size:11px
    classDef te fill:#4a3800,stroke:#f59e0b,color:#fff,font-size:11px

    FS01["FS-01\nAutenticación"]:::fs --> ADR0020["ADR-0020\nAbstracción IdP"]:::adr
    FS01 --> ADR0026["ADR-0026\nMFA Adaptiva"]:::adr
    ADR0020 & ADR0026 --> TE01["TE-01\nJWT/OIDC"]:::te

    FS02["FS-02\nPlantilla Auth"]:::fs --> ADR0012["ADR-0012\nRBAC/ABAC"]:::adr
    FS02 --> ADR0021["ADR-0021\nGrafo Auth"]:::adr
    ADR0012 & ADR0021 --> TE02["TE-02\nGrafo Permisos"]:::te

    FS03["FS-03\nRegistrar Org"]:::fs --> ADR0010["ADR-0010\nMulti-Tenancy"]:::adr
    FS03 --> ADR0033["ADR-0033\nOutbox"]:::adr
    ADR0010 --> TE03["TE-03\nProv. Tenant"]:::te
    ADR0033 --> TE04["TE-04\nOutbox"]:::te

    FS06["FS-06\nAuto-Asignar"]:::fs --> ADR0015["ADR-0015\nEvent Bus"]:::adr
    ADR0015 --> TE04

    FS10["FS-10\nAcceso B2B"]:::fs --> ADR0035["ADR-0035\nSagas"]:::adr
    ADR0035 --> TE05["TE-05\nSaga Distrib."]:::te

    FS12["FS-12\nPromoción Rol"]:::fs --> ADR0035
    FS04["FS-04\nTopología"]:::fs --> ADR0034["ADR-0034\nCQRS"]:::adr
    FS13["FS-13\nConfig"]:::fs --> ADR0034
    ADR0034 --> TE06["TE-06\nProyec. CQRS"]:::te

    FS07["FS-07\nResolvedor Grafo"]:::fs --> ADR0022["ADR-0022\nProyecciones"]:::adr
    ADR0022 --> TE06
```

---

## Visual 7-C — Puntuación de Impacto ADR (ADRs Más Usados en UMS)

```mermaid
xychart-beta horizontal
    title "Frecuencia de Uso de ADRs en UMS (cantidad de FS cubiertas)"
    x-axis ["ADR-0012 RBAC/ABAC", "ADR-0015 Event Bus", "ADR-0010 Multi-Tenancy", "ADR-0020 Abstracción IdP", "ADR-0033 Outbox", "ADR-0035 Sagas", "ADR-0034 CQRS", "ADR-0026 MFA", "ADR-0016 Audit Trail", "ADR-0021 Grafo Auth"]
    y-axis "Cantidad FS" 0 --> 6
    bar [5, 3, 3, 3, 3, 2, 2, 2, 2, 2]
```

---

## Visual 7-D — Mapa de Cobertura de Habilitadores Técnicos

```mermaid
flowchart LR
    classDef te fill:#4a3800,stroke:#f59e0b,color:#fff,font-weight:bold
    classDef adr fill:#14532d,stroke:#22c55e,color:#fff,font-size:12px
    classDef fs fill:#1e3a5f,stroke:#3b82f6,color:#fff,font-size:12px

    subgraph TE01["TE-01 — Flujo JWT / OIDC"]
        T1A["Implementa:\nADR-0020, ADR-0026"]:::adr
        T1B["Satisface:\nFS-01, FS-08, FS-09"]:::fs
    end

    subgraph TE02["TE-02 — Compilador de Grafo de Permisos"]
        T2A["Implementa:\nADR-0012, ADR-0021, ADR-0022"]:::adr
        T2B["Satisface:\nFS-02, FS-05, FS-07, FS-14, FS-16"]:::fs
    end

    subgraph TE03["TE-03 — Provisionamiento de Tenant + RLS"]
        T3A["Implementa:\nADR-0010, ADR-0031"]:::adr
        T3B["Satisface:\nFS-03, FS-14"]:::fs
    end

    subgraph TE04["TE-04 — Transactional Outbox"]
        T4A["Implementa:\nADR-0033, ADR-0015"]:::adr
        T4B["Satisface:\nFS-03, FS-06, FS-11, FS-15"]:::fs
    end

    subgraph TE05["TE-05 — Saga Distribuida (Dapr)"]
        T5A["Implementa:\nADR-0035, ADR-0015"]:::adr
        T5B["Satisface:\nFS-10, FS-12"]:::fs
    end

    subgraph TE06["TE-06 — Reconstrucción de Proyección CQRS"]
        T6A["Implementa:\nADR-0034, ADR-0022"]:::adr
        T6B["Satisface:\nFS-04, FS-07, FS-13"]:::fs
    end
```

---

*Parte de la [Estrategia de Comunicación Arquitectónica](../architecture-communication-strategy.es.md)*
