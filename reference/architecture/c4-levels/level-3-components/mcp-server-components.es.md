# C4 Nivel 3: Componentes del MCP Server

> **Navegación Bilingüe:** [Ver Versión en Inglés](./mcp-server-components.md)

**Estado:** Aprobado  
**Nivel:** 3 - Componentes  
**Padre:** [C4 Nivel 3: Hub de Componentes](./README.es.md)

## 1. Contexto del Contenedor

El **Standalone MCP Server** expone las capacidades de gobernanza de Evolith hacia Agentes IA externos (como Claude vía Claude Desktop, u otros flujos de trabajo agénticos) utilizando el Model Context Protocol estándar. Está completamente desacoplado del Smart CLI.

## 2. Diagrama de Componentes

```mermaid
C4Component
    title Diagrama de Componentes para MCP Server

    Container_Boundary(mcp, "Contenedor MCP Server") {
        
        Component(transport, "Capa de Transporte", "@modelcontextprotocol/sdk", "Maneja transporte Stdio y SSE para conexiones MCP entrantes.")
        
        Component(server, "EvolithMcpServer", "Servicio de Aplicación", "Clase principal de coordinación para registrar herramientas y recursos.")
        
        Component(tool_validate, "Validate Tool", "Manejador de Herramienta", "Herramienta MCP: Valida archivos locales contra rulesets OPA vía Agent Runtime / Core API.")
        
        Component(tool_gate, "Gate Check Tool", "Manejador de Herramienta", "Herramienta MCP: Verifica si una fase/puerta del SDLC está pasando.")
        
        Component(resource_corpus, "Corpus Resource", "Manejador de Recurso", "Recurso MCP: Expone los rulesets físicos y archivos OPA como contexto legible.")
        
        Component(client, "Core API Client", "Adaptador", "Se comunica con el Core API (BFF) para ejecutar las evaluaciones.")

        Rel(transport, server, "Enruta peticiones a")
        Rel(server, tool_validate, "Despacha llamada a herramienta")
        Rel(server, tool_gate, "Despacha llamada a herramienta")
        Rel(server, resource_corpus, "Despacha lectura de recurso")
        
        Rel(tool_validate, client, "Ejecuta validación vía")
        Rel(tool_gate, client, "Ejecuta verificación de gate vía")
    }
```

## 3. Desglose de Componentes Clave

| Componente | Responsabilidad |
|------------|-----------------|
| **Capa de Transporte** | SDK estándar de MCP que maneja el ciclo de vida de la conexión (Stdio para procesos locales, SSE para streaming remoto). |
| **EvolithMcpServer** | El punto de entrada de la aplicación que registra el esquema de herramientas y recursos disponibles con el LLM que se conecta. |
| **Manejadores de Herramientas** | Acciones específicas y limitadas que la IA puede tomar (ej. `validate_artifact`, `check_gate`). |
| **Manejadores de Recursos** | Contexto de solo-lectura que la IA puede solicitar (ej. `ruleset://...`). |
| **Core API Client** | En lugar de duplicar lógica de negocio, el MCP Server hace llamadas REST al `Core API` para procesar validaciones y leer topologías. |

---
[Volver al Nivel 3: Hub de Componentes](./README.es.md)
