# Plantilla: Registro de Supuestos y Preguntas

> **Navegación Bilingüe:** [English Version](./assumptions-questions-log-template.md)
> **Propósito:** Registro vivo que rastrea preguntas abiertas y supuestos no validados durante todo el Discovery.
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
* **Entradas Requeridas:** Discovery Knowledge Brief aprobado.
* **Salidas Esperadas:** Registro de Supuestos y Preguntas mantenido que alimenta el Paquete de Contexto de Discovery.
* **Taxonomía Aplicada:** Alineado con el glosario Evolith (Assumption, Question, Risk, Decision).
* **Rules Evolith Aplicables:** R-03 (UTF-8 Clean), R-09 (Readability).

---

## 1. Estructura Documental (Markdown)

```markdown
# Registro de Supuestos y Preguntas: [Nombre de la Iniciativa]

## 1. Registro Vivo

| ID | Tipo | Declaración | Estado | Responsable | Fecha Objetivo | Resolución | Artefacto Vinculado |
|---|---|---|---|---|---|---|---|
| AQ-001 | assumption | Las cuotas del proveedor de nube soportan 500 req/s | Abierto | Carlos Ruiz | 2024-02-15 | — | KB-2024-001 |
| AQ-002 | question | ¿Qué proveedor de identidad soporta OAuth2 con SLA >= 99.9%? | Abierto | María López | 2024-02-20 | — | KB-2024-001 |
| AQ-003 | assumption | Los requisitos KYC/AML son estables por 12 meses | Validado | Equipo de Compliance | 2024-01-30 | Confirmado por Legal el 2024-01-28 | KB-2024-001 |
| AQ-004 | question | ¿Cuál es la latencia máxima de onboarding aceptable por mercado? | Diferido | Product Owner | 2024-03-01 | — | CAP-2024-001 |

## 2. Resumen

| Métrica | Cantidad |
|---|---|
| Total de ítems | 4 |
| Abiertos | 2 |
| Validados | 1 |
| Invalidados | 0 |
| Diferidos | 1 |

## 3. Notas de Uso

- Actualiza este registro cada vez que surja un nuevo supuesto o se planteé una pregunta durante talleres de Discovery, refinamiento de backlog o entrevistas con stakeholders.
- Cada supuesto debe ser verificable de forma independiente. Si no puede verificarse, conviértelo en una pregunta.
- Las preguntas que bloqueen decisiones a nivel de épica deben resolverse antes de la aprobación del Design Baseline.
- Vincula cada ítem con el artefacto de origen (Knowledge Brief, Capability Map, etc.) para trazabilidad.
```

---

## 2. Estructura de Datos (JSON)

Para integración con el CLI de Evolith y herramientas automáticas de seguimiento.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Assumptions & Questions Log",
  "type": "object",
  "required": ["id", "items"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Identificador único de esta instancia de registro."
    },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "type", "statement", "status", "owner", "targetDate", "resolution", "linkedArtifact"],
        "properties": {
          "id": {
            "type": "string",
            "description": "Identificador único del ítem (ej., AQ-001)."
          },
          "type": {
            "type": "string",
            "enum": ["assumption", "question"],
            "description": "Si es un supuesto no validado o una pregunta abierta."
          },
          "statement": {
            "type": "string",
            "description": "Texto del supuesto o la pregunta."
          },
          "status": {
            "type": "string",
            "enum": ["open", "validated", "invalidated", "deferred"],
            "description": "Estado actual del ciclo de vida."
          },
          "owner": {
            "type": "string",
            "description": "Persona responsable de resolver este ítem."
          },
          "targetDate": {
            "type": "string",
            "format": "date",
            "description": "Fecha objetivo de resolución (ISO 8601)."
          },
          "resolution": {
            "type": "string",
            "description": "Detalles de resolución una vez resuelto. Cadena vacía si aún está abierto."
          },
          "linkedArtifact": {
            "type": "string",
            "description": "ID del artefacto de origen (ej., Knowledge Brief, Capability Map)."
          }
        }
      },
      "description": "Array de supuestos y preguntas rastreados."
    }
  }
}
```

---

## 3. Ejemplo Mínimo Aplicado

```json
{
  "id": "AQ-LOG-2024-001",
  "items": [
    {
      "id": "AQ-001",
      "type": "assumption",
      "statement": "Las cuotas del proveedor de nube soportan 500 req/s de concurrencia para el dominio de onboarding.",
      "status": "open",
      "owner": "Carlos Ruiz",
      "targetDate": "2024-02-15",
      "resolution": "",
      "linkedArtifact": "KB-2024-001"
    },
    {
      "id": "AQ-002",
      "type": "question",
      "statement": "¿Qué proveedor de identidad soporta OAuth2 con SLA >= 99.9% en todos los mercados objetivo?",
      "status": "open",
      "owner": "María López",
      "targetDate": "2024-02-20",
      "resolution": "",
      "linkedArtifact": "KB-2024-001"
    },
    {
      "id": "AQ-003",
      "type": "assumption",
      "statement": "Los requisitos KYC/AML permanecen estables por los próximos 12 meses.",
      "status": "validated",
      "owner": "Equipo de Compliance",
      "targetDate": "2024-01-30",
      "resolution": "Confirmado por Legal el 2024-01-28.",
      "linkedArtifact": "KB-2024-001"
    }
  ]
}
```

---

## 4. Handoff hacia la Siguiente Fase

El **Registro de Supuestos y Preguntas** alimenta directamente:

1. **Paquete de Contexto de Discovery** — los supuestos validados y preguntas resueltas poblan el campo `assumptionsStatus`.
2. **Mapa de Capacidades** — los supuestos abiertos se vinculan a capacidades específicas a través de `relatedAssumptions`.
3. **Factibilidad Técnica** — los supuestos validados informan los objetivos de NFR y la validación de restricciones.

Los ítems que permanezcan **Abiertos** o **Invalidados** al momento del Design Baseline deben escalarse o aceptarse explícitamente.

---

## Quality Checklist

- [ ] Cada supuesto es verificable de forma independiente
- [ ] Cada pregunta tiene un responsable claro y una fecha objetivo de resolución
- [ ] Todos los ítems están vinculados a un artefacto de origen
- [ ] Las transiciones de estado están documentadas con fechas
- [ ] Ningún ítem ha estado abierto más allá de la fecha objetivo sin escalamiento
- [ ] Los supuestos validados tienen evidencia de resolución adjunta
- [ ] El lenguaje es consistente (sin mezcla de EN/ES dentro del archivo)

---

## Nivel de Adopción Recomendado

**Obligatorio** para todas las iniciativas que tengan un Knowledge Brief aprobado. El registro debe mantenerse durante todo el Discovery y actualizarse antes de cada revisión de compuerta.

---

## Criterios de Actualización

| Disparador | Acción |
|---|---|
| Nuevo supuesto surge durante taller o entrevista | Agregar como nuevo ítem con estado Abierto |
| Supuesto validado con evidencia | Actualizar estado a Validado, agregar resolución con fecha |
| Supuesto demostrado como falso | Actualizar estado a Invalidado, registrar impacto y acción correctiva |
| Pregunta respondida | Actualizar estado a Validado, registrar resolución |
| Pregunta diferida más allá de la fase actual | Actualizar estado a Diferido, establecer nueva fecha objetivo |
| Fecha objetivo vencida | Escalar al patrocinador, agregar nota en el campo de resolución |
