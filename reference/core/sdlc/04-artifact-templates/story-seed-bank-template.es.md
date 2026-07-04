# Plantilla: Story Seed Bank

> **Navegación Bilingüe:** [English Version](./story-seed-bank-template.md)
> **Propósito:** Semillas mínimas de historia antes del refinamiento completo del backlog. Cada semilla captura suficiente contexto para una futura historia sin ser una historia de usuario completa.
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
* **Entradas Requeridas:** Epic Candidate Matrix aprobado, Registro de Supuestos y Preguntas validado.
* **Salidas Esperadas:** Story Seed Bank que alimenta el Discovery Readiness Gate y el futuro refinamiento del backlog.
* **Taxonomía Aplicada:** Alineado con el glosario Evolith (Story Seed, Epic Candidate, Knowledge Level, Acceptance Criteria).
* **Rules Evolith Aplicables:** R-03 (UTF-8 Clean), R-09 (Readability), R-13 (Functional Structure).

---

## 1. Estructura Documental (Markdown)

```markdown
# Story Seed Bank: [Nombre de la Iniciativa]

## 1. Semillas de Historia

| ID Semilla de Historia | Nombre | Derivado De (ID Candidato de Épica) | Rol de Usuario | Comportamiento Deseado | Criterios de Aceptación (Borrador) | Nivel de Conocimiento | Bloqueado Por |
|---|---|---|---|---|---|---|---|
| SS-001 | [Nombre de la Semilla] | EC-001 | [Rol] | [Lo que el usuario quiere hacer] | [CA 1] / [CA 2] | K2 | — |
| SS-002 | [Nombre de la Semilla] | EC-001 | [Rol] | [Lo que el usuario quiere hacer] | [CA 1] | K1 | SS-001 |
| SS-003 | [Nombre de la Semilla] | EC-002 | [Rol] | [Lo que el usuario quiere hacer] | [CA 1] / [CA 2] / [CA 3] | K3 | — |

## 2. Resumen

| Métrica | Cantidad |
|---|---|
| Total de semillas de historia | 3 |
| Listas para refinamiento | 2 |
| Bloqueadas | 1 |
| Nivel de Conocimiento K0-K1 | 1 |
| Nivel de Conocimiento K2-K3 | 2 |
| Nivel de Conocimiento K4 | 0 |

## 3. Referencia de Niveles de Conocimiento

| Nivel | Etiqueta | Descripción |
|---|---|---|
| K0 | Desconocido | El problema aún no se entiende; la semilla es una hipótesis |
| K1 | Conocido | El problema reconocido pero el enfoque de solución no está claro |
| K2 | Definido | El problema y el enfoque de solución definidos pero no validados |
| K3 | Validado | El enfoque de solución validado mediante investigación o prototipo |
| K4 | Comprobado | La solución implementada y validada en contexto de producción |

## 4. Notas de Uso

- Las semillas de historia NO son historias de usuario completas. Capturan contexto mínimo para refinamiento futuro.
- Cada semilla debe trazar a un ID de Candidato de Épica del Epic Candidate Matrix.
- El Nivel de Conocimiento indica la madurez del descubrimiento: semillas K0-K1 necesitan investigación antes del refinamiento; semillas K3-K4 están listas para refinamiento.
- "Bloqueado Por" referencia otros IDs de Semilla de Historia que deben completarse o refinarse primero.
- Los criterios de aceptación son borradores — se expandirán durante el refinamiento del backlog.
- Las semillas a nivel K4 pueden promoverse directamente a historias de usuario completas.
```

---

## 2. Estructura de Datos (JSON)

Para integración con el CLI de Evolith y herramientas automáticas de scaffolding.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Story Seed Bank",
  "type": "object",
  "required": ["id", "storySeeds"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Identificador único de este Story Seed Bank."
    },
    "storySeeds": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "epicCandidateId", "userRole", "desiredBehavior", "acceptanceCriteria", "knowledgeLevel", "blockedBy"],
        "properties": {
          "id": {
            "type": "string",
            "description": "Identificador único de la semilla de historia (ej., SS-001)."
          },
          "name": {
            "type": "string",
            "description": "Nombre descriptivo corto de la semilla."
          },
          "epicCandidateId": {
            "type": "string",
            "description": "Referencia al candidato de épica del Epic Candidate Matrix."
          },
          "userRole": {
            "type": "string",
            "description": "El rol de usuario que se beneficiaría de esta historia."
          },
          "desiredBehavior": {
            "type": "string",
            "description": "Lo que el usuario quiere lograr (en lenguaje claro)."
          },
          "acceptanceCriteria": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Criterios de aceptación borrador para ser refinados durante el refinamiento del backlog."
          },
          "knowledgeLevel": {
            "type": "string",
            "enum": ["K0", "K1", "K2", "K3", "K4"],
            "description": "Nivel de madurez del descubrimiento de esta semilla."
          },
          "blockedBy": {
            "type": "array",
            "items": { "type": "string" },
            "description": "IDs de semillas de historia que bloquean esta semilla."
          }
        }
      },
      "description": "Array de semillas mínimas de historia para refinamiento futuro."
    }
  }
}
```

---

## 3. Ejemplo Mínimo Aplicado

```json
{
  "id": "SSB-2024-001",
  "storySeeds": [
    {
      "id": "SS-001",
      "name": "Subir documento de identidad",
      "epicCandidateId": "EC-001",
      "userRole": "Cliente Nuevo",
      "desiredBehavior": "Subir un documento de identidad gubernamental para verificación",
      "acceptanceCriteria": [
        "El cliente puede subir JPG, PNG o PDF de hasta 10MB",
        "El sistema valida que el documento no esté vencido",
        "El sistema confirma la carga y muestra el estado de procesamiento"
      ],
      "knowledgeLevel": "K2",
      "blockedBy": []
    },
    {
      "id": "SS-002",
      "name": "Verificación de viveza durante el onboarding",
      "epicCandidateId": "EC-001",
      "userRole": "Cliente Nuevo",
      "desiredBehavior": "Completar una verificación de viveza para demostrar que es una persona real",
      "acceptanceCriteria": [
        "El cliente es guiado a través de la captura de selfie con indicaciones en pantalla",
        "El sistema detecta y rechaza fotos o reproducciones de video"
      ],
      "knowledgeLevel": "K1",
      "blockedBy": ["SS-001"]
    },
    {
      "id": "SS-003",
      "name": "Recibir notificación del resultado de verificación",
      "epicCandidateId": "EC-002",
      "userRole": "Cliente Nuevo",
      "desiredBehavior": "Recibir una notificación cuando la verificación de identidad esté completa",
      "acceptanceCriteria": [
        "El cliente recibe notificación por correo electrónico dentro de 5 minutos de la completación de la verificación",
        "La notificación incluye el estado de verificación (aprobado / rechazado / revisión manual)",
        "El cliente puede acceder al resultado detallado en la aplicación"
      ],
      "knowledgeLevel": "K3",
      "blockedBy": []
    }
  ]
}
```

---

## 4. Handoff hacia la Siguiente Fase

El **Story Seed Bank** alimenta directamente:

1. **Discovery Readiness Gate** — el conteo de semillas K0-K1 es un input de verificación del gate (un conteo alto puede indicar descubrimiento insuficiente).
2. **Refinamiento del Backlog** — las semillas K2-K4 se refinan en historias de usuario completas durante la planificación del sprint.
3. **Factibilidad Técnica** — las semillas K0-K1 con incertidumbre técnica pueden requerir evaluación de factibilidad antes del refinamiento.

Las semillas a nivel **K4** pueden evitar el refinamiento y promoverse directamente al backlog del producto.

---

## Quality Checklist

- [ ] Cada semilla de historia traza a un ID de Candidato de Épica del Epic Candidate Matrix
- [ ] Cada semilla tiene un rol de usuario claro y comportamiento deseado
- [ ] Los criterios de aceptación están presentes (aunque en calidad de borrador)
- [ ] El Nivel de Conocimiento está asignado consistentemente (K0-K4)
- [ ] "Bloqueado Por" referencia IDs válidos de Semilla de Historia (sin bloques circulares)
- [ ] Al menos el 50% de las semillas son K2 o superiores (indica progreso suficiente del descubrimiento)
- [ ] Ninguna semilla está marcada K4 sin evidencia de validación en producción
- [ ] El lenguaje es consistente (sin mezcla de EN/ES dentro del archivo)
- [ ] El documento está almacenado en control de versiones junto con el código o artefactos de diseño relevantes

---

## Nivel de Adopción Recomendado

**Obligatorio** para todas las iniciativas que tienen un Epic Candidate Matrix aprobado. El Story Seed Bank captura la intención temprana de entrega y es el prerrequisito para el Discovery Readiness Gate.

---

## Criterios de Actualización

| Disparador | Acción |
|---|---|
| Nuevo candidato de épica agregado a la matriz | Generar semillas de historia para la nueva épica |
| Nivel de conocimiento avanza (ej., K1 a K2) | Actualizar nivel de conocimiento; refinar criterios de aceptación si es posible |
| Semilla de historia se bloquea | Actualizar Bloqueado Por; reevaluar si la semilla debe diferirse |
| Bloqueo resuelto | Eliminar de Bloqueado Por; reasignar nivel de conocimiento |
| Semilla validada en producción | Promover a K4; considerar promoción directa a historia de usuario |
| Revisión trimestral | Eliminar semillas de épicas inactivas; consolidar semillas superpuestas |
