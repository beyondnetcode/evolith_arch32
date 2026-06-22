# Topology Dimensions Model

> **Bilingual Navigation:** [Version en Espanol](./topology-dimensions.es.md)

**Status:** Accepted  
**Owner:** Evolith Architecture Board  
**Last Updated:** 2026-06-18  
**Classification:** Core Architecture Reference  
**Governing ADR:** [ADR-0079: Multi-Topology Reference Corpus](../adrs/core/0079-multi-topology-reference-corpus.md)

This document defines the dimensional model for the Evolith Core Multi-Topology Reference Corpus. It is the canonical interpretation layer for human-authored topology profiles under `reference/architecture/topologies/` and executable topology rules under `rulesets/topologies/`.

## 1. Purpose

Evolith Core does not treat architecture topologies as mutually exclusive maturity labels. A product can be a modular monolith, use event-driven integration, adopt selected serverless execution points, expose edge workloads, and still remain governed by one coherent architecture framework.

The dimensional model prevents two failures:

- forcing every product through a single monolith-to-microservices ladder;
- fragmenting governance into separate CLI, MCP, or Core API surfaces per topology.

## 2. Dimensions

| Dimension | Question Answered | Canonical Topologies | Primary Corpus Path |
|---|---|---|---|
| `progressive-axis` | How is the system decomposed and evolved over time? | `modular-monolith`, `distributed-modules`, `microservices` | `reference/architecture/topologies/progressive-axis/` |
| `execution` | Where and how does code execute? | `serverless`, `edge-computing` | `reference/architecture/topologies/execution/` |
| `integration` | How do components coordinate and communicate? | `event-driven` | `reference/architecture/topologies/integration/` |
| `data` | How is analytical and domain data ownership distributed? | `data-mesh` | `reference/architecture/topologies/data/` |
| `ai` | How are AI agents, model context, and autonomous workflows governed? | `agentic-ai` | `reference/architecture/topologies/ai/` |

## 3. Composition Rule

Topology profiles are composable when they belong to different dimensions and their manifests explicitly allow the combination through `spec.compatibility.composableWith`.

> **Worked reference:** [`examples/cross-topology-composition/`](../../../examples/cross-topology-composition/README.md) ships a runnable `modular-monolith + event-driven` composition. CI script `.harness/scripts/ci/22-validate-topology-composition.mjs` validates it on every commit against [`topology-composition.schema.json`](../../../rulesets/schema/topology-composition.schema.json).

Examples:

| Product State | Valid Topology Set | Rationale |
|---|---|---|
| Early enterprise product | `modular-monolith` | Keeps delivery simple and avoids premature distribution. |
| Modular product with async boundaries | `modular-monolith` + `event-driven` | Adds integration governance without forcing microservices. |
| Distributed platform with analytical ownership | `distributed-modules` + `event-driven` + `data-mesh` | Separates runtime decomposition, integration style, and data ownership. |
| AI-first product on managed execution | `modular-monolith` + `serverless` + `agentic-ai` | Combines simple domain ownership, managed execution, and AI governance. |
| Low-latency distributed product | `microservices` + `edge-computing` + `event-driven` | Combines service decomposition, edge placement, and event coordination. |

## 4. Progressive Axis Compatibility

F1, F2, and F3 remain compatibility aliases, not the whole topology universe.

| Legacy Phase | Canonical Topology | Meaning |
|---|---|---|
| `F1` | `modular-monolith` | One deployable system with strict internal bounded contexts. |
| `F2` | `distributed-modules` | Multiple deployable modules or services with controlled extraction. |
| `F3` | `microservices` | Independently deployable services governed by explicit contracts and operational maturity. |

The CLI may continue to accept `--arch-level F1/F2/F3`, but the shared resolver must map those values to `--topology modular-monolith`, `--topology distributed-modules`, and `--topology microservices`.

## 5. Profile Contract

Each topology profile is a bounded technical context. A complete profile must contain or reference:

| Artifact Family | Required Purpose |
|---|---|
| `topology.manifest.json` | Binding machine-readable contract validated by `rulesets/schema/topology-manifest.schema.json`. |
| `adrs/` | Topology-specific decisions only; universal Core ADRs are referenced, not duplicated. |
| `designs/` and `diagrams/` | Human-readable design guidance and visual models. |
| `ai-rulesets/` | AI-agent constraints and implementation context for MCP-enabled tools. |
| `mcp/` | MCP resources, tools, and prompts exposed through the unified MCP server. |
| `cli/` | Validators, command mappings, and optional scaffolds loaded by the unified CLI. |
| `ums-contracts/` | Technical applied-reference contracts or examples from UMS. |

Executable rules for the same topology live under `rulesets/topologies/<dimension>/<topology>/` and must preserve Native plus OPA parity when a rule is enforceable by both engines.

## 6. Business Boundary

Topology profiles are Phase 1 technical ideation artifacts. They define the technical "what" and "how" of architecture governance. They must not contain budget, ROI, cost, staffing, business ownership, prioritization, delivery timing, or Funnel 0 decision data.

Evolith Tracker owns business timing, ownership, prioritization, and Funnel 0 through its ACL. Core manifests expose only the technical contract needed by CLI, MCP, Service CORE API, and architecture governance.

## 7. Resolution Order

Operational interfaces must resolve topology context in this order:

1. Load the requested `topology.manifest.json`.
2. Resolve inherited Core ADRs, standards, and rulesets.
3. Resolve topology-specific ADRs and human-readable guidance.
4. Resolve Native rulesets and OPA policies.
5. Resolve MCP resources, tools, and prompts.
6. Resolve CLI validators and scaffolds.
7. Return results through the universal output envelope governed by ADR-0073.

---
[Back to Architecture Hub](../README.md)
