# Índice Maestro Global Evolith

> Navegación bilingüe: [English](./MASTER_INDEX.md)  
> Portal principal: [README](../../README.es.md)

Este es el índice completo de navegación de **Evolith** — la plataforma empresarial de arquitectura progresiva. Úsalo cuando ya sepas qué tipo de artefacto necesitas o cuando quieras moverte entre áreas del repositorio sin explorar directorios manualmente.

El índice está organizado para navegar rápido: primero orientación (secciones 1–2), luego la arquitectura separada entre **Core agnóstico** y **específico por plataforma/runtime** (secciones 3–4), el **SDLC fase por fase con todos sus artefactos dentro** (sección 5), los **productos** (sección 6), y al final las reglas machine-readable y las superficies meta de navegación (secciones 7–8).

Cada entrada de documento usa los mismos cinco campos: **Documento** (título enlazado), **Descripción** (qué hace el documento), **Objetivo / Meta** (por qué existe), **Tipo** (categoría de documento) y **Obligatorio** (Sí cuando el documento es normativo o de lectura requerida para su dominio; No cuando es informativo u opcional).

---

<details>
<summary><strong>1. Empieza por Intención</strong></summary>

| Intención | Entrada principal | Referencia de apoyo |
|---|---|---|
| Elegir una ruta de lectura eficiente | [Primeros Pasos por Rol](../getting-started/README.es.md) | [Glosario Arquitectónico](../governance/glossary.es.md) |
| Entender la visión arquitectónica | [Directivas Arquitectónicas](../governance/standards/vision/architectural-directives.es.md) | [Roadmap Evolutivo](../governance/standards/vision/evolutionary-strategy-roadmap.es.md) |
| Entender el modelo de arquitectura progresiva | [Hub de Arquitectura](../architecture/README.es.md) | [Criterios de Extracción a Microservicios](../architecture/adrs/core/0045-microservice-extraction-readiness-criteria.es.md) |
| Revisar decisiones tecnológicas | [Stack Tecnológico Autorizado](../architecture/blueprints/authoritative-tech-stack.es.md) | [Línea Base Agnóstica](../architecture/blueprints/authoritative-tech-stack-agnostic.es.md) |
| Revisar decisiones arquitectónicas | [Registro ADR](../architecture/adrs/README.es.md) | [ADRs Core](../architecture/adrs/core/README.es.md) |
| Aprender estándares de ingeniería | [Manifiesto de Ingeniería](../governance/standards/engineering/engineering-manifesto.es.md) | [Guía de Contract Testing](../governance/standards/engineering/contract-testing-guideline.es.md) |
| Entender expectativas SDLC | [Centro de Gobernanza SDLC](../governance/sdlc/README.es.md) | [Plantillas de Artefactos SDLC](../governance/sdlc/04-artifact-templates/README.es.md) |
| Explorar la referencia aplicada de producto | [Hub de Referencia UMS](../knowledge/demo/README.es.md) | [Portal de Arquitectura UMS](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |
| Separar políticas de evidencia de implementación | [Referencia Canónica vs Modelo Aplicado UMS](../knowledge/demo/demo-vs-reference.es.md) | [Taxonomía del Repositorio](../governance/standards/repository-taxonomy.es.md) |
| Operar o desplegar localmente | [Hub de Operaciones](../operations/README.es.md) | [Hub de Infraestructura](../infrastructure/README.es.md) |
| Explicar el estándar a una nueva audiencia | [Estrategia de Comunicación Arquitectónica](../governance/standards/communication/architecture-communication-strategy.es.md) | [Backlog Visual de Arquitectura](../governance/standards/communication/visuals/README.es.md) |

</details>

<details>
<summary><strong>2. Lectura Recomendada por Rol</strong></summary>

| Rol | Ruta de lectura |
|---|---|
| **Ejecutivo / Sponsor** | [Directivas Arquitectónicas](../governance/standards/vision/architectural-directives.es.md) -> [Roadmap Evolutivo](../governance/standards/vision/evolutionary-strategy-roadmap.es.md) -> [Evaluación de Madurez](../governance/standards/vision/maturity-assessment.es.md) |
| **Product Owner / PM** | [Modelo de Referencia UMS](../knowledge/demo/ums-reference-model.es.md) -> [Índice Documental UMS](https://github.com/beyondnetcode/ums/blob/main/docs/MASTER_INDEX.md) -> [Referencia vs Modelo Aplicado](../knowledge/demo/demo-vs-reference.es.md) |
| **Arquitecto de Software** | [Hub de Arquitectura](../architecture/README.es.md) -> [Registro ADR](../architecture/adrs/README.es.md) -> [Portal de Arquitectura UMS](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |
| **Principal / Staff Engineer** | [Línea Base Agnóstica](../architecture/blueprints/authoritative-tech-stack-agnostic.es.md) -> [Patrones Tácticos](../architecture/adrs/core/0019-tactical-design-patterns-future-proofing.es.md) -> [Checklist de Simplicidad](../architecture/blueprints/simplicity-checklist-phase-01.es.md) |
| **Backend Developer** | [Manifiesto de Ingeniería](../governance/standards/engineering/engineering-manifesto.es.md) -> [Registro ADR por Runtime](../architecture/adrs/README.es.md) -> [Modelo de Referencia UMS](../knowledge/demo/ums-reference-model.es.md) |
| **Frontend Developer** | [ADR Resiliencia Frontend](../architecture/adrs/nodejs/0004-frontend-offline-resilience.es.md) -> [ADR Microfrontends](../architecture/adrs/core/0055-microfrontends-architecture-strategy.es.md) -> [Repositorio UMS](https://github.com/beyondnetcode/ums) |
| **DevOps / SRE** | [Hub de Infraestructura](../infrastructure/README.es.md) -> [Hub de Operaciones](../operations/README.es.md) -> [Portal de Arquitectura UMS](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |
| **QA / SDET** | [ADR Pirámide de Testing](../architecture/adrs/core/0018-testing-pyramid-quality-gates.es.md) -> [Guía de Contract Testing](../governance/standards/engineering/contract-testing-guideline.es.md) -> [ADR Integración y E2E](../architecture/adrs/core/0053-integration-e2e-testing-strategy.es.md) |
| **Security Engineer** | [Vendor Risk Assessment](../governance/standards/engineering/vendor-risk-assessment.es.md) -> [ADR Multi-Tenancy](../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.es.md) -> [ADR Auditoría Inmutable](../architecture/adrs/core/0016-immutable-business-audit-trail.es.md) |
| **AI Contributor** | [Estándares AI-Augmented](../governance/standards/ai-augmented/README.es.md) -> [Reglas Harness](../../.harness/rules/global-rules.es.md) -> [Agentes](../../AGENTS.es.md) |
| **New Joiner** | [Product Quick Start](../governance/standards/onboarding/product-quick-start.es.md) -> [Taxonomía del Repositorio](../governance/standards/repository-taxonomy.es.md) -> [Portal README](../../README.es.md) |

</details>

<details>
<summary><strong>3. Evolith Core — Arquitectura Agnóstica (neutral de proveedores y runtimes)</strong></summary>

> **Meta:** mantener cada regla universal y neutral respecto de proveedores en un único corpus gobernado. Empieza por el [Hub de Evolith Core](../core/README.es.md) para la meta, los límites y la regla de dependencia del dominio. Todo lo que nombre un runtime o vendor vive en la sección 4, no aquí.

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Hub de Evolith Core](../core/README.es.md) | Define qué es Core, qué no es, sus dominios, invariantes y regla de dependencia | Anclar la constitución neutral respecto de proveedores | Hub de dominio | Sí |
| [Hub de Arquitectura](../architecture/README.es.md) | Agrupa las directivas, patrones canónicos, blueprints y la línea base de tecnología agnóstica | Guiar el diseño corporativo | Hub de área | Sí |
| [Baseline Arquitectónico Agnóstico](../architecture/blueprints/authoritative-tech-stack-agnostic.es.md) | Restricciones de arquitectura agnósticas al runtime para todos los stacks | Restringir todos los stacks uniformemente | Baseline universal | Sí |
| [ADRs Core (agnósticos)](../architecture/adrs/core/README.es.md) | Las 45 decisiones de arquitectura agnósticas al runtime | Preservar el histórico de decisiones universales | Registro de decisiones | Sí |
| [Matriz de Decisiones ADR](../architecture/adrs/adr-matrix.es.md) | Encuentra el ADR controlador por preocupación arquitectónica | Acelerar el descubrimiento de decisiones | Índice de decisiones | Sí |
| [Centro de Estándares y Gobernanza](../governance/standards/README.es.md) | Agrupa directivas técnicas, evaluación de madurez, glosario, manifiestos y onboarding | Alinear equipos a políticas unificadas | Hub de área | Sí |
| [Hub Operativo](../operations/README.es.md) | Agrupa guías de observabilidad (OpenTelemetry, Tempo, Grafana) y despliegues SRE | Estandarizar operaciones | Hub de área | No |
| [Hub de Infraestructura](../infrastructure/README.es.md) | Describe la plataforma local por fases: base de datos, caché, bróker, gateway y secretos | Estandarizar el runtime local | Hub de área | No |

</details>

<details>
<summary><strong>4. Específico por Plataforma y Runtime (Node.js · .NET · Android · vendors nombrados)</strong></summary>

> **Meta:** aislar todo lo que nombre un runtime, herramienta o vendor — para que Core permanezca neutral y las elecciones de plataforma sigan siendo reemplazables.

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Registro General de ADRs](../architecture/adrs/README.es.md) | Todos los ADRs clasificados por alcance: Core agnóstico más ecosistemas de runtime | Encontrar la decisión controladora por alcance | Hub de área | Sí |
| [ADRs Node.js / TypeScript](../architecture/adrs/nodejs/README.es.md) | Decisiones ligadas al runtime Node.js/TypeScript | Gobernar el ecosistema Node.js | Registro de decisiones | Sí |
| [ADRs .NET (C#)](../architecture/adrs/dotnet/README.es.md) | Decisiones ligadas al runtime .NET | Gobernar el ecosistema .NET | Registro de decisiones | Sí |
| [ADRs Android (Kotlin)](../architecture/adrs/android/README.es.md) | Decisiones ligadas a clientes móviles nativos | Gobernar el ecosistema Android | Registro de decisiones | Sí |
| [Índice de Perfiles de Runtime](../architecture/blueprints/authoritative-tech-stack.es.md) | Perfiles de stack aprobados por runtime (Node.js, .NET, Android) | Acotar elecciones tecnológicas por runtime | Índice de blueprints | Sí |
| [Patrones Canónicos](../architecture/canonical-patterns/README.es.md) | Implementaciones de referencia específicas por runtime de los ADRs | Reutilizar implementaciones probadas | Índice de patrones | No |
| [Hub de Plataformas](../platforms/README.es.md) | Herramientas nombradas, vendors, adapters, licencias y perfiles de despliegue | Aislar decisiones de proveedores | Hub de área | Sí |
| [Catálogo de Herramientas Validadas](../platforms/validated-tool-catalog.es.md) | Herramientas validadas por fase, patrón y runtime (consumido por el Smart CLI) | Acotar herramientas a opciones validadas | Estándar corporativo | Sí |
| [Acceso Rápido por Stack](../quick-access/README.es.md) | Camino más corto a los estándares de React, .NET y Node.js | Reducir fricción de navegación | Índice de navegación | No |

</details>

<details>
<summary><strong>5. Evolith SDLC — Navegación por Fase (todo por fase)</strong></summary>

> **Meta:** gobernar las cinco fases del ciclo de vida con gates, artefactos y trazabilidad explícitos. Empieza por el [Centro de Gobernanza SDLC](../governance/sdlc/README.es.md); abajo, cada fase lista todos sus artefactos.

**Gobernanza transversal** — aplica a todas las fases:

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Centro de Gobernanza SDLC](../governance/sdlc/README.es.md) | Documentación autoritativa sobre fases, gates, roles y mapeo de entregables | Gobernar el ciclo de vida completo | Hub de dominio | Sí |
| [Hub de Plantillas de Artefactos](../governance/sdlc/04-artifact-templates/README.es.md) | Plantillas canónicas para cada artefacto de fase | Estandarizar entregables | Hub de área | Sí |
| [Quality Gates SDLC](../governance/sdlc/quality-gates.es.md) | Umbrales de aprobación que cada fase debe satisfacer antes de avanzar | Hacer cumplir la calidad por fase | Estándar | Sí |
| [Modelo de Trazabilidad SDLC](../governance/sdlc/traceability-model.es.md) | Cómo requerimientos, historias, pruebas y releases permanecen vinculados de extremo a extremo | Garantizar trazabilidad de extremo a extremo | Estándar | Sí |
| [Matriz de Responsabilidades SDLC](../governance/sdlc/responsibility-matrix.es.md) | Expectativas de accountability y evidencia por gate | Asignar la propiedad de los gates | Estándar | Sí |
| [Mapeo de Artefactos SDLC](../governance/sdlc/sdlc-evolith-artifact-mapping.es.md) | Mapeo entre fases y entregables esperados | Vincular fases y entregables | Referencia | No |
| [Vista Ejecutiva SDLC](../governance/sdlc/executive-view.es.md) | Modelo operativo directivo para inversión, riesgo y gates | Operar el SDLC a nivel directivo | Referencia | No |

**Fase 01 — Concepción y Descubrimiento** · gate de salida: Aprobación de Negocio

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Discovery Canvas](../governance/sdlc/04-artifact-templates/discovery-canvas-template.es.md) | Lienzo de descubrimiento | Definir visión y viabilidad | Plantilla | Sí |
| [PRD — Documento de Requisitos de Producto](../governance/sdlc/04-artifact-templates/prd-template.es.md) | Requisitos de producto | Especificar necesidades funcionales | Plantilla | Sí |
| [Evolith User Story](../governance/sdlc/04-artifact-templates/evolith-user-story-template.es.md) | Plantilla de historia de usuario | Estandarizar historias ágiles | Plantilla | Sí |
| [Agile Backlog](../governance/sdlc/04-artifact-templates/agile-backlog-template.es.md) | Plantilla de backlog | Organizar entregables | Plantilla | Sí |
| [Technical Feasibility Canvas](../governance/sdlc/04-artifact-templates/technical-feasibility-template.es.md) | Análisis de viabilidad | Documentar restricciones de stack técnico y atributos de calidad (NFRs) | Plantilla | No |
| [Ballpark Estimation](../governance/sdlc/04-artifact-templates/ballpark-estimation-template.es.md) | Estimación de alto nivel | Proyectar costos y tiempos | Plantilla | No |
| [CLI Impact Analysis](../governance/sdlc/04-artifact-templates/cli-impact-analysis.es.md) | Análisis de impacto del CLI | Evaluar cambios cross-repo | Plantilla | No |
| [Schemas y Reglas de Validación](../../rulesets/README.es.md) | Schemas de Canvas, PRD y Backlog más reglas de gates | Validar cumplimiento en CI | Reglas y schemas | Sí |

**Fase 02 — Diseño y Arquitectura** · gate de salida: Baseline de Diseño Aprobado

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Plantilla de Historia Funcional](../governance/sdlc/04-artifact-templates/functional-story-template.es.md) | Especificación de comportamiento de negocio | Especificar comportamiento verificable | Plantilla | Sí |
| [Estándar de Escritura de Historias Funcionales](../governance/sdlc/03-documentation/functional-story-writing-standard.es.md) | Reglas normativas de escritura para historias funcionales | Asegurar la calidad de las especificaciones | Estándar | Sí |
| [Buenas Prácticas de Documentación SDLC](../governance/sdlc/03-documentation/sdlc-documentation-best-practices.es.md) | Reglas de documentación como código | Mantener la documentación honesta | Estándar | Sí |
| [Plantilla ADR](../governance/sdlc/04-artifact-templates/adr-template.es.md) | Plantilla de registro de decisión arquitectónica | Documentar decisiones que cruzan límites | Plantilla | No |
| [Plantilla de Modelo DDD](../governance/sdlc/04-artifact-templates/ddd-model-template.es.md) | Plantilla de modelado de dominio | Modelar los dominios del sistema | Plantilla | No |
| [Schemas y Reglas de Validación](../../rulesets/README.es.md) | Schemas de ADR e Historia Funcional | Validar estructura en CI | Reglas y schemas | Sí |

**Fase 03 — Construcción** · gate de salida: Build Exitoso

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Plantilla de Historia Técnica](../governance/sdlc/04-artifact-templates/technical-story-template.es.md) | Plantilla de item de trabajo de ingeniería | Estructurar el trabajo técnico | Plantilla | Sí |
| [Framework SDLC Orientado a Construcción](../governance/sdlc/02-engineering/construction-focused-sdlc-framework.es.md) | Progresión de fases, build loop y Definition of Done | Normar la ejecución técnica | Estándar | Sí |
| [Quality Gates SDLC](../governance/sdlc/quality-gates.es.md) | Umbrales de cobertura, complejidad, CVEs y deuda | Hacer cumplir la calidad del build | Estándar | Sí |
| [Schemas y Reglas de Validación](../../rulesets/README.es.md) | Schema de Historia Técnica, reglas DoD, thresholds, dependency pinning | Validar cumplimiento en CI | Reglas y schemas | Sí |

**Fase 04 — Validación y QA** · gate de salida: RC Sellado

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Plantilla de Test Summary Report](../governance/sdlc/04-artifact-templates/test-summary-report-template.es.md) | Registro consolidado de validación QA | Consolidar la evidencia de QA | Plantilla | Sí |
| [Modelo de Trazabilidad SDLC](../governance/sdlc/traceability-model.es.md) | Cadena de evidencia de requisito a prueba | Vincular requisitos y pruebas | Estándar | Sí |
| [Schemas y Reglas de Validación](../../rulesets/README.es.md) | Schema del Test Summary Report | Validar cumplimiento en CI | Reglas y schemas | Sí |

**Fase 05 — Entrega y Operaciones** · gate de salida: Producción Activa

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Plantilla de Release Notes](../governance/sdlc/04-artifact-templates/release-notes-template.es.md) | Registro de despliegue en producción | Comunicar el release | Plantilla | Sí |
| [Schemas y Reglas de Validación](../../rulesets/README.es.md) | Schema de Release Notes, reglas de gates CI/CD (ADR-0005), GitFlow (ADR-0050) | Automatizar la validación del pipeline | Reglas y schemas | Sí |

</details>

<details>
<summary><strong>6. Evolith Products — Suite, Diseños y Referencia Aplicada</strong></summary>

> **Meta:** navegar desde la estrategia del portafolio hasta los internos de cada producto y la evidencia aplicada que los valida. Empieza por el [Hub de Product Suite](../product-suite/README.es.md). El seguimiento de la suite (tablero de gaps y evaluación de madurez) está visible en el [README raíz](../../README.es.md).

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Hub de Product Suite](../product-suite/README.es.md) | Visión del portafolio, estrategia, posicionamiento, métodos, arquitectura de suite y comunicación | Dirigir el ecosistema | Hub de dominio | Sí |
| [Arquitectura Evolith Core](../architecture/blueprints/evolith-core-architecture.es.md) | Blueprint de Plataforma con Contexto C4, Contenedores, Componentes e Interacciones | Blueprint de Arquitectura de Plataforma | Blueprint de arquitectura | Sí |
| [Hub de Diseños de Producto](../products/README.es.md) | Diseño funcional y técnico por producto; entrada al hub del Tracker | Contener los internos de producto | Hub de área | Sí |
| [Hub del Tracker](../products/evolith-tracker/README.es.md) | Arquitectura e interfaces técnicas del producto Tracker | Diseñar el producto de gobernanza | Hub de producto | No |
| [Hub del Smart CLI](../../sdk/cli/README.es.md) | Documentación, arquitectura, visión y análisis de estado de la CLI | Entender el producto de tooling | Hub de producto | No |
| [Tablero de Gaps](../governance/standards/vision/gap-tracking.es.md) | Cola de ejecución y dashboard de todos los gaps abiertos de la suite | Ver qué falta y en qué orden | Tablero de seguimiento | Sí |
| [Evaluación de Madurez](../governance/standards/vision/maturity-assessment.es.md) | Matriz TOGAF ACMM, revisión WAF y auditoría de patrones | Medir la madurez de la suite | Matriz de madurez y auditoría | Sí |
| [Hub de Referencia UMS](../knowledge/demo/README.es.md) | Muestra la adopción de las directivas Evolith en un entorno práctico demostrativo (UMS) | Demostrar implementación real | Referencia aplicada | No |
| [Hub de Conocimiento e Investigación](../knowledge/README.es.md) | Investigación, PoCs y métricas de adopción de la plataforma | Capturar evidencia y aprendizaje | Hub de área | No |
| [Repositorio UMS](https://github.com/beyondnetcode/ums) | Repositorio oficial externo que implementa el ecosistema de arquitectura | Proveer evidencia ejecutable | Repositorio externo | No |

</details>

<details>
<summary><strong>7. Rulesets y Validación (Machine-Readable)</strong></summary>

> **Meta:** convertir la constitución en reglas automatizadas exigibles en CI.

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Rulesets Hub](../../rulesets/README.es.md) | Índice central para todos los schemas, reglas de arquitectura, CI/CD, SDLC y gobernanza en formato automatizado | Validar cumplimiento automáticamente | Hub de reglas | Sí |

</details>

<details>
<summary><strong>8. Navegación y Superficies Documentales</strong></summary>

> **Meta:** mantener observables la navegación, la cobertura bilingüe y los releases documentales.

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Hub de Navegación](./README.es.md) | Hogar de los documentos de navegación de nivel repositorio | Centralizar la navegación | Hub de navegación | Sí |
| [Índice Bilingüe](./BILINGUAL_INDEX.es.md) | Estado autogenerado del emparejamiento EN/ES del corpus de referencia | Auditar cobertura bilingüe | Índice autogenerado | No |
| [Acceso Rápido por Stack](../quick-access/README.es.md) | Camino más corto a los estándares de React, .NET y Node.js | Reducir fricción de navegación | Índice de navegación | No |
| [Registro de Versiones](./DOCUMENTATION_VERSIONS.es.md) | Historial y política de releases documentales | Trazar releases documentales | Registro de versiones | No |
| [Taxonomía de Documentación](../documentation-taxonomy.es.md) | Define qué tipo de documento pertenece a cada lugar | Mantener el corpus organizado | Estándar de gobernanza | Sí |
| [Primeros Pasos por Rol](../getting-started/README.es.md) | Rutas de lectura por rol para lectores nuevos | Acelerar el onboarding | Guía de incorporación | No |

</details>

---

<div align="center">
  [Volver al Portal Principal de Evolith](../../README.es.md)
</div>
