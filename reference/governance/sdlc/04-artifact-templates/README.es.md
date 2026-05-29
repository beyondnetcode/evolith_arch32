# Plantillas de Artefactos SDLC

> **Navegación bilingüe:** [English](./README.md)
> **Propietario:** Evolith Architecture Board
> **Estado:** Referencia activa
> **Padre:** [Centro de Gobernanza SDLC](../README.es.md)

---

## Propósito

Este directorio provee las plantillas de formato oficiales Evolith para los artefactos requeridos en cada fase SDLC. Cada plantilla incluye:

1. **La estructura canónica en blanco** — cópiala como punto de partida para cada nuevo artefacto.
2. **Un ejemplo completo** — rellenado con el producto de referencia UMS para que los equipos vean el nivel de detalle esperado.

Las plantillas garantizan consistencia en todos los repositorios satélite. Los equipos satélite pueden extender una plantilla con campos específicos de su dominio, pero no deben eliminar las secciones requeridas.

---

## Catálogo de Plantillas por Fase SDLC

| Fase | Artefacto | Objetivo | Perfiles recomendados |
|---|---|---|---|
| **Fase 1 — Concepción** | [PRD — Documento de Requisitos de Producto](./prd-template.es.md) | Captura el alcance del producto: personas, OKRs, límites funcionales, restricciones y no-objetivos. Requerido antes de cualquier trabajo de arquitectura o diseño. | Product Owner, Sponsor Ejecutivo |
| **Fase 2 — Diseño** | [ADR — Registro de Decisión Arquitectónica](./adr-template.es.md) | Registra una sola decisión arquitectónica con contexto, opciones evaluadas, opción elegida y consecuencias. Un ADR por decisión significativa. | Arquitecto de Software, Principal / Staff Engineer |
| **Fase 2 — Diseño** | [Historia Funcional — Especificación de Comportamiento de Negocio](./functional-story-template.es.md) | Describe una capacidad orientada al usuario en lenguaje de negocio: actores, flujos, reglas y criterios de aceptación. El contrato entre Producto e Ingeniería. Complementa el [Estándar de Escritura](../03-documentation/functional-story-writing-standard.es.md). | Product Owner, Analista de Negocio |
| **Fase 3 — Construcción** | [Historia Técnica — Elemento de Trabajo de Implementación de Ingeniería](./technical-story-template.es.md) | Descompone una Historia Funcional en una tarea de ingeniería concreta con pasos de implementación, criterios de aceptación técnica y checklist de DoD. | Desarrollador Backend, Desarrollador Frontend, Tech Lead |
| **Fase 4 — Validación** | [Reporte de Resumen de Testing — Registro de Validación de Puerta de Calidad](./test-summary-report-template.es.md) | Agrega resultados de pruebas y confirma que todos los umbrales de calidad obligatorios se cumplen. Requerido antes de sellar el Release Candidate. | QA / SDET, Tech Lead |
| **Fase 5 — Entrega** | [Release Notes — Registro de Despliegue a Producción](./release-notes-template.es.md) | Registro formal del despliegue con funcionalidades, cambios incompatibles, pasos de despliegue, rollback y checklist de observabilidad. Requerido antes de declarar Producción Activa. | DevOps / SRE, Tech Lead |

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
- [ ] Las secciones funcionales no contienen detalle de implementación (ver [Estándar de Escritura](../03-documentation/functional-story-writing-standard.es.md))
- [ ] La sección de trazabilidad enlaza al menos a un ADR y a un bounded context
- [ ] El idioma coincide con el idioma del documento (sin mezcla ES/EN dentro del mismo archivo)
- [ ] El documento está almacenado en control de versiones junto a los artefactos de código o diseño relevantes

---

## Documentos Relacionados

| Documento | Rol |
|---|---|
| [Mapeo SDLC–Artefactos Evolith](../sdlc-evolith-artifact-mapping.es.md) | Cuáles de estas plantillas son Requeridas u Opcionales en cada fase. |
| [Estándar de Escritura de Historias Funcionales](../03-documentation/functional-story-writing-standard.es.md) | Reglas normativas que la plantilla de Historia Funcional aplica. |
| [Framework SDLC Orientado a Construcción](../02-engineering/construction-focused-sdlc-framework.es.md) | Definiciones de fase, puertas de salida y checklist DoD. |
| [Buenas Prácticas de Documentación SDLC](../03-documentation/sdlc-documentation-best-practices.es.md) | Reglas de versionado, revisión y documentación como código. |

---

<div align="center">
  <sub>Evolith — Enterprise Architecture Platform | Plantillas de Artefactos SDLC</sub>
</div>
