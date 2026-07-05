# Evolith Tracker — Flujo de Fases Downstream: Construcción · Calidad · Despliegue (Registro de Aprendizaje de Agentes)

> **Navegación Bilingüe:** [English Version](./tracker-downstream-flow.md)

**Estado:** Activo — Evolutivo (sesión de diseño guiada por el dueño)
**Dueños:** `@winston` (lente de arquitectura) · `@po` (lente de negocio)
**Última Actualización:** 2026-07-04
**Alcance:** Fases SDLC downstream de Evolith Tracker — Construcción (Fase 3), Calidad (Fase 4), Despliegue/Release (Fase 5). Cross-repo.
**Autoridad:** Registro de aprendizaje/conocimiento. Consistente con [ADR-0101](../../architecture/adrs/core/0101-core-stateless-evaluation-engine.es.md) (Core stateless) y [ADR-0104](../../architecture/adrs/core/0104-topology-driven-advisory-design-governance.es.md) (postura advisory). Continúa [Flujo de Design del Tracker](./tracker-design-flow.es.md).

---

## 1. Propósito

Capturar cómo fluyen las tres fases SDLC downstream y cómo **participa Evolith Core** en ellas. El enlace clave: el **blueprint (Design) deriva los criterios** de estas fases (GT-432/F7), que configuran sus gates. Core es **advisory** en todas; el Tracker posee toda la ejecución operativa.

## 2. El flujo downstream

```
Blueprint APROBADO (Design)
   │  F7: el blueprint deriva criterios de Construcción/Calidad/Despliegue (recomendaciones)
   ▼
CONSTRUCCIÓN (Fase 3) ── Gate: Build Pass (all Must Have DONE)
   Tracker: Task Board · Sprints · Spec Traceability · Drift Dashboard
   Core (advisory): señales de architecture-drift + evaluación de gate no vinculante
   ▼ Build PASS
CALIDAD (Fase 4) ── Gate: Quality Gate (CFR < 2% · cero defectos críticos · all Must Have pass)
   Tracker: .harness tests · CFR · Defect tracking · Root cleanliness
   Core (advisory): señales de cobertura/calidad + evaluación de gate no vinculante
   ▼ Quality Gate PASS
DESPLIEGUE / RELEASE (Fase 5) ── Gate: Human Sign-Off
   Tracker: Deployment Calendar · Regression · Re-Do Flow · Rollback · DORA/SPACE
   Core (advisory): señales de release-readiness + evaluación de gate no vinculante
   ▼
PRODUCCIÓN
```

## 3. Decisiones del Flujo (DN-01 … DN-05)

| ID | Decisión | Lente `@po` (negocio) | Lente `@winston` (arquitectura) |
|---|---|---|---|
| DN-01 | Tres fases, cada una entra desde el gate anterior: **Construcción** (Build Pass) → **Calidad** (Quality Gate) → **Despliegue** (Human Sign-Off). | Una cadena clara y auditable del diseño aprobado a producción. | Gates F3/F4/F5 como transiciones canónicas; cada uno con evidencia mínima + criterios bloqueantes (agregados del Tracker). |
| DN-02 | **Core es advisory en las tres fases** (opción B): señales continuas no vinculantes **más** evaluación de gate. | Core sigue ayudando después de Design — expone riesgos temprano, no solo en el gate. | Consistente con ADR-0101/ADR-0104: Core mide/recomienda; el gate del tenant decide. Nunca bloquea por sí mismo. |
| DN-03 | **Los criterios derivados del blueprint (F7) configuran estos gates.** | Design de-risquea la entrega: lo planeado se vuelve lo verificado. | `EvaluationResult.results.design.downstreamCriteria` → el Tracker configura los criterios de los gates F3/F4/F5. El contrato generativo hecho realidad. |
| DN-04 | **El Tracker posee toda la ejecución operativa** — Task Board, Sprints, TestCycle, Defect, ReleasePackage, Calendar, Rollback, DORA/SPACE. Core nunca gestiona work items. | La realidad operativa vive donde ocurre el trabajo (Tracker); Core se mantiene liviano. | Core stateless (ADR-0101): recibe evidencia/contexto, devuelve veredictos/recomendaciones; no persiste nada operativo. |
| DN-05 | **Señales advisory continuas por fase:** Construcción → architecture-drift (el `ArchitectureDriftService` de Core); Calidad → cobertura/CFR/calidad; Despliegue → release-readiness. Todas no vinculantes. | Alertas tempranas mejoran la calidad de entrega sin fricción bloqueante. | Reutilizar evaluadores existentes (kinds drift/checkpoint/deployment); exponer como recomendaciones/risks en el `EvaluationResult`. El disparo (schedule/watch) es del runtime/Tracker, no de Core. |
| DN-06 | **Cada fase downstream tiene sus propios ARTEFACTOS + CRITERIOS DE GATE que cumplir** (diagrama conceptual del dueño: cada fase lleva `criterios` y produce `COMPUERTA→checkpoint` + `ARTEFACTOS→evidencias` vía la API interface). Análogo al `designProfile` de Design: un **perfil de artefactos de fase** (required/conditional) + criterios de gate. Evidencia mínima (Visión §5.2): **Construcción** = source+linked work · CI · DoD · resultado de drift · trazabilidad de spec; **Calidad** = test summary · coverage · resultados security/contract · CFR<2% · estado de excepciones; **Despliegue** = release plan · observability · rollback · operational sign-off · deployment evidence. | Cada fase tiene un claro "qué debe existir y pasar" — no solo un checkbox. Evidencia auditable en cada paso. | Un perfil de artefactos por fase (como `spec.designProfile`, GT-427) — en parte **derivado del blueprint** (F7 `downstreamCriteria`), en parte propio de la fase; **derivado por topología + configurable por tenant** (L-006). Core evalúa completitud de artefactos + criterios de gate (advisory, no vinculante); el Tracker persiste la evidencia y el checkpoint. Los sistemas externos notifican el estado de criterios/artefactos vía la API interface. |

## 4. Implicaciones Cross-Repo y de Core

- **Cierra el arco SDLC:** Ingreso → Discovery → Design → **Construcción → Calidad → Despliegue**, todo bajo la misma postura advisory, stateless, no vinculante.
- **Reutilizar antes que construir:** los KindEvaluators `architecture`, `checkpoint`, `deployment` de Core ya existen y cubren las señales advisory downstream; el evaluador `design` ya emite `downstreamCriteria` (F7).
- **Criterios de gate configurables** según el gate inteligente (L-006): default de Core + override de tenant; los criterios derivados del diseño siembran los defaults.
- **Frontera:** stories/backlog/tasks/tests/defects/releases son `ExternalReference` / agregados del Tracker — nunca entidades de Core.

## 5. Ítems Abiertos

- ✅ Spec conceptual definido: [Perfiles de Artefactos Downstream](./downstream-artifact-profiles.es.md) — artefactos required/conditional + criterios de gate por fase para Construcción/Calidad/Despliegue, análogo a `spec.designProfile` (GT-427). Implementación diferida (épico follow-on que espeja GT-425) hasta que aterricen las tareas de background.
- Definir el set concreto de señales downstream que cada evaluador de Core emite por fase (categorías de drift en Construcción; qué señales de calidad en QA; qué checks de readiness en Despliegue).
- Confirmar cómo mapean y siembran los `downstreamCriteria` del blueprint (F7) sobre las definiciones de gate existentes del Tracker (Build Pass / Quality Gate / Human Sign-Off).

## 6. Procedencia

Consolidado desde la sesión guiada por el dueño (2026-07-04), siguiendo Ingreso/Discovery/Design. El épico de gobernanza advisory de Design (GT-425) está completo y ya deriva los criterios de estas fases (F7/GT-432).

---

_Ver [Persona Winston](./winston.es.md) · [Persona PO](./po.es.md) · [Flujo de Design del Tracker](./tracker-design-flow.es.md) · [Gobernanza de la Fase Design](../../architecture/design-phase-governance.es.md)._
