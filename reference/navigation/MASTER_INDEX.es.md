# Índice Maestro Global Evolith

> Navegación bilingüe: [English](./MASTER_INDEX.md)  
> Portal principal: [README](../../README.es.md)

Este es el índice completo de navegación de **Evolith** — la plataforma empresarial de arquitectura progresiva. Úsalo cuando ya sepas qué tipo de artefacto necesitas o cuando quieras moverte entre áreas del repositorio sin explorar directorios manualmente.

---

## 1. Empieza por Intención

| Intención | Entrada principal | Referencia de apoyo |
|---|---|---|
| Elegir una ruta de lectura eficiente | [Primeros Pasos por Rol](../getting-started/README.es.md) | [Glosario Arquitectónico](../governance/glossary.es.md) |
| Entender la visión arquitectónica | [Directivas Arquitectónicas](../governance/standards/vision/architectural-directives.md) | [Roadmap Evolutivo](../governance/standards/vision/evolutionary-strategy-roadmap.md) |
| Entender el modelo de arquitectura progresiva | [Hub de Arquitectura](../architecture/README.es.md) | [Criterios de Extracción a Microservicios](../architecture/adrs/core/0045-microservice-extraction-readiness-criteria.md) |
| Revisar decisiones tecnológicas | [Stack Tecnológico Autorizado](../architecture/blueprints/authoritative-tech-stack.md) | [Línea Base Agnóstica](../architecture/blueprints/authoritative-tech-stack-agnostic.md) |
| Revisar decisiones arquitectónicas | [Registro ADR](../architecture/adrs/README.md) | [ADRs Core](../architecture/adrs/core/README.es.md) |
| Aprender estándares de ingeniería | [Manifiesto de Ingeniería](../governance/standards/engineering/engineering-manifesto.md) | [Guía de Contract Testing](../governance/standards/engineering/contract-testing-guideline.md) |
| Entender expectativas SDLC | [Centro de Gobernanza SDLC](../governance/sdlc/README.es.md) | [Plantillas de Artefactos SDLC](../governance/sdlc/04-artifact-templates/README.es.md) |
| Explorar la referencia aplicada de producto | [Hub de Referencia UMS](../knowledge/demo/README.es.md) | [Portal de Arquitectura UMS](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |
| Separar políticas de evidencia de implementación | [Referencia Canónica vs Modelo Aplicado UMS](../knowledge/demo/demo-vs-reference.es.md) | [Taxonomía del Repositorio](../governance/standards/repository-taxonomy.es.md) |
| Operar o desplegar localmente | [Hub de Operaciones](../operations/README.es.md) | [Hub de Infraestructura](../infrastructure/README.es.md) |
| Explicar el estándar a una nueva audiencia | [Estrategia de Comunicación Arquitectónica](../governance/standards/communication/architecture-communication-strategy.es.md) | [Backlog Visual de Arquitectura](../governance/standards/communication/visuals/README.es.md) |

---

## 2. Lectura Recomendada por Rol

| Rol | Ruta de lectura |
|---|---|
| **Ejecutivo / Sponsor** | [Directivas Arquitectónicas](../governance/standards/vision/architectural-directives.md) -> [Roadmap Evolutivo](../governance/standards/vision/evolutionary-strategy-roadmap.md) -> [Matriz de Madurez](../governance/standards/vision/maturity-matrix.md) |
| **Product Owner / PM** | [Modelo de Referencia UMS](../knowledge/demo/ums-reference-model.es.md) -> [Índice Documental UMS](https://github.com/beyondnetcode/ums/blob/main/docs/MASTER_INDEX.md) -> [Referencia vs Modelo Aplicado](../knowledge/demo/demo-vs-reference.es.md) |
| **Arquitecto de Software** | [Hub de Arquitectura](../architecture/README.es.md) -> [Registro ADR](../architecture/adrs/README.md) -> [Portal de Arquitectura UMS](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |
| **Principal / Staff Engineer** | [Línea Base Agnóstica](../architecture/blueprints/authoritative-tech-stack-agnostic.md) -> [Patrones Tácticos](../architecture/adrs/core/0019-tactical-design-patterns-future-proofing.md) -> [Checklist de Simplicidad](../architecture/blueprints/simplicity-checklist-phase-01.md) |
| **Backend Developer** | [Manifiesto de Ingeniería](../governance/standards/engineering/engineering-manifesto.md) -> [Registro ADR por Runtime](../architecture/adrs/README.md) -> [Modelo de Referencia UMS](../knowledge/demo/ums-reference-model.es.md) |
| **Frontend Developer** | [ADR Resiliencia Frontend](../architecture/adrs/nodejs/0004-frontend-offline-resilience.md) -> [ADR Microfrontends](../architecture/adrs/core/0055-estrategia-arquitectura-microfrontends.md) -> [Repositorio UMS](https://github.com/beyondnetcode/ums) |
| **DevOps / SRE** | [Hub de Infraestructura](../infrastructure/README.es.md) -> [Hub de Operaciones](../operations/README.es.md) -> [Portal de Arquitectura UMS](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |
| **QA / SDET** | [ADR Pirámide de Testing](../architecture/adrs/core/0018-testing-pyramid-quality-gates.md) -> [Guía de Contract Testing](../governance/standards/engineering/contract-testing-guideline.md) -> [ADR Integración y E2E](../architecture/adrs/core/0053-estrategia-pruebas-integracion-e2e.md) |
| **Security Engineer** | [Vendor Risk Assessment](../governance/standards/engineering/vendor-risk-assessment.md) -> [ADR Multi-Tenancy](../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.md) -> [ADR Auditoría Inmutable](../architecture/adrs/core/0016-immutable-business-audit-trail.md) |
| **AI Contributor** | [Estándares AI-Augmented](../governance/standards/ai-augmented/README.es.md) -> [Reglas Harness](../../.harness/rules/global-rules.md) -> [Agentes](../../AGENTS.es.md) |
| **New Joiner** | [Product Quick Start](../governance/standards/onboarding/product-quick-start.md) -> [Taxonomía del Repositorio](../governance/standards/repository-taxonomy.es.md) -> [Portal README](../../README.es.md) |

---

## 3. Arquitectura

| Área | Entrada |
|---|---|
| Hub de Arquitectura | [reference/architecture](../architecture/README.es.md) |
| Blueprints | [reference/architecture/blueprints](../architecture/blueprints/README.md) |
| Registro ADR | [reference/architecture/adrs](../architecture/adrs/README.md) |
| Matriz de Decisiones ADR | [reference/architecture/adrs/adr-matrix](../architecture/adrs/adr-matrix.es.md) |
| ADRs Core | [reference/architecture/adrs/core](../architecture/adrs/core/README.es.md) |
| ADRs Node.js | [reference/architecture/adrs/nodejs](../architecture/adrs/nodejs/README.es.md) |
| ADRs .NET | [reference/architecture/adrs/dotnet](../architecture/adrs/dotnet/README.es.md) |
| ADRs Android | [reference/architecture/adrs/android](../architecture/adrs/android/README.es.md) |
| Patrones Canónicos | [reference/architecture/canonical-patterns](../architecture/canonical-patterns/README.md) |

---

## 4. Gobernanza

| Área | Entrada |
|---|---|
| Estándares | [reference/governance/standards](../governance/standards/README.md) |
| Glosario Arquitectónico | [reference/governance/glossary](../governance/glossary.es.md) |
| Visión | [reference/governance/standards/vision](../governance/standards/vision/README.es.md) |
| Ingeniería | [reference/governance/standards/engineering](../governance/standards/engineering/README.es.md) |
| Onboarding | [reference/governance/standards/onboarding](../governance/standards/onboarding/README.es.md) |
| AI-Augmented Engineering | [reference/governance/standards/ai-augmented](../governance/standards/ai-augmented/README.es.md) |
| SDLC | [reference/governance/sdlc](../governance/sdlc/README.es.md) |
| Mapeo SDLC–Artefactos Evolith | [reference/governance/sdlc/sdlc-evolith-artifact-mapping](../governance/sdlc/sdlc-evolith-artifact-mapping.es.md) |
| Plantillas de Artefactos SDLC | [reference/governance/sdlc/04-artifact-templates](../governance/sdlc/04-artifact-templates/README.es.md) |
| Estándares de Documentación | [reference/governance/sdlc/03-documentation](../governance/sdlc/03-documentation/README.es.md) |
| Estrategia de Comunicación Arquitectónica | [reference/governance/standards/communication](../governance/standards/communication/architecture-communication-strategy.es.md) |
| Backlog Visual de Arquitectura | [reference/governance/standards/communication/visuals](../governance/standards/communication/visuals/README.es.md) |

---

## 5. Referencia Aplicada y Base de Conocimiento

| Área | Entrada |
|---|---|
| Hub de Referencia Aplicada UMS | [reference/knowledge/demo](../knowledge/demo/README.es.md) |
| Visión Técnica de UMS | [reference/knowledge/demo/ums-technical-overview](../knowledge/demo/ums-technical-overview.es.md) |
| Modelo de Referencia UMS | [reference/knowledge/demo/ums-reference-model](../knowledge/demo/ums-reference-model.es.md) |
| Límite Referencia vs Modelo Aplicado | [reference/knowledge/demo/demo-vs-reference](../knowledge/demo/demo-vs-reference.es.md) |
| Registro de Migración | [reference/knowledge/demo/migration-from-todo-to-ums](../knowledge/demo/migration-from-todo-to-ums.es.md) |
| Investigación | [reference/knowledge/research](../knowledge/research/README.md) |
| Proofs of Concept | [reference/knowledge/poc](../knowledge/poc/README.md) |

Fuentes oficiales UMS:

- [Repositorio y Setup UMS](https://github.com/beyondnetcode/ums/blob/main/README.md)
- [Índice Documental UMS](https://github.com/beyondnetcode/ums/blob/main/docs/MASTER_INDEX.md)
- [Portal de Arquitectura UMS](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md)

---

## 6. Operaciones e Infraestructura

| Área | Entrada |
|---|---|
| Operaciones | [reference/operations](../operations/README.es.md) |
| OpenTelemetry | [reference/operations/otel](../operations/otel/README.md) |
| Grafana | [reference/operations/grafana](../operations/grafana/README.md) |
| Tempo | [reference/operations/tempo](../operations/tempo/README.md) |
| Infraestructura | [reference/infrastructure](../infrastructure/README.es.md) |

---

## 7. Referencia Ejecutable Oficial

| Componente | Fuente oficial |
|---|---|
| Código y setup del producto UMS | [beyondnetcode/ums](https://github.com/beyondnetcode/ums) |
| Arquitectura y trazabilidad UMS | [Portal de Arquitectura](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |

Este repositorio intencionalmente no mantiene código de aplicación de producto. UMS es propietario de la demostración ejecutable de la arquitectura.

---

## 8. Línea Base de Cumplimiento Evolith

Todo artefacto e implementación instanciada desde Evolith debe respetar estos pilares:

1. [Baseline Agnóstico](../architecture/blueprints/authoritative-tech-stack-agnostic.md)
2. [Arquitectura de Referencia](../architecture/blueprints/reference-blueprint.md)
3. [Manifiesto de Ingeniería](../governance/standards/engineering/engineering-manifesto.md)
4. [Definition of Done](../governance/sdlc/02-engineering/construction-focused-sdlc-framework.es.md)
5. [Taxonomía del Repositorio](../governance/standards/repository-taxonomy.es.md)

---

<div align="center">
 <a href="../../README.es.md">Volver al Portal Principal de Evolith</a>
</div>
