# Evolith SDK: Technical Design

This document details the internal components and execution flows of the Evolith SDK and CLI.

## Component Architecture (C4 Model)

The SDK relies on a NestJS dependency injection architecture where CLI commands serve only as the presentation layer, relying on isolated Core modules for business logic.

```mermaid
flowchart TD
    subgraph cli ["CLI / SDK"]
        commands["Commands Layer (Nest-Commander)<br/>Handles CLI inputs, interactive prompts, and routing."]
        mcp["MCP Server (@modelcontextprotocol)<br/>Exposes core logic as JSON-RPC over stdio."]
        
        subgraph core ["Core Services"]
            adrSvc["AdrService (TypeScript)<br/>Creates and validates ADRs."]
            searchSvc["SearchEngine (TypeScript/IoC)<br/>Executes queries against the corpus."]
            docSvc["DocsService (TypeScript)<br/>Validates bilingual structural parity."]
            fsSvc["FileManager (TypeScript)<br/>Idempotent file system interactions."]
        end
    end

    commands --> adrSvc
    commands --> searchSvc
    mcp --> adrSvc
    mcp --> searchSvc
```

## Search Engine Inversion of Control (IoC) Flow

```mermaid
sequenceDiagram
    participant User
    participant ArchitectureCommand
    participant SearchEngineProvider
    participant LocalSearchProvider
    participant FileSystem

    User->>ArchitectureCommand: evolith-cli architecture ask "What is the auth pattern?"
    ArchitectureCommand->>SearchEngineProvider: search("What is the auth pattern?")
    Note over SearchEngineProvider,LocalSearchProvider: Resolved via NestJS DI
    SearchEngineProvider->>LocalSearchProvider: executeQuery()
    LocalSearchProvider->>FileSystem: Read indexed .json or .md files
    FileSystem-->>LocalSearchProvider: Corpus text matches
    LocalSearchProvider-->>SearchEngineProvider: SearchResult[]
    SearchEngineProvider-->>ArchitectureCommand: Format & Confidence Score
    ArchitectureCommand-->>User: Console Output & Recommendations
```

## MCP Initialization Flow

```mermaid
sequenceDiagram
    participant Agent
    participant McpServeCommand
    participant WatcherService
    participant McpServerService

    Agent->>McpServeCommand: spawn("evolith-mcp")
    McpServeCommand->>WatcherService: startWatching()
    McpServeCommand->>McpServerService: OnModuleInit (Auto-start)
    McpServerService->>Agent: Send JSON-RPC Handshake (stdio)
    Agent-->>McpServerService: ToolsList Request
    McpServerService-->>Agent: Returns [create_adr, ask_architecture, validate_docs]
```
