# V-06 — Diagrama de Flujo de Gobernanza

> **Audiencia:** Arquitectos, Tech Leads, Architecture Board  
> **Propósito:** Visualizar el ciclo de vida completo de un ADR y los caminos de decisión de gobernanza  
> **Bilingüe:** [English](./v06-governance-flow.md)

---

## Visual 6-A — Ciclo de Vida de un ADR (Máquina de Estados Completa)

```mermaid
stateDiagram-v2
    [*] --> Identificado : Pregunta arquitectónica\nsurge

    Identificado --> Investigando : Autor asignado\nContexto documentado

    Investigando --> BorradorPropuesta : Opciones analizadas\nTrade-offs mapeados

    BorradorPropuesta --> ADRProducto : Decisión específica\ndel producto

    BorradorPropuesta --> RevisiónEvolith : Decisión universal /\ncross-producto

    ADRProducto --> AprobadoProducto : Arquitecto\ndel producto aprueba
    AprobadoProducto --> Activo : Mergeado al\nrepo hijo

    RevisiónEvolith --> RevisiónBoard : Reunión del\nArchitecture Board programada

    RevisiónBoard --> Aprobado : Consenso\nalcanzado
    RevisiónBoard --> Rechazado : No cumple los\nestándares Evolith
    RevisiónBoard --> NecesitaRevisión : Se requiere\nmás contexto

    NecesitaRevisión --> Investigando : De vuelta a\nla investigación

    Rechazado --> ADRProducto : Reclasificar como\nespecífico del producto

    Aprobado --> Activo : Mergeado a\nEvolith main
    Activo --> Reemplazado : Nuevo ADR\nlo reemplaza
    Activo --> Deprecado : Tecnología\nobsoleta

    Reemplazado --> [*]
    Deprecado --> [*]

    note right of Activo
        Todos los repos hijo
        heredan esta decisión
        automáticamente.
        La divergencia requiere
        un ADR de override
        documentado.
    end note
```

---

## Visual 6-B — Quién Decide Qué (Matriz RACI)

```mermaid
flowchart LR
    classDef role fill:#1e3a5f,stroke:#3b82f6,color:#fff,font-weight:bold
    classDef r fill:#7f1d1d,stroke:#ef4444,color:#fff
    classDef a fill:#14532d,stroke:#22c55e,color:#fff
    classDef c fill:#4a3800,stroke:#f59e0b,color:#fff
    classDef i fill:#374151,stroke:#9ca3af,color:#fff

    subgraph ROLES["ROLES"]
        R1["Architecture Board"]:::role
        R2["Arquitecto de Producto"]:::role
        R3["Tech Lead"]:::role
        R4["Ingeniero"]:::role
    end

    subgraph DECISIONS["DECISIONES CLAVE"]
        D1["Nuevo ADR Core\n(universal)"]
        D2["ADR de Producto\n(repo hijo)"]
        D3["Override de ADR\n(divergencia)"]
        D4["Cambio de Tech Stack"]
        D5["Merge de PR\n(feature)"]
        D6["Promoción a Evolith"]
    end

    R1 -->|"A — Accountable"| D1
    R2 -->|"R — Responsible"| D1
    R3 -->|"C — Consultado"| D1
    R4 -->|"I — Informado"| D1

    R2 -->|"A — Accountable"| D2
    R3 -->|"R — Responsible"| D2
    R4 -->|"C — Consultado"| D2
    R1 -->|"I — Informado"| D2

    R1 -->|"A — Accountable"| D3
    R2 -->|"R — Responsible"| D3
    R3 -->|"C — Consultado"| D3

    R1 -->|"A — Accountable"| D4
    R2 -->|"R — Responsible"| D4

    R3 -->|"A — Accountable"| D5
    R4 -->|"R — Responsible"| D5

    R1 -->|"A — Aprobación Final"| D6
    R2 -->|"R — Nomina"| D6
```

---

## Visual 6-C — Ruta de Promoción: Producto → Evolith

```mermaid
flowchart TD
    classDef prod fill:#14532d,stroke:#22c55e,color:#fff
    classDef evolith fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef gate fill:#4a3800,stroke:#f59e0b,color:#fff,font-weight:bold
    classDef action fill:#374151,stroke:#9ca3af,color:#fff

    START([" Descubrimiento en\nRepositorio de Producto\n(ej. UMS)"]):::prod

    S1["El Arquitecto de Producto identifica\nuna decisión que puede ser universal\n\nDocs: ADR del producto + evidencia\nde implementación real"]:::prod

    S2["Nominación enviada\nal Architecture Board\n\nIncluye: contexto, decisión,\nconsecuencias, evidencia de producción"]:::action

    G1{"¿La decisión aplica\na ≥ 2 runtimes\no ≥ 2 equipos de producto?"}:::gate
    G1 -->|NO| STAY["Permanece como ADR de producto\nReferencia los ADRs Evolith\nque la influyeron"]:::prod
    G1 -->|SÍ| REVIEW

    REVIEW["Revisión del Architecture Board\n\nEvalúa:\n• Universalidad\n• Completitud del trade-off\n• Compatibilidad con ADRs existentes\n• Formulación agnóstica de runtime"]:::action

    G2{"¿Consenso\ndel Board?"}:::gate
    G2 -->|NO — necesita trabajo| REVISE["El autor revisa\nagrega contexto faltante\no evidencia"]:::action
    G2 -->|SÍ| PROMOTE

    PROMOTE["ADR promovido a Evolith\n\nEl ADR original del producto se actualiza\npara referenciar el nuevo ADR core\nTodos los repos hijo lo heredan"]:::evolith

    REVISE --> G1

    START --> S1 --> S2 --> G1
    G1 -->|SÍ| REVIEW --> G2 --> PROMOTE
```

---

## Visual 6-D — Capas de Aplicación de Gobernanza

```mermaid
flowchart TB
    classDef auto fill:#14532d,stroke:#22c55e,color:#fff
    classDef human fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef policy fill:#4a1a6b,stroke:#9c27b0,color:#fff

    subgraph AUTOMATED[" APLICACIÓN AUTOMATIZADA (No puede omitirse)"]
        direction LR
        AE1["eslint-plugin-boundaries\nBloquea imports cross-capa\nen CI"]:::auto
        AE2["Gate de cobertura de tests\n≥70% aplicado en\nGitHub Actions"]:::auto
        AE3["Scan de seguridad CodeQL\nBloquea código vulnerable\n→ ADR-0005"]:::auto
        AE4["Pinning de dependencias\nSin rangos ^ o ~\n→ ADR-0009"]:::auto
        AE5["Verificación de aislamiento de schema\nSin joins SQL cross-schema\n→ ADR-0031"]:::auto
    end

    subgraph HUMAN[" REVISIÓN HUMANA (Tech Lead + Arquitecto)"]
        direction LR
        HR1["Revisión Arquitectónica de PR\nFronteras Hexagonales\nDisciplina Puerto/Adaptador"]:::human
        HR2["Verificación de Cobertura ADR\nCada nuevo patrón tiene\nun ADR que lo rige"]:::human
        HR3["Lenguaje Ubicuo\nNombres de dominio alineados\ncon el Glosario"]:::human
        HR4["Sin extracción prematura\nCriterios ADR-0045\nno violados"]:::human
    end

    subgraph BOARD["️ SUPERVISIÓN DEL BOARD (Architecture Board)"]
        direction LR
        BO1["Revisión ADR Trimestral\nADRs reemplazados/deprecados\nprocesados"]:::policy
        BO2["Gobernanza del Tech Stack\nNuevas herramientas requieren\nADR aprobado por Board"]:::policy
        BO3["Auditoría de Repos Hijo\nDivergencias revisadas\nanualmente"]:::policy
    end

    AUTOMATED --> HUMAN --> BOARD
```

---

*Parte de la [Estrategia de Comunicación Arquitectónica](../architecture-communication-strategy.es.md)*
