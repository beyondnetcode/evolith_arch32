# SDLC Rules Index

Rules defining phase gates, quality thresholds, dependency hygiene, and evidence requirements along the **SDLC axis** (idea → product, five phases). This axis is independent of the topology axis.

| Rule Set | File | Description |
|---|---|---|
| **Phase Gates** | [phase-gates.rules.json](./phase-gates.rules.json) | Mandatory exit criteria per SDLC phase |
| **Quality Thresholds** | [quality-thresholds.rules.json](./quality-thresholds.rules.json) | Canonical metric baselines: coverage >= 80%, complexity <= 15, etc. |
| **Dependency Pinning** | [dependency-pinning.rules.json](./dependency-pinning.rules.json) | Strict dependency-version pinning requirements (parity with `opa/version-pinning.rego`) |

> The canonical WS1 entrypoints for phase gates and quality thresholds are the sibling [`phase-gates/`](../phase-gates/README.md) and [`quality-thresholds/`](../quality-thresholds/README.md) directories; the files here are the SDLC-category sources retained for backward compatibility.

---

Back to [Rulesets Hub](../README.md)