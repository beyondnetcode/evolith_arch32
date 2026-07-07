# Fase SDLC 05 — Entrega y Operaciones

> **Navegación bilingüe:** [English Version](./README.md)
> **Responsable:** Evolith Architecture Board
> **Estado:** Referencia activa
> **Padre:** [Centro de Gobierno SDLC Corporativo](../README.md)

---

## Alcance

La Fase 05 gobierna la transición de un Release Candidate sellado a un despliegue de producción verificado. Cubre el rollout controlado, la validación de observabilidad que demuestra que el sistema está en línea y nominal, y la postura operativa que hereda el equipo de guardia una vez que el release es declarado en Producción.

Esta área es el hogar canónico de los playbooks, plantillas y estándares que operacionalizan la Fase 5 del [modelo operativo SDLC](../README.md). Los documentos que pertenecen a fases anteriores (Concepción, Diseño, Construcción, Validación) viven en sus áreas respectivas; la Fase 5 los referencia cuando su evidencia es entrada de una decisión de entrega, pero no es dueña de ellos.

**Compuerta de salida:** Producción Live
**Audiencia primaria:** DevOps / SRE, Tech Lead, Product Owner, Security Engineer (herencia de guardia)

---

## Entradas (deben estar presentes antes de iniciar la Fase 5)

| Entrada | Producida por | Forma de evidencia |
|---|---|---|
| Release Candidate sellado | Fase 04 — [Playbook RC Sellado](../01-playbooks/phase-4-rc-stamp.md) | Test Summary Report firmado + Security Scan Report + Integration Evidence |
| Conformidad de quality gates | Fase 03 — [Quality Gates](../quality-gates.md) | Estado de CI, reportes de cobertura y complejidad |
| Bitácora de decisión bloqueante | Fase 04 — [Matriz de Responsabilidades](../responsibility-matrix.md) | Registros de waiver (si los hay) adjuntos al RC |
| Topología de despliegue y plan de rollback | Fase 02 — ADRs vigentes | Conjunto de ADRs aprobado, incluida la topología de despliegue |
| Línea base de instrumentación de observabilidad | Fase 03 — DoD de Construcción | Dashboards, reglas de alerta, enlaces a runbooks |

Si falta cualquier entrada, la compuerta no puede iniciarse. La fase no produce retroactivamente artefactos faltantes de fases anteriores.

---

## Salidas (deben existir antes de declarar Producción Live)

| Salida | Plantilla | Dónde vive |
|---|---|---|
| Release Notes | [Plantilla Release Notes](../04-artifact-templates/release-notes-template.es.md) | Directorio de release notes del producto |
| Registro de validación de observabilidad | [Plantilla Observability Validation](../04-artifact-templates/observability-validation-template.es.md) | Directorio de evidencia de release |
| Runbook de despliegue ejecutado | [Playbook Zero-Downtime Release](../01-playbooks/zero-downtime-release.es.md) | Bitácora del cronograma del release |
| Evidencia de simulacro de rollback | Sección dentro de Release Notes | Bitácora del cronograma del release |
| Confirmación de handoff a guardia | Sección dentro de Release Notes | Bitácora del cronograma del release |

Las salidas se almacenan en control de versiones junto al registro de despliegue para que la cadena Fase 1 → 5 permanezca trazable de punta a punta (ver [Modelo de Trazabilidad](../traceability-model.es.md)).

---

## Quality Gates

La Fase 5 está acotada por los umbrales canónicos definidos en [SDLC Quality Gates](../quality-gates.es.md). La compuerta Producción Live exige específicamente:

- **Salud del despliegue:** el rollout se completó sin romper los presupuestos de error-rate, latencia o saturación declarados en el registro de Observability Validation.
- **Observabilidad:** los dashboards de señales doradas (RED / USE) están en verde; las alertas enrutan a la rotación de guardia declarada; los logs y trazas de al menos una solicitud canónica son visibles de punta a punta.
- **Listeza de rollback:** el procedimiento de rollback fue rehearsed y cronometrado dentro del presupuesto declarado en el ADR de despliegue.
- **Comunicación:** las Release Notes están publicadas en el canal acordado; los stakeholders identificados en la Matriz de Responsabilidades fueron notificados.
- **Postura de seguridad:** ningún hallazgo de seguridad de Fase 4 fue waiveado sin una fecha de remediación rastreada en el adendum del scan.

Una compuerta que no puede cerrarse sin excepción requiere un waiver escrito según la [política de waivers](../quality-gates.es.md). Los waivers son propiedad del rol marcado como Accountable en la [Matriz de Responsabilidades](../responsibility-matrix.es.md) para la compuerta Producción Live.

---

## Documentos en esta área

Esta área agrega actualmente los activos de gobierno de Fase 5 que viven en áreas hermanas. A medida que emerjan documentos de Fase 5 serán autorados aquí directamente.

| Documento | Ubicación | Tipo | Mandatorio |
|---|---|---|---|
| [Playbook Zero-Downtime Release](../01-playbooks/zero-downtime-release.es.md) | `01-playbooks/` | Playbook | No |
| [Playbook Core API Deployment](../01-playbooks/core-api-deployment.es.md) | `01-playbooks/` | Playbook | No |
| [Plantilla Release Notes](../04-artifact-templates/release-notes-template.es.md) | `04-artifact-templates/` | Plantilla | Sí |
| [Plantilla Observability Validation](../04-artifact-templates/observability-validation-template.es.md) | `04-artifact-templates/` | Plantilla | Sí |
| [Mapeo de Artefactos — Fase 5](../sdlc-evolith-artifact-mapping.es.md#6-fase-5-entrega-y-operaciones) | `../sdlc-evolith-artifact-mapping.es.md` | Referencia | No |

---

## Documentos relacionados

| Documento | Rol |
|---|---|
| [SDLC Quality Gates](../quality-gates.es.md) | Umbrales canónicos aplicados en Producción Live. |
| [Matriz de Responsabilidades SDLC](../responsibility-matrix.es.md) | Expectativas de responsabilidad y evidencia para la compuerta. |
| [Modelo de Trazabilidad SDLC](../traceability-model.es.md) | Cadena de evidencia de punta a punta que cierra en Producción Live. |
| [Marco SDLC orientado a Construcción](../02-engineering/construction-focused-sdlc-framework.es.md) | Modelo de calidad heredado de la Fase 3. |

---

[Volver al Centro de Gobierno SDLC Corporativo](../README.md)
