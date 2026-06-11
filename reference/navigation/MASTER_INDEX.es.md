# Índice Maestro Global Evolith

> Navegación bilingüe: [English](./MASTER_INDEX.md)  
> Portal principal: [README](../../README.es.md)

Este es el índice completo de navegación de **Evolith** — la plataforma empresarial de arquitectura progresiva. Úsalo cuando ya sepas qué tipo de artefacto necesitas o cuando quieras moverte entre áreas del repositorio sin explorar directorios manualmente.

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
<summary><strong>3. Arquitectura Central</strong></summary>

| Área | Único Punto de Acceso | Descripción |
|---|---|---|
| Directivas y Blueprints | [Hub de Arquitectura](../architecture/README.es.md) | Hub central que agrupa las directivas, patrones canónicos, blueprints y la línea base de tecnología agnóstica. |
| Decisiones de Arquitectura (ADRs) | [Registro General de ADRs](../architecture/adrs/README.es.md) | Índice general que agrupa la matriz de decisiones y todos los ADRs de Evolith (Core, Node, .NET, Android). |

</details>

<details>
<summary><strong>4. Gobernanza y Estándares</strong></summary>

| Área | Único Punto de Acceso | Descripción |
|---|---|---|
| Gobernanza y Estándares | [Centro de Estándares y Gobernanza](../governance/standards/README.es.md) | Acceso a directivas técnicas, evaluación de madurez, glosario, manifiestos y onboarding. |
| SDLC (Ciclo de Vida) | [Centro de Gobernanza SDLC](../governance/sdlc/README.es.md) | Documentación autoritativa sobre las fases, plantillas de artefactos y mapeos de entregables. |
| Operaciones e Infraestructura | [Hub Operativo](../operations/README.es.md) | Agrupa infraestructura, guías de OpenTelemetry, Tempo, Grafana y despliegues SRE. |

</details>

<details>
<summary><strong>5. Referencia Aplicada y Ejecutable</strong></summary>

| Área | Único Punto de Acceso | Descripción |
|---|---|---|
| Referencia Aplicada UMS | [Hub de Referencia UMS](../knowledge/demo/README.es.md) | Muestra la adopción de las directivas Evolith en un entorno práctico demostrativo (UMS). |
| Casos de Uso y Adopción | [Hub de Conocimiento e Investigación](../knowledge/README.es.md) | Investigación, PoCs y métricas de adopción de la plataforma. |
| Producto UMS (Código) | [Repositorio UMS](https://github.com/beyondnetcode/ums) | Repositorio oficial externo que implementa el ecosistema de arquitectura. |

</details>

<details>
<summary><strong>6. Rulesets y Validación (Machine-Readable)</strong></summary>

| Área | Único Punto de Acceso | Descripción |
|---|---|---|
| Hub General de Rulesets | [Rulesets Hub](../../rulesets/README.es.md) | Índice central para todos los schemas, reglas de arquitectura, CI/CD, SDLC y gobernanza en formato automatizado. |

</details>

---

<div align="center">
  <a href="../../README.es.md">Volver al Portal Principal de Evolith</a>
</div>
