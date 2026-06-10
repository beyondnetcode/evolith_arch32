# Evolith: Base de Referencia de Arquitectura Progresiva

> **Navegación bilingüe:** [English](./README.md)

Evolith define estándares de arquitectura, gobernanza, ADRs, patrones y guías operativas que los productos satélite heredan y especializan.

## Comienza Aquí

- [Resumen Ejecutivo](./reference/governance/standards/communication/visuals/v01-executive-one-pager.es.md)
- [Primeros Pasos por Rol](./reference/getting-started/README.es.md)
- [Visión del Producto](./reference/governance/standards/vision/evolith-product-vision-master.es.md)
- [Centro de Gobernanza SDLC](./reference/governance/sdlc/README.es.md)
- [Índice Maestro Global](./reference/navigation/MASTER_INDEX.es.md)

## Navegación SDLC

Las seis tablas usan exclusivamente estos tipos y este orden: **Formato, Regla, Estándar, Guía, Decisión, Registro, Matriz, Manifiesto, Referencia, Índice, Lista de Verificación**.

### Fase 01 - Concepción y Descubrimiento

| Tipo | Documento |
|---|---|
| Formato | [Agile Backlog](./reference/governance/sdlc/04-artifact-templates/agile-backlog-template.es.md) |
| Formato | [Ballpark Estimation](./reference/governance/sdlc/04-artifact-templates/ballpark-estimation-template.es.md) |
| Formato | [Business Case ROI](./reference/governance/sdlc/04-artifact-templates/business-case-roi-template.es.md) |
| Formato | [CLI Impact Analysis](./reference/governance/sdlc/04-artifact-templates/cli-impact-analysis.es.md) |
| Formato | [Discovery Canvas](./reference/governance/sdlc/04-artifact-templates/discovery-canvas-template.es.md) |
| Formato | [Evolith User Story](./reference/governance/sdlc/04-artifact-templates/evolith-user-story-template.es.md) |
| Formato | [PRD](./reference/governance/sdlc/04-artifact-templates/prd-template.es.md) |
| Regla | [Agile Backlog Schema](./rulesets/schema/agile-backlog.schema.json) |
| Regla | [Ballpark Estimation Schema](./rulesets/schema/ballpark-estimation.schema.json) |
| Regla | [Business Case ROI Schema](./rulesets/schema/business-case-roi.schema.json) |
| Regla | [CLI Impact Analysis Schema](./rulesets/schema/cli-impact-analysis.schema.json) |
| Regla | [Discovery Canvas Schema](./rulesets/schema/discovery-canvas.schema.json) |
| Regla | [Evolith User Story Schema](./rulesets/schema/evolith-user-story.schema.json) |
| Regla | [Phase Gates Rules](./rulesets/sdlc/phase-gates.rules.json) |
| Regla | [PRD Schema](./rulesets/schema/prd.schema.json) |
| Estándar | [Directivas Arquitectónicas](./reference/governance/standards/vision/architectural-directives.es.md) |
| Estándar | [Taxonomía del Repositorio](./reference/governance/standards/repository-taxonomy.es.md) |
| Matriz | [Mapeo de Artefactos SDLC](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.es.md) |
| Manifiesto | [Manifiesto de Ingeniería](./reference/governance/standards/engineering/engineering-manifesto.es.md) |
| Referencia | [Baseline Agnóstica](./reference/architecture/blueprints/authoritative-tech-stack-agnostic.es.md) |

### Fase 02 - Diseño y Arquitectura

| Tipo | Documento |
|---|---|
| Formato | [Plantilla ADR](./reference/governance/sdlc/04-artifact-templates/adr-template.es.md) |
| Formato | [Plantilla de Historia Funcional](./reference/governance/sdlc/04-artifact-templates/functional-story-template.es.md) |
| Formato | [Plantilla de Modelo DDD](./reference/governance/sdlc/04-artifact-templates/ddd-model-template.es.md) |
| Regla | [ADR Schema](./rulesets/schema/adr.schema.json) |
| Regla | [Functional Story Schema](./rulesets/schema/functional-story.schema.json) |
| Regla | [Reglas ADR](./rulesets/adr/README.md) |
| Regla | [Reglas de Arquitectura](./rulesets/architecture/README.md) |
| Estándar | [Estándar de Historias Funcionales](./reference/governance/sdlc/03-documentation/functional-story-writing-standard.es.md) |
| Estándar | [Tech Stack Autoritativo](./reference/architecture/blueprints/authoritative-tech-stack.es.md) |
| Guía | [Buenas Prácticas de Documentación SDLC](./reference/governance/sdlc/03-documentation/sdlc-documentation-best-practices.es.md) |
| Registro | [Registro ADR](./reference/architecture/adrs/README.es.md) |
| Matriz | [Mapeo de Artefactos SDLC](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.es.md) |
| Matriz | [Matriz de Decisión ADR](./reference/architecture/adrs/adr-matrix.es.md) |
| Referencia | [Blueprint de Referencia](./reference/architecture/blueprints/reference-blueprint.es.md) |
| Índice | [Hub de Arquitectura](./reference/architecture/README.es.md) |
| Lista de Verificación | [Checklist de Simplicidad Fase 1](./reference/architecture/blueprints/simplicity-checklist-phase-01.es.md) |

### Fase 03 - Construcción

| Tipo | Documento |
|---|---|
| Formato | [Plantilla de Historia Técnica](./reference/governance/sdlc/04-artifact-templates/technical-story-template.es.md) |
| Regla | [Definition of Done Rules](./rulesets/cross-cutting/definition-of-done.rules.json) |
| Regla | [Dependency Pinning Rules](./rulesets/sdlc/dependency-pinning.rules.json) |
| Regla | [Engineering Manifesto Rules](./rulesets/cross-cutting/engineering-manifesto.rules.json) |
| Regla | [Quality Thresholds Rules](./rulesets/sdlc/quality-thresholds.rules.json) |
| Regla | [Technical Story Schema](./rulesets/schema/technical-story.schema.json) |
| Estándar | [Definition of Done](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.es.md) |
| Estándar | [Estándares de Ingeniería Aumentada por IA](./reference/governance/standards/ai-augmented/README.es.md) |
| Estándar | [Quality Gates SDLC](./reference/governance/sdlc/quality-gates.es.md) |
| Guía | [Evaluación de Riesgo de Proveedores](./reference/governance/standards/engineering/vendor-risk-assessment.es.md) |
| Guía | [Framework SDLC Enfocado en Construcción](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.es.md) |
| Guía | [Guía de Contract Testing](./reference/governance/standards/engineering/contract-testing-guideline.es.md) |
| Matriz | [Mapeo de Artefactos SDLC](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.es.md) |
| Referencia | [Patrones Canónicos](./reference/architecture/canonical-patterns/README.es.md) |
| Índice | [Hub de Plantillas de Artefactos](./reference/governance/sdlc/04-artifact-templates/README.es.md) |

### Fase 04 - Validación y QA

| Tipo | Documento |
|---|---|
| Formato | [Plantilla de Test Summary Report](./reference/governance/sdlc/04-artifact-templates/test-summary-report-template.es.md) |
| Regla | [Quality Thresholds Rules](./rulesets/sdlc/quality-thresholds.rules.json) |
| Regla | [Test Summary Report Schema](./rulesets/schema/test-summary-report.schema.json) |
| Regla | [Testing Pyramid Rules](./rulesets/adr/adr-0018-testing-pyramid.rules.json) |
| Estándar | [Quality Gates SDLC](./reference/governance/sdlc/quality-gates.es.md) |
| Decisión | [ADR de Aislamiento de Unit Testing](./reference/architecture/adrs/core/0052-unit-testing-isolation-strategy.es.md) |
| Decisión | [ADR de Integration y E2E Testing](./reference/architecture/adrs/core/0053-integration-e2e-testing-strategy.es.md) |
| Decisión | [ADR de Testing Pyramid](./reference/architecture/adrs/core/0018-testing-pyramid-quality-gates.es.md) |
| Matriz | [Mapeo de Artefactos SDLC](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.es.md) |
| Referencia | [Modelo de Trazabilidad SDLC](./reference/governance/sdlc/traceability-model.es.md) |

### Fase 05 - Entrega y Operaciones

| Tipo | Documento |
|---|---|
| Formato | [Plantilla de Release Notes](./reference/governance/sdlc/04-artifact-templates/release-notes-template.es.md) |
| Regla | [CI/CD Quality Gates Rules](./rulesets/adr/adr-0005-cicd-quality-gates.rules.json) |
| Regla | [GitFlow Branching Rules](./rulesets/adr/adr-0050-gitflow-branching.rules.json) |
| Regla | [Release Notes Schema](./rulesets/schema/release-notes.schema.json) |
| Guía | [Playbook de Observabilidad](./reference/governance/standards/engineering/observability-playbook.es.md) |
| Matriz | [Mapeo de Artefactos SDLC](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.es.md) |
| Referencia | [Escenarios de Despliegue Multi-Cloud](./reference/architecture/blueprints/multi-cloud-deployment-scenarios.es.md) |
| Referencia | [Flujo de Arquitectura de Observabilidad](./reference/architecture/blueprints/observability-architecture-flow.es.md) |
| Índice | [Hub de Infraestructura](./reference/infrastructure/README.es.md) |
| Índice | [Hub de Operaciones](./reference/operations/README.es.md) |

## Referencias Transversales

| Tipo | Documento |
|---|---|
| Estándar | [Especificación de Topología C4](./reference/architecture/blueprints/c4-topology-spec.es.md) |
| Estándar | [Estándares de Gobernanza](./reference/governance/standards/README.es.md) |
| Registro | [Evaluación de Madurez](./reference/governance/standards/vision/maturity-assessment.es.md) |
| Registro | [Registro ADR](./reference/architecture/adrs/README.es.md) |
| Registro | [Tablero de Seguimiento de Gaps](./reference/governance/standards/vision/gap-tracking.es.md) |
| Referencia | [Baseline Agnóstica](./reference/architecture/blueprints/authoritative-tech-stack-agnostic.es.md) |
| Referencia | [Casos de Adopción](./reference/knowledge/adoption-cases.es.md) |
| Referencia | [Modelo de Referencia UMS](./reference/knowledge/demo/ums-reference-model.es.md) |
| Referencia | [Referencia Canónica vs Modelo Aplicado UMS](./reference/knowledge/demo/demo-vs-reference.es.md) |
| Referencia | [Blueprint de Referencia](./reference/architecture/blueprints/reference-blueprint.es.md) |
| Índice | [ADRs .NET](./reference/architecture/adrs/dotnet/README.es.md) |
| Índice | [ADRs Android](./reference/architecture/adrs/android/README.es.md) |
| Índice | [ADRs Core](./reference/architecture/adrs/core/README.es.md) |
| Índice | [ADRs Node.js](./reference/architecture/adrs/nodejs/README.es.md) |
| Índice | [Blueprints](./reference/architecture/blueprints/README.es.md) |
| Índice | [Hub de Arquitectura](./reference/architecture/README.es.md) |
| Índice | [Hub de Navegación](./reference/navigation/README.es.md) |
| Índice | [Hub de Referencia UMS](./reference/knowledge/demo/README.es.md) |
| Índice | [Hub de Rulesets](./rulesets/README.es.md) |
| Índice | [Índice Bilingüe](./reference/navigation/BILINGUAL_INDEX.es.md) |
| Índice | [Portal de Arquitectura UMS](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |

## Herramientas y Automatización

- [Documentación CLI](./sdk/cli/README.es.md)
- [Arquitectura CLI](./sdk/cli/ARCHITECTURE.es.md)
- [Visión del Producto CLI](./sdk/cli/docs/VISION.es.md)
- [Análisis de Estado](./sdk/cli/docs/planning/sdk-cli-mcp-current-state-assessment.md)
- [Validador documental](./.harness/scripts/validate-docs.mjs)
- [Validador de paridad bilingüe](./.harness/scripts/check-bilingual-parity.mjs)

## Contribución

- [AGENTS.md](./AGENTS.md)
- [Taxonomía del Repositorio](./reference/governance/standards/repository-taxonomy.es.md)
- [Guía de Herencia](./reference/governance/standards/onboarding/child-repository-inheritance-guide.es.md)

## Licencia

Publicado bajo la [Licencia MIT](./LICENSE).
