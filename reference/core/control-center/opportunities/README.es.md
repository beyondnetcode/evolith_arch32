# Evolith Core — Tablero de Oportunidades

> **Navegación Bilingüe:** [English Version](./README.md)

**Estado:** Seguimiento Activo
**Responsable:** Evolith Architecture Board
**Última Actualización:** 2026-07-12

Este tablero es la única fuente de verdad para las **oportunidades de mejora** y las **propuestas upstream** — mejoras, habilitadores y cambios de gobernanza entre repositorios que no se rastrean como gaps. Los gaps capturan deuda y defectos que deben cerrarse; las oportunidades capturan mejoras de valor y propuestas formales elevadas al Evolith Core Architecture Board. Para deuda y defectos, consulta el [Tablero de Gaps](../gaps/gap-tracking.es.md).

> Una tabla por track. Los IDs `UP-*` enlazan a su propuesta completa; los IDs `OPP-*` enlazan a su entrada en el resumen del backlog. GitHub renderiza Markdown de forma estática (sin ordenamiento ni búsqueda interactivos): usa la búsqueda de archivos de GitHub (`/`) para encontrar un ID o término.

---

## Propuestas Upstream

Propuestas formales elevadas al Evolith Core Architecture Board — típicamente originadas por un satélite (p. ej. Evolith Tracker) o por un rediseño del Core — que solicitan un cambio entre repositorios o a nivel de gobernanza. Mecanismo: `reference/core/control-center/opportunities/UP-NNN`.

| ID | Propuesta | Alcance | Prioridad | Complejidad | Estado |
|---|---|:---:|:---:|:---:|:---:|
| [`UP-001`](./UP-001-canonical-gap-tracking-standard.es.md) | **Estándar Canónico de Gap-Tracking para todos los satélites.** Un modelo, esquema, vocabulario y flujo de cierre para los gaps de cualquier repositorio Evolith (Core o satélite), operable a través de las tres superficies del Core (CLI, MCP, Core-API). | `Gobernanza` | P0 | XL | `PROPOSED` |
| [`UP-002`](./UP-002-product-initiative-governance-model.es.md) | **Modelo de Gobernanza Producto/Iniciativa.** Separa la gobernanza SDLC de la ejecución operativa; producto/tenant/iniciativa pasan a ser solo `EvaluationContext` (ADR-0100 · ADR-0101), el Core sigue siendo un evaluador stateless. | `Gobernanza` | P0 | XL | `PROPOSED` |

---

## Backlog de Mejoras

Mejoras de valor (`OPP-*`) rastreadas junto al backlog post-GT93. Todos los ítems de abajo están completos; los resúmenes conservan el propósito, los entregables y la contabilidad de esfuerzo completos.

- [Backlog — Resumen Completo](./backlog-complete-summary.es.md) — 35/35 ítems (11 GAPs + 10 OPP + …), contabilidad de esfuerzo, próximos pasos.
- [Backlog — Post-GT93](./backlog-post-gt93.es.md) — backlog priorizado original (P0→P3, dimensionado) con enlaces al GitHub Project.

| ID | Oportunidad | Componente | Nivel | Estado |
|---|---|:---:|:---:|:---:|
| [`OPP-001`](./backlog-complete-summary.es.md) | Implementar estrategias de auto-fix de dominio (ampliado a 8). | `CLI` | Should | `DONE` |
| [`OPP-002`](./backlog-complete-summary.es.md) | Añadir trazabilidad distribuida en MCP (vía `McpMetricsService` + OpenTelemetry). | `CLI` | Should | `DONE` |
| [`OPP-003`](./backlog-complete-summary.es.md) | Eliminar ruido de consola en tests (`silent: true`). | `CLI` | Should | `DONE` |
| [`OPP-004`](./backlog-complete-summary.es.md) | Optimizar la validación pre-commit (incremental, solo archivos afectados). | `Plataforma` | Should | `DONE` |
| [`OPP-005`](./backlog-complete-summary.es.md) | Añadir dashboard de métricas MCP (herramienta `evolith-metrics`). | `CLI` | Should | `DONE` |
| [`OPP-006`](./backlog-complete-summary.es.md) | Ampliar estrategias de auto-fix (objetivo 6+; entregadas 8). | `CLI` | Could | `DONE` |
| [`OPP-007`](./backlog-complete-summary.es.md) | Añadir pasos de validación al wizard (`validate?` en `WizardStep`). | `CLI` | Could | `DONE` |
| [`OPP-008`](./backlog-complete-summary.es.md) | Paralelizar la ejecución de tests (`maxWorkers: 100%`). | `CLI` | Could | `DONE` |
| [`OPP-009`](./backlog-complete-summary.es.md) | Generar reportes de cobertura HTML. | `CLI` | Should | `DONE` |
| [`OPP-010`](./backlog-complete-summary.es.md) | Añadir configuración de timeout de confirmación (`timeoutMs`, deny seguro por defecto). | `CLI` | Should | `DONE` |

---

## Relacionado

- [Tablero de Gaps](../gaps/gap-tracking.es.md) — deuda y defectos (única fuente de verdad para gaps).
- [Hub de Madurez y Gaps](../README.md) — índice del Control Center.
- [Índice Maestro Global](../taxonomy/MASTER_INDEX.es.md) — todos los artefactos.

[Volver al Control Center](../README.md)
