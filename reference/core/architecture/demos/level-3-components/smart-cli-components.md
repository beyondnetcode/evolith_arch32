# C4 Level 3: Smart CLI Components

> **Bilingual Navigation:** [Versión en Español](./smart-cli-components.es.md)

**Status:** Approved  
**Level:** 3 - Components  
**Parent:** [C4 Level 3: Components Hub](./README.md)

## 1. Container Context

The **Smart CLI** is the local interactive interface for engineers working with Evolith and satellite repositories. It uses Nest Commander commands, shared `@evolith/core-domain` use cases, local filesystem providers, and `@evolith/sdk` clients to support both local/offline governance and remote Core/Agent Runtime calls.

## 2. Component Diagram

```mermaid
C4Component
    title Component Diagram for Smart CLI

    Container_Boundary(cli, "Smart CLI Container") {
        
        Component(commands, "CLI Commands", "Nest Commander", "Parses commands such as validate, evaluate, gate, phase, sdlc, agents, satellites, init, upgrade, docs, drift and api.")
        
        Component(prompts, "Interactive Prompts", "@clack/prompts", "Provides interactive menus, wizards, output formatting and progress feedback.")
        
        Component(localEval, "Local Evaluation Pipeline", "@evolith/core-domain", "Runs ValidateSatelliteUseCase, EvaluationOrchestrator and default kind evaluators locally.")
        Component(sdk, "SDK Client (@evolith/sdk)", "Node.js Library", "Typed client for Core API, Agent Runtime and satellite endpoints.")
        Component(config, "Profiles / Plugins / Config", "CLI Infrastructure", "Manages profiles, aliases, plugins, telemetry, command history and local config.")
        
        Component(localLoader, "Local File Loader", "Strategy Pattern", "SDK Strategy: Reads rulesets directly from the disk (used for local CI or offline dev).")
        
        Component(restClient, "REST Client", "Strategy Pattern", "SDK Strategy: Makes HTTP calls to the Core API.")

        Rel(commands, prompts, "Triggers")
        Rel(commands, localEval, "Executes local governance via")
        Rel(commands, sdk, "Calls remote APIs via")
        Rel(commands, config, "Reads settings from")
        
        Rel(sdk, restClient, "Uses when remote configured")
        Rel(localEval, localLoader, "Reads corpus/rulesets via")
    }
```

## 3. Key Components Breakdown

| Component | Responsibility |
|-----------|----------------|
| **CLI Commands** | Entry points implemented as Nest Commander providers in `sdk/cli/src/commands/**`. |
| **Interactive Prompts** | Wizard-style flows, menus, progress output, and formatted command feedback for developer workflows. |
| **Local Evaluation Pipeline** | Runs `ValidateSatelliteUseCase`, `EvaluationOrchestrator`, native/OPA evaluators, topology checks, and phase gate validation locally. |
| **SDK Client** | Typed HTTP client for remote Core API, Agent Runtime, and satellite registry workflows. |
| **Profiles / Plugins / Config** | Local shell around aliases, profiles, plugin loading, telemetry, command history, and environment-specific defaults. |

---
[Back to Level 3: Components Hub](./README.md)
