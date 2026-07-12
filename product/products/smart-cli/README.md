# Evolith CLI

> Product hub for **`@beyondnet/evolith-cli`** — the command-line entry point to the Evolith ecosystem: governance, standards validation, architecture scaffolding, SDLC lifecycle management, and AI agent integration (MCP).

| | |
|---|---|
| **Status** | Active |
| **Package** | `@beyondnet/evolith-cli` |
| **Version** | `1.1.4` |
| **Binary** | `evolith-cli` |
| **Source of truth** | [`sdk/cli/README.md`](../../../src/sdk/cli/README.md) (authoritative, 1200+ lines) |
| **Surface inventory** | [`product-inventory.md`](./product-inventory.md) (generated — do not hand-edit) |

This page is a **hub**: it orients you and points to the authoritative deeper docs. For exhaustive per-command options, always defer to the [code README](../../../src/sdk/cli/README.md) and the generated [Product Surface Inventory](./product-inventory.md).

> 📖 **User manual — [Using the CLI](../../../reference/core/interfaces/using-the-cli.md).** A readable, task-oriented guide to every command, subcommand, option, and combination, with worked examples. Part of the [Interface How-To hub](../../../reference/core/interfaces/README.md) (CLI · MCP · REST) with per-SDLC-phase catalogs and playbooks.

## What it does

- **Governance** — ADR management, standards tracking, BMAD agent installation.
- **Validation** — repository compliance against Evolith rulesets, topologies, ADRs, and SDLC gates (composable engine, GT-312).
- **Architecture** — scaffolding and drift detection along the progressive maturity axis.
- **SDLC lifecycle** — phase gates, transitions, handoff artifacts, and DORA metrics.
- **AI integration** — a production-ready MCP server (stdio + HTTP) for Cursor, Claude Desktop, and custom agents.

## Installation

```bash
npm install -g @beyondnet/evolith-cli
# or: pnpm add -g @beyondnet/evolith-cli
# or: yarn global add @beyondnet/evolith-cli
```

Or download a binary from [GitHub Releases](https://github.com/beyondnetcode/evolith_arch32/releases) and add it to your PATH.

```bash
evolith-cli --version
# evolith-cli version 1.1.4
```

## Quickstart

```bash
# 1. Seed a demo project to explore the CLI
evolith-cli fixtures --type demo

# 2. Initialize a real repository (creates evolith.yaml)
evolith-cli init

# 3. Scaffold base documentation
evolith-cli docs

# 4. Validate compliance
evolith-cli validate

# 5. Connect an AI agent (standalone MCP server)
evolith-mcp serve
```

## Command reference

The CLI registers **21 top-level commands** (the generated inventory counts individual subcommands separately, hence a higher figure). One concise line each — for full options and examples, follow the link to the [code README](../../../src/sdk/cli/README.md).

| Command | Purpose |
|---|---|
| `init` | Initialize a satellite repository (creates `evolith.yaml` and project structure). |
| `init-wizard` | Interactive wizard for guided project initialization (alternative to `init`). |
| `docs` | Scaffold base documentation (`README.md`, `AGENTS.md`, `MASTER_INDEX.md`, `evolith.yaml`). |
| `validate` | Validate repository compliance against rulesets, topologies, ADRs, and SDLC phases (architecture validation runs via `validate --topology`). |
| `adr` | Manage Architecture Decision Records (create, list, get, update, matrix). |
| `standards` | Manage governance standards (init, list, get, validate, export). |
| `agents` | Install, list, and remove Evolith BMAD agents. |
| `scaffold` | Scaffold a satellite along the progressive maturity axis (phase 1 modular-monolith → 2 distributed-modules → 3 microservices). |
| `drift` | Detect architecture drift from the declared topology; track history and trends. |
| `gate` | Evaluate SDLC phase gates and emit ADR-0073 `GateEvidence` artifacts. |
| `phase` | Propose a transition between SDLC phases (emits a proposal artifact). |
| `sdlc` | Orchestrate SDLC artifacts and lifecycle (`handoff`, `generate`, `gate-status`). |
| `profile` | Manage named CLI profiles (per-environment defaults). |
| `fixtures` | Seed reproducible fixture files for demos, tests, and onboarding. |
| `api` | Browse and inspect the Evolith API surface (MCP tools, resources, schemas, commands). |
| `mcp` | Run the MCP server for AI agent integration (stdio or HTTP). |
| `alias` | Manage shorthand aliases for CLI commands. |
| `history` | View and manage CLI command execution history. |
| `completion` | Generate and install shell completion scripts (bash, zsh, fish). |
| `update` | Check for and apply CLI updates. |
| `upgrade` | Upgrade a satellite repo to the next progressive-axis topology or governance version. |

## Validation modes (composable engine — GT-312)

Validation is composable, not rigid — you can enter from any combination of inputs and the engine resolves the optimal scope.

| Mode | Example | Validates |
|---|---|---|
| SDLC | `evolith-cli validate --phase discovery` | Phase → gate → artifacts → schemas → rulesets → ADRs → blocking criteria |
| Architecture | `evolith-cli validate --topology modular-monolith` | Topology rules, hexagonal limits, domain isolation, multi-tenancy |
| Ruleset | `evolith-cli validate --ruleset evidence` | A specific ruleset (native or OPA engine) |
| ADR | `evolith-cli validate --adr adr-0002` | ADR-specific architectural rules |
| Ad-hoc | `evolith-cli validate --file src/domain/user.ts` | A single file or component |
| Composable | `evolith-cli validate --topology microservices --ruleset evidence` | Multiple entry points combined |

**SDLC phase keys** (the `--phase` values accepted by the CLI and the `@beyondnet/evolith-sdk-client` API): `discovery`, `design`, `construction`, `qa`, `release` — *Conception & Discovery*, *Design & Architecture*, *Construction*, *Validation & QA*, *Delivery & Operations* — see [Phases & gates](#sdlc-phases--gates) below.

```bash
# Basic compliance check
evolith-cli validate

# JSON output for CI (ADR-0073 envelope)
evolith-cli validate --format json --output report.json

# SDLC phase evaluation (GT-281 pipeline)
evolith-cli validate --phase discovery

# OPA engine against a specific ruleset
evolith-cli validate --engine opa --ruleset acl
```

## Supported topologies

Any command that accepts `--topology` references the **8 canonical topology ids** by their dimension:

| Topology (id) | Dimension |
|---|---|
| `modular-monolith` | progressive-axis |
| `distributed-modules` | progressive-axis |
| `microservices` | progressive-axis |
| `serverless` | execution |
| `edge-computing` | execution |
| `event-driven` | integration |
| `data-mesh` | data |
| `agentic-ai` | ai |

The **progressive axis** (`modular-monolith → distributed-modules → microservices`) is a linear maturity progression. The remaining dimensions (execution, integration, data, ai) are complementary and chosen per project needs. Use the canonical topology ids.

## SDLC phases & gates

**Maturity levels** (the progressive architecture axis: `modular-monolith → distributed-modules → microservices`) are separate from **SDLC phases**. The SDLC lifecycle is its own model:

| Governance phase | Short name | CLI `--phase` key | Gate |
|---|---|---|---|
| Conception & Discovery | Discovery | `discovery` | Business Sign-Off |
| Design & Architecture | Architecture | `design` | Design Baseline Approved |
| Construction | Build | `construction` | Successful Build |
| Validation & QA | Validation | `qa` | RC Stamped |
| Delivery & Operations | Delivery | `release` | Production Live |

The final SDLC phase is **Delivery & Operations**. Evaluate gates and emit evidence with `evolith-cli gate evaluate --phase <key>`; propose transitions with `evolith-cli phase advance`.

## MCP server (AI agent integration)

The MCP server ships as the **standalone `@beyondnet/evolith-mcp` package**, which exposes the full Evolith surface to AI agents. Run it with `evolith-mcp serve` (or `npx @beyondnet/evolith-mcp serve`). See the [MCP Services product](../mcp-services/README.md) for the authoritative surface.

| Surface | Count |
|---|---|
| Tools | 27 |
| Resources | 9 |
| Prompts | 8 |
| Transports | `stdio` (JSON-RPC 2.0) · Streamable HTTP (API-key, fail-closed) |

The exact tool/resource/prompt set is enumerated in the generated [Product Surface Inventory](./product-inventory.md) and is browsable live with `evolith-cli api --list --category tools`. Treat those as the authority rather than any hand-maintained list.

```bash
# stdio transport (default — Cursor, Claude Desktop)
evolith-mcp serve

# HTTP transport with API-key auth (remote / containerized)
evolith-mcp serve --transport http --port 3000 --api-key <secret>
```

**Cursor** (`~/.cursor/mcp.json`) / **Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "evolith": {
      "command": "evolith-cli",
      "args": ["mcp", "serve"]
    }
  }
}
```

## Configuration

Evolith uses **`evolith.yaml`** in `.evolith/` or the repository root:

```yaml
coreRef:
  version: "1.0.0"
  path: "../../evolith"

governance:
  version: "1.0"
  adrRegistry:
    - id: "ADR-0001"
      status: "accepted"

product:
  name: "my-project"
  type: "library"
  runtime: "typescript"
  topology: "modular-monolith"
```

Optional defaults consumed by `validate` (topology, phase, rulesets, engine) also live in `evolith.yaml` — `evolith-cli validate` with no flags reads them. Use a canonical phase key (`discovery`…`release`) and a canonical topology id.

## Where this sits in Evolith

Evolith CLI is part of the **Evolith suite**, built on **Evolith Core** (`packages/core`, `core-domain`, `infra-providers`, `sdk-client`, `mcp-tools`). Sibling products: **Evolith Tracker**, **Core API** (`apps/core-api`), **Evolith MCP Services**, and the **UMS Reference** model.

## Documentation

- [Code README](../../../src/sdk/cli/README.md) — authoritative, full per-command reference and examples.
- [Product Surface Inventory](./product-inventory.md) — generated tool/resource/prompt/command counts.
- [Demo Guide](../../../src/sdk/cli/docs/SMART-CLI-DEMO.md) — end-to-end walkthrough.
- [MCP Integration](../../../src/sdk/cli/docs/MCP-INTEGRATION.md) — MCP protocol details.
- [Handoff Protocol](../../../src/sdk/cli/docs/HANDOFF-PROTOCOL.md) — SDLC handoff artifact spec.

## Support

- [Issue Tracker](https://github.com/beyondnetcode/evolith_arch32/issues)
- [Discussions](https://github.com/beyondnetcode/evolith_arch32/discussions)
