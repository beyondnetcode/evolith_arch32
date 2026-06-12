# Replicating This BMAD Adoption — Setup Guide


---

## What You Are Setting Up
| Componente | Archivos | Propósito |
| :--- | :--- | :--- |
| Agentes del equipo BMAD | `.bmad-core/agents/*.md` | Personas de IA basadas en roles para la entrega de funciones |
| Aprovechar a los agentes de gobernanza | `.harness/agents/agent-specs.md` | Gobernanza de arquitectura y documentos bajo demanda |
| Reglas del arnés | `.harness/rules/global-rules.md` | 18 directivas vinculantes aplicadas en todos los agentes |
| Libros de jugadas | `.harness/playbooks/*.md` | Listas de verificación operativas para tareas recurrentes de gobernanza |
| Guión de validación | `.harness/scripts/validate-docs.mjs` | Validación automatizada de UTF-8, enlaces y Mermaid |
| AGENTES.md | `AGENTES.md` | Archivo de nivel superior que activa el marco para herramientas de IA |
| Flujo de trabajo | `.bmad-core/workflows/development.yaml` | Flujo de trabajo secuencial de desarrollo greenfield |

---
## Step 1 — Directory Structure
Cree los siguientes directorios en la raíz de su repositorio:```bash
mkdir -p .bmad-core/agents
mkdir -p .bmad-core/workflows
mkdir -p .harness/agents
mkdir -p .harness/rules
mkdir -p .harness/playbooks
mkdir -p .harness/scripts
mkdir -p .harness/templates
```

---

## Step 2 — Copy the BMAD Team Agent Files
Cree un archivo por agente en `.bmad-core/agents/`. El contenido de cada uno es el bloque Persona portátil del [Catálogo de agentes] (./agents-catalog.md).

**Nombres de archivos:**```
.bmad-core/agents/analyst.md
.bmad-core/agents/pm.md
.bmad-core/agents/architect.md
.bmad-core/agents/sm.md
.bmad-core/agents/dev.md
.bmad-core/agents/qa.md
```**Se requiere adaptación:** En las personas de los agentes Desarrollador y Arquitecto, reemplace los nombres de las tecnologías con su pila real. Por ejemplo, si su pila es .NET en lugar de Node.js/NestJS, reemplace las referencias de NestJS con ASP.NET Core, TypeORM con Entity Framework, etc. Mantenga las restricciones estructurales (límites hexagonales, cumplimiento de OWASP, capas de arquitectura limpia): estas son independientes de la pila.

---
## Step 3 — Copy the Harness Governance Agents
Cree `.harness/agents/agent-specs.md` con el siguiente contenido. Adapte las descripciones del alcance a las preocupaciones específicas de su proyecto:```markdown```
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

**`.harness/playbooks/document-governance-playbook.md`**```markdown```
## Step 6 — Copy the Validation Script
Copie `.harness/scripts/validate-docs.mjs` de este repositorio a su directorio `.harness/scripts/`. El script valida:
- Codificación UTF-8 (sin artefactos de codificación en el rango U+2600–U+27BF)
- Los enlaces relativos se resuelven en archivos existentes.
- Los bloques de código de sirena tienen marcadores de sintaxis válidos.

Ejecútelo localmente para verificar su documentación:```bash
node .harness/scripts/validate-docs.mjs
```**Se requiere adaptación:** El script escanea `**/*.md` desde la raíz del repositorio de forma predeterminada. Si su documentación se encuentra en una estructura de directorio diferente, ajuste el patrón global en la sección de configuración del script.

---
## Step 7 — Create AGENTS.md
`AGENTS.md` es el archivo de nivel superior que activa el marco para las herramientas de IA (Claude Code, Cursor, GitHub Copilot, etc.). Le dice a la herramienta de IA qué agentes existen, qué reglas se aplican y cómo comportarse en este repositorio.

Cree `AGENTS.md` en la raíz de su repositorio con la siguiente estructura:```markdown```
## Step 8 — CI Integration
Agregue la validación de la documentación como paso de bloqueo de CI:

**Acciones de GitHub:**```yaml```
## Step 9 — Workflow File
Cree `.bmad-core/workflows/development.yaml` para definir el flujo de trabajo de desarrollo canónico greenfield. Adapte las rutas de entrega a la estructura de su repositorio:```yaml
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
| `.harness/scripts/validate-docs.mjs` | Aplicación automatizada |
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
- [] El script de validación pasa a su documentación existente (`node .harness/scripts/validate-docs.mjs`)
- [] El paso CI está configurado y bloqueado.

---
## Related Documents
- [Catálogo de agentes] (./agents-catalog.md): especificaciones completas de personas portátiles
- [Referencia de reglas](./rules-reference.md): fundamentos detallados de las reglas y ejemplos
- [Descripción general de BMAD-METHOD](./README.md): arquitectura del marco y modelo de dos capas

---

[Volver a la descripción general del MÉTODO BMAD](./README.md)