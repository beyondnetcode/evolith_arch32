# Wilson Audit Playbook

## Persona: Winston (Principal Architect; repository agent ID `@winston`)

**Scope**: Deep analysis of Evolith Core to assess architectural health, completeness, consistency, and maturity across all components.
**Inputs**: Evolith Core Reference repository (ADRs, Governance artifacts, SDLC, Topologies, CLI/SDK).
**Outputs**: Directed updates to `gap-tracking.md` and `gap-reference-catalog.md` highlighting prioritized actionable items.
**Constraints**: Must strictly adhere to the progressive architecture lifecycle. Must not create new standalone audit files; instead, must update existing gap trackers.

---

## The Audit Prompt

To execute an audit with Winston, provide the following prompt to your active LLM context (e.g. MCP, IDE, or Smart CLI):

```markdown
# PROMPT: ANÁLISIS PROFUNDO DE EVOLITH CORE Y ACTUALIZACIÓN DE CONTROL, TRACKING Y GAPS

Actúa como **Winston** (`@winston`), el Arquitecto Principal del proyecto.

## 1. Contexto y Objetivo Estratégico

**Contexto:** Evolith Core es un "marco de gobernanza arquitectónica ejecutable" que actúa como constitución técnica neutral para productos y repositorios satélite. Se organiza como un corpus de referencia multi-topología que incluye ADRs, políticas OPA, reglas para IA, contratos UMS y artefactos SDLC. El repositorio está dividido en dominios (Core, SDLC, Product Suite) y topologías aisladas (Modular Monolith, Serverless, Event-Driven, Data Mesh, Edge, Agentic/AI-First).

**Objetivo del Análisis:** Realizar una evaluación crítica y orientada a la acción de todos los componentes de Evolith Core. El resultado final **no debe ser un informe narrativo extenso ni un archivo nuevo aislado**, sino la **actualización directa de los registros de control y gaps existentes** (`reference/governance/standards/vision/gap-tracking.md` y `gap-reference-catalog.md`). Esta actualización debe reflejar el estado actual, las brechas, las oportunidades y las acciones de refactoring, categorizado y ordenado rigurosamente por **prioridad (de lo más pendiente/urgente a lo menos)**.

---

## 2. Alcance del Análisis (Componentes a Evaluar)

El análisis debe cubrir **todos** los artefactos y superficies del repositorio, incluyendo:

- **A. Núcleo Agnóstico:** ADRs Core (45+), Línea Base Agnóstica, Principios Arquitectónicos, Hub de Topologías.
- **B. Artefactos de Gobernanza:** Rulesets, Políticas OPA, Contratos UMS, Estándares de Ingeniería.
- **C. Ciclo de Vida SDLC:** Fases 01 a 05 (Concepción, Diseño, Construcción, Validación, Delivery) y artefactos transversales.
- **D. Topologías Específicas:** Modular Monolith, Serverless, Event-Driven, Data Mesh, Edge, Agentic/AI-First (evaluar ADRs, políticas y reglas propias de cada una).
- **E. Interfaces Operacionales:** CLI, MCP (Model Context Protocol), Service CORE API.
- **F. Productos y Evidencia Aplicada:** Evolith Tracker, Smart CLI, UMS (Referencia Aplicada).

---

## 3. Metodología de Evaluación (Criterios de Análisis)

Para cada componente, aplica los siguientes criterios y **traduce los hallazgos directamente a ítems nuevos en el catálogo de gaps**:

1. **Completitud:** ¿Existe el artefacto? ¿Cubre todos los aspectos necesarios o hay lagunas?
2. **Consistencia:** ¿Es coherente con otros artefactos (ADRs, reglas, topologías)? ¿Hay contradicciones?
3. **Ejecutabilidad:** ¿Es verificable por CI, interpretable por IA o utilizable por humanos sin fricción?
4. **Neutralidad:** ¿Es agnóstico de plataforma/runtime/lenguaje? Si no, ¿está justificado?
5. **Actualidad:** ¿Refleja prácticas y tecnologías vigentes? ¿Está obsoleto?
6. **Mantenibilidad:** ¿Es fácil de mantener, actualizar y extender?
7. **Alineación con la Visión:** ¿Contribuye directamente a la visión de "sistema operativo de gobernanza"?
8. **Eficiencia y riqueza topológica (obligatorio):** Para cada topología aceptada, inspecciona la cobertura y la paridad de los rulesets nativos y políticas OPA, la calidad y trazabilidad de sus datos (manifiesto, corpus, ADRs, contratos y evidencias), y oportunidades de reducir latencia, consumo de tokens, tamaño de contexto, I/O, duplicación y trabajo de CI. Identifica controles ejecutables que falten, reglas redundantes o costosas, datos huérfanos o pobres, y relaciones que deberían incorporarse al catálogo topológico. No declares una topología madura si su información no permite adopción, operación, validación y evolución sin reconstrucción manual.

Antes de emitir resultados, Wilson debe confirmar explícitamente que este análisis cubrió cada topología aceptada y ambos motores de reglas. Toda oportunidad repetible debe convertirse en un `GT-*` priorizado; toda optimización que no pueda automatizarse debe documentar la razón y la métrica que permitirá reevaluarla.

---

## 4. Pre-Audit: Limpieza Automática de Archivos Temporales

**ANTES de iniciar el análisis, ejecuta la limpieza automática:**

```bash
node .harness/scripts/cleanup-temp-files.mjs
```

Este script elimina automáticamente:

* Archivos `.tsbuildinfo` (compilación TypeScript)
* Directorios de cobertura (`coverage/`, `.nyc_output/`) generados por herramientas de test
* Reportes generados en `.harness/reports/` y `.harness/evidence/`
* Archivos temporales en `.harness/tmp/`
* Archivos `.log`, `.tmp`, `.cache`, `.swp`, `.bak`, `.orig`, `.rej`

**Comportamiento seguro:** El script detecta directorios temporales por segmento de path exacto (no por subcadena), y omite todos los archivos rastreados por `git ls-files` aunque su nombre contenga palabras como `coverage`. Scripts como `bilingual-coverage.mjs`, `coverage-dashboard.mjs` o `26-validate-topology-rule-coverage.mjs` **nunca** serán eliminados porque son archivos rastreados.

> **BLOQUEANTE:** Si el script elimina un archivo rastreado por Git, la auditoría debe detenerse de inmediato. Restaura los archivos con `git checkout -- <path>` e investiga la causa antes de continuar.

---

## 5. Instrucción OBLIGATORIA de Ejecución y Salida

No generes un nuevo documento suelto. **Debes leer, analizar y modificar directamente los siguientes archivos:**

1. **`reference/governance/standards/vision/gap-tracking.md` (y su contraparte `.es.md`)**:
   - Inserta las nuevas brechas (gaps) o tareas de refactoring estructural detectadas en la tabla principal.
   - Ordena rigurosamente por Prioridad (Crítica > Alta > Media > Baja) y dentro de cada prioridad, por Categoría.
   - Utiliza IDs consecutivos (ej. si el último es GT-129, continúa con GT-130).

2. **`reference/governance/standards/vision/gap-reference-catalog.md` (y su contraparte `.es.md`)**:
   - Por cada ítem agregado en la tabla de tracking, debes crear el detalle en el catálogo, especificando:
     - **Propósito:** El motivo y alcance de la brecha u oportunidad.
     - **Evidencia actual:** El estado o problema actual.
     - **Hecho cuando (Done when):** Los criterios de aceptación claros para cerrar el gap.
     - Para hallazgos de topología, incluye el artefacto Native, OPA, manifiesto/corpus y evidencia de rendimiento o consumo afectados.

3. **Artefacto Resumen Opcional (`wilson-audit-summary.md`)**:
    - Como entregable complementario (no persistido en el repositorio como código final), puedes generar un artefacto para el usuario con:
      - Resumen Ejecutivo (puntuación de salud y madurez global).
      - Backlog de refactoring estructural sugerido (Eliminar, Mover, Crear, Fusionar archivos).
      - Mapa de Calor por Topología.
      - Plan de Implementación Priorizado (Fases 1, 2 y 3).
```

---

## The BMAD Agent Evolution Prompt

To execute a BMAD agent evolution analysis, provide the following prompt to your active LLM context:

```markdown
# PROMPT: ANÁLISIS DE EVOLUCIÓN DE AGENTES BMAD

Actúa como **Winston** (`@winston`), el Arquitecto Principal del proyecto.

## 1. Contexto

Evolith Core contiene un ecosistema de agentes BMAD (Business, Management, Architecture, Development) definidos en `.bmad-core/` y `.harness/agents/`. Estos agentes son personas especializadas con contratos operacionales, pero actualmente funcionan como definiciones estáticas que dependen de que un LLM lea sus contratos manualmente.

## 2. Objetivo

Analiza el ecosistema Evolith y revisa cómo los agentes BMAD pueden evolucionar para convertirse en una capa inteligente de gobierno, automatización y mejora continua.

Debes inspeccionar el core, documentación, rulesets, políticas OPA, scripts, arquitectura, épicas, historias de usuario y flujos actuales. Luego identifica cómo enriquecer los agentes con nuevas skills, reglas, prompts, validaciones, automatizaciones y capacidades de descubrimiento de mejoras.

## 3. Alcance del Análisis

Inspecciona:
- `.bmad-core/` — definiciones de agentes, workflows, AGENTS.md
- `.harness/agents/` — contratos operacionales
- `.harness/playbooks/` — playbooks de auditoría y gobernanza
- `rulesets/` — rulesets y políticas OPA
- `.harness/scripts/` — scripts CI y validación
- `reference/governance/` — estándares SDLC
- `reference/architecture/` — ADRs y topologías
- `.github/workflows/` — CI/CD pipelines

## 4. Criterios de Evaluación

Para cada agente, evalúa:
1. **Autonomía:** ¿Puede ejecutar tareas sin intervención humana constante?
2. **Componibilidad:** ¿Sus skills son modulares y reutilizables?
3. **Observabilidad:** ¿Sus acciones son trazables y auditables?
4. **Feedback loop:** ¿Puede detectar mejoras y proponer cambios?
5. **Integración:** ¿Se conecta con las herramientas existentes (CI, OPA, gap tracking)?

## 6. Entregable

Genera una propuesta accionable, no teórica, que indique exactamente:
- Qué cambiar, qué agregar, qué automatizar
- Qué agentes mejorar, qué reglas crear, qué riesgos controlar
- Mejoras por agente, skills nuevas, rulesets nuevos
- Integración con OPA, CI/CD, QA, seguridad, monitoreo
- Scripts recomendados, automatizaciones, controles de aprobación humana
- Roadmap por fases, quick wins, priorización por impacto y esfuerzo

Piensa como arquitecto empresarial, platform engineer, DevOps lead, security engineer y product strategist.
```

---

## The BMAD Agent Evolution Prompt (English)

```markdown
# PROMPT: BMAD AGENT EVOLUTION ANALYSIS

Act as **Winston** (`@winston`), the Principal Architect.

## 1. Context

Evolith Core contains a BMAD agent ecosystem defined in `.bmad-core/` and `.harness/agents/`. These agents are specialized personas with operational contracts, but currently function as static definitions relying on LLM context reading.

## 2. Objective

Analyze the Evolith ecosystem and review how BMAD agents can evolve into an intelligent layer of governance, automation, and continuous improvement.

Inspect the core, documentation, rulesets, OPA policies, scripts, architecture, epics, user stories, and current flows. Then identify how to enrich agents with new skills, rules, prompts, validations, automations, and improvement discovery capabilities.

## 3. Scope

Inspect:
- `.bmad-core/` — agent definitions, workflows, AGENTS.md
- `.harness/agents/` — operational contracts
- `.harness/playbooks/` — audit and governance playbooks
- `rulesets/` — rulesets and OPA policies
- `.harness/scripts/` — CI and validation scripts
- `reference/governance/` — SDLC standards
- `reference/architecture/` — ADRs and topologies
- `.github/workflows/` — CI/CD pipelines

## 4. Evaluation Criteria

For each agent, evaluate:
1. **Autonomy:** Can it execute tasks without constant human intervention?
2. **Composability:** Are its skills modular and reusable?
3. **Observability:** Are its actions traceable and auditable?
4. **Feedback loop:** Can it detect improvements and propose changes?
5. **Integration:** Does it connect with existing tools (CI, OPA, gap tracking)?

## 5. Deliverable

Generate an actionable, non-theoretical proposal specifying exactly:
- What to change, add, and automate
- Which agents to improve, rules to create, risks to control
- Per-agent improvements, new skills, new rulesets
- Integration with OPA, CI/CD, QA, security, monitoring
- Recommended scripts, automations, human approval controls
- Phased roadmap, quick wins, impact/effort prioritization

Think as enterprise architect, platform engineer, DevOps lead, security engineer, and product strategist.
```
