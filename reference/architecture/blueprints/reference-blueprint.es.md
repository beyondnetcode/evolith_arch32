# Arquitectura de Referencia Corporativa (Multi-Runtime / arc42)

> [!IMPORTANT]
> **Blueprint de Referencia Corporativo Unificado**: Este documento define el modelo arquitectónico global de la organización. Las restricciones y principios de diseño son agnósticos al runtime. Las etiquetas tecnológicas, diagramas y ejemplos concretos representan un perfil de implementación de referencia y no deben interpretarse como mandatos universales para todos los productos.

> [!NOTE]
> **Regla de abstracción**: usa este documento para entender límites, responsabilidades, etapas evolutivas, atributos de calidad y lógica de decisión. Usa los perfiles de stack por runtime para seleccionar herramientas concretas. Usa la documentación de demo cuando necesites un ejemplo ejecutable específico.

---

## 1. Introducción y Metas

Esta arquitectura de referencia proporciona un plano estandarizado para construir sistemas modernos y altamente escalables.

### 1.1 Propósito y Aplicabilidad
Este patrón está diseñado específicamente para sistemas que:
* Tienen una fuerte orientación hacia la **utilización intensiva de APIs** con clientes multi-canal (Web, Móvil, B2B).
* Requieren **aislamiento SaaS multi-tenant** nativo a nivel del motor de base de datos ([ADR-0010](../adrs/core/0010-multi-tenancy-architecture-strategy.md)).
* Deben soportar una **evolución progresiva** desde un Monolito Modular hacia Microservicios Distribuidos.

> [!IMPORTANT]
> **Canon de Evolución Progresiva**: La arquitectura evoluciona en complejidad incremental. La Fase 1 es deliberadamente simple y no exige tecnologías, patrones o procesos que excedan las necesidades de un monolito modular. Cada requisito adicional se introduce en la fase donde la arquitectura lo justifica objetivamente, no antes.

### 1.2 Estrategia Corporativa Multi-Runtime (Políglota)
La organización promueve una arquitectura políglota deliberada donde los entornos de ejecución se eligen estrictamente en función de la idoneidad para la carga de trabajo, validados vía ADR:

| Runtime | Rol Canónico | Caso de Uso Típico |
| :--- | :--- | :--- |
| **Node.js / TypeScript** | Perfil runtime Web/API | APIs REST/gRPC, orquestación BFF, servicios web transaccionales, frontend SSR. |
| **.NET (C#)** | Perfil backend/runtime enterprise | APIs, computación por lotes, pipelines ETL, tareas computacionales pesadas, interoperabilidad legada. |
| **Android (Kotlin/Java)** | Cliente Móvil Nativo | Apps operativas industriales, captura offline, integración de hardware de escaneo/GPS. |

> **Regla de Contratos**: La comunicación entre distintos runtimes DEBE utilizar estrictamente definiciones de contrato explícitas y versionadas (OpenAPI para HTTP, Protobuf para gRPC, AsyncAPI para Mensajería) garantizando absoluta opacidad de la implementación.

### 1.3 Atributos de Calidad Obligatorios
| Atributo de Calidad | Origen ADR | Objetivo |
| :--- | :--- | :--- |
| **Evolución Progresiva** | [ADR-0006](../adrs/core/0006-future-microservices-transition-dapr.md), [ADR-0008](../adrs/nodejs/0008-progressive-multimodule-evolution-gateway-bff.md) | Camino de cero refactorización hacia microservicios vía Dapr |
| **Multi-Tenancy SaaS** | [ADR-0010](../adrs/core/0010-multi-tenancy-architecture-strategy.md) | Aislamiento de Doble Capa (Filtros de Aplicación + Failsafe Nativo de BD) |
| **Desacoplamiento Estricto** | [ADR-0002](../adrs/nodejs/0002-clean-architecture-nestjs.md), [ADR-0003](../adrs/nodejs/0003-strict-typescript-standards.md) | Aplicación de límites vía ESLint |
| **Resiliencia** | [ADR-0011](../adrs/core/0011-fault-tolerance-resiliency-patterns.md) | Circuit Breakers Distribuidos (Redis + Kong) |
| **Seguridad** | [ADR-0005](../adrs/core/0005-ci-cd-quality-codeql.md), [ADR-0012](../adrs/nodejs/0012-advanced-authorization-rbac-abac.md), [ADR-0020](../adrs/core/0020-identity-provider-abstraction-strategy.md), [ADR-0026](../adrs/nodejs/0026-mfa-passwordless-adaptive-authentication.md) | Perímetro Zero-trust + RBAC/ABAC |
| **Latencia de API Interna** | [ADR-0014](../adrs/core/0014-distributed-caching-strategy-redis.md), [ADR-0021](../adrs/nodejs/0021-high-performance-auth-and-graph-compilation.md) | Caché de 4 Niveles (Cliente + CDN + BFF + Core) |
| **Observabilidad** | [ADR-0007](../adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.md), [ADR-0046](../adrs/core/0046-dapr-observabilidad-unificada.md) | OTel + Loki + trazado distribuido |
| **Auditoría Inmutable** | [ADR-0016](../adrs/core/0016-immutable-business-audit-trail.md) | Registro de auditoría de solo adición |
| **Soberanía Tecnológica** | [ADR-0002](../adrs/nodejs/0002-clean-architecture-nestjs.md), [ADR-0028](../adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.md) | Infra/AOP 100% intercambiable sin impacto en la lógica |
| **Modularización de UI** | [ADR-0055](../adrs/core/0055-estrategia-arquitectura-microfrontends.md) | Microfrontends (Module Federation) para Fase 3+ |


#### Marcos Estratégicos Complementarios
Para comprender profundamente la postura matemática y de riesgo de esta arquitectura, consulte:
* -> **[Evaluación de Madurez y Patrones de Diseño](../../governance/standards/vision/maturity-evaluation.md)**
* -> **[Análisis Estratégico del Teorema CAP](./cap-strategic-analysis.md)**
* -> **[Escenarios de Despliegue Multi-Cloud](./multi-cloud-deployment-scenarios.md)**

---

## 2. Restricciones de Arquitectura y Pilares Base

Cualquier sistema basado en este blueprint debe adherirse a los siguientes pilares no negociables:

* **Gobernanza del Stack ([ADR-0001](../adrs/core/0001-monorepo-orchestration-nx.md))**: Nx Monorepo + npm Workspaces para una gobernanza centralizada de dependencias.
* **Mandato de Ingeniería ([ADR-0002](../adrs/nodejs/0002-clean-architecture-nestjs.md), [ADR-0003](../adrs/nodejs/0003-strict-typescript-standards.md))**: SOLID, Código Limpio, Arquitectura Hexagonal (Puertos/Adaptadores simples obligatorios), TypeScript estricto.
* **Seguridad de Dependencias ([ADR-0009](../adrs/core/0009-strict-dependency-pinning-vulnerability-management.md))**: Todas las versiones de dependencias fijadas. Sin rangos `^` o `~`. Escaneo automatizado de vulnerabilidades en CI.
* **Puertas de Calidad ([ADR-0018](../adrs/core/0018-testing-pyramid-quality-gates.md))**: Pirámide de pruebas automatizada. Mínimo 70% de cobertura obligatoria en CI.
* **Portabilidad de Infraestructura ([ADR-0028](../adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.md))**: Prioridad de OSS autohospedado (MinIO, RabbitMQ, Vault) sobre el bloqueo de nube.

---

## 3. Contexto y Alcance (Modelo Operativo)

### 3.1 Patrón de Contexto General - Stack Completo con Niveles de Gateway y Bus de Eventos Inyectable

Este diagrama captura el contexto completo del sistema. Refleja:
- **[ADR-0030](../adrs/core/0030-api-gateway-kong-vs-nestjs.md)**: Gateway de Dos Niveles (Kong Edge + NestJS BFF)
- **[ADR-0008](../adrs/nodejs/0008-progressive-multimodule-evolution-gateway-bff.md)**: Evolución Progresiva Multi-Módulo con BFF dedicado por canal de cliente
- **[ADR-0015](../adrs/core/0015-event-driven-architecture-intra-domain.md)**: Abstracción Inyectable `IEventBusPort` (En Memoria -> RabbitMQ -> Kafka)
- **[ADR-0020](../adrs/core/0020-identity-provider-abstraction-strategy.md)**: Proveedor de Identidad Conectable vía Patrón Strategy
- **[ADR-0007](../adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.md)**: Trazado OpenTelemetry en todos los niveles

```mermaid
graph TD
 subgraph Clients["Capa de Canales - Aplicaciones Cliente"]
 WebApp["Web App\n[Caché React Query · ADR-0004]"]
 MobileApp["Mobile App\n[Persistencia Offline · ADR-0004]"]
 B2B["Socio B2B (gRPC / Clave API REST)"]
 end

 subgraph NetEdge["Borde de Red (Opcional)"]
 CDN["CDN (Content Delivery Network)\n[Caché Multi-Capa · ADR-0014]"]
 end

 subgraph Tier1["Tier 1 - Edge API Gateway (ADR-0030)"]
 Kong["Kong OSS\n[Límites de Tasa · Validación JWT · CORS · Enrutamiento]"]
 end

 subgraph Tier2["Tier 2 - Capa de Orquestación BFF (ADR-0008)"]
 WebBFF["NestJS Web BFF\n[Agregación · Caché BFF]"]
 MobileBFF["NestJS Mobile BFF\n[Respuestas Compactas · Caché BFF]"]
 CoreAPI["NestJS Core API\n[Dominio Hexagonal · RBAC/ABAC]"]
 end

 subgraph ExternalIntegrations["Capa de Integración Externa"]
  IdP["IdP Federado (Auth0 / Entra ID)\n[ADR-0020, ADR-0026]"]
  end

  subgraph EventBusAbstraction["Bus de Eventos Inyectable (ADR-0015, ADR-0031)"]
  IBusPort["(Port) IEventBusPort"]
  InMemory["En-Memoria (Dev/Test)"]
  RabbitMQ["RabbitMQ (Producción)"]
  Kafka["Kafka (Alta Escala)"]
  IBusPort -.->|Impl| InMemory
  IBusPort -.->|Impl| RabbitMQ
  IBusPort -.->|Impl| Kafka
  end

 subgraph ObsLayer["Observabilidad (ADR-0007)"]
 OTel["Coleccionista OpenTelemetry"]
 Loki["Grafana Loki (Logs)"]
 Jaeger["Jaeger (Trazas)"]
 OTel --> Loki
 OTel --> Jaeger
 end

 WebApp --> |TLS/HTTP| CDN
 MobileApp --> |TLS/HTTP| CDN
 B2B --> |TLS/HTTP| CDN
 CDN -->|Reenvío Dinámico| Kong

 Kong -->|Ruta| WebBFF
 Kong -->|Ruta| MobileBFF
 Kong -->|Ruta B2B| CoreAPI

 WebBFF -->|gRPC Interno| CoreAPI
 MobileBFF -->|gRPC Interno| CoreAPI

 CoreAPI -->|Validar Claims| IdP
 CoreAPI -->|Publicar Eventos| IBusPort

 CoreAPI -.->|Trazas + Logs| OTel
 WebBFF -.->|Trazas + Logs| OTel
 Kong -.->|Logs de Acceso| OTel
```

---

## 4. Estrategia de Solución

### 4.1 Arquitectura Hexagonal - Puertos y Adaptadores ([ADR-0002](../adrs/nodejs/0002-clean-architecture-nestjs.md))
Toda la lógica de negocio en las capas de Dominio y Aplicación tiene **cero dependencias en tiempo de ejecución** de frameworks, ORMs o servicios en la nube. La capa de infraestructura implementa Puertos de TypeScript puros.

### 4.2 Estrategia de Multi-Tenancy SaaS ([ADR-0010](../adrs/core/0010-multi-tenancy-architecture-strategy.md))
Emplea **Defensa de Aislamiento de Doble Capa**. (Capa 1) Los adaptadores de persistencia añaden automáticamente el filtro `tenant_id` a las consultas genéricas. (Capa 2) El motor de base de datos seleccionado puede imponer contención nativa de filas como failsafe secundario, por ejemplo PostgreSQL RLS o SQL Server RLS respaldado por contexto de sesión.

### 4.3 Patrón de Gateway de Dos Niveles ([ADR-0030](../adrs/core/0030-api-gateway-kong-vs-nestjs.md))
| Nivel | Tecnología | Responsabilidad |
| :--- | :--- | :--- |
| **Tier 1 - Edge** | Kong OSS (NGINX/OpenResty) | Rate Limiting, validación JWT, terminación SSL, Enrutamiento |
| **Tier 2 - BFF** | NestJS | Agregación de datos, formateo de cargas útiles, lógica específica del cliente |

### 4.4 Bus de Eventos Inyectable ([ADR-0015](../adrs/core/0015-event-driven-architecture-intra-domain.md))
El dominio nunca importa un bróker de mensajes concreto. Toda la comunicación asíncrona se enruta a través de `IEventBusPort`. La implementación concreta (En Memoria / RabbitMQ / Kafka) es inyectada por el contenedor DI de NestJS al inicio, controlada por una variable de entorno.

### 4.5 Ruta de Evolución Progresiva ([ADR-0006](../adrs/core/0006-future-microservices-transition-dapr.md))
1. **Hito 1 - Monolito Modular**: Proceso único, módulos de dominio lógicamente aislados.
2. **Hito 2 - Extracción de Servicios**: Dominios críticos extraídos como microproyectos Nx con BDs aisladas, consumidos vía gRPC/Dapr.
3. **Hito 3 - Malla Completa de Microservicios**: Dapr Sidecars, Malla de Servicios, Kong como superficie de API unificada y **extracción de Microfrontends** ([ADR-0055](../adrs/core/0055-estrategia-arquitectura-microfrontends.md)).


---

## 5. Bloques de Construcción Técnica

### 5.0 Vista de Contenedor Fase 1 — MVP Lean (Monolito Modular)

> [!NOTE]
> **Comenzar aquí.** Este diagrama refleja el **despliegue real de Fase 1** — un proceso único, infraestructura mínima, y sin bróker de mensajes externo. Es el punto de partida recomendado para todos los productos nuevos. El diagrama completo en Sección 5.1 muestra el estado maduro de Fase 3+.

```mermaid
graph TD
    subgraph ClientLayer["Capa de Cliente"]
        WebApp["Web App\n[React + React Query]"]
        MobileApp["Mobile App\n[Almacenamiento Offline Nativo]"]
    end

    subgraph Monolith["NestJS Modular Monolith (proceso único)"]
        AuthMod["Módulo Auth\n[schema: auth]"]
        TaskMod["Módulo Task\n[schema: tasks]"]
        TaxonomyMod["Módulo Taxonomy\n[schema: taxonomy]"]
        AuditMod["Módulo Audit\n[schema: audit]"]
        InMemBus["Bus de Eventos En-Memoria\n[IEventBusPort → impl En-Memoria]"]
        AuthMod --> InMemBus
        TaskMod --> InMemBus
        TaxonomyMod --> InMemBus
        InMemBus --> AuditMod
    end

    subgraph Persistence["Persistencia (instancia PostgreSQL única)"]
        PgSQL[("PostgreSQL\n[auth | tasks | taxonomy | audit schemas]")]
    end

    subgraph Observability["Observabilidad"]
        OTel["Coleccionista OTel → Grafana/Jaeger"]
    end

    WebApp -->|"HTTPS REST"| Monolith
    MobileApp -->|"HTTPS REST"| Monolith
    Monolith -->|"SQL (esquemas aislados)"| PgSQL
    Monolith -.->|"Logs estructurados + trazas"| OTel
```

**Reglas de Fase 1:**
- Un proceso NestJS. Una instancia PostgreSQL. Docker Compose para desarrollo local.
- Sin Kong gateway — HTTPS directo a la app. Añadir Kong en Fase 2 cuando se incorpore un segundo canal de cliente o socio externo.
- Bus de eventos en memoria. Reemplazar con RabbitMQ solo cuando se necesite entrega asíncrona entre servicios ([ADR-0015](../adrs/core/0015-event-driven-architecture-intra-domain.md)).
- Redis es opcional. Añadir solo cuando se vulneré un umbral de latencia específico ([ADR-0014](../adrs/core/0014-distributed-caching-strategy-redis.md)).

---

### 5.1 Vista Completa de Contenedores — Arquitectura Madura (Fase 3+)

Este diagrama de Contenedor Nivel-2 de C4 refleja **todos los ADRs activos** en sus posiciones físicas de tiempo de ejecución.

```mermaid
graph TD
 subgraph ClientLayer["Capa de Canales de Cliente (ADR-0004)"]
 WebApp["Web App\n[React Query / Stale-While-Revalidate]"]
 MobileApp["Mobile App\n[Almacenamiento Offline Nativo]"]
 B2BClient["Cliente B2B (Clave API)"]
 end

 subgraph EdgeNet["Red Nivel 0: Caché Estática"]
 CDN["CDN (Content Delivery Network)\n[Cloudflare / Akamai / Opcional]"]
 end

 subgraph GatewayTier["Niveles de Gateway (ADR-0030, ADR-0008, ADR-0027, ADR-0032)"]
 Kong["Gateway Edge Kong OSS\n[Rate Limiting · SSL · JWT · CORS]"]
 WebBFF["NestJS Web BFF\n[REST/GraphQL + Caché Multi-Capa]"]
 MobileBFF["NestJS Mobile BFF\n[Cargas Compactas + Caché Multi-Capa]"]
 end

 subgraph CoreTier["Nivel de Aplicación Core (ADR-0002, ADR-0012, ADR-0016, ADR-0019, ADR-0029)"]
 CoreAPI["NestJS Core API\nHexagonal + Auditoría + UnitOfWork"]
 FeatureFlags["Motor de Feature Flags\n[ADR-0017, ADR-0025]"]
 ConfigPlatform["Plataforma de Configuración\n[ADR-0024]"]
 end

 subgraph PersistenceTier["Nivel de Persistencia (ADR-0014, ADR-0022)"]
 PgSQL[("PostgreSQL 16\n[Dual-Layer RLS · ADR-0010]")]
 Redis[("Clúster Distribuido Redis\n[Caché Escalonada Multi-Capa · ADR-0014]")]
 AuditLog[("Registro Auditoría (Append-Only)\n[ADR-0016]")]
 end

 subgraph MessagingTier["Nivel Mensajería Asíncrona (ADR-0015, ADR-0031)"]
  IBusPort["(Port) IEventBusPort"]
  InMemoryBus["Bus En-Memoria\n(Dev/Test)"]
  RabbitMQBus["RabbitMQ\n(Producción)"]
  IBusPort -.->|Impl| InMemoryBus
  IBusPort -.->|Impl| RabbitMQBus
 end

 subgraph SecurityTier["Nivel de Seguridad (ADR-0020, ADR-0026, ADR-0021)"]
 IdP["Adaptador IdP Conectable\n[Auth0 / Entra / Zitadel]"]
 AuthGraph["Motor Gráfico de Autorización\n[RBAC/ABAC < 5ms · ADR-0021]"]
 MFA["Motor MFA / Passkeys\n[WebAuthn · ADR-0026]"]
 end

 subgraph ObservabilityTier["Nivel de Observabilidad (ADR-0007)"]
 OTel["Coleccionista OTel"]
 Loki["Grafana Loki"]
 Jaeger["Trazado Jaeger"]
 OTel --> Loki
 OTel --> Jaeger
 end

 subgraph InfraTier["Infraestructura OSS Autohospedada (ADR-0028)"]
 Vault["HashiCorp Vault\n[Gestión de Secretos]"]
 MinIO["MinIO\n[Almacenamiento de Objetos]"]
 end

 WebApp --> |TLS/HTTP| CDN
 MobileApp --> |TLS/HTTP| CDN
 B2BClient --> |TLS/HTTP| CDN
 CDN -->|Peticiones de Origen| Kong
 Kong --> |Ruta| WebBFF
 Kong --> MobileBFF
 Kong --> CoreAPI

 WebBFF --> |gRPC| CoreAPI
 MobileBFF --> |gRPC| CoreAPI
 WebBFF <--> |Lecturas Caché BFF| Redis
 MobileBFF <--> |Lecturas Caché BFF| Redis
 CoreAPI <-->|Lecturas Caché Core| Redis

 CoreAPI -->|SQL/Dual-Layer RLS| PgSQL
 CoreAPI --> PgSQL
 CoreAPI --> AuditLog
 CoreAPI --> IBusPort
 CoreAPI --> AuthGraph
 CoreAPI --> FeatureFlags
 CoreAPI --> ConfigPlatform

 AuthGraph --> IdP
 AuthGraph --> MFA
 IdP --> PgSQL

 CoreAPI -.-> OTel
 Kong -.-> OTel
 WebBFF -.-> OTel

 CoreAPI --> Vault
 CoreAPI --> MinIO
```

---

## 6. Vista de Tiempo de Ejecución - Patrones de Flujo de Petición

### 6.1 Flujo de Petición Autenticada ([ADR-0030](../adrs/core/0030-api-gateway-kong-vs-nestjs.md), [ADR-0008](../adrs/nodejs/0008-progressive-multimodule-evolution-gateway-bff.md), [ADR-0021](../adrs/nodejs/0021-high-performance-auth-and-graph-compilation.md), [ADR-0014](../adrs/core/0014-distributed-caching-strategy-redis.md))

```mermaid
sequenceDiagram
 autonumber
 participant C as Web App
 participant CL as "Caché Cliente (ADR-0004)"
 participant CDN as "CDN (Capa 1)"
 participant B as "NestJS BFF (Capa 2)"
 participant R as Redis Distribuido
 participant A as "Core API (Capa 3)"
 participant D as "PostgreSQL (RLS)"

 C->>CL: Consultar Estado (React Query)
 alt Acierto de Caché (Renderizado Inmediato)
 CL-->>C: Datos (Stale-While-Revalidate)
 end
 C->>CDN: Petición HTTPS (Fetch/Actualización en Segundo Plano)
 alt Acierto CDN
 CDN-->>C: Devolver Contenido Estático
 else Fallo CDN
 CDN->>B: Reenviar Petición a Origen
 B->>R: Búsqueda en Caché BFF (Modelos de Vista)
 alt Acierto Caché BFF
 R-->>B: Devolver Respuesta Compuesta
 B-->>CDN: Respuesta Cacheable
 CDN-->>C: Contenido Entregado
 C->>CL: Sincronizar Caché del Cliente
 else Fallo Caché BFF
 B->>A: Llamada gRPC (ADR-0032)
 A->>R: Búsqueda Caché Core (Permisos/Datos)
 alt Acierto Core
 R-->>A: Objeto de Dominio
 else Fallo Core
 A->>D: Consulta SQL (Aislamiento Doble Capa)
 D-->>A: Resultados Filtrados
 A->>R: Poblar Caché Core
 end
 A-->>B: Respuesta gRPC
 B->>R: Poblar Caché BFF
 B-->>CDN: Cuerpo Completamente Compuesto
 CDN-->>C: Entregar Respuesta
 C->>CL: Poblar/Sincronizar Caché Cliente
 end
 end
```

### 6.2 Flujo de Eventos Asíncronos - Bus Inyectable ([ADR-0015](../adrs/core/0015-event-driven-architecture-intra-domain.md), [ADR-0016](../adrs/core/0016-immutable-business-audit-trail.md))

```mermaid
sequenceDiagram
 autonumber
 participant UC as Caso de Uso
 participant Port as IEventBusPort
 participant Bus as "Impl Concreta (RabbitMQ / En-Memoria)"
 participant AuditSvc as Servicio de Auditoría
 participant AuditDB as "Registro Auditoría (Append-Only)"

 UC->>Port: publish(DomainEvent)
 Port->>Bus: Despachar (vía impl inyectada)
 Bus-->>AuditSvc: Entregar evento asíncronamente
 AuditSvc->>AuditDB: INSERT delta inmutable (ADR-0016)
 Note over AuditDB: UPDATE/DELETE bloqueados por trigger de BD
```

### 6.3 Flujo de Resiliencia - Circuit Breaker ([ADR-0011](../adrs/core/0011-fault-tolerance-resiliency-patterns.md))

```mermaid
sequenceDiagram
 autonumber
 participant A as API Core
 participant CB as "Circuit Breaker (opossum)"
 participant Ext as Servicio Externo

 A->>CB: execute(llamada)
 alt Circuito CERRADO
 CB->>Ext: Reenviar llamada
 Ext-->>CB: Éxito
 CB-->>A: Resultado
 else Circuito ABIERTO (umbral excedido)
 CB-->>A: Respuesta Alternativa (sin llamada ejecutada)
 Note over CB: Previene fallo en cascada (ADR-0011)
 end
```

---

## 7. Vista de Despliegue - Infraestructura Cloud Objetivo ([ADR-0013](../adrs/core/0013-cloud-infrastructure-topology-dr.md), [ADR-0028](../adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.md))
> [!IMPORTANT]
> **Estrategia de Despliegue Progresivo**: El diagrama siguiente representa la arquitectura de despliegue objetivo en estado maduro (**Fase 3+**). De acuerdo con el principio de Complejidad Progresiva, en la **Fase 1 (Monolito)** se permite la ejecución directa de los contenedores en hosts de cómputo mínimo (VMs, Container Apps o Docker Compose), escalando hacia clústeres gestionados únicamente cuando la descomposición modular lo requiera. En esta fase, los **Microfrontends** ([ADR-0055](../adrs/core/0055-estrategia-arquitectura-microfrontends.md)) se despliegan de forma independiente en sus respectivos clústeres u orígenes de CDN.


```mermaid
graph TD
 subgraph CloudZoneA["Zona de Disponibilidad A"]
 KongA["Nodo Kong"]
 BFFA["Pod NestJS BFF"]
 APIA["Pod Core API"]
 PgPrimary[("PostgreSQL Primario")]
 end

 subgraph CloudZoneB["Zona de Disponibilidad B (DR - ADR-0013)"]
 KongB["Nodo Kong"]
 BFFB["Pod NestJS BFF"]
 APIB["Pod Core API"]
 PgReplica[("PostgreSQL Réplica")]
 end

 subgraph SharedInfra["OSS Autohospedado Compartido (ADR-0028)"]
 Redis[("Clúster Redis")]
 RabbitMQ["Clúster RabbitMQ"]
 Vault["HashiCorp Vault"]
 MinIO["Almacenamiento MinIO"]
 end

 Internet --> |DNS Failover| KongA
 Internet --> KongB
 KongA --> BFFA --> APIA --> PgPrimary
 KongB --> BFFB --> APIB --> PgReplica
 PgPrimary -.->|Replicación en Streaming| PgReplica
 APIA <--> Redis
 APIB <--> Redis
 APIA --> RabbitMQ
 APIB --> RabbitMQ
 APIA --> Vault
 APIB --> Vault
```

---

## 8. Conceptos Corporativos Transversales - Matriz ADR Completa

| Preocupación Arquitectónica | ADR(s) Implementado(s) | Patrón / Tecnología | Sección del Diagrama |
| :--- | :--- | :--- | :--- |
| **Gobernanza de Monorepo** | [ADR-0001](../adrs/core/0001-monorepo-orchestration-nx.md) | Nx + npm workspaces | 2 |
| **Arquitectura Hexagonal** | [ADR-0002](../adrs/nodejs/0002-clean-architecture-nestjs.md) | Puertos y Adaptadores | 4.1, 5 |
| **Estándares de TypeScript** | [ADR-0003](../adrs/nodejs/0003-strict-typescript-standards.md) | Modo estricto + ESLint Boundaries | 2 |
| **Resiliencia en Frontend** | [ADR-0004](../adrs/nodejs/0004-frontend-offline-resilience.md) | Caché offline de React Query | 3.1 |
| **Seguridad CI/CD** | [ADR-0005](../adrs/core/0005-ci-cd-quality-codeql.md) | CodeQL + GitHub Actions | 2 |
| **Camino a Microservicios** | [ADR-0006](../adrs/core/0006-future-microservices-transition-dapr.md) | Triggers de migración Dapr Sidecar | 4.5 |
| **Observabilidad** | [ADR-0007](../adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.md) | OpenTelemetry + Loki + Jaeger | 3.1, 5, 6 |
| **Patrón de Gateway BFF** | [ADR-0008](../adrs/nodejs/0008-progressive-multimodule-evolution-gateway-bff.md) | NestJS BFF por canal de cliente | 3.1, 4.3, 5 |
| **Fijación de Dependencias** | [ADR-0009](../adrs/core/0009-strict-dependency-pinning-vulnerability-management.md) | Versiones exactas + `npm audit` | 2 |
| **Multi-Tenancy (SaaS)** | [ADR-0010](../adrs/core/0010-multi-tenancy-architecture-strategy.md) | Filtros de aplicación + contexto por runtime + failsafe nativo de BD | 4.2, 5, 6.1 |
| **Circuit Breakers** | [ADR-0011](../adrs/core/0011-fault-tolerance-resiliency-patterns.md) | `opossum` + Exponential Backoff | 5, 6.3 |
| **Autorización RBAC/ABAC** | [ADR-0012](../adrs/nodejs/0012-advanced-authorization-rbac-abac.md) | JWT Claims + NestJS Guards | 5 |
| **Topología Cloud DR** | [ADR-0013](../adrs/core/0013-cloud-infrastructure-topology-dr.md) | Multi-AZ + Replicación en Streaming | 7 |
| **Caché Distribuida** | [ADR-0014](../adrs/core/0014-distributed-caching-strategy-redis.md) | Caché Escalonada Multi-Capa tras `ICachePort` | 5, 6.1 |
| **Orientado a Eventos (Bus Inyectable)** | [ADR-0015](../adrs/core/0015-event-driven-architecture-intra-domain.md) | `IEventBusPort` -> En-Mem / RabbitMQ | 3.1, 4.4, 5, 6.2 |
| **Pista de Auditoría Inmutable** | [ADR-0016](../adrs/core/0016-immutable-business-audit-trail.md) | Tabla append-only + trigger de BD | 5, 6.2 |
| **Feature Flagging** | [ADR-0017](../adrs/core/0017-feature-flagging-strategy.md) | `IFeatureFlagPort` (Unleash/ConfigCat) | 5 |
| **Pirámide de Pruebas** | [ADR-0018](../adrs/core/0018-testing-pyramid-quality-gates.md) | Unitarias + Contrato (Pact) + E2E | 2 |
| **Patrones Funcionales / Result** | [ADR-0019](../adrs/core/0019-tactical-design-patterns-future-proofing.md) | `Result<T,E>` en lugar de excepciones | 4.1 |
| **Abstracción de Proveedor Identidad** | [ADR-0020](../adrs/core/0020-identity-provider-abstraction-strategy.md) | Strategy Pattern -> Auth0/Entra/Zitadel | 3.1, 5 |
| **Compilación de Gráfico de Auth** | [ADR-0021](../adrs/nodejs/0021-high-performance-auth-and-graph-compilation.md) | Gráfico de permisos en caché Redis < 5ms | 5 |
| **Proyecciones Conectables** | [ADR-0022](../adrs/nodejs/0022-contextual-auth-and-pluggable-projections.md) | Proyecciones de lectura conscientes del contexto | 5 |
| **Núcleo de Autenticación Centralizado** | [ADR-0023](../adrs/nodejs/0023-centralized-ums-vs-decentralized-access.md) | Núcleo compartido de autorización | 5 |
| **Plataforma de Config and Features** | [ADR-0024](../adrs/core/0024-configuration-feature-management-platform.md) | Motor de parámetros multi-IdP | 5 |
| **Abstracción de Feature Flags** | [ADR-0025](../adrs/core/0025-feature-flag-provider-abstraction.md) | Proveedores conectables de `IFeatureFlagPort` | 5 |
| **MFA y Passkeys** | [ADR-0026](../adrs/nodejs/0026-mfa-passwordless-adaptive-authentication.md) | WebAuthn + Passkeys + TOTP + Adaptativo | 5 |
| **Protocolo Dual REST/gRPC** | [ADR-0027](../adrs/nodejs/0027-dual-protocol-rest-grpc-api-gateway.md) | REST (externo) + gRPC (interno) | 3.1 |
| **Infraestructura OSS Autohospedada** | [ADR-0028](../adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.md) | MinIO + RabbitMQ + Vault OSS | 5, 7 |
| **Primitivas DDD Tácticas** | [ADR-0029](../adrs/nodejs/0029-tactical-ddd-primitives-library.md) | `@nestjslatam/ddd` vía re-exportaciones | 4.1 |
| **Gateway de Dos Niveles** | [ADR-0030](../adrs/core/0030-api-gateway-kong-vs-nestjs.md) | Kong (Edge) + NestJS BFF (Agregación) | 3.1, 4.3, 5, 6.1 |
| **Catálogo de Eventos de Dominio** | [ADR-0031](../adrs/core/0031-schema-per-context-domain-event-catalog.md) | Extracción multi-esquema + Contratos Asíncronos | 5, 6.2 |
| **Selección de Protocolo** | [ADR-0032](../adrs/core/0032-api-protocol-decision-matrix-rest-grpc-graphql.md) | gRPC (Int) vs REST (Ext) vs GraphQL | 3.1, 5, 6.1 |
| **Transactional Outbox** | [ADR-0033](../adrs/core/0033-transactional-outbox-pattern.md) | DB Atómica + Garantía atómica de eventos | 6.2 |
| **Separación CQRS** | [ADR-0034](../adrs/core/0034-cqrs-pattern-applicability-matrix.md) | Matriz de Evaluación para Modelos de Lectura/Escritura | 5, 6.1 |
| **Sagas Distribuidas** | [ADR-0035](../adrs/core/0035-distributed-saga-pattern-strategy.md) | Estrategia de Transacción Compensatoria | 6.2 |
| **Estrategia de Mensajería** | [ADR-0036](../adrs/core/0036-message-bus-delivery-strategy-fifo-dlq.md) | Políticas FIFO vs Disparar y Olvidar vs DLQ | 6.2 |
| **Pruebas de Rendimiento** | [ADR-0037](../adrs/core/0037-performance-concurrency-chaos-strategy.md) | Carga K6 + Verificación de Contratos Pact | 5, 6.3 |
| **Gestión de Errores** | [ADR-0038](../adrs/nodejs/0038-error-handling-result-pattern-strategy.md) | Patrón Result + Límites Unificados | 5, 6.3 |
| **Selector de Despliegue** | [ADR-0039](../adrs/core/0039-deployment-topology-abstraction-switcher.md) | Abstracción de Topología basada en Factory | 7 |
| **Selección Políglota** | [ADR-0040](../adrs/core/0040-multi-runtime-selection-contracts.md) | Matriz de Carga de Trabajo y Contratos Type-Safe | 1.2 |
| **Arquitectura Canónica .NET** | [ADR-0041](../adrs/dotnet/0041-canonical-dotnet-backend-architecture.md) | Clean Arch C# / Minimal APIs | 1.2 |
| **Arquitectura Canónica Android** | [ADR-0042](../adrs/android/0042-canonical-android-mobile-architecture.md) | Kotlin Nativo / Compose / Offline | 1.2 |
| **Microfrontends** | [ADR-0055](../adrs/core/0055-estrategia-arquitectura-microfrontends.md) | Module Federation de UI en tiempo de ejecución | 4.5, 7 |


---

## 9. Requisitos de Calidad (NFR Benchmark)

| Métrica | Objetivo | ADR(s) Aplicables |
| :--- | :--- | :--- |
| **Latencia de API (P95)** | < 50ms | [ADR-0014](../adrs/core/0014-distributed-caching-strategy-redis.md), [ADR-0021](../adrs/nodejs/0021-high-performance-auth-and-graph-compilation.md) |
| **Resolución de Gráfico de Auth** | < 5ms | [ADR-0021](../adrs/nodejs/0021-high-performance-auth-and-graph-compilation.md) |
| **Vulnerabilidades SAST** | 0 Altas/Críticas | [ADR-0005](../adrs/core/0005-ci-cd-quality-codeql.md), [ADR-0009](../adrs/core/0009-strict-dependency-pinning-vulnerability-management.md) |
| **Cobertura de Pruebas** | 70% | [ADR-0018](../adrs/core/0018-testing-pyramid-quality-gates.md) |
| **Huella de Memoria** | Baja inactividad (densidad de microservicios) | [ADR-0002](../adrs/nodejs/0002-clean-architecture-nestjs.md), [ADR-0006](../adrs/core/0006-future-microservices-transition-dapr.md) |
| **Filtración de Datos de Tenencia** | Tolerancia cero | [ADR-0010](../adrs/core/0010-multi-tenancy-architecture-strategy.md) (Aislamiento Doble Capa) |

---

## 10. Implementación de Referencia Canónica

-> **[Volver a la Raíz del Proyecto y Guía de Inicio](../../README.md)**

Implementado usando:
- **Framework**: NestJS (v10) con límites estrictamente hexagonales.
- **ORM**: TypeORM con soporte nativo de PostgreSQL RLS.
- **Gateway**: Kong OSS (YAML sin BD) + capas de NestJS BFF.
- **Bus de Eventos**: `IEventBusPort` por defecto en Memoria, inyectable con RabbitMQ.
- **Pruebas**: Jest (unitarias/integración) + Pact (pruebas de contrato).

---

## 11. Riesgos y Deuda Técnica

Seguimiento estratégico de las limitaciones actuales del diseño y riesgos del sistema reconocidos.

### 11.1 Riesgos Inherentes
| ID del Riesgo | Descripción | Estrategia de Mitigación | Severidad |
| :--- | :--- | :--- | :--- |
| **R-01** | **Rendimiento de BD Compartida** | El empaquetamiento físico de la BD crea un dominio de fallo único. | Imponer replicación de lectura estricta y techos de tiempo de espera de consulta. | Media |
| **R-02** | **Desbordamiento de RabbitMQ** | Picos de mensajes en memoria durante interrupciones. | Control de Flujo / Cuotas obligatorias según **[ADR-0036](../adrs/core/0036-message-bus-delivery-strategy-fifo-dlq.md)**. | Alta |
| **R-03** | **Acoplamiento Políglota gRPC** | Cambios de protocolo no compatibles con versiones anteriores. | Verificación obligatoria de contratos **Pact JS** en CI. | Alta |

### 11.2 Deuda Técnica Conocida
* **Hinchazón de Monorepo**: A medida que el conteo de librerías supere las 200+, la gestión de caché Nx requerirá la migración de almacenamiento en caché local a la nube.
* **Vulnerabilidad de Librería de Día Cero**: Los ciclos de actualización rápidos impuestos por la fijación estricta de dependencias ([ADR-0009](../adrs/core/0009-strict-dependency-pinning-vulnerability-management.md)) pueden consumir entre el 5% y 10% del ancho de banda de desarrollo mensual.

---

## 12. Glosario de Conceptos Arquitectónicos

Nomenclatura de referencia utilizada por este blueprint.

* **ACL (Anti-Corruption Layer)**: Aísla el modelo de dominio interno de esquemas/contratos externos.
* **BFF (Backend for Frontend)**: API de borde de un solo propósito que optimiza las cargas útiles para un cliente específico.
* **Bounded Context**: Límite estratégico de lógica propietario de su propio esquema de base de datos privado.
* **Arquitectura Limpia**: Paradigma de diseño donde el flujo de control siempre apunta hacia adentro, hacia las dependencias.
* **Circuit Breaker Distribuido**: Mecanismo para detener la entrega de peticiones a servicios aguas arriba con fallas compartiendo el estado entre pods vía Redis.
* **Arquitectura Hexagonal**: Ver *Puertos y Adaptadores*.
* **Puerto**: Contrato explícito (Interfaz) que requiere la aplicación para comunicarse con sistemas externos.
* **RLS (Row-Level Security)**: Seguridad nativa del motor de BD que restringe las filas de la tabla al usuario de la sesión activa.
* **Patrón Saga**: Gestión de la consistencia transaccional distribuida a través de eventos de compensación.

---
[Volver al Índice](./README.md)
