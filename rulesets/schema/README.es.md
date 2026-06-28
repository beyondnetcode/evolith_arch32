# Índice de Schemas

Definiciones de JSON Schema para validar los artefactos de gobernanza y SDLC de Evolith.

> **Fuente de verdad:** estos schemas son el **contrato autoritativo** de la *estructura* de cada artefacto. Cuando una plantilla Markdown y un schema discrepan sobre campos obligatorios, el schema gana para la validación automática. Las plantillas Markdown bajo `reference/governance/sdlc/04-artifact-templates/` siguen siendo autoritativas para la *guía humana, la intención y la prosa*.

**Conteo:** este directorio contiene **36** archivos `*.schema.json`, agrupados abajo por propósito. Los schemas de *entrada* de las políticas OPA viven aparte en [`../opa/schemas/`](../opa/schemas/) (26 archivos) y se indexan en el [README de OPA](../opa/README.es.md).

> **Nota de ejes:** el eje SDLC (idea → producto, cinco fases) es **independiente** del eje de topologías (agrupadores de arquitectura). La columna "Fase" abajo se refiere solo al eje progresivo del SDLC. Los artefactos de topología (`topology-manifest`, `topology-composition`, `blueprint`) no están atados a una fase del SDLC.

## Schemas de artefactos SDLC

| Schema | Título | Fase SDLC |
|---|---|---|
| [discovery-canvas.schema.json](./discovery-canvas.schema.json) | Discovery Canvas | 1 — Descubrimiento |
| [technical-feasibility.schema.json](./technical-feasibility.schema.json) | Factibilidad Técnica (NFR / atributos de calidad) | 1 — Descubrimiento |
| [ballpark-estimation.schema.json](./ballpark-estimation.schema.json) | Estimación Ballpark (T-shirt) | 1 — Descubrimiento |
| [evolith-user-story.schema.json](./evolith-user-story.schema.json) | Historia de Usuario Evolith (criterios BDD) | 1 — Descubrimiento |
| [agile-backlog.schema.json](./agile-backlog.schema.json) | Backlog Ágil | 1 — Descubrimiento |
| [prd.schema.json](./prd.schema.json) | Documento de Requisitos de Producto | 1 — Descubrimiento |
| [cli-impact-analysis.schema.json](./cli-impact-analysis.schema.json) | Análisis de Impacto en CLI | 1–2 |
| [build-vs-compose.schema.json](./build-vs-compose.schema.json) | Análisis Build-versus-Compose | 1–2 |
| [functional-story.schema.json](./functional-story.schema.json) | Historia Funcional | 2 — Definición |
| [technical-story.schema.json](./technical-story.schema.json) | Historia Técnica | 3 — Construcción |
| [test-summary-report.schema.json](./test-summary-report.schema.json) | Reporte Resumen de Pruebas | 4 — Validación |
| [security-scan-report.schema.json](./security-scan-report.schema.json) | Reporte de Escaneo de Seguridad | 4 — Validación |
| [integration-evidence.schema.json](./integration-evidence.schema.json) | Evidencia de Integración | 4 — Validación |
| [observability-validation.schema.json](./observability-validation.schema.json) | Validación de Observabilidad | 4–5 |
| [release-notes.schema.json](./release-notes.schema.json) | Notas de Versión | 5 — Entrega |
| [rollback-rehearsal.schema.json](./rollback-rehearsal.schema.json) | Evidencia de Ensayo de Rollback | 5 — Entrega |
| [on-call-handoff.schema.json](./on-call-handoff.schema.json) | Confirmación de Traspaso On-Call | 5 — Entrega / Operación |

## Schemas de gobernanza, evidencia y gates

| Schema | Título | Alcance |
|---|---|---|
| [adr.schema.json](./adr.schema.json) | Registro de Decisión de Arquitectura | Todas |
| [waiver.schema.json](./waiver.schema.json) | Waiver de Gate Evolith | Todas |
| [gate-evidence.schema.json](./gate-evidence.schema.json) | Evidencia de Gate (core/ADR-0073) | Todas |
| [maturity-evidence.schema.json](./maturity-evidence.schema.json) | Evidencia de Madurez | Todas |
| [output-envelope.schema.json](./output-envelope.schema.json) | Sobre de Salida de Máquina (core/ADR-0073) | Salida CLI/MCP/REST |
| [sdlc-phase.schema.json](./sdlc-phase.schema.json) | Fase SDLC | Definición del eje SDLC |
| [sdlc-gate.schema.json](./sdlc-gate.schema.json) | Gate SDLC | Definición del eje SDLC |

## Schemas de ruleset y definición de reglas (meta-schemas)

| Schema | Título | Alcance |
|---|---|---|
| [rule-definition.schema.json](./rule-definition.schema.json) | Definición de Regla Evolith | Valida entradas individuales `*.rules.json` |
| [ruleset-sdlc.schema.json](./ruleset-sdlc.schema.json) | Ruleset SDLC | Valida rulesets de categoría SDLC |
| [ruleset-standard.schema.json](./ruleset-standard.schema.json) | Ruleset Estándar | Valida rulesets de categoría estándar |

## Schemas de satélite, tenant y topología

| Schema | Título | Alcance |
|---|---|---|
| [evolith-yaml.schema.json](./evolith-yaml.schema.json) | Contrato de Satélite Evolith (`evolith.yaml`) | Gobernanza de satélites |
| [tenant.schema.json](./tenant.schema.json) | Tenant Evolith | Multi-tenancy |
| [tenant-override.schema.json](./tenant-override.schema.json) | Override de Tenant Evolith | Multi-tenancy |
| [topology-manifest.schema.json](./topology-manifest.schema.json) | Manifiesto de Topología Evolith | Eje de topologías (resolución de manifiesto) |
| [topology-composition.schema.json](./topology-composition.schema.json) | Composición de Topologías | Eje de topologías (composición multi-topología) |
| [blueprint.schema.json](./blueprint.schema.json) | Blueprint Evolith | Blueprints de arquitectura |

## Schemas de gobernanza de conocimiento

| Schema | Título | Alcance |
|---|---|---|
| [knowledge-intake.schema.json](./knowledge-intake.schema.json) | Candidato de Ingesta de Conocimiento Externo | Gobernanza de conocimiento |
| [knowledge-projection.schema.json](./knowledge-projection.schema.json) | Proyección de Conocimiento Aprobada | Gobernanza de conocimiento |
| [source-registry.schema.json](./source-registry.schema.json) | Entrada de Registro de Fuente de Conocimiento Externo | Gobernanza de conocimiento |

---

**Cobertura de Fase 1 (Descubrimiento):** 6 schemas núcleo — Discovery Canvas, Factibilidad Técnica, Estimación Ballpark, Historia de Usuario Evolith, Backlog Ágil, PRD (más CLI Impact Analysis y Build-vs-Compose que abarcan fases 1–2).

---

Volver al [Hub de Rulesets](../README.es.md)
