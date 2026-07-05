# Plantilla: Discovery Readiness Gate

> **Navegación Bilingüe:** [English Version](./discovery-readiness-gate-template.md)
> **Propósito:** Gate formal que valida la suficiencia del conocimiento antes de proceder al backlog y diseño. Se usa en Nivel 3+.
>
> **Fase SDLC:** 01 - Discovery / Ideación
>
> **Subfase:** 01.1 - Knowledge-First Discovery / KDD Readiness
>
> **Responsable sugerido:** Product Owner / Business Analyst
>
> **Quality Gate:** Aprobación del Knowledge Brief

## Metadatos del Artefacto

* **URL Upstream Evolith:** `En construcción - Solicitar a Upstream`
* **Entradas Requeridas:** Knowledge Brief aprobado, Registro de Supuestos y Preguntas validado, Epic Candidate Matrix, Story Seed Bank.
* **Salidas Esperadas:** Decisión del gate (PASS / CONDITIONAL / FAIL) con evidencia para cada verificación.
* **Taxonomía Aplicada:** Alineado con el glosario Evolith (Gate, Check, Waiver, Decision, Traceability).
* **Rules Evolith Aplicables:** R-03 (UTF-8 Clean), R-09 (Readability), R-13 (Functional Structure).

---

## 1. Estructura Documental (Markdown)

```markdown
# Discovery Readiness Gate: [Nombre de la Iniciativa]

## 1. Información del Gate

| Campo | Valor |
|---|---|
| ID del Gate | DRG-[YYYY]-[NNN] |
| ID de Iniciativa | [Identificador de la iniciativa] |
| Nivel de Adopción | Nivel 3+ |
| Fecha de Decisión | [YYYY-MM-DD] |
| Decidido Por | [Nombre / Rol] |

## 2. Verificaciones del Gate

### Problema y Valor

| # | Criterio | Estado | Evidencia | Notas |
|---|---|---|---|---|
| 1 | La declaración del problema es específica y medible | [Pass/Fail/Waiver] | [Enlace a Knowledge Brief §1] | |
| 2 | La propuesta de valor incluye métricas cuantificables | [Pass/Fail/Waiver] | [Enlace a Knowledge Brief §2] | |
| 3 | El disparador de negocio y el patrocinador están identificados | [Pass/Fail/Waiver] | [Enlace a Knowledge Brief §3] | |

### Stakeholders

| # | Criterio | Estado | Evidencia | Notas |
|---|---|---|---|---|
| 4 | Todos los stakeholders clave identificados con responsabilidades | [Pass/Fail/Waiver] | [Enlace a Knowledge Brief §3] | |
| 5 | Los equipos afectados reconocidos y consultados | [Pass/Fail/Waiver] | [Notas de reunión o correo] | |

### Capacidades

| # | Criterio | Estado | Evidencia | Notas |
|---|---|---|---|---|
| 6 | El Mapa de Capacidades está completo para el alcance de la iniciativa | [Pass/Fail/Waiver] | [Enlace al Mapa de Capacidades] | |
| 7 | Al menos un candidato de épica tiene Prioridad = Must | [Pass/Fail/Waiver] | [Enlace al Epic Candidate Matrix] | |
| 8 | Los tamaños de épica están estimados (sin XL sin plan de división) | [Pass/Fail/Waiver] | [Enlace al Epic Candidate Matrix] | |

### Trazabilidad

| # | Criterio | Estado | Evidencia | Notas |
|---|---|---|---|---|
| 9 | Cada épica traza a un ID de Capacidad | [Pass/Fail/Waiver] | [Enlace al Epic Candidate Matrix] | |
| 10 | Cada semilla de historia traza a un ID de Candidato de Épica | [Pass/Fail/Waiver] | [Enlace al Story Seed Bank] | |
| 11 | Los supuestos están enlazados a artefactos de origen | [Pass/Fail/Waiver] | [Enlace al Registro de Supuestos y Preguntas] | |

### Riesgos y Supuestos

| # | Criterio | Estado | Evidencia | Notas |
|---|---|---|---|---|
| 12 | Todos los riesgos de alto impacto tienen planes de mitigación | [Pass/Fail/Waiver] | [Enlace a Knowledge Brief §6] | |
| 13 | Ningún supuesto crítico permanece sin validar | [Pass/Fail/Waiver] | [Enlace al Registro de Supuestos y Preguntas] | |
| 14 | Las preguntas abiertas tienen propietarios y fechas objetivo | [Pass/Fail/Waiver] | [Enlace al Registro de Supuestos y Preguntas] | |

### Restricciones de Arquitectura

| # | Criterio | Estado | Evidencia | Notas |
|---|---|---|---|---|
| 15 | Las restricciones técnicas están documentadas | [Pass/Fail/Waiver] | [Enlace a Knowledge Brief §5] | |
| 16 | Los límites de bounded context están definidos | [Pass/Fail/Waiver] | [Enlace al Modelo DDD o Documento de Arquitectura] | |

### Paquete de Contexto

| # | Criterio | Estado | Evidencia | Notas |
|---|---|---|---|---|
| 17 | El Paquete de Contexto de Discovery está poblado | [Pass/Fail/Waiver] | [Enlace al Context Pack] | |
| 18 | El Paquete de Contexto es accesible para agentes descendentes | [Pass/Fail/Waiver] | [Enlace o confirmación de acceso] | |

## 3. Exenciones (Waivers)

| Verificación # | Justificación | Aprobado Por | Fecha de Expiración |
|---|---|---|---|
| [N] | [Por qué se exime esta verificación] | [Nombre] | [YYYY-MM-DD] |

## 4. Decisión

| Campo | Valor |
|---|---|
| Decisión | [PASS / CONDITIONAL / FAIL] |
| Justificación | [Resumen de por qué se tomó esta decisión] |
| Condiciones (si CONDITIONAL) | [Qué debe resolverse antes de proceder] |
| Próximos Pasos | [Acciones a tomar basadas en la decisión] |
```

---

## 2. Estructura de Datos (JSON)

Para integración con el CLI de Evolith y herramientas de seguimiento de gates automáticas.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Discovery Readiness Gate",
  "type": "object",
  "required": ["id", "gateId", "initiativeId", "adoptionLevel", "checks", "decision", "decidedAt", "decidedBy"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Identificador único de esta instancia de gate."
    },
    "gateId": {
      "type": "string",
      "description": "Identificador formal del gate (ej., DRG-2024-001)."
    },
    "initiativeId": {
      "type": "string",
      "description": "Referencia a la iniciativa sometida al gate."
    },
    "adoptionLevel": {
      "type": "string",
      "description": "Nivel de adopción requerido para este gate (ej., Nivel 3+)."
    },
    "checks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["category", "criterion", "status", "evidence", "notes"],
        "properties": {
          "category": {
            "type": "string",
            "description": "Categoría de la verificación del gate (ej., Problema y Valor, Stakeholders)."
          },
          "criterion": {
            "type": "string",
            "description": "El criterio específico que se está evaluando."
          },
          "status": {
            "type": "string",
            "enum": ["Pass", "Fail", "Waiver"],
            "description": "Resultado de la verificación."
          },
          "evidence": {
            "type": "string",
            "description": "Enlace o referencia a evidencia de soporte."
          },
          "notes": {
            "type": "string",
            "description": "Notas adicionales o contexto para esta verificación."
          }
        }
      },
      "description": "Array de verificaciones del gate organizadas por categoría."
    },
    "decision": {
      "type": "string",
      "enum": ["PASS", "CONDITIONAL", "FAIL"],
      "description": "Decisión general del gate."
    },
    "waivers": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["checkNumber", "rationale", "approvedBy", "expiryDate"],
        "properties": {
          "checkNumber": {
            "type": "integer",
            "description": "El número de verificación que se exime."
          },
          "rationale": {
            "type": "string",
            "description": "Justificación de la exención."
          },
          "approvedBy": {
            "type": "string",
            "description": "Persona que aprobó la exención."
          },
          "expiryDate": {
            "type": "string",
            "format": "date",
            "description": "Cuándo expira la exención (ISO 8601)."
          }
        }
      },
      "description": "Exenciones para verificaciones fallidas que se aceptan con justificación."
    },
    "decidedAt": {
      "type": "string",
      "format": "date-time",
      "description": "Marca de tiempo de cuándo se tomó la decisión del gate (ISO 8601)."
    },
    "decidedBy": {
      "type": "string",
      "description": "Persona o rol que tomó la decisión del gate."
    }
  }
}
```

---

## 3. Ejemplo Mínimo Aplicado

```json
{
  "id": "DRG-2024-001",
  "gateId": "DRG-2024-001",
  "initiativeId": "INIT-ONBOARD-2024",
  "adoptionLevel": "Level 3+",
  "checks": [
    { "category": "Problem & Value", "criterion": "Problem statement is specific and measurable", "status": "Pass", "evidence": "KB-2024-001 §1", "notes": "" },
    { "category": "Problem & Value", "criterion": "Value proposition includes quantifiable metrics", "status": "Pass", "evidence": "KB-2024-001 §2", "notes": "Se definió objetivo de reducción del 60%" },
    { "category": "Problem & Value", "criterion": "Business trigger and sponsor are identified", "status": "Pass", "evidence": "KB-2024-001 §3", "notes": "" },
    { "category": "Capabilities", "criterion": "At least one epic candidate has Priority = Must", "status": "Pass", "evidence": "ECM-2024-001", "notes": "EC-001 y EC-002 son Must" },
    { "category": "Capabilities", "criterion": "Epic sizes are estimated", "status": "Pass", "evidence": "ECM-2024-001", "notes": "Sin épicas XL" },
    { "category": "Traceability", "criterion": "Every epic traces to a Capability ID", "status": "Pass", "evidence": "ECM-2024-001", "notes": "" },
    { "category": "Risks & Assumptions", "criterion": "No critical assumptions remain unvalidated", "status": "Waiver", "evidence": "AQ-LOG-2024-001", "notes": "AQ-002 diferido a Q2 con aprobación del patrocinador" }
  ],
  "decision": "CONDITIONAL",
  "waivers": [
    { "checkNumber": 13, "rationale": "La selección del proveedor de identidad se difiere a Q2; el patrocinador aprobó la exención", "approvedBy": "VP de Experiencia de Cliente", "expiryDate": "2024-06-30" }
  ],
  "decidedAt": "2024-01-25T14:00:00Z",
  "decidedBy": "María López, Product Owner"
}
```

---

## 4. Handoff hacia la Siguiente Fase

Una decisión **PASS** o **CONDITIONAL** en el **Discovery Readiness Gate** habilita:

1. **Refinamiento del Backlog** — las semillas de historia K2+ entran a sesiones de refinamiento para planificación del sprint.
2. **Línea Base de Diseño** — el diseño de arquitectura y UX puede proceder con restricciones validadas.
3. **Factibilidad Técnica** — los supuestos validados informan los objetivos de NFR y la validación de restricciones.

Una decisión **FAIL** devuelve la iniciativa a Discovery para investigación adicional o ajuste de alcance.

---

## Quality Checklist

- [ ] Las 18 verificaciones están evaluadas (sin verificación en blanco)
- [ ] Cada Fail tiene un plan de remediación o una exención documentada
- [ ] Las exenciones tienen aprobación del patrocinador y fechas de expiración
- [ ] Los enlaces de evidencia resuelven a artefactos reales
- [ ] La justificación de la decisión está documentada y es trazable
- [ ] El gate es revisado por al menos el Product Owner y un líder técnico
- [ ] El lenguaje es consistente (sin mezcla de EN/ES dentro del archivo)
- [ ] El documento está almacenado en control de versiones junto con el código o artefactos de diseño relevantes

---

## Nivel de Adopción Recomendado

**Obligatorio** para todas las iniciativas en Nivel 3+ de adopción. El Discovery Readiness Gate es el punto de control formal antes de transitar de las fases de Discovery a Diseño y Backlog.

---

## Criterios de Actualización

| Disparador | Acción |
|---|---|
| La evidencia de una verificación queda desactualizada | Reevaluar la verificación con evidencia actualizada |
| Una exención expira | Reevaluar la verificación o renovar la exención con aprobación del patrocinador |
| Nuevo riesgo o supuesto surge | Agregar a la categoría de verificación relevante; reevaluar la decisión del gate |
| La decisión cambia (ej., CONDITIONAL a PASS) | Actualizar campo de decisión, registrar justificación, notificar a stakeholders |
| El alcance de la iniciativa cambia materialmente | Re-ejecutar la evaluación completa del gate |
| Revisión trimestral | Verificar que la decisión del gate siga siendo válida; cerrar si la iniciativa está inactiva |
