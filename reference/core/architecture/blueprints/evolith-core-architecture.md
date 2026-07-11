# Product Zone: Evolith Core Architecture

## 1. Architectural Vision

Evolith Core is an AI-native reference architecture designed to start simple, mature into a modular monolith, and evolve into distributed services only when justified by product and scale. It serves as both the corporate architectural baseline and a foundational executable product.

### Conceptual Platform Vision

The following diagram illustrates the high-level conceptual flow of how users interact with the platform, and how Artificial Intelligence and the Model Context Protocol (MCP) amplify the core capabilities.

```mermaid
flowchart TB
    %% Users
    subgraph Users ["Users & Actors"]
        DEV["👨‍💻 Developers / Engineers"]
        CLIENT["🌐 External Clients / Apps"]
    end

    %% Interfaces
    subgraph Interfaces ["Interface Layer"]
        CLI["💻 Evolith CLI\n(Developer Interface)"]
        API["🔌 API Gateway / BFF\n(Application Interface)"]
    end

    %% Platform Core
    subgraph Platform ["Evolith Core Platform (AI-Native)"]
        direction LR
        AI["🤖 AI Layer\n(Autonomous Agents)"]
        MCP["🔗 MCP Layer\n(Tool Context Protocol)"]
        CORE["⚙️ Core Engine\n(Business Logic & Governance)"]

        AI <-->|Reasons & Plans| MCP
        MCP <-->|Executes Tools| CORE
        CORE <-->|Provides Context| MCP
    end

    %% Foundation
    subgraph Foundation ["Knowledge & Execution Base"]
        KNOW["📚 Knowledge Corpus\n(Rulesets, ADRs, Docs)"]
        EXEC["⚡ Execution Environment\n(Infra, Containers)"]
    end

    %% Relationships
    DEV -->|Prompts & Commands| CLI
    CLIENT -->|REST / GraphQL| API

    CLI -->|Connects to| AI
    CLI -->|Connects to| CORE
    API -->|Connects to| CORE

    CORE -->|Reads/Writes| KNOW
    CORE -->|Deploys to| EXEC
```

## 2. C4 Architecture Models

The following diagrams follow the [C4 Model](https://c4model.com/) framework to decompose the Evolith Core ecosystem from a high-level system context down to internal components.

### Level 1: System Context Diagram

Provides a macroscopic view of Evolith Core, its users, and its external dependencies.

```mermaid
C4Context
    title System Context Diagram for Evolith Core

    Person(developer, "Developer", "Software engineer building or interacting with the corporate architecture.")
    Person(endUser, "End User / Client", "External applications or users consuming business services.")
    
    System(evolithCore, "Evolith Core", "AI-native architectural platform providing business logic, governance, and AI agent orchestration.")
    
    System_Ext(github, "GitHub / VCS", "Version control system hosting the reference corpus and rulesets.")
    System_Ext(llm, "LLM Provider", "External Large Language Model API (e.g., Anthropic, OpenAI) driving the AI Agents.")
    System_Ext(cloud, "Cloud Infrastructure", "Kubernetes cluster, databases, and message brokers.")

    Rel(developer, evolithCore, "Uses for development, scaffolding, and validation")
    Rel(endUser, evolithCore, "Consumes business capabilities via API")
    
    Rel(evolithCore, github, "Pulls governance rulesets and syncs documentation")
    Rel(evolithCore, llm, "Sends prompts and receives reasoning streams")
    Rel(evolithCore, cloud, "Deploys workloads and stores state")
    
    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

### Level 2: Container Diagram

Decomposes the "Evolith Core" system into its major executing containers.

```mermaid
C4Container
    title Container Diagram for Evolith Core

    Person(developer, "Developer", "Engineer using the Evolith CLI.")
    Person(clientApp, "Client Application", "Web or Mobile app consuming data.")

    System_Boundary(evolith, "Evolith Core System") {
        Container(cli, "Evolith CLI", "Node.js / TS", "Interactive terminal application orchestrating local AI agents and workflows.")
        Container(mcp, "MCP Server", "Node.js / SSE", "Model Context Protocol server providing tool execution to AI models.")
        Container(gateway, "API Gateway", "Traefik", "Ingress controller routing traffic and handling TLS termination.")
        Container(bff, "BFF Layer", "NestJS", "Backend-For-Frontend aggregating domain services for specific client profiles.")
        
        Container(domain, "Domain Services", ".NET / Node.js", "Core business capabilities (Identity, Audit, Compliance).")
        Container(opa, "OPA Engine", "Go / Rego", "Sidecar evaluating architectural policies and authorization.")
        
        ContainerDb(redis, "Cache Cluster", "Redis", "4-Tier caching system.")
        ContainerDb(minio, "Object Storage", "MinIO (S3)", "Stores OPA bundles and binary assets.")
    }

    Rel(developer, cli, "Executes commands")
    Rel(clientApp, gateway, "HTTPS Requests")
    
    Rel(gateway, bff, "Routes API calls")
    Rel(gateway, mcp, "Routes SSE connections")
    
    Rel(cli, mcp, "Discovers tools via MCP")
    Rel(bff, domain, "gRPC / HTTP calls")
    Rel(mcp, domain, "Executes operations")
    
    Rel(domain, opa, "Evaluates policies")
    Rel(opa, minio, "Polls bundle.tar.gz")
    Rel(domain, redis, "Reads/Writes cache")
```

### Level 3: Component Diagram

Zooming inside the **BFF Layer / Core Engine** to demonstrate internal Clean Architecture and DDD alignment.

```mermaid
C4Component
    title Component Diagram for Evolith Core Engine (BFF)

    Container(gateway, "API Gateway", "Traefik", "Routes traffic to the BFF.")

    Container_Boundary(bff, "BFF Application (NestJS)") {
        Component(controllers, "Presentation Layer (Controllers)", "NestJS Controllers", "Handles HTTP requests, validation, and serialization.")
        Component(appServices, "Application Services", "Use Case Interactors", "Orchestrates domain logic and external calls. Aligned with Dependency Inversion.")
        Component(domainEntities, "Domain Model", "TypeScript Classes", "Pure business rules and entities. No external dependencies (Clean Architecture).")
        Component(infrastructure, "Infrastructure Adapters", "Repositories / HTTP Clients", "Implements interfaces to access database, cache, or external gRPC services.")
        Component(mcpTools, "MCP Tool Registry", "Functions", "Exposes specific use cases as tools for AI Agents.")
    }

    Container(backendServices, "Backend Domain Services", ".NET / Node.js", "Downstream microservices.")

    Rel(gateway, controllers, "Routes HTTP requests")
    Rel(controllers, appServices, "Invokes use cases")
    Rel(mcpTools, appServices, "Invokes use cases for AI")
    Rel(appServices, domainEntities, "Applies business rules")
    Rel(appServices, infrastructure, "Delegates data access via interfaces")
    Rel(infrastructure, backendServices, "Makes network calls")
```

## 3. Interaction Flows

Sequence diagrams illustrating key operational scenarios within the platform.

### Case 1: Developer Using Evolith CLI

Demonstrates the AI-native workflow where a developer asks the CLI to perform a task, which is delegated to an LLM that uses MCP tools.

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant CLI as Evolith CLI
    participant LLM as AI Provider
    participant MCP as MCP Server
    participant Core as Core Services

    Dev->>CLI: "Analyze gap tracking and update board"
    CLI->>LLM: Send Prompt + Available MCP Tools
    LLM-->>CLI: Action: Call Tool 'read_gaps'
    CLI->>MCP: Execute 'read_gaps'
    MCP->>Core: Fetch gap data
    Core-->>MCP: Gap data JSON
    MCP-->>CLI: Tool Result
    CLI->>LLM: Send Tool Result
    LLM-->>CLI: Action: Call Tool 'update_board'
    CLI->>MCP: Execute 'update_board'
    MCP->>Core: Mutate GitHub Project
    Core-->>MCP: Success
    MCP-->>CLI: Tool Result
    CLI->>LLM: Send Tool Result
    LLM-->>CLI: Final Text Response
    CLI-->>Dev: "Board updated successfully."
```

### Case 2: Client Consuming BFF

Demonstrates a standard application request flowing through the infrastructure.

```mermaid
sequenceDiagram
    actor Client as Client App
    participant Traefik as API Gateway
    participant BFF as BFF Layer
    participant OPA as OPA Engine
    participant Domain as Domain Services
    participant DB as Persistence

    Client->>Traefik: GET /bff/users/profile
    Traefik->>BFF: Forward request
    BFF->>OPA: Check authorization policy
    OPA-->>BFF: Allow
    BFF->>Domain: Fetch User Profile (gRPC/HTTP)
    Domain->>DB: Query DB
    DB-->>Domain: Result Set
    Domain-->>BFF: Domain DTO
    BFF-->>Traefik: Aggregated JSON Response
    Traefik-->>Client: 200 OK
```

## 4. Component Catalog

| Component | Purpose & Responsibility | Key Dependencies | Input / Output | Future Evolution |
| :--- | :--- | :--- | :--- | :--- |
| **Evolith CLI** | Developer interface for managing architecture, generating code, and executing AI-assisted workflows. | Node.js, LLM APIs, Local File System | **In:** User commands/prompts.<br>**Out:** Code changes, terminal output. | Transition to a fully autonomous background agent daemon. |
| **MCP Server** | Exposes repository and architectural capabilities as standardized tools for any MCP-compliant AI client. | SSE Transport, Evolith SDK | **In:** Tool execution requests.<br>**Out:** Tool results (JSON). | Expand toolset to include dynamic cloud infrastructure provisioning. |
| **BFF Layer** | Aggregates and tailors backend data for specific frontend profiles (Web, Mobile, B2B). | Traefik, Domain Services, OPA | **In:** Client HTTP requests.<br>**Out:** Tailored JSON payloads. | GraphQL Federation adoption for highly dynamic client queries. |
| **Domain Services** | The core business capabilities (Identity, Audit, etc.) implemented as independent modules. | Persistence, Event Bus | **In:** BFF or MCP requests.<br>**Out:** Domain responses / Events. | Scale out from Modular Monolith to distributed Microservices based on load. |
| **OPA Engine** | Centralized policy decision point for dual-engine architectural governance and authorization. | MinIO (S3 Bundle Distribution) | **In:** Contextual evaluation requests.<br>**Out:** Allow/Deny decisions. | Integration with WASM-based execution closer to the application edge. |

## 5. Architectural Roadmap

Evolith Core is designed for progressive enhancement. The current architecture represents **Phase 2 (Modular Architecture with AI Tooling)**.

- **Phase 1:** Simple Monolithic Structure (Completed).
- **Phase 2:** Modular Monolith + BFF + MCP Integration (Current).
- **Phase 3:** Autonomous Multi-Agent Orchestration (Planned). AI Agents will autonomously monitor the execution environment and propose architectural drift corrections.
- **Phase 4:** Event-Driven Microservices (Planned as needed). Splitting high-load domain services into standalone containers communicating via RabbitMQ/Dapr.
