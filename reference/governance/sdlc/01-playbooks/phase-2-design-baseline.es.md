# Playbook de Fase 2 — Línea Base de Diseño Aprobada

> **Navegación Bilingüe:** [English Version](./phase-2-design-baseline.md)

**Fase:** [02 — Diseño y Arquitectura](../README.es.md#fase-02-diseño-y-arquitectura)
**Compuerta de Salida:** Design Baseline Approved (ver gate `phase: 2` en [`phase-gates.rules.json`](../../../../rulesets/sdlc/phase-gates.rules.json))
**Audiencia Principal:** Software Architect, Principal/Staff Engineer, Product Owner, QA/SDET
**Rol Responsable:** Software Architect
**Autoridad de Waiver:** Architecture Board
**Estado:** Aprobado

Este playbook operacionaliza la compuerta Design Baseline Approved. Toda salida de Fase 2 debe demostrar que las decisiones arquitectónicas, los bounded contexts y el comportamiento funcional están documentados, son trazables y se alinean al Reference Blueprint.

---

## 1. Condiciones Previas

- Business Sign-Off de Fase 1 registrado y vigente.
- Reference Blueprint y línea base topológica confirmados.
- Ruta del registro de ADRs establecida para la iniciativa.

---

## 2. Checklist de Recolección de Evidencia

| # | Evidencia Obligatoria | Plantilla / Esquema | Criterio de Aceptación |
|---|---|---|---|
| 1 | Registro de ADRs | [`adr-template.es.md`](../04-artifact-templates/adr-template.es.md) | Toda decisión que cruza fronteras tiene un ADR numerado y aceptado. No quedan decisiones "no documentadas". |
| 2 | Functional Stories | [`functional-story-template.es.md`](../04-artifact-templates/functional-story-template.es.md) · [`functional-story.schema.json`](../../../../rulesets/schema/functional-story.schema.json) | Todas las historias en `Ready` con criterios de aceptación BDD; estándar de redacción cumplido |
| 3 | Alineación con Reference Blueprint | Conjunto de diagramas de arquitectura | Diagramas trazables al Reference Blueprint; las desviaciones llevan ADR |
| 4 | Checklist de Simplicidad Fase 1 | Checklist de simplicidad | Aprobado — sin señales de over-engineering (abstracción prematura, capas especulativas, frameworks sin uso) |
| 5 | Bounded Context Map | Artefacto de context map | Todos los contextos con propietario, estrategia de persistencia y estilo de integración |

Si la topología F3 (microservicios) está en alcance, también aplica la regla de **Domain-Aligned Service Topology (DOMA)** — cada servicio debe mapear a exactamente un bounded context (ver [`quality-gates.es.md`](../quality-gates.es.md) y ADR-0076).

---

## 3. Procedimiento de Revisión

1. **Auditoría de completitud de ADRs (Software Architect).** Recorrer cada decisión arquitectónica contra el registro. Si existe en el diseño sin ADR correspondiente, marcarla pendiente y bloquear.
2. **Verificación de readiness de historias (Product Owner + QA/SDET).** Confirmar que cada Functional Story tiene criterios Given/When/Then, trazabilidad a un requisito del PRD y definición de listo.
3. **Verificación de blueprint y topología (Principal/Staff Engineer).** Validar el bounded context map contra la topología elegida y las reglas de composición multi-topología.
4. **Revisión de simplicidad.** Recorrer la Checklist de Simplicidad. Cualquier "sí" a señales de over-engineering bloquea la compuerta.
5. **Registro de decisión.** Producir resolución escrita `APROBADA` / `BLOQUEADA` / `CON WAIVER`, firmada por el Software Architect.

---

## 4. Criterios de Bloqueo

| Criterio | Acción |
|---|---|
| Decisiones arquitectónicas significativas sin documentar | BLOQUEAR — exigir ADR antes de la baseline |
| Fronteras de bounded context contradictorias | BLOQUEAR — resolver context map |
| Functional Stories sin criterios de aceptación | BLOQUEAR — regresar a redacción de historias |
| Microservicio F3 mapeado a más de un bounded context | BLOQUEAR — violación DOMA; ver ADR-0076 |

---

## 5. Flujo de Waiver

Autoridad de waiver: Architecture Board. Campos requeridos (según [`quality-gates.es.md`](../quality-gates.es.md)):

- `criterion` · `justification` · `risk` · `owner` · `expirationDate` · `mitigationPlan`

Los waivers no pueden saltar decisiones sin documentar en subsistemas regulados (autenticación, residencia de datos, procesamiento de pagos).

---

## 6. Salidas

- Snapshot bloqueado del Registro de ADRs.
- Functional Stories listas para descomposición técnica.
- Bounded Context Map y declaración topológica alineada.
- Autorización para entrar a la [Fase 3 — Construcción](../README.es.md#fase-03-construcción).

---

[Volver al Centro de Gobernanza SDLC](../README.es.md)
