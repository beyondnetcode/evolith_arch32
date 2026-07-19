# C4 Nivel 3: Componentes del Agent Runtime

> **Navegación Bilingüe:** [Ver Versión en Inglés](./agent-runtime-components.md)

**Estado:** Aprobado  
**Nivel:** 3 - Componentes  
**Padre:** [C4 Nivel 3: Hub de Componentes](./README.es.md)

## 1. Contexto del Contenedor

El **Agent Runtime Engine** orquesta ejecuciones gobernadas de agentes de IA. Recibe tareas desde Tracker, MCP, CLI o clientes HTTP, resuelve skills, aplica límites de aprobación y política, invoca capacidades a través de puertos abstraídos y publica eventos de traza/memoria.

Utiliza la **Arquitectura Hexagonal (Puertos y Adaptadores)**.

## 2. Diagrama de Componentes

```mermaid
C4Component
    title Diagrama de Componentes del Agent Runtime Engine

    Container_Boundary(runtime, "Contenedor Agent Runtime") {
        
        Component(api, "Runtime Command/Event API", "NestJS @Controller", "Expone requests de comando y streams opcionales de eventos mediante /v1/agent/handle, /v1/agent/stream y /v1/agent/skills.")
        
        Component(orchestrator, "AgentOrchestratorService", "Servicio de Aplicación", "El coordinador central. Usa resolvedores y puertos para ejecutar flujos de agente de múltiples pasos.")
        
        Component(resolver, "Resolvedor de Skills y Tools", "Servicio de Dominio", "Resuelve skills default o registradas y mapea intents hacia capacidades gobernadas.")
        
        Component(boundary, "Límite de Política / Aprobación", "Servicio de Dominio", "Aplica aprobación HITL y validación de políticas OPA antes de completar efectos gobernados.")
        
        Component(enginePort, "IAgentEnginePort", "Interfaz (Puerto)", "Contrato para el motor LLM subyacente (ej. Hermes).")
        Component(harnessPort, "IHarnessPort", "Interfaz (Puerto)", "Contrato para ejecutar comandos de shell/sandbox.")
        Component(corePort, "ICoreEvaluationPort", "Interfaz (Puerto)", "Contrato para evaluar gates de manera determinística.")
        Component(memoryPort, "IMemoryPort", "Interfaz (Puerto)", "Contrato para memoria runtime y estado durable de conversación.")
        Component(tracePort, "ITrackerTracePort", "Interfaz (Puerto)", "Contrato para publicar eventos de traza hacia Tracker.")
        
        Component(hermesAdapter, "Adaptador Hermes Engine", "Adaptador de Infraestructura", "Implementa IAgentEnginePort usando la librería local Hermes.")
        Component(harnessAdapter, "Adaptador Harness Exec", "Adaptador de Infraestructura", "Implementa IHarnessPort invocando scripts .harness.")

        Rel(api, orchestrator, "Inicia ejecución vía")
        Rel(orchestrator, resolver, "Encuentra habilidades vía")
        Rel(orchestrator, boundary, "Valida acciones vía")
        
        Rel(orchestrator, enginePort, "Dirige la ejecución vía")
        Rel(orchestrator, harnessPort, "Ejecuta scripts vía")
        Rel(orchestrator, corePort, "Evalúa gates vía")
        
        Rel(hermesAdapter, enginePort, "Implementa")
        Rel(harnessAdapter, harnessPort, "Implementa")
    }
```

## 3. Desglose de Componentes Clave

| Componente | Responsabilidad |
|------------|-----------------|
| **Runtime Command/Event API** | Recibe un `AgentRuntimeRequest` mediante comandos HTTP explícitos. `POST /v1/agent/handle` retorna un envelope de resultado; `POST /v1/agent/stream` inicia el comando y mantiene abierto un stream de eventos para progreso/resultados de tool/violaciones/finalización. `GET /v1/agent/skills` expone descubrimiento. |
| **AgentOrchestratorService** | Coordina el ciclo completo del agente. Recupera la tarea, pregunta al motor LLM por la siguiente acción, ejecuta la acción si está permitida, y repite hasta completar. |
| **Resolvedor de Skills y Tools** | Resuelve capacidades default o registradas como validación de gates, chequeo de artefactos, auditorías OPA, validación ADR, recomendaciones de desbloqueo y publicación de trazas. |
| **Puertos (IAgentEnginePort, etc)** | Definen contratos estrictos para planificación LLM, ejecución harness, evaluación Core, validación de políticas, publicación de trazas Tracker, memoria, aprobación y scheduling. |
| **Adaptadores** | Los adaptadores de producción incluyen evaluación Core HTTP, validación OPA CLI, ejecución harness por proceso, publicación HTTP a Tracker y memoria en archivo. Los stubs seguros siguen disponibles para bootstrap local y tests. |

---
[Volver al Nivel 3: Hub de Componentes](./README.es.md)
