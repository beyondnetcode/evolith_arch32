# Replicating This BMAD Adoption — Setup Guide


---

## What You Are Setting Up
| Componente | Archivos | Propósito |
| :--- | :--- | :--- |
| Agentes del equipo BMAD | `reference/core/foundations/agent-skills/*.md` | Personas de IA basadas en roles para la entrega de funciones (taxonomia de este repo; el valor por defecto generico de BMAD es `.bmad-core/agents/`) |
| Aprovechar a los agentes de gobernanza | `.harness/agents/agent-specs.md` | Gobernanza de arquitectura y documentos bajo demanda |
| Reglas del arnés | `.harness/rules/global-rules.md` | 18 directivas vinculantes aplicadas en todos los agentes |
| Libros de jugadas | `.harness/playbooks/*.md` | Listas de verificación operativas para tareas recurrentes de gobernanza |
| Guión de validación | `.harness/scripts/ci/01-validate-docs.mjs` | Validación automatizada de UTF-8, enlaces y Mermaid |
| AGENTES.md | `AGENTES.md` | Archivo de nivel superior que activa el marco para herramientas de IA |
| Flujo de trabajo | `.bmad-core/workflows/development.yaml` | Flujo de trabajo secuencial de desarrollo greenfield |

---
## Step 1 — Directory Structure
Cree los siguientes directorios en la raíz de su repositorio:
```bash
mkdir -p reference/core/foundations/agent-skills
mkdir -p .bmad-core/workflows
mkdir -p .harness/agents
mkdir -p .harness/rules
mkdir -p .harness/playbooks
mkdir -p .harness/scripts
mkdir -p .harness/templates
```

---

## Step 2 — Copy the BMAD Team Agent Files
Cree un archivo por agente en `reference/core/foundations/agent-skills/`. El contenido de cada uno es el bloque Persona portátil del [Catálogo de agentes] (./agents-catalog.md).

**Nombres de archivos:**
```
reference/core/foundations/agent-skills/analyst.md
reference/core/foundations/agent-skills/pm.md
reference/core/foundations/agent-skills/architect.md
reference/core/foundations/agent-skills/sm.md
reference/core/foundations/agent-skills/dev.md
reference/core/foundations/agent-skills/qa.md
```**Se requiere adaptación:** En las personas de los agentes Desarrollador y Arquitecto, reemplace los nombres de las tecnologías con su pila real. Por ejemplo, si su pila es .NET en lugar de Node.js/NestJS, reemplace las referencias de NestJS con ASP.NET Core, TypeORM con Entity Framework, etc. Mantenga las restricciones estructurales (límites hexagonales, cumplimiento de OWASP, capas de arquitectura limpia): estas son independientes de la pila.

---
## Step 3 — Copy the Harness Governance Agents
Cree `.harness/agents/agent-specs.md` con el siguiente contenido. Adapte las descripciones del alcance a las preocupaciones específicas de su proyecto:

```markdown
# Agent Personas Specification

<!-- ## @po (Product Owner) -->
- **Scope**: Business logic, functional stories, OKRs, readability.
- **Directives**: No implementation jargon. Prioritize user experience and business outcome.

<!-- ## @architect (Software Architect) -->
- **Scope**: Tech stack, system design, diagrams (C4, ERD, sequence), ADRs.
- **Directives**: Enforce hexagonal boundaries, RLS enforcement, port portability, stack coherence.

<!-- ## @analyst (Business Analyst) -->
- **Scope**: Document sync, backlog hygiene, use case taxonomies.
- **Directives**: Ensure 100% bilingual equivalence and precise cross-references.

<!-- ## @devops (DevSecOps Engineer) -->
- **Scope**: Docker configs, CI/CD pipelines, security scanning, harness governance.
- **Directives**: Enforce security standards, UTF-8 sanitization, and token economy.
```

**Se requiere adaptación:** Reemplace la directiva bilingüe de `@analyst` por la preocupación de consistencia documental que aplique a su equipo. Si su equipo es monolingüe, reutilice `@analyst` para la sincronización de versiones de documentación, el mantenimiento del changelog o la integridad de las referencias cruzadas.

---

## Step 4 — Copy the Rules File
Cree `.harness/rules/global-rules.md` con la tabla de reglas de la [Referencia de reglas] (./rules-reference.md#portable-rules-block). Esta es la única fuente de verdad para todas las directivas vinculantes.

**Requiere adaptación:**
- R-01 (Bilingual Sync): Ajústese a su estrategia de idioma de documentación.
- R-02 (Autoridad de contexto): Reemplace la referencia a "fuente de contexto autorizada" con los archivos específicos en su repositorio que cumplen esta función (por ejemplo, su `DECISIONS.md`, su documento de pila aprobado).
- R-05 (Tech Stack): señale su propio documento de pila tecnológica aprobado.
- R-14 (Autoridad de tiempo de ejecución): Apunte a sus propios documentos de perfil de tiempo de ejecución.
- Las reglas R-15, R-16, R-17, R-18 se pueden eliminar si el arrendamiento múltiple, las entidades de catálogo, la extracción modular o la API híbrida no son preocupaciones para su producto.

---
## Step 5 — Copy the Playbooks
Cree un archivo por libro de jugadas en `.harness/playbooks/`. Adapte las condiciones de activación y las comprobaciones obligatorias a su flujo de trabajo.

**Libros de jugadas mínimos recomendados:**

**`.harness/playbooks/document-governance-playbook.md`**

```markdown
# Document Governance Playbook

<!-- ## Use When -->
- reviewing requirements
- updating functional stories
- editing ADRs or blueprints
- validating documentation sync

<!-- ## Mandatory Checks -->
1. Functional content is readable to Product Owners and Business Analysts.
2. Technical detail is isolated in a dedicated Technical Requirements section.
3. Document language variants stay synchronized.
4. Diagram labels match document language.
5. Runtime-specific claims point to the correct authoritative profile.

<!-- ## Audit Output Format -->
- artifact
- location
- issue type
- severity
- recommended correction
```

**`.harness/playbooks/api-governance-playbook.md`**

```markdown
# API Governance Playbook

<!-- ## Use When -->
- reviewing backend contracts
- designing REST endpoints
- validating query handlers or repositories

<!-- ## Mandatory Checks -->
1. Command and query responsibilities are explicit.
2. Pagination, filtering, sorting are centralized.
3. Error mapping stays structured and predictable.
4. Multi-tenancy keeps primary application-layer filtering.

<!-- ## Architectural Goal -->
The API remains maintainable as a modular monolith today and extractable tomorrow.
```

---

## Step 6 — Copy the Validation Script
Copie `.harness/scripts/ci/01-validate-docs.mjs` de este repositorio a su directorio `.harness/scripts/`. El script valida:
- Codificación UTF-8 (sin artefactos de codificación en el rango U+2600–U+27BF)
- Los enlaces relativos se resuelven en archivos existentes.
- Los bloques de código de sirena tienen marcadores de sintaxis válidos.

Ejecútelo localmente para verificar su documentación:
```bash
node .harness/scripts/ci/01-validate-docs.mjs
```

**Se requiere adaptación:** El script escanea `**/*.md` desde la raíz del repositorio de forma predeterminada. Si su documentación se encuentra en una estructura de directorio diferente, ajuste el patrón global en la sección de configuración del script.

---
## Step 7 — Create AGENTS.md
`AGENTS.md` es el archivo de nivel superior que activa el marco para las herramientas de IA (Claude Code, Cursor, GitHub Copilot, etc.). Le dice a la herramienta de IA qué agentes existen, qué reglas se aplican y cómo comportarse en este repositorio.

Cree `AGENTS.md` en la raíz de su repositorio con la siguiente estructura:

```markdown
# AGENTS.md — [Your Repository Name]

<!-- ## Project Overview -->
[Brief description of what this repository is and does]

<!-- ## Build and Run -->
[Commands to install dependencies, start the project, run tests]

<!-- ## Agent Team -->

<!-- ### BMAD Team Agents (Sequential Workflow) -->
Invoke by role for spec-driven feature delivery:
- **analyst**: Requirements analysis and functional specification
- **pm**: PRD creation and backlog management
- **architect**: Technical architecture and ADR authoring
- **sm**: Task breakdown and sprint planning
- **dev**: Implementation (backend + frontend)
- **qa**: Testing, security audit, release verification

Agent personas: `reference/core/foundations/agent-skills/`

<!-- ### Harness Governance Agents (On-Demand) -->
Invoke by tag for document and architecture governance:
- **@po**: Functional story readability and business narrative
- **@architect**: ADR review, diagram audit, stack validation
- **@analyst**: Document sync and cross-reference integrity
- **@devops**: Infrastructure, CI/CD, harness health

Agent specs: `.harness/agents/agent-specs.md`

<!-- ## Binding Rules -->
All agents operate under 18 binding rules. Full reference: `.harness/rules/global-rules.md`

Key rules always active:
- R-01: Document variants stay synchronized
- R-03: Pure UTF-8 output only
- R-04: Diagram labels match document language (code identifiers exempt)
- R-10: Audit output format: [Document, Location, Issue Type, Severity, Fix]

<!-- ## Conventions -->
[Your naming conventions, ADR format, directory taxonomy]

<!-- ## Out of Bounds -->
- Never commit secrets, tokens, or credentials
- Never modify files outside the scope of the current task
- Never skip the validation script before committing documentation changes
```

---

## Step 8 — CI Integration
Agregue la validación de la documentación como paso de bloqueo de CI:

**Acciones de GitHub:**

```yaml
# .github/workflows/docs-validation.yml
name: Documentation Validation
on: [push, pull_request]

jobs:
  validate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Validate documentation
        run: node .harness/scripts/ci/01-validate-docs.mjs
```

**GitLab CI:**

```yaml
validate-docs:
  stage: validate
  image: node:20
  script:
    - node .harness/scripts/ci/01-validate-docs.mjs
  rules:
    - if: $CI_PIPELINE_SOURCE == "push"
```

---

## Step 9 — Workflow File
Cree `.bmad-core/workflows/development.yaml` para definir el flujo de trabajo de desarrollo canónico greenfield. Adapte las rutas de entrega a la estructura de su repositorio:
```yaml
name: Greenfield Development Workflow
description: End-to-end spec-driven development loop for new features.
version: 1.0.0

steps:
  - id: analysis
    agent: analyst
    action: Analyze requirements and produce functional specification.
    deliverable: ".bmad-core/deliverables/functional-spec.md"

  - id: product-definition
    agent: pm
    action: Refine functional specs into a PRD with UX definitions.
    deliverable: ".bmad-core/deliverables/prd.md"
    dependsOn: [analysis]

  - id: architectural-design
    agent: architect
    action: Define architecture, DB schemas, and security parameters.
    deliverable: ".bmad-core/deliverables/technical-architecture.md"
    dependsOn: [product-definition]

  - id: task-breakdown
    agent: sm
    action: Create backlog stories and Definition of Done templates.
    deliverable: ".bmad-core/backlog/tasks.json"
    dependsOn: [architectural-design]

  - id: implementation
    agent: dev
    action: Implement backend and frontend. Ensure OWASP security.
    deliverable: "src/"
    dependsOn: [task-breakdown]

  - id: verification
    agent: qa
    action: Run tests, security audits, and produce QA report.
    deliverable: ".bmad-core/deliverables/qa-report.md"
    dependsOn: [implementation]
```

---

## Minimal Adoption Option
Si desea adoptar solo la capa de gobernanza sin el flujo de trabajo completo del equipo BMAD, la configuración mínima viable es:

| Archivo | Por qué es importante |
| :--- | :--- |
| `.harness/agents/agent-specs.md` | Define @po, @architect, @analyst, @devops |
| `.harness/rules/global-rules.md` | Las 18 normas vinculantes |
| `.harness/scripts/ci/01-validate-docs.mjs` | Aplicación automatizada |
| `AGENTES.md` | Activa el marco para herramientas de IA |
| Paso CI | Hace que R-03 y la validación de enlaces no sean negociables |

Esto le brinda revisión de documentos y auditoría arquitectónica asistida por IA sin comprometerse con el flujo de trabajo de entrega completo basado en especificaciones.

---
## Adaptation Checklist
Antes de su primera confirmación con el marco activo, verifique:

- [] Todos los nombres de tecnología en las personas de los agentes coinciden con su pila real
- [] R-02 apunta a sus fuentes de contexto autorizadas reales
- [] R-05 y R-14 apuntan a su pila tecnológica real y a sus documentos de perfil de tiempo de ejecución
- [] `AGENTS.md` describe su proyecto real, no este repositorio base
- [] El script de validación pasa a su documentación existente (`node .harness/scripts/ci/01-validate-docs.mjs`)
- [] El paso CI está configurado y bloqueado.

---
## Related Documents
- [Catálogo de agentes] (./agents-catalog.md): especificaciones completas de personas portátiles
- [Referencia de reglas](./rules-reference.md): fundamentos detallados de las reglas y ejemplos
- [Descripción general de BMAD-METHOD](./README.md): arquitectura del marco y modelo de dos capas

---

[Volver a la descripción general del MÉTODO BMAD](./README.md)