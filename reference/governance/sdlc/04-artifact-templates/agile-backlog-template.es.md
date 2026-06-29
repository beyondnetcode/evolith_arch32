# Agile Backlog

> **Propósito:** Agrupar, priorizar y versionar el conjunto de historias de usuario (funcionales, técnicas y enablers) que componen un Epic o una Iniciativa.
> 
> **Fase SDLC:** 01 - Discovery / Ideación (y refinamiento continuo)
> 
> **Responsable:** Product Owner
> 
> **Quality Gate:** Sprint Planning / Backlog Grooming

## Metadatos del Artefacto

* **URL Upstream Evolith:** `En construcción - Solicitar a Upstream`
* **Entradas Requeridas:** Historias de Usuario Evolith redactadas.
* **Salidas Esperadas:** Backlog priorizado listo para ejecución iterativa (Sprints).
* **Taxonomía Aplicada:** Sprint, MVP, Deuda Técnica.
* **Rules Evolith Aplicables:** R-03 (UTF-8 Clean), R-06 (Split Stories), R-11 (Order).

## 1. Estructura Documental (Markdown)

```markdown
# Backlog: [Nombre de la Iniciativa o Epic]

## 1. Información General
- **Product Owner:** [Nombre]
- **Estado:** [Draft / Refinado / En Ejecución]

## 2. Listado Priorizado (Sprint N)

| ID | Tipo | Título | Puntos / Talla | Prioridad (1-Alta) | Estado |
|---|---|---|---|---|---|
| US-101 | Funcional | Validación de Identidad OCR | M | 1 | Ready |
| TS-102 | Técnica | Configurar API Gateway Auth | S | 2 | Ready |
| EN-103 | Enabler | Pipeline CI/CD para Identity API | M | 1 | Done |
```

## 2. Estructura de Datos (JSON y formato para CSV)

### Estructura JSON
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Agile Backlog",
  "type": "object",
  "properties": {
    "epicName": { "type": "string" },
    "productOwner": { "type": "string" },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "type": { "enum": ["Functional", "Technical", "Enabler", "Debt"] },
          "title": { "type": "string" },
          "size": { "type": "string" },
          "priority": { "type": "integer" },
          "status": { "enum": ["Draft", "Ready", "In Progress", "Done"] }
        }
      }
    }
  }
}
```

### Formato CSV (Exportación)
```csv
ID,Tipo,Titulo,Talla,Prioridad,Estado
US-101,Functional,Validacion de Identidad OCR,M,1,Ready
TS-102,Technical,Configurar API Gateway Auth,S,2,Ready
EN-103,Enabler,Pipeline CI/CD para Identity API,M,1,Done
```

## 3. Ejemplo Mínimo Aplicado (JSON)

```json
{
  "epicName": "Onboarding Digital MVP",
  "productOwner": "Juan Pérez",
  "items": [
    {
      "id": "US-101",
      "type": "Functional",
      "title": "Validación de Identidad OCR",
      "size": "M",
      "priority": 1,
      "status": "Ready"
    },
    {
      "id": "TS-102",
      "type": "Technical",
      "title": "Configurar API Gateway Auth",
      "size": "S",
      "priority": 2,
      "status": "Ready"
    }
  ]
}
```

## 4. Trazabilidad Handoff hacia la Siguiente Fase

El **Agile Backlog** es el puente directo hacia la **Fase 3: Construction / Desarrollo**. Sin embargo, antes de codificar, las historias que alcanzan estado `Ready` pasan por la **Fase 2: Design** para la arquitectura de detalle (diseño de APIs, contratos y modelos de dominio). El CLI consume este JSON para crear las ramas de feature automáticamente (Branching Strategy).
