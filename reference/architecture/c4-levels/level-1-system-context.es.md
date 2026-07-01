# C4 Nivel 1: System Context

> **Navegación Bilingüe:** [Ver Versión en Inglés](./level-1-system-context.md)

**Estado:** Aprobado  
**Nivel:** 1 - System Context  
**Padre:** [C4 Master Architecture](../C4-MASTER-ARCHITECTURE.es.md)

## 1. Visión General del Sistema

Evolith está diseñado para actuar como el motor de gobernanza autoritativo del corpus de referencia SDLC y de sus superficies ejecutables de gobernanza. En el nivel más alto, interactúa con humanos, agentes de IA, CI/CD y plataformas SaaS externas.

El sistema se compone fundamentalmente de **Evolith Tracker** (el producto SaaS externo con estado que posee tenants, estado de producto, aprobaciones y UI) y **Evolith Core** (la implementación en este repositorio: Core API, MCP Server, Agent Runtime, Smart CLI, rulesets, esquemas y paquetes).

Evolith Core es stateless para decisiones canónicas de producto: puede recibir identificadores tenant/product/initiative como contexto opaco de evaluación, pero no autoriza usuarios finales, no persiste ownership de tenants ni emite decisiones de gate vinculantes. El Core API actual incluye una pequeña superficie in-memory de registro de satélites para flujos de referencia y compatibilidad; no es la autoridad de estado tenant o producto de largo plazo.

## 2. Diagrama de Contexto

```mermaid
C4Context
    title Diagrama de Contexto de Sistema del Ecosistema Evolith

    Person(human, "Ingeniero / Product Owner", "Humanos que dirigen o aprueban el SDLC vía UI o CLI.")
    Person(agent, "Agente IA", "Agentes autónomos que ejecutan tareas técnicas vía MCP y SSE.")

    System_Boundary(evolithEcosystem, "Plataforma Evolith") {
        System(tracker, "Evolith Tracker", "Orquestador SaaS con estado. Gestiona tenants, ejecución de fases SDLC, aprobaciones y trazabilidad.")
        System(core, "Evolith Core", "Runtime ejecutable de gobernanza. Provee evaluación stateless, rulesets, esquemas, tools MCP, flujos CLI y capacidades de Agent Runtime.")
    }

    System_Ext(github, "Source Control / CI", "GitHub, GitLab. Aloja código fuente y ejecuta pipelines.")
    System_Ext(llm, "Proveedor LLM", "Anthropic, OpenAI. Provee la inteligencia para los Agentes IA.")
    System_Ext(observability, "Observabilidad", "Tempo, Prometheus. Almacena trazas y métricas.")
    System_Ext(workSystems, "Gestión de Trabajo", "Jira, Linear. Mantiene el estado de issues y backlog.")

    Rel(human, tracker, "Gestiona y aprueba fases SDLC vía", "HTTPS/Web")
    Rel(human, core, "Valida artefactos localmente vía", "CLI")
    Rel(agent, core, "Ejecuta tareas y consume herramientas vía", "SSE / MCP")
    
    Rel(tracker, core, "Solicita evaluación stateless y ejecución de agentes vía", "REST / HTTP")
    Rel(core, tracker, "Retorna resultados de evaluación y publica eventos de traza a", "REST / HTTP")

    Rel(core, llm, "Orquesta prompts y llamadas a herramientas con", "API")
    Rel(core, github, "Lee configuración y repositorios desde", "Git / API")
    Rel(tracker, workSystems, "Sincroniza brechas y problemas con", "API")
    Rel(core, observability, "Empuja trazas y telemetría a", "OTLP")
```

## 3. Interacciones Clave

1. **Tracker hacia Core:** Tracker es un cliente del Core. Solicita al Core evaluar payloads canónicos `EvaluationContext`, o pide al Agent Runtime ejecutar una tarea gobernada.
2. **Agentes hacia Core:** Los agentes se conectan al Core mediante streams MCP o SSE para recibir contexto gobernado y herramientas. *No* se conectan directamente a Tracker.
3. **Core hacia Externos:** Core se conecta a LLMs para inteligencia, y a Git para recuperar los rulesets corporativos (el corpus de referencia).
4. **Límite de estado del Core:** Core puede ecoar contexto opaco y mantener memoria/caché local de runtime, pero Tracker sigue siendo el owner canónico del estado tenant/product/initiative y de las decisiones vinculantes de gate.

## 4. Acercamiento (Zoom In)

A continuación, miramos dentro del sistema **Evolith Core** para ver sus principales contenedores.
**[Ir al Nivel 2: Contenedores](./level-2-containers.es.md)**

---
[Volver a la Arquitectura Maestra](../C4-MASTER-ARCHITECTURE.es.md)
