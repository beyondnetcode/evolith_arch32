# Arquitectura del Smart CLI

> **Audiencia:** Desarrolladores, Arquitectos, Ingenieros DevOps  
> **Propósito:** Documentar la arquitectura del sistema, componentes, modelos de datos y flujos del Evolith Smart CLI  
> **Bilingual:** [English](./ARCHITECTURE.md)

---

## Tabla de Contenidos

1. [Visión General del Sistema](#1-visión-general-del-sistema)
2. [Arquitectura de Componentes](#2-arquitectura-de-componentes)
3. [Flujo de Comandos](#3-flujo-de-comandos)
4. [Modelos de Datos](#4-modelos-de-datos)
5. [Máquina de Estados de Fase](#5-máquina-de-estados-de-fase)
6. [Diagramas de Secuencia](#6-diagramas-de-secuencia)
7. [Despliegue de Infraestructura](#7-despliegue-de-infraestructura)
8. [Requisitos Técnicos](#8-requisitos-técnicos)

---

## 1. Visión General del Sistema

### 1-1 Arquitectura de Alto Nivel

```mermaid
graph TB
    subgraph CLI["Interfaz Smart CLI"]
        CLI_User(["👤 Usuario"])
        CLI_Shell["Shell Completion"]
        CLI_History["Historial de Comandos"]
    end

    subgraph Commands["Capa de Comandos"]
        CMD_Init["init"]
        CMD_Validate["validate"]
        CMD_ADR["adr"]
        CMD_Agents["agents"]
        CMD_SDLC["sdlc"]
        CMD_MCP["mcp serve"]
        CMD_Standards["standards"]
        CMD_Docs["docs"]
    end

    subgraph Application["Capa de Aplicación"]
        UC_Validate["ValidateSatelliteUseCase"]
        UC_Handoff["HandoffToolUseCase"]
        UC_AgentMgmt["AgentManagementUseCase"]
    end

    subgraph Domain["Capa de Dominio"]
        DOM_ADR["ADRService"]
        DOM_Standards["StandardsService"]
        DOM_ToolSel["ToolSelectionService"]
        DOM_SDLC["SDLCService"]
    end

    subgraph Infrastructure["Capa de Infraestructura"]
        INF_Catalog["CatalogLoader"]
        INF_Config["ConfigService"]
        INF_FileMgr["FileManagerService"]
        INF_CLI["CommandExecutor"]
    end

    subgraph External["Sistemas Externos"]
        EXT_NPM["Registro NPM"]
        EXT_GitHub["API de GitHub"]
        EXT_MCP["Clientes MCP\n(Cursor, Claude)"]
    end

    CLI_User --> Commands
    Commands --> Application
    Application --> Domain
    Domain --> Infrastructure
    Infrastructure --> External

    style CLI fill:#1e3a5f,stroke:#3b82f6,color:#fff
    style Commands fill:#065f46,stroke:#10b981,color:#fff
    style Application fill:#4a1d96,stroke:#a855f7,color:#fff
    style Domain fill:#9f1239,stroke:#f43f5e,color:#fff
    style Infrastructure fill:#c2410c,stroke:#f97316,color:#fff
    style External fill:#1e3a5f,stroke:#64748b,color:#fff
```

---

## 2. Arquitectura de Componentes

### 2-1 Capas de Clean Architecture

```mermaid
graph TB
    subgraph Presentation["Capa de Presentación<br/>(src/commands/)"]
        P1["init.command.ts"]
        P2["validate.command.ts"]
        P3["adr.command.ts"]
        P4["sdlc.command.ts"]
        P5["mcp-serve.command.ts"]
        P6["agents.command.ts"]
        P7["standards.command.ts"]
        P8["history.command.ts"]
        P9["completion.command.ts"]
    end

    subgraph UseCases["Capa de Aplicación<br/>(src/application/)"]
        U1["ValidateSatelliteUseCase"]
        U2["HandoffToolUseCase"]
        U3["AgentManagementUseCase"]
    end

    subgraph Services["Capa de Dominio<br/>(src/domain/services/)"]
        S1["ADRService"]
        S2["StandardsService"]
        S3["ToolSelectionService"]
        S4["PhaseService"]
    end

    subgraph Entities["Capa de Dominio<br/>(src/domain/entities/)"]
        E1["Phase"]
        E2["Project"]
        E3["Tool"]
        E4["TransitionResult"]
        E5["GateResult"]
    end

    subgraph Infra["Capa de Infraestructura<br/>(src/infrastructure/)"]
        I1["CatalogLoader"]
        I2["CommandExecutor"]
        I3["OutputFormatter"]
    end

    subgraph Core["Capa Core<br/>(src/core/)"]
        C1["ConfigService"]
        C2["MCPServerService"]
        C3["WatcherService"]
        C4["StructuredLogger"]
    end

    Presentation --> UseCases
    UseCases --> Services
    Services --> Entities
    Services --> Infra
    Infra --> Core

    classDef presentation fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef useCases fill:#065f46,stroke:#10b981,color:#fff
    classDef domain fill:#4a1d96,stroke:#a855f7,color:#fff
    classDef infra fill:#9f1239,stroke:#f43f5e,color:#fff
    classDef core fill:#c2410c,stroke:#f97316,color:#fff

    class P1,P2,P3,P4,P5,P6,P7,P8,P9 presentation
    class U1,U2,U3 useCases
    class S1,S2,S3,S4 domain
    class E1,E2,E3,E4,E5 domain
    class I1,I2,I3 infra
    class C1,C2,C3,C4 core
```

### 2-2 Arquitectura del Servidor MCP

```mermaid
graph TB
    subgraph MCP["Servidor MCP"]
        MCP_API["MCP SDK\nServer"]
        MCP_Res["Recursos\n/evolith/core/info\n/evolith/adrs\n/evolith/standards"]
        MCP_Tools["Herramientas\nvalidate\nadr-create\nagent-install\nsdlc-handoff"]
        MCP_Prompts["Prompts\nvalidate-repository\nagent-onboarding"]
        MCP_Metrics["Servicio de Métricas"]
    end

    subgraph Transport["Capa de Transporte"]
        T_STDIO["stdio (por defecto)"]
        T_HTTP["HTTP (opcional)"]
    end

    subgraph Clients["Clientes MCP"]
        C_Cursor["Cursor AI"]
        C_Claude["Claude Desktop"]
        C_Agents["Agentes IA"]
    end

    Clients --> Transport
    Transport --> MCP
    MCP_API --> MCP_Res
    MCP_API --> MCP_Tools
    MCP_API --> MCP_Prompts
    MCP_API --> MCP_Metrics

    classDef mcp fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef transport fill:#065f46,stroke:#10b981,color:#fff
    classDef clients fill:#4a1d96,stroke:#a855f7,color:#fff

    class MCP_API,MCP_Res,MCP_Tools,MCP_Prompts,MCP_Metrics mcp
    class T_STDIO,T_HTTP transport
    class C_Cursor,C_Claude,C_Agents clients
```

---

## 3. Flujo de Comandos

### 3-1 Flujo de Resolución de Comandos

```mermaid
sequenceDiagram
    participant User
    participant CLI as Smart CLI
    participant Parser as Parser de Comandos
    participant Registry as Registro de Comandos
    participant UseCase as Caso de Uso
    participant Domain as Servicios de Dominio
    participant Infra as Infraestructura

    User->>CLI: smart-cli validate --satellite /repo
    CLI->>Parser: parse(args)
    Parser->>Registry: resolve('validate')
    Registry-->>Parser: ValidateCommand
    Parser->>UseCase: execute(options)
    UseCase->>Domain: validateSatellite(config)
    Domain->>Infra: loadCatalog()
    Infra-->>Domain: rulesetCatalog
    Domain->>Domain: checkGates()
    Domain-->>UseCase: validationResult
    UseCase-->>CLI: formattedOutput
    CLI-->>User: table/json/markdown

    Note over User,Infra: Flujo completo de validación con verificaciones de gates
```

### 3-2 Flujo del Comando Init

```mermaid
flowchart TB
    A["smart-cli init"] --> B{"Interactivo\no Batch?"}
    B -->|"Interactivo"| C["Solicitar:\n- Nombre del proyecto\n- Runtime (NodeJS/.NET/Android)\n- Patrón de arquitectura\n- Opción de monorepo\n- Agentes a instalar"]
    B -->|"Batch"| D["Leer desde\narchivo de config"]
    C --> E["Crear evolith.yaml"]
    D --> E
    E --> F["Crear estructura de directorios"]
    F --> G["Instalar agentes"]
    G --> H{"Git init?"}
    H -->|"Sí"| I["Setup git + husky"]
    H -->|"No"| J["Setup completo"]
    I --> J
    J --> K["Generar setup-report.md"]

    style A fill:#1e3a5f,stroke:#3b82f6,color:#fff
    style K fill:#065f46,stroke:#10b981,color:#fff
```

---

## 4. Modelos de Datos

### 4-1 Diagrama de Entidad-Relación

```mermaid
erDiagram
    PROJECT ||--o| PHASE : faseActual
    PROJECT {
        string id PK
        string name
        string phase
        date createdAt
        ProjectConfigData config
    }

    PHASE ||--o{ GATE_CHECK : contiene
    PHASE {
        string value PK
        string label
        string description
        int order
        string[] artifacts
    }

    GATE_CHECK ||--o| GATE_RESULT : produce
    GATE_CHECK {
        string id
        string description
        boolean required
        string phaseFK
    }

    GATE_RESULT {
        string id
        boolean passed
        string description
        boolean required
        string error
    }

    PROJECT ||--o{ TOOL : usa
    TOOL {
        string id PK
        string name
        string category
        string phase
        boolean isRuntimeAware
        string[] commands
    }

    TRANSITION_RESULT ||--|| PROJECT : transiciona
    TRANSITION_RESULT {
        boolean success
        string fromPhase
        string toPhase
        GateResult[] gateResults
        string[] executedTools
        string[] warnings
        string[] errors
    }

    ADR ||--o| PROJECT : perteneceA
    ADR {
        string id PK
        string title
        string status
        string author
        date createdAt
        date updatedAt
    }

    AGENT ||--o{ PROJECT : instaladoEn
    AGENT {
        string id PK
        string name
        string version
        string template
        date installedAt
    }
```

### 4-2 Esquema de Configuración del Proyecto

```mermaid
classDiagram
    class ProjectConfigData {
        +string name
        +string runtimeId
        +string monorepoId
        +string architectureId
        +string database
        +string apiProtocol
        +string ciCd
        +string observability
        +string[] tools
        +string[] agents
    }

    class Runtime {
        +string id
        +string name
        +string version
        +string framework
    }

    class MonorepoOption {
        +string id
        +string name
        +string description
    }

    class ArchitecturePattern {
        +string id
        +string name
        +string description
        +string[] layers
    }

    ProjectConfigData --> Runtime
    ProjectConfigData --> MonorepoOption
    ProjectConfigData --> ArchitecturePattern
```

### 4-3 Esquema del Catálogo de Herramientas

```mermaid
erDiagram
    TOOL_CATALOG ||--|{ TOOL : contiene
    TOOL_CATALOG {
        string version
        string lastUpdated
        Tool[] tools
    }

    TOOL {
        string id
        string name
        string category
        string phase
        boolean isRuntimeAware
        string[] commands
        string platformCheck
        string[] dependencies
    }

    TOOL ||--o{ RUNTIME_COMPATIBILITY : soporta
    RUNTIME_COMPATIBILITY {
        string toolId
        string runtimeId
        string minVersion
    }
```

---

## 5. Máquina de Estados de Fase

### 5-1 Transiciones de Fase SDLC

```mermaid
stateDiagram-v2
    [*] --> Phase0: init

    Phase0 --> Phase1: smart-cli sdlc handoff --to phase-1
    Phase1 --> Phase2: smart-cli sdlc handoff --to phase-2
    Phase2 --> Phase3: smart-cli sdlc handoff --to phase-3
    Phase3 --> Phase4: smart-cli sdlc handoff --to phase-4
    Phase4 --> Phase5: smart-cli sdlc handoff --to phase-5
    Phase5 --> [*]: smart-cli sdlc handoff --to production

    note right of Phase0
        Descubrimiento y Caso de Negocio
        Herramientas: context-mapper, ballpark
    end note

    note right of Phase1
        Arquitectura y Diseño
        Herramientas: ddd-model, architecture-ask
    end note

    note right of Phase2
        Andamiaje de Implementación
        Herramientas: scaffold, generate-domain
    end note

    note right of Phase3
        Desarrollo del Core
        Herramientas: validate, test-runner
    end note

    note right of Phase4
        Puertas de Calidad
        Herramientas: security-scan, coverage-check
    end note

    note right of Phase5
        Configuración de Observabilidad
        Herramientas: otel-config, tracing-setup
    end note
```

### 5-2 Flujo de Verificación de Gates

```mermaid
flowchart TB
    A["Solicitud de Transición de Fase"] --> B["Cargar Verificaciones de Gate"]
    B --> C{"¿Todos los Gates\nRequeridos Pasan?"}
    C -->|"Sí"| D["Ejecutar Herramientas"]
    C -->|"No"| E["Mostrar Fallos"]
    D --> F["Actualizar Fase"]
    E --> G["Bloquear Transición"]
    F --> H["Generar Reporte de Handoff"]
    G --> I["Salir con Error"]

    style A fill:#1e3a5f,stroke:#3b82f6,color:#fff
    style F fill:#065f46,stroke:#10b981,color:#fff
    style G fill:#9f1239,stroke:#f43f5e,color:#fff
```

---

## 6. Diagramas de Secuencia

### 6-1 Invocación de Herramienta MCP: validate

```mermaid
sequenceDiagram
    participant Client as Cursor/Claude
    participant MCP as Servidor MCP
    participant Tool as ValidateTool
    participant Domain as ValidationService
    participant Infra as FileManager

    Client->>MCP: callTool('evolith-validate', {path, format})
    MCP->>Tool: execute({path, format})
    Tool->>Domain: validateSatellite(path)
    Domain->>Infra: readFile(evolith.yaml)
    Infra-->>Domain: configContent
    Domain->>Domain: checkCoreRef()
    Domain->>Domain: validateRulesets()
    Domain-->>Tool: ValidationResult
    Tool-->>MCP: {success, rulesChecked, gatesPassed}
    MCP-->>Client: formatted result
```

### 6-2 Flujo de Instalación de Agente

```mermaid
sequenceDiagram
    participant User
    participant CLI as Smart CLI
    participant UseCase as AgentManagementUseCase
    participant Domain as AgentRegistryService
    participant Infra as FileManager

    User->>CLI: smart-cli agents install --name @architect
    CLI->>UseCase: execute({name: '@architect'})
    UseCase->>Domain: resolveAgent('@architect')
    Domain-->>UseCase: agentTemplate
    UseCase->>Infra: createAgentStructure(agentTemplate)
    Infra->>Infra: createDirectories()
    Infra->>Infra: writeRuleset()
    Infra->>Infra: updateevolith.yaml()
    Infra-->>UseCase: installationResult
    UseCase-->>CLI: success message
    CLI-->>User: @architect instalado exitosamente
```

---

## 7. Despliegue de Infraestructura

### 7-1 Arquitectura de Despliegue

```mermaid
graph TB
    subgraph Development["Entorno de Desarrollo"]
        DEV_User["Desarrollador"]
        DEV_CLI["smart-cli local"]
    end

    subgraph Installation["Métodos de Instalación"]
        NPM["npm install -g\n@evolith/smart-cli"]
        NPX["npx @evolith/smart-cli"]
        Binary["Descargar desde\nGitHub Releases"]
        Docker["Imagen Docker\nevolith/smart-cli"]
    end

    subgraph Runtime["Contexto de Ejecución"]
        RT_Config["~/.evolith/config.yaml"]
        RT_Cache["~/.cache/evolith-core"]
        RT_History["Historial de Comandos\n~/.evolith/history"]
    end

    subgraph Satellite["Repositorio Satélite"]
        SAT_Config["evolith.yaml"]
        SAT_Rulesets[".evolith/rulesets"]
        SAT_Hooks[".husky/pre-commit"]
    end

    DEV_User --> Installation
    NPM --> RT_Config
    NPX --> RT_Config
    Binary --> RT_Config
    Docker --> RT_Config

    DEV_CLI --> SAT_Config
    RT_Config --> SAT_Config
    RT_Cache --> SAT_Rulesets
    RT_History --> SAT_Hooks

    classDef dev fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef install fill:#065f46,stroke:#10b981,color:#fff
    classDef runtime fill:#4a1d96,stroke:#a855f7,color:#fff
    classDef sat fill:#9f1239,stroke:#f43f5e,color:#fff

    class DEV_User,DEV_CLI dev
    class NPM,NPX,Binary,Docker install
    class RT_Config,RT_Cache,RT_History runtime
    class SAT_Config,SAT_Rulesets,SAT_Hooks sat
```

### 7-2 Estructura del Sistema de Archivos

```mermaid
graph TB
    subgraph Root["Raíz del Repositorio Satélite"]
        ROOT["/satellite-repo/"]
        ROOT_YAML["evolith.yaml"]
        ROOT_GIT[".git/"]
        ROOT_HUSKY[".husky/"]
    end

    subgraph EvolithDir[".evolith/ Directorio"]
        E_RULESETS[".evolith/rulesets/"]
        E_AGENTS[".evolith/agents/"]
        E_CACHE[".evolith/cache/"]
        E_STATE[".evolith/state.json"]
    end

    subgraph Templates["Plantillas del CLI"]
        TMPL_Evolith["evolith.yaml.example"]
        TMPL_Agents["agent-templates/"]
    end

    ROOT_YAML --> E_RULESETS
    E_RULESETS --> E_AGENTS
    ROOT_HUSKY --> E_STATE

    style Root fill:#1e3a5f,stroke:#3b82f6,color:#fff
    style EvolithDir fill:#065f46,stroke:#10b981,color:#fff
    style Templates fill:#4a1d96,stroke:#a855f7,color:#fff
```

---

## 8. Requisitos Técnicos

### 8-1 Requisitos de Runtime

| Requisito | Versión | Notas |
|-----------|---------|-------|
| Node.js | >= 18.0.0 | LTS recomendado |
| npm | >= 9.0.0 | Para instalación global |
| Git | >= 2.30 | Para operaciones git |
| Memoria | 512MB min | Para servidor MCP |
| Disco | 200MB min | Para CLI + cache |

### 8-2 Dependencias

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| @nestjs/common | ^11.1.24 | DI y modularidad |
| @nestjs/core | ^11.1.24 | Runtime de NestJS |
| nest-commander | ^3.20.1 | Framework CLI |
| @clack/prompts | ^1.5.1 | UI interactiva |
| @modelcontextprotocol/sdk | ^1.29.0 | Protocolo MCP |
| chalk | ^4.1.2 | Salida con colores |
| yaml | ^2.9.0 | Parseo de config |
| chokidar | ^5.0.0 | Watcher de archivos |
| fs-extra | ^11.3.5 | Operaciones de archivos |
| ora | ^9.4.0 | Spinners |

### 8-3 Variables de Entorno

| Variable | Por Defecto | Propósito |
|----------|-------------|-----------|
| `EVOLITH_CONFIG_PATH` | `~/.evolith` | Directorio de config |
| `EVOLITH_LOG_LEVEL` | `info` | Nivel de logging |
| `EVOLITH_CORE_PATH` | `../evolith` | Referencia al core |
| `EVOLITH_PROFILE` | `default` | Perfil de config |
| `EVOLITH_NO_CACHE` | `false` | Skip cache |
| `EVOLITH_FORCE_COLOR` | `auto` | Forzar colores |

---

## Apéndice: Esquema de Configuración

```yaml
# evolith.yaml - Configuración del Satélite
apiVersion: evolith.dev/v1
kind: Satellite

coreRef:
  version: "1.0.0"
  path: "../evolith"

governance:
  version: "1.0"
  adrRegistry:
    - id: "ADR-0001"
      status: "accepted"

product:
  name: "my-project"
  type: "library"
  runtime: "typescript"

sdlc:
  currentPhase: "phase-1"
  phaseHistory:
    - phase: "phase-0"
      enteredAt: "2026-01-15T10:00:00Z"
      exitedAt: "2026-01-20T14:30:00Z"

agents:
  installed:
    - name: "@architect"
      version: "1.0.0"
      installedAt: "2026-01-15T10:05:00Z"
```

---

## Versión del Documento

| Versión | Fecha | Autor | Cambios |
|---------|------|-------|---------|
| 1.0.0 | 2026-06-06 | Equipo Evolith | Documentación inicial de arquitectura |

---

## Ver También

- [Guía de Integración MCP](./docs/MCP-INTEGRATION.md)
- [Catálogo de Comandos](./docs/planning/cli-command-catalog.md)
- [ADR-0069: Implementación del Protocolo Servidor MCP](../../../reference/core/architecture/adrs/core/0069-ai-agent-context-protocol-integration.es.md)