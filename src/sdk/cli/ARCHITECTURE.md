# Evolith CLI Architecture

> **Audience:** Developers, Architects, DevOps Engineers  
> **Purpose:** Document the system architecture, components, data models, and flows for the Evolith Evolith CLI  
> **Bilingual:** [Español](./ARCHITECTURE.es.md)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Component Architecture](#2-component-architecture)
3. [Command Flow](#3-command-flow)
4. [Data Models](#4-data-models)
5. [Phase State Machine](#5-phase-state-machine)
6. [Sequence Diagrams](#6-sequence-diagrams)
7. [Infrastructure Deployment](#7-infrastructure-deployment)
8. [Technical Requirements](#8-technical-requirements)

---

## 1. System Overview

### 1-1 High-Level Architecture

```mermaid
graph TB
    subgraph CLI["Evolith CLI Interface"]
        CLI_User(["👤 User"])
        CLI_Shell["Shell Completion"]
        CLI_History["Command History"]
    end

    subgraph Commands["Command Layer"]
        CMD_Init["init"]
        CMD_Validate["validate"]
        CMD_ADR["adr"]
        CMD_Agents["agents"]
        CMD_SDLC["sdlc"]
        CMD_MCP["mcp serve"]
        CMD_Standards["standards"]
        CMD_Docs["docs"]
    end

    subgraph Application["Application Layer"]
        UC_Validate["ValidateSatelliteUseCase"]
        UC_Handoff["HandoffToolUseCase"]
        UC_AgentMgmt["AgentManagementUseCase"]
    end

    subgraph Domain["Domain Layer"]
        DOM_ADR["ADRService"]
        DOM_Standards["StandardsService"]
        DOM_ToolSel["ToolSelectionService"]
        DOM_SDLC["SDLCService"]
    end

    subgraph Infrastructure["Infrastructure Layer"]
        INF_Catalog["CatalogLoader"]
        INF_Config["ConfigService"]
        INF_FileMgr["FileManagerService"]
        INF_CLI["CommandExecutor"]
    end

    subgraph External["External Systems"]
        EXT_NPM["NPM Registry"]
        EXT_GitHub["GitHub API"]
        EXT_MCP["MCP Clients\n(Cursor, Claude)"]
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

## 2. Component Architecture

### 2-1 Clean Architecture Layers

```mermaid
graph TB
    subgraph Presentation["Presentation Layer<br/>(src/commands/)"]
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

    subgraph UseCases["Application Layer<br/>(src/application/)"]
        U1["ValidateSatelliteUseCase"]
        U2["HandoffToolUseCase"]
        U3["AgentManagementUseCase"]
    end

    subgraph Services["Domain Layer<br/>(src/domain/services/)"]
        S1["ADRService"]
        S2["StandardsService"]
        S3["ToolSelectionService"]
        S4["PhaseService"]
    end

    subgraph Entities["Domain Layer<br/>(src/domain/entities/)"]
        E1["Phase"]
        E2["Project"]
        E3["Tool"]
        E4["TransitionResult"]
        E5["GateResult"]
    end

    subgraph Infra["Infrastructure Layer<br/>(src/infrastructure/)"]
        I1["CatalogLoader"]
        I2["CommandExecutor"]
        I3["OutputFormatter"]
    end

    subgraph Core["Core Layer<br/>(src/core/)"]
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

### 2-2 MCP Server Architecture

```mermaid
graph TB
    subgraph MCP["MCP Server"]
        MCP_API["MCP SDK\nServer"]
        MCP_Res["Resources\n/evolith/core/info\n/evolith/adrs\n/evolith/standards"]
        MCP_Tools["Tools\nvalidate\nadr-create\nagent-install\nsdlc-handoff"]
        MCP_Prompts["Prompts\nvalidate-repository\nagent-onboarding"]
        MCP_Metrics["Metrics Service"]
    end

    subgraph Transport["Transport Layer"]
        T_STDIO["stdio (default)"]
        T_HTTP["HTTP (optional)"]
    end

    subgraph Clients["MCP Clients"]
        C_Cursor["Cursor AI"]
        C_Claude["Claude Desktop"]
        C_Agents["AI Agents"]
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

## 3. Command Flow

### 3-1 Command Resolution Flow

```mermaid
sequenceDiagram
    participant User
    participant CLI as Evolith CLI
    participant Parser as Command Parser
    participant Registry as Command Registry
    participant UseCase as Use Case
    participant Domain as Domain Services
    participant Infra as Infrastructure

    User->>CLI: evolith-cli validate --satellite /repo
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

    Note over User,Infra: Full validation flow with gate checks
```

### 3-2 Init Command Flow

```mermaid
flowchart TB
    A["evolith-cli init"] --> B{"Interactive\nor Batch?"}
    B -->|"Interactive"| C["Prompt for:\n- Project name\n- Runtime (NodeJS/.NET/Android)\n- Architecture pattern\n- Monorepo option\n- Agents to install"]
    B -->|"Batch"| D["Read from\nconfig file"]
    C --> E["Create evolith.yaml"]
    D --> E
    E --> F["Create directory structure"]
    F --> G["Install agents"]
    G --> H{"Git init?"}
    H -->|"Yes"| I["Setup git + husky"]
    H -->|"No"| J["Setup complete"]
    I --> J
    J --> K["Generate setup-report.md"]

    style A fill:#1e3a5f,stroke:#3b82f6,color:#fff
    style K fill:#065f46,stroke:#10b981,color:#fff
```

---

## 4. Data Models

### 4-1 Entity Relationship Diagram

```mermaid
erDiagram
    PROJECT ||--o| PHASE : currentPhase
    PROJECT {
        string id PK
        string name
        string phase
        date createdAt
        ProjectConfigData config
    }

    PHASE ||--o{ GATE_CHECK : contains
    PHASE {
        string value PK
        string label
        string description
        int order
        string[] artifacts
    }

    GATE_CHECK ||--o| GATE_RESULT : produces
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

    PROJECT ||--o{ TOOL : uses
    TOOL {
        string id PK
        string name
        string category
        string phase
        boolean isRuntimeAware
        string[] commands
    }

    TRANSITION_RESULT ||--|| PROJECT : transitions
    TRANSITION_RESULT {
        boolean success
        string fromPhase
        string toPhase
        GateResult[] gateResults
        string[] executedTools
        string[] warnings
        string[] errors
    }

    ADR ||--o| PROJECT : belongsTo
    ADR {
        string id PK
        string title
        string status
        string author
        date createdAt
        date updatedAt
    }

    AGENT ||--o{ PROJECT : installedOn
    AGENT {
        string id PK
        string name
        string version
        string template
        date installedAt
    }
```

### 4-2 Project Configuration Schema

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

### 4-3 Tool Catalog Schema

```mermaid
erDiagram
    TOOL_CATALOG ||--|{ TOOL : contains
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

    TOOL ||--o{ RUNTIME_COMPATIBILITY : supports
    RUNTIME_COMPATIBILITY {
        string toolId
        string runtimeId
        string minVersion
    }
```

---

## 5. Phase State Machine

### 5-1 SDLC Phase Transitions

```mermaid
stateDiagram-v2
    [*] --> Phase0: init

    Phase0 --> Phase1: evolith-cli sdlc handoff --to phase-1
    Phase1 --> Phase2: evolith-cli sdlc handoff --to phase-2
    Phase2 --> Phase3: evolith-cli sdlc handoff --to phase-3
    Phase3 --> Phase4: evolith-cli sdlc handoff --to phase-4
    Phase4 --> Phase5: evolith-cli sdlc handoff --to phase-5
    Phase5 --> [*]: evolith-cli sdlc handoff --to production

    note right of Phase0
        Discovery & Business Case
        Tools: context-mapper, ballpark
    end note

    note right of Phase1
        Architecture & Design
        Tools: ddd-model, architecture-ask
    end note

    note right of Phase2
        Implementation Scaffolding
        Tools: scaffold, generate-domain
    end note

    note right of Phase3
        Core Development
        Tools: validate, test-runner
    end note

    note right of Phase4
        Quality Gates
        Tools: security-scan, coverage-check
    end note

    note right of Phase5
        Observability Setup
        Tools: otel-config, tracing-setup
    end note
```

### 5-2 Gate Check Flow

```mermaid
flowchart TB
    A["Phase Transition Request"] --> B["Load Gate Checks"]
    B --> C{"All Required\nGates Pass?"}
    C -->|"Yes"| D["Execute Tools"]
    C -->|"No"| E["Show Failures"]
    D --> F["Update Phase"]
    E --> G["Block Transition"]
    F --> H["Generate Handoff Report"]
    G --> I["Exit with Error"]

    style A fill:#1e3a5f,stroke:#3b82f6,color:#fff
    style F fill:#065f46,stroke:#10b981,color:#fff
    style G fill:#9f1239,stroke:#f43f5e,color:#fff
```

---

## 6. Sequence Diagrams

### 6-1 MCP Tool Invocation: validate

```mermaid
sequenceDiagram
    participant Client as Cursor/Claude
    participant MCP as MCP Server
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

### 6-2 Agent Installation Flow

```mermaid
sequenceDiagram
    participant User
    participant CLI as Evolith CLI
    participant UseCase as AgentManagementUseCase
    participant Domain as AgentRegistryService
    participant Infra as FileManager

    User->>CLI: evolith-cli agents install --name @architect
    CLI->>UseCase: execute({name: '@architect'})
    UseCase->>Domain: resolveAgent('@architect')
    Domain-->>UseCase: agentTemplate
    UseCase->>Infra: createAgentStructure(agentTemplate)
    Infra->>Infra: createDirectories()
    Infra->>Infra: writeRuleset()
    Infra->>Infra: updateevolith.yaml()
    Infra-->>UseCase: installationResult
    UseCase-->>CLI: success message
    CLI-->>User: @architect installed successfully
```

---

## 7. Infrastructure Deployment

### 7-1 Deployment Architecture

```mermaid
graph TB
    subgraph Development["Development Environment"]
        DEV_User["Developer"]
        DEV_CLI["evolith-cli local"]
    end

    subgraph Installation["Installation Methods"]
        NPM["npm install -g\n@beyondnet/evolith-cli"]
        NPX["npx @beyondnet/evolith-cli"]
        Binary["Download from\nGitHub Releases"]
        Docker["Docker Image\nevolith/smart-cli"]
    end

    subgraph Runtime["Runtime Context"]
        RT_Config["~/.evolith/config.yaml"]
        RT_Cache["~/.cache/evolith-core"]
        RT_History["Command History\n~/.evolith/history"]
    end

    subgraph Satellite["Satellite Repository"]
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

### 7-2 File System Layout

```mermaid
graph TB
    subgraph Root["Satellite Repository Root"]
        ROOT["/satellite-repo/"]
        ROOT_YAML["evolith.yaml"]
        ROOT_GIT[".git/"]
        ROOT_HUSKY[".husky/"]
    end

    subgraph EvolithDir[".evolith/ Directory"]
        E_RULESETS[".evolith/rulesets/"]
        E_AGENTS[".evolith/agents/"]
        E_CACHE[".evolith/cache/"]
        E_STATE[".evolith/state.json"]
    end

    subgraph Templates["CLI Templates"]
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

## 8. Technical Requirements

### 8-1 Runtime Requirements

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | >= 18.0.0 | LTS recommended |
| npm | >= 9.0.0 | For global install |
| Git | >= 2.30 | For git operations |
| Memory | 512MB min | For MCP server |
| Disk | 200MB min | For CLI + cache |

### 8-2 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @nestjs/common | ^11.1.24 | DI & modularity |
| @nestjs/core | ^11.1.24 | NestJS runtime |
| nest-commander | ^3.20.1 | CLI framework |
| @clack/prompts | ^1.5.1 | Interactive UI |
| @modelcontextprotocol/sdk | ^1.29.0 | MCP protocol |
| chalk | ^4.1.2 | Colored output |
| yaml | ^2.9.0 | Config parsing |
| chokidar | ^5.0.0 | File watching |
| fs-extra | ^11.3.5 | File operations |
| ora | ^9.4.0 | Spinners |

### 8-3 Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `EVOLITH_CONFIG_PATH` | `~/.evolith` | Config directory |
| `EVOLITH_LOG_LEVEL` | `info` | Logging level |
| `EVOLITH_CORE_PATH` | `../evolith` | Core reference |
| `EVOLITH_PROFILE` | `default` | Config profile |
| `EVOLITH_NO_CACHE` | `false` | Skip cache |
| `EVOLITH_FORCE_COLOR` | `auto` | Force colors |

---

## Appendix: Configuration Schema

```yaml
# evolith.yaml - Satellite Configuration
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

## Document Version

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-06-06 | Evolith Team | Initial architecture documentation |

---

## See Also

- [MCP Integration Guide](./docs/MCP-INTEGRATION.md)
- [Command Reference](./docs/planning/cli-command-catalog.md)
- [ADR-0069: MCP Server Protocol Implementation](../../../reference/core/architecture/adrs/core/0069-ai-agent-context-protocol-integration.md)