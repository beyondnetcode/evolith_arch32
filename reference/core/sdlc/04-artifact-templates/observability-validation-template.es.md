# Plantilla: Validación de Observabilidad

> **Navegación bilingüe:** [English Version](./observability-validation-template.md)
> **Fase:** 5 — Entrega y Operaciones
> **Compuerta de Salida:** Producción Activa
> **Esquema:** [`observability-validation.schema.json`](../../../../src/rulesets/schema/observability-validation.schema.json)
> **Padre:** [Plantillas de Artefactos](./README.es.md)

---

## Propósito

El artefacto de Validación de Observabilidad registra que métricas, logs, trazas y alertas están nominales en todo camino productivo al momento del corte. Es evidencia obligatoria de la compuerta Producción Activa y lo cita el [Playbook de Fase 5 — Release Zero-Downtime](../01-playbooks/zero-downtime-release.es.md).

---

## Reglas de Autoría

- Vincular cada métrica y alerta a su línea base de SLO (enlazar el documento o dashboard).
- Capturar tres ventanas: línea base previa, ventana de transición y estado estable posterior.
- Toda alerta `firing` o `silenced` durante la transición debe justificarse en la sección de waivers.
- Un `result` `DEGRADED` o `BLOCK` detiene la compuerta y dispara el rollback.

---

## Secciones Requeridas

| Sección | Campo del esquema | Notas |
|---|---|---|
| Identificador del release | `release` | Debe referenciar al RC estampado. |
| Marca temporal | `evaluatedAt` | ISO 8601 con zona horaria. |
| Evaluador | `evaluator` | SRE / DevOps Lead responsable de la firma. |
| Métricas | `metrics` | % error, latencias p95 / p99, cumplimiento de SLO. |
| Logs | `logs` | Volumen de errores, anomalías, dentro de la línea base. |
| Trazas | `traces` | Completitud de caminos críticos y spans faltantes. |
| Alertas | `alerts[]` | Cada alerta con `name`, `state`, `owner`. |
| Resultado | `result` | `NOMINAL` · `DEGRADED` · `BLOCK`. |
| Waivers | `waivers[]` | Requeridos si una métrica falla pero la compuerta procede. |

---

## Esqueleto Markdown

```markdown
# Validación de Observabilidad — [RC-X.Y.Z]

- Evaluado el: AAAA-MM-DDThh:mm:ss±hh:mm
- Evaluador: [Nombre / Rol]
- Línea base de SLO: [Enlace]

## Métricas
| Métrica | Valor | Umbral | Dentro del SLO |
|---|---:|---:|:---:|
| % de errores | … | … | sí/no |
| Latencia p95 (ms) | … | … | sí/no |
| Latencia p99 (ms) | … | … | sí/no |

## Logs
- Volumen de errores: …
- Anomalías: …
- Dentro de la línea base: sí/no

## Trazas
- Caminos críticos completos: sí/no
- Spans faltantes: …

## Alertas
| Nombre | Estado | Owner |
|---|---|---|
| … | nominal/firing/silenced | … |

## Resultado
- Decisión: NOMINAL / DEGRADED / BLOCK
- Waivers: [lista opcional]
```

---

## Documentos Relacionados

| Documento | Propósito |
|---|---|
| [Playbook de Release Zero-Downtime](../01-playbooks/zero-downtime-release.es.md) | Compuerta procedimental que consume esta evidencia. |
| [Gates de Calidad SDLC](../quality-gates.es.md) | Autoridad de umbrales. |
| [`phase-gates.rules.json`](../../../../src/rulesets/sdlc/phase-gates.rules.json) | La entrada de evidencia `Observability Validation` de la Fase 5 referencia el esquema de esta plantilla. |
