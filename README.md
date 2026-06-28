e<div align="center">

# Evolith: Executable Architectural Governance Framework

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

[![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)]()
[![Method](https://img.shields.io/badge/Method-Spec--driven_AI--DD-blueviolet?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-informational?style=for-the-badge)]()
[![CI](https://img.shields.io/github/actions/workflow/status/beyondnetcode/evolith_arch32/docs.yml?style=for-the-badge&label=CI)](https://github.com/beyondnetcode/evolith_arch32/actions)
[![Coverage](https://img.shields.io/badge/Docs-100%25-brightgreen?style=for-the-badge)](./COVERAGE_REPORT.md)

<br/>

<a href="./reference/governance/sdlc/assets/master-view.png" title="Evolith E2E Product Vision — click to enlarge">
  <img src="./reference/governance/sdlc/assets/master-view.png"
       alt="Evolith E2E Product Vision"
       width="780"
       style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);" />
</a>

<sub>↑ Evolith E2E Product Vision · MD3 — <i>click to enlarge</i></sub>

<br/>

**Evolith is an executable architectural governance framework, not a documentation corpus.** It encodes *how* software is built — across eight architecture topologies — as verifiable rulesets, ADRs, and phase gates that teams, delivery platforms, and AI agents can run. The same governance reaches your workflow through three interfaces: a **CLI**, an **MCP server**, and a **REST Core API**.

> _**Progressive Architecture:** the framework's ability to scale a system by mutating between topologies as the business lifecycle demands — preventing over-engineering and preserving architectural coherence through automated execution._

</div>

---

## What Evolith is

Evolith turns architectural governance into an operational capability. ADRs, rulesets, policies, contracts, and AI instructions are not passive documents — they are authoritative artifacts exposed through mandatory execution channels, so teams can validate, query, scaffold, and enforce a chosen architecture *before* code reaches production.

Evolith Core defines the technical **What** and **How** and stays provider-neutral and runtime-neutral: no language, cloud, runtime, or database lock-in. Business timing, ownership, funding, and ROI — the **When** and **Who** — live outside Core and are governed by Evolith Tracker.

## The Evolith ecosystem

Evolith Core is the foundation. The Suite delivers and proves that foundation as working products.

| Component | Role | One-liner | Hub |
| --- | --- | --- | --- |
| **Evolith Core** | Foundation | Provider-neutral engineering constitution: principles, ADRs, rulesets, topologies, and contracts every product inherits. | [Core hub](./reference/core/README.md) |
| **Evolith Tracker** | Suite · Active | Governs the business lifecycle (When/Who) and orchestrates Core through its ACL and Funnel 0. | [Tracker hub](./reference/products/evolith-tracker/README.md) |
| **Smart CLI** | Suite · Active (v1.1.4) | Local enforcement: validate code, manage ADRs, run gates and phases against your topology. | [Smart CLI hub](./reference/products/smart-cli/README.md) |
| **Core API** | Suite · Active (v0.0.1) | REST service (URI-versioned `/api/v1`) for orchestration systems to query and evaluate governance remotely. | [Core API hub](./reference/products/core-api/README.md) |
| **Evolith MCP Services** | Suite · Active | Governance as live context for LLMs and agents — 27 tools, 9 resources, 8 prompts. Ships inside `@evolith/smart-cli`. | [MCP Services hub](./reference/products/mcp-services/README.md) |
| **UMS Reference** | Suite · Reference model | The open-source UMS satellite is the official applied reference that demonstrates Core in practice. | [UMS Reference hub](./reference/products/ums-reference/README.md) |

New glossary of the whole ecosystem: **[Ecosystem Glossary](./reference/governance/glossary-ecosystem.md)** (canonical terms for phases, gates, topologies, and products).

## Core concepts

Two independent axes — keep them distinct.

- **SDLC phases** govern the path from idea to production. The five governance phases are **Conception & Discovery**, **Design & Architecture**, **Construction**, **Validation & QA**, and **Delivery & Operations**, each closed by a gate (Business Sign-Off, Design Baseline Approved, Successful Build, RC Stamped, Production Live). The CLI and Core API address these phases with the operational keys `discovery`, `design`, `construction`, `qa`, `release`.
- **Topologies** group architecture styles. **F1–F5** are *maturity levels* on the progressive axis (modular-monolith → distributed-modules → microservices, then operational maturity) — they are **not** SDLC phases.

Evolith governs **8 topologies**, each an isolated bounded context with its own ADRs, OPA policies, AI rulesets, and UMS contracts:

| Axis | Topologies |
| --- | --- |
| Progressive | `modular-monolith` · `distributed-modules` · `microservices` |
| Integration | `event-driven` |
| Execution | `serverless` · `edge-computing` |
| Data | `data-mesh` |
| AI | `agentic-ai` |

Full descriptions and artifacts: **[Topologies hub](./reference/architecture/topologies/README.md)**.

## Quickstart

Install the official tooling and validate a repository against its topology rulesets.

```bash
# Initialize a new satellite repository
npx @evolith/smart-cli@1.1.4 init

# Validate code against the rulesets of your chosen topology
smart-cli validate

# Validate a specific SDLC phase (keys: discovery | design | construction | qa | release)
smart-cli validate --phase qa

# Manage Architecture Decision Records
smart-cli adr create
smart-cli adr list

# Serve governance as live context for AI agents (MCP)
smart-cli mcp serve
```

Smart CLI ships **20 commands** (`adr`, `agents`, `alias`, `api`, `architecture`, `completion`, `docs`, `drift`, `fixtures`, `gate`, `history`, `init`, `mcp`, `phase`, `profile`, `sdlc`, `standards`, `update`, `upgrade`, `validate`) and is configured via **`evolith.yaml`**. Full reference: **[Smart CLI hub](./reference/products/smart-cli/README.md)**.

## Navigation map

This table is the fastest route to the right document. When you already know the artifact you need, open the [Global Master Index](./reference/navigation/MASTER_INDEX.md).

| I want to… | Go to | Surface |
| --- | --- | --- |
| Understand the provider-neutral constitution (principles, Core ADRs, contracts) | [Evolith Core hub](./reference/core/README.md) | Domain hub |
| Govern the lifecycle (phases, gates, artifacts, traceability) | [SDLC Governance Center](./reference/governance/sdlc/README.md) | Governance hub |
| Use or design a Suite product (Tracker, Smart CLI, Core API, MCP, UMS) | [Product Designs](./reference/products/README.md) · [Product Suite](./reference/product-suite/README.md) | Product hubs |
| Choose an architecture style or topology | [Architecture hub](./reference/architecture/README.md) · [Topologies](./reference/architecture/topologies/README.md) | Architecture hubs |
| Look up standards, taxonomies, and the ecosystem glossary | [Standards & Governance](./reference/governance/README.md) · [Glossary](./reference/governance/glossary-ecosystem.md) | Governance hub |
| Deploy, run, and operate (SRE, infra, quality gates) | [Operations hub](./reference/operations/README.md) | Operations hub |
| Onboard by role (architect, dev, QA/SRE, PM, AI agent) | [Getting Started by Role](./reference/getting-started/README.md) | Onboarding |
| Review suite health (maturity, gaps, audits, evidence) | [Maturity & Gaps hub](./reference/governance/standards/vision/README.md) | Reporting hub |
| Configure AI agents and assisted flow | [AGENTS.md](./AGENTS.md) | Agent rules |
| Locate any artifact directly | [Global Master Index](./reference/navigation/MASTER_INDEX.md) | Navigation index |

## Contributing

Before contributing, read the [Contributing Guide](./CONTRIBUTING.md), the [Code of Conduct](./CODE_OF_CONDUCT.md), the [Security Policy](./SECURITY.md), and [AGENTS.md](./AGENTS.md) for agent conventions. See the [Repository Taxonomy](./reference/governance/standards/repository-taxonomy.md) for what goes where.

## License

Published under the [MIT License](./LICENSE).

---

<div align="center">
  <sub>Evolith — Executable Architectural Governance Framework | Multi-Topology Reference Corpus | Spec-driven AI-DD</sub>
</div>
