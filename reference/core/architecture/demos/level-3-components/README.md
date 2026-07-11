# C4 Level 3: Components Hub

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

**Status:** Approved  
**Level:** 3 - Components  
**Parent:** [C4 Level 2: Containers](../level-2-containers.md)

## 1. Component Level Overview

The Level 3 (Component) diagrams zoom inside the individual containers identified in Level 2. At this level, we identify the major structural building blocks of each container: the controllers, application services, domain models, and infrastructure adapters.

Evolith follows **Clean Architecture** and **Domain-Driven Design (DDD)** principles across its major containers.

## 2. Navigable Containers

Select a container to explore its internal components:

- **[Core API Components](./core-api-components.md):** Exploring the stateless evaluation engine, workspace resolution, cache/reference access, and transitional satellite registry surface.
- **[Agent Runtime Components](./agent-runtime-components.md):** Exploring the ports-and-adapters orchestration layer, including the command/event API, skill resolution, approval, memory, policy validation, and trace publishing.
- **[MCP Server Components](./mcp-server-components.md):** Exploring the standalone MCP gateway, tool registry, resources, prompts, ABAC, audit, metrics, and Agent Runtime bridge.
- **[Evolith CLI Components](./smart-cli-components.md):** Exploring Nest Commander commands, local evaluation, validation, profiles, plugins, satellite workflows, and SDK integration.

---
[Back to Level 2: Containers](../level-2-containers.md)
