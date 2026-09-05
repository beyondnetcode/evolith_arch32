# ADR-0127: Se retira Knowledge-First Discovery y, con ella, el concepto KDD

> **Navegación Bilingüe:** [English](./0127-retire-knowledge-first-discovery.md) · Español (este documento)

| Campo | Valor |
|---|---|
| **Estado** | Aceptado |
| **Fecha** | 2026-08-18 |
| **Decisores** | Product Owner (decisión del dueño) · Architecture Board |
| **Historia técnica** | Una subfase-gate, siete plantillas de artefacto y un módulo opcional del PRD por tenant, descritos en prosa en dos repositorios e implementados en ninguno |

<!-- implementation-status: reference/core/sdlc/01-playbooks/phase-1-business-signoff.es.md,reference/core/sdlc/sdlc-evolith-artifact-mapping.es.md,reference/core/foundations/agent-skills/tracker-discovery-flow.es.md -->
> **Estado de implementación en este repositorio: completo** (2026-08-18).
> No había código que quitar: el barrido es documental por construcción, que es justamente el
> hallazgo sobre el que se apoya este ADR. Verificado por búsqueda tras el cambio — `KDD` y
> `knowledge-first` solo sobreviven en `CHANGELOG.md` y en el `ADR-0103`, ambos a propósito, como
> registros de lo que era cierto cuando se escribieron.

## Status

Aceptado — 2026-08-18. En vigor.

## Contexto

Bajo las mismas tres letras viajaban dos cosas distintas, y ninguna llegó a construirse.

**Fase 1.1 — Knowledge-First Discovery.** Una subfase opcional y progresiva dentro de la Fase 1,
escalando de Nivel 1 a Nivel 4, con su propia compuerta de preparación y siete plantillas de
artefacto: Discovery Knowledge Brief, Assumptions & Questions Log, Discovery Context Pack,
Capability Map, Epic Candidate Matrix, Story Seed Bank y Discovery Readiness Gate.

**KDD — Knowledge-Driven Development.** Una lectura posterior y más estrecha, capturada en la
sesión guiada por el dueño del 2026-07-04 (`tracker-intake-flow` L-009, `tracker-discovery-flow`
D-004): no una subfase, sino una *sección opcional dentro del PRD*, activable por tenant vía
feature-override, con el PRD como piso canónico no-overrideable.

**Ninguna existía en nada ejecutable, y esto se midió en vez de suponerse:**

| superficie | ¿KDD presente? |
|---|---|
| Rulesets del Core (`phase-gates.rules.json`, `artifact-registry.json`) | **no** — cinco gates, fases 1..5; ninguno de los siete artefactos KDD está entre los 33 registrados |
| Código del Core (TypeScript) | **no** — cero ficheros con `KDD`, `knowledge-first`, `knowledgeBrief`, `discoveryReadiness`, `storySeed`, `epicCandidate` |
| CLI | **no** — 31 comandos, cero menciones. `--phase discovery` mapea a la **fase 1 entera** (`phase-id.ts`: `f1: 'discovery'`), no a la 1.1 |
| Servidor MCP | **no** — cero ficheros |
| Código y UI del Tracker | **no** — sin pantalla ni entidad; el menú «Discovery» cuelga Strategic intake, Opportunities e Initiatives |
| `prd.schema.json` | **sin sección KDD** — la decisión D-004 nunca llegó a schema |

Lo que sí existía era prosa, y tenía dientes: el playbook de la Fase 1 convertía *«el nivel de
adopción de la Fase 1.1 ha sido declarado»* en **precondición para abrir el Gate 1**, y tres filas
de su tabla de evidencia llevaban cláusulas condicionadas a niveles de KDD. Una compuerta que nadie
implementa estaba bloqueando, sobre el papel, una compuerta que todo el mundo implementa.

## Decisión

**Ambas lecturas se retiran. Evolith Core y Evolith Tracker dejan de manejar el concepto KDD en
cualquier forma**, y la información relacionada se elimina en vez de archivarse en su sitio.

1. El playbook de la Fase 1.1 y las siete plantillas de artefacto se **borran** (16 ficheros, EN y ES).
2. La precondición de la Fase 1 y toda cláusula condicionada a KDD en su tabla de evidencia se
   **eliminan**; el Gate 1 enuncia ahora sus requisitos sin referirse a ninguna subfase.
3. La tabla `Subfase 01.1` del mapeo de artefactos, la fila del índice de playbooks y las
   referencias a Story Seeds / Epic Candidates en el playbook de Fase 2 y en el índice de plantillas
   se **eliminan**.
4. Las filas de decisión D-004 / L-009 se **reescriben** a lo que las sobrevive: el PRD es el piso
   canónico y el Gate 1 lo exige siempre. La cláusula de la sección KDD opcional desaparece.
5. `CHANGELOG.md` y el `ADR-0103` se **dejan intactos**, a propósito. Son registros de lo que era
   cierto cuando se escribieron; editarlos para ocultar un concepto retirado falsificaría la
   historia que este repositorio conserva deliberadamente.

**El `ADR-0103` queda enmendado por este ADR, no reabierto.** Aquella decisión situó el Architecture
Planning Gate *antes* de Knowledge-First Discovery y descartó embeber la lógica de planificación
*dentro* de la Fase 1.1. Su razonamiento se mantiene; lo que desapareció es su vecino. Leído hoy: el
Planning Gate precede directamente a la **Fase 1 (Business Sign-Off)**, y la opción que descartó
queda sin objeto, no equivocada.

## Consecuencias

**Bueno.** El modelo de cinco fases es ya el mismo en la prosa y en los datos — cinco fases, cinco
gates, y ninguna sexta cosa descrita en ningún otro sitio. El Gate 1 deja de depender de una subfase
que nadie puede ejecutar, así que un satélite que lea el playbook puede de verdad satisfacer sus
precondiciones. Unos cuarenta documentos dejan de describir una capacidad que el producto no tiene.

**Costes, dichos con claridad.** Las siete plantillas eran trabajo real y algunas —el Assumptions &
Questions Log, el Capability Map— son útiles al margen de KDD. Son recuperables desde el historial;
nada aquí afirma que carecieran de valor, solo que Evolith no las gobernará.

**El riesgo que este ADR acepta.** La captura de conocimiento en Discovery queda sin modelar. Si
vuelve, tiene que volver como schema y como regla antes que como playbook: el fallo que registra
esta fila es exactamente el de un concepto de gobierno que vivió meses solo en prosa, fue citado
como precondición por una compuerta real y no se ejecutó ni una vez.

## ADRs Relacionados

- [ADR-0103](./0103-architecture-planning-gate-intake.es.md) — enmendado por este ADR: el Planning
  Gate precede ahora directamente a la Fase 1.
- [ADR-0101](./0101-core-stateless-evaluation-engine.es.md) — el Core es un motor de evaluación sin
  estado; los artefactos que no puede evaluar no son asunto del Core.

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
