# Discovery Canvas

> **Propósito:** Registro inicial de una iniciativa para alinear el objetivo de negocio, el contexto, el problema a resolver y el valor esperado.
> 
> **Fase SDLC:** 01 - Discovery / Ideación
> 
> **Responsable:** Solicitante / PM
> 
> **Quality Gate:** Aprobación de Ideation Hub

## Metadatos del Artefacto

* **URL Upstream Evolith:** `En construcción - Solicitar a Upstream`
* **Entradas Requeridas:** Necesidad de negocio o problema detectado, patrocinador identificado.
* **Salidas Esperadas:** Aprobación preliminar para avanzar hacia el Business Case (Ideation Hub).
* **Taxonomía Aplicada:** Alineado con glosario Evolith (MVP, Time to Market, Bounded Context).
* **Rules Evolith Aplicables:** R-03 (UTF-8 Clean), R-06 (Split Stories), R-09 (Readability).

## 1. Estructura Documental (Markdown)

```markdown
# [Nombre de la Iniciativa] - Discovery Canvas

## 1. Contexto y Problema
[Describe brevemente el escenario actual y el dolor principal que justifica esta iniciativa. Usa lenguaje de negocio claro (Rule R-09).]

## 2. Objetivo de Negocio y Oportunidad
[¿Qué queremos lograr? ¿Cuál es el beneficio directo esperado?]

## 3. Público Objetivo / Stakeholders
[¿Quiénes son los usuarios impactados? ¿Quiénes son los patrocinadores?]

## 4. Supuestos y Restricciones
[Lista de asunciones técnicas o de negocio que condicionan la iniciativa.]

## 5. Criterios de Éxito Preliminares
[¿Cómo sabremos que esta iniciativa fue exitosa? (Métricas cualitativas o cuantitativas de alto nivel).]
```

## 2. Estructura de Datos (JSON)

Para integración con el CLI de Evolith y herramientas automáticas de scaffolding.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Discovery Canvas",
  "type": "object",
  "required": [
    "initiativeName",
    "sponsor",
    "businessContext",
    "problemStatement",
    "expectedValue"
  ],
  "properties": {
    "initiativeName": {
      "type": "string",
      "description": "Nombre oficial de la iniciativa."
    },
    "sponsor": {
      "type": "string",
      "description": "Patrocinador ejecutivo (Stakeholder principal)."
    },
    "businessContext": {
      "type": "string",
      "description": "Descripción del escenario de negocio actual."
    },
    "problemStatement": {
      "type": "string",
      "description": "Descripción del problema u oportunidad."
    },
    "expectedValue": {
      "type": "string",
      "description": "Valor esperado cualitativo y cuantitativo."
    },
    "assumptions": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Supuestos y restricciones operativas."
    }
  }
}
```

## 3. Ejemplo Mínimo Aplicado

```json
{
  "initiativeName": "Modernización de Onboarding Digital",
  "sponsor": "Dirección de Experiencia de Usuario",
  "businessContext": "El proceso actual de alta de usuarios toma en promedio 48 horas debido a verificaciones manuales.",
  "problemStatement": "Alta tasa de abandono (40%) durante las primeras 24 horas del registro.",
  "expectedValue": "Reducir el Time to Market del registro a 10 minutos automatizando verificaciones, aumentando la conversión en un 25%.",
  "assumptions": [
    "El proveedor de validación de identidad soporta una SLA del 99.9%.",
    "Cumplimiento normativo validado previamente por Compliance."
  ]
}
```

## 4. Trazabilidad Handoff hacia la Siguiente Fase

La salida aprobada del **Discovery Canvas** (particularmente el `expectedValue` y el `problemStatement`) se inyecta directamente como entrada fundamental para estructurar el **Business Case ROI**. El CLI de Evolith utilizará los campos JSON para inicializar el Business Case de forma automática.
