# Evolith Tracker — Flujo de Comunicación de Design & Architecture (Registro de Aprendizaje de Agentes)

> **Navegación Bilingüe:** [English Version](./tracker-design-flow.md)

**Estado:** Activo — Evolutivo (sesión de diseño guiada por el dueño)
**Dueños:** `@winston` (lente de arquitectura) · `@po` (lente de negocio)
**Última Actualización:** 2026-07-04
**Alcance:** Design & Architecture de Evolith Tracker (Fase 2 — Design Baseline). Advisory, dirigido por topología, centrado en el blueprint. Cross-repo.
**Autoridad:** Registro de aprendizaje/conocimiento. La decisión canónica es [ADR-0104](../../architecture/adrs/core/0104-topology-driven-advisory-design-governance.es.md); el backlog de implementación es el épico **GT-425** (F1–F8 = GT-426…GT-433). Continúa [Flujo de Discovery del Tracker](./tracker-discovery-flow.es.md); consistente con [Modelo de Autoridad de Agentes](./agent-authority-model.es.md).

---

## 1. Propósito

Capturar el **flujo Design** de punta a punta para una iniciativa: cómo confirma una topología, compone su blueprint desde bloques, es asesorada/validada/medida en madurez por Core (no vinculante), itera, y deriva los criterios downstream — bajo la postura advisory congelada en ADR-0104.

## 2. Flujo Design de Punta a Punta

```
Iniciativa (de Discovery: agrupada o sola, topología recomendada, borrador de blueprint progresivo)
        │
  ① CONFIRMA TOPOLOGÍA (posible mixta) en evolith.yaml (design.topology.confirmed)
        │   Core deriva el designProfile = UNIÓN sobre la composición confirmada
        ▼
  ② COMPONE EL BLUEPRINT (la caja de bloques — la guía de desarrollo)
        │   multi-concern: frontend · backend · services · mobile · data
        │   catálogo efectivo = corpus canónico de Core ∪ colección privada del tenant
        │   ├─ el tenant pide asesoría de arquitectura gobernada (A3) — opcional
        │   ├─ los agentes de Core proponen proactivamente templates/ideas (simple/medio/complejo)
        │   └─ el autoring ocurre en el TRACKER (herramientas de diseño); Core no diseña
        ▼
  ③ VALIDA + MIDE MADUREZ (Core, advisory, stateless)
        │   completitud · trazabilidad vs blueprints/ADRs/prácticas-de-código
        │   desviación → recomienda ADR · score de madurez (por concern + agregado)
        │   salida NO VINCULANTE (recommendations/gaps/risks/DecisionRecommendation)
        ▼
  ④ ITERA (el blueprint madura progresivamente; versionado; evidencia en el Tracker)
        │   quién bloquea = el gate configurable del TENANT — Core nunca bloquea
        ▼
  ⑤ DERIVA CRITERIOS DOWNSTREAM (blueprint = contrato generativo)
        │   requerimientos y criterios de Construcción / Calidad / Despliegue
        │   → recomendaciones que el Tracker usa para configurar los gates F3/F4/F5
        ▼
  ⑥ SALE → CONSTRUCCIÓN (blueprint como guía + criterios downstream derivados)

  ⟳ LOOP DE CRECIMIENTO (paralelo): el tenant crea templates tenant-scope (Tracker) o
     solicita promoverlos a Core vía UP-NNN → Board → corpus canónico.
     Todo auditado en el Tracker; Core sigue stateless.
```

## 3. Decisiones del Flujo (DS-01 … DS-08)

| ID | Decisión | Lente `@po` (negocio) | Lente `@winston` (arquitectura) |
|---|---|---|---|
| DS-01 | **Blueprint = esquema detallado que guía el desarrollo** de un proyecto/proceso/sistema (canónico, ADR-0104 §1). | El entregable de Design es una guía de desarrollo usable; su calidad es lo que importa. | Artefacto central; todo lo demás (bloques, validación, downstream) le sirve. Enshrinado en el glosario. |
| DS-02 | **Postura advisory:** Core recomienda/valida/mide madurez, no vinculante; el gate del tenant decide el bloqueo. | Core es un asesor confiable, no un gatekeeper — baja fricción, sube calidad. | Consistente con ADR-0101; la salida es `Recommendation`/madurez, nunca un bloqueo. |
| DS-03 | **Topología confirmada en Design** (recomendada en Discovery), opcional/sobreescribible/extensible, **mixable**. | El tenant es dueño de su camino de arquitectura; sin escalera forzada. | `design.topology.confirmed` = composición; designProfile derivado por unión (estricto-gana, incompatibilidad→ADR). |
| DS-04 | **Blueprint = caja de bloques, multi-concern, CoC.** Compuesto desde bloques/referencias por frontend/backend/services/mobile/data; extensible por convención. | El tenant arma diseños libremente desde un catálogo; conceptos nuevos se añaden en el tiempo. | Block-type registry + convenciones de composición; extensibilidad perpetua sin rediseñar el motor. |
| DS-05 | **Catálogo efectivo = Core canónico ∪ colección privada del tenant.** El tenant mantiene sus propios ADRs/templates/rulesets a nivel de Tracker. | Inteligencia personalizada a la realidad del tenant; más rica que el Core puro. | Core sigue stateless: el tenant pasa su colección como refs en el `EvaluationContext`; nunca persiste (ADR-0104 §11). |
| DS-06 | **Asesoría de arquitectura gobernada (A3) + propuestas proactivas de agentes** (simple/medio/complejo). | Expertise de arquitectura self-service; los agentes aceleran al tenant. | Corre sobre el conocimiento canónico de Core detrás de `IAgentEnginePort`; evidencia persistida en Tracker; Core stateless. |
| DS-07 | **La madurez es la salida primaria**, no vinculante; la iteración madura el blueprint (versionado, auditado en Tracker). | El score le dice al tenant qué tan buena guía es y dónde mejorar. | Madurez por concern + agregado; desviación→ADR; el gate del tenant la consume. |
| DS-08 | **Blueprint = contrato generativo:** deriva criterios de Construcción/Calidad/Despliegue. | Design de-risquea todo el ciclo; menos sorpresas downstream. | Derivación stateless (blueprint→criterios como recomendaciones); el Tracker configura los gates F3/F4/F5. |
| DS-09 | **El ciclo de iteración reutiliza el patrón de terminación configurable** del ciclo de rechazo de Ingreso (L-004/L-011): el blueprint madura por versiones hasta alcanzar la madurez objetivo o hasta que el tenant acepta el estado actual; la terminación es configurable (default de Core + override de tenant). | La iteración es acotada, no infinita; el tenant fija la política. | Reutilizar una política estilo `rejectionCycle` como `designIteration`; blueprint versionado en el grafo de evidencias del Tracker; evaluación de madurez re-entrante. |
| DS-10 | **Ponderación de madurez = universal + derivado por topología.** Los bloques universales (blueprint, estrategia de testing, ADRs, cumplimiento de topología, madurez técnica) siempre se puntúan y pesan el agregado; los bloques derivados por topología (infra, devops, unit-test, build, performance) se puntúan cuando la composición confirmada los exige y contribuyen cuando están presentes. | Un pequeño núcleo universal siempre se mide; el resto pesa cuando la topología lo pide. | Agregado = ponderado sobre universal (siempre) + derivado por topología (condicional-presente); pesos configurables (default de Core + override de tenant, según L-006). |

## 4. Implicaciones Cross-Repo y de Core

- **Unidad = iniciativa** (agrupada o sola); stories/backlog son `ExternalReference` del Tracker, nunca evaluados (ADR-0101/GT-375).
- **Autoring en el Tracker, gobernanza en Core:** las herramientas de diseño viven en el Tracker; Core recomienda/valida/mide y recibe propuestas de promoción. Statelessness preservada en todo momento.
- **Open-Core:** todo el conocimiento de diseño es extensible por la comunidad bajo gobernanza (tiers official/certified/community; UP-NNN; certificación en CI).
- **Implementación** rastreada como épico **GT-425** (F1–F8); el código está diferido hasta finalizar el flujo de diseño.

## 5. Resuelto (2026-07-04)

- ✅ **Ciclo de iteración** → DS-09: reutiliza el patrón de terminación configurable del ciclo de rechazo de Ingreso (L-004/L-011).
- ✅ **Ponderación de madurez** → DS-10: bloques universales siempre puntuados; bloques derivados por topología puntuados cuando la composición los exige (split confirmado).

## 6. Procedencia

Consolidado desde la sesión de diseño guiada por el dueño (2026-07-04), siguiendo los bloques de Ingreso y Discovery. Decisión canónica: [ADR-0104](../../architecture/adrs/core/0104-topology-driven-advisory-design-governance.es.md). Implementación: épico GT-425.

---

_Ver [Persona Winston](./winston.es.md) · [Persona PO](./po.es.md) · [Flujo de Discovery del Tracker](./tracker-discovery-flow.es.md) · [Modelo de Autoridad de Agentes](./agent-authority-model.es.md) · [ADR-0104](../../architecture/adrs/core/0104-topology-driven-advisory-design-governance.es.md)._
