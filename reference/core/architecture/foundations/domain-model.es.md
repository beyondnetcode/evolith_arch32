# Evolith SDK: Modelo de Dominio

Este documento describe los Contextos Delimitados (Bounded Contexts) del Diseño Guiado por el Dominio (DDD) y las entidades que componen el Evolith SDK y su interfaz CLI.

## Contextos Delimitados

La arquitectura está construida en torno a varios dominios interconectados que aseguran la separación de responsabilidades entre la manipulación cruda de archivos, el gobierno de estándares y la integración continua.

```mermaid
mindmap
  root((Evolith SDK))
    Gestión de Satélites
      Inicialización
      Sincronización Upstream
      Configuración
    Gobierno
      Registros de Decisiones (ADRs)
      Estándares Corporativos
      Blueprints
    Documentación
      Paridad Bilingüe
      Renderizado Mermaid
      Detección de Huérfanos
    Inteligencia
      Motor de Búsqueda IoC
      Consultas RAG
    Integraciones
      Servidor MCP
      Herramientas de Agentes
```

## Entidades Principales

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
    
    SatelliteRepository --> EvolithCorpus : "Hereda Estándares"
    SatelliteRepository *-- LocalADR : "Contiene"
    LocalSearchProvider ..|> SearchEngineProvider : "Implementa"
```

## Lógica de Dominio

1. **Gestión de Satélites**: Maneja las configuraciones `.evolith` y el análisis YAML, asegurando que el repositorio local cumpla con la estructura básica sin sobrescribir la lógica de aplicación crítica.
2. **Gobierno**: Analiza y valida documentos Markdown buscando específicamente los metadatos y la sintaxis `extends` necesaria para vincular decisiones locales con patrones de arquitectura corporativa.
3. **Inteligencia**: Expone herramientas de búsqueda mediante Inversión de Control para asegurar que los agentes y usuarios puedan recuperar orientación arquitectónica específica de forma offline.
