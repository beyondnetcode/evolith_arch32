# C4 Nivel 2: Contenedores

> **Navegación Bilingüe:** [Ver Versión en Inglés](./level-2-containers.md)

**Estado:** Aprobado  
**Nivel:** 2 - Contenedores  
**Padre:** [C4 Nivel 1: System Context](./level-1-system-context.es.md)

## 1. Visión General de Contenedores

Esta vista se acerca al **Ecosistema Evolith Core** para revelar sus principales contenedores de ejecución. Evolith Core adopta una arquitectura modular, exponiendo sus reglas y capacidades a través de APIs especializadas (REST para evaluación stateless, una API de comandos/eventos para Agent Runtime, MCP para herramientas interactivas de IA y comandos CLI para flujos locales).

> *Nota: Evolith Tracker (el SaaS) y su BFF se tratan como sistemas externos que consumen estos contenedores.*

## 2. Diagrama de Contenedores

```mermaid
C4Container
    title Diagrama de Contenedores para el Ecosistema Evolith Core

    Person(dev, "Ingeniero", "Usa Smart CLI")
    Person(agent, "Agente IA", "Ejecutor LLM Autónomo")
    System_Ext(tracker, "Evolith Tracker", "Orquestador SaaS con estado")

    System_Boundary(core, "Sistema Evolith Core") {
        Container(gateway, "API Gateway", "Traefik", "Controlador Ingress que enruta tráfico y maneja terminación TLS.")
        
        Container(api, "Core API", "NestJS / REST", "Superficie de evaluación stateless. Sirve rulesets, evalúa contextos, gates y chequeos de topología, y hospeda endpoints transitorios de registro de satélites.")
        Container(mcp, "Standalone MCP Server", "NestJS / MCP stdio + Streamable HTTP", "Gateway Model Context Protocol. Provee tools, resources, prompts, ABAC, auditoría y métricas gobernadas.")
        Container(cli, "Smart CLI", "Nest Commander / TypeScript", "Aplicación de terminal para validación local, evaluación, scaffolding, perfiles, plugins y flujos de satélites.")
        Container(agentApi, "Agent Runtime Command/Event API", "NestJS / HTTP + SSE opcional", "Requests de comando más stream opcional de eventos para ejecuciones de agentes gobernadas.")
        Container(runtime, "Agent Runtime Engine", "TypeScript Package", "Capa de orquestación gobernada que aplica límites, puertos y ejecución.")
        
        ContainerDb(redis, "Capa de Caché", "Redis", "Cachea rulesets y topologías para alta disponibilidad 24/7.")
        ContainerDb(corpus, "Corpus de Referencia", "JSON / Rego / File System", "La fuente de verdad física para directivas arquitectónicas y reglas OPA.")
        
        Rel(gateway, api, "Enruta tráfico API a")
        Rel(gateway, agentApi, "Enruta tráfico de comandos y eventos a")
        
        Rel(api, redis, "Lee/Escribe caché")
        Rel(api, corpus, "Lee rulesets estructurados")
        
        Rel(mcp, runtime, "Ejecuta intents de agente mediante")
        Rel(agentApi, runtime, "Inicia comandos y streamea eventos desde")
        Rel(cli, runtime, "Puede llamar mediante SDK/API")
        Rel(runtime, api, "Evalúa contextos vía REST")
        Rel(runtime, corpus, "Lee contexto desde")
    }

    Rel(dev, cli, "Ejecuta comandos locales")
    Rel(agent, mcp, "Consume herramientas")
    Rel(agent, agentApi, "Envía comandos y escucha eventos")
    Rel(tracker, gateway, "Consume evaluación stateless y ejecución de agentes")
```

## 3. Desglose de Contenedores del Core

| Contenedor | Tecnología | Responsabilidad |
|------------|------------|-----------------|
| **Core API (REST)** | NestJS | Motor de evaluación stateless. Expone `/api/v1/evaluate`, endpoints de rulesets/referencia, gates/fases, chequeos de arquitectura y un registro in-memory transitorio de satélites. Retorna resultados técnicos de evaluación, no decisiones vinculantes de Tracker. |
| **Agent Runtime Command/Event API** | NestJS / RxJS | Expone `POST /v1/agent/handle` para ejecución request/response, `POST /v1/agent/stream` para envío de comando más entrega de eventos, y `GET /v1/agent/skills` para descubrimiento. SSE es un transporte de eventos, no el canal de comandos. |
| **Standalone MCP Server** | NestJS / Node.js | Expone tools, resources, prompts, ABAC, auditoría, métricas y transportes stdio/Streamable HTTP mediante Model Context Protocol. Está desacoplado del CLI pero comparte paquetes de dominio. |
| **Smart CLI** | Nest Commander / TypeScript | Interfaz amigable para validación local, evaluación canónica, scaffolding, perfiles, plugins, satélites e inspección de APIs. |
| **Agent Runtime Engine** | TypeScript (`@evolith/agent-runtime`) | Capa de orquestación (ports-and-adapters). Decide *cómo* se ejecuta una tarea de agente sin acoplarse directamente a `.harness` o Hermes. |
| **Redis Cache** | Redis / cache-manager | Caché opcional de alta disponibilidad para lecturas de topología/referencia y rendimiento de servicio. Core conserva fallback seguro cuando Redis no está disponible. |

## 4. Acercamiento (Zoom In)

A continuación, miramos dentro de estos contenedores específicos para comprender sus componentes internos (casos de uso, controladores, adaptadores).
**[Ir al Nivel 3: Componentes](./level-3-components/README.es.md)**

---
[Volver al Nivel 1: System Context](./level-1-system-context.es.md) | [Volver a la Arquitectura Maestra](../C4-MASTER-ARCHITECTURE.es.md)
