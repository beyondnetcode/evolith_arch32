# User Story Evolith

> **Propósito:** Definir una historia funcional atómica, clara para el negocio, aislando los detalles técnicos, e incluyendo criterios de aceptación verificables (Gherkin/BDD).
> 
> **Fase SDLC:** 01 - Discovery / Ideación (y refinamiento continuo)
> 
> **Responsable:** Agente AI / PM
> 
> **Quality Gate:** Sprint Planning / Aprobación Técnica de Handoff a Diseño

## Metadatos del Artefacto

* **URL Upstream Evolith:** `En construcción - Solicitar a Upstream`
* **Entradas Requeridas:** Ballpark Estimation aprobado; Epic definido.
* **Salidas Esperadas:** Historia lista para estimación detallada o para Handoff a la fase de Diseño.
* **Taxonomía Aplicada:** Alineado con glosario Evolith (Definition of Done, Bounded Context).
* **Rules Evolith Aplicables:** R-06 (Split Stories), R-09 (Readability), R-13 (Functional Structure).

## 1. Estructura Documental (Markdown Spec)

```markdown
# Historia: [US-XXX] - [Título Descriptivo]

## 1. Descripción Funcional
**Como** [tipo de usuario / rol]
**Quiero** [acción a realizar]
**Para** [valor o beneficio de negocio esperado]

## 2. Criterios de Aceptación (BDD/Gherkin)
**Escenario 1:** [Nombre del escenario]
- **Dado que** [contexto inicial]
- **Cuando** [acción ejecutada]
- **Entonces** [resultado esperado]

## 3. Requisitos Técnicos (Isolados)
*(Sección reservada para Arquitectos / Devs - Cumplimiento Rule R-13)*
- **Bounded Context:** [Nombre del Contexto]
- **Dependencias:** [APIs, BD, etc.]

## 4. Definition of Done (DoD)
- [ ] Código implementado y revisado.
- [ ] Pruebas unitarias superan el 80% de cobertura.
- [ ] Criterios de aceptación verificados.
```

## 2. Estructura de Datos (JSON)

Para sincronización automatizada con sistemas como Jira, Azure DevOps o el CLI de Evolith.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "User Story Evolith",
  "type": "object",
  "required": ["storyId", "title", "role", "action", "benefit", "acceptanceCriteria"],
  "properties": {
    "storyId": { "type": "string" },
    "title": { "type": "string" },
    "role": { "type": "string" },
    "action": { "type": "string" },
    "benefit": { "type": "string" },
    "acceptanceCriteria": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "scenario": { "type": "string" },
          "given": { "type": "string" },
          "when": { "type": "string" },
          "then": { "type": "string" }
        }
      }
    },
    "technicalRequirements": {
      "type": "object",
      "properties": {
        "boundedContext": { "type": "string" },
        "dependencies": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}
```

## 3. Ejemplo Mínimo Aplicado

```json
{
  "storyId": "US-101",
  "title": "Validación de Identidad por OCR",
  "role": "Cliente Nuevo",
  "action": "subir una foto de mi documento de identidad",
  "benefit": "validar mi identidad automáticamente sin espera manual",
  "acceptanceCriteria": [
    {
      "scenario": "Subida exitosa de documento claro",
      "given": "El cliente está en la pantalla de carga de documento",
      "when": "Sube una imagen nítida en formato JPG",
      "then": "El sistema extrae los datos y aprueba la validación en menos de 10 segundos"
    }
  ],
  "technicalRequirements": {
    "boundedContext": "IdentityVerificationContext",
    "dependencies": ["AWS Textract API", "Core User DB"]
  }
}
```

## 4. Trazabilidad Handoff hacia la Siguiente Fase

Varias **User Stories** se agrupan en el **Agile Backlog**. Una vez que la historia alcanza su estado *Ready*, cruza el umbral (Handoff) hacia la **Fase 2: Design / Diseño**, donde la sección `technicalRequirements` se expande con diagramas C4, contratos OpenAPI y ADRs.
