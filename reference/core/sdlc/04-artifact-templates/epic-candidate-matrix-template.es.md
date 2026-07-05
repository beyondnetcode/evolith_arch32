# Plantilla: Epic Candidate Matrix

> **Navegación Bilingüe:** [English Version](./epic-candidate-matrix-template.md)
> **Propósito:** Mapea capacidades a candidatos de épica con prioridad, dependencias y trazabilidad. Puente entre conocimiento y planificación de entrega.
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
* **Entradas Requeridas:** Knowledge Brief aprobado, Registro de Supuestos y Preguntas validado, Mapa de Capacidades.
* **Salidas Esperadas:** Epic Candidate Matrix que alimenta el Story Seed Bank y el Discovery Readiness Gate.
* **Taxonomía Aplicada:** Alineado con el glosario Evolith (Epic Candidate, Capability, Priority, Dependency, Risk).
* **Rules Evolith Aplicables:** R-03 (UTF-8 Clean), R-09 (Readability), R-13 (Functional Structure).

---

## 1. Estructura Documental (Markdown)

```markdown
# Epic Candidate Matrix: [Nombre de la Iniciativa]

## 1. Candidatos de Épica

| ID Candidato de Épica | Nombre | Derivado De (ID de Capacidad) | Descripción | Prioridad (MoSCoW) | Tamaño Estimado | Dependencias | Riesgos | Supuestos | Listo para Backlog |
|---|---|---|---|---|---|---|---|---|---|
| EC-001 | [Nombre de la Épica] | CAP-001 | [Descripción breve de lo que entrega esta épica] | Must | L | — | [Riesgo 1] | [Supuesto 1] | Sí |
| EC-002 | [Nombre de la Épica] | CAP-002 | [Descripción breve de lo que entrega esta épica] | Should | M | EC-001 | [Riesgo 2] | [Supuesto 2] | No |
| EC-003 | [Nombre de la Épica] | CAP-003 | [Descripción breve de lo que entrega esta épica] | Could | S | — | — | [Supuesto 3] | Sí |

## 2. Resumen

| Métrica | Cantidad |
|---|---|
| Total de candidatos de épica | 3 |
| Listos para Backlog | 2 |
| Bloqueados / No listos | 1 |
| Must | 1 |
| Should | 1 |
| Could | 1 |
| Won't (este ciclo) | 0 |

## 3. Notas de Uso

- Cada candidato de épica debe trazar a una capacidad del Mapa de Capacidades.
- Las dependencias con otras épicas deben ser explícitas; no se permiten dependencias circulares.
- La prioridad sigue MoSCoW: Must, Should, Could, Won't. Al menos una épica Must es requerida para que una iniciativa avance.
- El Tamaño Estimado usa tallas de camiseta: S (1-2 sprints), M (3-4 sprints), L (5-8 sprints), XL (8+ sprints, considerar dividir).
- "Listo para Backlog = Sí" requiere que todos los supuestos estén validados y no haya dependencias bloqueantes.
- Los riesgos y supuestos se copian del Knowledge Brief y el Registro de Supuestos y Preguntas cuando son relevantes.
```

---

## 2. Estructura de Datos (JSON)

Para integración con el CLI de Evolith y herramientas automáticas de scaffolding.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Epic Candidate Matrix",
  "type": "object",
  "required": ["id", "epicCandidates"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Identificador único de este Epic Candidate Matrix."
    },
    "epicCandidates": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "capabilityId", "description", "priority", "estimatedSize", "dependencies", "risks", "assumptions", "readyForBacklog"],
        "properties": {
          "id": {
            "type": "string",
            "description": "Identificador único del candidato de épica (ej., EC-001)."
          },
          "name": {
            "type": "string",
            "description": "Nombre descriptivo corto de la épica."
          },
          "capabilityId": {
            "type": "string",
            "description": "Referencia a la capacidad del Mapa de Capacidades."
          },
          "description": {
            "type": "string",
            "description": "Lo que esta épica entrega al producto."
          },
          "priority": {
            "type": "string",
            "enum": ["Must", "Should", "Could", "Won't"],
            "description": "Nivel de prioridad MoSCoW."
          },
          "estimatedSize": {
            "type": "string",
            "enum": ["S", "M", "L", "XL"],
            "description": "Estimación de tamaño en talla de camiseta."
          },
          "dependencies": {
            "type": "array",
            "items": { "type": "string" },
            "description": "IDs de otros candidatos de épica de los que depende esta épica."
          },
          "risks": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Riesgos heredados del Knowledge Brief o el Registro de Supuestos."
          },
          "assumptions": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Supuestos que deben cumplirse para que esta épica avance."
          },
          "readyForBacklog": {
            "type": "boolean",
            "description": "Si este candidato de épica está listo para agregar al backlog del producto."
          }
        }
      },
      "description": "Array de candidatos de épicas derivados de capacidades."
    }
  }
}
```

---

## 3. Ejemplo Mínimo Aplicado

```json
{
  "id": "ECM-2024-001",
  "epicCandidates": [
    {
      "id": "EC-001",
      "name": "Motor de Verificación de Identidad",
      "capabilityId": "CAP-001",
      "description": "Implementar verificación de identidad automatizada con escaneo de documentos y detección de viveza.",
      "priority": "Must",
      "estimatedSize": "L",
      "dependencies": [],
      "risks": ["SLA del proveedor de identidad por debajo del 99.9%"],
      "assumptions": ["Requisitos KYC/AML estables por 12 meses"],
      "readyForBacklog": true
    },
    {
      "id": "EC-002",
      "name": "Orquestación del Onboarding",
      "capabilityId": "CAP-002",
      "description": "Construir la capa de orquestación que secuencia los pasos de verificación y maneja reintentos.",
      "priority": "Must",
      "estimatedSize": "M",
      "dependencies": ["EC-001"],
      "risks": ["Retrasos en aprobación regulatoria para el nuevo flujo de verificación"],
      "assumptions": ["El bus de eventos existente puede absorber los eventos del dominio de onboarding"],
      "readyForBacklog": false
    },
    {
      "id": "EC-003",
      "name": "Integración de Canal de Socios",
      "capabilityId": "CAP-003",
      "description": "Exponer la API de onboarding para integraciones de canal de socios con limitación de tasa y gestión de SLA.",
      "priority": "Should",
      "estimatedSize": "M",
      "dependencies": ["EC-001", "EC-002"],
      "risks": ["Cambios en contratos de API de socios"],
      "assumptions": ["Requisitos de integración con socios finalizados para Q2"],
      "readyForBacklog": false
    }
  ]
}
```

---

## 4. Handoff hacia la Siguiente Fase

Una vez validado, el **Epic Candidate Matrix** alimenta directamente:

1. **Story Seed Bank** — cada candidato de épica genera una o más semillas de historia para refinamiento del backlog.
2. **Discovery Readiness Gate** — el estado "Listo para Backlog" es un input de verificación del gate.
3. **Factibilidad Técnica** — épicas de tamaño XL pueden requerir evaluación de factibilidad antes de dividir.

Los candidatos de épica marcados "Listo para Backlog = No" permanecen en la matriz hasta que se resuelvan las condiciones bloqueantes.

---

## Quality Checklist

- [ ] Cada candidato de épica traza a un ID de Capacidad del Mapa de Capacidades
- [ ] La prioridad sigue MoSCoW sin duplicados (cada épica tiene exactamente una prioridad)
- [ ] Las dependencias referencian IDs válidos de candidatos de épica (sin dependencias circulares)
- [ ] Al menos una épica tiene Prioridad = Must
- [ ] Ninguna épica está marcada Listo para Backlog si tiene dependencias no resueltas
- [ ] Las estimaciones de tamaño usan S/M/L/XL consistentemente (sin tama texto libre)
- [ ] Los riesgos y supuestos son trazables al Knowledge Brief o al Registro de Supuestos
- [ ] El lenguaje es consistente (sin mezcla de EN/ES dentro del archivo)
- [ ] El documento está almacenado en control de versiones junto con el código o artefactos de diseño relevantes

---

## Nivel de Adopción Recomendado

**Obligatorio** para todas las iniciativas que ingresan a Discovery. El Epic Candidate Matrix es el puente entre la descomposición de capacidades y la planificación de entrega, y es el prerrequisito para el Story Seed Bank.

---

## Criterios de Actualización

| Disparador | Acción |
|---|---|
| Nueva capacidad identificada en el Mapa de Capacidades | Agregar como nuevo candidato de épica con prioridad por defecto Could |
| Dependencia resuelta o nueva dependencia descubierta | Actualizar columna de dependencias y reevaluar Listo para Backlog |
| Riesgo materializado o nuevo riesgo emergente | Actualizar columna de riesgos para épicas afectadas |
| Supuesto validado o invalidado | Actualizar columna de supuestos; recalcular Listo para Backlog |
| Cambio en la estimación de tamaño de la épica | Actualizar tamaño estimado; dividir épicas XL si es necesario |
| Repriorización de prioridad | Actualizar prioridad; asegurar que al menos una épica Must permanezca |
| Revisión trimestral | Revisión completa de la matriz; eliminar candidatos de épica inactivos o degradar a Won't |
