# Evolith — Diseño Objetivo de Composición Gobernada

> **Navegación Bilingüe:** [English Version](./evolith-governed-composition-target-design.md)

**Estado:** Diseño Propuesto — Requiere Revisión del Architecture Board  
**Propietario:** Evolith Architecture Board  
**Visión Padre:** [Visión Maestra del Producto Evolith](../vision/evolith-product-vision-master.es.md)  
**Creado:** 2026-06-10  
**Estado de Implementación:** Solo diseño — este documento no autoriza cambios de código

---

## 1. Propósito

Este documento define el diseño objetivo que implementa la nueva visión de Evolith antes de iniciar cambios de código fuente.

El modelo central de responsabilidades es:

> **Core define. Los proveedores ejecutan. CLI y MCP evalúan. Tracker decide y audita.**

El modelo de responsabilidades de tenant a nivel suite es:

> **UMS gobierna la identidad maestra del Tenant, y la identidad y autorización de usuarios dentro de él. Evolith Tracker gobierna la operación SDLC del Tenant.**

El diseño reemplaza la interpretación anterior en la que CLI, CI o agentes autónomos podían parecer propietarios del veredicto final de un Phase Gate.

---

## 2. Invariantes del Sistema

1. **Evolith Core es constitucional y de solo lectura en runtime.** Define rulesets, schemas, estándares, taxonomías, gates y contratos de proveedores.
2. **UMS posee el dato maestro canónico del Tenant.** El Tenant se registra en UMS y recibe la clave global usada por todos los productos de la suite ([ADR-0129](../../../reference/core/architecture/adrs/core/0129-ums-is-the-tenant-master.es.md)).
3. **UMS posee la identidad y autorización de usuarios dentro del Tenant.** Autentica usuarios, mantiene membresías, perfiles, roles y permisos, y devuelve grafos de autorización limitados por la clave global del Tenant.
4. **Evolith Tracker posee el estado canónico de gobernanza en runtime.** Controla proyecciones SDLC del tenant, procesos, fases, decisiones, aprobaciones, excepciones y auditoría.
5. **El registro de Tenant en el Tracker es una proyección, no una identidad maestra.** Debe referenciar la clave global que publica UMS y puede estar inactivo, desactualizado o rechazado de forma independiente por cada dominio consumidor.
6. **CLI, MCP, CI y agentes son evaluadores sin estado o productores de evidencia.** Nunca modifican directamente el estado canónico de una fase.
7. **Los sistemas externos conservan autoridad sobre sus hechos operativos.** SCM posee commits, CI posee ejecuciones, observabilidad posee traces y los sistemas de trabajo poseen sus work items nativos.
8. **Tracker es autoritativo para interpretar la gobernanza.** Decide si la evidencia recolectada satisface las políticas del Core y del tenant.
9. **Los agentes son ejecutores reemplazables, nunca autoridades de aprobación.**
10. **Cada proveedor queda aislado detrás de un puerto neutral y una Anti-Corruption Layer.**
11. **Un pipeline verde, una tarea completada, un documento generado o una respuesta exitosa de un agente no pueden avanzar una fase por sí solos.**
12. **Toda decisión canónica puede reproducirse a partir de reglas versionadas, evidencias, aprobaciones y excepciones.**
13. **No se inicia implementación hasta aprobar este diseño y sus documentos relacionados.**

---

## 3. Contexto del Sistema

```mermaid
flowchart TB
    classDef core fill:#1e3a5f,stroke:#3b82f6,color:#fff,font-weight:bold
    classDef tracker fill:#14532d,stroke:#22c55e,color:#fff,font-weight:bold
    classDef provider fill:#4a1d96,stroke:#a855f7,color:#fff
    classDef actor fill:#4a3800,stroke:#f59e0b,color:#fff
    classDef product fill:#374151,stroke:#9ca3af,color:#fff

    BOARD["Architecture Board"]:::actor
    HUMANS["Producto, Ingeniería, QA, Seguridad y Operaciones"]:::actor
    AGENTS["Agentes Autónomos y LLMs"]:::actor

    CORE["Evolith Core\nConstitución · Reglas · Schemas · Contratos"]:::core
    UMS["UMS\nMaestro de Tenant · Identidad · Membresía · Autorización"]:::product
    TRACKER["Evolith Tracker\nPlano de Control de Gobernanza"]:::tracker

    WORK["Sistemas de Trabajo\nJira · Azure DevOps · GitHub Issues · Alternativas"]:::provider
    SCM["SCM y CI/CD\nGitHub · GitLab · Azure DevOps"]:::provider
    OBS["Observabilidad de IA y Runtime\nLangfuse · OpenTelemetry · Alternativas"]:::provider
    BI["Analítica y Visualización\nSuperset · Grafana · Alternativas"]:::provider
    TEST["Proveedores de Testing, Seguridad y Despliegue"]:::provider

    PRODUCTS["Productos Satélite\nUMS · Evolith Tracker · Productos Futuros"]:::product

    BOARD -->|aprueba evolución constitucional| CORE
    CORE -->|reglas, schemas y contratos| TRACKER
    UMS -->|TenantSnapshot con clave global| TRACKER
    TRACKER -->|solicitud delegada de autorizacion| UMS
    UMS -->|grafo de autorización por Tenant| TRACKER
    HUMANS -->|solicitudes, aprobaciones y excepciones| TRACKER
    AGENTS -->|ejecución acotada y evidencia| TRACKER

    TRACKER <-->|trabajo y evidencia normalizados| WORK
    TRACKER <-->|commits, pipelines y despliegues| SCM
    TRACKER <-->|traces, evaluaciones, costo y latencia| OBS
    TRACKER -->|modelo semántico confiable| BI
    TRACKER <-->|evidencias de pruebas, seguridad y release| TEST
    PRODUCTS -->|actividad y evidencia del producto| TRACKER
    CORE -->|gobernanza heredada| PRODUCTS
    PRODUCTS -.->|lecciones validadas propuestas upstream| BOARD
```

---

## 4. Arquitectura de Contenedores

```mermaid
flowchart TB
    classDef service fill:#14532d,stroke:#22c55e,color:#fff
    classDef core fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef adapter fill:#4a1d96,stroke:#a855f7,color:#fff
    classDef data fill:#4a3800,stroke:#f59e0b,color:#fff

    subgraph TRACKER["Evolith Tracker"]
        UX["Experiencia Web Unificada"]:::service
        API["API de Gobernanza"]:::service
        TENANT["Servicio de Proyección de Tenant"]:::service
        ORCH["Orquestador de Procesos y Fases"]:::service
        DECISION["Motor de Decisiones de Gate"]:::service
        EVIDENCE["Servicio Evidence Graph"]:::service
        POLICY["Servicio de Resolución de Políticas"]:::service
        AGENT["Coordinador de Ejecución de Agentes"]:::service
        PROVIDERS["Registro de Proveedores y Adaptadores"]:::service
        AUDIT["Servicio de Auditoría y Excepciones"]:::service
        DB[("Almacén de Gobernanza del Tracker")]:::data
    end

    CORE["Evolith Core\nRulesets · Schemas · Taxonomía · ADRs"]:::core
    CLI["Evolith SDK / CLI / MCP\nRuntime de Evaluación sin Estado"]:::core
    UMS["UMS\nMaestro de Tenant · Identidad y Autorización"]:::adapter

    subgraph EXTERNAL["Proveedores Externos"]
        WP["Adaptador de Gestión de Trabajo"]:::adapter
        RP["Adaptador de Repositorio"]:::adapter
        CP["Adaptador CI/CD"]:::adapter
        OP["Adaptador de Observabilidad"]:::adapter
        AP["Adaptador de Analítica"]:::adapter
        TP["Adaptador de Testing / Seguridad"]:::adapter
        DP["Adaptador de Despliegue"]:::adapter
    end

    UX --> API
    API --> TENANT
    API --> ORCH
    UMS -->|TenantSnapshot| TENANT
    API -->|autenticación y autorización delegada| UMS
    UMS -->|grafo de autorización| API
    TENANT --> ORCH
    ORCH --> POLICY
    ORCH --> EVIDENCE
    ORCH --> DECISION
    DECISION --> AUDIT
    AGENT --> EVIDENCE
    PROVIDERS --> EVIDENCE

    POLICY -->|resolución read-only| CORE
    POLICY -->|solicitud de evaluación| CLI
    CLI -->|resultado técnico| POLICY

    PROVIDERS --> WP
    PROVIDERS --> RP
    PROVIDERS --> CP
    PROVIDERS --> OP
    PROVIDERS --> AP
    PROVIDERS --> TP
    PROVIDERS --> DP

    ORCH --> DB
    TENANT --> DB
    EVIDENCE --> DB
    DECISION --> DB
    AUDIT --> DB
    AGENT --> DB
```

### 4.1 Responsabilidades de Contenedores

| Contenedor | Posee | No Posee |
|---|---|---|
| **Experiencia Web Unificada** | Navegación, vistas de evidencia, acciones gobernadas, aprobaciones y deep links | La verdad operativa del proveedor |
| **API de Gobernanza** | Contrato externo estable y frontera de autorización | Reglas de negocio duplicadas desde Core |
| **Servicio de Proyección de Tenant** | Vista local activa/inactiva del Tracker sobre la identidad del Tenant en UMS y frescura de proyección | Identidad maestra del Tenant, identidad legal, membresía de usuarios o grafo de autorización |
| **Orquestador de Procesos y Fases** | Ciclo de vida y solicitudes de transición | La implementación técnica de evaluación |
| **Motor de Decisiones de Gate** | Decisión canónica, combinación de políticas, aprobaciones y excepciones | Ejecución de herramientas fuente |
| **Servicio Evidence Graph** | Identidad, linaje, relaciones, integridad y consulta de evidencia | Almacenes crudos de proveedores |
| **Servicio de Políticas** | Resolución de Core y políticas del tenant, versionado | Estado canónico del proceso |
| **Coordinador de Agentes** | Actividades acotadas, contexto, permisos, registros y evidencia | Aprobación final de gates |
| **Registro de Proveedores** | Metadata, capacidades, versiones y salud de adaptadores | Reglas específicas filtradas al dominio |
| **SDK / CLI / MCP** | Evaluación determinista y sin estado contra reglas versionadas | Estado del Tracker, aprobaciones y transiciones |

---

## 5. Dato Maestro de Tenant y Proyecciones por Contexto

El Tenant se crea una sola vez en UMS como dato maestro. Evolith Tracker consume el retrato versionado que UMS publica, así cada bounded context conserva su autonomía y comparte la misma clave global del Tenant.

```mermaid
sequenceDiagram
    autonumber
    participant U as UMS
    participant T as Evolith Tracker
    participant A as Usuario

    U->>U: Registrar identidad maestra del Tenant
    U-->>T: Publicar TenantSnapshot (versionado)
    U->>U: Habilitar membresías, roles, perfiles y permisos
    T->>T: Habilitar frontera de gobernanza SDLC
    A->>T: Abrir workspace SDLC gobernado
    T->>U: Delegar autenticación y autorización
    U-->>T: Grafo de autorización por Tenant
    T->>T: Validar TenantProjection local activa
    T-->>A: Permitir o bloquear acción gobernada
```

### 5.1 Reglas de Proyección del Tenant

| Sistema | Responsabilidad sobre Tenant | Usa la Clave Global del Tenant Para | No Debe Poseer |
|---|---|---|---|
| **UMS** | Identidad maestra del Tenant y su ciclo de vida, publicación del retrato, y la identidad de usuarios, membresías, perfiles, roles y permisos dentro del Tenant | Correlación cross-suite y scoping del grafo de autorización | Estado de procesos SDLC o decisiones de gate |
| **Evolith Tracker** | Proceso SDLC, gates, evidencias, aprobadores, excepciones, auditoría y configuración operacional del tenant | Frontera de gobernanza y partición de evidencias | Identidad maestra del Tenant o autoridad de credenciales de usuario |

Tracker debe rechazar acciones gobernadas cuando el grafo de autorización de UMS referencia un Tenant ausente, inactivo, vencido según política o inconsistente con la proyección local del Tenant en Tracker.

Los datos de proyección del Tenant son locales al dominio por diseño. Una proyección puede incluir la clave global del Tenant, nombre visible, estado de ciclo de vida, perfil de clasificación de datos, referencia de perfil de gobernanza, versión de proyección y metadata de sincronización. No debe convertirse en una copia de todos los campos de UMS.

---

## 6. Separación entre Evaluación y Decisión

### 6.1 Conceptos Canónicos

| Concepto | Producido Por | Significado |
|---|---|---|
| **Evidence Item** | Humano, agente, CI o proveedor | Hecho o artefacto ofrecido como prueba |
| **Technical Evaluation Result** | SDK, CLI, MCP o evaluador especializado | Evaluación determinista de evidencia contra una regla o criterio |
| **Gate Decision** | Motor de Decisiones del Tracker | Decisión canónica que combina evaluaciones, aprobaciones, excepciones y política |
| **Phase Transition** | Orquestador del Tracker | Cambio de estado ejecutado únicamente después de una Gate Decision autorizada |

### 6.2 Flujo de Decisión

```mermaid
sequenceDiagram
    autonumber
    participant A as Humano / Agente / CI
    participant T as Orquestador Tracker
    participant P as Adaptadores
    participant E as Evidence Graph
    participant R as Resolutor de Políticas Core
    participant V as Evaluador SDK / CLI / MCP
    participant D as Motor de Decisiones
    participant H as Aprobador Humano

    A->>T: Solicitar transición de fase
    T->>P: Recolectar hechos de proveedores
    P-->>E: Normalizar evidencia con linaje
    T->>R: Resolver versiones Core y tenant
    R->>V: Evaluar criterios del gate
    V-->>R: TechnicalEvaluationResult
    R-->>D: Criterios y resultados resueltos
    E-->>D: Snapshot del Evidence Graph

    alt Requiere aprobación humana
        D->>H: Solicitar aprobación o excepción
        H-->>D: Aprobar / rechazar / excepción
    end

    D->>D: Producir GateDecision canónica

    alt Gate aprobado
        D-->>T: APPROVED con decisionId
        T->>T: Ejecutar PhaseTransition canónica
    else Gate rechazado o indeterminado
        D-->>T: REJECTED / BLOCKED / INDETERMINATE
        T-->>A: Retornar evidencias faltantes y acciones
    end
```

### 6.3 Vocabulario de Estados

```text
TechnicalEvaluationResult.status
  compliant | non_compliant | indeterminate | error

GateDecision.status
  approved | rejected | blocked | approved_with_exception

PhaseTransition.status
  requested | authorized | executed | failed | cancelled
```

El término `passed` puede conservarse como etiqueta de presentación, pero no debe ocultar qué objeto es técnico y cuál es canónico.

---

## 7. Diseño del Evidence Graph

```mermaid
erDiagram
    TENANT_MASTER ||--o{ TENANT_PROJECTION : proyecta
    TENANT_PROJECTION ||--o{ PRODUCT : posee
    PRODUCT ||--o{ SDLC_PROCESS : ejecuta
    SDLC_PROCESS ||--o{ PHASE_EXECUTION : contiene
    PHASE_EXECUTION ||--o{ GATE_DECISION : evaluada_por
    GATE_DECISION }o--o{ TECHNICAL_EVALUATION : considera
    GATE_DECISION }o--o{ APPROVAL : requiere
    GATE_DECISION }o--o{ EXCEPTION : puede_incluir
    TECHNICAL_EVALUATION }o--o{ EVIDENCE_ITEM : evalua
    EVIDENCE_ITEM }o--|| EVIDENCE_SOURCE : origina_de
    EVIDENCE_ITEM }o--o{ ARTIFACT_REFERENCE : soporta
    EVIDENCE_ITEM }o--o{ EXECUTION_REFERENCE : producida_por
    EXECUTION_REFERENCE }o--|| PROVIDER_CONNECTION : ejecuta_en
    EVIDENCE_ITEM }o--o{ INTEGRITY_ASSERTION : protegida_por
    EVIDENCE_ITEM }o--o{ ACTOR_REFERENCE : registrada_por
```

### 7.1 Metadata Mínima

Toda evidencia aceptada contiene:

- identificador estable;
- referencias a tenant, producto, proceso, fase, gate y criterio;
- proveedor de origen e identificador externo;
- tipo de evidencia, versión de schema y hash de contenido;
- actor productor, agente y modelo cuando aplique;
- versiones de prompt, skill y ruleset cuando aplique;
- referencias a commit, pipeline, prueba, deployment o documento;
- timestamps, costo, latencia y metadata de integridad;
- retención y clasificación de datos;
- referencias a evaluación, aprobación, excepción y decisión final.

---

## 8. Diseño de Proveedores y Adaptadores

```mermaid
flowchart LR
    DOMAIN["Dominio Canónico Evolith"]
    PORT["Provider Port\nContrato de Capacidad"]
    ACL["Anti-Corruption Layer\nMapeo · Validación · Linaje"]
    ADAPTER["Adaptador de Proveedor"]
    PROVIDER["Proveedor Externo"]

    DOMAIN --> PORT --> ACL --> ADAPTER --> PROVIDER
    PROVIDER --> ADAPTER --> ACL --> PORT --> DOMAIN
```

### 8.1 Contratos de Proveedores

| Puerto | Capacidades | Ejemplos |
|---|---|---|
| **Work Management Port** | Buscar, importar, vincular y actualizar work items | Jira, Azure DevOps, GitHub Issues, alternativas abiertas |
| **Agent Execution Port** | Ejecutar actividad acotada y devolver evidencia | Claude, OpenAI, Gemini, agentes locales |
| **LLM Observability Port** | Trace, evaluación, costo, latencia y versiones de prompt | Langfuse y alternativas |
| **Analytics Port** | Publicar datasets gobernados y embeber visualizaciones | Apache Superset, Grafana y alternativas |
| **Repository Port** | Commits, ramas, pull requests y tags | GitHub, GitLab, Azure Repos |
| **CI/CD Port** | Builds, pruebas, artefactos y deployments | GitHub Actions, Azure Pipelines, GitLab CI |
| **Testing Port** | Resultados, coverage y verificación de contratos | Adaptadores específicos de frameworks |
| **Security Port** | Findings, policy checks y clasificación de riesgo | CodeQL, Trivy, Snyk y alternativas |
| **Deployment Port** | Release, entorno, rollout y rollback | Kubernetes, clouds y alternativas |
| **Collaboration Port** | Notificaciones, aprobaciones y comunicación operacional | Email, Teams, Slack y alternativas |

### 8.2 Niveles de Certificación

```text
Community Adapter
    -> Conforme al contrato y mantenido por la comunidad

Certified Adapter
    -> Supera validación de seguridad, compatibilidad y linaje

Managed Adapter
    -> Operación empresarial, monitoreo, upgrades, soporte y SLA
```

---

## 9. Diseño de Ejecución de Agentes

```mermaid
sequenceDiagram
    participant U as Usuario / Proceso
    participant T as Tracker
    participant C as Contexto y Políticas
    participant A as Agent Execution Port
    participant X as Proveedor de Agente
    participant O as Observabilidad
    participant E as Evidence Graph

    U->>T: Solicitar actividad gobernada
    T->>C: Resolver permisos, reglas, skills y contexto
    C-->>T: Contrato de actividad y límite de contexto
    T->>A: Ejecutar actividad acotada
    A->>X: Invocación específica del proveedor
    X-->>A: Resultado, tool calls y uso
    A->>O: Publicar trace de ejecución
    O-->>E: Trace, costo, latencia y evaluaciones
    A-->>E: Artefacto y referencia de ejecución
    E-->>T: Referencias de evidencia
    T-->>U: Resultado pendiente de aceptación o aprobación
```

Los agentes no pueden:

- aprobar un gate;
- modificar directamente el estado de fase;
- ampliar su contexto fuera del límite aprobado;
- cambiar reglas del tenant o rulesets del Core;
- convertir un artefacto generado en evidencia aceptada sin validación.

---

## 10. Experiencia Unificada

```mermaid
flowchart TB
    HOME["Inicio de Tenant y Producto"]
    PROCESS["Timeline del Proceso SDLC"]
    PHASE["Workspace de Fase"]
    GATE["Workspace de Decisión del Gate"]
    GRAPH["Explorador del Evidence Graph"]
    PROVIDER["Salud de Proveedores y Adaptadores"]
    AUDIT["Historial de Auditoría y Excepciones"]

    HOME --> PROCESS
    PROCESS --> PHASE
    PHASE --> GATE
    GATE --> GRAPH
    PHASE --> PROVIDER
    GATE --> AUDIT
```

La experiencia muestra primero el estado canónico Evolith y luego los detalles del proveedor. Las herramientas externas permanecen accesibles mediante enlaces al origen, pero el usuario no debe reconstruir manualmente la historia de gobernanza.

---

## 11. Corte Mínimo Comprobable

```text
Un tenant
  -> una identidad maestra de Tenant en UMS
  -> una proyección activa del Tenant en Tracker
  -> un producto
  -> un proceso SDLC de cinco fases
  -> un proveedor de gestión de trabajo
  -> un repositorio y CI
  -> un proveedor de agentes
  -> un proveedor de observabilidad
  -> un proveedor de analítica
  -> un Evidence Graph
  -> cinco Gate Decisions canónicas
```

El diseño se acepta únicamente si:

- Tracker sigue siendo autoritativo;
- UMS sigue siendo autoritativo para la identidad maestra del Tenant y para la identidad y autorización de usuarios;
- Tracker valida una proyección local activa del Tenant antes de cualquier acción gobernada;
- toda evidencia conserva linaje del proveedor;
- los adaptadores son reemplazables;
- los agentes permanecen acotados y sin autoridad;
- el usuario experimenta un proceso coherente;
- ningún schema específico se filtra al dominio canónico.

---

## 12. Impacto Documental Antes de Código

Deben alinearse antes de implementar:

1. Diseño de Interfaces Técnicas del Tracker.
2. Arquitectura Objetivo SDK / CLI / MCP.
3. Modelo de Evidencia y Trazabilidad.
4. Mapeo de Artefactos y templates de Discovery.
5. Responsibility Matrix y semántica de decisiones.
6. Fronteras Open-Core y ecosistema de adaptadores.
7. One-pager ejecutivo y diagramas de gobernanza.
8. Roadmap evolutivo y evaluación de madurez.

Rulesets, schemas y código quedan fuera de este primer conjunto de cambios de diseño.

---

## 13. Decisiones que Debe Aprobar el Board

- separación entre evaluación técnica y decisión canónica;
- límites de agregados del Evidence Graph;
- taxonomía inicial de provider ports;
- niveles de certificación de adaptadores;
- contrato del retrato de tenant de UMS hacia Tracker (`Evolith.Contracts.Tenancy.TenantSnapshotIntegrationEvent`);
- contrato de grafo de autorización de UMS consumido por Tracker;
- corte vertical mínimo;
- terminología de `compliant`, `approved` y `passed`;
- condiciones de aprobación configurables por tenant.

---

## 14. Documentos Relacionados

- [Visión Maestra del Producto Evolith](../vision/evolith-product-vision-master.es.md)
- [Framework Estratégico de Validación y Composición](../methods/evolith-strategic-validation-and-composition-framework.es.md)
- [Diseño de Interfaces Técnicas del Tracker](../../products/evolith-tracker/sdlc-tracker-technical-interfaces.es.md)
- [Modelo de Trazabilidad SDLC](../../../reference/core/sdlc/traceability-model.es.md)
- [Workflow de Validación Asistida por IA](../methods/evolith-ai-assisted-validation-workflow.es.md)

---

*Este documento es la línea base de diseño para la nueva visión. Autoriza únicamente alineación documental; la implementación requiere una baseline técnica y ADRs aprobados por separado.*
