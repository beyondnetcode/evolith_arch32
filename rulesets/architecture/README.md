# Progressive-Axis Architecture Rules Index

Rules governing the **topology** `progressive-axis` model from modular monolith to distributed modules to microservices.

> **Axis note:** `F1/F2/F3` are aliases on the **topology axis**, *not* SDLC phases. The SDLC axis (idea → product, five phases with gates) is governed separately under [`rulesets/sdlc/`](../sdlc/README.md) and [`reference/governance/sdlc/`](../../reference/governance/sdlc/README.md). The legacy `f1/f2/f3` identifiers are obsolete compatibility aliases retained only so existing CLI, MCP, Service CORE API, and satellite contracts keep resolving; new work should use the canonical topology names.

F1, F2, and F3 remain supported compatibility aliases for existing CLI, MCP, Service CORE API, and satellite contracts. They are not the full topology universe. Multi-topology profiles outside this axis are resolved through `topology.manifest.json` and the dimensional model in [Topology Dimensions Model](../../reference/architecture/topologies/topology-dimensions.md).

| Phase | Rule File | Description |
|---|---|---|
| **F1 — Modular Monolith** | [f1-modular-monolith.rules.json](../../reference/architecture/topologies/progressive-axis/modular-monolith/modular-monolith.rules.json) | Canonical starting topology; extraction readiness gates |
| **F2 — Distributed Modules** | [f2-distributed-modules.rules.json](../../reference/architecture/topologies/progressive-axis/distributed-modules/distributed-modules.rules.json) | Module boundaries formalized; inter-module contracts established |
| **F3 — Microservices** | [f3-microservices.rules.json](../../reference/architecture/topologies/progressive-axis/microservices/microservices.rules.json) | Autonomous deployability; service mesh readiness |

| Compatibility Alias | Canonical Topology |
|---|---|
| `--arch-level F1` | `--topology modular-monolith` |
| `--arch-level F2` | `--topology distributed-modules` |
| `--arch-level F3` | `--topology microservices` |

> **Where the rule files live.** The files linked above are the deep-dive copies under `reference/architecture/topologies/progressive-axis/`. The executable rule copies live under [`rulesets/topologies/progressive-axis/`](../topologies/README.md) as `{topology}.rules.json` (with `.es.json` companions); OPA policy compilation is centralized in `rulesets/opa/` (`main.rego`). Resolve the manifest rather than hard-coding either path. Authoring and contribution standards are in the repo-root [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

---

Back to [Rulesets Hub](../README.md)
