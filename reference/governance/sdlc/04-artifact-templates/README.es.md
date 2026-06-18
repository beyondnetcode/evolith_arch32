# Plantillas de Artefactos SDLC

> **Navegación bilingüe:** [English](./README.md)
> **Propietario:** Evolith Architecture Board
> **Estado:** Referencia activa
> **Padre:** [Centro de Gobernanza SDLC](../README.es.md)

---

## Propósito

Este directorio provee las plantillas de formato oficiales Evolith para los artefactos requeridos en cada fase SDLC.

Cada artefacto se organiza como una unidad documental profesional de tres partes:

1. **Landing page del artefacto** — explica propósito, reglas de uso y navegación.
2. **Fuente Markdown** — Markdown canónico reutilizable que los equipos copian en repositorios de producto o delivery.
3. **Ejemplo renderizado** — ejemplo UMS completo que muestra el nivel de detalle esperado.

Las plantillas garantizan consistencia en todos los repositorios satélite. Los equipos satélite pueden extender una plantilla con campos específicos de su dominio, pero no deben eliminar las secciones requeridas.

---

## Materiales de Trabajo Descargables

> [!IMPORTANT]
> Usa estos materiales oficiales vigentes para briefings ejecutivos, workshops de implementación SDLC y sesiones técnicas de adopción Evolith.

###  Kit de Comunicación Ejecutiva (Presentaciones)

| Artefacto | Formato | Propósito |
|---|---|---|
| **[Evolith: Propuesta de Valor Ejecutiva](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith_value_proposition_executive.pptx)** | PPTX | Presentación ejecutiva del valor estratégico, impacto de gobernanza e ROI. |
| **[Evolith: Caso Práctico UMS](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith_ums_practical_case.pptx)** | PPTX | Caso de éxito aplicando el framework Evolith a una transformación real. |
| **[Evolith: Deep-Dive Técnico SDLC](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith_sdlc_technical_deep_dive.pptx)** | PPTX | Guía operativa de ingeniería sobre fases, Quality Gates y artefactos. |

### ️ Workbook de Implementación

| Artefacto / Alcance | Formato | Propósito |
|---|---|---|
| **[Workbook de Implementación SDLC Evolith F0](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith_sdlc_implementation_workbook_F0.xlsx)** | XLSX | Workbook integrado consolidado para todas las fases SDLC: concepción, diseño, construcción, validación, despliegue y operaciones. Incluye plantillas, registros de roles, matrices de trazabilidad cruzada y dashboards de orquestación de proyectos para mesas de trabajo facilitadas con equipos cliente. |

---

## Estructura de Plantillas

| Directorio / Tipo de archivo | Propósito |
|---|---|
| `*-template.es.md` | Landing page del artefacto. Empieza aquí para entender cuándo y cómo usar el artefacto. |
| `source/*-template-source.es.md` | Fuente Markdown lista para copiar al crear un nuevo artefacto. |
| `examples/*-example-ums.es.md` | Ejemplo renderizado UMS para entender el artefacto completado esperado. |
| `*.md` | Versión en inglés con la misma estructura. |

---

## Catálogo de Plantillas por Fase SDLC

| Fase | Artefacto | Landing Page | Fuente Markdown | Ejemplo Renderizado | Perfiles recomendados |
|---|---|---|---|---|---|
| **Fase 1 — Concepción** | Discovery Canvas | [Abrir](./discovery-canvas-template.es.md) | Incluido | Incluido | PM, Solicitante |
| **Fase 1 — Concepción** | Technical Feasibility Canvas | [Abrir](./technical-feasibility-template.es.md) | Incluido | Incluido | Arquitecto, Tech Lead |
| **Fase 1 — Concepción** | Ballpark Estimation | [Abrir](./ballpark-estimation-template.es.md) | Incluido | Incluido | Arquitecto, Tech Lead |
| **Fase 1 — Concepción** | Historia de Usuario Evolith | [Abrir](./evolith-user-story-template.es.md) | Incluido | Incluido | Agente AI, PM |
| **Fase 1 — Concepción** | Agile Backlog | [Abrir](./agile-backlog-template.es.md) | Incluido | Incluido | Product Owner |
| **Fase 1 — Concepción** | Análisis de Impacto CLI | [Abrir](./cli-impact-analysis.es.md) | Incluido | Incluido | Arquitecto de Plataforma |
| **Fase 1 — Concepción** | PRD — Documento de Requisitos de Producto | [Abrir](./prd-template.es.md) | [Fuente](./source/prd-template-source.es.md) | [Ejemplo](./examples/prd-example-ums.es.md) | Product Owner, Sponsor Ejecutivo |
| **Fase 2 — Diseño** | DDD Model (Modelo de Dominio) | [Abrir](./ddd-model-template.es.md) | Incluido | N/A | Arquitecto, Tech Lead |
| **Fase 2 — Diseño** | ADR — Registro de Decisión Arquitectónica | [Abrir](./adr-template.es.md) | [Fuente](./source/adr-template-source.es.md) | [Ejemplo](./examples/adr-example-ums.es.md) | Arquitecto, Principal Engineer |
| **Fase 2 — Diseño** | Historia Funcional | [Abrir](./functional-story-template.es.md) | [Fuente](./source/functional-story-template-source.es.md) | [Ejemplo](./examples/functional-story-example-ums.es.md) | Product Owner, Business Analyst |
| **Fase 3 — Construcción** | Historia Técnica | [Abrir](./technical-story-template.es.md) | [Fuente](./source/technical-story-template-source.es.md) | [Ejemplo](./examples/technical-story-example-ums.es.md) | Desarrollador Backend/Frontend, Tech Lead |
| **Fase 4 — Validación** | Test Summary Report | [Abrir](./test-summary-report-template.es.md) | [Fuente](./source/test-summary-report-template-source.es.md) | [Ejemplo](./examples/test-summary-report-example-ums.es.md) | QA / SDET, Tech Lead, Security Engineer |
| **Fase 5 — Entrega** | Release Notes | [Abrir](./release-notes-template.es.md) | [Fuente](./source/release-notes-template-source.es.md) | [Ejemplo](./examples/release-notes-example-ums.es.md) | DevOps / SRE, Tech Lead |
| **Transversal / Gobernanza de Release** | Scorecard Ejecutivo SDLC | [Abrir](./executive-scorecard-template.es.md) | [Fuente](./source/executive-scorecard-template-source.es.md) | [Ejemplo](./examples/executive-scorecard-example-ums.es.md) | Director, Tech Lead |

---

## Cómo Usar una Plantilla

1. Abre la landing page del artefacto para entender propósito, relevancia de gate y reglas de uso.
2. Abre el archivo Fuente Markdown cuando necesites crear un nuevo artefacto.
3. Copia la fuente en tu repositorio de producto, release o delivery.
4. Reemplaza cada `[PLACEHOLDER]` con contenido real.
5. Revisa el ejemplo UMS renderizado para calibrar profundidad y tono esperados.
6. Si una sección no aplica, escribe `N/A — [breve razón]` en lugar de eliminar el encabezado, para que los revisores vean que la decisión fue deliberada.

---

## Checklist de Calidad Antes de Enviar Cualquier Artefacto

Todas las plantillas deben pasar esta checklist antes de entrar a revisión de puerta:

- [ ] Todas las secciones requeridas están presentes y pobladas (sin encabezados vacíos)
- [ ] Las secciones funcionales no contienen detalle de implementación (ver [Estándar de Escritura](../03-documentation/functional-story-writing-standard.es.md))
- [ ] La sección de trazabilidad enlaza al menos a un ADR y a un bounded context cuando aplique
- [ ] El idioma coincide con el idioma del documento (sin mezcla ES/EN dentro del mismo archivo)
- [ ] El documento está almacenado en control de versiones junto a los artefactos de código o diseño relevantes
- [ ] Los artefactos ejecutivos resumen evidencia fuente con enlaces, en lugar de duplicar evidencia no controlada

---

## Documentos Relacionados

| Documento | Rol |
|---|---|
| [Mapeo SDLC–Artefactos Evolith](../sdlc-evolith-artifact-mapping.es.md) | Cuáles de estas plantillas son Requeridas, Opcionales o Condicionales en cada fase. |
| [Estándar de Escritura de Historias Funcionales](../03-documentation/functional-story-writing-standard.es.md) | Reglas normativas que la plantilla de Historia Funcional aplica. |
| [Framework SDLC Orientado a Construcción](../02-engineering/construction-focused-sdlc-framework.es.md) | Definiciones de fase, puertas de salida y checklist DoD. |
| [Gates de Calidad SDLC](../quality-gates.es.md) | Umbrales canónicos usados por el scorecard y el Test Summary Report. |
| [Matriz de Responsabilidades SDLC](../responsibility-matrix.es.md) | Modelo de accountability de roles usado por el scorecard. |
| [Buenas Prácticas de Documentación SDLC](../03-documentation/sdlc-documentation-best-practices.es.md) | Reglas de versionado, revisión y documentación como código. |

---

<div align="center">
  <sub>Evolith — Enterprise Architecture Platform | Plantillas de Artefactos SDLC</sub>
</div>
