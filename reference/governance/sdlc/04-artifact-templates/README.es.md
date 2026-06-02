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

### 📊 Kit de Comunicación Ejecutiva (Presentaciones)

| Artefacto | Formato | Propósito |
|---|---|---|
| **[Evolith: Propuesta de Valor Ejecutiva](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith-sdlc-value-proposition.pptx)** | PPTX | Presentación ejecutiva para alinear visión comercial y tecnológica sobre los beneficios del SDLC Evolith. |
| **[Evolith: Caso Práctico UMS](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith-ums-case-study.pptx)** | PPTX | Caso de éxito demostrando la aplicación de las 8 fases en un entorno industrial real (Portal Autoservicio). |
| **[Evolith: Deep-Dive Técnico SDLC](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith-sdlc-technical-deepdive.pptx)** | PPTX | Guía operativa de ingeniería sobre las fases, Quality Gates y artefactos. |

### 🛠️ Kit de Herramientas Fase por Fase (Workbooks)

| Artefacto / Fase | Formato | Propósito |
|---|---|---|
| **[Master Workbook Integrador](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Master_Workbook.xlsx)** | XLSX | Tablero de control consolidado, registro de roles, trazabilidad cruzada y estado del proyecto. |
| **[Workbook F1: Ideación](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F1_Ideacion.xlsx)** | XLSX | Plantillas para el Business Case, Acta de Constitución y registro de riesgos iniciales. |
| **[Workbook F2: Análisis](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F2_Analisis.xlsx)** | XLSX | Documentación y trazabilidad de requerimientos de negocio. |
| **[Workbook F3: Diseño](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F3_Diseno.xlsx)** | XLSX | Registros de Decisiones de Arquitectura (ADRs) y Blueprint. |
| **[Workbook F4: Construcción](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F4_Construccion.xlsx)** | XLSX | Control de deuda técnica, Quality Gates en el Pipeline y Definition of Done. |
| **[Workbook F5: Pruebas](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F5_Pruebas.xlsx)** | XLSX | Plan maestro, ejecución de Casos de Prueba y bitácora de defectos. |
| **[Workbook F6: Despliegue](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F6_Despliegue.xlsx)** | XLSX | Ejecución de Runbooks, checklist pre-despliegue y planes de Rollback. |
| **[Workbook F7: Operación](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F7_Operacion.xlsx)** | XLSX | Dashboards SRE, registro de incidentes post-lanzamiento. |
| **[Workbook F8: Retiro](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F8_Retiro.xlsx)** | XLSX | Checklist seguro para la desconexión y Sunset de sistemas legacy. |

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
| **Fase 1 — Concepción** | PRD — Documento de Requisitos de Producto | [Abrir](./prd-template.es.md) | [Fuente](./source/prd-template-source.es.md) | [Ejemplo](./examples/prd-example-ums.es.md) | Product Owner, Sponsor Ejecutivo |
| **Fase 2 — Diseño** | ADR — Registro de Decisión Arquitectónica | [Abrir](./adr-template.es.md) | [Fuente](./source/adr-template-source.es.md) | [Ejemplo](./examples/adr-example-ums.es.md) | Arquitecto de Software, Principal / Staff Engineer |
| **Fase 2 — Diseño** | Historia Funcional | [Abrir](./functional-story-template.es.md) | [Fuente](./source/functional-story-template-source.es.md) | [Ejemplo](./examples/functional-story-example-ums.es.md) | Product Owner, Analista de Negocio |
| **Fase 3 — Construcción** | Historia Técnica | [Abrir](./technical-story-template.es.md) | [Fuente](./source/technical-story-template-source.es.md) | [Ejemplo](./examples/technical-story-example-ums.es.md) | Desarrollador Backend, Desarrollador Frontend, Tech Lead |
| **Fase 4 — Validación** | Test Summary Report | [Abrir](./test-summary-report-template.es.md) | [Fuente](./source/test-summary-report-template-source.es.md) | [Ejemplo](./examples/test-summary-report-example-ums.es.md) | QA / SDET, Tech Lead |
| **Fase 5 — Entrega** | Release Notes | [Abrir](./release-notes-template.es.md) | [Fuente](./source/release-notes-template-source.es.md) | [Ejemplo](./examples/release-notes-example-ums.es.md) | DevOps / SRE, Tech Lead |
| **Transversal / Gobernanza de Release** | Scorecard Ejecutivo SDLC | [Abrir](./executive-scorecard-template.es.md) | [Fuente](./source/executive-scorecard-template-source.es.md) | [Ejemplo](./examples/executive-scorecard-example-ums.es.md) | Director de Tecnología, Sponsor Ejecutivo, Delivery Owner, Architecture Board, QA Lead, SRE Lead |

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
