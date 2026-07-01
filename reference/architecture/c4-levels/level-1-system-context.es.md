# C4 Nivel 1: System Context

> **Navegación Bilingüe:** [Ver Versión en Inglés](./level-1-system-context.md)

**Estado:** Aprobado  
**Nivel:** 1 - System Context  
**Padre:** [C4 Master Architecture](../C4-MASTER-ARCHITECTURE.es.md)

## 1. Visión General del Sistema

Evolith está diseñado para actuar como el motor de gobernanza autoritativo de todo el SDLC. En el nivel más alto, interactúa con Humanos, Agentes de IA y plataformas SaaS externas.

El sistema se compone fundamentalmente de **Evolith Tracker** (el producto SaaS con estado que gestiona procesos y UI) y **Evolith Core** (el motor stateless de evaluación y orquestación de agentes IA).

## 2. Diagrama de Contexto

```mermaid
C4Context
    title Diagrama de Contexto de Sistema del Ecosistema Evolith

    Person(human, "Ingeniero / Product Owner", "Humanos que dirigen o aprueban el SDLC vía UI o CLI.")
    Person(agent, "Agente IA", "Agentes autónomos que ejecutan tareas técnicas vía MCP y SSE.")

    System_Boundary(evolithEcosystem, "Plataforma Evolith") {
        System(tracker, "Evolith Tracker", "Orquestador SaaS con estado. Gestiona tenants, ejecución de fases SDLC, aprobaciones y trazabilidad.")
        System(core, "Evolith Core", "Motor Stateless de Reglas e IA. Provee evaluación de reglas (OPA), esquemas, y capacidades de ejecución de agentes IA (Agent Runtime).")
    }

    System_Ext(github, "Source Control / CI", "GitHub, GitLab. Aloja código fuente y ejecuta pipelines.")
    System_Ext(llm, "Proveedor LLM", "Anthropic, OpenAI. Provee la inteligencia para los Agentes IA.")
    System_Ext(observability, "Observabilidad", "Tempo, Prometheus. Almacena trazas y métricas.")
    System_Ext(workSystems, "Gestión de Trabajo", "Jira, Linear. Mantiene el estado de issues y backlog.")

    Rel(human, tracker, "Gestiona y aprueba fases SDLC vía", "HTTPS/Web")
    Rel(human, core, "Valida artefactos localmente vía", "CLI")
    Rel(agent, core, "Ejecuta tareas y consume herramientas vía", "SSE / MCP")
    
    Rel(tracker, core, "Solicita ejecución de agentes y evaluación de reglas vía", "REST / HTTP")
    Rel(core, tracker, "Envía evidencia de ejecución y logs de auditoría a", "REST / HTTP")

    Rel(core, llm, "Orquesta prompts y llamadas a herramientas con", "API")
    Rel(core, github, "Lee configuración y repositorios desde", "Git / API")
    Rel(tracker, workSystems, "Sincroniza brechas y problemas con", "API")
    Rel(core, observability, "Empuja trazas y telemetría a", "OTLP")
```

## 3. Interacciones Clave

1. **Tracker hacia Core:** Tracker es un cliente del Core. Solicita al Core validar evidencia contra los rulesets OPA, o pide al Agent Runtime del Core ejecutar una tarea compleja.
2. **Agentes hacia Core:** Los agentes se conectan al Core mediante streams MCP o SSE para recibir contexto gobernado y herramientas. *No* se conectan directamente a Tracker.
3. **Core hacia Externos:** Core se conecta a LLMs para inteligencia, y a Git para recuperar los rulesets corporativos (el corpus de referencia).

## 4. Acercamiento (Zoom In)

A continuación, miramos dentro del sistema **Evolith Core** para ver sus principales contenedores.
**[Ir al Nivel 2: Contenedores](./level-2-containers.es.md)**

---
[Volver a la Arquitectura Maestra](../C4-MASTER-ARCHITECTURE.es.md)
