# Matriz de Trazabilidad E2E

> **Navegación Bilingüe:** [Ver Versión en Inglés](./e2e-traceability-matrix.md)

**Estado:** Aprobado  
**Padre:** [C4 Master Architecture](../C4-MASTER-ARCHITECTURE.es.md)

## 1. Visión General de la Matriz

Esta matriz mapea las interfaces de producto de alto nivel hasta su contenedor específico, componente, implementación tecnológica y protocolo de comunicación. Garantiza que cada capacidad en Evolith pueda rastrearse de extremo a extremo.

## 2. Mapeo de Interfaz a Tecnología

| Interfaz de Alto Nivel | Contenedor Destino | Componente Destino | Tecnología | Comunicación / Contrato |
|------------------------|--------------------|--------------------|------------|-------------------------|
| **Petición Canónica de Evaluación** | Core API | `EvaluationOrchestrator` -> Kind Evaluators / Validation Pipeline | NestJS, TypeScript, Evaluador Native, OPA/Rego | REST (`POST /api/v1/evaluate`), payload JSON `EvaluationContext` |
| **Petición Específica de Evaluación de Gate** | Core API | `EvaluateGateUseCase` -> `PhaseGateValidatorService` | NestJS, TypeScript, validators Native/OPA | REST (`POST /api/v1/gates/:gateId/evaluate`), payload JSON |
| **Ejecución de Tarea por Agente** | Agent Runtime API / Engine | `AgentRuntimeController` -> `AgentRuntimeService` -> Puertos | NestJS, RxJS, TypeScript | HTTP (`POST /v1/agent/handle`) o SSE (`POST /v1/agent/stream`) |
| **Llamada a Herramienta por LLM** | MCP Server | `EvolithMcpServer` -> `ToolRegistryService` -> `ToolHandler` | NestJS, @modelcontextprotocol/sdk | Protocolo MCP (stdio o Streamable HTTP) |
| **Validación Local de Artefacto** | Smart CLI | `ValidateCommand` / `EvaluateCommand` -> `@evolith/core-domain` | Nest Commander, TypeScript | I/O de Sistema de Archivos Local |
| **Lectura de Ruleset** | Core API | `ReferenceController` / `CoreReferenceQueryService` | NestJS, cache-manager, Node.js `fs` | REST (`GET /api/v1/rulesets`) |
| **Check Remoto desde CLI** | Smart CLI | `@evolith/sdk` -> clientes REST | Node.js Fetch | REST sobre HTTPS |

## 3. Patrones de Comunicación

- **Síncrono Determinístico (REST):** Usado estrictamente para evaluaciones rápidas y sin estado (ej., evaluación OPA).
- **Streaming Asíncrono (SSE):** Usado para interacciones de IA no determinísticas y de múltiples turnos para asegurar que el cliente se mantenga informado sobre llamadas intermedias a herramientas sin recibir timeout.
- **Interactivo Bi-Direccional (MCP):** Protocolo estandarizado para que la inteligencia externa descubra y ejecute herramientas de manera segura sobre stdio o Streamable HTTP.

---
[Volver a la Arquitectura Maestra](../C4-MASTER-ARCHITECTURE.es.md)
