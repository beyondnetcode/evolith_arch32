# Hub de Reglas de Evolith

> **Bilingual navigation:** [English version](./README.md)

Reglas de gobernanza machine-readable que los repositorios satélite heredan y contra las cuales validan.

---

## Propósito

Los Rulesets de Evolith son la **capa de ejecución machine-readable** del framework de gobernanza Evolith. Mientras `reference/` contiene estándares escritos por humanos, ADRs y documentación, `rulesets/` contiene las reglas concretas, esquemas y contratos que las herramientas (CLI, pipelines CI, linters) consumen para **validar** el cumplimiento de satélites.

---

## Punto de Entrada

Si estás integrando un nuevo repositorio satélite, comienza aquí:

1. **[Reglas de Gobernanza](./governance/)** — contrato `evolith.yaml` y reglas de herencia
2. **[Reglas de Arquitectura](./architecture/)** — reglas de progresión de fase F1/F2/F3
3. **[Reglas SDLC](./sdlc/)** — definitiones de quality gates y thresholds
4. **[Schemas](./schema/)** — JSON Schema para validación de artefactos Evolith

---

## Estructura de Directorios

```
rulesets/
├── schema/                     # Definiciones de JSON Schema
│   ├── adr.schema.json         # Validación de artefacto ADR
│   ├── prd.schema.json         # Validación de artefacto PRD
│   ├── functional-story.schema.json
│   ├── technical-story.schema.json
│   ├── test-summary-report.schema.json
│   ├── release-notes.schema.json
│   └── evolith-yaml.schema.json
├── architecture/               # Reglas de fase de arquitectura
│   ├── f1-modular-monolith.rules.json
│   ├── f2-distributed-modules.rules.json
│   └── f3-microservices.rules.json
├── sdlc/                       # Reglas de gates SDLC
│   ├── phase-gates.rules.json
│   └── quality-thresholds.rules.json
└── governance/                 # Reglas de gobernanza federada
    ├── inheritance.rules.json
    └── satellite-contracts.rules.json
```

---

## Cómo Funcionan los Rulesets

```mermaid
flowchart LR
    classDef core fill:#14532d,stroke:#22c55e,color:#fff
    classDef sat fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef tool fill:#4a3800,stroke:#f59e0b,color:#fff

    R["rulesets/\n(Evolith Core)"]:::core
    S["evolith.yaml\n(Satellite)"]:::sat
    T["CLI / CI\nValidation"]:::tool

    R -->|"inheritance"| S
    S -->|"validate"| T
    T -->|"block / pass"| S
```

1. **Evolith Core** publica rulesets
2. **Satélites** declaran `evolith.yaml` heredando versiones específicas de reglas
3. **CLI / CI** valida satélite contra reglas heredadas
4. **Failures** bloquean phase gates o merge

---

## Principios Clave

| Principio | Descripción |
|---|---|
| **Reglas versionadas** | Cada regla tiene versión; satélites hacen pin a versión específica |
| **Fail-fast validation** | CI debe fallar en violaciones de reglas; sin bypass sin waiver explícito |
| **Phase-aware** | Las reglas cambian dependiendo de la fase de arquitectura F1/F2/F3 |
| **Herencia federada** | Satélites heredan de Core; no modifican reglas del Core |
| **Schema-first** | Todos los artefactos tienen JSON Schema para validación machine |

---

## Documentos Relacionados

| Documento | Propósito |
|---|---|
| [AGENTS.md](../AGENTS.md) | Reglas y convenciones de agentes |
| [Repository Taxonomy](../reference/governance/standards/repository-taxonomy.md) | Qué va dónde en Evolith |
| [Child Repository Inheritance](../reference/governance/standards/onboarding/child-repository-inheritance-guide.md) | Cómo productos heredan de Evolith |
| [Navigation Hub](../reference/navigation/README.md) | Navegación completa del repositorio |

---

<div align="center">
  <sub>Evolith — Enterprise Architecture Platform | Rulesets Hub</sub>
</div>