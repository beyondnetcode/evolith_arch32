# C4 Nivel 3: Componentes del Agent Runtime

> **Navegación Bilingüe:** [Ver Versión en Inglés](./agent-runtime-components.md)

**Estado:** Aprobado  
**Nivel:** 3 - Componentes  
**Padre:** [C4 Nivel 3: Hub de Componentes](./README.es.md)

## 1. Contexto del Contenedor

El **Agent Runtime Engine** orquesta ejecuciones gobernadas de agentes de IA. Recibe tareas desde el Tracker o vía streams SSE, resuelve las habilidades, hace cumplir los límites mediante políticas OPA, e invoca capacidades a través de puertos abstraídos (de modo que no está acoplado directamente a `.harness` o a Hermes).

Utiliza la **Arquitectura Hexagonal (Ports and Adapters)**.

## 2. Diagrama de Componentes

```mermaid
C4Component
    title Diagrama de Componentes del Agent Runtime Engine

    Container_Boundary(runtime, "Contenedor Agent Runtime") {
        
        Component(api, "SSE Runtime API", "NestJS @Controller", "Expone /v1/agent/stream para streaming de ejecución en tiempo real (Server-Sent Events).")
        
        Component(orchestrator, "AgentOrchestratorService", "Servicio de Aplicación", "El coordinador central. Usa resolvedores y puertos para ejecutar flujos de agente de múltiples pasos.")
        
        Component(resolver, "Resolvedor de Skills y Tools", "Servicio de Dominio", "Resuelve las habilidades y herramientas requeridas para el contexto de una iniciativa dada.")
        
        Component(boundary, "Boundary Enforcer (OPA)", "Servicio de Dominio", "Consulta políticas OPA antes de ejecutar cualquier herramienta o efecto secundario.")
        
        Component(enginePort, "IAgentEnginePort", "Interfaz (Puerto)", "Contrato para el motor LLM subyacente (ej. Hermes).")
        Component(harnessPort, "IHarnessPort", "Interfaz (Puerto)", "Contrato para ejecutar comandos de shell/sandbox.")
        Component(corePort, "ICoreEvaluationPort", "Interfaz (Puerto)", "Contrato para evaluar gates de manera determinística.")
        
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
| **SSE Runtime API** | Recibe un `AgentRuntimeRequest` y mantiene una conexión HTTP persistente, haciendo streaming del estado y los logs de ejecución de herramientas hacia el cliente. |
| **AgentOrchestratorService** | Coordina el ciclo completo del agente. Recupera la tarea, pregunta al motor LLM por la siguiente acción, ejecuta la acción si está permitida, y repite hasta completar. |
| **Resolvedor de Skills y Tools** | Inspecciona el `workspaceRef` y el contexto del tenant para determinar qué herramientas y prompts específicos tiene permitido usar el agente. |
| **Puertos (IAgentEnginePort, etc)** | Definen contratos estrictos. El orquestador depende *solo* de los puertos, asegurando que el motor subyacente o el ejecutor de scripts puedan ser intercambiados. |
| **Adaptador Hermes Engine** | Conecta el motor de ejecución interno Hermes en el runtime. |

---
[Volver al Nivel 3: Hub de Componentes](./README.es.md)
