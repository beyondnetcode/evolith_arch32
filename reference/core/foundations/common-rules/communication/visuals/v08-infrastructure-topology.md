# V-08 — Infrastructure Topology Map

> **Audience:** DevOps, SRE, Platform Engineers
> **Purpose:** Full deployment topology — local dev through production
> **Bilingual:** [Español](./v08-infrastructure-topology.es.md)

---

## Visual 8-A — Full Production Topology (Phase 2)

```mermaid
flowchart TB
    classDef client fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef gateway fill:#4a1a6b,stroke:#9c27b0,color:#fff
    classDef bff fill:#14532d,stroke:#22c55e,color:#fff
    classDef service fill:#374151,stroke:#9ca3af,color:#fff
    classDef infra fill:#4a3800,stroke:#f59e0b,color:#fff
    classDef obs fill:#0f172a,stroke:#334155,color:#aaa
    classDef db fill:#7f1d1d,stroke:#ef4444,color:#fff

    subgraph CLIENTS[" Clients"]
        direction LR
        WEB["Web Browser\nReact / Next.js"]:::client
        MOB["Android App\nKotlin / Offline-first"]:::client
        B2B["B2B Partner\nExternal System"]:::client
    end

    subgraph EDGE[" Edge Layer — ADR-0030"]
        TRAEFIK["Traefik Proxy\nDynamic routing · Auth middleware\nTLS termination · IngressRoute"]:::gateway
    end

    subgraph BFF_LAYER[" BFF Layer — ADR-0008"]
        BFF_WEB["NestJS BFF Web\nOrchestration · SSR · Auth"]:::bff
        BFF_MOB["NestJS BFF Mobile\nOffline sync · Compression"]:::bff
        BFF_B2B["NestJS BFF B2B\nContract validation · Rate"]:::bff
        MCP_SERVER["MCP Server\nSSE Transport"]:::bff
        OPA["OPA Engine\nSidecar Bundle Polling"]:::obs
    end

    subgraph SERVICES["️ Core Services — ADR-0047"]
        SVC_ID["Identity Service\n.NET 8 / UMS EP-01"]:::service
        SVC_AZ["Authorization Service\n.NET 8 / UMS EP-02"]:::service
        SVC_CF["Configuration Service\n.NET 8 / UMS EP-03"]:::service
        SVC_AU["Audit Service\n.NET 8 / UMS EP-04"]:::service
        SVC_AP["Approvals Service\n.NET 8 / UMS EP-06"]:::service
        SVC_CO["Compliance Service\n.NET 8 / UMS EP-07"]:::service
        SVC_IG["IGA Service\n.NET 8 / UMS EP-08"]:::service
    end

    subgraph INFRA_LAYER["️ Infrastructure — ADR-0028"]
        DAPR["Dapr Sidecar Mesh\nService discovery · Pub/Sub\nState store · Secrets"]:::infra
        RMQ["RabbitMQ\nEvent Bus · FIFO · DLQ\nADR-0015/0036"]:::infra
        REDIS["Redis Cluster\n4-Tier Cache\nADR-0014"]:::infra
        OPENBAO["OpenBao\nSecrets · PKI · Leases\n(Vault fork)"]:::infra
        MINIO["MinIO\nS3-compatible storage\nADR-0028"]:::infra
    end

    subgraph DATA["️ Data Layer — ADR-0031/0051"]
        DB_ID["SQL Server 2022\nIdentity Schema\n+ RLS Predicates"]:::db
        DB_AZ["SQL Server 2022\nAuthorization Schema\n+ Closure Table"]:::db
        DB_CF["SQL Server 2022\nConfiguration Schema"]:::db
        DB_AU["SQL Server 2022\nAudit Schema\nAppend-only"]:::db
    end

    subgraph OBS[" Observability — ADR-0007/0046"]
        direction LR
        OTEL["OTel Collector\nW3C TraceContext"]:::obs
        LOKI["Loki\nStructured Logs"]:::obs
        TEMPO["Tempo\nDistributed Traces"]:::obs
        GRAFANA["Grafana\nDashboards · Alerts"]:::obs
        OTEL --> LOKI & TEMPO --> GRAFANA
    end

    CLIENTS --> TRAEFIK
    TRAEFIK --> BFF_WEB & BFF_MOB & BFF_B2B & MCP_SERVER
    OPA -.->|"polls bundle.tar.gz"| MINIO
    BFF_WEB & BFF_MOB & BFF_B2B & MCP_SERVER --> SERVICES
    SERVICES --> DAPR
    DAPR --> RMQ & REDIS & OPENBAO & MINIO
    SERVICES --> DATA
    SERVICES -.->|"traces + logs"| OTEL
```

---

## Visual 8-B — Local Development Stack (docker-compose)

```mermaid
flowchart TB
    classDef dev fill:#14532d,stroke:#22c55e,color:#fff
    classDef infra fill:#4a3800,stroke:#f59e0b,color:#fff
    classDef obs fill:#1e3a5f,stroke:#3b82f6,color:#fff

    subgraph LOCAL["️ Developer Machine — docker-compose"]
        direction TB

        subgraph APP["Application Containers"]
            direction LR
            API[".NET 8 API\nlocalhost:5000"]:::dev
            DAPR_SVC["Dapr Sidecar\nlocalhost:3500"]:::dev
        end

        subgraph INFRA_LOCAL["Infrastructure Containers"]
            direction LR
            SQL["SQL Server 2022\n:1433"]:::infra
            REDIS_L["Redis\n:6379"]:::infra
            RMQ_L["RabbitMQ\n:5672 / :15672"]:::infra
            MINIO_L["MinIO\n:9000 / :9001"]:::infra
        end

        subgraph OBS_LOCAL["Observability Containers"]
            direction LR
            OTEL_L["OTel Collector\n:4317 gRPC\n:4318 HTTP"]:::obs
            LOKI_L["Loki\n:3100"]:::obs
            TEMPO_L["Tempo\n:3200"]:::obs
            GRAFANA_L["Grafana\n:3000"]:::obs
        end

        API --> DAPR_SVC
        API --> SQL & REDIS_L
        DAPR_SVC --> RMQ_L
        API -.->|"OTel SDK"| OTEL_L
        OTEL_L --> LOKI_L & TEMPO_L --> GRAFANA_L
    end
```

---

## Visual 8-C — Local Development Stack (Kubernetes on Docker Desktop / Kind)

```mermaid
flowchart TB
    classDef dev fill:#14532d,stroke:#22c55e,color:#fff
    classDef infra fill:#4a3800,stroke:#f59e0b,color:#fff
    classDef network fill:#4a1a6b,stroke:#9c27b0,color:#fff
    classDef secret fill:#7f1d1d,stroke:#ef4444,color:#fff
    classDef obs fill:#1e3a5f,stroke:#3b82f6,color:#fff

    subgraph LOCAL_K8S["️ Local Kubernetes Cluster (Namespace: evolith-local)"]
        direction TB

        subgraph INGRESS["Network Access"]
            direction LR
            PF_CORE["Ingress / Port-Forward\ncore.local (18080)"]:::network
            PF_MCP["Ingress / Port-Forward\nmcp.local (18081)"]:::network
            PF_RUNTIME["Ingress / Port-Forward\nruntime.local (18082)"]:::network
            PF_GRAFANA["Grafana Port-Forward\nlocalhost:3000"]:::network
        end

        subgraph SECRETS["Kubernetes Secrets (API Keys)"]
            direction LR
            SEC_CORE["core-api-auth"]:::secret
            SEC_MCP["mcp-auth"]:::secret
            SEC_RUNTIME["agent-runtime-auth"]:::secret
        end

        subgraph SVC["Kubernetes Services (ClusterIP :80)"]
            direction LR
            SVC_CORE["coreapi-evolith-core-api"]:::infra
            SVC_MCP["mcp-evolith-mcp"]:::infra
            SVC_RUNTIME["runtime-evolith-agent-runtime"]:::infra
        end

        subgraph PODS["Deployments (Core Services)"]
            direction LR
            POD_CORE["evolith-core-api:local\n(Port 3000)\n+ Dapr Sidecar"]:::dev
            POD_MCP["evolith-mcp-server:local\n(Port 3000)\n+ Dapr Sidecar"]:::dev
            POD_RUNTIME["evolith-agent-runtime:local\n(Port 3000)\n+ Dapr Sidecar"]:::dev
        end

        subgraph INFRA_LOCAL["Infrastructure (Storage & Policy)"]
            direction LR
            MINIO["MinIO Pod\n(Port 9000)\nBucket: opa-bundles"]:::infra
        end

        subgraph OBS_LOCAL["Observability Stack"]
            direction LR
            OTEL["OTel Collector\n(DaemonSet :4317)"]:::obs
            TEMPO["Tempo\n(Port 3200)"]:::obs
            GRAFANA["Grafana\n(Port 3000)"]:::obs
        end

        PF_CORE --> SVC_CORE
        PF_MCP --> SVC_MCP
        PF_RUNTIME --> SVC_RUNTIME
        PF_GRAFANA --> GRAFANA

        SVC_CORE --> POD_CORE
        SVC_MCP --> POD_MCP
        SVC_RUNTIME --> POD_RUNTIME

        SEC_CORE -.->|"EVOLITH_API_KEY"| POD_CORE
        SEC_MCP -.->|"EVOLITH_API_KEY"| POD_MCP
        SEC_RUNTIME -.->|"AGENT_RUNTIME_API_KEY"| POD_RUNTIME

        POD_CORE & POD_MCP & POD_RUNTIME -.->|"Fetch bundle.tar.gz"| MINIO
        POD_CORE & POD_MCP & POD_RUNTIME -.->|"gRPC Traces"| OTEL

        OTEL --> TEMPO
        TEMPO --> GRAFANA
    end
```

---

## Visual 8-D — Multi-Cloud Deployment Options (Phase 3)

```mermaid
flowchart LR
    classDef aws fill:#f59e0b,stroke:#92400e,color:#111
    classDef azure fill:#3b82f6,stroke:#1e40af,color:#fff
    classDef onprem fill:#374151,stroke:#9ca3af,color:#fff
    classDef core fill:#14532d,stroke:#22c55e,color:#fff

    CORE[" Evolith Core\n(Runtime-Agnostic Services)\nNo cloud SDK in domain layer"]:::core

    subgraph AWS["️ AWS Profile"]
        direction TB
        AW1["EKS (Kubernetes)"]:::aws
        AW2["RDS SQL Server"]:::aws
        AW3["ElastiCache Redis"]:::aws
        AW4["S3 (MinIO-compatible)"]:::aws
        AW5["MSK (Kafka)"]:::aws
    end

    subgraph AZURE["️ Azure Profile"]
        direction TB
        AZ1["AKS (Kubernetes)"]:::azure
        AZ2["Azure SQL"]:::azure
        AZ3["Azure Cache for Redis"]:::azure
        AZ4["Azure Blob Storage"]:::azure
        AZ5["Azure Service Bus"]:::azure
    end

    subgraph ONPREM[" On-Premise / Hybrid"]
        direction TB
        OP1["K8s (self-hosted)"]:::onprem
        OP2["SQL Server 2022\n(on bare metal)"]:::onprem
        OP3["Redis OSS"]:::onprem
        OP4["MinIO OSS"]:::onprem
        OP5["RabbitMQ OSS"]:::onprem
    end

    CORE -->|"adapter swap\n< 24h — ADR-0028"| AWS
    CORE -->|"adapter swap\n< 24h — ADR-0028"| AZURE
    CORE -->|"default profile\nADR-0028"| ONPREM

    NOTE["Key principle: Infrastructure adapters\nare swappable without touching\nDomain or Application layers"]
    CORE --- NOTE
```

---

## Visual 8-E — Security Perimeter Model (Zero-Trust)

```mermaid
flowchart TD
    classDef untrusted fill:#7f1d1d,stroke:#ef4444,color:#fff
    classDef perimeter fill:#4a3800,stroke:#f59e0b,color:#fff
    classDef trusted fill:#14532d,stroke:#22c55e,color:#fff
    classDef service fill:#1e3a5f,stroke:#3b82f6,color:#fff

    INTERNET([" Internet\n(Zero Trust)"]):::untrusted

    subgraph P1["Perimeter Layer (Traefik + WAF)"]
        TRAEFIK2["Traefik Proxy\nOWASP Top 10 protection\nRate limiting · mTLS"]:::perimeter
    end

    subgraph P2["Identity Layer (IdP Abstraction)"]
        IDP["Identity Provider\n(pluggable: Keycloak / Azure AD / Auth0)\nADR-0020 / ADR-0026"]:::perimeter
        JWT2["JWT + OIDC validation\nShort-lived tokens · Refresh rotation"]:::perimeter
    end

    subgraph P3["Service Layer (Dapr mTLS)"]
        direction LR
        SVC_A["Service A"]:::service
        SVC_B["Service B"]:::service
        SVC_C["Service C"]:::service
        DAPR2["Dapr\nAutomatic mTLS between\nall service sidecars"]:::trusted
    end

    subgraph P4["Data Layer (RLS + Encryption)"]
        direction LR
        DB2["SQL Server 2022\nRow-Level Security predicates\nTDE encryption at rest\nADR-0010 / ADR-0044"]:::trusted
        OPENBAO2["OpenBao\nRotating secrets\nDynamic credentials"]:::trusted
    end

    INTERNET --> TRAEFIK2
    TRAEFIK2 --> IDP
    IDP --> JWT2
    JWT2 --> SVC_A & SVC_B & SVC_C
    SVC_A & SVC_B & SVC_C --> DAPR2
    DAPR2 --> DB2 & OPENBAO2
```

---

## Visual 8-F — CI/CD Pipeline Quality Gates (ADR-0005)

```mermaid
flowchart LR
    classDef dev fill:#374151,stroke:#9ca3af,color:#fff
    classDef gate fill:#7f1d1d,stroke:#ef4444,color:#fff,font-weight:bold
    classDef pass fill:#14532d,stroke:#22c55e,color:#fff
    classDef deploy fill:#1e3a5f,stroke:#3b82f6,color:#fff

    PR(["Developer\nopens PR"]):::dev

    G1{"Gate 1\nLinting +\nBoundary Check\neslint-boundaries"}:::gate
    G2{"Gate 2\nUnit Tests\n≥70% coverage\nxUnit / Jest"}:::gate
    G3{"Gate 3\nIntegration Tests\nTestcontainers\nContract Tests"}:::gate
    G4{"Gate 4\nSecurity Scan\nCodeQL +\nDepend. Audit"}:::gate
    G5{"Gate 5\nArchitecture\nReview\nTech Lead sign-off"}:::gate

    PR --> G1
    G1 -->|FAIL| DEV1[" Fix linting\nor import violation"]:::dev
    G1 -->|PASS| G2
    G2 -->|FAIL| DEV2[" Add missing\nunit tests"]:::dev
    G2 -->|PASS| G3
    G3 -->|FAIL| DEV3[" Fix integration\nor contract issues"]:::dev
    G3 -->|PASS| G4
    G4 -->|FAIL| DEV4[" Patch vulnerable\ndependency"]:::dev
    G4 -->|PASS| G5
    G5 -->|FAIL| DEV5[" Address arch\nfeedback"]:::dev
    G5 -->|PASS| MERGE[" Merge to main"]:::pass
    MERGE --> DEPLOY[" Deploy to\nstaging / prod\nvia GitHub Actions"]:::deploy
```

---

*Part of the [Architecture Communication Strategy](../architecture-communication-strategy.md)*
