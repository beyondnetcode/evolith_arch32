# Ballpark Estimation

> **Propósito:** Proveer una estimación de alto nivel (T-Shirt sizing, orden de magnitud) de esfuerzo técnico, OPEX/CAPEX y tamaño de equipo, para evaluar viabilidad financiera frente al Business Case.
> 
> **Fase SDLC:** 01 - Discovery / Ideación
> 
> **Responsable:** Arquitecto / Tech Lead
> 
> **Quality Gate:** Compuerta de Aprobación de Arquitectura y Financiamiento.

## Metadatos del Artefacto

* **URL Upstream Evolith:** `En construcción - Solicitar a Upstream`
* **Entradas Requeridas:** Business Case ROI.
* **Salidas Esperadas:** Estimación macro aprobada que viabiliza el inicio de las historias de usuario.
* **Taxonomía Aplicada:** OPEX, CAPEX, T-Shirt Sizing.
* **Rules Evolith Aplicables:** R-03 (UTF-8 Clean).

## 1. Estructura Documental (Markdown)

```markdown
# Ballpark Estimation: [Nombre de la Iniciativa]

## 1. Alcance de la Estimación
[Contexto de lo que se está estimando. Exclusiones explícitas.]

## 2. Tamaño de Equipo Propuesto
- **Roles:** [e.g., 1 Tech Lead, 2 Backend, 1 QA]
- **Duración Estimada:** [e.g., 3 Sprints / 1.5 meses]

## 3. Desglose de Esfuerzo (T-Shirt Sizing)
| Componente/Módulo | Complejidad (S/M/L/XL) | Supuestos Técnicos |
| --- | --- | --- |
| [Módulo 1] | [Tamaño] | [Detalles] |

## 4. Costos Asociados (CAPEX / OPEX)
- **CAPEX (Infraestructura nueva / Licencias):** [$ Valor estimado]
- **OPEX (Costo equipo y operación):** [$ Valor estimado]
```

## 2. Estructura de Datos (JSON / Estructura compatible con CSV/Excel)

Diseñado para ser fácilmente convertido a CSV o consumido por Excel a través del CLI de Evolith.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Ballpark Estimation",
  "type": "object",
  "properties": {
    "businessCaseId": { "type": "string" },
    "team": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "role": { "type": "string" },
          "count": { "type": "integer" }
        }
      }
    },
    "durationSprints": { "type": "integer" },
    "estimates": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "component": { "type": "string" },
          "size": { "enum": ["S", "M", "L", "XL"] },
          "assumptions": { "type": "string" }
        }
      }
    },
    "financials": {
      "type": "object",
      "properties": {
        "capex": { "type": "number" },
        "opex": { "type": "number" },
        "currency": { "type": "string" }
      }
    }
  }
}
```

## 3. Ejemplo Mínimo Aplicado

```json
{
  "businessCaseId": "BC-2023-001",
  "team": [
    { "role": "Tech Lead", "count": 1 },
    { "role": "Backend Engineer", "count": 2 },
    { "role": "Frontend Engineer", "count": 1 }
  ],
  "durationSprints": 4,
  "estimates": [
    {
      "component": "Integración con KYC Provider",
      "size": "L",
      "assumptions": "Requiere VPN Site-to-Site"
    },
    {
      "component": "Frontend Web Onboarding",
      "size": "M",
      "assumptions": "Uso de componentes UI existentes"
    }
  ],
  "financials": {
    "capex": 5000.00,
    "opex": 45000.00,
    "currency": "USD"
  }
}
```

## 4. Trazabilidad Handoff hacia la Siguiente Fase

La aprobación de la **Ballpark Estimation** desencadena la fase detallada de requerimientos. El tamaño del equipo y los componentes identificados (`estimates`) dictan los Epics iniciales bajo los cuales se crearán las **User Stories Evolith**.
