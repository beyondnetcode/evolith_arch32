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

- **[Componentes del Core API](./core-api-components.es.md):** Explorando el motor de evaluación stateless, la resolución de workspaces, acceso a caché/referencia y la superficie transitoria de registro de satélites.
- **[Componentes del Agent Runtime](./agent-runtime-components.es.md):** Explorando la capa de orquestación (ports and adapters), incluyendo la API de comandos/eventos, resolución de skills, aprobación, memoria, validación de políticas y publicación de trazas.
- **[Componentes del MCP Server](./mcp-server-components.es.md):** Explorando el gateway MCP standalone, registro de tools, resources, prompts, ABAC, auditoría, métricas y puente hacia Agent Runtime.
- **[Componentes de Smart CLI](./smart-cli-components.es.md):** Explorando comandos Nest Commander, evaluación local, validación, perfiles, plugins, flujos de satélites e integración SDK.

---
[Volver al Nivel 2: Contenedores](../level-2-containers.es.md)
