# Plantilla: Paquete de Contexto de Discovery

> **Navegación Bilingüe:** [English Version](./discovery-context-pack-template.md)
> **Propósito:** Paquete de conocimiento exportable y autocontenido para agentes de IA y repositorios satélite. Consumible por CLI, MCP o lectura directa.
>
> **Fase SDLC:** 01 - Discovery / Ideación
>
> **Subfase:** 01.1 - Knowledge-First Discovery / KDD Readiness
>
> **Responsable sugerido:** Platform Architect / Pipeline de Agentes de IA
>
> **Quality Gate:** Aprobación del Knowledge Brief

## Metadatos del Artefacto

* **URL Upstream Evolith:** `En construcción - Solicitar a Upstream`
* **Entradas Requeridas:** Discovery Knowledge Brief aprobado, Registro de Supuestos y Preguntas, Mapa de Capacidades.
* **Salidas Esperadas:** Paquete de contexto autocontenido que agentes de IA, herramientas CLI y repositorios satélite pueden consumir para inicializar artefactos descendentes.
* **Taxonomía Aplicada:** Alineado con el glosario Evolith (Initiative, Capability, Risk, Assumption, Adoption Level).
* **Rules Evolith Aplicables:** R-03 (UTF-8 Clean), R-20 (Satellite Upstream Promotion).

---

## 1. Estructura Documental (Markdown)

```markdown
# Paquete de Contexto de Discovery: [Nombre de la Iniciativa]

## 1. Resumen Ejecutivo
[Resumen de 2-3 oraciones de la iniciativa, su valor y estado actual. Preámbulo legible por máquina.]

## 2. ID de la Iniciativa
[Identificador único que referencia el Knowledge Brief de origen.]

## 3. Nivel de Adopción
[Mandatory | Recommended | Optional — indica cómo este paquete de contexto debe ser consumido por procesos descendentes.]

## 4. Resumen del Knowledge Brief
[Versión condensada del Knowledge Brief: problema, valor, actores clave y contexto de dominio.]

| Campo | Valor |
|---|---|
| Problema | [Declaración del problema en una línea] |
| Valor | [Propuesta de valor en una línea] |
| Dominio | [Dominio principal / bounded context] |
| Patrocinador | [Nombre] |

## 5. Lista de Capacidades
[Extraída del Mapa de Capacidades. Cada capacidad es una unidad de comportamiento significativa para el negocio.]

| ID de Capacidad | Nombre | Dominio | Prioridad |
|---|---|---|---|
| CAP-001 | [Nombre de Capacidad] | [Dominio] | Must/Should/Could/Wont |

## 6. Riesgos Abiertos
[Riesgos del Knowledge Brief que permanecen sin resolver.]

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| [Riesgo] | [Alta/Media/Baja] | [Alta/Media/Baja] | [Estrategia] |

## 7. Estado de Supuestos
[Resumen del Registro de Supuestos y Preguntas.]

| Estado | Cantidad |
|---|---|
| Abiertos | [N] |
| Validados | [N] |
| Invalidados | [N] |
| Diferidos | [N] |

## 8. Siguientes Pasos Recomendados
[Lista ordenada de acciones inmediatas para consumidores descendentes.]

1. [Siguiente paso 1]
2. [Siguiente paso 2]
3. [Siguiente paso 3]
```

---

## 2. Estructura de Datos (JSON)

Para integración con el CLI de Evolith, pipelines MCP e ingestión de agentes de IA.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Discovery Context Pack",
  "type": "object",
  "required": ["id", "version", "initiativeId", "adoptionLevel", "knowledgeBriefRef", "capabilities", "openRisks", "assumptionsStatus", "nextSteps", "generatedAt"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Identificador único de esta instancia de paquete de contexto."
    },
    "version": {
      "type": "string",
      "description": "Versión semántica de este paquete de contexto."
    },
    "initiativeId": {
      "type": "string",
      "description": "Referencia al Knowledge Brief de origen."
    },
    "adoptionLevel": {
      "type": "string",
      "enum": ["Mandatory", "Recommended", "Optional"],
      "description": "Nivel de adopción para consumidores descendentes."
    },
    "knowledgeBriefRef": {
      "type": "string",
      "description": "Ruta o URL al Knowledge Brief completo."
    },
    "capabilities": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "domain", "priority"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "domain": { "type": "string" },
          "priority": { "type": "string", "enum": ["Must", "Should", "Could", "Wont"] }
        }
      },
      "description": "Unidades de comportamiento significativas para el negocio extraídas del Mapa de Capacidades."
    },
    "openRisks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["description", "probability", "impact"],
        "properties": {
          "description": { "type": "string" },
          "probability": { "type": "string", "enum": ["High", "Medium", "Low"] },
          "impact": { "type": "string", "enum": ["High", "Medium", "Low"] },
          "mitigation": { "type": "string" }
        }
      },
      "description": "Riesgos no resueltos del Knowledge Brief."
    },
    "assumptionsStatus": {
      "type": "object",
      "required": ["open", "validated", "invalidated", "deferred"],
      "properties": {
        "open": { "type": "integer" },
        "validated": { "type": "integer" },
        "invalidated": { "type": "integer" },
        "deferred": { "type": "integer" }
      },
      "description": "Conteos resumidos del Registro de Supuestos y Preguntas."
    },
    "nextSteps": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Lista ordenada de acciones recomendadas."
    },
    "generatedAt": {
      "type": "string",
      "format": "date-time",
      "description": "Marca de tiempo ISO 8601 de cuándo se generó este paquete."
    }
  }
}
```

---

## 3. Ejemplo Mínimo Aplicado

```json
{
  "id": "CTX-2024-001",
  "version": "1.0.0",
  "initiativeId": "KB-2024-001",
  "adoptionLevel": "Mandatory",
  "knowledgeBriefRef": "./discovery-knowledge-briefs/KB-2024-001.md",
  "capabilities": [
    { "id": "CAP-001", "name": "Verificación de Identidad", "domain": "Ciclo de Vida del Cliente", "priority": "Must" },
    { "id": "CAP-002", "name": "Orquestación de Onboarding", "domain": "Ciclo de Vida del Cliente", "priority": "Must" },
    { "id": "CAP-003", "name": "Escaneo de Documentos KYC", "domain": "Compliance", "priority": "Should" }
  ],
  "openRisks": [
    { "description": "El SLA del proveedor de identidad está por debajo del 99.9% en períodos de pico", "probability": "Medium", "impact": "High", "mitigation": "Negociar cláusula de SLA o evaluar proveedor alternativo" }
  ],
  "assumptionsStatus": { "open": 2, "validated": 1, "invalidated": 0, "deferred": 1 },
  "nextSteps": [
    "Resolver la decisión de selección del proveedor de identidad (AQ-002)",
    "Completar el mapa de capacidades con análisis de dependencias",
    "Enviar para aprobación de la compuerta del Knowledge Brief"
  ],
  "generatedAt": "2024-02-01T10:00:00Z"
}
```

---

## 4. Handoff hacia la Siguiente Fase

El **Paquete de Contexto de Discovery** sirve como entrada para:

1. **Factibilidad Técnica** — las capacidades y riesgos informan el alcance de NFR y la validación de restricciones.
2. **Refinamiento del Mapa de Capacidades** — el paquete proporciona la lista inicial de capacidades para la descomposición de dominio.
3. **Desglose de Épicas** — las capacidades con prioridad `Must` se convierten en candidatas a épicas para el Design Baseline.
4. **Inicialización de repositorios satélite** — los agentes de IA consumen este paquete para inicializar el contexto del proyecto en nuevos repositorios.

El campo `generatedAt` permite la validación de vigencia por herramientas CLI y guards de pipeline.

---

## Quality Checklist

- [ ] El ID de la iniciativa enlaza a un Knowledge Brief aprobado
- [ ] La lista de capacidades no está vacía y cada ítem tiene una prioridad
- [ ] Los riesgos abiertos están extraídos del Knowledge Brief (no inventados)
- [ ] Los conteos de estado de supuestos coinciden con el Registro de Supuestos y Preguntas
- [ ] Los siguientes pasos son accionables y ordenados por prioridad
- [ ] La estructura JSON valida contra el esquema
- [ ] `generatedAt` es un timestamp ISO 8601 válido
- [ ] El lenguaje es consistente (sin mezcla de EN/ES dentro del archivo)

---

## Nivel de Adopción Recomendado

**Obligatorio** para todas las iniciativas que hayan completado la aprobación de la compuerta del Knowledge Brief. El paquete de contexto debe regenerarse cada vez que el Knowledge Brief, el Registro de Supuestos o el Mapa de Capacidades cambien materialmente.

---

## Criterios de Actualización

| Disparador | Acción |
|---|---|
| Knowledge Brief aprobado | Generar paquete de contexto inicial |
| Nueva capacidad agregada al Mapa de Capacidades | Regenerar paquete, incrementar versión |
| Riesgo resuelto o nuevo riesgo agregado | Actualizar openRisks, incrementar versión |
| Estado de supuestos cambia | Actualizar conteos de assumptionsStatus, incrementar versión |
| Cambio material en el Knowledge Brief | Regenerar paquete desde cero, incrementar versión mayor |
| Revisión trimestral de vigencia | Validar generatedAt < 90 días; regenerar si obsoleto |
