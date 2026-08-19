# Evolith Tracker — Flujo de Comunicación de Discovery (Registro de Aprendizaje de Agentes)

> **Navegación Bilingüe:** [English Version](./tracker-discovery-flow.md)

**Estado:** Activo — Evolutivo (sesión de diseño guiada por el dueño)
**Dueños:** `@winston` (lente de arquitectura) · `@po` (lente de negocio)
**Última Actualización:** 2026-07-04
**Alcance:** Discovery de Evolith Tracker (Fase 1 — Business Sign-Off). Cross-repo: introduce el primer canal de consulta Tracker→Core-arquitectura.
**Autoridad:** Registro de aprendizaje/conocimiento, no una regla vinculante. Los cambios vinculantes requieren un ADR (Core) o artefacto de diseño del Tracker. Continúa [Flujo de Ingesta del Tracker](./tracker-intake-flow.es.md); consistente con [Modelo de Autoridad de Agentes](./agent-authority-model.es.md).

---

## 1. Propósito

Capturar las decisiones guiadas por el dueño sobre la **fase Discovery de Evolith Tracker**: sus artefactos y criterios, la nueva capability de **asesoría de arquitectura gobernada** (primer puente Tracker→Core-arquitectura), el blueprint progresivo, y el modelo de PRD. Cinco decisiones (D-001…D-005) cerraron el bloque Discovery el 2026-07-04.

## 2. Modelo de Discovery Consolidado

```
Iniciativa PENDIENTE ──(activación agéntica/mixta, L-012)──► DISCOVERY (Fase 1)
                                                              │
  Artefactos: Discovery Canvas · BusinessCase · TechnicalJustification
              · PRD (obligatorio)  ◄── D-004
                                                              │
  ┌── Asesoría de Arquitectura (capability híbrida gobernada, A3) ◄── D-002
  │   el tenant invoca con SU agente → corre sobre conocimiento canónico de Core
  │   (Architecture Hub: blueprints · topologies · ADRs) vía MCP/API
  │        │  (Core stateless; evidencia persistida en Tracker — D-005)
  │        └──► produce un BORRADOR de blueprint progresivo ◄── D-003
  │             (opcional, NO bloquea el Gate 1; Design lo formaliza)
                                                              │
                        Gate 1: Business Sign-Off (criterios inteligentes)
                                       │
                                  APROBADA
                                       │
                   backlogMode: generate | initiative-only ──► Design
```

## 3. Registros de Aprendizaje (D-001 … D-005)

| ID | Decisión | Lente `@po` (outcome de negocio) | Lente `@winston` (arquitectura) |
|---|---|---|---|
| D-001 | Discovery tiene **artefactos + criterios** (patrón de gate inteligente, L-006). Gate 1 = Business Sign-Off. | Los criterios de Discovery son configurables (Core default + tenant override). | Mismo motor de gate inteligente; el set de artefactos de Discovery incluye ahora el PRD — reconciliar con el agregado `Initiative` actual que lo omite. |
| D-002 | **Asesoría de Arquitectura = capability híbrida gobernada (A3):** el tenant pide apoyo para diseñar su feature; invoca con su propio agente pero corre sobre el conocimiento canónico de Core (blueprints/topologies/ADRs). Primer puente Tracker→Core-arquitectura. | Nuevo valor self-service: expertise de arquitectura gobernada durante Discovery, de-risquea el diseño antes de construcción; eje de producto/monetización. | Encaja con el modelo de autoridad ([[agent-authority-model]]): Hermes gestiona, Core posee el conocimiento, el tenant consume vía puertos. La asesoría NO cede autoridad. Superficie: MCP/Core API sobre el Architecture Hub + `architect`/Winston detrás de `IAgentEnginePort`. Solo contexto gobernado. |
| D-003 | **Blueprint progresivo:** la asesoría de-risquea en Discovery **y** un BORRADOR de blueprint empieza a gestarse ahí (apoyo opcional que el tenant puede pedir); Design (Fase 2) lo formaliza. El borrador **NO bloquea el Gate 1**. | El blueprint madura progresivamente desde Discovery — menos sorpresas en el gate de Design; la asesoría es apoyo opt-in, no un obstáculo. | `TechnicalBlueprint` gana un estado draft temprano originado en Discovery; Design lo promueve a formal (Arquitectura Progresiva). El borrador referencia la evidencia de asesoría que lo produjo. |
| D-004 | **PRD obligatorio** en Discovery. Solo el PRD es **no-overrideable** (piso canónico, L-010); Canvas/BusinessCase/asesoría son overrideables por tenant. | El PRD es el artefacto de Discovery no-negociable. | Schema del PRD en Core; el Gate 1 exige el PRD siempre. |
| D-005 | **Todo deja rastro de evidencia/auditoría en el Tracker; Core es stateless** (ADR-0101). | Cada apoyo/consulta/decisión es auditable en el grafo de evidencias del Tracker — trazabilidad completa idea→producción. | **Frontera dura:** la asesoría *corre sobre* el conocimiento canónico de Core (stateless: contexto → recomendación), pero la **evidencia de la sesión se persiste en el Tracker** (dueño del estado de gobernanza). El "Architecture Advisory Record" es una entidad del Tracker que referencia el resultado stateless de Core. Core nunca guarda la sesión. Refuerza ADR-0101 / Core = Evaluation Engine. |

## 4. Implicaciones Cross-Repo y de Core

- **Primer canal Tracker→Core-arquitectura (D-002):** requiere una superficie de asesoría gobernada sobre el Architecture Hub (MCP/Core API), con el razonamiento de `architect`/Winston detrás de `IAgentEnginePort`. Core sigue stateless; el Tracker persiste la evidencia de asesoría (D-005).
- **PRD como piso canónico (D-004):** el schema del PRD es candidato al corpus de Core (`src/rulesets/schema/`), heredado por Tracker y satélites; no-overrideable por L-010.
- **Blueprint progresivo (D-003):** `TechnicalBlueprint` gana un estado draft originado en Discovery que alimenta Design — refinamiento de Arquitectura Progresiva de EPIC-001.
- **Reconciliación de agregado:** el agregado `Initiative` del Tracker debe listar el PRD explícitamente (hoy solo lista Canvas/BusinessCase/TechnicalJustification/Checklist).

## 5. Ítems Abiertos

- Definir la entidad **Architecture Advisory Record** en el Tracker (campos, enlace al resultado stateless de Core, enlace al borrador de blueprint).
- Confirmar cuáles de Canvas / asesoría están habilitados por defecto vs. puramente opt-in por tenant.
- Ciclo de vida del borrador de blueprint: cómo Design promueve un borrador de Discovery a un `TechnicalBlueprint` formal.

## 6. Procedencia

Capturado durante una sesión de flujo de producto guiada por el dueño (2026-07-04), continuando el bloque de Ingreso. Próximo bloque: **Design (Fase 2)** — formalización del blueprint. La promoción de cualquier ítem a reglas vinculantes de Core requiere un ADR.

---

_Ver [Persona Winston](./winston.es.md) · [Persona PO](./po.es.md) · [Flujo de Ingesta del Tracker](./tracker-intake-flow.es.md) · [Modelo de Autoridad de Agentes](./agent-authority-model.es.md)._
