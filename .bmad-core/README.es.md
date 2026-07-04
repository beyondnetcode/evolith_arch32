# BMAD Core — Marco de Agentes Evolith

> **Navegación Bilingüe:** [English Version](./README.md)

**Propósito:** Definiciones de agentes, flujos, scripts y herramientas para el Método BMAD operando en Evolith Core.

## Estructura

`.bmad-core/` es la capa de **orquestación** — engine, flujos y estado de ejecución. Las **definiciones** de agentes (personas, skills, checklists) NO están aquí: son fundacionales y viven en [`reference/core/foundations/agent-skills/`](../reference/core/foundations/agent-skills/) (ver [taxonomía del repositorio](../reference/core/control-center/taxonomy/migration-plan.md), Commit 2). Los contratos operativos de agentes viven en [`.harness/agents/`](../.harness/agents/).

| Directorio | Contenido |
|------------|-----------|
| `engine/` | Motor de orquestación BMAD (parser de flujos, ejecutor de pasos, máquina de estados, enforcer de handoffs) |
| `workflows/` | Definiciones de flujos (desarrollo greenfield, cierre de gaps de gobernanza, suite de QA) |
| `state/` | Estado de ejecución de flujos y artefactos |
| `scripts/` | Scripts de utilidad BMAD (limpieza de codificación) |

## Primera Lectura

Cada agente **debe** leer [AGENTS.es.md](./AGENTS.es.md) antes de operar en este repositorio.

## Referencias Clave

- [Reglas Globales](../.harness/rules/global-rules.md)
- [Tablero de Seguimiento de Gaps](../reference/core/control-center/gaps/gap-tracking.es.md)
- [Catálogo de Referencia de Gaps](../reference/core/control-center/gaps/gap-reference-catalog.es.md)
- [Agentes de Arquitectura](./AGENTS.es.md)

---

*Véase [BMAD Method](https://github.com/beyondnetcode/bmad-method) para detalles del método.*
