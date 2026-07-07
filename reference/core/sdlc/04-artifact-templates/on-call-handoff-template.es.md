# Plantilla: Handoff de On-Call

> **Navegación bilingüe:** [English](./on-call-handoff-template.md)
> **Fase:** 5 — Entrega y Operaciones
> **Puerta de salida:** Producción Activa (On-Call Listo)
> **Schema:** [on-call-handoff.schema.json](../../../../src/rulesets/schema/on-call-handoff.schema.json)
> **Padre:** [Plantillas de Artefactos](./README.es.md)

---

## Propósito

El Handoff de On-Call es la confirmación formal de que el equipo de guardia ha reconocido el nuevo release, revisado los runbooks operativos y está preparado para dar soporte. Es evidencia obligatoria para el gate de Producción Activa y es citado por el [Playbook de Release Sin Tiempo de Inactividad — Fase 5](../01-playbooks/zero-downtime-release.md).

---

## Reglas de Autoría

- Cada nivel de on-call (primario, secundario, terciario) debe confirmar comprensión del alcance del release.
- Enlaza a cada runbook que cubra una superficie operativa nueva o modificada.
- Las rutas de escalamiento deben incluir números de teléfono o enlaces a horarios de PagerDuty, no solo nombres.
- Los objetivos SLA/SLO deben declararse y confirmarse explícitamente, no asumirse.

---

## Secciones Requeridas

| Sección | Notas |
|---|---|
| Resumen del Release | Versión, resumen de cambios y nivel de riesgo (Bajo / Medio / Alto). |
| Referencias de Runbooks | URLs a runbooks operativos para servicios nuevos o modificados. |
| Rutas de Escalamiento | Contactos P1/P2/P3 con expectativas de tiempo de respuesta. |
| Propiedad de Alertas | Quién monitorea qué alertas y dashboards post-despliegue. |
| Confirmación de SLA | Objetivos SLO que el equipo está comprometiendo para este release. |
| Confirmación del Handoff | Líder de guardia firma confirmando readiness. |
| Roster de Contactos | Personal de on-call primario, secundario y terciario con horarios. |

---

## Esqueleto Markdown

```markdown
# Handoff de On-Call — [RC-X.Y.Z]

## Resumen del Release
- Versión del release: X.Y.Z
- Resumen de cambios: [1–3 oraciones sobre qué cambió]
- Nivel de riesgo: Bajo | Medio | Alto

## Referencias de Runbooks
| Runbook | URL | Cubre |
|---|---|---|
| … | [enlace] | … |

## Rutas de Escalamiento
| Prioridad | Contacto | Tiempo de Respuesta | Método |
|---|---|---|---|
| P1 | … | ≤ 15 min | PagerDuty / Teléfono |
| P2 | … | ≤ 30 min | PagerDuty / Slack |
| P3 | … | ≤ 2 horas | Email / Slack |

## Propiedad de Alertas
| Alerta / Dashboard | Propietario | Ventana de Monitoreo |
|---|---|---|
| … | … | … |

## Confirmación de SLA
- Objetivo de disponibilidad: …
- Objetivo de latencia (p95): …
- Presupuesto de error: …
- Confirmado por: [nombre / rol]

## Confirmación del Handoff
- Líder de guardia: [nombre]
- Fecha: YYYY-MM-DD
- Firma: ____________________

## Roster de Contactos
| Rol | Nombre | Horario | Contacto |
|---|---|---|---|
| Primario | … | Lun–Vie 09:00–18:00 UTC | … |
| Secundario | … | Lun–Vie 18:00–09:00 UTC | … |
| Terciario | … | Fines de semana / Feriados | … |
```

---

## Ejemplo Resuelto

```markdown
# Handoff de On-Call — RC-2.4.0

## Resumen del Release
- Versión del release: 2.4.0
- Resumen de cambios: Agregado job batch de reconciliación de pagos, actualizados límites de tasa del API de perfil de usuario, parcheada vulnerabilidad CVE del middleware de autenticación.
- Nivel de riesgo: Medio

## Referencias de Runbooks
| Runbook | URL | Cubre |
|---|---|---|
| Job Batch de Pagos | https://runbooks.internal/payment-batch | Escenarios de fallo del job de reconciliación nuevo |
| Parche Auth Middleware | https://runbooks.internal/auth-middleware | Verificación de mitigación CVE-2026-1234 |
| Límites de Tasa Profile API | https://runbooks.internal/profile-api | Manejo de picos de 429 por rate limit |

## Rutas de Escalamiento
| Prioridad | Contacto | Tiempo de Respuesta | Método |
|---|---|---|---|
| P1 | Sarah Kim | ≤ 15 min | PagerDuty + Teléfono |
| P2 | David Park | ≤ 30 min | PagerDuty + Slack |
| P3 | Cola de Ops | ≤ 2 horas | Email |

## Propiedad de Alertas
| Alerta / Dashboard | Propietario | Ventana de Monitoreo |
|---|---|---|
| PaymentBatchFailureRate | Sarah Kim | Primeras 48h post-despliegue |
| AuthMiddlewareErrorRate | David Park | Primeras 72h post-despliegue |
| ProfileAPI429Spike | Cola de Ops | Continuo |

## Confirmación de SLA
- Objetivo de disponibilidad: 99.95%
- Objetivo de latencia (p95): ≤ 200ms
- Presupuesto de error: 0.05% por ventana de 30 días
- Confirmado por: Sarah Kim, SRE Lead — 2026-06-22

## Confirmación del Handoff
- Líder de guardia: Sarah Kim
- Fecha: 2026-06-22
- Firma: Sarah Kim ____________________

## Roster de Contactos
| Rol | Nombre | Horario | Contacto |
|---|---|---|---|
| Primario | Sarah Kim | Lun–Vie 09:00–18:00 UTC | +1-555-0101 |
| Secundario | David Park | Lun–Vie 18:00–09:00 UTC | +1-555-0102 |
| Terciario | Cola de Ops | Fines de semana / Feriados | ops@company.com |
```

---

## Documentos Relacionados

| Documento | Propósito |
|---|---|
| [Playbook de Release Sin Tiempo de Inactividad](../01-playbooks/zero-downtime-release.md) | Gate procedural que consume esta evidencia. |
| [Plantilla de Release Notes](./release-notes-template.es.md) | Registro de despliegue productivo que referencia readiness de on-call. |
| [Plantilla de Validación de Observabilidad](./observability-validation-template.es.md) | Evidencia complementaria del estado nominal de alertas. |
| [`phase-gates.rules.json`](../../../../src/rulesets/sdlc/phase-gates.rules.json) | La entrada de evidencia `On-Call Handoff` de Fase 5 referencia esta plantilla. |
