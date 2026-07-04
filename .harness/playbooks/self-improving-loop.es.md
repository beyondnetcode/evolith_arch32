# Bucle de Mejora Continua del Harness Evolith

> **Navegación Bilingüe:** [English Version](./self-improving-loop.md)

**Estado:** Playbook Activo  
**Responsable:** Evolith Architecture Board  
**Última Actualización:** 2026-07-03

## Propósito

Definir el bucle operativo que permite a los agentes Evolith mejorar el harness sin depender de memoria implícita del LLM. El bucle convierte cada ejecución relevante en evidencia trazable, mapea hallazgos abiertos al tablero canónico de gaps y promueve lecciones repetidas a reglas, skills, playbooks, schemas o validadores CI.

## Contrato del Bucle

| Etapa | Responsable | Entrada | Salida | Gate |
|---|---|---|---|---|
| Detectar | Harness Orchestrator / `@winston` | Tarea, estado del repo, tablero de gaps, evidencia runtime | Hallazgos y riesgos candidatos | Los hallazgos citan rutas fuente |
| Contexto | Harness Orchestrator | Reglas globales, rol, tarea, artefactos recuperados | Paquete de contexto mínimo | Se listan las fuentes de contexto |
| Ejecutar | Rol BMAD asignado | Paquete de contexto y contrato de tarea | Archivos modificados, reporte o bloqueo | Sin bypass de límites Core/Tracker |
| Validar | `@qa` / `@devops` | Diff, checks, schemas, policies | Evidencia de validación reproducible | Gates relevantes ejecutados o bloqueo registrado |
| Registrar | `@winston` / `@sm` | Hallazgos y resultado de validación | Gap `GT-*`, registro de cierre o racional no-op | Tracker canónico actualizado |
| Aprender | `@architect` / `@docs` | Hallazgo repetido o nuevo estándar | Regla, skill, playbook, schema o docs | Paridad EN/ES y validación preservadas |
| Completar | Harness Orchestrator | Evidencia, próximos pasos, riesgo residual | Registro JSONL de progress audit | Registro conforme al schema de progress audit |

## Presupuesto de Contexto

| Tipo de Contexto | Presupuesto | Regla |
|---|---:|---|
| Reglas globales | <= 2k tokens | Cargar solo `AGENTS.md` y `.harness/rules/global-rules.md` salvo que una regla referencie otro artefacto. |
| Rol de agente | <= 1k tokens | Cargar solo la persona o contrato de skill asignado. |
| Contexto de tarea | <= 4k tokens | Leer los archivos fuente mínimos que prueban el problema. |
| Docs recuperadas | <= 8k tokens | Preferir enlaces, índices y extractos focalizados antes que volcados completos del corpus. |
| Extractos de código | Según necesidad | Leer archivos y rangos exactos; evitar concatenación amplia. |
| Schema de salida | Compacto | Usar JSON/JSONL para salidas de máquina y Markdown para razonamiento humano. |

## Artefactos Requeridos

| Artefacto | Propósito |
|---|---|
| [AGENTS.md](../../AGENTS.md) | Contrato global del repositorio para agentes. |
| [Reglas Globales](../rules/global-rules.md) | Reglas vinculantes de validación y gobernanza. |
| [Personas de Agentes](../agents/agent-specs.es.md) | Contratos de rol y expectativas de handoff. |
| [Schema de Progress Audit](../schemas/progress-audit.schema.json) | Contrato de eventos JSONL para evidencia de ejecución. |
| [Tracking de Gaps](../../reference/core/control-center/gaps/gap-tracking.es.md) | Fuente única de verdad para trabajo abierto. |
| [Evidencia de Cierre de Gaps](../../reference/core/control-center/evidence/gap-closure-evidence.json) | Registro de cierre machine-readable. |
| [Manifest del Harness](../manifest.yaml) | Contrato de capacidades descubribles por runtime. |

## Registro de Progress Audit

Cada ejecución aprobada del bucle debe emitir un objeto JSON por línea usando `.harness/schemas/progress-audit.schema.json`. Una ejecución puede ser local, CI, programada o disparada por runtime, pero debe declarar:

- id de ejecución, timestamp, agente, rol, tarea, trigger, modelo/proveedor cuando se conozca
- fuentes de contexto, archivos leídos, archivos modificados
- decisiones, riesgos, validaciones, estado, evidencia y próximos pasos
- estimados de tokens y costo cuando el entorno de ejecución pueda proveerlos

Usa la skill MVP para crear un snapshot:

```bash
node .harness/scripts/skills/self-improving-loop.mjs --task "audit harness drift" --agent @winston --dry-run
```

Anexa un registro aprobado como JSONL:

```bash
node .harness/scripts/skills/self-improving-loop.mjs --task "audit harness drift" --agent @winston --append .harness/reports/progress-audit.jsonl
```

## Reglas de Aprendizaje

1. Un hallazgo repetido debe convertirse en uno de: `GT-*`, actualización de regla, actualización de skill, actualización de playbook, actualización de schema o validador CI.
2. Un gap solo puede pasar a `DONE` cuando `gap-closure-evidence.json` registra commit real, evidencia, comandos de validación y disposición de dependencias.
3. Una nueva regla arquitectónica debe preservar paridad Native y OPA.
4. Un cambio documental o de contrato de agente debe preservar paridad EN/ES.
5. Una capacidad runtime debe permanecer detrás de puertos/adaptadores y no debe incrustar estado de lifecycle de tenant/producto en Evolith Core.
6. Un comportamiento específico de modelo debe aislarse detrás de un adaptador de proveedor o documentarse como limitación no portable.

## Validación

Ejecuta el conjunto mínimo relevante:

```bash
node .harness/scripts/ci/01-validate-docs.mjs
node .harness/scripts/ci/04-check-bilingual-parity.mjs
node .harness/scripts/generate-executive-summary.mjs --check
node .harness/scripts/ci/08-validate-tracking.mjs
```

Se espera que `08-validate-tracking.mjs` falle hasta que cada gap histórico `DONE` tenga evidencia semántica de cierre; ese trabajo residual está registrado como `GT-417`.
