# Evolith SDK: Diseño Técnico

Este documento detalla los componentes internos y flujos de ejecución del Evolith SDK y su CLI.

## Arquitectura de Componentes (Modelo C4)

El SDK depende de la arquitectura de inyección de dependencias de NestJS donde los comandos CLI sirven solo como la capa de presentación, delegando la lógica de negocio en módulos Core aislados.

```mermaid
flowchart TD
    subgraph cli ["CLI / SDK"]
        commands["Capa de Comandos (Nest-Commander)<br/>Maneja inputs del CLI, menús y ruteo."]
        mcp["Servidor MCP (@modelcontextprotocol)<br/>Expone lógica core como JSON-RPC por stdio."]
        
        subgraph core ["Servicios Core"]
            adrSvc["AdrService (TypeScript)<br/>Crea y valida ADRs."]
            searchSvc["SearchEngine (TypeScript/IoC)<br/>Ejecuta consultas contra el corpus."]
            docSvc["DocsService (TypeScript)<br/>Valida paridad estructural bilingüe."]
            fsSvc["FileManager (TypeScript)<br/>Interacciones idempotentes con archivos."]
        end
    end

    commands --> adrSvc
    commands --> searchSvc
    mcp --> adrSvc
    mcp --> searchSvc
```

## Flujo de Inversión de Control (IoC) del Motor de Búsqueda

```mermaid
sequenceDiagram
    participant Usuario
    participant ArchitectureCommand
    participant SearchEngineProvider
    participant LocalSearchProvider
    participant FileSystem

    Usuario->>ArchitectureCommand: evolith-cli architecture ask "¿Cuál es el patrón de auth?"
    ArchitectureCommand->>SearchEngineProvider: search("¿Cuál es el patrón de auth?")
    Note over SearchEngineProvider,LocalSearchProvider: Resuelto vía DI de NestJS
    SearchEngineProvider->>LocalSearchProvider: executeQuery()
    LocalSearchProvider->>FileSystem: Leer archivos indexados .json o .md
    FileSystem-->>LocalSearchProvider: Coincidencias de texto del corpus
    LocalSearchProvider-->>SearchEngineProvider: SearchResult[]
    SearchEngineProvider-->>ArchitectureCommand: Formato y Nivel de Confianza
    ArchitectureCommand-->>Usuario: Salida de consola y recomendaciones
```

## Flujo de Inicialización MCP

```mermaid
sequenceDiagram
    participant Agente
    participant McpServeCommand
    participant WatcherService
    participant McpServerService

    Agente->>McpServeCommand: spawn("evolith-mcp")
    McpServeCommand->>WatcherService: startWatching()
    McpServeCommand->>McpServerService: OnModuleInit (Auto-arranque)
    McpServerService->>Agente: Enviar Handshake JSON-RPC (stdio)
    Agente-->>McpServerService: Petición ToolsList
    McpServerService-->>Agente: Retorna [create_adr, ask_architecture, validate_docs]
```
