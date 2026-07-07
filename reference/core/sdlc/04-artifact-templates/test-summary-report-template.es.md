# Plantilla: Reporte de Resumen de Testing

> **Navegación bilingüe:** [English](./test-summary-report-template.md)
> **Fase:** 4 — Validación y QA
> **Puerta de salida:** Release Candidate (RC) Sellado
> **Esquema:** [`test-summary-report.schema.json`](../../../../src/rulesets/schema/test-summary-report.schema.json)
> **Padre:** [Plantillas de Artefactos](./README.es.md)

---

## Propósito

Un Test Summary Report registra la evidencia de validación del release antes de sellar un Release Candidate. Consolida ejecución de pruebas, resultados de gates de calidad, defectos abiertos, evidencia técnica y estado de decisión RC.

---

## Elige tu Vista

| Vista | Link | Úsalo cuando |
|---|---|---|
| **Fuente Markdown** | [Abrir fuente Markdown reutilizable](./source/test-summary-report-template-source.es.md) | Necesites copiar la estructura canónica del Test Summary Report en un repositorio de producto o delivery. |
| **Ejemplo Renderizado** | [Abrir ejemplo renderizado UMS](./examples/test-summary-report-example-ums.es.md) | Quieras ver cómo presentar evidencia QA antes del RC Sellado. |

---

## Reglas de Autoría

- Incluye todas las capas relevantes de prueba: unitarias, integración, E2E y validación de aceptación.
- Usa los Gates de Calidad SDLC como fuente canónica de umbrales.
- Enlaza cada resultado a evidencia siempre que sea posible.
- El RC Sellado no puede pasar si métricas obligatorias fallan o defectos bloqueantes siguen abiertos.

---

## Documentos Relacionados

| Documento | Propósito |
|---|---|
| [Gates de Calidad SDLC](../quality-gates.es.md) | Baseline canónica de umbrales. |
| [Modelo de Trazabilidad](../traceability-model.es.md) | Explica cómo la evidencia de validación enlaza con evidencia de release. |
| [Plantilla de Release Notes](./release-notes-template.es.md) | Siguiente artefacto después de sellar el RC. |
