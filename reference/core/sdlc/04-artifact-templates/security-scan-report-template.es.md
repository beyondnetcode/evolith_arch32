# Plantilla: Reporte de Escaneo de Seguridad

> **Navegación bilingüe:** [English Version](./security-scan-report-template.md)
> **Fase:** 4 — Validación y QA
> **Compuerta de Salida:** RC Estampado
> **Esquema:** [`security-scan-report.schema.json`](../../../../src/rulesets/schema/security-scan-report.schema.json)
> **Padre:** [Plantillas de Artefactos](./README.es.md)

---

## Propósito

El Reporte de Escaneo de Seguridad consolida hallazgos SAST, DAST, SCA, secret-scanning, contenedores e IaC contra la política productiva de CVEs. Es evidencia obligatoria de la compuerta RC Stamped y lo cita el [Playbook de Fase 4 — RC Estampado](../01-playbooks/phase-4-rc-stamp.es.md).

---

## Reglas de Autoría

- Listar todo escáner que produjo el reporte; no omitir ninguno aunque esté limpio.
- Los conteos de `findings` deben coincidir con los de `openFindings` por severidad.
- CVEs High o Critical no pueden pasar con remediación `Waiver` sin Aceptación Ejecutiva de Riesgo registrada en `approvalAuthority`.
- Los Medium requieren disposición `Fix` o `Mitigate` con `dueDate` explícita.

---

## Secciones Requeridas

| Sección | Campo del esquema | Notas |
|---|---|---|
| Identificador del RC | `releaseCandidate` | Debe coincidir con el RC estampado. |
| Marca temporal | `scannedAt` | ISO 8601 con zona horaria. |
| Escáneres | `scanners[]` | Mínimo un SAST + un SCA. |
| Totales | `findings` | Conteos Critical, High, Medium, Low. |
| Hallazgos abiertos | `openFindings[]` | Cada uno con id, severidad, componente, remediación, owner. |
| Política | `policy` | Conteos máximos permitidos (`maxCritical`, `maxHigh`, `maxMedium`). |
| Resultado | `result` | `PASS` · `FAIL` · `WAIVED`. |
| Waivers | `waivers[]` | `approvalAuthority` obligatorio para High/Critical. |

---

## Esqueleto Markdown

```markdown
# Reporte de Escaneo de Seguridad — [RC-X.Y.Z]

- Escaneado el: AAAA-MM-DDThh:mm:ss±hh:mm
- Escáneres: [nombre + tipo + versión, ...]

## Hallazgos
| Severidad | Conteo |
|---|---:|
| Critical | … |
| High | … |
| Medium | … |
| Low | … |

## Hallazgos Abiertos
| ID | Severidad | Componente | Remediación | Owner | Vence |
|---|---|---|---|---|---|
| … | … | … | Fix/Mitigate/Waiver | … | AAAA-MM-DD |

## Política
- max Critical: 0
- max High: 0
- max Medium: [N]

## Resultado
- Decisión: PASS / FAIL / WAIVED
- Waivers: [lista con autoridad de aprobación]
```

---

## Documentos Relacionados

| Documento | Propósito |
|---|---|
| [Playbook de Fase 4 — RC Estampado](../01-playbooks/phase-4-rc-stamp.es.md) | Compuerta procedimental que consume esta evidencia. |
| [Gates de Calidad SDLC](../quality-gates.es.md) | Define la política productiva de CVEs. |
| [`phase-gates.rules.json`](../../../../src/rulesets/sdlc/phase-gates.rules.json) | La entrada de evidencia `Security Scan Report` de la Fase 4 referencia el esquema de esta plantilla. |
