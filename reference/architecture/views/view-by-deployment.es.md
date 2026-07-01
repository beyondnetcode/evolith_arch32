# Vista de Arquitectura: Despliegue

> **Navegación Bilingüe:** [Ver Versión en Inglés](./view-by-deployment.md)

**Estado:** Aprobado  
**Padre:** [C4 Master Architecture](../C4-MASTER-ARCHITECTURE.es.md)

## 1. Despliegue Actual (VPS / Coolify)

Evolith utiliza actualmente una configuración en contenedores de alta disponibilidad ejecutándose en un Virtual Private Server orquestado por Coolify.
Esta topología equilibra eficiencia de costos con resiliencia.

```mermaid
flowchart TB
    title[Topología de Despliegue Actual]

    subgraph vps [Virtual Private Server Ubuntu 22.04 LTS]
        subgraph coolify [Motor Coolify]
            
            subgraph proxy [Reverse Proxy Traefik]
                gateway[API Gateway]
            end
            
            subgraph core_tier [Servicios Core API Docker Compose]
                api1[Core API Réplica 1]
                api2[Core API Réplica 2]
                mcp[MCP Server Node.js]
                agentApi[Agent Runtime Command/Event API]
            end
            
            subgraph data_tier [Capa de Datos Docker]
                redis[(Caché Redis)]
            end
        end
    end
    
    gateway -->|Balancea carga HTTP a| api1
    gateway -->|Balancea carga HTTP a| api2
    gateway -->|Enruta tráfico de comandos y eventos a| agentApi
    api1 -->|Cachea rulesets en| redis
    api2 -->|Cachea rulesets en| redis
```

## 2. Despliegue Futuro (Kubernetes)

A medida que el ecosistema escale, Evolith transicionará a un modelo de despliegue nativo de Kubernetes para soportar HPA (Horizontal Pod Autoscaling) automatizado y políticas de red (NetworkPolicies) estrictas.

```mermaid
flowchart TB
    title[Topología Kubernetes Objetivo]

    subgraph k8s [Cluster Kubernetes EKS/GKE]
        subgraph ingress [Ingress Controller]
            gateway[K8s Ingress]
        end
        
        subgraph ns_core [Namespace: evolith-core]
            subgraph pod_api [Deployment: core-api HPA]
                api[Core API NestJS]
            end
            subgraph pod_mcp [Deployment: mcp-server HPA]
                mcp[MCP Server Node.js]
            end
            subgraph pod_agent_runtime [Deployment: agent-runtime HPA]
                agentApi[Agent Runtime Command/Event API]
            end
            subgraph sts_redis [StatefulSet: redis]
                redis[(Redis HA)]
            end
        end
    end

    gateway -->|HTTP / REST| pod_api
    gateway -->|Comandos HTTP / stream de eventos| pod_agent_runtime
    pod_api -->|TCP / Protocolo Redis| sts_redis
```

---
[Volver a la Arquitectura Maestra](../C4-MASTER-ARCHITECTURE.es.md)
