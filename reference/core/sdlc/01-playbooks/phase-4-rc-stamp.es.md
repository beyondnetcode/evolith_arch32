# Playbook de Fase 4 — RC Estampado

> **Navegación Bilingüe:** [English Version](./phase-4-rc-stamp.md)

**Fase:** [04 — Validación y QA](../README.es.md#fase-04-validación-y-qa)
**Compuerta de Salida:** RC Stamped (ver gate `phase: 4` en [`phase-gates.rules.json`](../../../../src/rulesets/sdlc/phase-gates.rules.json))
**Audiencia Principal:** QA/SDET, Tech Lead, Product Owner, Security Engineer
**Rol Responsable:** QA Lead
**Autoridad de Waiver:** Architecture Board
**Estado:** Aprobado

Este playbook operacionaliza la compuerta RC Stamped. Un Release Candidate solo puede sellarse cuando se verifican todos los umbrales de calidad, los escaneos de seguridad están limpios y la aceptación está firmada. Ningún despliegue a producción procede sin un RC estampado.

---

## 1. Condiciones Previas

- Compuerta "Successful Build" de Fase 3 registrada; CI en verde sobre el commit candidato.
- El entorno de prueba refleja la topología y la línea base de configuración productiva.
- Los escáneres de seguridad están actualizados con el feed vigente de vulnerabilidades.

---

## 2. Checklist de Recolección de Evidencia

| # | Evidencia Obligatoria | Plantilla / Esquema | Criterio de Aceptación |
|---|---|---|---|
| 1 | Test Summary Report | [`test-summary-report-template.es.md`](../04-artifact-templates/test-summary-report-template.es.md) · [`test-summary-report.schema.json`](../../../../src/rulesets/schema/test-summary-report.schema.json) | Todas las quality gates en verde o con waiver; RC firmado por QA Lead y Tech Lead |
| 2 | Validación de Aceptación | Bitácora UAT / firma del Product Owner | El Product Owner firma que los criterios de aceptación están verificados sobre el artefacto RC |
| 3 | Reporte de Escaneo de Seguridad | [`security-scan-report-template.es.md`](../04-artifact-templates/security-scan-report-template.es.md) · [`security-scan-report.schema.json`](../../../../src/rulesets/schema/security-scan-report.schema.json) | Cero CVEs High/Critical en artefactos productivos; los Medium con plan de remediación; estructura conforme al esquema |
| 4 | Evidencia de Integración | [`integration-evidence-template.es.md`](../04-artifact-templates/integration-evidence-template.es.md) · [`integration-evidence.schema.json`](../../../../src/rulesets/schema/integration-evidence.schema.json) | Todo contrato declarado entre componentes ejercitado en PASS o con waiver; estructura conforme al esquema |
| 5 | Distribución de la Pirámide | Cobertura + inventario de pruebas | Meta 70% unit / 20% integration / 10% E2E cumplida o desviación explicada (ADR-0018) |

Aplica el umbral de cobertura de [`quality-gates.es.md`](../quality-gates.es.md) (`>= 80%` en lógica de negocio). La pirámide no sustituye a la cobertura.

---

## 3. Procedimiento de Revisión

1. **Revisión de umbrales de calidad (QA Lead).** Recorrer cada métrica de `quality-gates.es.md` contra el candidato. Solo verde o waiver.
2. **Revisión de seguridad (Security Engineer).** Comparar el reporte contra la política de CVEs productiva. Hallazgos High/Critical requieren remediación **o** Aceptación Ejecutiva de Riesgo — el Architecture Board no puede aprobarlos solo.
3. **Revisión de aceptación (Product Owner).** Verificar que cada Functional Story en alcance está aceptación-probada contra sus criterios BDD. Rechazar la compuerta si una historia queda "verificada por demo" sin evidencia registrada.
4. **Auditoría de pirámide (Tech Lead).** Confirmar que el inventario respeta la forma 70/20/10 o documenta la desviación con justificación.
5. **Estampado del RC.** QA Lead y Tech Lead firman conjuntamente el Test Summary Report; el artefacto RC se etiqueta inmutable y trazable al commit de build.

---

## 4. Criterios de Bloqueo

| Criterio | Acción |
|---|---|
| Cualquier métrica de calidad obligatoria falla | BLOQUEAR estampado — remediar o waiver |
| Criterios de aceptación sin verificar | BLOQUEAR estampado — regresar a validación |
| Ratio de deuda técnica > 5% | BLOQUEAR estampado — exigir plan de remediación |
| CVE High/Critical sin Aceptación Ejecutiva de Riesgo | BLOQUEAR estampado — escalar a seguridad y comité ejecutivo |

---

## 5. Flujo de Waiver

El Architecture Board autoriza los waivers; los waivers de CVE requieren además Aceptación Ejecutiva de Riesgo. Campos requeridos:

- `criterion` · `justification` · `risk` · `owner` · `expirationDate` · `mitigationPlan`

Los waivers no pueden saltar vulnerabilidades de seguridad High/Critical sin esa aceptación ejecutiva explícita.

---

## 6. Salidas

- Test Summary Report firmado.
- Tag de RC inmutable trazable al commit de build.
- Autorización para entrar a [Fase 5 — Entrega y Operaciones](../README.es.md#fase-05-entrega-y-operaciones) y ejecutar el [Playbook de Release Zero-Downtime](./zero-downtime-release.es.md).

---

[Volver al Centro de Gobernanza SDLC](../README.es.md)
