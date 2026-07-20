# C4 Nivel 3: Componentes del MCP Server

> **Navegación Bilingüe:** [Ver Versión en Inglés](./mcp-server-components.md)

**Estado:** Aprobado  
**Nivel:** 3 - Componentes  
**Padre:** [C4 Nivel 3: Hub de Componentes](./README.es.md)

## 1. Contexto del Contenedor

El **Standalone MCP Server** expone las capacidades de gobernanza de Evolith hacia agentes IA externos utilizando el Model Context Protocol estándar. Está desacoplado del Evolith CLI como runtime, pero comparte paquetes de dominio y los mismos contratos canónicos de evaluación.

## 2. Diagrama de Componentes

```mermaid
C4Component
    title Diagrama de Componentes para MCP Server

    Container_Boundary(mcp, "Contenedor MCP Server") {
        
        Component(transport, "Capa de Transporte", "@modelcontextprotocol/sdk", "Maneja transportes stdio y Streamable HTTP para conexiones MCP entrantes.")
        
        Component(server, "EvolithMcpServer", "Servicio de Aplicación", "Servicio principal de coordinación para handlers MCP, resources, prompts, auditoría y métricas.")
        
        Component(registry, "Registro de Tools", "Provider NestJS", "Registra validate, evaluate, satellites, agents, architecture, gates, phase, SDLC, topology, config, auto-fix, metrics y otras tools.")
        Component(authz, "Auth / ABAC / Auditoría", "Servicios MCP", "Valida contexto API key/JWT, evalúa políticas ABAC, emite auditoría y métricas.")
        Component(tool_validate, "Tools Validate / Evaluate", "Manejadores de Herramienta", "Tools MCP: valida repositorios y evalúa EvaluationContext canónico localmente mediante lógica compartida de core-domain.")
        
        Component(tool_gate, "Gate Check Tool", "Manejador de Herramienta", "Herramienta MCP: Verifica si una fase/puerta del SDLC está pasando.")
        
        Component(resource_corpus, "Resources y Prompts", "Manejadores de Resource/Prompt", "Resources y prompts MCP exponen corpus, rulesets y guía reutilizable como contexto legible.")
        
        Component(runtime, "Puente Agent Runtime", "@beyondnet/evolith-agent-runtime / SDK", "Ejecuta intents de agente o llama al Agent Runtime API cuando lo solicitan las tools MCP.")

        Rel(transport, server, "Enruta peticiones a")
        Rel(server, registry, "Lista y despacha tools vía")
        Rel(server, authz, "Autoriza y audita vía")
        Rel(registry, tool_validate, "Despacha llamada a herramienta")
        Rel(server, tool_gate, "Despacha llamada a herramienta")
        Rel(server, resource_corpus, "Despacha lectura de recurso")
        
        Rel(tool_validate, runtime, "Puede invocar flujo agent/runtime vía")
        Rel(tool_gate, runtime, "Puede invocar chequeos gobernados vía")
    }
```

## 3. Desglose de Componentes Clave

| Componente | Responsabilidad |
|------------|-----------------|
| **Capa de Transporte** | SDK estándar de MCP que maneja ciclos de vida stdio y Streamable HTTP. En HTTP producción falla cerrado si no hay API key. |
| **EvolithMcpServer** | Punto de entrada que conecta handlers MCP con registro, resources, prompts, métricas, ABAC y auditoría. |
| **Registro de Tools** | Registro compuesto por módulo desde `src/packages/mcp-server/src/tools/tools.module.ts`; reemplaza canónicamente al paquete ligero retirado `@beyondnet/evolith-mcp-tools`. |
| **Manejadores de Herramientas** | Acciones gobernadas incluyendo `evolith-validate`, `evolith-evaluate`, tools de satélites, agentes, arquitectura, gates/fases, SDLC, topología, configuración, métricas y auto-fix. |
| **Resources y Prompts** | Contexto de solo lectura y payloads de prompt reutilizables expuestos mediante handlers MCP de resource y prompt. |
| **Auth / ABAC / Auditoría** | Autenticación por API key/JWT, chequeos ABAC, gating de tools mutativas, auditoría de llamadas de tools y métricas. |

---
[Volver al Nivel 3: Hub de Componentes](./README.es.md)
