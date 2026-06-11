<div align="center">

# Evolith: Base de Referencia de Arquitectura Progresiva

> **Navegación Bilingüe:** [English](./README.md)

[![Status](https://img.shields.io/badge/Status-Activo-brightgreen?style=for-the-badge)]()
[![Method](https://img.shields.io/badge/Method-Spec--driven_AI--DD-blueviolet?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-informational?style=for-the-badge)]()
[![CI](https://img.shields.io/github/actions/workflow/status/beyondnetcode/evolith_arch32/docs.yml?style=for-the-badge&label=CI)](https://github.com/beyondnetcode/evolith_arch32/actions)
[![Coverage](https://img.shields.io/badge/Docs-100%25-brightgreen?style=for-the-badge)](./COVERAGE_REPORT.md)

<br/>

<a href="./reference/governance/sdlc/assets/master-view.png" title="Visión General del Producto Evolith E2E — clic para ampliar">
  <img src="./reference/governance/sdlc/assets/master-view.png"
       alt="Visión General del Producto Evolith E2E"
       width="780"
       style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);" />
</a>

<sub>↑ Visión General del Producto Evolith E2E · MD3 — <i>clic para ampliar</i></sub>

<br/>

**Evolith es el upstream de arquitectura corporativa para repositorios de productos.**<br/>
Define estándares de arquitectura reutilizables, reglas de gobernanza, ADRs, patrones<br/>
y guía operativa que los productos satélite heredan y especializan.

> *Separar conceptualmente antes de separar físicamente.*

</div>

---

## Como Esta Organizado Este Repositorio

La documentación de Evolith fluye de la superficie más general al artefacto más específico. Cada página pertenece a uno de tres dominios — **Evolith Core** (la constitución de arquitectura), **Evolith SDLC** (gobernanza del ciclo de vida) y **Evolith Products** (la suite) — y cada dominio desciende por los mismos niveles:

| Nivel | Superficie | Úsala para |
|---|---|---|
| 1. Portal | Este README | Elegir un dominio o una ruta de inicio |
| 2. Hubs de dominio | [Evolith Core](./reference/core/README.es.md) · [Evolith SDLC](./reference/governance/sdlc/README.es.md) · [Evolith Products](./reference/product-suite/README.es.md) | Entender la meta, los objetivos y los límites de cada dominio |
| 3. Hubs de área | Arquitectura, ADRs, Estándares, Fases SDLC, Diseños de producto | Localizar la familia de artefactos de una preocupación |
| 4. Documentos de detalle | ADRs, plantillas, estándares, rulesets, guías | Aplicar un artefacto específico y autoritativo |

Cuando ya sabes qué artefacto necesitas, sáltate el descenso y abre el [Índice Maestro Global](./reference/navigation/MASTER_INDEX.es.md).

## Comienza Aqui

> **Meta:** orientar a cualquier lector — ejecutivo, arquitecto, ingeniero o agente IA — en menos de cinco minutos.
>
> **Objetivos:** explicar qué es Evolith, dirigir a cada rol a su ruta de lectura más corta y exponer el índice de navegación completo para acceso directo.

<details>
<summary><strong>Puntos de entrada principales</strong></summary>

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) |
|---|---|---|---|
| [Resumen Ejecutivo](./reference/governance/standards/communication/visuals/v01-executive-one-pager.es.md) | Explicación de cinco minutos sobre Evolith, UMS y la propuesta de valor | Comunicar valor estratégico rápidamente | Resumen ejecutivo |
| [Primeros Pasos por Rol](./reference/getting-started/README.es.md) | Rutas de lectura recomendadas para ejecutivos, arquitectos, ingenieros, QA, SRE, producto y contribuidores IA | Acelerar onboarding por rol | Guía de incorporación |
| [Vision del Producto](./reference/governance/standards/vision/evolith-product-vision-master.es.md) | Dirección estratégica, hoja de ruta y modelo de madurez | Alinear equipos a objetivos a largo plazo | Visión y estrategia |
| [Centro de Gobernanza SDLC](./reference/governance/sdlc/README.es.md) | Fases, gates, artefactos y modelo de trazabilidad autoritativos | Gobernar el ciclo de vida completo | Hub de gobernanza |
| [Indice Maestro Global](./reference/navigation/MASTER_INDEX.es.md) | Navegación completa del repositorio cuando ya sabes qué artefacto necesitas | Localizar cualquier artefacto rápidamente | Índice de navegación |

</details>

## 1. Evolith Core

> **Meta:** definir la constitución de arquitectura neutral respecto de proveedores que todo producto y repositorio satélite hereda.
>
> **Objetivos:** centralizar directivas arquitectónicas y blueprints, preservar el histórico de decisiones mediante ADRs, alinear equipos en estándares y gobernanza, y automatizar el cumplimiento con rulesets.
>
> **Hub de dominio:** [Evolith Core](./reference/core/README.es.md) — qué es Core, qué no es, sus dominios y su regla de dependencia.

<details>
<summary><strong>Arquitectura y Blueprints</strong></summary>

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) |
|---|---|---|---|
| [Directivas Arquitectonicas y Hub](./reference/architecture/README.es.md) | Único punto de acceso a directivas, blueprints, stack base y topologías | Guiar el diseño corporativo | Hub de arquitectura |

</details>

<details>
<summary><strong>Decisiones de Arquitectura (ADRs)</strong></summary>

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) |
|---|---|---|---|
| [Registro General de ADRs](./reference/architecture/adrs/README.es.md) | Punto central que agrupa la matriz de decisiones y todos los ADRs por ecosistema | Mantener histórico y gobernanza | Hub de decisiones |

</details>

<details>
<summary><strong>Estandares y Gobernanza</strong></summary>

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) |
|---|---|---|---|
| [Centro de Estandares y Gobernanza](./reference/governance/standards/README.es.md) | Directorio principal de manifiestos, taxonomías, directivas técnicas y observabilidad | Alinear equipos a políticas unificadas | Hub de gobernanza |
| [Hub de Infraestructura y Operaciones](./reference/operations/README.es.md) | Punto de acceso consolidado a despliegues, guías SRE e infraestructura | Normar despliegues y operación | Hub operativo |

</details>

<details>
<summary><strong>Rulesets y Validacion</strong></summary>

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) |
|---|---|---|---|
| [Hub General de Rulesets](./rulesets/README.es.md) | Centraliza todas las reglas automatizadas de arquitectura, schemas y CI | Validar cumplimiento automatizado | Hub de reglas |

</details>

## 2. Evolith SDLC

> **Meta:** gobernar el ciclo de vida de desarrollo completo mediante cinco fases con gates explícitos y evidencia verificable.
>
> **Objetivos:** mapear cada fase a sus artefactos obligatorios y opcionales, estandarizar plantillas, hacer cumplir quality gates y trazabilidad, y validar el cumplimiento automáticamente en CI.
>
> **Hub de dominio:** [Centro de Gobernanza SDLC](./reference/governance/sdlc/README.es.md) — fases, gates, artefactos, roles y el modelo de trazabilidad.

Las cinco fases siguientes van de la concepción a las operaciones; cada sección lista los artefactos de esa fase con su nivel de requisito.

<details>
<summary><strong>Referencias Generales del SDLC</strong></summary>

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) |
|---|---|---|---|
| [Mapeo de Artefactos SDLC](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.es.md) | Mapeo de artefactos | Vincular fases y entregables | Estandares y guia |

</details>

<details>
<summary><strong>Fase 01 - Concepcion y Descubrimiento</strong></summary>

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) | Requisito |
|---|---|---|---|---|
| [Discovery Canvas](./reference/governance/sdlc/04-artifact-templates/discovery-canvas-template.es.md) | Lienzo de descubrimiento | Definir visión y viabilidad | Documentos y plantillas | **Obligatorio** |
| [Business Case ROI](./reference/governance/sdlc/04-artifact-templates/business-case-roi-template.es.md) | Análisis de ROI | Justificar valor de negocio | Documentos y plantillas | Opcional |
| [Ballpark Estimation](./reference/governance/sdlc/04-artifact-templates/ballpark-estimation-template.es.md) | Estimación a gran escala | Proyectar costos y tiempos | Documentos y plantillas | Opcional |
| [PRD - Documento de Requerimientos de Producto](./reference/governance/sdlc/04-artifact-templates/prd-template.es.md) | Documento de requerimientos | Especificar necesidades funcionales | Documentos y plantillas | **Obligatorio** |
| [Evolith User Story](./reference/governance/sdlc/04-artifact-templates/evolith-user-story-template.es.md) | Plantilla de historia de usuario | Estandarizar historias ágiles | Documentos y plantillas | **Obligatorio** |
| [Agile Backlog](./reference/governance/sdlc/04-artifact-templates/agile-backlog-template.es.md) | Plantilla de backlog | Organizar entregables | Documentos y plantillas | **Obligatorio** |
| [CLI Impact Analysis](./reference/governance/sdlc/04-artifact-templates/cli-impact-analysis.es.md) | Análisis de impacto CLI | Evaluar cambios cross-repo | Documentos y plantillas | Opcional |
| [Validation Schemas & Rules (Fase 1)](./rulesets/README.es.md) | Schemas de validación para Canvas, PRD, Backlog y reglas de Gates | Validar cumplimiento en CI | Reglas y schemas | **Obligatorio** |

</details>

<details>
<summary><strong>Fase 02 - Diseno y Arquitectura</strong></summary>

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) | Requisito |
|---|---|---|---|---|
| [Plantilla ADR](./reference/governance/sdlc/04-artifact-templates/adr-template.es.md) | Plantilla de ADR | Documentar decisiones clave | Documentos y plantillas | Opcional |
| [Plantilla de Historia Funcional](./reference/governance/sdlc/04-artifact-templates/functional-story-template.es.md) | Plantilla de historia funcional | Detallar comportamiento | Documentos y plantillas | **Obligatorio** |
| [Plantilla de Modelo DDD](./reference/governance/sdlc/04-artifact-templates/ddd-model-template.es.md) | Plantilla de modelo DDD | Modelar dominios del sistema | Documentos y plantillas | Opcional |
| [Estandar de Escritura de Historias Funcionales](./reference/governance/sdlc/03-documentation/functional-story-writing-standard.es.md) | Estándar de historias funcionales | Asegurar calidad de specs | Estandares y guia | **Obligatorio** |
| [Buenas Practicas de Documentacion SDLC](./reference/governance/sdlc/03-documentation/sdlc-documentation-best-practices.es.md) | Prácticas de documentación | Mejorar calidad documental | Estandares y guia | **Obligatorio** |
| [Validation Schemas & Rules (Fase 2)](./rulesets/README.es.md) | Schemas de validación para ADRs y Funcionales | Validar cumplimiento en CI | Reglas y schemas | **Obligatorio** |

</details>

<details>
<summary><strong>Fase 03 - Construccion</strong></summary>

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) | Requisito |
|---|---|---|---|---|
| [Hub de Plantillas de Artefactos](./reference/governance/sdlc/04-artifact-templates/README.es.md) | Hub de plantillas | Centralizar formatos SDLC | Documentos y plantillas | **Obligatorio** |
| [Plantilla de Historia Tecnica](./reference/governance/sdlc/04-artifact-templates/technical-story-template.es.md) | Plantilla de historia técnica | Estructurar tareas técnicas | Documentos y plantillas | **Obligatorio** |
| [Framework SDLC Enfocado en Construccion](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.es.md) | Framework de construcción y Definition of Done (DoD) | Normar ejecución técnica | Estandares y guia | **Obligatorio** |
| [Quality Gates SDLC](./reference/governance/sdlc/quality-gates.es.md) | Gates de calidad | Establecer umbrales de aprobación | Estandares y guia | **Obligatorio** |
| [Validation Schemas & Rules (Fase 3)](./rulesets/README.es.md) | Schemas para Historias Técnicas, reglas DoD, Thresholds y Dependency Pinning | Validar cumplimiento en CI | Reglas y schemas | **Obligatorio** |

</details>

<details>
<summary><strong>Fase 04 - Validacion y QA</strong></summary>

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) | Requisito |
|---|---|---|---|---|
| [Plantilla de Test Summary Report](./reference/governance/sdlc/04-artifact-templates/test-summary-report-template.es.md) | Reporte de pruebas | Consolidar resultados de QA | Documentos y plantillas | **Obligatorio** |
| [Modelo de Trazabilidad SDLC](./reference/governance/sdlc/traceability-model.es.md) | Modelo de trazabilidad | Vincular requerimientos y pruebas | Estandares y guia | **Obligatorio** |
| [Validation Schemas & Rules (Fase 4)](./rulesets/README.es.md) | Esquema de validación del Test Summary Report | Validar cumplimiento en CI | Reglas y schemas | **Obligatorio** |

</details>

<details>
<summary><strong>Fase 05 - Entrega y Operaciones</strong></summary>

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) | Requisito |
|---|---|---|---|---|
| [Plantilla de Release Notes](./reference/governance/sdlc/04-artifact-templates/release-notes-template.es.md) | Plantilla de notas de versión | Comunicar cambios de release | Documentos y plantillas | **Obligatorio** |
| [Validation Schemas & Rules (Fase 5)](./rulesets/README.es.md) | Esquema de validación de Release Notes, reglas de CI/CD (ADR-0005) y GitFlow (ADR-0050) | Validar cumplimiento en CI | Reglas y schemas | **Obligatorio** |

</details>

## 3. Evolith Products

> **Meta:** entregar la constitución Core como productos funcionales y demostrarla con referencias aplicadas.
>
> **Objetivos:** dirigir el portafolio mediante la Product Suite, documentar el diseño interno de cada producto, demostrar adopción real mediante UMS y casos de adopción, y dotar de herramientas el flujo con la Smart CLI.
>
> **Hubs de dominio:** [Product Suite](./reference/product-suite/README.es.md) (visión y estrategia del portafolio) · [Diseños de Producto](./reference/products/README.es.md) (internos por producto)

<details open>
<summary><strong>Seguimiento de la Suite — pendientes, auditoría y madurez</strong></summary>

Las dos superficies canónicas de seguimiento de la suite — todo lo pendiente, auditado o medido vive en una de estas:

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) |
|---|---|---|---|
| [Tablero de Gaps](./reference/governance/standards/vision/gap-tracking.es.md) | Tablero único de gaps abiertos: cola de ejecución priorizada (qué terminar a continuación), dashboard completo por estado, y meta y criterio de cierre por gap | Ver al instante qué falta y en qué orden | Tablero de seguimiento |
| [Evaluación de Madurez](./reference/governance/standards/vision/maturity-assessment.es.md) | Evaluación de madurez única: matriz TOGAF ACMM, revisión WAF, auditoría de patrones/anti-patrones y alineación con la visión | Medir qué tan madura está la suite y dónde invertir | Matriz de madurez y auditoría |
| [Reporte de Cobertura Documental](./COVERAGE_REPORT.md) | Estado de cobertura de la documentación bilingüe | Auditar la completitud documental | Reporte de cobertura |

</details>

<details>
<summary><strong>Evolith Product Suite</strong></summary>

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) |
|---|---|---|---|
| [Hub de Product Suite](./reference/product-suite/README.es.md) | Único punto de acceso a la visión, estrategia y posicionamiento del portfolio | Dirección del ecosistema | Referencia de producto |

</details>

<details>
<summary><strong>Evolith Tracker</strong></summary>

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) |
|---|---|---|---|
| [Evolith Tracker Hub](./reference/products/evolith-tracker/README.es.md) | Punto central que agrupa la arquitectura e interfaces técnicas del producto Tracker | Producto de gobernanza | Referencia de producto |

</details>

<details>
<summary><strong>UMS (Referencia Aplicada)</strong></summary>

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) |
|---|---|---|---|
| [Hub de Referencia UMS](./reference/knowledge/demo/README.es.md) | Punto de acceso consolidado a modelos, comparativas y portal de arquitectura UMS | Demostrar implementación real | Referencia aplicada |

</details>

<details>
<summary><strong>Smart CLI</strong></summary>

### Smart CLI (Oficial)

```bash
# Inicializar nuevo repositorio satélite
npx @evolith/smart-cli init

# Validar contra estándares Evolith
smart-cli validate

# Gestionar ADRs
smart-cli adr create
smart-cli adr list

# Servidor MCP para asistentes IA
smart-cli mcp serve
```

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) |
|---|---|---|---|
| [Smart CLI Hub](./sdk/cli/README.es.md) | Acceso central a documentación, arquitectura, visión y análisis de estado de la CLI | Entender la herramienta | Referencia de producto |

</details>

<details>
<summary><strong>Casos de Adopcion y Herramientas</strong></summary>

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) |
|---|---|---|---|
| [Casos de Adopcion](./reference/knowledge/adoption-cases.es.md) | Casos de adopción | Mostrar éxito y aprendizaje | Referencia aplicada |

### Pre-commit Hooks

- [validate-docs.mjs](./.harness/scripts/validate-docs.mjs) - validacion de links, anchors, encoding y Mermaid.
- [check-bilingual-parity.mjs](./.harness/scripts/check-bilingual-parity.mjs) - validacion de paridad estructural EN/ES.
- [impact-analysis-synchronizer.mjs](./.harness/scripts/impact-analysis-synchronizer.mjs) - sincronizacion de impacto cross-repo.

</details>

---

## 4. Navegacion y Mapa Documental

> **Meta:** hacer que cada documento sea localizable en dos clics o menos, en ambos idiomas.
>
> **Objetivos:** mantener el índice maestro como superficie de navegación completa, auditar la paridad EN/ES y registrar los releases documentales.

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) |
|---|---|---|---|
| [Índice Maestro Global](./reference/navigation/MASTER_INDEX.es.md) | La única superficie de navegación completa: por intención, por rol, por fase SDLC (todos los artefactos de cada fase) y con el Core agnóstico separado de lo específico por plataforma | Localizar cualquier artefacto rápidamente | Índice de navegación |
| [Índice Bilingüe](./reference/navigation/BILINGUAL_INDEX.es.md) | Estado autogenerado del emparejamiento EN/ES del corpus de referencia | Auditar cobertura bilingüe | Índice de navegación |
| [Acceso Rápido por Stack](./reference/quick-access/README.es.md) | Camino más corto a los estándares de React, .NET y Node.js | Reducir fricción de navegación | Índice de navegación |
| [Taxonomía Documental](./reference/documentation-taxonomy.es.md) | Qué tipo de documento pertenece a cada lugar | Mantener el corpus organizado | Referencia de gobernanza |

## Contribucion

Antes de contribuir, lee:

- [AGENTS.md](./AGENTS.md) — Reglas y convenciones de agentes
- [Taxonomia del Repositorio](./reference/governance/standards/repository-taxonomy.es.md) — Que va donde
- [Guia de Herencia](./reference/governance/standards/onboarding/child-repository-inheritance-guide.es.md) — Como los productos heredan

## Licencia

Publicado bajo la [Licencia MIT](./LICENSE).

---

<div align="center">
  <sub>Evolith - Plataforma de Arquitectura Empresarial | Corpus de Referencia Progresivo | Spec-driven AI-DD</sub>
</div>
