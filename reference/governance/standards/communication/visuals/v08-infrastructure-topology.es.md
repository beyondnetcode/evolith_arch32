# V-08 — Mapa de Topología de Infraestructura

> **Audiencia:** DevOps, SRE, Platform Engineers  
> **Propósito:** Topología de despliegue completa — desde dev local hasta producción  
> **Bilingüe:** [English](./v08-infrastructure-topology.md)

---

## Visual 8-A — Topología de Producción Completa (Fase 2)

```mermaid
flowchart TB
    classDef client fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef gateway fill:#4a1a6b,stroke:#9c27b0,color:#fff
    classDef bff fill:#14532d,stroke:#22c55e,color:#fff
    classDef service fill:#374151,stroke:#9ca3af,color:#fff
    classDef infra fill:#4a3800,stroke:#f59e0b,color:#fff
    classDef obs fill:#0f172a,stroke:#334155,color:#aaa
    classDef db fill:#7f1d1d,stroke:#ef4444,color:#fff

    subgraph CLIENTS[" Clientes"]
        direction LR
        WEB["Navegador Web\nReact / Next.js"]:::client
        MOB["App Android\nKotlin / Offline-first"]:::client
        B2B["Partner B2B\nSistema Externo"]:::client
    end

    subgraph EDGE[" Capa Edge — ADR-0030"]
        TRAEFIK["Traefik Proxy\nEnrutamiento dinámico · Middleware de Auth\nTerminación TLS · IngressRoute"]:::gateway
    end

    subgraph BFF_LAYER[" Capa BFF — ADR-0008"]
        BFF_WEB["NestJS BFF Web\nOrquestación · SSR · Auth"]:::bff
        BFF_MOB["NestJS BFF Mobile\nSync offline · Compresión"]:::bff
        BFF_B2B["NestJS BFF B2B\nValidación de contrato · Rate"]:::bff
        MCP_SERVER["Servidor MCP\nTransporte SSE"]:::bff
        OPA["Motor OPA\nSondeo Sidecar Bundle"]:::obs
    end

    subgraph SERVICES["️ Servicios Core — ADR-0047"]
        SVC_ID["Servicio Identidad\n.NET 8 / UMS EP-01"]:::service
        SVC_AZ["Servicio Autorización\n.NET 8 / UMS EP-02"]:::service
        SVC_CF["Servicio Configuración\n.NET 8 / UMS EP-03"]:::service
        SVC_AU["Servicio Auditoría\n.NET 8 / UMS EP-04"]:::service
        SVC_AP["Servicio Aprobaciones\n.NET 8 / UMS EP-06"]:::service
        SVC_CO["Servicio Compliance\n.NET 8 / UMS EP-07"]:::service
        SVC_IG["Servicio IGA\n.NET 8 / UMS EP-08"]:::service
    end

    subgraph INFRA_LAYER["️ Infraestructura — ADR-0028"]
        DAPR["Dapr Sidecar Mesh\nDescubrimiento de servicios · Pub/Sub\nAlmacén de estado · Secrets"]:::infra
        RMQ["RabbitMQ\nEvent Bus · FIFO · DLQ\nADR-0015/0036"]:::infra
        REDIS["Redis Cluster\nCache 4 Niveles\nADR-0014"]:::infra
        OPENBAO["OpenBao\nSecretos · PKI · Arrendamientos\n(fork de Vault)"]:::infra
        MINIO["MinIO\nAlmacenamiento S3-compatible\nADR-0028"]:::infra
    end

    subgraph DATA["️ Capa de Datos — ADR-0031/0051"]
        DB_ID["SQL Server 2022\nSchema Identidad\n+ Predicados RLS"]:::db
        DB_AZ["SQL Server 2022\nSchema Autorización\n+ Closure Table"]:::db
        DB_CF["SQL Server 2022\nSchema Configuración"]:::db
        DB_AU["SQL Server 2022\nSchema Auditoría\nSolo-append"]:::db
    end

    subgraph OBS[" Observabilidad — ADR-0007/0046"]
        direction LR
        OTEL["OTel Collector\nW3C TraceContext"]:::obs
        LOKI["Loki\nLogs Estructurados"]:::obs
        TEMPO["Tempo\nTrazas Distribuidas"]:::obs
        GRAFANA["Grafana\nDashboards · Alertas"]:::obs
        OTEL --> LOKI & TEMPO --> GRAFANA
    end

    CLIENTS --> TRAEFIK
    TRAEFIK --> BFF_WEB & BFF_MOB & BFF_B2B & MCP_SERVER
    OPA -.->|"sondea bundle.tar.gz"| MINIO
    BFF_WEB & BFF_MOB & BFF_B2B & MCP_SERVER --> SERVICES
    SERVICES --> DAPR
    DAPR --> RMQ & REDIS & OPENBAO & MINIO
    SERVICES --> DATA
    SERVICES -.->|"trazas + logs"| OTEL
```

---

## Visual 8-B — Stack de Desarrollo Local (docker-compose)

```mermaid
flowchart TB
    classDef dev fill:#14532d,stroke:#22c55e,color:#fff
    classDef infra fill:#4a3800,stroke:#f59e0b,color:#fff
    classDef obs fill:#1e3a5f,stroke:#3b82f6,color:#fff

    subgraph LOCAL["️ Máquina del Desarrollador — docker-compose"]
        direction TB

        subgraph APP["Contenedores de Aplicación"]
            direction LR
            API["API .NET 8\nlocalhost:5000"]:::dev
            DAPR_SVC["Sidecar Dapr\nlocalhost:3500"]:::dev
        end

        subgraph INFRA_LOCAL["Contenedores de Infraestructura"]
            direction LR
            SQL["SQL Server 2022\n:1433"]:::infra
            REDIS_L["Redis\n:6379"]:::infra
            RMQ_L["RabbitMQ\n:5672 / :15672"]:::infra
            MINIO_L["MinIO\n:9000 / :9001"]:::infra
        end

        subgraph OBS_LOCAL["Contenedores de Observabilidad"]
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

## Visual 8-C — Opciones de Despliegue Multi-Cloud (Fase 3)

```mermaid
flowchart LR
    classDef aws fill:#f59e0b,stroke:#92400e,color:#111
    classDef azure fill:#3b82f6,stroke:#1e40af,color:#fff
    classDef onprem fill:#374151,stroke:#9ca3af,color:#fff
    classDef core fill:#14532d,stroke:#22c55e,color:#fff

    CORE[" Core Evolith\n(Servicios Agnósticos de Runtime)\nSin SDK de cloud en la capa de dominio"]:::core

    subgraph AWS["️ Perfil AWS"]
        direction TB
        AW1["EKS (Kubernetes)"]:::aws
        AW2["RDS SQL Server"]:::aws
        AW3["ElastiCache Redis"]:::aws
        AW4["S3 (compatible con MinIO)"]:::aws
        AW5["MSK (Kafka)"]:::aws
    end

    subgraph AZURE["️ Perfil Azure"]
        direction TB
        AZ1["AKS (Kubernetes)"]:::azure
        AZ2["Azure SQL"]:::azure
        AZ3["Azure Cache for Redis"]:::azure
        AZ4["Azure Blob Storage"]:::azure
        AZ5["Azure Service Bus"]:::azure
    end

    subgraph ONPREM[" On-Premise / Híbrido"]
        direction TB
        OP1["K8s (self-hosted)"]:::onprem
        OP2["SQL Server 2022\n(bare metal)"]:::onprem
        OP3["Redis OSS"]:::onprem
        OP4["MinIO OSS"]:::onprem
        OP5["RabbitMQ OSS"]:::onprem
    end

    CORE -->|"swap de adaptador\n< 24h — ADR-0028"| AWS
    CORE -->|"swap de adaptador\n< 24h — ADR-0028"| AZURE
    CORE -->|"perfil por defecto\nADR-0028"| ONPREM

    NOTE["Principio clave: Los adaptadores de infraestructura\nson intercambiables sin tocar las capas\nde Dominio o Aplicación"]
    CORE --- NOTE
```

---

## Visual 8-D — Modelo de Perímetro de Seguridad (Zero-Trust)

```mermaid
flowchart TD
    classDef untrusted fill:#7f1d1d,stroke:#ef4444,color:#fff
    classDef perimeter fill:#4a3800,stroke:#f59e0b,color:#fff
    classDef trusted fill:#14532d,stroke:#22c55e,color:#fff
    classDef service fill:#1e3a5f,stroke:#3b82f6,color:#fff

    INTERNET([" Internet\n(Zero Trust)"]):::untrusted

    subgraph P1["Capa Perimetral (Traefik + WAF)"]
        TRAEFIK2["Traefik Proxy\nProtección OWASP Top 10\nRate limiting · mTLS"]:::perimeter
    end

    subgraph P2["Capa Identidad (Abstracción IdP)"]
        IDP["Identity Provider\n(conectable: Keycloak / Azure AD / Auth0)\nADR-0020 / ADR-0026"]:::perimeter
        JWT2["Validación JWT + OIDC\nTokens de corta vida · Rotación refresh"]:::perimeter
    end

    subgraph P3["Capa de Servicios (Dapr mTLS)"]
        direction LR
        SVC_A["Servicio A"]:::service
        SVC_B["Servicio B"]:::service
        SVC_C["Servicio C"]:::service
        DAPR2["Dapr\nmTLS automático entre\ntodos los sidecars de servicio"]:::trusted
    end

    subgraph P4["Capa de Datos (RLS + Cifrado)"]
        direction LR
        DB2["SQL Server 2022\nPredicados Row-Level Security\nCifrado TDE en reposo\nADR-0010 / ADR-0044"]:::trusted
        OPENBAO2["OpenBao\nSecretos rotantes\nCredenciales dinámicas"]:::trusted
    end

    INTERNET --> TRAEFIK2
    TRAEFIK2 --> IDP
    IDP --> JWT2
    JWT2 --> SVC_A & SVC_B & SVC_C
    SVC_A & SVC_B & SVC_C --> DAPR2
    DAPR2 --> DB2 & OPENBAO2
```

---

## Visual 8-E — Gates de Calidad del Pipeline CI/CD (ADR-0005)

```mermaid
flowchart LR
    classDef dev fill:#374151,stroke:#9ca3af,color:#fff
    classDef gate fill:#7f1d1d,stroke:#ef4444,color:#fff,font-weight:bold
    classDef pass fill:#14532d,stroke:#22c55e,color:#fff
    classDef deploy fill:#1e3a5f,stroke:#3b82f6,color:#fff

    PR(["El desarrollador\nabre PR"]):::dev

    G1{"Gate 1\nLinting +\nVerificación Fronteras\neslint-boundaries"}:::gate
    G2{"Gate 2\nUnit Tests\n≥70% cobertura\nxUnit / Jest"}:::gate
    G3{"Gate 3\nTests de Integración\nTestcontainers\nContract Tests"}:::gate
    G4{"Gate 4\nScan de Seguridad\nCodeQL +\nAudit Dependencias"}:::gate
    G5{"Gate 5\nRevisión de\nArquitectura\nFirma del Tech Lead"}:::gate

    PR --> G1
    G1 -->|FALLA| DEV1[" Corregir linting\no violación de import"]:::dev
    G1 -->|PASA| G2
    G2 -->|FALLA| DEV2[" Agregar\nunit tests faltantes"]:::dev
    G2 -->|PASA| G3
    G3 -->|FALLA| DEV3[" Corregir problemas\nde integración o contrato"]:::dev
    G3 -->|PASA| G4
    G4 -->|FALLA| DEV4[" Parchear\ndependencia vulnerable"]:::dev
    G4 -->|PASA| G5
    G5 -->|FALLA| DEV5[" Abordar\nfeedback de arquitectura"]:::dev
    G5 -->|PASA| MERGE[" Merge a main"]:::pass
    MERGE --> DEPLOY[" Desplegar a\nstaging / prod\nvia GitHub Actions"]:::deploy
```

---

*Parte de la [Estrategia de Comunicación Arquitectónica](../architecture-communication-strategy.es.md)*
