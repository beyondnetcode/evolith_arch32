# Discovery Canvas

> **Bilingual Navigation:** [Versión en Español](./discovery-canvas-template.es.md)
> **Propósito:** Registro inicial de una iniciativa para alinear el contexto, el problema a resolver, las restricciones técnicas y los atributos de calidad esperados.
> 
> **Fase SDLC:** 01 - Discovery / Ideación
> 
> **Responsable:** Solicitante / PM
> 
> **Quality Gate:** Aprobación de Ideation Hub

## Metadatos del Artefacto

* **URL Upstream Evolith:** `En construcción - Solicitar a Upstream`
* **Entradas Requeridas:** Necesidad técnica o problema detectado, patrocinador identificado.
* **Salidas Esperadas:** Aprobación preliminar para avanzar hacia el Canvas de Factibilidad Técnica / PRD (Ideation Hub).
* **Taxonomía Aplicada:** Alineado con glosario Evolith (MVP, NFRs, Bounded Context).
* **Rules Evolith Aplicables:** R-03 (UTF-8 Clean), R-06 (Split Stories), R-09 (Readability).

---

## 1. Estructura Documental (Markdown)

```markdown
# [Nombre de la Iniciativa] - Discovery Canvas

## 1. Contexto y Problema
[Describe brevemente el escenario actual y el dolor principal que justifica esta iniciativa. Usa lenguaje técnico y de negocio claro (Rule R-09).]

## 2. Restricciones Técnicas y Calidad (NFRs)
[¿Qué Atributos de Calidad son prioritarios (e.g., Latencia < 200ms, Alta Disponibilidad 99.9%, Seguridad de Datos)? ¿Cuáles son las limitaciones de infraestructura conocidas?]

## 3. Público Objetivo / Stakeholders
[¿Quiénes son los usuarios impactados? ¿Quiénes son los ingenieros o patrocinadores involucrados?]

## 4. Supuestos y Restricciones de Recursos
[Lista de asunciones técnicas, límites de cuotas de nube o limitaciones del stack tecnológico que condicionan la iniciativa.]

## 5. Criterios de Éxito y Atributos de Calidad Preliminares
[¿Cómo sabremos que esta iniciativa fue exitosa desde el punto de vista de arquitectura y rendimiento? (Métricas cualitativas o cuantitativas de NFRs).]
```

---

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
    "expectedQualityAttributes"
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
      "description": "Descripción del escenario actual."
    },
    "problemStatement": {
      "type": "string",
      "description": "Descripción del problema u oportunidad."
    },
    "expectedQualityAttributes": {
      "type": "object",
      "required": ["latencyMs", "concurrencyRequestsSec", "availabilitySla"],
      "properties": {
        "latencyMs": { "type": "integer" },
        "concurrencyRequestsSec": { "type": "integer" },
        "availabilitySla": { "type": "string" },
        "securityCompliance": { "type": "string" }
      },
      "description": "Atributos de calidad y NFRs requeridos."
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

---

## 3. Ejemplo Mínimo Aplicado

```json
{
  "initiativeName": "Modernización de Onboarding Digital",
  "sponsor": "Dirección de Experiencia de Usuario",
  "businessContext": "El proceso actual de alta de usuarios toma en promedio 48 horas debido a verificaciones manuales.",
  "problemStatement": "Alta tasa de abandono (40%) durante las primeras 24 horas del registro debido a la latencia del proceso.",
  "expectedQualityAttributes": {
    "latencyMs": 200,
    "concurrencyRequestsSec": 500,
    "availabilitySla": "99.9%",
    "securityCompliance": "OAuth2 / OWASP Top 10"
  },
  "assumptions": [
    "El proveedor de validación de identidad soporta una SLA del 99.9%.",
    "Cumplimiento normativo validado previamente por Compliance."
  ]
}
```

---

## 4. Trazabilidad Handoff hacia la Siguiente Fase

La salida aprobada del **Discovery Canvas** (particularmente el `expectedQualityAttributes` y el `problemStatement`) se inyecta directamente como entrada fundamental para estructurar el **Canvas de Factibilidad Técnica** (Technical Feasibility Canvas). El CLI de Evolith utilizará los campos JSON para inicializar el documento de factibilidad técnica de forma automática.
