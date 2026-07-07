# Plantilla: Evidencia de Integración

> **Navegación bilingüe:** [English Version](./integration-evidence-template.md)
> **Fase:** 4 — Validación y QA
> **Compuerta de Salida:** RC Estampado
> **Esquema:** [`integration-evidence.schema.json`](../../../../src/rulesets/schema/integration-evidence.schema.json)
> **Padre:** [Plantillas de Artefactos](./README.es.md)

---

## Propósito

El artefacto de Evidencia de Integración demuestra que cada contrato declarado entre componentes fue ejercitado contra una contraparte real o probada por contrato antes del sello del RC. Es evidencia obligatoria de la compuerta RC Stamped y lo cita el [Playbook de Fase 4 — RC Estampado](../01-playbooks/phase-4-rc-stamp.es.md).

---

## Reglas de Autoría

- Una entrada por contrato declarado; no agrupar varias integraciones bajo un mismo id.
- `testKind` debe reflejar la evidencia más fuerte ejecutada — `contract` y `consumer-driven` priman sobre `synthetic`.
- Una integración `FAIL` bloquea el RC salvo waiver adjunto.
- Enlazar el log o salida del verificador en `evidence`; preferir URLs de commit a adjuntos sueltos.

---

## Secciones Requeridas

| Sección | Campo del esquema | Notas |
|---|---|---|
| Identificador del RC | `releaseCandidate` | Debe coincidir con el RC estampado. |
| Marca temporal | `evaluatedAt` | ISO 8601 con zona horaria. |
| Evaluador | `evaluator` | Tech Lead o QA Lead. |
| Integraciones | `integrations[]` | Mínimo una entrada; cada una con producer, consumer, contract, `testKind`, `result`, enlace de evidencia. |
| Resultado | `result` | `PASS` · `FAIL` · `WAIVED`. |
| Waivers | `waivers[]` | Requeridos cuando hay `WAIVED` o un `FAIL` procede bajo aceptación de riesgo. |

---

## Esqueleto Markdown

```markdown
# Evidencia de Integración — [RC-X.Y.Z]

- Evaluado el: AAAA-MM-DDThh:mm:ss±hh:mm
- Evaluador: [Nombre / Rol]

## Integraciones
| ID | Producer | Consumer | Contrato | Tipo de Prueba | Resultado | Evidencia |
|---|---|---|---|---|---|---|
| INT-001 | … | … | [enlace] | contract / consumer-driven / end-to-end / synthetic | PASS / FAIL / WAIVED | [enlace] |

## Resultado
- Decisión: PASS / FAIL / WAIVED
- Waivers: [lista opcional]
```

---

## Documentos Relacionados

| Documento | Propósito |
|---|---|
| [Playbook de Fase 4 — RC Estampado](../01-playbooks/phase-4-rc-stamp.es.md) | Compuerta procedimental que consume esta evidencia. |
| [Gates de Calidad SDLC](../quality-gates.es.md) | Define los criterios bloqueantes relacionados a integración. |
| [`phase-gates.rules.json`](../../../../src/rulesets/sdlc/phase-gates.rules.json) | La entrada de evidencia `Integration Evidence` de la Fase 4 referencia el esquema de esta plantilla. |
