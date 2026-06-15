# Zona Producto: Arquitectura Evolith Core

## 1. Visión Arquitectónica

Evolith Core es una arquitectura de referencia AI-native diseñada para comenzar simple, madurar hacia un monolito modular y evolucionar a servicios distribuidos solo cuando el producto y la escala lo justifiquen. Sirve tanto como la línea base arquitectónica corporativa como un producto ejecutable fundacional.

### Visión Conceptual de la Plataforma

El siguiente diagrama ilustra el flujo conceptual de alto nivel sobre cómo los usuarios interactúan con la plataforma, y cómo la Inteligencia Artificial y el Model Context Protocol (MCP) amplifican las capacidades core.

```mermaid
flowchart TB
    %% Usuarios
    subgraph Users ["Usuarios y Actores"]
        DEV["👨‍💻 Desarrolladores / Ingenieros"]
        CLIENT["🌐 Aplicaciones / Clientes Externos"]
    end

    %% Interfaces
    subgraph Interfaces ["Capa de Interfaces"]
        CLI["💻 Smart CLI\n(Interfaz de Desarrollo)"]
        API["🔌 API Gateway / BFF\n(Interfaz de Aplicación)"]
    end

    %% Plataforma Core
    subgraph Platform ["Plataforma Evolith Core (AI-Native)"]
        direction LR
        AI["🤖 Capa AI\n(Agentes Autónomos)"]
        MCP["🔗 Capa MCP\n(Protocolo de Contexto)"]
        CORE["⚙️ Core Engine\n(Lógica y Gobernanza)"]

        AI <-->|Razona y Planea| MCP
        MCP <-->|Ejecuta Tools| CORE
        CORE <-->|Provee Contexto| MCP
    end

    %% Base
    subgraph Foundation ["Base de Conocimiento y Ejecución"]
        KNOW["📚 Corpus de Conocimiento\n(Reglas, ADRs, Docs)"]
        EXEC["⚡ Entorno de Ejecución\n(Infraestructura, Contenedores)"]
    end

    %% Relaciones
    DEV -->|Prompts y Comandos| CLI
    CLIENT -->|REST / GraphQL| API

    CLI -->|Conecta a| AI
    CLI -->|Conecta a| CORE
    API -->|Conecta a| CORE

    CORE -->|Lee/Escribe| KNOW
    CORE -->|Despliega en| EXEC
```

## 2. Modelos de Arquitectura C4

Los siguientes diagramas siguen el framework [C4 Model](https://c4model.com/) para descomponer el ecosistema Evolith Core desde el contexto del sistema hasta sus componentes internos.

### Nivel 1: Diagrama de Contexto del Sistema

Proporciona una vista macroscópica de Evolith Core, sus usuarios y sus dependencias externas.

```mermaid
C4Context
    title Diagrama de Contexto para Evolith Core

    Person(developer, "Desarrollador", "Ingeniero de software construyendo o interactuando con la arquitectura corporativa.")
    Person(endUser, "Usuario Final / Cliente", "Aplicaciones externas o usuarios consumiendo servicios de negocio.")
    
    System(evolithCore, "Evolith Core", "Plataforma arquitectónica AI-native que provee lógica de negocio, gobernanza y orquestación de agentes.")
    
    System_Ext(github, "GitHub / VCS", "Sistema de control de versiones que aloja el corpus de referencia y rulesets.")
    System_Ext(llm, "Proveedor LLM", "API de modelo de lenguaje externo (ej. Anthropic, OpenAI) que da vida a los Agentes AI.")
    System_Ext(cloud, "Infraestructura Cloud", "Clúster Kubernetes, bases de datos y message brokers.")

    Rel(developer, evolithCore, "Usa para desarrollo, scaffolding y validación")
    Rel(endUser, evolithCore, "Consume capacidades de negocio vía API")
    
    Rel(evolithCore, github, "Obtiene reglas de gobernanza y sincroniza docs")
    Rel(evolithCore, llm, "Envía prompts y recibe flujos de razonamiento")
    Rel(evolithCore, cloud, "Despliega cargas de trabajo y almacena estado")
    
    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

### Nivel 2: Diagrama de Contenedores

Descompone el sistema "Evolith Core" en sus contenedores principales de ejecución.

```mermaid
C4Container
    title Diagrama de Contenedores para Evolith Core

    Person(developer, "Desarrollador", "Ingeniero usando el Smart CLI.")
    Person(clientApp, "Aplicación Cliente", "App Web o Mobile consumiendo datos.")

    System_Boundary(evolith, "Sistema Evolith Core") {
        Container(cli, "Smart CLI", "Node.js / TS", "Aplicación de terminal interactiva que orquesta flujos y agentes AI locales.")
        Container(mcp, "Servidor MCP", "Node.js / SSE", "Servidor Model Context Protocol que expone herramientas a los modelos AI.")
        Container(gateway, "API Gateway", "Traefik", "Ingress controller que enruta tráfico y maneja la terminación TLS.")
        Container(bff, "Capa BFF", "NestJS", "Backend-For-Frontend que agrega servicios de dominio para perfiles específicos.")
        
        Container(domain, "Servicios de Dominio", ".NET / Node.js", "Capacidades core de negocio (Identidad, Auditoría, Compliance).")
        Container(opa, "Motor OPA", "Go / Rego", "Sidecar que evalúa políticas arquitectónicas y autorización.")
        
        ContainerDb(redis, "Clúster de Caché", "Redis", "Sistema de caché de 4 niveles.")
        ContainerDb(minio, "Almacenamiento de Objetos", "MinIO (S3)", "Almacena OPA bundles y activos binarios.")
    }

    Rel(developer, cli, "Ejecuta comandos")
    Rel(clientApp, gateway, "Peticiones HTTPS")
    
    Rel(gateway, bff, "Enruta llamadas API")
    Rel(gateway, mcp, "Enruta conexiones SSE")
    
    Rel(cli, mcp, "Descubre herramientas vía MCP")
    Rel(bff, domain, "Llamadas gRPC / HTTP")
    Rel(mcp, domain, "Ejecuta operaciones")
    
    Rel(domain, opa, "Evalúa políticas")
    Rel(opa, minio, "Sondea bundle.tar.gz")
    Rel(domain, redis, "Lee/Escribe caché")
```

### Nivel 3: Diagrama de Componentes

Vista interna de la **Capa BFF / Core Engine** para demostrar la alineación con Clean Architecture y DDD.

```mermaid
C4Component
    title Diagrama de Componentes para Evolith Core Engine (BFF)

    Container(gateway, "API Gateway", "Traefik", "Enruta tráfico hacia el BFF.")

    Container_Boundary(bff, "Aplicación BFF (NestJS)") {
        Component(controllers, "Capa de Presentación", "Controladores NestJS", "Maneja peticiones HTTP, validación y serialización.")
        Component(appServices, "Servicios de Aplicación", "Casos de Uso", "Orquesta la lógica de dominio y llamadas externas. Alineado con Inversión de Dependencias.")
        Component(domainEntities, "Modelo de Dominio", "Clases TypeScript", "Reglas y entidades de negocio puras. Sin dependencias externas (Clean Architecture).")
        Component(infrastructure, "Adaptadores de Infraestructura", "Repositorios / HTTP Clients", "Implementa interfaces para acceder a DB, caché o servicios gRPC externos.")
        Component(mcpTools, "Registro de Herramientas MCP", "Funciones", "Expone casos de uso específicos como herramientas para Agentes AI.")
    }

    Container(backendServices, "Servicios de Dominio Backend", ".NET / Node.js", "Microservicios aguas abajo.")

    Rel(gateway, controllers, "Enruta peticiones HTTP")
    Rel(controllers, appServices, "Invoca casos de uso")
    Rel(mcpTools, appServices, "Invoca casos de uso para IA")
    Rel(appServices, domainEntities, "Aplica reglas de negocio")
    Rel(appServices, infrastructure, "Delega acceso a datos vía interfaces")
    Rel(infrastructure, backendServices, "Realiza llamadas de red")
```

## 3. Flujos de Interacción

Diagramas de secuencia ilustrando escenarios operativos clave dentro de la plataforma.

### Caso 1: Desarrollador usando Smart CLI

Demuestra el flujo AI-native donde un desarrollador pide al CLI realizar una tarea, la cual es delegada a un LLM que usa herramientas MCP.

```mermaid
sequenceDiagram
    actor Dev as Desarrollador
    participant CLI as Smart CLI
    participant LLM as Proveedor de IA
    participant MCP as Servidor MCP
    participant Core as Servicios Core

    Dev->>CLI: "Analiza el gap tracking y actualiza el board"
    CLI->>LLM: Envía Prompt + Herramientas MCP disponibles
    LLM-->>CLI: Acción: Ejecutar Tool 'read_gaps'
    CLI->>MCP: Ejecuta 'read_gaps'
    MCP->>Core: Obtiene datos de gaps
    Core-->>MCP: Datos JSON
    MCP-->>CLI: Resultado de la Tool
    CLI->>LLM: Envía resultado
    LLM-->>CLI: Acción: Ejecutar Tool 'update_board'
    CLI->>MCP: Ejecuta 'update_board'
    MCP->>Core: Muta el proyecto en GitHub
    Core-->>MCP: Éxito
    MCP-->>CLI: Resultado de la Tool
    CLI->>LLM: Envía resultado
    LLM-->>CLI: Respuesta final en texto
    CLI-->>Dev: "Tablero actualizado exitosamente."
```

### Caso 2: Cliente consumiendo el BFF

Demuestra el flujo estándar de una petición de aplicación a través de la infraestructura.

```mermaid
sequenceDiagram
    actor Client as App Cliente
    participant Traefik as API Gateway
    participant BFF as Capa BFF
    participant OPA as Motor OPA
    participant Domain as Servicios de Dominio
    participant DB as Persistencia

    Client->>Traefik: GET /bff/users/profile
    Traefik->>BFF: Reenvía petición
    BFF->>OPA: Revisa política de autorización
    OPA-->>BFF: Permitido
    BFF->>Domain: Obtiene Perfil (gRPC/HTTP)
    Domain->>DB: Consulta Base de Datos
    DB-->>Domain: Conjunto de resultados
    Domain-->>BFF: DTO de Dominio
    BFF-->>Traefik: Respuesta JSON agregada
    Traefik-->>Client: 200 OK
```

## 4. Catálogo de Componentes

| Componente | Propósito y Responsabilidad | Dependencias Clave | Entrada / Salida | Evolución Futura |
| :--- | :--- | :--- | :--- | :--- |
| **Smart CLI** | Interfaz de desarrollador para gestionar la arquitectura, generar código y ejecutar flujos asistidos por IA. | Node.js, APIs LLM, Sistema de Archivos | **In:** Comandos/prompts.<br>**Out:** Cambios en código, salida en consola. | Transición a un daemon/agente autónomo en segundo plano. |
| **Servidor MCP** | Expone capacidades del repositorio y la arquitectura como herramientas estandarizadas para cualquier cliente MCP. | Transporte SSE, Evolith SDK | **In:** Peticiones de ejecución de tools.<br>**Out:** Resultados (JSON). | Expandir el set de herramientas para incluir aprovisionamiento dinámico cloud. |
| **Capa BFF** | Agrega y adapta datos del backend para perfiles específicos de frontend (Web, Mobile, B2B). | Traefik, Servicios de Dominio, OPA | **In:** Peticiones HTTP del cliente.<br>**Out:** Payloads JSON a medida. | Adopción de GraphQL Federation para consultas dinámicas complejas. |
| **Servicios de Dominio** | Las capacidades core de negocio (Identidad, Auditoría) implementadas como módulos independientes. | Persistencia, Event Bus | **In:** Peticiones BFF o MCP.<br>**Out:** Respuestas / Eventos de dominio. | Escalamiento de Monolito Modular a Microservicios distribuidos según la carga. |
| **Motor OPA** | Punto centralizado de decisión para gobernanza arquitectónica y autorización. | MinIO (Distribución de Bundles S3) | **In:** Solicitudes de evaluación de contexto.<br>**Out:** Decisiones de permitir/denegar. | Integración con ejecución basada en WASM más cerca del edge. |

## 5. Roadmap Arquitectónico

Evolith Core está diseñado para mejora progresiva. La arquitectura actual representa la **Fase 2 (Arquitectura Modular con Herramientas IA)**.

- **Fase 1:** Estructura Monolítica Simple (Completado).
- **Fase 2:** Monolito Modular + BFF + Integración MCP (Actual).
- **Fase 3:** Orquestación Autónoma Multi-Agente (Planeado). Los Agentes AI monitorearán autónomamente el entorno y propondrán correcciones de desviación arquitectónica.
- **Fase 4:** Microservicios Orientados a Eventos (Planeado según necesidad). División de servicios de dominio de alta carga en contenedores independientes vía RabbitMQ/Dapr.
