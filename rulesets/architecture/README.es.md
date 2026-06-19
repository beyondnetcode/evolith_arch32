# Índice de Reglas Arquitectónicas del Progressive-Axis

Reglas que gobiernan el modelo de compatibilidad `progressive-axis` desde monolito modular hacia modulos distribuidos y microservicios.

F1, F2 y F3 permanecen soportados como aliases de compatibilidad para CLI, MCP, Service CORE API y contratos de satelite existentes. No representan todo el universo topologico. Los perfiles multi-topologia fuera de este eje se resuelven mediante `topology.manifest.json` y el modelo dimensional en [Modelo de Dimensiones Topologicas](../../reference/architecture/topologies/topology-dimensions.es.md).

| Fase | Archivo de Reglas | Descripción |
|---|---|---|
| **F1 — Monolito Modular** | [f1-modular-monolith.rules.json](./f1-modular-monolith.rules.json) | Topología canónica de inicio; gates de preparación para extracción |
| **F2 — Módulos Distribuidos** | [f2-distributed-modules.rules.json](./f2-distributed-modules.rules.json) | Límites de módulos formalizados; contratos inter-módulo establecidos |
| **F3 — Microservicios** | [f3-microservices.rules.json](./f3-microservices.rules.json) | Desplegabilidad autónoma; preparación para service mesh |

| Alias de Compatibilidad | Topologia Canonica |
|---|---|
| `--arch-level F1` | `--topology modular-monolith` |
| `--arch-level F2` | `--topology distributed-modules` |
| `--arch-level F3` | `--topology microservices` |

---

Volver al [Rulesets Hub](../README.es.md)
