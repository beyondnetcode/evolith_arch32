# Matriz de Trazabilidad E2E

> **Navegación Bilingüe:** [Ver Versión en Inglés](./e2e-traceability-matrix.md)

**Estado:** Aprobado  
**Padre:** [C4 Master Architecture](../C4-MASTER-ARCHITECTURE.es.md)

## 1. Visión General de la Matriz

Esta matriz mapea las interfaces de producto de alto nivel hasta su contenedor específico, componente, implementación tecnológica y protocolo de comunicación. Garantiza que cada capacidad en Evolith pueda rastrearse de extremo a extremo.

## 2. Mapeo de Interfaz a Tecnología

| Interfaz de Alto Nivel | Contenedor Destino | Componente Destino | Tecnología | Comunicación / Contrato |
|------------------------|--------------------|--------------------|------------|-------------------------|
| **Petición de Evaluación de Gate** | Core API (BFF) | `GateEvaluationUseCase` -> `Evaluador OPA` | NestJS, WASM, Rego | REST (`POST /v1/gates/evaluate`), JSON Payload |
| **Ejecución de Tarea por Agente** | Agent Runtime Engine | `AgentOrchestrator` -> `IAgentEnginePort` | NestJS, RxJS, TypeScript | SSE (`POST /v1/agent/stream`), Server-Sent Events |
| **Llamada a Herramienta por LLM** | MCP Server | `EvolithMcpServer` -> `ToolHandler` | Node.js, @modelcontextprotocol/sdk | Protocolo MCP (Stdio o SSE) |
| **Validación Local de Artefacto** | Smart CLI | `@evolith/sdk` -> `LocalFileLoader` | Node.js, Commander.js | I/O de Sistema de Archivos Local |
| **Lectura de Ruleset** | Core API (BFF) | `CacheAdapter` / `WorkspaceResolver` | Redis, Node.js `fs` | REST (`GET /v1/rulesets`) |
| **Check Remoto desde CLI** | Smart CLI | `@evolith/sdk` -> `RestClient` | Node.js, Axios/Fetch | REST sobre HTTPS |

## 3. Patrones de Comunicación

- **Síncrono Determinístico (REST):** Usado estrictamente para evaluaciones rápidas y sin estado (ej., evaluación OPA).
- **Streaming Asíncrono (SSE):** Usado para interacciones de IA no determinísticas y de múltiples turnos para asegurar que el cliente se mantenga informado sobre llamadas intermedias a herramientas sin recibir timeout.
- **Interactivo Bi-Direccional (MCP):** Protocolo estandarizado para que la inteligencia externa (como Claude Desktop) descubra y ejecute herramientas de manera segura.

---
[Volver a la Arquitectura Maestra](../C4-MASTER-ARCHITECTURE.es.md)
