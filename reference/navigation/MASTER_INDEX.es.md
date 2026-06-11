# Índice Maestro Global Evolith

> Navegación bilingüe: [English](./MASTER_INDEX.md)  
> Portal principal: [README](../../README.es.md)

Este es el índice completo de navegación de **Evolith** — la plataforma empresarial de arquitectura progresiva. Úsalo cuando ya sepas qué tipo de artefacto necesitas o cuando quieras moverte entre áreas del repositorio sin explorar directorios manualmente.

El índice sigue el orden del portal: primero orientación (secciones 1–2), luego los tres dominios de lo genérico a lo específico — **Core**, **SDLC**, **Products** (secciones 3–5) — y finalmente las reglas machine-readable y las superficies meta de navegación (secciones 6–7).

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
<summary><strong>3. Evolith Core — Constitución de Arquitectura</strong></summary>

> **Meta:** mantener cada regla universal y neutral respecto de proveedores en un único corpus gobernado. Empieza por el [Hub de Evolith Core](../core/README.es.md) para la meta, los límites y la regla de dependencia del dominio.

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Hub de Evolith Core](../core/README.es.md) | Define qué es Core, qué no es, sus dominios, invariantes y regla de dependencia | Anclar la constitución neutral respecto de proveedores | Hub de dominio | Sí |
| [Hub de Arquitectura](../architecture/README.es.md) | Agrupa las directivas, patrones canónicos, blueprints y la línea base de tecnología agnóstica | Guiar el diseño corporativo | Hub de área | Sí |
| [Registro General de ADRs](../architecture/adrs/README.es.md) | Agrupa la matriz de decisiones y todos los ADRs de Evolith (Core, Node, .NET, Android) | Preservar histórico y gobernanza de decisiones | Hub de área | Sí |
| [Centro de Estándares y Gobernanza](../governance/standards/README.es.md) | Agrupa directivas técnicas, evaluación de madurez, glosario, manifiestos y onboarding | Alinear equipos a políticas unificadas | Hub de área | Sí |
| [Hub Operativo](../operations/README.es.md) | Agrupa guías de observabilidad (OpenTelemetry, Tempo, Grafana) y despliegues SRE | Estandarizar operaciones | Hub de área | No |
| [Hub de Infraestructura](../infrastructure/README.es.md) | Describe la plataforma local por fases: base de datos, caché, bróker, gateway y secretos | Estandarizar el runtime local | Hub de área | No |

</details>

<details>
<summary><strong>4. Evolith SDLC — Gobernanza del Ciclo de Vida</strong></summary>

> **Meta:** gobernar las cinco fases del ciclo de vida con gates, artefactos y trazabilidad explícitos. Empieza por el [Centro de Gobernanza SDLC](../governance/sdlc/README.es.md).

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Centro de Gobernanza SDLC](../governance/sdlc/README.es.md) | Documentación autoritativa sobre fases, gates, roles y mapeo de entregables | Gobernar el ciclo de vida completo | Hub de dominio | Sí |
| [Hub de Plantillas de Artefactos](../governance/sdlc/04-artifact-templates/README.es.md) | Plantillas canónicas para cada artefacto de fase, del Discovery Canvas a las Release Notes | Estandarizar entregables | Hub de área | Sí |
| [Quality Gates SDLC](../governance/sdlc/quality-gates.es.md) | Umbrales de aprobación que cada fase debe satisfacer antes de avanzar | Hacer cumplir la calidad por fase | Estándar | Sí |
| [Modelo de Trazabilidad SDLC](../governance/sdlc/traceability-model.es.md) | Cómo requerimientos, historias, pruebas y releases permanecen vinculados de extremo a extremo | Garantizar trazabilidad de extremo a extremo | Estándar | Sí |
| [Mapeo de Artefactos SDLC](../governance/sdlc/sdlc-evolith-artifact-mapping.es.md) | Mapeo entre fases y entregables esperados | Vincular fases y entregables | Referencia | No |

</details>

<details>
<summary><strong>5. Evolith Products — Suite, Diseños y Referencia Aplicada</strong></summary>

> **Meta:** navegar desde la estrategia del portafolio hasta los internos de cada producto y la evidencia aplicada que los valida. Empieza por el [Hub de Product Suite](../product-suite/README.es.md).

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Hub de Product Suite](../product-suite/README.es.md) | Visión del portafolio, estrategia, posicionamiento, métodos, arquitectura de suite y comunicación | Dirigir el ecosistema | Hub de dominio | Sí |
| [Hub de Diseños de Producto](../products/README.es.md) | Diseño funcional y técnico por producto; entrada al hub del Tracker | Contener los internos de producto | Hub de área | Sí |
| [Hub del Tracker](../products/evolith-tracker/README.es.md) | Arquitectura e interfaces técnicas del producto Tracker | Diseñar el producto de gobernanza | Hub de producto | No |
| [Hub del Smart CLI](../../sdk/cli/README.es.md) | Documentación, arquitectura, visión y análisis de estado de la CLI | Entender el producto de tooling | Hub de producto | No |
| [Hub de Plataformas](../platforms/README.es.md) | Herramientas nombradas, vendors, adapters, licencias y perfiles de despliegue | Aislar decisiones de proveedores | Hub de área | Sí |
| [Hub de Referencia UMS](../knowledge/demo/README.es.md) | Muestra la adopción de las directivas Evolith en un entorno práctico demostrativo (UMS) | Demostrar implementación real | Referencia aplicada | No |
| [Hub de Conocimiento e Investigación](../knowledge/README.es.md) | Investigación, PoCs y métricas de adopción de la plataforma | Capturar evidencia y aprendizaje | Hub de área | No |
| [Repositorio UMS](https://github.com/beyondnetcode/ums) | Repositorio oficial externo que implementa el ecosistema de arquitectura | Proveer evidencia ejecutable | Repositorio externo | No |

</details>

<details>
<summary><strong>6. Rulesets y Validación (Machine-Readable)</strong></summary>

> **Meta:** convertir la constitución en reglas automatizadas exigibles en CI.

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Rulesets Hub](../../rulesets/README.es.md) | Índice central para todos los schemas, reglas de arquitectura, CI/CD, SDLC y gobernanza en formato automatizado | Validar cumplimiento automáticamente | Hub de reglas | Sí |

</details>

<details>
<summary><strong>7. Navegación y Superficies Documentales</strong></summary>

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
  <a href="../../README.es.md">Volver al Portal Principal de Evolith</a>
</div>
