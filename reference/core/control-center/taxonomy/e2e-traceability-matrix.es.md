# Matriz de Trazabilidad E2E

> **Navegación Bilingüe:** [Ver Versión en Inglés](./e2e-traceability-matrix.md)

**Estado:** Aprobado  
**Padre:** [C4 Master Architecture](../../architecture/demos/C4-MASTER-ARCHITECTURE.es.md)

## 1. Visión General de la Matriz

Esta matriz mapea las interfaces de producto de alto nivel hasta su contenedor específico, componente, implementación tecnológica y protocolo de comunicación. Garantiza que cada capacidad en Evolith pueda rastrearse de extremo a extremo.

## 2. Mapeo de Interfaz a Tecnología

| Interfaz de Alto Nivel | Contenedor Destino | Componente Destino | Tecnología | Comunicación / Contrato |
|------------------------|--------------------|--------------------|------------|-------------------------|
| **Petición Canónica de Evaluación** | Core API | `EvaluationOrchestrator` -> Kind Evaluators / Validation Pipeline | NestJS, TypeScript, Evaluador Native, OPA/Rego | REST (`POST /api/v1/evaluate`), payload JSON `EvaluationContext` |
| **Petición Específica de Evaluación de Gate** | Core API | `EvaluateGateUseCase` -> `PhaseGateValidatorService` | NestJS, TypeScript, validators Native/OPA | REST (`POST /api/v1/gates/:gateId/evaluate`), payload JSON |
| **Ejecución de Tarea por Agente** | Agent Runtime API / Engine | `AgentRuntimeController` -> `AgentRuntimeService` -> Puertos | NestJS, RxJS, TypeScript | HTTP Command/Event (`POST /v1/agent/handle` para un resultado, `POST /v1/agent/stream` para comando más stream de eventos) |
| **Llamada a Herramienta por LLM** | MCP Server | `EvolithMcpServer` -> `ToolRegistryService` -> `ToolHandler` | NestJS, @modelcontextprotocol/sdk | Protocolo MCP (stdio o Streamable HTTP) |
| **Validación Local de Artefacto** | Evolith CLI | `ValidateCommand` / `EvaluateCommand` -> `@beyondnet/evolith-core-domain` | Nest Commander, TypeScript | I/O de Sistema de Archivos Local |
| **Lectura de Ruleset** | Core API | `ReferenceController` / `CoreReferenceQueryService` | NestJS, cache-manager, Node.js `fs` | REST (`GET /api/v1/rulesets`) |
| **Check Remoto desde CLI** | Evolith CLI | `@beyondnet/evolith-sdk` -> clientes REST | Node.js Fetch | REST sobre HTTPS |

## 3. Patrones de Comunicación

- **Síncrono Determinístico (REST):** Usado estrictamente para evaluaciones rápidas y sin estado (ej., evaluación OPA).
- **Runtime Command/Event (HTTP + SSE opcional):** Usado para ejecución gobernada de agentes multi-paso. Los comandos son requests HTTP explícitos; SSE es solo el transporte servidor-a-cliente para progreso, resultados de tools, violaciones y salida final.
- **Acceso Interactivo a Tools (MCP):** Protocolo estandarizado para que la inteligencia externa descubra y ejecute herramientas de manera segura sobre stdio o Streamable HTTP.

Para contratos IN/OUT, comportamiento de resiliencia y guía de clientes por interfaz, consulta [Flujos de Interfaces del Core](../../architecture/demos/view-by-interface-flow.es.md).

---
[Volver a la Arquitectura Maestra](../../architecture/demos/C4-MASTER-ARCHITECTURE.es.md)
