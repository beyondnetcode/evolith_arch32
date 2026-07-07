# Playbook de Fase 1 — Aprobación de Negocio

> **Navegación Bilingüe:** [English Version](./phase-1-business-signoff.md)

**Fase:** [01 — Concepción y Descubrimiento](../README.es.md#fase-01-concepción-y-descubrimiento)
**Compuerta de Salida:** Business Sign-Off (ver gate `phase: 1` en [`phase-gates.rules.json`](../../../../src/rulesets/sdlc/phase-gates.rules.json))
**Audiencia Principal:** Product Owner, Patrocinador Ejecutivo, Software Architect
**Rol Responsable:** Product Owner
**Autoridad de Waiver:** Patrocinador Ejecutivo
**Estado:** Aprobado

Este playbook operacionaliza la compuerta Business Sign-Off. Es la contraparte procedimental de las reglas declarativas de `phase-gates.rules.json` y de los umbrales de [`quality-gates.es.md`](../quality-gates.es.md). Ninguna iniciativa puede salir de la Fase 1 sin evidencia objetiva en cada checkpoint.

---

## 1. Condiciones Previas

Antes de abrir la compuerta, confirmar:

- La iniciativa está registrada en el backlog de portafolio con un identificador único.
- Existen Patrocinador Ejecutivo y Product Owner nominados y reconocidos.
- Se identificaron el Reference Blueprint de Evolith aplicable y la línea base topológica.
- El nivel de adopción de la Fase 1.1 (Knowledge-First Discovery) ha sido declarado. Si se seleccionó Nivel ≥ 1, el resultado del Gate de Preparación de Discovery (PASS o CONDITIONAL) debe estar archivado. Un resultado FAIL bloquea esta compuerta. Ver [Playbook Fase 1.1](./phase-1.1-knowledge-first-discovery.es.md).

Si falta cualquier condición, **no iniciar la compuerta**. Volver más tarde evita retrabajo.

---

## 2. Checklist de Recolección de Evidencia

Cada fila se corresponde con una entrada `mandatoryEvidence` de la compuerta de Fase 1. Usar la plantilla enlazada; los revisores rechazan prosa libre.

| # | Evidencia Obligatoria | Plantilla / Esquema | Criterio de Aceptación |
|---|---|---|---|
| 1 | PRD — Product Requirements Document | [`prd-template.es.md`](../04-artifact-templates/prd-template.es.md) · [`prd.schema.json`](../../../../src/rulesets/schema/prd.schema.json) | `status = Approved`, `approvalEvidence` poblado, `approvalDate` completada |
| 2 | Discovery Canvas | Registro de la iniciativa | Dolores del cliente, valor esperado y persona objetivo documentados. Si se aplicó Fase 1.1 Nivel ≥ 1, este artefacto debe reflejar el Discovery Knowledge Brief. |
| 3 | Canvas de Factibilidad Técnica | [`technical-feasibility.schema.json`](../../../../src/rulesets/schema/technical-feasibility.schema.json) | Atributos de calidad y NFRs registrados con umbrales medibles |
| 4 | Estimación Ballpark | Bitácora T-Shirt sizing | Composición del equipo y supuestos de sizing declarados. Si se aplicó Fase 1.1 Nivel ≥ 2, el sizing del Story Seed Bank debe ser incorporado. |
| 5 | Matriz MoSCoW | Worksheet MoSCoW | Al menos un MUST y distribución Must/Should/Could/Won't válida. Si se aplicó Fase 1.1 Nivel ≥ 2, la Matriz de Candidatos a Épica sirve como este artefacto — no se requiere worksheet MoSCoW independiente. |
| 6 | Análisis Build-versus-Compose | [`build-vs-compose.schema.json`](../../../../src/rulesets/schema/build-vs-compose.schema.json) | Disposición Adoptar / Embeber / Integrar / Extender / Construir / Rechazar con costo a 3 años, licenciamiento, aislamiento por tenant, reemplazabilidad y requisitos de PoC (Product Vision §5.3) |

---

## 3. Procedimiento de Revisión de la Compuerta

1. **Auditoría de evidencia (Product Owner).** Confirmar que todo artefacto de §2 está presente, versionado y almacenado en la raíz documental de la iniciativa.
2. **Alineación arquitectónica (Software Architect).** Confrontar PRD y Canvas de Factibilidad con el Reference Blueprint correspondiente. Señalar cualquier contradicción con restricciones de topología, cuotas cloud o ADRs vigentes.
3. **Aprobación de negocio (Patrocinador Ejecutivo).** Validar que la financiación está autorizada, el alcance es inequívoco y los OKRs son explícitos.
4. **Registro de decisión.** Asentar el resultado en la bitácora: `APROBADA`, `BLOQUEADA` o `CON WAIVER` (referenciar el waiver).

Una sesión de compuerta produce una sola decisión escrita. No se admiten aprobaciones verbales.

---

## 4. Criterios de Bloqueo

Disparar bloqueo automático cuando se observe cualquier criterio; la acción asociada es normativa.

| Criterio | Acción |
|---|---|
| El alcance es ambiguo | BLOQUEAR — regresar a clarificación de alcance |
| Restricciones técnicas o cuotas cloud no alineadas | BLOQUEAR — regresar con canvas de factibilidad revisado |
| Se ignoran o contradicen restricciones arquitectónicas | BLOQUEAR — escalar a Architecture Board |

---

## 5. Flujo de Waiver

Si la compuerta debe avanzar con desviación conocida, registrar waiver según [`quality-gates.es.md` §Política de Waivers](../quality-gates.es.md). Campos requeridos:

- `criterion` · `justification` · `risk` · `owner` · `expirationDate` · `mitigationPlan`

El Patrocinador Ejecutivo es la autoridad de waiver para Fase 1. Los waivers no pueden saltar bloqueos legales, de cumplimiento o de seguridad.

---

## 6. Salidas

Al aprobar la compuerta debe producirse:

- Registro de decisión Business Sign-Off firmado.
- PRD bajo control de cambios.
- Iniciativa autorizada para ingresar a la [Fase 2 — Design Baseline](./phase-2-design-baseline.es.md).

---

[Volver al Centro de Gobernanza SDLC](../README.es.md)
