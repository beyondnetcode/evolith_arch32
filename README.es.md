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

## Comienza Aqui

<details>
<summary><strong>Puntos de entrada principales</strong></summary>

- [Resumen Ejecutivo](./reference/governance/standards/communication/visuals/v01-executive-one-pager.es.md) - explicacion de cinco minutos sobre Evolith, UMS y la propuesta de valor.
- [Primeros Pasos por Rol](./reference/getting-started/README.es.md) - rutas de lectura recomendadas para ejecutivos, arquitectos, ingenieros, QA, SRE, producto y contribuidores IA.
- [Vision del Producto](./reference/governance/standards/vision/evolith-product-vision-master.es.md) - direccion estrategica, hoja de ruta y modelo de madurez.
- [Centro de Gobernanza SDLC](./reference/governance/sdlc/README.es.md) - fases, gates, artefactos y modelo de trazabilidad autoritativos.
- [Indice Maestro Global](./reference/navigation/MASTER_INDEX.es.md) - navegacion completa del repositorio cuando ya sabes que artefacto necesitas.

</details>

## Navegacion SDLC

Abre la fase en la que estas trabajando. Cada seccion agrupa los documentos, estandares y reglas machine-readable que soportan su gate.

<details>
<summary><strong>Fase 01 - Concepcion y Descubrimiento</strong></summary>

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) |
|---|---|---|---|
| [Discovery Canvas](./reference/governance/sdlc/04-artifact-templates/discovery-canvas-template.es.md) | Lienzo de descubrimiento | Definir visión y viabilidad | Documentos y plantillas |
| [Business Case ROI](./reference/governance/sdlc/04-artifact-templates/business-case-roi-template.es.md) | Análisis de ROI | Justificar valor de negocio | Documentos y plantillas |
| [Ballpark Estimation](./reference/governance/sdlc/04-artifact-templates/ballpark-estimation-template.es.md) | Estimación a gran escala | Proyectar costos y tiempos | Documentos y plantillas |
| [PRD - Documento de Requerimientos de Producto](./reference/governance/sdlc/04-artifact-templates/prd-template.es.md) | Documento de requerimientos | Especificar necesidades funcionales | Documentos y plantillas |
| [Evolith User Story](./reference/governance/sdlc/04-artifact-templates/evolith-user-story-template.es.md) | Plantilla de historia de usuario | Estandarizar historias ágiles | Documentos y plantillas |
| [Agile Backlog](./reference/governance/sdlc/04-artifact-templates/agile-backlog-template.es.md) | Plantilla de backlog | Organizar entregables | Documentos y plantillas |
| [CLI Impact Analysis](./reference/governance/sdlc/04-artifact-templates/cli-impact-analysis.es.md) | Análisis de impacto CLI | Evaluar cambios cross-repo | Documentos y plantillas |
| [Directivas Arquitectonicas](./reference/governance/standards/vision/architectural-directives.es.md) | Directivas de arquitectura | Alinear diseño corporativo | Estandares y guia |
| [Taxonomia del Repositorio](./reference/governance/standards/repository-taxonomy.es.md) | Taxonomía de repositorios | Clasificar repositorios | Estandares y guia |
| [Baseline Agnostica](./reference/architecture/blueprints/authoritative-tech-stack-agnostic.es.md) | Stack agnóstico | Definir tecnologías base | Estandares y guia |
| [Manifiesto de Ingenieria](./reference/governance/standards/engineering/engineering-manifesto.es.md) | Manifiesto de ingeniería | Establecer principios técnicos | Estandares y guia |
| [Mapeo de Artefactos SDLC](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.es.md) | Mapeo de artefactos | Vincular fases y entregables | Estandares y guia |
| [Discovery Canvas Schema](./rulesets/schema/discovery-canvas.schema.json) | Esquema de validación del discovery canvas | Validar estructura del artefacto | Reglas y schemas |
| [Business Case ROI Schema](./rulesets/schema/business-case-roi.schema.json) | Esquema de validación del business case | Validar estructura del artefacto | Reglas y schemas |
| [Ballpark Estimation Schema](./rulesets/schema/ballpark-estimation.schema.json) | Esquema de validación de estimación | Validar estructura del artefacto | Reglas y schemas |
| [PRD Schema](./rulesets/schema/prd.schema.json) | Esquema de validación del PRD | Validar estructura del artefacto | Reglas y schemas |
| [Evolith User Story Schema](./rulesets/schema/evolith-user-story.schema.json) | Esquema de validación de user story | Validar estructura del artefacto | Reglas y schemas |
| [Agile Backlog Schema](./rulesets/schema/agile-backlog.schema.json) | Esquema de validación del backlog | Validar estructura del artefacto | Reglas y schemas |
| [CLI Impact Analysis Schema](./rulesets/schema/cli-impact-analysis.schema.json) | Esquema de validación del análisis de impacto | Validar estructura del artefacto | Reglas y schemas |
| [Phase Gates Rules](./rulesets/sdlc/phase-gates.rules.json) | Reglas automatizadas de gates | Validar cumplimiento en CI | Reglas y schemas |

</details>

<details>
<summary><strong>Fase 02 - Diseno y Arquitectura</strong></summary>

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) |
|---|---|---|---|
| [Plantilla ADR](./reference/governance/sdlc/04-artifact-templates/adr-template.es.md) | Plantilla de ADR | Documentar decisiones clave | Documentos y plantillas |
| [Plantilla de Historia Funcional](./reference/governance/sdlc/04-artifact-templates/functional-story-template.es.md) | Plantilla de historia funcional | Detallar comportamiento | Documentos y plantillas |
| [Plantilla de Modelo DDD](./reference/governance/sdlc/04-artifact-templates/ddd-model-template.es.md) | Plantilla de modelo DDD | Modelar dominios del sistema | Documentos y plantillas |
| [Hub de Arquitectura](./reference/architecture/README.es.md) | Hub de arquitectura | Centralizar recursos de diseño | Estandares y guia |
| [Blueprint de Referencia](./reference/architecture/blueprints/reference-blueprint.es.md) | Blueprint de referencia | Guiar implementación estándar | Estandares y guia |
| [Tech Stack Autoritativo](./reference/architecture/blueprints/authoritative-tech-stack.es.md) | Stack autoritativo | Normar uso de tecnologías | Estandares y guia |
| [Registro ADR](./reference/architecture/adrs/README.es.md) | Registro de ADRs | Mantener histórico de decisiones | Estandares y guia |
| [Matriz de Decision ADR](./reference/architecture/adrs/adr-matrix.es.md) | Matriz de decisiones ADR | Visualizar impacto de decisiones | Estandares y guia |
| [Estandar de Escritura de Historias Funcionales](./reference/governance/sdlc/03-documentation/functional-story-writing-standard.es.md) | Estándar de historias funcionales | Asegurar calidad de specs | Estandares y guia |
| [Buenas Practicas de Documentacion SDLC](./reference/governance/sdlc/03-documentation/sdlc-documentation-best-practices.es.md) | Prácticas de documentación | Mejorar calidad documental | Estandares y guia |
| [Checklist de Simplicidad Fase 1](./reference/architecture/blueprints/simplicity-checklist-phase-01.es.md) | Checklist de simplicidad | Prevenir sobre-ingeniería | Estandares y guia |
| [Mapeo de Artefactos SDLC](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.es.md) | Mapeo de artefactos | Vincular fases y entregables | Estandares y guia |
| [ADR Schema](./rulesets/schema/adr.schema.json) | Esquema de validación JSON | Validar estructura de datos | Reglas y schemas |
| [Functional Story Schema](./rulesets/schema/functional-story.schema.json) | Esquema de validación JSON | Validar estructura de datos | Reglas y schemas |
| [Reglas de Arquitectura](./rulesets/architecture/README.md) | Reglas de arquitectura | Validar diseño | Reglas y schemas |
| [Reglas ADR](./rulesets/adr/README.md) | Reglas de ADR | Asegurar formato de decisiones | Reglas y schemas |

</details>

<details>
<summary><strong>Fase 03 - Construccion</strong></summary>

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) |
|---|---|---|---|
| [Plantilla de Historia Tecnica](./reference/governance/sdlc/04-artifact-templates/technical-story-template.es.md) | Plantilla de historia técnica | Estructurar tareas técnicas | Documentos y plantillas |
| [Hub de Plantillas de Artefactos](./reference/governance/sdlc/04-artifact-templates/README.es.md) | Hub de plantillas | Centralizar formatos SDLC | Documentos y plantillas |
| [Framework SDLC Enfocado en Construccion](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.es.md) | Framework de construcción | Normar ejecución técnica | Estandares y guia |
| [Definition of Done](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.es.md) | Criterios de completitud (DoD) | Definir cuándo un entregable está terminado | Estandares y guia |
| [Quality Gates SDLC](./reference/governance/sdlc/quality-gates.es.md) | Gates de calidad | Establecer umbrales de aprobación | Estandares y guia |
| [Patrones Canonicos](./reference/architecture/canonical-patterns/README.es.md) | Patrones canónicos | Reutilizar soluciones probadas | Estandares y guia |
| [Guia de Contract Testing](./reference/governance/standards/engineering/contract-testing-guideline.es.md) | Guía de pruebas de contrato | Asegurar compatibilidad de APIs | Estandares y guia |
| [Evaluacion de Riesgo de Proveedores](./reference/governance/standards/engineering/vendor-risk-assessment.es.md) | Evaluación de riesgo de proveedores | Mitigar bloqueo tecnológico | Estandares y guia |
| [Estandares de Ingenieria Augmentada por IA](./reference/governance/standards/ai-augmented/README.es.md) | Estándares de IA aumentada | Guiar desarrollo con IA | Estandares y guia |
| [Mapeo de Artefactos SDLC](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.es.md) | Mapeo de artefactos | Vincular fases y entregables | Estandares y guia |
| [Technical Story Schema](./rulesets/schema/technical-story.schema.json) | Esquema de validación JSON | Validar estructura de datos | Reglas y schemas |
| [Definition of Done Rules](./rulesets/cross-cutting/definition-of-done.rules.json) | Reglas automatizadas | Validar cumplimiento en CI | Reglas y schemas |
| [Engineering Manifesto Rules](./rulesets/cross-cutting/engineering-manifesto.rules.json) | Reglas del manifiesto de ingeniería | Verificar cumplimiento de principios en CI | Reglas y schemas |
| [Quality Thresholds Rules](./rulesets/sdlc/quality-thresholds.rules.json) | Reglas automatizadas | Validar cumplimiento en CI | Reglas y schemas |
| [Dependency Pinning Rules](./rulesets/sdlc/dependency-pinning.rules.json) | Reglas automatizadas | Validar cumplimiento en CI | Reglas y schemas |

</details>

<details>
<summary><strong>Fase 04 - Validacion y QA</strong></summary>

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) |
|---|---|---|---|
| [Plantilla de Test Summary Report](./reference/governance/sdlc/04-artifact-templates/test-summary-report-template.es.md) | Reporte de pruebas | Consolidar resultados de QA | Documentos y plantillas |
| [Quality Gates SDLC](./reference/governance/sdlc/quality-gates.es.md) | Gates de calidad | Establecer umbrales de aprobación | Estandares y guia |
| [Modelo de Trazabilidad SDLC](./reference/governance/sdlc/traceability-model.es.md) | Modelo de trazabilidad | Vincular requerimientos y pruebas | Estandares y guia |
| [ADR de Testing Pyramid](./reference/architecture/adrs/core/0018-testing-pyramid-quality-gates.es.md) | Pirámide de pruebas y gates automatizados | Definir estrategia de testeo por capas | Estandares y guia |
| [ADR de Aislamiento de Unit Testing](./reference/architecture/adrs/core/0052-unit-testing-isolation-strategy.es.md) | Aislamiento de pruebas (ADR) | Normar uso de mocks | Estandares y guia |
| [ADR de Integration y E2E Testing](./reference/architecture/adrs/core/0053-integration-e2e-testing-strategy.es.md) | Pruebas de integración y E2E (ADR) | Establecer pruebas end-to-end | Estandares y guia |
| [Mapeo de Artefactos SDLC](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.es.md) | Mapeo de artefactos | Vincular fases y entregables | Estandares y guia |
| [Test Summary Report Schema](./rulesets/schema/test-summary-report.schema.json) | Esquema de validación del reporte de pruebas | Validar estructura del artefacto | Reglas y schemas |
| [Quality Thresholds Rules](./rulesets/sdlc/quality-thresholds.rules.json) | Reglas automatizadas | Validar cumplimiento en CI | Reglas y schemas |
| [Testing Pyramid Rules](./rulesets/adr/adr-0018-testing-pyramid.rules.json) | Pirámide de pruebas (ADR) | Definir estrategia de testeo | Reglas y schemas |

</details>

<details>
<summary><strong>Fase 05 - Entrega y Operaciones</strong></summary>

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) |
|---|---|---|---|
| [Plantilla de Release Notes](./reference/governance/sdlc/04-artifact-templates/release-notes-template.es.md) | Plantilla de notas de versión | Comunicar cambios de release | Documentos y plantillas |
| [Hub de Operaciones](./reference/operations/README.es.md) | Hub de operaciones | Centralizar guías operativas | Estandares y guia |
| [Hub de Infraestructura](./reference/infrastructure/README.es.md) | Hub de infraestructura | Normar despliegues | Estandares y guia |
| [Playbook de Observabilidad](./reference/governance/standards/engineering/observability-playbook.es.md) | Playbook de observabilidad | Guiar telemetría | Estandares y guia |
| [Flujo de Arquitectura de Observabilidad](./reference/architecture/blueprints/observability-architecture-flow.es.md) | Arquitectura de observabilidad | Trazar propagación de señales | Estandares y guia |
| [Escenarios de Despliegue Multi-Cloud](./reference/architecture/blueprints/multi-cloud-deployment-scenarios.es.md) | Escenarios multi-cloud | Definir topologías cloud | Estandares y guia |
| [Mapeo de Artefactos SDLC](./reference/governance/sdlc/sdlc-evolith-artifact-mapping.es.md) | Mapeo de artefactos | Vincular fases y entregables | Estandares y guia |
| [Release Notes Schema](./rulesets/schema/release-notes.schema.json) | Esquema de validación de release notes | Validar estructura del artefacto | Reglas y schemas |
| [CI/CD Quality Gates Rules](./rulesets/adr/adr-0005-cicd-quality-gates.rules.json) | Reglas de gates CI/CD (ADR-0005) | Automatizar validación en pipelines | Reglas y schemas |
| [GitFlow Branching Rules](./rulesets/adr/adr-0050-gitflow-branching.rules.json) | Estrategia de ramas (ADR) | Establecer flujo de Git | Reglas y schemas |

</details>

## Referencias Transversales

<details>
<summary><strong>Arquitectura, gobernanza y referencia aplicada</strong></summary>

| Enlace (URL) | Descripción (breve explicación) | Meta / Objetivo | Tipificación (categoría o tipo) |
|---|---|---|---|
| [Hub de Arquitectura](./reference/architecture/README.es.md) | Hub de arquitectura | Centralizar recursos de diseño | Baseline de arquitectura |
| [Blueprints](./reference/architecture/blueprints/README.es.md) | Directorio de blueprints | Guiar arquitecturas de referencia | Baseline de arquitectura |
| [Baseline Agnostica](./reference/architecture/blueprints/authoritative-tech-stack-agnostic.es.md) | Stack agnóstico | Definir tecnologías base | Baseline de arquitectura |
| [Blueprint de Referencia](./reference/architecture/blueprints/reference-blueprint.es.md) | Blueprint de referencia | Guiar implementación estándar | Baseline de arquitectura |
| [Spec de Topologia C4](./reference/architecture/blueprints/c4-topology-spec.es.md) | Spec de topología C4 | Estandarizar diagramas de arquitectura | Baseline de arquitectura |
| [Registro ADR](./reference/architecture/adrs/README.es.md) | Registro de ADRs | Mantener histórico de decisiones | Decisiones de arquitectura |
| [ADRs Core](./reference/architecture/adrs/core/README.es.md) | ADRs Core | Decisiones centrales del sistema | Decisiones de arquitectura |
| [ADRs Node.js](./reference/architecture/adrs/nodejs/README.es.md) | ADRs Node.js | Decisiones de ecosistema Node | Decisiones de arquitectura |
| [ADRs .NET](./reference/architecture/adrs/dotnet/README.es.md) | ADRs .NET | Decisiones de ecosistema .NET | Decisiones de arquitectura |
| [ADRs Android](./reference/architecture/adrs/android/README.es.md) | ADRs Android | Decisiones de ecosistema móvil | Decisiones de arquitectura |
| [Estandares de Gobernanza](./reference/governance/standards/README.es.md) | Estándares de gobernanza | Alinear equipos a políticas | Gobernanza y navegacion |
| [Evaluacion de Madurez](./reference/governance/standards/vision/maturity-assessment.es.md) | Evaluación de madurez | Medir estado actual de arquitectura | Gobernanza y navegacion |
| [Tablero de Seguimiento de Gaps](./reference/governance/standards/vision/gap-tracking.es.md) | Tablero de seguimiento | Monitorear brechas técnicas | Gobernanza y navegacion |
| [Indice Bilingue](./reference/navigation/BILINGUAL_INDEX.es.md) | Índice bilingüe | Mapear correspondencia EN/ES | Gobernanza y navegacion |
| [Hub de Navegacion](./reference/navigation/README.es.md) | Hub de navegación | Facilitar acceso a documentación | Gobernanza y navegacion |
| [Hub de Rulesets](./rulesets/README.es.md) | Hub de rulesets | Centralizar reglas de validación | Gobernanza y navegacion |
| [Hub de Referencia UMS](./reference/knowledge/demo/README.es.md) | Hub de referencia UMS | Demostrar implementación real | Referencia aplicada |
| [Modelo de Referencia UMS](./reference/knowledge/demo/ums-reference-model.es.md) | Modelo de referencia UMS | Guiar desarrollo de productos satélite | Referencia aplicada |
| [Referencia Canonica vs Modelo Aplicado UMS](./reference/knowledge/demo/demo-vs-reference.es.md) | Canónica vs UMS | Comparar teoría y aplicación | Referencia aplicada |
| [Portal de Arquitectura UMS](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) | Portal de arquitectura UMS | Documentar UMS específicamente | Referencia aplicada |
| [Casos de Adopcion](./reference/knowledge/adoption-cases.es.md) | Casos de adopción | Mostrar éxito y aprendizaje | Referencia aplicada |

</details>

## Herramientas y Automatizacion

<details>
<summary><strong>Smart CLI y hooks de validacion</strong></summary>

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

</details>

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
