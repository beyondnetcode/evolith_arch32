# Plantillas de Artefactos SDLC

> **Navegación bilingüe:** [English](./README.md)
> **Propietario:** Evolith Architecture Board
> **Estado:** Referencia activa
> **Padre:** [Centro de Gobernanza SDLC](../README.md)

---

## Propósito

Este directorio provee las plantillas de formato oficiales Evolith para los artefactos requeridos en cada fase SDLC. Cada plantilla incluye:

1. **La estructura canónica en blanco** — cópiala como punto de partida para cada nuevo artefacto.
2. **Un ejemplo completo** — rellenado con el producto de referencia UMS para que los equipos vean el nivel de detalle esperado.

Las plantillas garantizan consistencia en todos los repositorios satélite. Los equipos satélite pueden extender una plantilla con campos específicos de su dominio, pero no deben eliminar las secciones requeridas.

---

## Catálogo de Plantillas por Fase SDLC

| Fase | Plantilla | Propósito |
|---|---|---|
| **Fase 1 — Concepción** | [Plantilla PRD](./prd-template.es.md) | Documento de Requisitos de Producto — define alcance, personas y OKRs antes de que comience cualquier trabajo de diseño. |
| **Fase 2 — Diseño** | [Plantilla ADR](./adr-template.es.md) | Registro de Decisión Arquitectónica — el formato estándar para toda decisión arquitectónica. |
| **Fase 2 — Diseño** | [Plantilla Historia Funcional](./functional-story-template.es.md) | El formato canónico para requerimientos funcionales legibles por PO e ingeniería. Complementa el [Estándar de Escritura de Historias Funcionales](../03-documentation/functional-story-writing-standard.md). |
| **Fase 3 — Construcción** | [Plantilla Historia Técnica](./technical-story-template.es.md) | Historia de implementación orientada a ingeniería, derivada de una Historia Funcional. |
| **Fase 4 — Validación** | [Plantilla Reporte de Resumen de Testing](./test-summary-report-template.es.md) | Documento formal de puerta de calidad requerido antes de sellar el Release Candidate. |
| **Fase 5 — Entrega** | [Plantilla Release Notes](./release-notes-template.es.md) | Comunicación estándar de release requerida antes de declarar Producción Activa. |

---

## Cómo Usar una Plantilla

1. Copia la sección de plantilla en blanco verbatim en tu nuevo archivo de artefacto.
2. Reemplaza cada `[PLACEHOLDER]` con tu contenido real.
3. Elimina las instrucciones de placeholder (líneas en cursiva o entre corchetes) antes de la publicación.
4. Consulta la sección de ejemplo completo en el mismo archivo para calibrar el nivel de detalle esperado.
5. Si una sección no aplica, escribe `N/A — [breve razón]` en lugar de eliminar el encabezado, para que los revisores vean que la decisión fue deliberada.

---

## Checklist de Calidad Antes de Enviar Cualquier Artefacto

Todas las plantillas deben pasar esta checklist antes de entrar a revisión de puerta:

- [ ] Todas las secciones requeridas están presentes y pobladas (sin encabezados vacíos)
- [ ] Las secciones funcionales no contienen detalle de implementación (ver [Estándar de Escritura](../03-documentation/functional-story-writing-standard.md))
- [ ] La sección de trazabilidad enlaza al menos a un ADR y a un bounded context
- [ ] El idioma coincide con el idioma del documento (sin mezcla ES/EN dentro del mismo archivo)
- [ ] El documento está almacenado en control de versiones junto a los artefactos de código o diseño relevantes

---

## Documentos Relacionados

| Documento | Rol |
|---|---|
| [Mapeo SDLC–Artefactos Evolith](../sdlc-evolith-artifact-mapping.es.md) | Cuáles de estas plantillas son Requeridas u Opcionales en cada fase. |
| [Estándar de Escritura de Historias Funcionales](../03-documentation/functional-story-writing-standard.md) | Reglas normativas que la plantilla de Historia Funcional aplica. |
| [Framework SDLC Orientado a Construcción](../02-engineering/construction-focused-sdlc-framework.md) | Definiciones de fase, puertas de salida y checklist DoD. |
| [Buenas Prácticas de Documentación SDLC](../03-documentation/sdlc-documentation-best-practices.md) | Reglas de versionado, revisión y documentación como código. |

---

<div align="center">
  <sub>Evolith — Enterprise Architecture Platform | Plantillas de Artefactos SDLC</sub>
</div>
