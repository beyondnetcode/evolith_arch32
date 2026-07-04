# Evolith SDK: Domain Model

This document outlines the Domain-Driven Design (DDD) Bounded Contexts and entities that compose the Evolith SDK and its CLI interface.

## Bounded Contexts

The architecture is built around several interconnected domains that ensure the separation of concerns between raw file manipulation, standard governance, and continuous integration.

```mermaid
mindmap
  root((Evolith SDK))
    Satellite Management
      Initialization
      Upstream Sync
      Configuration
    Governance
      Architecture Decision Records
      Corporate Standards
      Blueprints
    Documentation
      Bilingual Parity
      Mermaid Rendering
      Orphan Detection
    Intelligence
      Search Engine IoC
      RAG Queries
    Integrations
      MCP Server
      Agent Tools
```

## Core Entities

```mermaid
classDiagram
    class EvolithCorpus {
        +String upstreamUri
        +List~Standard~ standards
        +List~ADR~ adrs
        +validateSatellite()
    }
    
    class SatelliteRepository {
        +String name
        +EvolithConfig config
        +List~LocalADR~ decisions
        +init()
        +syncDocs()
    }
    
    class LocalADR {
        +String id
        +String title
        +String status
        +String extendsUpstreamId
        +validate()
    }
    
    class SearchEngineProvider {
        <<Interface>>
        +search(query) SearchResult
    }
    
    class LocalSearchProvider {
        +search(query) SearchResult
    }
    
    class McpServerService {
        +startStdioServer()
        +registerTools()
    }
    
    SatelliteRepository --> EvolithCorpus : "Inherits Standards"
    SatelliteRepository *-- LocalADR : "Contains"
    LocalSearchProvider ..|> SearchEngineProvider : "Implements"
```

## Domain Logic

1. **Satellite Management**: Handles the `.evolith` configurations and YAML parsing, ensuring the local repository adheres to the basic structure without overwriting critical application logic.
2. **Governance**: Parses and validates Markdown documents specifically looking for the exact frontmatter and `extends` syntax needed to link local decisions to corporate architecture patterns.
3. **Intelligence**: Exposes search tools via Inversion of Control to ensure that agents and users can retrieve specific architectural guidance offline.
