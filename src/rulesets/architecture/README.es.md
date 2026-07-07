# Índice de Reglas Arquitectónicas del Progressive-Axis

Reglas que gobiernan el modelo de compatibilidad `progressive-axis` desde monolito modular hacia modulos distribuidos y microservicios.

> **Nota de ejes:** `F1/F2/F3` son aliases del **eje de topología**, *no* fases SDLC. El eje SDLC (idea → producto, cinco fases con gates) se gobierna por separado bajo [`rulesets/sdlc/`](../sdlc/README.es.md) y [`reference/core/sdlc/`](../../../reference/core/sdlc/README.es.md). Los identificadores legacy `f1/f2/f3` son aliases de compatibilidad obsoletos retenidos solo para que CLI, MCP, Service CORE API y contratos de satélite existentes sigan resolviendo; el trabajo nuevo debe usar los nombres canónicos de topología.

F1, F2 y F3 permanecen soportados como aliases de compatibilidad para CLI, MCP, Service CORE API y contratos de satelite existentes. No representan todo el universo topologico. Los perfiles multi-topologia fuera de este eje se resuelven mediante `topology.manifest.json` y el modelo dimensional en [Modelo de Dimensiones Topologicas](../../../reference/core/architecture/topologies/topology-dimensions.es.md).

| Fase | Archivo de Reglas | Descripción |
|---|---|---|
| **F1 — Monolito Modular** | [f1-modular-monolith.rules.json](../../../reference/core/architecture/topologies/progressive-axis/modular-monolith/modular-monolith.rules.json) | Topología canónica de inicio; gates de preparación para extracción |
| **F2 — Módulos Distribuidos** | [f2-distributed-modules.rules.json](../../../reference/core/architecture/topologies/progressive-axis/distributed-modules/distributed-modules.rules.json) | Límites de módulos formalizados; contratos inter-módulo establecidos |
| **F3 — Microservicios** | [f3-microservices.rules.json](../../../reference/core/architecture/topologies/progressive-axis/microservices/microservices.rules.json) | Desplegabilidad autónoma; preparación para service mesh |

| Alias de Compatibilidad | Topologia Canonica |
|---|---|
| `--arch-level F1` | `--topology modular-monolith` |
| `--arch-level F2` | `--topology distributed-modules` |
| `--arch-level F3` | `--topology microservices` |

> **Dónde viven los archivos de reglas.** Los archivos enlazados arriba son las copias de deep-dive bajo `reference/core/architecture/topologies/progressive-axis/`. Las copias ejecutables (las resueltas vía cada `topology.manifest.json` y compiladas a `.rego`/`.wasm`) viven bajo [`rulesets/topologies/progressive-axis/`](../topologies/README.es.md). Resuelve el manifiesto en lugar de fijar cualquiera de las rutas. Los estándares de autoría y contribución están en el [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) raíz del repositorio.

---

Volver al [Rulesets Hub](../README.es.md)
