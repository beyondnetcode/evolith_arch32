# V-07 — UMS → Evolith Traceability Visual

> **Audience:** Tech Leads, QA, Architects  
> **Purpose:** Show that every UMS requirement traces to an Evolith ADR — and back  
> **Bilingual:** [Español](./v07-traceability-visual.es.md)

---

## Visual 7-A — ADR Coverage Heatmap by Domain Cluster

```mermaid
flowchart TB
    classDef cluster fill:#0f172a,stroke:#334155,color:#aaa,font-weight:bold
    classDef fs fill:#1e3a5f,stroke:#3b82f6,color:#fff,font-size:12px
    classDef adr fill:#14532d,stroke:#22c55e,color:#fff,font-size:11px
    classDef te fill:#4a3800,stroke:#f59e0b,color:#fff,font-size:11px
    classDef hot fill:#7f1d1d,stroke:#ef4444,color:#fff,font-size:11px

    subgraph IDENTITY["🔐 IDENTITY CLUSTER"]
        FS01["FS-01\nUser Authentication"]:::fs
        FS08["FS-08\nHosted Login Redirect"]:::fs
        FS09["FS-09\nMFA / Passwordless Adaptive"]:::fs
        ADR_ID["ADR-0020 IdP Abstraction\nADR-0026 MFA Adaptive"]:::adr
        TE_ID["TE-01 JWT / OIDC Flow"]:::te
        FS01 & FS08 & FS09 --> ADR_ID --> TE_ID
    end

    subgraph AUTHZ["🛡️ AUTHORIZATION CLUSTER"]
        FS02["FS-02\nCreate Auth Template"]:::fs
        FS05["FS-05\nCreate Profile / Manual Template"]:::fs
        FS07["FS-07\nVisual Graph Resolver"]:::fs
        FS14["FS-14\nDelegated Management"]:::fs
        FS16["FS-16\nAccess Enforcement Policy"]:::fs
        ADR_AZ["ADR-0012 RBAC/ABAC\nADR-0021 Auth Graph\nADR-0022 Contextual Projections\nADR-0023 Kernel Boundary"]:::hot
        TE_AZ["TE-02 Permission Graph Compiler"]:::te
        FS02 & FS05 & FS07 & FS14 & FS16 --> ADR_AZ --> TE_AZ
    end

    subgraph TENANT["🏢 TENANCY CLUSTER"]
        FS03["FS-03\nRegister Organization"]:::fs
        FS04["FS-04\nRegister System Topology"]:::fs
        ADR_TN["ADR-0010 Multi-Tenancy RLS\nADR-0031 Schema per Context\nADR-0034 CQRS"]:::adr
        TE_TN["TE-03 Tenant Provisioning\nTE-06 CQRS Projection Rebuild"]:::te
        FS03 & FS04 --> ADR_TN --> TE_TN
    end

    subgraph EVENTS["⚡ EVENTS CLUSTER"]
        FS06["FS-06\nAuto-Assign Template"]:::fs
        FS10["FS-10\nExternal B2B Access / Approval"]:::fs
        FS11["FS-11\nDocument Upload"]:::fs
        FS12["FS-12\nRole Promotion Process"]:::fs
        FS15["FS-15\nNotification Rules"]:::fs
        ADR_EV["ADR-0015 Injectable Event Bus\nADR-0033 Transactional Outbox\nADR-0035 Distributed Sagas\nADR-0036 FIFO / DLQ"]:::hot
        TE_EV["TE-04 Transactional Outbox\nTE-05 Distributed Saga (Dapr)"]:::te
        FS06 & FS10 & FS11 & FS12 & FS15 --> ADR_EV --> TE_EV
    end

    subgraph CONFIG["⚙️ CONFIGURATION CLUSTER"]
        FS13["FS-13\nHierarchical Configuration"]:::fs
        ADR_CF["ADR-0024 Config Platform\nADR-0034 CQRS"]:::adr
        TE_CF["TE-06 CQRS Projection Rebuild"]:::te
        FS13 --> ADR_CF --> TE_CF
    end
```

---

## Visual 7-B — Full FS → ADR → TE Forward Trace

```mermaid
flowchart LR
    classDef fs fill:#1e3a5f,stroke:#3b82f6,color:#fff,font-size:11px
    classDef adr fill:#14532d,stroke:#22c55e,color:#fff,font-size:11px
    classDef te fill:#4a3800,stroke:#f59e0b,color:#fff,font-size:11px

    FS01["FS-01\nAuthentication"]:::fs --> ADR0020["ADR-0020\nIdP Abstraction"]:::adr
    FS01 --> ADR0026["ADR-0026\nMFA Adaptive"]:::adr
    ADR0020 & ADR0026 --> TE01["TE-01\nJWT/OIDC"]:::te

    FS02["FS-02\nAuth Template"]:::fs --> ADR0012["ADR-0012\nRBAC/ABAC"]:::adr
    FS02 --> ADR0021["ADR-0021\nAuth Graph"]:::adr
    ADR0012 & ADR0021 --> TE02["TE-02\nPermission Graph"]:::te

    FS03["FS-03\nOrg Register"]:::fs --> ADR0010["ADR-0010\nMulti-Tenancy"]:::adr
    FS03 --> ADR0033["ADR-0033\nOutbox"]:::adr
    ADR0010 --> TE03["TE-03\nTenant Prov."]:::te
    ADR0033 --> TE04["TE-04\nOutbox"]:::te

    FS06["FS-06\nAuto-Assign"]:::fs --> ADR0015["ADR-0015\nEvent Bus"]:::adr
    ADR0015 --> TE04

    FS10["FS-10\nB2B Access"]:::fs --> ADR0035["ADR-0035\nSagas"]:::adr
    ADR0035 --> TE05["TE-05\nDistrib. Saga"]:::te

    FS12["FS-12\nRole Promotion"]:::fs --> ADR0035
    FS04["FS-04\nTopology"]:::fs --> ADR0034["ADR-0034\nCQRS"]:::adr
    FS13["FS-13\nConfig"]:::fs --> ADR0034
    ADR0034 --> TE06["TE-06\nCQRS Proj."]:::te

    FS07["FS-07\nGraph Resolver"]:::fs --> ADR0022["ADR-0022\nProjections"]:::adr
    ADR0022 --> TE06
```

---

## Visual 7-C — ADR Impact Score (Most-Used ADRs in UMS)

```mermaid
pie title "ADR Usage Frequency in UMS (count of FS covered)"
    "ADR-0012 RBAC/ABAC" : 5
    "ADR-0015 Event Bus" : 3
    "ADR-0010 Multi-Tenancy" : 3
    "ADR-0020 IdP Abstraction" : 3
    "ADR-0033 Outbox" : 3
    "ADR-0035 Sagas" : 2
    "ADR-0034 CQRS" : 2
    "ADR-0026 MFA" : 2
    "ADR-0016 Audit Trail" : 2
    "ADR-0021 Auth Graph" : 2
```

---

## Visual 7-D — Technical Enabler Coverage Map

```mermaid
flowchart LR
    classDef te fill:#4a3800,stroke:#f59e0b,color:#fff,font-weight:bold
    classDef adr fill:#14532d,stroke:#22c55e,color:#fff,font-size:12px
    classDef fs fill:#1e3a5f,stroke:#3b82f6,color:#fff,font-size:12px

    subgraph TE01["TE-01 — JWT / OIDC Flow"]
        T1A["Implements:\nADR-0020, ADR-0026"]:::adr
        T1B["Satisfies:\nFS-01, FS-08, FS-09"]:::fs
    end

    subgraph TE02["TE-02 — Permission Graph Compiler"]
        T2A["Implements:\nADR-0012, ADR-0021, ADR-0022"]:::adr
        T2B["Satisfies:\nFS-02, FS-05, FS-07, FS-14, FS-16"]:::fs
    end

    subgraph TE03["TE-03 — Tenant Provisioning + RLS"]
        T3A["Implements:\nADR-0010, ADR-0031"]:::adr
        T3B["Satisfies:\nFS-03, FS-14"]:::fs
    end

    subgraph TE04["TE-04 — Transactional Outbox"]
        T4A["Implements:\nADR-0033, ADR-0015"]:::adr
        T4B["Satisfies:\nFS-03, FS-06, FS-11, FS-15"]:::fs
    end

    subgraph TE05["TE-05 — Distributed Saga (Dapr)"]
        T5A["Implements:\nADR-0035, ADR-0015"]:::adr
        T5B["Satisfies:\nFS-10, FS-12"]:::fs
    end

    subgraph TE06["TE-06 — CQRS Projection Rebuild"]
        T6A["Implements:\nADR-0034, ADR-0022"]:::adr
        T6B["Satisfies:\nFS-04, FS-07, FS-13"]:::fs
    end
```

---

*Part of the [Architecture Communication Strategy](../architecture-communication-strategy.md)*
