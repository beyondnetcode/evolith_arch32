# Progressive-Axis Architecture Rules Index

Rules governing the `progressive-axis` compatibility model from modular monolith to distributed modules to microservices.

F1, F2, and F3 remain supported compatibility aliases for existing CLI, MCP, Service CORE API, and satellite contracts. They are not the full topology universe. Multi-topology profiles outside this axis are resolved through `topology.manifest.json` and the dimensional model in [Topology Dimensions Model](../../reference/architecture/topologies/topology-dimensions.md).

| Phase | Rule File | Description |
|---|---|---|
| **F1 — Modular Monolith** | [f1-modular-monolith.rules.json](./f1-modular-monolith.rules.json) | Canonical starting topology; extraction readiness gates |
| **F2 — Distributed Modules** | [f2-distributed-modules.rules.json](./f2-distributed-modules.rules.json) | Module boundaries formalized; inter-module contracts established |
| **F3 — Microservices** | [f3-microservices.rules.json](./f3-microservices.rules.json) | Autonomous deployability; service mesh readiness |

| Compatibility Alias | Canonical Topology |
|---|---|
| `--arch-level F1` | `--topology modular-monolith` |
| `--arch-level F2` | `--topology distributed-modules` |
| `--arch-level F3` | `--topology microservices` |

---

Back to [Rulesets Hub](../README.md)
