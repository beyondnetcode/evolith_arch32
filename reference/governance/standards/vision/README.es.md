# Hub de Visión, Madurez y Gaps

> **Navegación Bilingüe:** [English Version](./README.md)

Este hub es el punto de entrada canónico para reportes de madurez, salidas de auditoría arquitectónica, seguimiento de gaps, backlog de oportunidades y evidencia de soporte. Los lectores deben llegar aquí desde el README raíz antes de abrir reportes individuales.

## Orden de Revisión

Usa esta secuencia durante la revisión rutinaria de gobernanza:

| Paso | Documento | Propósito |
|---|---|---|
| 1 | [Resumen Ejecutivo de Gobernanza](./executive-summary.es.md) | Empezar con la señal estratégica generada: dónde atacar, mayor problema actual y bloqueadores. |
| 2 | [Tablero de Seguimiento de Gaps](./gap-tracking.es.md) | Abrir el backlog ordenado de gaps y oportunidades; estado y prioridad son autoritativos solo aquí. |
| 3 | [Catálogo de Referencia de Gaps](./gap-reference-catalog.es.md) | Leer el problema, evidencia, criterios de cierre y referencias detalladas de cada ítem `GT-*`. |
| 4 | [Evaluación de Madurez](./maturity-assessment.es.md) | Revisar la evaluación consolidada TOGAF ACMM, WAF, patrones, anti-patrones y alineación con la visión. |
| 5 | [Estándar de Evidencia de Cierre de Gaps](./gap-closure-evidence-standard.es.md) | Confirmar la evidencia requerida antes de mover cualquier gap a estado cerrado. |
| 6 | [Reporte de Cobertura Documental](../../../../COVERAGE_REPORT.md) | Revisar la salida de cobertura bilingüe y documental generada por el harness. |
| 7 | [Mapa Actual de Taxonomía del Repositorio](./repository-taxonomy-map.es.md) | Confirmar dónde pertenece cada familia de artefactos y qué tan crítica es cada área del repositorio. |

## Superficies Actuales de Reporte

| Reporte | Alcance | Úsalo para |
|---|---|---|
| [Resumen Ejecutivo de Gobernanza](./executive-summary.es.md) | Radar estratégico de gobernanza generado | Decisión rápida, orden de ataque, mayor riesgo actual y señal de mejora commit a commit. |
| [Tablero de Seguimiento de Gaps](./gap-tracking.es.md) | Cola de ejecución transversal de la suite | Triage inmediato, orden P0/P1 y revisión de estado. |
| [Catálogo de Referencia de Gaps](./gap-reference-catalog.es.md) | Catálogo detallado de gaps y oportunidades | Evidencia, reglas de cierre y contexto profundo por gap. |
| [Evaluación de Madurez](./maturity-assessment.es.md) | Madurez a nivel de suite | Madurez arquitectónica, alineación WAF y dirección de inversión. |
| [Reconciliación de Madurez](./maturity-reconciliation.json) | Evidencia de madurez legible por máquina | Salida de reconciliación automatizada consumida por scripts de validación. |
| [Resumen de Inventario](./inventory-summary.es.md) | Snapshot del inventario del corpus | Chequeo rápido del tamaño del corpus y estado del inventario generado. |
| [Mapa Actual de Taxonomía del Repositorio](./repository-taxonomy-map.es.md) | Mapa de áreas del repositorio con criticidad, guía de uso y reglas de ubicación | Decidir dónde leer, agregar, editar o auditar contenido. |
| [Plan del Corpus de Referencia Multi-Topología](./multi-topology-reference-corpus-implementation-plan.es.md) | Plan de transición multi-topología | Secuencia de implementación para gobernanza consciente de topologías. |
| [Análisis Profundo de Coherencia 2026-06-16](./deep-coherence-analysis-2026-06-16.es.md) | Revisión histórica de coherencia arquitectónica | Contexto de fondo para hallazgos de auditoría previos. |
| [Resumen de Backlog Completo](./backlog-complete-summary.es.md) | Snapshot histórico de cierre | Revisar consolidación de backlog completada previamente. |
| [Backlog Post GT-93](./backlog-post-gt93.es.md) | Estado histórico del backlog posterior a GT-93 | Entender contexto antiguo de migración del backlog. |

## Reportes Relacionados de Auditoría y Evaluación

| Reporte | Ubicación | Úsalo para |
|---|---|---|
| [Opinión de Auditoría de Stack 2026](../engineering/detailed-stack-audit-2026.es.md) | Estándares de ingeniería | Revisión de licencias, riesgo de stack y gobernanza open source. |
| [Análisis Técnico Senior y Roadmap](../engineering/senior-architectural-assessment.es.md) | Estándares de ingeniería | Evaluación técnica senior y roadmap de mejora. |
| [Evaluación de Riesgos de Proveedores y Cadena de Suministro](../engineering/vendor-risk-assessment.es.md) | Estándares de ingeniería | Evaluación de terceros y riesgo de cadena de suministro. |
| [Estrategia de Lanzamiento y Auditoría](../governance-docs/release-audit-strategy.es.md) | Documentos de gobernanza | Gobernanza de releases, estrategia de auditoría y controles del monorepo. |
| [Evaluación de Estado Actual Smart CLI](../../../products/smart-cli/docs/planning/sdk-cli-mcp-current-state-assessment.es.md) | Planeamiento Smart CLI | Revisión específica de estado CLI/MCP del producto. |
| [Análisis de Gaps Smart CLI MCP](../../../products/smart-cli/docs/planning/sdk-cli-mcp-gap-analysis.es.md) | Planeamiento Smart CLI | Análisis específico de gaps CLI/MCP del producto. |

## Reportes de Madurez por Topología

| Topología | Reporte |
|---|---|
| Monolito Modular | [Madurez](../../../architecture/topologies/progressive-axis/modular-monolith/maturity.es.md) |
| Módulos Distribuidos | [Madurez](../../../architecture/topologies/progressive-axis/distributed-modules/maturity.es.md) |
| Microservicios | [Madurez](../../../architecture/topologies/progressive-axis/microservices/maturity.es.md) |
| Event-Driven | [Madurez](../../../architecture/topologies/integration/event-driven/maturity.es.md) |
| Serverless | [Madurez](../../../architecture/topologies/execution/serverless/maturity.es.md) |
| Edge Computing | [Madurez](../../../architecture/topologies/execution/edge-computing/maturity.es.md) |
| Data Mesh | [Madurez](../../../architecture/topologies/data/data-mesh/maturity.es.md) |
| Agentic AI | [Madurez](../../../architecture/topologies/ai/agentic-ai/maturity.es.md) |

## Referencias de Visión y Estrategia

* [architectural-directives](./architectural-directives.es.md)
* [evolutionary-strategy-roadmap](./evolutionary-strategy-roadmap.es.md)
* [evolith-product-vision-master](../../../product-suite/vision/evolith-product-vision-master.es.md)

## Documentos estratégicos hijos

* [framework estratégico consolidado](./evolith-strategic-validation-and-composition-framework.es.md)
* [análisis comparativo](./evolith-strategic-positioning-comparative-landscape.es.md)
* [workflow de validación asistida](./evolith-ai-assisted-validation-workflow.es.md)

## Paquete de Diseño de la Nueva Visión — Revisar Antes de Código

* [diseño objetivo de composición gobernada](./evolith-governed-composition-target-design.es.md) — **Arquitectura objetivo**: Core define, los proveedores ejecutan, CLI/MCP evalúan y Tracker decide y audita
* [modelo de abstracción de proveedores y plugins](./evolith-provider-abstraction-plugin-model.es.md) — **Premisa fundacional del producto**: toda herramienta es adaptable, intercambiable, reemplazable e instalable mediante plugins, add-ins, adaptadores o conectores
* [diseño de interfaces técnicas del Tracker](./sdlc-tracker-technical-interfaces.es.md) — **Baseline técnica**: Evidence Graph, Gate Decision, Phase Transition, provider ports, REST, MCP, agentes y autoridad por tenant

> Este paquete autoriza únicamente revisión documental y arquitectónica. No se autoriza implementación de código hasta que el Architecture Board apruebe los diseños objetivo y los ADRs requeridos.

## Monitoreo y Referencia

* [gap-tracking](./gap-tracking.es.md) — **Tablero de Seguimiento de Gaps**: tabla única con criticidad, complejidad y estado vivo por gap
* [gap-reference-catalog](./gap-reference-catalog.es.md) — **Catálogo de Referencia de Gaps**: problema, propósito, evidencia, criterios de cierre y referencias enlazados desde el tablero
* [maturity-assessment](./maturity-assessment.es.md) — **Evaluación de Madurez**: estándares internacionales (TOGAF ACMM/WAF), alineación con la visión y enlaces a gaps abiertos
* [plan de implementación del corpus de referencia multi-topología](./multi-topology-reference-corpus-implementation-plan.es.md) — **Tracker de implementación**: plan paso a paso para la transición al Corpus de Referencia Multi-Topología

---
[Volver al Nivel Superior](../README.es.md)
