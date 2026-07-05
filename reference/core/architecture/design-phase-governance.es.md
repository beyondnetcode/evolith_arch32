# Fase Design & Arquitectura — Gobernanza (Canónico)

> **Navegación Bilingüe:** [English Version](./design-phase-governance.md)

**Estado:** Activo · **Decisión:** [ADR-0104](./adrs/core/0104-topology-driven-advisory-design-governance.es.md) · **Épico:** GT-425 (F0–F8)

---

## 1. Qué hace el Core en Design

Evolith Core gobierna la fase Design como un **Evaluation Engine advisory** (ADR-0101): **recomienda, valida y mide madurez técnica** sobre un catálogo extensible de bloques arquitectónicos. Es **stateless** y **no vinculante** — el gate del tenant decide cualquier bloqueo; el Tracker persiste el estado.

La unidad de evaluación es la **iniciativa** (agrupada o sola); stories/backlog son `ExternalReference`, nunca entidades de Core.

## 2. El blueprint es la caja de bloques

Un **blueprint es un esquema detallado que guía el desarrollo de un proyecto, proceso o sistema.** Se compone de **bloques** por **concerns** (frontend/backend/services/mobile/data) bajo **Convention over Configuration** — un nuevo bloque/concern/topología se añade por convención (vía el registry), nunca cambiando el motor.

## 3. El flujo de punta a punta

```
señales ──► recomendación de topología ──► confirmar composición (mixable)
        (F5)                          (evolith.yaml design.topology)
   ──► componer blueprint (bloques por concern, F3)
   ──► Core evalúa: MADUREZ técnica + artefactos faltantes + desviaciones→ADR (F4)
   ──► deriva criterios downstream de Construcción/Calidad/Despliegue (F7)
   Todo advisory / no vinculante. El tenant confirma y decide el bloqueo.
```

## 4. Artefactos y contratos

| Concern | Artefacto |
|---|---|
| Perfil por topología | `spec.designProfile` en cada [topology manifest](./topologies/README.md) |
| Composición del blueprint | [`blueprint.schema.json`](../../../src/rulesets/schema/blueprint.schema.json) |
| Bloque de diseño (base) | [`design-block.schema.json`](../../../src/rulesets/schema/design-block.schema.json) |
| Block-type registry (22 tipos) | [`design-block-registry.json`](../../../src/rulesets/schema/design-block-registry.json) |
| Template reutilizable | [`design-template.schema.json`](../../../src/rulesets/schema/design-template.schema.json) |
| Reglas de recomendación de topología | [`topology-recommendation.rules.json`](../../../src/rulesets/architecture/topology-recommendation.rules.json) |
| Contratos de evaluación | `EvaluationContext.design` / `EvaluationResult.results.design` |

## 5. Cómo consumirlo

| Superficie | Cómo |
|---|---|
| **Core API** | `POST /api/v1/evaluate` con `kinds: ["design"]`; `POST /api/v1/architecture/recommend-topology` |
| **MCP** | `evolith-evaluate` (kind `design`); `evolith-topology-recommend` (follow-on) |
| **CLI** | `evolith evaluate --kind design`; `evolith topology recommend` (follow-on) |
| **Agentes** | skills `design-template-proposal` (simple/medio/complejo) + `template-promotion` (UP-NNN) |

## 6. Crecimiento (Open-Core)

Todo aquí es extensible por la comunidad bajo gobernanza. Los tenants mantienen una **colección privada** de ADRs/templates/rulesets (scope Tracker, ADR-0104 §11); los templates reutilizables se promueven al corpus canónico vía **Upstream Proposals (UP-NNN)** y revisión del Architecture Board, con tiers `community → certified → official`.

## 7. Referencias

- [ADR-0104 — Gobernanza Advisory de Design Dirigida por Topología](./adrs/core/0104-topology-driven-advisory-design-governance.es.md)
- [Flujo de Design del Tracker (registro de aprendizaje)](../foundations/agent-skills/tracker-design-flow.es.md)
- [Modelo de Autoridad de Agentes](../foundations/agent-skills/agent-authority-model.es.md)
- Verificación E2E: `src/packages/core-domain/src/evaluation/design-flow.e2e.spec.ts`

---
[Volver al Hub de Arquitectura](./README.md)
