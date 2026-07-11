# C4 Nivel 3: Componentes de Evolith CLI

> **Navegación Bilingüe:** [Ver Versión en Inglés](./smart-cli-components.md)

**Estado:** Aprobado  
**Nivel:** 3 - Componentes  
**Padre:** [C4 Nivel 3: Hub de Componentes](./README.es.md)

## 1. Contexto del Contenedor

La **Evolith CLI** es la interfaz interactiva local para ingenieros que trabajan con Evolith y repositorios satélite. Usa comandos Nest Commander, casos de uso compartidos de `@beyondnet/evolith-core-domain`, providers locales de filesystem y clientes `@beyondnet/evolith-sdk` para soportar gobernanza local/offline y llamadas remotas a Core/Agent Runtime.

## 2. Diagrama de Componentes

```mermaid
C4Component
    title Diagrama de Componentes para Evolith CLI

    Container_Boundary(cli, "Contenedor Evolith CLI") {
        
        Component(commands, "Comandos CLI", "Nest Commander", "Parsea comandos como validate, evaluate, gate, phase, sdlc, agents, satellites, init, upgrade, docs, drift y api.")
        
        Component(prompts, "Prompts Interactivos", "@clack/prompts", "Provee menús interactivos, wizards, formateo de salida y feedback de progreso.")
        
        Component(localEval, "Pipeline de Evaluación Local", "@beyondnet/evolith-core-domain", "Ejecuta ValidateSatelliteUseCase, EvaluationOrchestrator y evaluadores kind default localmente.")
        Component(sdk, "SDK Client (@beyondnet/evolith-sdk)", "Node.js Library", "Cliente tipado para Core API, Agent Runtime y endpoints de satélites.")
        Component(config, "Perfiles / Plugins / Config", "Infraestructura CLI", "Gestiona perfiles, aliases, plugins, telemetría, historial de comandos y config local.")
        
        Component(localLoader, "Local File Loader", "Patrón Strategy", "SDK Strategy: Lee rulesets directamente desde el disco (usado para CI local o dev offline).")
        
        Component(restClient, "REST Client", "Patrón Strategy", "SDK Strategy: Hace llamadas HTTP al Core API.")

        Rel(commands, prompts, "Dispara")
        Rel(commands, localEval, "Ejecuta gobernanza local vía")
        Rel(commands, sdk, "Llama APIs remotas vía")
        Rel(commands, config, "Lee configuración desde")
        
        Rel(sdk, restClient, "Usa cuando se configura remoto")
        Rel(localEval, localLoader, "Lee corpus/rulesets vía")
    }
```

## 3. Desglose de Componentes Clave

| Componente | Responsabilidad |
|------------|-----------------|
| **Comandos CLI** | Puntos de entrada implementados como providers Nest Commander en `sdk/cli/src/commands/**`. |
| **Prompts Interactivos** | Flujos tipo wizard, menús, progreso y salida formateada para workflows de desarrollador. |
| **Pipeline de Evaluación Local** | Ejecuta `ValidateSatelliteUseCase`, `EvaluationOrchestrator`, evaluadores native/OPA, chequeos de topología y validación de phase gates localmente. |
| **SDK Client** | Cliente HTTP tipado para Core API remoto, Agent Runtime y flujos de registro de satélites. |
| **Perfiles / Plugins / Config** | Shell local para aliases, perfiles, carga de plugins, telemetría, historial de comandos y defaults por ambiente. |

---
[Volver al Nivel 3: Hub de Componentes](./README.es.md)
