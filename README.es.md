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

---

## Comienza Aqui

- [Resumen Ejecutivo](./reference/governance/standards/communication/visuals/v01-executive-one-pager.es.md) - explicacion de cinco minutos sobre Evolith, UMS y la propuesta de valor.
- [Primeros Pasos por Rol](./reference/getting-started/README.es.md) - rutas de lectura recomendadas para ejecutivos, arquitectos, ingenieros, QA, SRE, producto y contribuidores IA.
- [Vision del Producto](./reference/governance/standards/vision/evolith-product-vision-master.es.md) - direccion estrategica, hoja de ruta y modelo de madurez.
- [Centro de Gobernanza SDLC](./reference/governance/sdlc/README.es.md) - fases, gates, artefactos y modelo de trazabilidad autoritativos.
- [Indice Maestro Global](./reference/navigation/MASTER_INDEX.es.md) - navegacion completa del repositorio cuando ya sabes que artefacto necesitas.

## Navegacion SDLC

Usa este arbol cuando quieras recorrer Evolith de la misma forma en que un producto avanza desde la idea hasta produccion. Cada fase agrupa los documentos, estandares y reglas machine-readable que soportan su gate.

<details open>
<summary><strong>Fase 01 - Concepcion y Descubrimiento</strong></summary>

- Documentos y plantillas
  - [Discovery Canvas](./reference/governance/sdlc/04-artifact-templates/discovery-canvas-template.es.md)
  - [Business Case ROI](./reference/governance/sdlc/04-artifact-templates/business-case-roi-template.es.md)
  - [Ballpark Estimation](./reference/governance/sdlc/04-artifact-templates/ballpark-estimation-template.es.md)
  - [PRD - Documento de Requerimientos de Producto](./reference/governance/sdlc/04-artifact-templates/prd-template.es.md)
  - [Evolith User Story](./reference/governance/sdlc/04-artifact-templates/evolith-user-story-template.es.md)
  - [Agile Backlog](./reference/governance/sdlc/04-artifact-templates/agile-backlog-template.es.md)
  - [CLI Impact Analysis](./reference/governance/sdlc/04-artifact-templates/cli-impact-analysis.es.md)
- Estandares y guia
  - [Directivas Arquitectonicas](./reference/governance/standards/vision/architectural-directives.es.md)
  - [Taxonomia del Repositorio](./reference/governance/standards/repository-taxonomy.es.md)
  - [Baseline Agnostica](./reference/architecture/blueprints/authoritative-tech-stack-agnostic.es.md)
  - [Manifiesto de Ingenieria](./reference/governance/standards/engineering/engineering-manifesto.es.md)
  - [Mapeo de Artefactos SDLC](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.es.md)
- Reglas y schemas
  - [Discovery Canvas Schema](./rulesets/schema/discovery-canvas.schema.json)
  - [Business Case ROI Schema](./rulesets/schema/business-case-roi.schema.json)
  - [Ballpark Estimation Schema](./rulesets/schema/ballpark-estimation.schema.json)
  - [PRD Schema](./rulesets/schema/prd.schema.json)
  - [Evolith User Story Schema](./rulesets/schema/evolith-user-story.schema.json)
  - [Agile Backlog Schema](./rulesets/schema/agile-backlog.schema.json)
  - [CLI Impact Analysis Schema](./rulesets/schema/cli-impact-analysis.schema.json)
  - [Phase Gates Rules](./rulesets/sdlc/phase-gates.rules.json)

</details>

<details>
<summary><strong>Fase 02 - Diseno y Arquitectura</strong></summary>

- Documentos y plantillas
  - [Plantilla ADR](./reference/governance/sdlc/04-artifact-templates/adr-template.es.md)
  - [Plantilla de Historia Funcional](./reference/governance/sdlc/04-artifact-templates/functional-story-template.es.md)
  - [Plantilla de Modelo DDD](./reference/governance/sdlc/04-artifact-templates/ddd-model-template.es.md)
- Estandares y guia
  - [Hub de Arquitectura](./reference/architecture/README.es.md)
  - [Blueprint de Referencia](./reference/architecture/blueprints/reference-blueprint.es.md)
  - [Tech Stack Autoritativo](./reference/architecture/blueprints/authoritative-tech-stack.es.md)
  - [Registro ADR](./reference/architecture/adrs/README.es.md)
  - [Matriz de Decision ADR](./reference/architecture/adrs/adr-matrix.es.md)
  - [Estandar de Escritura de Historias Funcionales](./reference/governance/sdlc/03-documentation/functional-story-writing-standard.es.md)
  - [Buenas Practicas de Documentacion SDLC](./reference/governance/sdlc/03-documentation/sdlc-documentation-best-practices.es.md)
  - [Checklist de Simplicidad Fase 1](./reference/architecture/blueprints/simplicity-checklist-phase-01.es.md)
  - [Mapeo de Artefactos SDLC](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.es.md)
- Reglas y schemas
  - [ADR Schema](./rulesets/schema/adr.schema.json)
  - [Functional Story Schema](./rulesets/schema/functional-story.schema.json)
  - [Reglas de Arquitectura](./rulesets/architecture/README.md)
  - [Reglas ADR](./rulesets/adr/README.md)

</details>

<details>
<summary><strong>Fase 03 - Construccion</strong></summary>

- Documentos y plantillas
  - [Plantilla de Historia Tecnica](./reference/governance/sdlc/04-artifact-templates/technical-story-template.es.md)
  - [Hub de Plantillas de Artefactos](./reference/governance/sdlc/04-artifact-templates/README.es.md)
- Estandares y guia
  - [Framework SDLC Enfocado en Construccion](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.es.md)
  - [Definition of Done](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.es.md)
  - [Quality Gates SDLC](./reference/governance/sdlc/quality-gates.es.md)
  - [Patrones Canonicos](./reference/architecture/canonical-patterns/README.es.md)
  - [Guia de Contract Testing](./reference/governance/standards/engineering/contract-testing-guideline.es.md)
  - [Evaluacion de Riesgo de Proveedores](./reference/governance/standards/engineering/vendor-risk-assessment.es.md)
  - [Estandares de Ingenieria Augmentada por IA](./reference/governance/standards/ai-augmented/README.es.md)
  - [Mapeo de Artefactos SDLC](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.es.md)
- Reglas y schemas
  - [Technical Story Schema](./rulesets/schema/technical-story.schema.json)
  - [Definition of Done Rules](./rulesets/cross-cutting/definition-of-done.rules.json)
  - [Engineering Manifesto Rules](./rulesets/cross-cutting/engineering-manifesto.rules.json)
  - [Quality Thresholds Rules](./rulesets/sdlc/quality-thresholds.rules.json)
  - [Dependency Pinning Rules](./rulesets/sdlc/dependency-pinning.rules.json)

</details>

<details>
<summary><strong>Fase 04 - Validacion y QA</strong></summary>

- Documentos y plantillas
  - [Plantilla de Test Summary Report](./reference/governance/sdlc/04-artifact-templates/test-summary-report-template.es.md)
- Estandares y guia
  - [Quality Gates SDLC](./reference/governance/sdlc/quality-gates.es.md)
  - [Modelo de Trazabilidad SDLC](./reference/governance/sdlc/traceability-model.es.md)
  - [ADR de Testing Pyramid](./reference/architecture/adrs/core/0018-testing-pyramid-quality-gates.es.md)
  - [ADR de Aislamiento de Unit Testing](./reference/architecture/adrs/core/0052-unit-testing-isolation-strategy.es.md)
  - [ADR de Integration y E2E Testing](./reference/architecture/adrs/core/0053-integration-e2e-testing-strategy.es.md)
  - [Mapeo de Artefactos SDLC](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.es.md)
- Reglas y schemas
  - [Test Summary Report Schema](./rulesets/schema/test-summary-report.schema.json)
  - [Quality Thresholds Rules](./rulesets/sdlc/quality-thresholds.rules.json)
  - [Testing Pyramid Rules](./rulesets/adr/adr-0018-testing-pyramid.rules.json)

</details>

<details>
<summary><strong>Fase 05 - Entrega y Operaciones</strong></summary>

- Documentos y plantillas
  - [Plantilla de Release Notes](./reference/governance/sdlc/04-artifact-templates/release-notes-template.es.md)
- Estandares y guia
  - [Hub de Operaciones](./reference/operations/README.es.md)
  - [Hub de Infraestructura](./reference/infrastructure/README.es.md)
  - [Playbook de Observabilidad](./reference/governance/standards/engineering/observability-playbook.es.md)
  - [Flujo de Arquitectura de Observabilidad](./reference/architecture/blueprints/observability-architecture-flow.es.md)
  - [Escenarios de Despliegue Multi-Cloud](./reference/architecture/blueprints/multi-cloud-deployment-scenarios.es.md)
  - [Mapeo de Artefactos SDLC](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.es.md)
- Reglas y schemas
  - [Release Notes Schema](./rulesets/schema/release-notes.schema.json)
  - [CI/CD Quality Gates Rules](./rulesets/adr/adr-0005-cicd-quality-gates.rules.json)
  - [GitFlow Branching Rules](./rulesets/adr/adr-0050-gitflow-branching.rules.json)

</details>

## Referencias Transversales

- Baseline de arquitectura
  - [Hub de Arquitectura](./reference/architecture/README.es.md)
  - [Blueprints](./reference/architecture/blueprints/README.es.md)
  - [Baseline Agnostica](./reference/architecture/blueprints/authoritative-tech-stack-agnostic.es.md)
  - [Blueprint de Referencia](./reference/architecture/blueprints/reference-blueprint.es.md)
  - [Spec de Topologia C4](./reference/architecture/blueprints/c4-topology-spec.es.md)
- Decisiones de arquitectura
  - [Registro ADR](./reference/architecture/adrs/README.es.md)
  - [ADRs Core](./reference/architecture/adrs/core/README.es.md)
  - [ADRs Node.js](./reference/architecture/adrs/nodejs/README.es.md)
  - [ADRs .NET](./reference/architecture/adrs/dotnet/README.es.md)
  - [ADRs Android](./reference/architecture/adrs/android/README.es.md)
- Gobernanza y navegacion
  - [Estandares de Gobernanza](./reference/governance/standards/README.es.md)
  - [Indice Bilingue](./reference/navigation/BILINGUAL_INDEX.md)
  - [Hub de Navegacion](./reference/navigation/README.es.md)
  - [Hub de Rulesets](./rulesets/README.es.md)
- Referencia aplicada
  - [Hub de Referencia UMS](./reference/knowledge/demo/README.es.md)
  - [Modelo de Referencia UMS](./reference/knowledge/demo/ums-reference-model.es.md)
  - [Referencia Canonica vs Modelo Aplicado UMS](./reference/knowledge/demo/demo-vs-reference.es.md)
  - [Portal de Arquitectura UMS](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md)
  - [Casos de Adopcion](./reference/knowledge/adoption-cases.es.md)

## Herramientas y Automatizacion

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

- [Documentacion CLI](./sdk/cli/README.es.md)
- [Arquitectura CLI](./sdk/cli/ARCHITECTURE.es.md)
- [Vision del Producto CLI](./sdk/cli/docs/VISION.es.md)
- [Analisis de Estado](./sdk/cli/docs/planning/sdk-cli-mcp-current-state-assessment.md)

### Pre-commit Hooks

- [validate-docs.mjs](./.harness/scripts/validate-docs.mjs) - validacion de links, anchors, encoding y Mermaid.
- [check-bilingual-parity.mjs](./.harness/scripts/check-bilingual-parity.mjs) - validacion de paridad estructural EN/ES.
- [impact-analysis-synchronizer.mjs](./.harness/scripts/impact-analysis-synchronizer.mjs) - sincronizacion de impacto cross-repo.

---

## Evolith vs UMS

- Evolith posee estandares reutilizables, principios, ADRs, gobernanza, patrones canonicos y reglas machine-readable.
- UMS posee evidencia de implementacion especifica del producto, prueba ejecutable, rutas, schemas, seeds, branding y decisiones de runtime que aun no han sido promovidas.
- Un producto contribuye de vuelta a Evolith proponiendo un ADR, estandar, regla o patron respaldado por evidencia de implementacion.
- La politica enterprise pertenece a Evolith solo despues de revision de gobernanza; las decisiones locales permanecen en el repositorio del producto.

UMS es la referencia ejecutable oficial. Ver [Casos de Adopción](./reference/knowledge/adoption-cases.es.md) para ejemplos reales.

---

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
