<div align="center">

# Evolith: Framework de Gobernanza Arquitectónica Ejecutable

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

**Evolith Core no es un corpus de documentación. Es un framework de gobernanza ejecutable** —<br/>
un estándar técnico agnóstico a topologías y neutral respecto al runtime que dicta **cómo** se construye el software,<br/>
distribuido mediante interfaces CLI, MCP y Service CORE API, y aplicado por rulesets verificables.

> _Arquitectura Progresiva: la capacidad del framework para escalar sistemas mutando entre topologías según el ciclo de vida del negocio, previniendo el sobre-diseño y garantizando la coherencia arquitectónica mediante ejecución automática._

</div>

---

## Visión

Evolith Core existe para convertirse en el sistema operativo definitivo de grado enterprise para la gobernanza de arquitectura de software: global, agnóstico al stack, consciente de topologías y ejecutable por humanos, plataformas de delivery y agentes IA. Define la constitución técnica que todo producto, repositorio satélite y sistema de orquestación puede heredar sin acoplarse a un lenguaje, proveedor cloud, runtime, motor de base de datos o modelo comercial específico de producto.

Su misión es convertir la gobernanza arquitectónica en una capacidad operativa. ADRs, rulesets, políticas, contratos, implementaciones de referencia e instrucciones IA no son documentos pasivos; son artefactos técnicos autoritativos expuestos mediante canales obligatorios de ejecución para que los equipos puedan validar, consultar, generar estructuras base y hacer cumplir la arquitectura seleccionada antes de que el código llegue a producción.

## Acerca de Evolith Core

Evolith Core es un **corpus de referencia multi-topología** y un **framework de gobernanza ejecutable** para organizaciones modernas de ingeniería B2B. Ya no gobierna únicamente el camino desde monolitos simples hacia microservicios. Gobierna la mutación deliberada de sistemas entre monolitos modulares, servicios distribuidos, **Cloud-Native Serverless**, **Event-Driven**, **Data Mesh**, **Edge Computing** y **Agentic / AI-First Architectures** cuando la madurez del producto, la complejidad operativa y la economía de plataforma justifican el cambio.

En Evolith, "progresivo" significa la capacidad del framework para escalar sistemas mutando entre topologías según el ciclo de vida del negocio, previniendo el sobre-diseño y preservando la coherencia arquitectónica mediante ejecución automática. El framework define el **Qué** y el **Cómo** técnico; tiempos de negocio, ownership, financiamiento, ROI y priorización permanecen fuera del Core y son gobernados por Evolith Tracker mediante su ACL y Funnel 0.

## Cómo Está Organizado Este Repositorio

Evolith Core gobierna a través de un **corpus de referencia multi-topología**. Cada topología es un contexto delimitado completamente aislado con sus propios ADRs, políticas OPA, rulesets IA y contratos UMS. El repositorio fluye desde la superficie más general hasta el artefacto más específico, a través de tres dominios:

| Nivel                 | Superficie                                                                                                                                                            | Úsala para                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1. Portal             | Este README                                                                                                                                                           | Elegir un dominio o una ruta de inicio                        |
| 2. Hubs de dominio    | [Evolith Core](./reference/core/README.es.md) · [Evolith SDLC](./reference/governance/sdlc/README.es.md) · [Evolith Products](./reference/product-suite/README.es.md) | Entender la meta, los objetivos y los límites de cada dominio |
| 3. Hubs de área       | Arquitectura, ADRs, Estándares, Fases SDLC, Diseños de producto, Topologías                                                                                           | Localizar la familia de artefactos de una preocupación        |
| 4. Documentos detalle | ADRs, plantillas, estándares, rulesets, guías, políticas OPA, contratos UMS                                                                                           | Aplicar un artefacto específico y autoritativo                |

Cuando ya sabes qué artefacto necesitas, sáltate el descenso y abre el [Índice Maestro Global](./reference/navigation/MASTER_INDEX.es.md).

### Topologías Soportadas

Evolith Core gobierna y proporciona artefactos de referencia para las siguientes topologías de arquitectura, cada una residiendo en un subdirectorio `/topologies/` aislado con sus propios ADRs, políticas OPA, rulesets IA y contratos UMS:

| Topología                   | Descripción                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Monolito Modular**        | Topología fundamental para sistemas que comienzan simples y maduran sin distribución prematura                     |
| **Cloud-Native Serverless** | Arquitecturas event-driven, auto-escalables y de pago-por-ejecución sobre FaaS y servicios gestionados             |
| **Event-Driven**            | Sistemas async-first con brokers de mensajes, event sourcing y CQRS                                                |
| **Data Mesh**               | Plataformas de datos orientadas a dominio, autoservicio y con gobernanza federada                                  |
| **Edge Computing**          | Cómputo distribuido en el borde de la red con restricciones de offline-first y baja latencia                       |
| **Agentic / AI-First**      | Arquitecturas diseñadas para agentes IA como actores de primera clase con integración MCP (Model Context Protocol) |

### Interfaces Operativas

Evolith Core expone tres canales de acceso obligatorios para que cualquier equipo de ingeniería interactúe programáticamente con el framework de gobernanza:

| Interfaz                         | Propósito                                                                                                                                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CLI**                          | Los desarrolladores validan código localmente contra los rulesets de su topología elegida. `smart-cli validate`, `smart-cli adr create`, etc.                                                       |
| **MCP (Model Context Protocol)** | La API fundamental para inyectar "Contexto Arquitectónico" directamente en agentes IA (Copilot, Cursor, etc.), permitiendo que el agente entienda las reglas de gobernanza antes de escribir código |
| **Service CORE API**             | Interfaz programática para que sistemas de orquestación (ej. Evolith Tracker) consulten patrones, contratos UMS y políticas OPA de forma remota                                                     |

### Contextos Delimitados por Topología

El árbol `/topologies/` es el límite modular estricto para la gobernanza arquitectónica ejecutable. Cada topología soportada debe estar aislada como un contexto delimitado completo y debe exponer las mismas familias de artefactos:

```text
/topologies/
  /agentic-ai/
    /adrs/
    /opa-policies/
    /ai-rulesets/
    /ums-contracts/
  /serverless/
    /adrs/
    /opa-policies/
    /ai-rulesets/
    /ums-contracts/
```

Ninguna topología puede filtrar reglas, contratos o supuestos de runtime hacia otra topología. Las preocupaciones compartidas deben promoverse a estándares de nivel Core solo cuando hayan demostrado ser reutilizables entre contextos delimitados.

### Jerarquía Estricta de Artefactos

> **Regla crítica: los artefactos de la Fase 1 (ideación técnica) dentro de Core deben permanecer 100% desacoplados de cualquier dato de negocio — presupuestos, ROI, costos, recursos.** Core expone solo el **Qué** y el **Cómo** (técnico). El Tracker (vía su ACL y Funnel 0) es el único componente autorizado para gestionar el **Cuándo** y el **Quién** (negocio).

---

## Comienza Aqui

> **Meta:** orientar a cualquier lector — ejecutivo, arquitecto, ingeniero o agente IA — en menos de cinco minutos.
>
> **Objetivos:** explicar qué es Evolith, dirigir a cada rol a su ruta de lectura más corta y exponer el índice de navegación completo para acceso directo.

<details>
<summary><strong>Puntos de entrada principales</strong></summary>

| Enlace (URL)                                                                                              | Descripción (breve explicación)                                                                               | Meta / Objetivo                           | Tipificación (categoría o tipo) |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------- |
| [Resumen Ejecutivo](./reference/governance/standards/communication/visuals/v01-executive-one-pager.es.md) | Explicación de cinco minutos sobre Evolith, UMS y la propuesta de valor                                       | Comunicar valor estratégico rápidamente   | Resumen ejecutivo               |
| [Primeros Pasos por Rol](./reference/getting-started/README.es.md)                                        | Rutas de lectura recomendadas para ejecutivos, arquitectos, ingenieros, QA, SRE, producto y contribuidores IA | Acelerar onboarding por rol               | Guía de incorporación           |
| [Vision del Producto](./reference/product-suite/vision/evolith-product-vision-master.es.md)               | Dirección estratégica, hoja de ruta y modelo de madurez                                                       | Alinear equipos a objetivos a largo plazo | Visión y estrategia             |
| [Hub de Madurez y Gaps](./reference/governance/standards/vision/README.es.md)                            | Hub ordenado de reportes de madurez, auditorías, gaps, oportunidades y evidencia                              | Revisar salud de la suite y siguientes acciones | Hub de reportes                 |
| [Centro de Gobernanza SDLC](./reference/governance/sdlc/README.es.md)                                     | Fases, gates, artefactos y modelo de trazabilidad autoritativos                                               | Gobernar el ciclo de vida completo        | Hub de gobernanza               |
| [Indice Maestro Global](./reference/navigation/MASTER_INDEX.es.md)                                        | Navegación completa del repositorio cuando ya sabes qué artefacto necesitas                                   | Localizar cualquier artefacto rápidamente | Índice de navegación            |
| [Integration & Messaging Hub](./reference/architecture/INTEGRATION_HUB.es.md)                             | Estrategias de mensajería asíncrona, topologías de integración y gobernanza de patrones                       | Estandarizar mensajería de microservicios | Hub de arquitectura             |
| [Application Architecture Hub](./reference/architecture/APPLICATION_ARCHITECTURE_HUB.es.md)               | Patrones de aplicación core (PoEAA) para desacoplar datos y lógica                                            | Estandarizar estructuras de apps          | Hub de arquitectura             |
| [Domain-Driven Design Hub](./reference/architecture/DOMAIN_DESIGN_HUB.es.md)                              | Patrones DDD estratégicos y tácticos para microservicios y contextos delimitados                              | Alinear software con dominios de negocio  | Hub de arquitectura             |

</details>

<details>
<summary><strong>Primeros Pasos por Rol</strong></summary>

> **Propósito:** Onboarding autoguiado — cada perfil encuentra su primera lectura según su responsabilidad.

| Rol                  | ¿Qué busca?                        | Comenzar por                                                                                         | Luego revisar                                                                               |
| -------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Arquitecto**       | Estándares, ADRs, blueprints       | [Hub de Arquitectura](./reference/architecture/README.es.md)                                         | [Matriz de ADRs](./reference/architecture/adrs/adr-matrix.es.md)                            |
| **Desarrollador**    | Cómo implementar siguiendo el SDLC | [Estándares de Ingeniería](./reference/governance/standards/engineering/engineering-manifesto.es.md) | [Modelo de Referencia UMS](./reference/knowledge/demo/ums-reference-model.es.md)            |
| **QA / SRE**         | Gates, calidad, métricas, ops      | [Hub Operativo](./reference/operations/README.es.md)                                                 | [Quality Gates SDLC](./reference/governance/sdlc/quality-gates.es.md)                       |
| **Producto / PM**    | PRD, trazabilidad, roadmap         | [Centro de Gobernanza SDLC](./reference/governance/sdlc/README.es.md)                                | [Visión del Producto](./reference/product-suite/vision/evolith-product-vision-master.es.md) |
| **Agente IA (BMAD)** | Reglas, skills, flujo asistido     | [AGENTS.md](./AGENTS.md) — reglas de agentes                                                         | [Flujo Asistido IA](./reference/governance/sdlc/ai-assisted-flow.es.md)                     |

</details>

## 1. Evolith Core

> **Meta:** definir la constitución de arquitectura neutral respecto de proveedores que todo producto y repositorio satélite hereda.
>
> **Objetivos:** centralizar directivas arquitectónicas y blueprints, preservar el histórico de decisiones mediante ADRs, alinear equipos en estándares y gobernanza, y automatizar el cumplimiento con rulesets.
>
> **Hub de dominio:** [Evolith Core](./reference/core/README.es.md) — qué es Core, qué no es, sus dominios y su regla de dependencia.

<details>
<summary><strong>Arquitectura y Blueprints</strong></summary>

| Enlace (URL)                                                              | Descripción (breve explicación)                                         | Meta / Objetivo             | Tipificación (categoría o tipo) |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------- | ------------------------------- |
| [Directivas Arquitectonicas y Hub](./reference/architecture/README.es.md) | Único punto de acceso a directivas, blueprints, stack base y topologías | Guiar el diseño corporativo | Hub de arquitectura             |

</details>

<details>
<summary><strong>Decisiones de Arquitectura (ADRs)</strong></summary>

| Enlace (URL)                                                           | Descripción (breve explicación)                                                  | Meta / Objetivo                 | Tipificación (categoría o tipo) |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------- | ------------------------------- |
| [Registro General de ADRs](./reference/architecture/adrs/README.es.md) | Punto central que agrupa la matriz de decisiones y todos los ADRs por ecosistema | Mantener histórico y gobernanza | Hub de decisiones               |

</details>

<details>
<summary><strong>Estandares y Gobernanza</strong></summary>

| Enlace (URL)                                                                       | Descripción (breve explicación)                                                       | Meta / Objetivo                        | Tipificación (categoría o tipo) |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------- |
| [Centro de Estandares y Gobernanza](./reference/governance/standards/README.es.md) | Directorio principal de manifiestos, taxonomías, directivas técnicas y observabilidad | Alinear equipos a políticas unificadas | Hub de gobernanza               |
| [Hub de Infraestructura y Operaciones](./reference/operations/README.es.md)        | Punto de acceso consolidado a despliegues, guías SRE e infraestructura                | Normar despliegues y operación         | Hub operativo                   |

</details>

<details>
<summary><strong>Rulesets y Validacion</strong></summary>

| Enlace (URL)                                       | Descripción (breve explicación)                                         | Meta / Objetivo                   | Tipificación (categoría o tipo) |
| -------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------- | ------------------------------- |
| [Hub General de Rulesets](./rulesets/README.es.md) | Centraliza todas las reglas automatizadas de arquitectura, schemas y CI | Validar cumplimiento automatizado | Hub de reglas                   |

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

| Enlace (URL)                                                                                | Descripción (breve explicación) | Meta / Objetivo              | Tipificación (categoría o tipo) |
| ------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------- | ------------------------------- |
| [Mapeo de Artefactos SDLC](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.es.md) | Mapeo de artefactos             | Vincular fases y entregables | Estandares y guia               |

</details>

<details>
<summary><strong>Fase 01 - Concepcion y Descubrimiento</strong></summary>

| Enlace (URL)                                                                                                           | Descripción (breve explicación)                                   | Meta / Objetivo                     | Tipificación (categoría o tipo) | Requisito       |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------- | ------------------------------- | --------------- |
| [Discovery Canvas](./reference/governance/sdlc/04-artifact-templates/discovery-canvas-template.es.md)                  | Lienzo de descubrimiento                                          | Definir visión y viabilidad         | Documentos y plantillas         | **Obligatorio** |
| [Technical Feasibility Canvas](./reference/governance/sdlc/04-artifact-templates/technical-feasibility-template.es.md) | Factibilidad técnica                                              | Especificar NFRs y restricciones    | Documentos y plantillas         | Opcional        |
| [Ballpark Estimation](./reference/governance/sdlc/04-artifact-templates/ballpark-estimation-template.es.md)            | Estimación a gran escala                                          | Proyectar costos y tiempos          | Documentos y plantillas         | Opcional        |
| [PRD - Documento de Requerimientos de Producto](./reference/governance/sdlc/04-artifact-templates/prd-template.es.md)  | Documento de requerimientos                                       | Especificar necesidades funcionales | Documentos y plantillas         | **Obligatorio** |
| [Evolith User Story](./reference/governance/sdlc/04-artifact-templates/evolith-user-story-template.es.md)              | Plantilla de historia de usuario                                  | Estandarizar historias ágiles       | Documentos y plantillas         | **Obligatorio** |
| [Agile Backlog](./reference/governance/sdlc/04-artifact-templates/agile-backlog-template.es.md)                        | Plantilla de backlog                                              | Organizar entregables               | Documentos y plantillas         | **Obligatorio** |
| [CLI Impact Analysis](./reference/governance/sdlc/04-artifact-templates/cli-impact-analysis.es.md)                     | Análisis de impacto CLI                                           | Evaluar cambios cross-repo          | Documentos y plantillas         | Opcional        |
| [Validation Schemas & Rules (Fase 1)](./rulesets/README.es.md)                                                         | Schemas de validación para Canvas, PRD, Backlog y reglas de Gates | Validar cumplimiento en CI          | Reglas y schemas                | **Obligatorio** |

</details>

<details>
<summary><strong>Fase 02 - Diseno y Arquitectura</strong></summary>

| Enlace (URL)                                                                                                                           | Descripción (breve explicación)               | Meta / Objetivo              | Tipificación (categoría o tipo) | Requisito       |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------- | ------------------------------- | --------------- |
| [Plantilla ADR](./reference/governance/sdlc/04-artifact-templates/adr-template.es.md)                                                  | Plantilla de ADR                              | Documentar decisiones clave  | Documentos y plantillas         | Opcional        |
| [Plantilla de Historia Funcional](./reference/governance/sdlc/04-artifact-templates/functional-story-template.es.md)                   | Plantilla de historia funcional               | Detallar comportamiento      | Documentos y plantillas         | **Obligatorio** |
| [Plantilla de Modelo DDD](./reference/governance/sdlc/04-artifact-templates/ddd-model-template.es.md)                                  | Plantilla de modelo DDD                       | Modelar dominios del sistema | Documentos y plantillas         | Opcional        |
| [Estandar de Escritura de Historias Funcionales](./reference/governance/sdlc/03-documentation/functional-story-writing-standard.es.md) | Estándar de historias funcionales             | Asegurar calidad de specs    | Estandares y guia               | **Obligatorio** |
| [Buenas Practicas de Documentacion SDLC](./reference/governance/sdlc/03-documentation/sdlc-documentation-best-practices.es.md)         | Prácticas de documentación                    | Mejorar calidad documental   | Estandares y guia               | **Obligatorio** |
| [Validation Schemas & Rules (Fase 2)](./rulesets/README.es.md)                                                                         | Schemas de validación para ADRs y Funcionales | Validar cumplimiento en CI   | Reglas y schemas                | **Obligatorio** |

</details>

<details>
<summary><strong>Fase 03 - Construccion</strong></summary>

| Enlace (URL)                                                                                                                    | Descripción (breve explicación)                                              | Meta / Objetivo                   | Tipificación (categoría o tipo) | Requisito       |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------- | ------------------------------- | --------------- |
| [Hub de Plantillas de Artefactos](./reference/governance/sdlc/04-artifact-templates/README.es.md)                               | Hub de plantillas                                                            | Centralizar formatos SDLC         | Documentos y plantillas         | **Obligatorio** |
| [Plantilla de Historia Tecnica](./reference/governance/sdlc/04-artifact-templates/technical-story-template.es.md)               | Plantilla de historia técnica                                                | Estructurar tareas técnicas       | Documentos y plantillas         | **Obligatorio** |
| [Framework SDLC Enfocado en Construccion](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.es.md) | Framework de construcción y Definition of Done (DoD)                         | Normar ejecución técnica          | Estandares y guia               | **Obligatorio** |
| [Quality Gates SDLC](./reference/governance/sdlc/quality-gates.es.md)                                                           | Gates de calidad                                                             | Establecer umbrales de aprobación | Estandares y guia               | **Obligatorio** |
| [Validation Schemas & Rules (Fase 3)](./rulesets/README.es.md)                                                                  | Schemas para Historias Técnicas, reglas DoD, Thresholds y Dependency Pinning | Validar cumplimiento en CI        | Reglas y schemas                | **Obligatorio** |

</details>

<details>
<summary><strong>Fase 04 - Validacion y QA</strong></summary>

| Enlace (URL)                                                                                                             | Descripción (breve explicación)               | Meta / Objetivo                   | Tipificación (categoría o tipo) | Requisito       |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | --------------------------------- | ------------------------------- | --------------- |
| [Plantilla de Test Summary Report](./reference/governance/sdlc/04-artifact-templates/test-summary-report-template.es.md) | Reporte de pruebas                            | Consolidar resultados de QA       | Documentos y plantillas         | **Obligatorio** |
| [Modelo de Trazabilidad SDLC](./reference/governance/sdlc/traceability-model.es.md)                                      | Modelo de trazabilidad                        | Vincular requerimientos y pruebas | Estandares y guia               | **Obligatorio** |
| [Validation Schemas & Rules (Fase 4)](./rulesets/README.es.md)                                                           | Esquema de validación del Test Summary Report | Validar cumplimiento en CI        | Reglas y schemas                | **Obligatorio** |

</details>

<details>
<summary><strong>Fase 05 - Entrega y Operaciones</strong></summary>

| Enlace (URL)                                                                                                 | Descripción (breve explicación)                                                         | Meta / Objetivo              | Tipificación (categoría o tipo) | Requisito       |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------- | --------------- |
| [Plantilla de Release Notes](./reference/governance/sdlc/04-artifact-templates/release-notes-template.es.md) | Plantilla de notas de versión                                                           | Comunicar cambios de release | Documentos y plantillas         | **Obligatorio** |
| [Validation Schemas & Rules (Fase 5)](./rulesets/README.es.md)                                               | Esquema de validación de Release Notes, reglas de CI/CD (ADR-0005) y GitFlow (ADR-0050) | Validar cumplimiento en CI   | Reglas y schemas                | **Obligatorio** |

</details>

## 3. Evolith Products

> **Meta:** entregar la constitución Core como productos funcionales y demostrarla con referencias aplicadas.
>
> **Objetivos:** dirigir el portafolio mediante la Product Suite, documentar el diseño interno de cada producto, demostrar adopción real mediante UMS y casos de adopción, y dotar de herramientas el flujo con la Smart CLI.
>
> **Hubs de dominio:** [Product Suite](./reference/product-suite/README.es.md) (visión y estrategia del portafolio) · [Diseños de Producto](./reference/products/README.es.md) (internos por producto)

<details open>
<summary><strong>Seguimiento de la Suite — pendientes, auditoría y madurez</strong></summary>

Todos los reportes de madurez, auditoría, gaps, oportunidades y evidencia están ordenados en un único hub:

| Enlace (URL)                                                          | Descripción (breve explicación)                                                                | Meta / Objetivo                                                       | Tipificación (categoría o tipo) |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------- |
| [Hub de Madurez y Gaps](./reference/governance/standards/vision/README.es.md) | Hub ordenado para evaluación de madurez, tablero de gaps, catálogo, cobertura, auditorías y evidencia | Iniciar toda revisión de salud desde una superficie canónica de reportes | Hub de reportes                 |

</details>

<details>
<summary><strong>Evolith Product Suite</strong></summary>

| Enlace (URL)                                                                                     | Descripción (breve explicación)                                               | Meta / Objetivo                   | Tipificación (categoría o tipo) |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | --------------------------------- | ------------------------------- |
| [Hub de Product Suite](./reference/product-suite/README.es.md)                                   | Único punto de acceso a la visión, estrategia y posicionamiento del portfolio | Dirección del ecosistema          | Referencia de producto          |
| [Arquitectura Evolith Core](./reference/architecture/blueprints/evolith-core-architecture.es.md) | Diseño completo del ecosistema C4 y visión conceptual de la plataforma        | Blueprint maestro de arquitectura | Blueprint de arquitectura       |

</details>

<details>
<summary><strong>Evolith Tracker</strong></summary>

| Enlace (URL)                                                             | Descripción (breve explicación)                                                     | Meta / Objetivo        | Tipificación (categoría o tipo) |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ---------------------- | ------------------------------- |
| [Evolith Tracker Hub](./reference/products/evolith-tracker/README.es.md) | Punto central que agrupa la arquitectura e interfaces técnicas del producto Tracker | Producto de gobernanza | Referencia de producto          |

</details>

<details>
<summary><strong>UMS (Referencia Aplicada)</strong></summary>

| Enlace (URL)                                                     | Descripción (breve explicación)                                                  | Meta / Objetivo               | Tipificación (categoría o tipo) |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------- | ------------------------------- |
| [Hub de Referencia UMS](./reference/knowledge/demo/README.es.md) | Punto de acceso consolidado a modelos, comparativas y portal de arquitectura UMS | Demostrar implementación real | Referencia aplicada             |

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

| Enlace (URL)                            | Descripción (breve explicación)                                                     | Meta / Objetivo         | Tipificación (categoría o tipo) |
| --------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------- | ------------------------------- |
| [Smart CLI Hub](./sdk/cli/README.es.md) | Acceso central a documentación, arquitectura, visión y análisis de estado de la CLI | Entender la herramienta | Referencia de producto          |

</details>

<details>
<summary><strong>Casos de Adopcion y Herramientas</strong></summary>

| Enlace (URL)                                                    | Descripción (breve explicación) | Meta / Objetivo             | Tipificación (categoría o tipo) |
| --------------------------------------------------------------- | ------------------------------- | --------------------------- | ------------------------------- |
| [Casos de Adopcion](./reference/knowledge/adoption-cases.es.md) | Casos de adopción               | Mostrar éxito y aprendizaje | Referencia aplicada             |

### Pre-commit Hooks

- [validate-docs.mjs](./.harness/scripts/ci/01-validate-docs.mjs) - validacion de links, anchors, encoding y Mermaid.
- [check-bilingual-parity.mjs](./.harness/scripts/ci/04-check-bilingual-parity.mjs) - validacion de paridad estructural EN/ES.
- [impact-analysis-synchronizer.mjs](./.harness/scripts/ci/06-impact-analysis-synchronizer.mjs) - sincronizacion de impacto cross-repo.

</details>

---

## 4. Navegacion y Mapa Documental

> **Meta:** hacer que cada documento sea localizable en dos clics o menos, en ambos idiomas.
>
> **Objetivos:** mantener el índice maestro como superficie de navegación completa, auditar la paridad EN/ES y registrar los releases documentales.

| Enlace (URL)                                                       | Descripción (breve explicación)                                                                                                                                                        | Meta / Objetivo                           | Tipificación (categoría o tipo) |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------- |
| [Índice Maestro Global](./reference/navigation/MASTER_INDEX.es.md) | La única superficie de navegación completa: por intención, por rol, por fase SDLC (todos los artefactos de cada fase) y con el Core agnóstico separado de lo específico por plataforma | Localizar cualquier artefacto rápidamente | Índice de navegación            |
| [Índice Bilingüe](./reference/navigation/BILINGUAL_INDEX.es.md)    | Estado autogenerado del emparejamiento EN/ES del corpus de referencia                                                                                                                  | Auditar cobertura bilingüe                | Índice de navegación            |
| [Acceso Rápido por Stack](./reference/quick-access/README.es.md)   | Camino más corto a los estándares de React, .NET y Node.js                                                                                                                             | Reducir fricción de navegación            | Índice de navegación            |
| [Taxonomía Documental](./reference/documentation-taxonomy.es.md)   | Qué tipo de documento pertenece a cada lugar                                                                                                                                           | Mantener el corpus organizado             | Referencia de gobernanza        |

## Contribucion

Antes de contribuir, lee:

- [Guía de Contribución Open Source](./CONTRIBUTING.es.md) — Cómo contribuir como miembro de la comunidad usando el método BMAD
- [AGENTS.md](./AGENTS.md) — Reglas y convenciones de agentes
- [Taxonomia del Repositorio](./reference/governance/standards/repository-taxonomy.es.md) — Que va donde
- [Guia de Herencia](./reference/governance/standards/onboarding/child-repository-inheritance-guide.es.md) — Como los productos heredan

## Licencia

Publicado bajo la [Licencia MIT](./LICENSE).

---

<div align="center">
  <sub>Evolith — Framework de Gobernanza Arquitectónica Ejecutable | Corpus de Referencia Multi-Topología | Spec-driven AI-DD</sub>
</div>
