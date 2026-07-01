# C4 Nivel 3: Hub de Componentes

> **Navegación Bilingüe:** [Ver Versión en Inglés](./README.md)

**Estado:** Aprobado  
**Nivel:** 3 - Componentes  
**Padre:** [C4 Nivel 2: Contenedores](../level-2-containers.es.md)

## 1. Visión General a Nivel de Componente

Los diagramas de Nivel 3 (Componentes) hacen zoom dentro de los contenedores individuales identificados en el Nivel 2. En este nivel, identificamos los principales bloques de construcción estructurales de cada contenedor: los controladores, servicios de aplicación, modelos de dominio y adaptadores de infraestructura.

Evolith sigue los principios de **Arquitectura Limpia (Clean Architecture)** y **Diseño Guiado por el Dominio (DDD)** en todos sus contenedores principales.

## 2. Contenedores Navegables

Selecciona un contenedor para explorar sus componentes internos:

- **[Componentes del Core API (BFF)](./core-api-components.es.md):** Explorando el motor de evaluación stateless, el evaluador OPA y la resolución de workspaces.
- **[Componentes del Agent Runtime](./agent-runtime-components.es.md):** Explorando la capa de orquestación (ports and adapters), incluyendo la API de streaming SSE y los resolvedores de habilidades.
- **[Componentes del MCP Server](./mcp-server-components.es.md):** (Pendiente) Explorando las herramientas y recursos independientes de MCP.
- **[Componentes de Smart CLI](./smart-cli-components.es.md):** (Pendiente) Explorando la estructura de comandos locales de terminal y la integración con el SDK.

---
[Volver al Nivel 2: Contenedores](../level-2-containers.es.md)
