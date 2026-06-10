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
| **Ejecutivo / Sponsor** | [Directivas Arquitectónicas](../governance/standards/vision/architectural-directives.md) -> [Roadmap Evolutivo](../governance/standards/vision/evolutionary-strategy-roadmap.md) -> [Evaluación de Madurez](../governance/standards/vision/maturity-assessment.es.md) |
| **Product Owner / PM** | [Modelo de Referencia UMS](../knowledge/demo/ums-reference-model.es.md) -> [Índice Documental UMS](https://github.com/beyondnetcode/ums/blob/main/docs/MASTER_INDEX.md) -> [Referencia vs Modelo Aplicado](../knowledge/demo/demo-vs-reference.es.md) |
| **Arquitecto de Software** | [Hub de Arquitectura](../architecture/README.es.md) -> [Registro ADR](../architecture/adrs/README.md) -> [Portal de Arquitectura UMS](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |
| **Principal / Staff Engineer** | [Línea Base Agnóstica](../architecture/blueprints/authoritative-tech-stack-agnostic.md) -> [Patrones Tácticos](../architecture/adrs/core/0019-tactical-design-patterns-future-proofing.md) -> [Checklist de Simplicidad](../architecture/blueprints/simplicity-checklist-phase-01.md) |
| **Backend Developer** | [Manifiesto de Ingeniería](../governance/standards/engineering/engineering-manifesto.md) -> [Registro ADR por Runtime](../architecture/adrs/README.md) -> [Modelo de Referencia UMS](../knowledge/demo/ums-reference-model.es.md) |
| **Frontend Developer** | [ADR Resiliencia Frontend](../architecture/adrs/nodejs/0004-frontend-offline-resilience.md) -> [ADR Microfrontends](../architecture/adrs/core/0055-microfrontends-architecture-strategy.es.md) -> [Repositorio UMS](https://github.com/beyondnetcode/ums) |
| **DevOps / SRE** | [Hub de Infraestructura](../infrastructure/README.es.md) -> [Hub de Operaciones](../operations/README.es.md) -> [Portal de Arquitectura UMS](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |
| **QA / SDET** | [ADR Pirámide de Testing](../architecture/adrs/core/0018-testing-pyramid-quality-gates.md) -> [Guía de Contract Testing](../governance/standards/engineering/contract-testing-guideline.md) -> [ADR Integración y E2E](../architecture/adrs/core/0053-integration-e2e-testing-strategy.es.md) |
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
| Estándar de Autoría de ADRs | [reference/architecture/adrs/adr-authoring-standard](../architecture/adrs/adr-authoring-standard.es.md) |
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
| Tablero de Seguimiento de Gaps | [reference/governance/standards/vision/gap-tracking](../governance/standards/vision/gap-tracking.es.md) |
| Evaluación de Madurez | [reference/governance/standards/vision/maturity-assessment](../governance/standards/vision/maturity-assessment.es.md) |
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

## 9. Rulesets (Gobernanza Machine-Readable)

Los Rulesets son la capa de ejecución machine-readable del framework de gobernanza Evolith. Los repositorios satélite heredan reglas vía `evolith.yaml`.

| Área | Entrada |
|---|---|
| Hub de Rulesets | [rulesets](../../rulesets/README.es.md) |
| Schemas | [rulesets/schema](../../rulesets/schema/README.md) |
| Reglas de Arquitectura | [rulesets/architecture](../../rulesets/architecture/README.md) |
| Reglas SDLC | [rulesets/sdlc](../../rulesets/sdlc/README.md) |
| Reglas de Gobernanza | [rulesets/governance](../../rulesets/governance/README.md) |

Archivos de reglas machine-readable:

- [Schema ADR](../../rulesets/schema/adr.schema.json)
- [Schema PRD](../../rulesets/schema/prd.schema.json)
- [Schema Functional Story](../../rulesets/schema/functional-story.schema.json)
- [Schema Technical Story](../../rulesets/schema/technical-story.schema.json)
- [Schema Test Summary Report](../../rulesets/schema/test-summary-report.schema.json)
- [Schema Release Notes](../../rulesets/schema/release-notes.schema.json)
- [Schema Evolith.yaml](../../rulesets/schema/evolith-yaml.schema.json)
- [Reglas F1 Modular Monolith](../../rulesets/architecture/f1-modular-monolith.rules.json)
- [Reglas F2 Módulos Distribuidos](../../rulesets/architecture/f2-distributed-modules.rules.json)
- [Reglas F3 Microservicios](../../rulesets/architecture/f3-microservices.rules.json)
- [Reglas Phase Gates](../../rulesets/sdlc/phase-gates.rules.json)
- [Reglas Quality Thresholds](../../rulesets/sdlc/quality-thresholds.rules.json)
- [Reglas de Herencia](../../rulesets/governance/inheritance.rules.json)
- [Reglas de Contratos Satélite](../../rulesets/governance/satellite-contracts.rules.json)

---

<div align="center">
  <a href="../../README.es.md">Volver al Portal Principal de Evolith</a>
</div>
