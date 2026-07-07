# Architecture View: Deployment

> **Bilingual Navigation:** [Versión en Español](./view-by-deployment.es.md)

**Status:** Approved  
**Parent:** [C4 Master Architecture](./C4-MASTER-ARCHITECTURE.md)

## 1. Current Deployment (VPS / Coolify)

Evolith currently utilizes a high-availability, containerized setup running on a Virtual Private Server orchestrated by Coolify. 
This topology balances cost-efficiency with resilience.

```mermaid
flowchart TB
    title[Current Deployment Topology]

    subgraph vps [Virtual Private Server Ubuntu 22.04 LTS]
        subgraph coolify [Coolify Engine]
            
            subgraph proxy [Reverse Proxy Traefik]
                gateway[API Gateway]
            end
            
            subgraph core_tier [Core API Services Docker Compose]
                api1[Core API Replica 1]
                api2[Core API Replica 2]
                mcp[MCP Server Node.js]
                agentApi[Agent Runtime Command/Event API]
            end
            
            subgraph data_tier [Data Tier Docker]
                redis[(Redis Cache)]
            end
        end
    end
    
    gateway -->|Load balances HTTP| api1
    gateway -->|Load balances HTTP| api2
    gateway -->|Routes command and event traffic| agentApi
    api1 -->|Caches rulesets| redis
    api2 -->|Caches rulesets| redis
```

## 2. Future Deployment (Kubernetes)

As the ecosystem scales, Evolith will transition to a Kubernetes-native deployment model to support automated HPA (Horizontal Pod Autoscaling) and strict NetworkPolicies.

```mermaid
flowchart TB
    title[Target Kubernetes Topology]

    subgraph k8s [Kubernetes Cluster EKS/GKE]
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
    gateway -->|HTTP commands / event stream| pod_agent_runtime
    pod_api -->|TCP / Redis| sts_redis
```

---
[Back to Master Architecture](./C4-MASTER-ARCHITECTURE.md)
