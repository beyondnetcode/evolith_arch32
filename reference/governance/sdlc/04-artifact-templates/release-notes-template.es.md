# Plantilla: Release Notes

> **Navegación bilingüe:** [English](./release-notes-template.md)
> **Fase:** 5 — Entrega y Operaciones
> **Puerta de salida:** Producción Activa (Monitoreo Nominal)
> **Padre:** [Plantillas de Artefactos](./README.es.md)

---

## Propósito

Release Notes es el registro formal de despliegue productivo. Resume alcance del release, pasos de despliegue, plan de rollback, evidencia de observabilidad y decisión de Producción Activa.

---

## Elige tu Vista

| Vista | Link | Úsalo cuando |
|---|---|---|
| **Fuente Markdown** | [Abrir fuente Markdown reutilizable](./source/release-notes-template-source.es.md) | Necesites copiar la estructura canónica de Release Notes en un repositorio de producto o delivery. |
| **Ejemplo Renderizado** | [Abrir ejemplo renderizado UMS](./examples/release-notes-example-ums.es.md) | Quieras ver cómo presentar evidencia de release antes de Producción Activa. |

---

## Reglas de Autoría

- Enlaza Release Notes con el Test Summary Report sellado.
- Incluye pasos de despliegue, plan de rollback y checklist de observabilidad.
- No declares Producción Activa sin monitoreo validado y readiness de rollback.
- Mantén el resumen legible para Producto, Ingeniería, Operaciones y Liderazgo de Tecnología.

---

## Documentos Relacionados

| Documento | Propósito |
|---|---|
| [Plantilla de Test Summary Report](./test-summary-report-template.es.md) | Evidencia RC requerida antes de release. |
| [Modelo de Trazabilidad](../traceability-model.es.md) | Explica cómo la evidencia de release conecta con la intención de negocio. |
| [Gates de Calidad](../quality-gates.es.md) | Define controles de calidad bloqueantes para producción. |
