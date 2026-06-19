# Topology Rulesets Hub

> **Bilingual Navigation:** [Version en Espanol](./README.es.md)

This area is the canonical executable ruleset location for Evolith Core topology governance.

Human-readable topology guidance lives in `reference/architecture/topologies/`. This folder contains the machine-readable rules that CLI, MCP, Service CORE API, CI, and future topology resolvers consume.

## Execution Model

| Concern | Canonical Location | Purpose |
|---|---|---|
| Manifest schema | `rulesets/schema/topology-manifest.schema.json` | Validate every `topology.manifest.json`. |
| Native topology rules | `rulesets/topologies/<dimension>/<topology>/native/` | Execute topology-specific checks in the Native evaluator. |
| OPA topology policies | `rulesets/topologies/<dimension>/<topology>/opa/` | Execute equivalent Rego policies for OPA parity. |
| Human corpus | `reference/architecture/topologies/` | Explain topology intent, constraints, ADRs, and composition rules. |

## Governed Dimensions

| Dimension | Topologies | Rule Path Pattern |
|---|---|---|
| `progressive-axis` | `modular-monolith`, `distributed-modules`, `microservices` | `rulesets/topologies/progressive-axis/<topology>/` |
| `execution` | `serverless`, `edge-computing` | `rulesets/topologies/execution/<topology>/` |
| `integration` | `event-driven` | `rulesets/topologies/integration/<topology>/` |
| `data` | `data-mesh` | `rulesets/topologies/data/<topology>/` |
| `ai` | `agentic-ai` | `rulesets/topologies/ai/<topology>/` |

## Enforcement Rules

- Do not create a separate CLI, MCP server, or Core API per topology.
- Do not place human-readable topology design as the source of executable truth; manifests and rulesets are the executable contract.
- Every new enforceable topology rule must preserve Dual-Engine Parity when both engines apply.
- OPA policies must not drift from Native rule semantics.
- Topology rules must not encode business budget, ROI, cost, staffing, prioritization, timing, or business ownership.

## Current Status

The topology ruleset location is authorized. Concrete topology profiles and their Native plus OPA rules are tracked in the [Gap Tracking Board](../../reference/governance/standards/vision/gap-tracking.md).

---
[Back to Rulesets Hub](../README.md)
